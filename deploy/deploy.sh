#!/usr/bin/env bash
# Café Feedback: one-time GCP setup and first deploy (Lab 5, #26).
# Adapted from the Lab 5 Starter Kit (deploy/deploy.sh).
#
# Run it in Cloud Shell, from the repository root, ALWAYS with a dry run first,
# and read every command it prints before running it for real:
#   DRY_RUN=1 PROJECT_ID=your-project-id bash deploy/deploy.sh
#   PROJECT_ID=your-project-id bash deploy/deploy.sh
#
# It creates, only when missing (safe to run again):
#   APIs, Artifact Registry repository, Cloud SQL instance (smallest tier,
#   storage auto-increase off), database and user, two secrets, the runtime
#   service account and its roles, the migration job, and the Cloud Run service
#   (min 0, max 2 instances).
# It never prints a password: they are generated here and written straight
# into Secret Manager. Later releases go through deploy.yml + release.sh.
set -euo pipefail

DRY_RUN="${DRY_RUN:-0}"
REGION="${REGION:-asia-southeast1}"

# Required, also for a dry run: never fall back to the active gcloud project,
# which may be another project.
PROJECT_ID="${PROJECT_ID:?Set PROJECT_ID, for example PROJECT_ID=your-project-id bash deploy/deploy.sh}"

# Resource names: keep them in step with deploy/release.sh, deploy/teardown.sh,
# .github/workflows/deploy.yml and docs/labs/lab-05/deployment.md.
REPO_NAME="cafe-feedback"
IMAGE_NAME="cafe-feedback"
SQL_INSTANCE="cafe-feedback-pg"
DB_NAME="cafe_feedback"
DB_USER="cafe"
SERVICE_NAME="cafe-feedback"
MIGRATE_JOB_NAME="cafe-feedback-migrate"
SA_NAME="cafe-feedback-runner"
SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
SQL_CONN_NAME="${PROJECT_ID}:${REGION}:${SQL_INSTANCE}"
SECRET_DB_URL="cafe-database-url"
SECRET_SEED_PASSWORD="cafe-seed-password"
IMAGE_TAG="${IMAGE_TAG:-$(git rev-parse HEAD 2>/dev/null || echo manual)}"
IMAGE_URI="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/${IMAGE_NAME}:${IMAGE_TAG}"

# Prints every command (passwords redacted) and runs it unless DRY_RUN=1.
run_cmd() {
  local arg
  if [ "$DRY_RUN" = "1" ]; then printf '[DRY_RUN] '; else printf '+ '; fi
  for arg in "$@"; do
    case "$arg" in
      --password=*) printf '%s ' '--password=<REDACTED>' ;;
      *) printf '%q ' "$arg" ;;
    esac
  done
  printf '\n'
  if [ "$DRY_RUN" != "1" ]; then "$@"; fi
}

# True when the resource exists. In a dry run, nothing exists, so every create is shown.
exists() {
  if [ "$DRY_RUN" = "1" ]; then return 1; fi
  "$@" >/dev/null 2>&1
}

# Adds a new secret version from stdin without printing it.
add_secret_version() {
  local name="$1"
  if [ "$DRY_RUN" = "1" ]; then
    echo "[DRY_RUN] gcloud secrets versions add $name --data-file=- (value not shown)"
    cat >/dev/null
  else
    echo "+ gcloud secrets versions add $name --data-file=- (value not shown)"
    gcloud secrets versions add "$name" --data-file=- --project "$PROJECT_ID" >/dev/null
  fi
}

echo "=================================================================="
echo "Café Feedback Cloud Run deployment"
echo "Project : ${PROJECT_ID}"
echo "Region  : ${REGION}"
echo "Image   : ${IMAGE_URI}"
echo "Dry run : ${DRY_RUN}"
echo "=================================================================="

# 1. APIs
run_cmd gcloud services enable run.googleapis.com sqladmin.googleapis.com \
  artifactregistry.googleapis.com cloudbuild.googleapis.com \
  secretmanager.googleapis.com iam.googleapis.com --project "$PROJECT_ID"

# 2. Artifact Registry repository for the images
if ! exists gcloud artifacts repositories describe "$REPO_NAME" --location "$REGION" --project "$PROJECT_ID"; then
  run_cmd gcloud artifacts repositories create "$REPO_NAME" --repository-format=docker \
    --location "$REGION" --description="Café Feedback images" --project "$PROJECT_ID"
fi

# 3. Cloud SQL for PostgreSQL 16: smallest tier, 10 GB, no storage auto-increase (cost)
if ! exists gcloud sql instances describe "$SQL_INSTANCE" --project "$PROJECT_ID"; then
  run_cmd gcloud sql instances create "$SQL_INSTANCE" --database-version=POSTGRES_16 \
    --edition=enterprise --tier=db-f1-micro --region="$REGION" \
    --storage-size=10GB --storage-type=SSD --no-storage-auto-increase \
    --backup-start-time=03:00 --project "$PROJECT_ID"
fi
if ! exists gcloud sql databases describe "$DB_NAME" --instance="$SQL_INSTANCE" --project "$PROJECT_ID"; then
  run_cmd gcloud sql databases create "$DB_NAME" --instance="$SQL_INSTANCE" --project "$PROJECT_ID"
fi

# 4. Runtime service account: may connect to Cloud SQL and read its two secrets, nothing else
if ! exists gcloud iam service-accounts describe "$SA_EMAIL" --project "$PROJECT_ID"; then
  run_cmd gcloud iam service-accounts create "$SA_NAME" \
    --display-name="Café Feedback Cloud Run runtime" --project "$PROJECT_ID"
fi
run_cmd gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${SA_EMAIL}" --role="roles/cloudsql.client" --condition=None --quiet

# 5. Secrets. The database password is generated here and only ever stored inside
#    the DATABASE_URL secret. Created once; a re-run keeps the existing values.
if ! exists gcloud secrets describe "$SECRET_DB_URL" --project "$PROJECT_ID"; then
  DB_PASS="$(openssl rand -hex 24)"
  if [ "$DRY_RUN" != "1" ] && gcloud sql users list --instance="$SQL_INSTANCE" --project "$PROJECT_ID" --format="value(name)" | grep -qx "$DB_USER"; then
    run_cmd gcloud sql users set-password "$DB_USER" --instance="$SQL_INSTANCE" --password="$DB_PASS" --project "$PROJECT_ID"
  else
    run_cmd gcloud sql users create "$DB_USER" --instance="$SQL_INSTANCE" --password="$DB_PASS" --project "$PROJECT_ID"
  fi
  run_cmd gcloud secrets create "$SECRET_DB_URL" --replication-policy=automatic --project "$PROJECT_ID"
  printf '%s' "postgresql://${DB_USER}:${DB_PASS}@localhost/${DB_NAME}?host=/cloudsql/${SQL_CONN_NAME}&connection_limit=3" \
    | add_secret_version "$SECRET_DB_URL"
  unset DB_PASS
fi
# Demo accounts for UAT (Lab 6). The password is shared with the partner team privately.
if ! exists gcloud secrets describe "$SECRET_SEED_PASSWORD" --project "$PROJECT_ID"; then
  run_cmd gcloud secrets create "$SECRET_SEED_PASSWORD" --replication-policy=automatic --project "$PROJECT_ID"
  openssl rand -base64 18 | tr -d '/+=\n' | add_secret_version "$SECRET_SEED_PASSWORD"
fi
for secret in "$SECRET_DB_URL" "$SECRET_SEED_PASSWORD"; do
  run_cmd gcloud secrets add-iam-policy-binding "$secret" \
    --member="serviceAccount:${SA_EMAIL}" --role="roles/secretmanager.secretAccessor" \
    --project "$PROJECT_ID" --quiet
done

# 6. First image, built by Cloud Build from this checkout
run_cmd gcloud builds submit --tag "$IMAGE_URI" --project "$PROJECT_ID"

# 7. Migration job: migrations, then the idempotent seed. It must succeed before the service.
run_cmd gcloud run jobs deploy "$MIGRATE_JOB_NAME" --image "$IMAGE_URI" --region "$REGION" \
  --service-account "$SA_EMAIL" --set-cloudsql-instances "$SQL_CONN_NAME" \
  --set-secrets "DATABASE_URL=${SECRET_DB_URL}:latest,SEED_PASSWORD=${SECRET_SEED_PASSWORD}:latest" \
  --command sh --args="-c,prisma migrate deploy && node dist/prisma/seed.js" \
  --max-retries 1 --task-timeout 300s --project "$PROJECT_ID"
if ! run_cmd gcloud run jobs execute "$MIGRATE_JOB_NAME" --region "$REGION" --wait --project "$PROJECT_ID"; then
  echo "ERROR: the migration job failed; the service was not deployed." >&2
  echo "Logs: gcloud logging read 'resource.type=cloud_run_job AND resource.labels.job_name=${MIGRATE_JOB_NAME}' --project ${PROJECT_ID} --limit 50" >&2
  exit 1
fi

# 8. Cloud Run service: public, scales to zero, at most 2 instances (cost)
run_cmd gcloud run deploy "$SERVICE_NAME" --image "$IMAGE_URI" --region "$REGION" \
  --allow-unauthenticated --service-account "$SA_EMAIL" \
  --add-cloudsql-instances "$SQL_CONN_NAME" \
  --set-secrets "DATABASE_URL=${SECRET_DB_URL}:latest" \
  --min-instances 0 --max-instances 2 --memory 512Mi --cpu 1 --port 3000 \
  --project "$PROJECT_ID"

if [ "$DRY_RUN" = "1" ]; then
  SERVICE_URL="https://${SERVICE_NAME}-<hash>.${REGION}.run.app"
else
  SERVICE_URL="$(gcloud run services describe "$SERVICE_NAME" --region "$REGION" --project "$PROJECT_ID" --format='value(status.url)')"
fi
echo "=================================================================="
echo "Done. Service URL: ${SERVICE_URL}"
echo "Checks: ${SERVICE_URL}/api/health  ${SERVICE_URL}/api/ready  ${SERVICE_URL}/api/version"
echo "Demo password: in Secret Manager '${SECRET_SEED_PASSWORD}' (not printed)."
echo "=================================================================="
