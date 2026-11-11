# Café Feedback production image (Lab 5, #24).
# One image serves the API and the built React app on $PORT. Cloud Run, CI and
# docker-compose all build this same file from the repository root:
#   docker build -t cafe-feedback .
# No secret is ever copied into the image: DATABASE_URL and SEED_PASSWORD are
# given at run time (Secret Manager on Cloud Run, .env locally).

# ---- Stage 1: install every dependency and build both workspaces -------------
FROM node:24-alpine AS build
WORKDIR /app
# Prisma's query engine needs OpenSSL on Alpine.
RUN apk add --no-cache openssl
# Manifests first, so `npm ci` stays cached until a dependency changes.
COPY package.json package-lock.json ./
COPY server/package.json server/package.json
COPY client/package.json client/package.json
# The server's postinstall runs `prisma generate`, which needs the schema.
COPY server/prisma/schema.prisma server/prisma/schema.prisma
RUN npm ci
COPY server/ server/
COPY client/ client/
RUN npm run build -w server \
 && npm run build -w client
# Keep only the runtime dependencies for the final stage (the Prisma CLI is one,
# because the migration job runs `prisma migrate deploy` from this image).
RUN npm prune --omit=dev

# ---- Stage 2: small runtime image, non-root ----------------------------------
FROM node:24-alpine AS runtime
RUN apk add --no-cache openssl
# The full commit SHA this image is built from, shown by GET /api/version (R-08).
# deploy.yml passes it with --build-arg; a local build says "unknown".
ARG APP_COMMIT=unknown
ENV APP_COMMIT=$APP_COMMIT
ENV NODE_ENV=production \
    PATH=/app/node_modules/.bin:$PATH \
    PORT=3000 \
    STATIC_DIR=/app/client/dist \
    TZ=Asia/Bangkok
WORKDIR /app/server
COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/server/package.json ./package.json
COPY --from=build /app/server/dist ./dist
COPY --from=build /app/server/prisma ./prisma
COPY --from=build /app/client/dist /app/client/dist
USER node
EXPOSE 3000
# The migration job overrides the command with:
#   sh -c "prisma migrate deploy && node dist/prisma/seed.js"
# `node` is PID 1, so it receives SIGTERM from Cloud Run directly.
CMD ["node", "dist/src/index.js"]
