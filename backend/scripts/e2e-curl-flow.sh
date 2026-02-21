#!/usr/bin/env bash
set -euo pipefail

# Snapshots API end-to-end curl flow
#
# Usage:
#   chmod +x scripts/e2e-curl-flow.sh
#   ./scripts/e2e-curl-flow.sh ./selfie.jpg ./event-photo-1.jpg
#
# Optional environment overrides:
#   BASE_URL="http://localhost:4000/api/v1" ./scripts/e2e-curl-flow.sh ./selfie.jpg ./event-photo-1.jpg
#   USER_ID="user_123" ./scripts/e2e-curl-flow.sh ./selfie.jpg ./event-photo-1.jpg
#
# Prerequisites:
# - API running (npm run dev)
# - Worker running (npm run worker)
# - jq installed

if [ "$#" -lt 2 ]; then
  echo "Usage: $0 <selfie-file> <event-photo-file>"
  exit 1
fi

SELFIE_FILE="$1"
PHOTO_FILE="$2"

if [ ! -f "$SELFIE_FILE" ]; then
  echo "Selfie file not found: $SELFIE_FILE"
  exit 1
fi

if [ ! -f "$PHOTO_FILE" ]; then
  echo "Event photo file not found: $PHOTO_FILE"
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required. Install jq and re-run."
  exit 1
fi

BASE_URL="${BASE_URL:-http://localhost:4000/api/v1}"
USER_ID="${USER_ID:-user_001}"
CONTENT_TYPE="${CONTENT_TYPE:-image/jpeg}"

STARTS_AT="${STARTS_AT:-2026-02-20T10:00:00.000Z}"
ENDS_AT="${ENDS_AT:-2026-02-20T18:00:00.000Z}"
EVENT_NAME="${EVENT_NAME:-Snapshots Launch}"

echo "[1/9] Creating event..."
EVENT_RESPONSE=$(curl -sS -X POST "$BASE_URL/events" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"$EVENT_NAME\",\"startsAt\":\"$STARTS_AT\",\"endsAt\":\"$ENDS_AT\"}")

EVENT_ID=$(echo "$EVENT_RESPONSE" | jq -r '.data.event.id')
if [ -z "$EVENT_ID" ] || [ "$EVENT_ID" = "null" ]; then
  echo "Failed to create event"
  echo "$EVENT_RESPONSE" | jq .
  exit 1
fi

echo "EVENT_ID=$EVENT_ID"

echo "[2/9] Requesting selfie presigned URL..."
SELFIE_PRESIGN=$(curl -sS -X POST "$BASE_URL/selfies/presign" \
  -H "Content-Type: application/json" \
  -d "{\"userId\":\"$USER_ID\",\"eventId\":\"$EVENT_ID\",\"contentType\":\"$CONTENT_TYPE\"}")

SELFIE_UPLOAD_URL=$(echo "$SELFIE_PRESIGN" | jq -r '.data.uploadUrl')
SELFIE_BUCKET=$(echo "$SELFIE_PRESIGN" | jq -r '.data.bucket')
SELFIE_KEY=$(echo "$SELFIE_PRESIGN" | jq -r '.data.s3Key')

echo "[3/9] Uploading selfie to S3..."
curl -sS -X PUT "$SELFIE_UPLOAD_URL" \
  -H "Content-Type: $CONTENT_TYPE" \
  --data-binary "@$SELFIE_FILE" >/dev/null

echo "[4/9] Confirming selfie upload..."
SELFIE_CONFIRM=$(curl -sS -X POST "$BASE_URL/selfies/confirm" \
  -H "Content-Type: application/json" \
  -d "{\"userId\":\"$USER_ID\",\"eventId\":\"$EVENT_ID\",\"bucket\":\"$SELFIE_BUCKET\",\"s3Key\":\"$SELFIE_KEY\"}")

echo "$SELFIE_CONFIRM" | jq .

echo "[5/9] Requesting event photo presigned URL..."
PHOTO_PRESIGN=$(curl -sS -X POST "$BASE_URL/photos/presign" \
  -H "Content-Type: application/json" \
  -d "{\"eventId\":\"$EVENT_ID\",\"contentType\":\"$CONTENT_TYPE\"}")

PHOTO_UPLOAD_URL=$(echo "$PHOTO_PRESIGN" | jq -r '.data.uploadUrl')
PHOTO_BUCKET=$(echo "$PHOTO_PRESIGN" | jq -r '.data.bucket')
PHOTO_KEY=$(echo "$PHOTO_PRESIGN" | jq -r '.data.s3Key')

echo "[6/9] Uploading event photo to S3..."
curl -sS -X PUT "$PHOTO_UPLOAD_URL" \
  -H "Content-Type: $CONTENT_TYPE" \
  --data-binary "@$PHOTO_FILE" >/dev/null

echo "[7/9] Confirming event photo upload..."
PHOTO_CONFIRM=$(curl -sS -X POST "$BASE_URL/photos/confirm" \
  -H "Content-Type: application/json" \
  -d "{\"eventId\":\"$EVENT_ID\",\"bucket\":\"$PHOTO_BUCKET\",\"s3Key\":\"$PHOTO_KEY\"}")

echo "$PHOTO_CONFIRM" | jq .

echo "[8/9] Waiting for worker to process jobs (5 seconds)..."
sleep 5

echo "Fetching matches..."
MATCHES=$(curl -sS "$BASE_URL/matches?userId=$USER_ID&eventId=$EVENT_ID&limit=20")
echo "$MATCHES" | jq .

echo "[9/9] Health check..."
curl -sS "$BASE_URL/health" | jq .

echo "Done."
echo "Use these values for debugging:"
echo "  EVENT_ID=$EVENT_ID"
echo "  USER_ID=$USER_ID"
echo "  SELFIE_KEY=$SELFIE_KEY"
echo "  PHOTO_KEY=$PHOTO_KEY"
