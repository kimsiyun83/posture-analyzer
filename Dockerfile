# Single-stage build: prioritizes "actually works" over minimal image size, since
# this project depends on native modules (@libsql/client) whose platform-specific
# binaries are easy to lose track of in an aggressive multi-stage `standalone` copy.
# Not verified against a live Docker build in this environment (Docker wasn't
# available) — sanity-checked against the actual build/start scripts and deps, but
# test a real `docker build` before relying on this in production.

FROM node:22-alpine AS app

WORKDIR /app

# Native deps (@libsql/client) need these on alpine.
RUN apk add --no-cache libc6-compat

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# DATABASE_URL/JWT_SECRET must be provided at build+run time (see .env.example).
# Defaults here only exist so `prisma generate`/`next build` don't fail on a
# missing env var — they are NOT usable credentials.
ENV DATABASE_URL="file:./prisma/dev.db"
ENV JWT_SECRET="build-time-placeholder-override-at-runtime"

RUN npx prisma generate
RUN npm run build

ENV NODE_ENV=production
EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
