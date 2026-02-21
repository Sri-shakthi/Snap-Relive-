#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:4000/api/v1}"
USER_ID="${USER_ID:-user_001}"
EVENT_ID="${EVENT_ID:-test}"

echo "Using BASE_URL=${BASE_URL}"
echo "Checking API health..."

HTTP_CODE="$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/health" || true)"
if [[ "${HTTP_CODE}" != "200" ]]; then
  echo "Backend not reachable at ${BASE_URL} (health status: ${HTTP_CODE})."
  echo "Start backend first: cd backend && npm run dev"
  exit 1
fi

echo ""
echo "=== Test 1: burst test (will hit rate limiter by design) ==="
npx autocannon -c 20 -d 20 -p 10 "${BASE_URL}/health"

echo ""
echo "Waiting 65s for rate-limit window reset..."
sleep 65

echo ""
echo "=== Test 2: controlled DB-backed endpoint (under rate limit) ==="
npx autocannon -a 80 -c 20 -p 1 "${BASE_URL}/matches?userId=${USER_ID}&eventId=${EVENT_ID}&limit=20"

cat <<'EOF'

How to interpret:
- If Test 1 shows many non-2xx, that is expected because RATE_LIMIT_MAX is enforced.
- Test 2 gives cleaner latency for a DB-backed request path.
- For production load tests, run from multiple source IPs or temporarily raise rate limits.
EOF
