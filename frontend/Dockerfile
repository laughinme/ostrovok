# Build stage: install with the lockfile and build the standalone Next.js server.
# It runs on the build machine's own platform: the standalone server is plain JavaScript, so the
# output runs on linux/amd64 as is, and Apple Silicon does not have to emulate the Next.js build.
FROM --platform=$BUILDPLATFORM node:22.12-alpine3.20 AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
# Behind the gateway the API lives on the same origin.
ARG NEXT_PUBLIC_API_BASE_URL=/api/v1
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL \
    NEXT_TELEMETRY_DISABLED=1 \
    NEXT_OUTPUT=standalone
RUN npm run build

# Runtime stage: only the standalone server, static assets and public files; non-root.
FROM node:22.12-alpine3.20
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public
USER node
EXPOSE 3000
CMD ["node", "server.js"]
