#!/usr/bin/env bash
# Deletes the Café Feedback cloud resources after the course (Lab 5).
# DELETES THE DATABASE AND ALL ITS DATA. Only after grading has ended.
#   DRY_RUN=1 PROJECT_ID=your-project-id bash deploy/teardown.sh
#   PROJECT_ID=your-project-id bash deploy/teardown.sh   # asks you to type the project ID
set -euo pipefail
DRY_RUN="${DRY_RUN:-0}"
REGION="${REGION:-asia-southeast1}"
PROJECT_ID="${PROJECT_ID:?Set PROJECT_ID}"
SA_EMAIL="cafe-feedback-runner@${PROJECT_ID}.iam.gserviceaccount.com"
run_cmd() { if [ "$DRY_RUN" = "1" ]; then echo "[DRY_RUN] $*"; else echo "+ $*"; "$@"; fi; }

echo "This permanently deletes, in project ${PROJECT_ID} (${REGION}):"
echo "  Cloud Run service cafe-feedback and job cafe-feedback-migrate"
echo "  Cloud SQL instance cafe-feedback-pg (ALL DATA)"
echo "  Artifact Registry repository cafe-feedback"
echo "  Secrets cafe-database-url and cafe-seed-password"
echo "  Service account ${SA_EMAIL}"
if [ "$DRY_RUN" != "1" ]; then
  read -r -p "Type the project ID to confirm: " CONFIRM
  [ "$CONFIRM" = "$PROJECT_ID" ] || { echo "Aborted."; exit 1; }
fi
run_cmd gcloud run services delete cafe-feedback --region "$REGION" --project "$PROJECT_ID" --quiet || true
run_cmd gcloud run jobs delete cafe-feedback-migrate --region "$REGION" --project "$PROJECT_ID" --quiet || true
run_cmd gcloud sql instances delete cafe-feedback-pg --project "$PROJECT_ID" --quiet || true
run_cmd gcloud artifacts repositories delete cafe-feedback --location "$REGION" --project "$PROJECT_ID" --quiet || true
run_cmd gcloud secrets delete cafe-database-url --project "$PROJECT_ID" --quiet || true
run_cmd gcloud secrets delete cafe-seed-password --project "$PROJECT_ID" --quiet || true
run_cmd gcloud iam service-accounts delete "$SA_EMAIL" --project "$PROJECT_ID" --quiet || true
echo "Teardown finished. The deployer service account and the Workload Identity pool are removed by hand (docs/labs/lab-05/deployment.md)."
