#!/usr/bin/env bash
# Offline tests for deploy/teardown.sh: stub gcloud, no GCP access.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
refute() { if "$@"; then echo "FAIL: unexpected success of: $*" >&2; exit 1; fi; }
mkdir -p "$TMP/bin"
export STATE="$TMP" PATH="$TMP/bin:$PATH" PROJECT_ID=stub-project REGION=asia-southeast1
# The stub keeps a list of deleted "<group> <name>" keys (the service and the
# repository are both called cafe-feedback). `describe` succeeds for a name not deleted yet,
# unless STUB_MODE=none (nothing exists). STUB_MODE=sql-fail makes the SQL delete fail;
# STUB_MODE=sql-stays makes it "succeed" while the instance is still there.
cat > "$TMP/bin/gcloud" <<'STUB'
#!/usr/bin/env bash
echo "$*" >> "$STATE/calls"
touch "$STATE/deleted"
for i in $(seq 1 $#); do
  word="${!i}"; next=$((i + 1)); name="${!next:-}"; key="${*:1:i-1} $name"
  if [ "$word" = describe ]; then
    [ "${STUB_MODE:-}" = none ] && exit 1
    grep -qx -- "$key" "$STATE/deleted" && exit 1 || exit 0
  fi
  if [ "$word" = delete ]; then
    if [ "$name" = cafe-feedback-pg ]; then
      [ "${STUB_MODE:-}" = sql-fail ] && exit 1
      [ "${STUB_MODE:-}" = sql-stays ] && exit 0
    fi
    echo "$key" >> "$STATE/deleted"; exit 0
  fi
done
exit 0
STUB
chmod +x "$TMP/bin/gcloud"
reset() { rm -f "$TMP/calls" "$TMP/deleted"; }

# Everything exists: every resource is deleted, including the deployer and the pool.
reset; echo stub-project | STUB_MODE=all bash "$ROOT/deploy/teardown.sh" > "$TMP/out" 2>&1
while read -r key; do
  grep -qx -- "$key" "$TMP/deleted" || { echo "FAIL: $key not deleted" >&2; exit 1; }
done <<'KEYS'
run services cafe-feedback
run jobs cafe-feedback-migrate
sql instances cafe-feedback-pg
artifacts repositories cafe-feedback
secrets cafe-database-url
secrets cafe-seed-password
iam service-accounts cafe-feedback-runner@stub-project.iam.gserviceaccount.com
iam service-accounts cafe-feedback-deployer@stub-project.iam.gserviceaccount.com
iam workload-identity-pools github-actions
KEYS
grep -q 'Cloud SQL instance cafe-feedback-pg is gone' "$TMP/out"
echo 'PASS deletes every resource, deployer and Workload Identity pool included'

# Nothing exists (second run): no delete is attempted, and it succeeds.
reset; echo stub-project | STUB_MODE=none bash "$ROOT/deploy/teardown.sh" > "$TMP/out" 2>&1
refute grep -q ' delete ' "$TMP/calls"
echo 'PASS a second run deletes nothing and succeeds'

# A failed Cloud SQL delete is not hidden: the script fails and says the instance still bills.
reset
if echo stub-project | STUB_MODE=sql-fail bash "$ROOT/deploy/teardown.sh" > "$TMP/out" 2>&1; then
  echo 'FAIL: expected a failure when the SQL delete fails' >&2; exit 1; fi
reset
if echo stub-project | STUB_MODE=sql-stays bash "$ROOT/deploy/teardown.sh" > "$TMP/out" 2>&1; then
  echo 'FAIL: expected a failure when the SQL instance is still there' >&2; exit 1; fi
grep -q 'still exists' "$TMP/out"
echo 'PASS a Cloud SQL instance that is not deleted makes the script fail'

# A wrong confirmation deletes nothing.
reset
if echo other-project | STUB_MODE=all bash "$ROOT/deploy/teardown.sh" > "$TMP/out" 2>&1; then
  echo 'FAIL: expected exit 1 on a wrong confirmation' >&2; exit 1; fi
test ! -e "$TMP/calls"
echo 'PASS a wrong confirmation deletes nothing'

# A dry run calls no gcloud command.
reset; DRY_RUN=1 bash "$ROOT/deploy/teardown.sh" > "$TMP/out" 2>&1
test ! -e "$TMP/calls"
grep -q '^\[DRY_RUN\] gcloud sql instances delete cafe-feedback-pg' "$TMP/out"
grep -q '^\[DRY_RUN\] gcloud iam workload-identity-pools delete github-actions' "$TMP/out"
echo 'PASS dry run calls no gcloud command'
