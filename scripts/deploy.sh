#!/usr/bin/env bash
set -euo pipefail

# Creates/updates all the GCP infra for cfb-scoreboard-refresh and deploys the
# current source. Runs the same commands as server/GCP_SETUP.md, but idempotent —
# every step either no-ops or updates in place if the resource already exists, so
# this is safe to re-run for both first-time setup and routine redeploys.
#
# Config lives in .env.deploy (gitignored — copy .env.deploy.example), not in
# this script, so project IDs/SA names never land in source control.
#
# Usage:
#   scripts/deploy.sh              # create/update infra, deploy the service
#   scripts/deploy.sh --bootstrap  # also kick off the refresh chains and seed
#                                   # betting fallback data afterward (server/
#                                   # GCP_SETUP.md step 7) — only pass this on
#                                   # first-time setup or a deliberate restart,
#                                   # since it restarts every week's chain.

cd "$(dirname "$0")/.."

ENV_FILE=".env.deploy"
if [[ ! -f "$ENV_FILE" ]]; then
	echo "Missing $ENV_FILE — copy .env.deploy.example to $ENV_FILE and fill in real values." >&2
	exit 1
fi
set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

for var in PROJECT_ID REGION BUCKET_NAME SERVICE_NAME QUEUE_NAME RUNTIME_SA INVOKER_SA ALLOWED_ORIGINS CFBD_API_KEY; do
	if [[ -z "${!var:-}" ]]; then
		echo "$var is not set in $ENV_FILE" >&2
		exit 1
	fi
done

if [[ -z "$(gcloud config get-value account 2>/dev/null)" ]]; then
	echo "gcloud has no active account — run 'gcloud auth login' first." >&2
	exit 1
fi

RUNTIME_SA_EMAIL="${RUNTIME_SA}@${PROJECT_ID}.iam.gserviceaccount.com"
INVOKER_SA_EMAIL="${INVOKER_SA}@${PROJECT_ID}.iam.gserviceaccount.com"
SEASON_CHECK_JOB="${SERVICE_NAME}-check-season"
BETTING_REFRESH_JOB="${SERVICE_NAME}-refresh-betting"

echo "==> Project: $PROJECT_ID"
gcloud config set project "$PROJECT_ID" --quiet

echo "==> Enabling APIs"
gcloud services enable run.googleapis.com cloudtasks.googleapis.com \
	storage.googleapis.com iam.googleapis.com cloudscheduler.googleapis.com --quiet

echo "==> Bucket: $BUCKET_NAME"
if ! gcloud storage buckets describe "gs://$BUCKET_NAME" >/dev/null 2>&1; then
	gcloud storage buckets create "gs://$BUCKET_NAME" \
		--location="$REGION" --uniform-bucket-level-access
fi
gcloud storage buckets add-iam-policy-binding "gs://$BUCKET_NAME" \
	--member=allUsers --role=roles/storage.objectViewer --quiet >/dev/null

# ALLOWED_ORIGINS is comma-separated (e.g. "https://you.github.io,http://localhost:5173")
# — turn it into a JSON array by hand rather than depending on jq being installed
# wherever this runs.
ORIGIN_JSON="["
IFS=',' read -ra ORIGINS <<<"$ALLOWED_ORIGINS"
for i in "${!ORIGINS[@]}"; do
	origin="$(echo "${ORIGINS[$i]}" | xargs)" # trim whitespace
	[[ $i -gt 0 ]] && ORIGIN_JSON+=","
	ORIGIN_JSON+="\"$origin\""
done
ORIGIN_JSON+="]"

CORS_FILE="$(mktemp)"
trap 'rm -f "$CORS_FILE"' EXIT
cat >"$CORS_FILE" <<EOF
[
  {
    "origin": $ORIGIN_JSON,
    "responseHeader": ["Content-Type"],
    "method": ["GET"],
    "maxAgeSeconds": 30
  }
]
EOF
gcloud storage buckets update "gs://$BUCKET_NAME" --cors-file="$CORS_FILE"

echo "==> Service accounts"
gcloud iam service-accounts describe "$RUNTIME_SA_EMAIL" >/dev/null 2>&1 ||
	gcloud iam service-accounts create "$RUNTIME_SA" --display-name="cfb-scoreboard-refresh runtime"
gcloud iam service-accounts describe "$INVOKER_SA_EMAIL" >/dev/null 2>&1 ||
	gcloud iam service-accounts create "$INVOKER_SA" --display-name="cfb-scoreboard-refresh invoker"

echo "==> IAM bindings"
gcloud storage buckets add-iam-policy-binding "gs://$BUCKET_NAME" \
	--member="serviceAccount:${RUNTIME_SA_EMAIL}" \
	--role=roles/storage.objectAdmin --quiet >/dev/null

# tasks.ts does create + list + delete (deleteExistingTasksForWeek clears any
# stale task for a week before enqueuing the next one).
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
	--member="serviceAccount:${RUNTIME_SA_EMAIL}" \
	--role=roles/cloudtasks.enqueuer --quiet >/dev/null
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
	--member="serviceAccount:${RUNTIME_SA_EMAIL}" \
	--role=roles/cloudtasks.viewer --quiet >/dev/null
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
	--member="serviceAccount:${RUNTIME_SA_EMAIL}" \
	--role=roles/cloudtasks.taskDeleter --quiet >/dev/null

# tasks.ts creates each task with `oidcToken: { serviceAccountEmail: invoker }` —
# the runtime SA needs to be able to actAs the invoker SA to attach that identity.
gcloud iam service-accounts add-iam-policy-binding "$INVOKER_SA_EMAIL" \
	--member="serviceAccount:${RUNTIME_SA_EMAIL}" \
	--role="roles/iam.serviceAccountUser" --quiet >/dev/null

echo "==> Cloud Tasks queue: $QUEUE_NAME"
gcloud tasks queues describe "$QUEUE_NAME" --location="$REGION" >/dev/null 2>&1 ||
	gcloud tasks queues create "$QUEUE_NAME" --location="$REGION"

echo "==> Deploying service"
gcloud run deploy "$SERVICE_NAME" \
	--source . \
	--project "$PROJECT_ID" \
	--region "$REGION" \
	--service-account "$RUNTIME_SA_EMAIL" \
	--no-allow-unauthenticated \
	--quiet \
	--set-env-vars "GCP_PROJECT=${PROJECT_ID},TASKS_LOCATION=${REGION},TASKS_QUEUE=${QUEUE_NAME},SCOREBOARD_BUCKET=${BUCKET_NAME},TASKS_INVOKER_SERVICE_ACCOUNT=${INVOKER_SA_EMAIL},CFBD_API_KEY=${CFBD_API_KEY}"

SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" \
	--region="$REGION" --format='value(status.url)')

# The service needs to know its own URL (server/tasks.ts uses it to build the task
# target), which isn't knowable until after the first deploy above.
gcloud run services update "$SERVICE_NAME" \
	--region="$REGION" --quiet \
	--update-env-vars "SERVICE_URL=${SERVICE_URL}"

echo "==> Invoker permissions"
gcloud run services add-iam-policy-binding "$SERVICE_NAME" \
	--region="$REGION" \
	--member="serviceAccount:${INVOKER_SA_EMAIL}" \
	--role=roles/run.invoker --quiet >/dev/null
gcloud run services add-iam-policy-binding "$SERVICE_NAME" \
	--region="$REGION" \
	--member="user:$(gcloud config get-value account)" \
	--role=roles/run.invoker --quiet >/dev/null

# Creating a Scheduler job with --oidc-service-account-email below requires the
# deploying user to be able to actAs that SA — mirrors the run.invoker grant to the
# deploying user just above.
gcloud iam service-accounts add-iam-policy-binding "$INVOKER_SA_EMAIL" \
	--member="user:$(gcloud config get-value account)" \
	--role="roles/iam.serviceAccountUser" --quiet >/dev/null

echo "==> Cloud Scheduler: $SEASON_CHECK_JOB"
# Detects an ESPN season rollover and, if one happened, restarts the refresh
# chains for the new season and schedules cleanup of the old one's GCS files —
# see server/index.ts's /check-season. Daily is plenty; season transitions are a
# handful-of-times-a-year event, not a time-sensitive one.
if gcloud scheduler jobs describe "$SEASON_CHECK_JOB" --location="$REGION" >/dev/null 2>&1; then
	gcloud scheduler jobs update http "$SEASON_CHECK_JOB" \
		--location="$REGION" \
		--schedule="0 12 * * *" \
		--uri="${SERVICE_URL}/check-season" \
		--http-method=POST \
		--oidc-service-account-email="$INVOKER_SA_EMAIL" \
		--oidc-token-audience="$SERVICE_URL" --quiet >/dev/null
else
	gcloud scheduler jobs create http "$SEASON_CHECK_JOB" \
		--location="$REGION" \
		--schedule="0 12 * * *" \
		--uri="${SERVICE_URL}/check-season" \
		--http-method=POST \
		--oidc-service-account-email="$INVOKER_SA_EMAIL" \
		--oidc-token-audience="$SERVICE_URL" --quiet >/dev/null
fi

echo "==> Cloud Scheduler: $BETTING_REFRESH_JOB"
# Refreshes the current week's CFBD + ESPN-core-API betting fallback once every
# morning, well before any kickoff — see server/index.ts's /refresh-betting.
# 11:00 UTC matches the old daily GitHub Actions cadence this replaced.
if gcloud scheduler jobs describe "$BETTING_REFRESH_JOB" --location="$REGION" >/dev/null 2>&1; then
	gcloud scheduler jobs update http "$BETTING_REFRESH_JOB" \
		--location="$REGION" \
		--schedule="0 11 * * *" \
		--uri="${SERVICE_URL}/refresh-betting" \
		--http-method=POST \
		--oidc-service-account-email="$INVOKER_SA_EMAIL" \
		--oidc-token-audience="$SERVICE_URL" --quiet >/dev/null
else
	gcloud scheduler jobs create http "$BETTING_REFRESH_JOB" \
		--location="$REGION" \
		--schedule="0 11 * * *" \
		--uri="${SERVICE_URL}/refresh-betting" \
		--http-method=POST \
		--oidc-service-account-email="$INVOKER_SA_EMAIL" \
		--oidc-token-audience="$SERVICE_URL" --quiet >/dev/null
fi

echo "==> Deployed: $SERVICE_URL"

if [[ "${1:-}" == "--bootstrap" ]]; then
	echo "==> Bootstrapping refresh chains"
	curl -sf -X POST "${SERVICE_URL}/bootstrap" \
		-H "Authorization: Bearer $(gcloud auth print-identity-token)" \
		-H "Content-Type: application/json" \
		-d '{"reschedule": true}'
	echo

	echo "==> Seeding betting fallback data"
	curl -sf -X POST "${SERVICE_URL}/refresh-betting" \
		-H "Authorization: Bearer $(gcloud auth print-identity-token)"
	echo
fi
