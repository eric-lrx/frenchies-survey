#!/usr/bin/env bash
# Offline tests for deploy/deploy.sh: stub gcloud and openssl, no GCP access.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
# `! cmd` never stops a `set -e` script, so negative checks go through refute.
refute() { if "$@"; then echo "FAIL: unexpected success of: $*" >&2; exit 1; fi; }
mkdir -p "$TMP/bin"
export STATE="$TMP" PATH="$TMP/bin:$PATH" PROJECT_ID=stub-project REGION=asia-southeast1
export IMAGE_TAG=2222222222222222222222222222222222222222
cat > "$TMP/bin/openssl" <<'STUB'
#!/usr/bin/env bash
if [ "$2" = "-hex" ]; then echo 0123456789abcdef0123456789abcdef0123456789abcdef; else echo TESTONLYSEEDPASSWORD; fi
STUB
cat > "$TMP/bin/gcloud" <<'STUB'
#!/usr/bin/env bash
echo "$*" >> "$STATE/calls"
case "$1 $2 $3" in
  "secrets versions add") cat > "$STATE/payload-$4"; exit 0 ;;
  "run jobs execute") [ "${STUB_MODE:-}" != job-fail ]; exit $? ;;
  "run services describe") echo https://cafe-stub.example.invalid; exit 0 ;;
  "sql users list") echo postgres; exit 0 ;;
esac
for word in "$@"; do
  if [ "$word" = describe ]; then
    [ "${STUB_MODE:-}" = rerun ] && exit 0 || exit 1
  fi
done
exit 0
STUB
chmod +x "$TMP/bin/gcloud" "$TMP/bin/openssl"

# First run: every resource is created, the secrets hold generated values, nothing secret is printed.
rm -f "$TMP/calls"; STUB_MODE=first bash "$ROOT/deploy/deploy.sh" > "$TMP/out" 2>&1
grep -q '^sql instances create cafe-feedback-pg .*--tier=db-f1-micro .*--no-storage-auto-increase' "$TMP/calls"
grep -q '^run jobs deploy cafe-feedback-migrate ' "$TMP/calls"
grep -q '^run deploy cafe-feedback .*--min-instances 0 --max-instances 2' "$TMP/calls"
grep -q 'connection_limit=3' "$TMP/payload-cafe-database-url"
grep -q TESTONLYSEEDPASSWORD "$TMP/payload-cafe-seed-password"
refute grep -q -e 0123456789abcdef0123456789abcdef -e TESTONLYSEEDPASSWORD "$TMP/out"
grep -q -- '--password=<REDACTED>' "$TMP/out"
echo 'PASS first run creates every resource and prints no password'

# Re-run: existing resources and secrets are kept, the release steps still run.
rm -f "$TMP/calls" "$TMP"/payload-*; STUB_MODE=rerun bash "$ROOT/deploy/deploy.sh" > "$TMP/out" 2>&1
refute grep -q -e '^sql instances create' -e '^secrets create' -e '^sql users' "$TMP/calls"
refute ls "$TMP"/payload-* >/dev/null 2>&1
grep -q '^run deploy cafe-feedback ' "$TMP/calls"
echo 'PASS re-run keeps existing resources and secrets'

# A failed migration job stops before the service is deployed.
rm -f "$TMP/calls"
if STUB_MODE=job-fail bash "$ROOT/deploy/deploy.sh" > "$TMP/out" 2>&1; then echo 'FAIL: expected exit 1' >&2; exit 1; fi
refute grep -q '^run deploy ' "$TMP/calls"
echo 'PASS a failed migration job stops before the service'

# A dry run calls no gcloud command at all.
rm -f "$TMP/calls"; DRY_RUN=1 bash "$ROOT/deploy/deploy.sh" > "$TMP/out" 2>&1
test ! -e "$TMP/calls"
grep -q '^\[DRY_RUN\] gcloud run deploy cafe-feedback' "$TMP/out"
echo 'PASS a dry run only prints the commands'

# PROJECT_ID is required, also for a dry run: no fallback to the active gcloud project.
rm -f "$TMP/calls"
if env -u PROJECT_ID bash "$ROOT/deploy/deploy.sh" > "$TMP/out" 2>&1; then echo 'FAIL: expected exit 1 without PROJECT_ID' >&2; exit 1; fi
if env -u PROJECT_ID DRY_RUN=1 bash "$ROOT/deploy/deploy.sh" > "$TMP/out" 2>&1; then echo 'FAIL: expected exit 1 without PROJECT_ID (dry run)' >&2; exit 1; fi
test ! -e "$TMP/calls"
echo 'PASS PROJECT_ID is required'
