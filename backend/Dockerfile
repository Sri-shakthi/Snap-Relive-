FROM node:22-alpine AS base
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json jest.config.ts ./
COPY prisma ./prisma
COPY src ./src

RUN npm run build

EXPOSE 4000
CMD ["npm", "run", "start"]
