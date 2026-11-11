#!/usr/bin/env bash
# One-time setup that lets GitHub Actions deploy without a key (Lab 5, #27).
# Workload Identity Federation: only deploy.yml, on main, in the GitHub
# environment `demo`, of THIS repository can act as the deployer account.
# It changes IAM, so read the dry run first, then run it yourself in Cloud Shell:
#   DRY_RUN=1 PROJECT_ID=your-project-id bash deploy/setup-github-deploy.sh
#   PROJECT_ID=your-project-id bash deploy/setup-github-deploy.sh
set -euo pipefail
DRY_RUN="${DRY_RUN:-0}"
REGION="${REGION:-asia-southeast1}"
PROJECT_ID="${PROJECT_ID:?Set PROJECT_ID}"
# GitHub identity of eric-lrx/frenchies-survey (gh api repos/eric-lrx/frenchies-survey/actions/oidc/customization/sub).
GITHUB_SUBJECT="repo:eric-lrx@146710754/frenchies-survey@1446930826:environment:demo"
GITHUB_REPO_ID="1446930826"
POOL="github-actions"
PROVIDER="github-main"
DEPLOYER="cafe-feedback-deployer"
DEPLOYER_EMAIL="${DEPLOYER}@${PROJECT_ID}.iam.gserviceaccount.com"
RUNNER_EMAIL="cafe-feedback-runner@${PROJECT_ID}.iam.gserviceaccount.com"
run_cmd() { if [ "$DRY_RUN" = "1" ]; then printf '[DRY_RUN] '; else printf '+ '; fi; printf '%q ' "$@"; printf '\n'; if [ "$DRY_RUN" != "1" ]; then "$@"; fi; }

if [ "$DRY_RUN" = "1" ]; then PROJECT_NUMBER="<PROJECT_NUMBER>"; else
  PROJECT_NUMBER="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"; fi

run_cmd gcloud services enable iamcredentials.googleapis.com sts.googleapis.com --project "$PROJECT_ID"

# Deployer account: may update Cloud Run, push images to our repository only,
# and run the service as the runtime account. It never reads secrets.
run_cmd gcloud iam service-accounts create "$DEPLOYER" --display-name="Café Feedback GitHub deployer" --project "$PROJECT_ID"
run_cmd gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${DEPLOYER_EMAIL}" --role="roles/run.developer" --condition=None --quiet
run_cmd gcloud artifacts repositories add-iam-policy-binding cafe-feedback --location "$REGION" \
  --member="serviceAccount:${DEPLOYER_EMAIL}" --role="roles/artifactregistry.writer" --project "$PROJECT_ID"
run_cmd gcloud iam service-accounts add-iam-policy-binding "$RUNNER_EMAIL" \
  --member="serviceAccount:${DEPLOYER_EMAIL}" --role="roles/iam.serviceAccountUser" --project "$PROJECT_ID"

# Pool and provider: accept only tokens of this repository, from deploy.yml on main, environment demo.
run_cmd gcloud iam workload-identity-pools create "$POOL" --location=global \
  --display-name="GitHub Actions" --project "$PROJECT_ID"
run_cmd gcloud iam workload-identity-pools providers create-oidc "$PROVIDER" --location=global \
  --workload-identity-pool="$POOL" --issuer-uri="https://token.actions.githubusercontent.com" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository_id=assertion.repository_id,attribute.ref=assertion.ref,attribute.workflow_ref=assertion.workflow_ref" \
  --attribute-condition="assertion.sub == '${GITHUB_SUBJECT}' && assertion.repository_id == '${GITHUB_REPO_ID}' && assertion.ref == 'refs/heads/main' && assertion.workflow_ref.startsWith('eric-lrx/frenchies-survey/.github/workflows/deploy.yml@')" \
  --project "$PROJECT_ID"
run_cmd gcloud iam service-accounts add-iam-policy-binding "$DEPLOYER_EMAIL" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principal://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL}/subject/${GITHUB_SUBJECT}" \
  --project "$PROJECT_ID"

echo
echo "GitHub > Settings > Environments > demo (deployment branches: main only), variables:"
echo "  GCP_PROJECT_ID      = ${PROJECT_ID}"
echo "  GCP_REGION          = ${REGION}"
echo "  WIF_PROVIDER        = projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL}/providers/${PROVIDER}"
echo "  WIF_SERVICE_ACCOUNT = ${DEPLOYER_EMAIL}"
