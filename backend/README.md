# Snapshots Backend

Production-ready MVP backend for selfie-to-event-photo matching with asynchronous face processing.

## Stack
- Node.js + Express + TypeScript
- Prisma ORM + MySQL (Docker)
- Joi validation
- AWS SDK v3 (S3 + Rekognition + optional SQS)
- Worker-based async processing

## Project Structure
Follows layered architecture:
- `routes`: try/catch, validation, controller call, response send
- `validation`: Joi schema + explicit `if/else`
- `controllers`: orchestration only
- `data-access`: Prisma-only DB operations
- `services`: AWS + queue + job handlers
- `middleware`: request-id, logger, rate-limit, error handler
- `config`: env validation + typed config

## Prerequisites
- Node.js 22+
- Docker
- AWS credentials with S3 and Rekognition access

## Environment
1. Copy env template:
```bash
cp .env.example .env
```
Prisma Migrate reads `DATABASE_URL` from `prisma.config.ts`.

2. Fill required values:
- `DATABASE_URL`
- `AWS_REGION`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_S3_BUCKET`

## Run MySQL via Docker
```bash
docker compose up -d
```

## Install + Migrate + Start
```bash
npm install
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

Run worker (separate terminal):
```bash
npm run worker
```

## API Base
- Base path: `/api/v1`
- Swagger docs: `/docs`
- Health: `GET /api/v1/health`

## Endpoint Flow
1. Create event
```http
POST /api/v1/events
```

2. Selfie upload
- Request presigned PUT URL
```http
POST /api/v1/selfies/presign
```
- Upload file directly to S3 with returned `uploadUrl`
- Confirm upload and enqueue processing
```http
POST /api/v1/selfies/confirm
```

3. Event photo upload
- Request presigned PUT URL
```http
POST /api/v1/photos/presign
```
- Upload file directly to S3 with returned `uploadUrl`
- Confirm upload and enqueue processing
```http
POST /api/v1/photos/confirm
```

4. Fetch matches (paginated)
```http
GET /api/v1/matches?userId=...&eventId=...&cursor=...&limit=20
```

## Queue Notes
- `QUEUE_PROVIDER=memory`: local fallback queue.
- `QUEUE_PROVIDER=sqs`: production mode with external queue for horizontally-scaled API/worker instances.

## Scaling Notes
- Do not run Rekognition in request path for large uploads.
- Use SQS (or Redis streams) for durable job delivery.
- Run multiple worker replicas for parallel processing.
- Keep API stateless; autoscale independently of workers.
- Add CDN in front of S3 presigned GET where needed.

## Tests
```bash
npm test
```
Includes:
- Joi validation unit tests
- Controller orchestration test
