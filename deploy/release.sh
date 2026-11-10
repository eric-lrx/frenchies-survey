#!/usr/bin/env bash
# Café Feedback: one release, called by .github/workflows/deploy.yml (Lab 5, #28).
# Adapted from the Lab 5 Starter Kit. Updates existing resources only; it never
# creates SQL, IAM or secrets (deploy/deploy.sh does that once).
#   Normal release: check the image exists, pin it by digest, run the migration
#                   job and wait, then point the service at the same digest.
#   Rollback:       the same without the migration job.
# Inputs: PROJECT_ID, REGION, IMAGE_TAG (full 40-character commit SHA), ROLLBACK.
# Offline test: deploy/tests/test_release_stub.sh
set -euo pipefail

: "${PROJECT_ID:?Required}" "${REGION:?Required}" "${IMAGE_TAG:?Required}"
SERVICE_NAME="${SERVICE_NAME:-cafe-feedback}"
MIGRATE_JOB_NAME="${MIGRATE_JOB_NAME:-cafe-feedback-migrate}"
ROLLBACK="${ROLLBACK:-false}"
[[ "$IMAGE_TAG" =~ ^[0-9a-f]{40}$ ]] || { echo 'Invalid image tag: a full 40-character commit SHA is required.' >&2; exit 1; }
[[ "$ROLLBACK" == true || "$ROLLBACK" == false ]] || { echo 'Invalid ROLLBACK value.' >&2; exit 1; }

REPO="$REGION-docker.pkg.dev/$PROJECT_ID/cafe-feedback/cafe-feedback"
DIGEST_IMAGE="$(gcloud artifacts docker images describe "$REPO:$IMAGE_TAG" --project="$PROJECT_ID" --format='value(image_summary.fully_qualified_digest)')"
[[ "$DIGEST_IMAGE" == "$REPO@sha256:"* ]] || { echo 'Image digest not found.' >&2; exit 1; }

if [[ "$ROLLBACK" == false ]]; then
  # A failed migration stops here (set -e): the service keeps the previous release.
  gcloud run jobs update "$MIGRATE_JOB_NAME" --image="$DIGEST_IMAGE" --project="$PROJECT_ID" --region="$REGION" --quiet
  gcloud run jobs execute "$MIGRATE_JOB_NAME" --wait --project="$PROJECT_ID" --region="$REGION" --quiet
else
  echo 'Rollback: redeploy an existing image; no build, no migration, no seed.'
fi

gcloud run services update "$SERVICE_NAME" --image="$DIGEST_IMAGE" --project="$PROJECT_ID" --region="$REGION" --quiet
gcloud run services update-traffic "$SERVICE_NAME" --to-latest --project="$PROJECT_ID" --region="$REGION" --quiet

SERVICE_URL="$(gcloud run services describe "$SERVICE_NAME" --project="$PROJECT_ID" --region="$REGION" --format='value(status.url)')"
echo "Service URL: $SERVICE_URL"
if [[ -n "${GITHUB_ENV:-}" ]]; then
  printf 'SERVICE_URL=%s\nDEPLOYED_IMAGE=%s\n' "$SERVICE_URL" "$DIGEST_IMAGE" >> "$GITHUB_ENV"
fi
