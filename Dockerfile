# Single-stage build: prioritizes "actually works" over minimal image size.
# Not verified against a live Docker build in this environment (the Docker daemon
# isn't startable in this sandbox) — sanity-checked against the actual build/start
# scripts and deps, but test a real `docker build` before relying on this in production.

FROM node:22-alpine AS app

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# DATABASE_URL/JWT_SECRET must be provided at build+run time (see .env.example).
# Defaults here only exist so `prisma generate`/`next build` don't fail on a
# missing env var — they are NOT usable credentials (this placeholder DATABASE_URL
# is never connected to at build time, only parsed).
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"
ENV JWT_SECRET="build-time-placeholder-override-at-runtime"

RUN npx prisma generate
RUN npm run build

ENV NODE_ENV=production
EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
