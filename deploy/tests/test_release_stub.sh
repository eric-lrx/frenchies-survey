#!/usr/bin/env bash
# Offline tests for deploy/release.sh: a stub gcloud records every call, no GCP access.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
# `! cmd` never stops a `set -e` script, so negative checks go through refute.
refute() { if "$@"; then echo "FAIL: unexpected success of: $*" >&2; exit 1; fi; }
export PROJECT_ID=release-test REGION=asia-southeast1
export IMAGE_TAG=1111111111111111111111111111111111111111
export CALL_LOG="$TMP/calls" GITHUB_ENV="$TMP/env" PATH="$TMP:$PATH"
cat > "$TMP/gcloud" <<'STUB'
#!/usr/bin/env bash
echo "$*" >> "$CALL_LOG"
case "$*" in
  'artifacts docker images describe '*)
    [[ "${FAIL_AT:-}" != image ]] || exit 1
    echo 'asia-southeast1-docker.pkg.dev/release-test/cafe-feedback/cafe-feedback@sha256:abcdef' ;;
  'run jobs execute '*) [[ "${FAIL_AT:-}" != migration ]] || exit 1 ;;
  'run services describe '*) echo 'https://cafe.example.test' ;;
esac
STUB
chmod +x "$TMP/gcloud"

ROLLBACK=false bash "$ROOT/deploy/release.sh" >/dev/null
grep -q 'run jobs update cafe-feedback-migrate --image=.*@sha256:abcdef' "$CALL_LOG"
grep -q 'run jobs execute cafe-feedback-migrate --wait' "$CALL_LOG"
grep -q 'run services update cafe-feedback --image=.*@sha256:abcdef' "$CALL_LOG"
grep -q 'SERVICE_URL=https://cafe.example.test' "$GITHUB_ENV"
echo 'PASS a release migrates first, then deploys the same digest'

: > "$CALL_LOG"
ROLLBACK=true bash "$ROOT/deploy/release.sh" >/dev/null
refute grep -q 'run jobs' "$CALL_LOG"
grep -q 'run services update ' "$CALL_LOG"
echo 'PASS a rollback redeploys the image without the migration job'

for failure in image migration; do
  : > "$CALL_LOG"
  if ROLLBACK=false FAIL_AT="$failure" bash "$ROOT/deploy/release.sh" >/dev/null 2>&1; then
    echo "FAIL: expected the $failure failure to stop the release" >&2; exit 1
  fi
  ! grep -q 'run services update' "$CALL_LOG"
  echo "PASS a $failure failure leaves the service untouched"
done

: > "$CALL_LOG"
if IMAGE_TAG='main;rm -rf /' bash "$ROOT/deploy/release.sh" >/dev/null 2>&1; then exit 1; fi
test ! -s "$CALL_LOG"
echo 'PASS an invalid tag is rejected before any gcloud call'
