#!/usr/bin/env bash
# Deletes the Café Feedback cloud resources after the course (Lab 5).
# DELETES THE DATABASE AND ALL ITS DATA. Only after grading has ended.
#   DRY_RUN=1 PROJECT_ID=your-project-id bash deploy/teardown.sh
#   PROJECT_ID=your-project-id bash deploy/teardown.sh   # asks you to type the project ID
# Safe to run again: a resource that is already gone is skipped. Any other failure
# stops the script, and it ends by checking that the Cloud SQL instance (billed every
# hour) is really gone.
set -euo pipefail
DRY_RUN="${DRY_RUN:-0}"
REGION="${REGION:-asia-southeast1}"
PROJECT_ID="${PROJECT_ID:?Set PROJECT_ID}"
RUNNER_EMAIL="cafe-feedback-runner@${PROJECT_ID}.iam.gserviceaccount.com"
DEPLOYER_EMAIL="cafe-feedback-deployer@${PROJECT_ID}.iam.gserviceaccount.com"

# remove <gcloud group...> -- <name> [flags...]: describe first, delete only if it exists.
remove() {
  local group=() ; while [ "$1" != "--" ]; do group+=("$1"); shift; done; shift
  if [ "$DRY_RUN" = "1" ]; then
    echo "[DRY_RUN] gcloud ${group[*]} delete $* --project $PROJECT_ID --quiet"; return
  fi
  if gcloud "${group[@]}" describe "$@" --project "$PROJECT_ID" >/dev/null 2>&1; then
    echo "+ gcloud ${group[*]} delete $* --project $PROJECT_ID --quiet"
    gcloud "${group[@]}" delete "$@" --project "$PROJECT_ID" --quiet
  else
    echo "  skip: ${group[*]} $1 does not exist"
  fi
}

echo "This permanently deletes, in project ${PROJECT_ID} (${REGION}):"
echo "  Cloud Run service cafe-feedback and job cafe-feedback-migrate"
echo "  Cloud SQL instance cafe-feedback-pg (ALL DATA)"
echo "  Artifact Registry repository cafe-feedback"
echo "  Secrets cafe-database-url and cafe-seed-password"
echo "  Service accounts ${RUNNER_EMAIL} and ${DEPLOYER_EMAIL}"
echo "  Workload Identity pool github-actions (GitHub can no longer deploy)"
if [ "$DRY_RUN" != "1" ]; then
  read -r -p "Type the project ID to confirm: " CONFIRM
  [ "$CONFIRM" = "$PROJECT_ID" ] || { echo "Aborted."; exit 1; }
fi

remove run services -- cafe-feedback --region "$REGION"
remove run jobs -- cafe-feedback-migrate --region "$REGION"
remove sql instances -- cafe-feedback-pg
remove artifacts repositories -- cafe-feedback --location "$REGION"
remove secrets -- cafe-database-url
remove secrets -- cafe-seed-password
remove iam service-accounts -- "$RUNNER_EMAIL"
remove iam service-accounts -- "$DEPLOYER_EMAIL"
remove iam workload-identity-pools -- github-actions --location=global

if [ "$DRY_RUN" = "1" ]; then exit 0; fi
if gcloud sql instances describe cafe-feedback-pg --project "$PROJECT_ID" >/dev/null 2>&1; then
  echo "ERROR: Cloud SQL instance cafe-feedback-pg still exists and is still billed. Delete it in the Console (SQL > cafe-feedback-pg > Delete)." >&2
  exit 1
fi
echo "Cloud SQL instance cafe-feedback-pg is gone."
echo "Teardown finished. Check Billing > Reports over the next days, then close the project if you no longer need it."
