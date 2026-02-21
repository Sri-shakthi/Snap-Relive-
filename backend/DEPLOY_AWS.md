# Snapshots AWS Deployment Checklist

Use this checklist to deploy production backend + worker and connect your Vercel frontend.

## 1. AWS prerequisites
- Create IAM user/role for backend with access to:
- `S3` (read/write on your bucket)
- `Rekognition` (collections + face search/index APIs)
- `SQS` (send/receive/delete on queue)
- `CloudWatch Logs`
- Create these resources:
- `RDS MySQL` (production DB)
- `S3 bucket` (private)
- `SQS queue` (jobs)
- `CloudFront distribution` in front of S3 (optional but recommended)

## 2. Database setup
- Create MySQL database named `snapshots`.
- Confirm network access from your compute service (App Runner/ECS/EC2).
- Set `DATABASE_URL`:
```bash
mysql://<user>:<password>@<rds-endpoint>:3306/snapshots
```

## 3. Build and push backend image to ECR
```bash
aws ecr create-repository --repository-name snapshots-backend
aws ecr get-login-password --region <region> | docker login --username AWS --password-stdin <account>.dkr.ecr.<region>.amazonaws.com
docker build -t snapshots-backend ./backend
docker tag snapshots-backend:latest <account>.dkr.ecr.<region>.amazonaws.com/snapshots-backend:latest
docker push <account>.dkr.ecr.<region>.amazonaws.com/snapshots-backend:latest
```

## 4. Deploy API service (App Runner or ECS)
- Deploy image from ECR.
- Expose port `4000`.
- Health check path: `/api/v1/health`.
- Set environment variables:
```bash
NODE_ENV=production
PORT=4000
API_PREFIX=/api/v1

DATABASE_URL=mysql://<user>:<password>@<rds-endpoint>:3306/snapshots

AWS_REGION=<region>
AWS_ACCESS_KEY_ID=<key>
AWS_SECRET_ACCESS_KEY=<secret>
AWS_S3_BUCKET=<bucket-name>
AWS_S3_PRESIGN_EXPIRES=900
AWS_S3_GET_EXPIRES=86400
CLOUDFRONT_BASE_URL=https://<distribution-domain>

REKOGNITION_COLLECTION_PREFIX=snapshots-event-

QUEUE_PROVIDER=sqs
AWS_SQS_QUEUE_URL=https://sqs.<region>.amazonaws.com/<account>/<queue-name>
QUEUE_MAX_ATTEMPTS=5
QUEUE_RETRY_BASE_MS=500

RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=120

REMATCH_DEBOUNCE_MS=5000
REMATCH_BATCH_SIZE=25
MATCH_REFRESH_COOLDOWN_MS=15000
```

## 5. Deploy worker service (separate)
- Deploy same image as API, but worker command:
```bash
npm run worker
```
- Use same env vars as API.
- Run at least 1 instance.

## 6. Run Prisma migrations in production
- One-time per release:
```bash
cd backend
npm ci
npm run prisma:generate
npm run prisma:deploy
```

## 7. S3 + CloudFront access
- Keep S3 bucket private (Block Public Access ON).
- Attach OAC to CloudFront S3 origin.
- Bucket policy must allow CloudFront distribution ARN to `s3:GetObject`.
- Validate by opening one image URL from CloudFront directly.

## 8. Vercel frontend configuration
- Set frontend env var:
```bash
VITE_API_BASE_URL=https://<api-domain>/api/v1
```
- Publish frontend.

## 9. Organizer-only event creation flow
- Use organizer route:
- `/#/organizer`
- Create event from organizer console.
- Share generated links:
- Guest: `/#/join/<eventId>`
- Photographer: `/#/upload/<eventId>`
- Do not share organizer link publicly.

## 10. Smoke test
- `GET /api/v1/health` returns 200.
- Create event from organizer UI.
- Upload selfie via guest link.
- Upload event photos via photographer link.
- Worker processes jobs.
- Matches appear in gallery.

## 11. Optional hardening
- Move AWS secrets to Secrets Manager/SSM.
- Use IAM role (no static keys) for App Runner/ECS.
- Add WAF in front of API.
- Add alarms for queue depth, worker failures, 5xx rate.
