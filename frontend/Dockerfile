FROM --platform=$BUILDPLATFORM node:22.22.2-alpine3.22 AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
ARG BACKEND_URL=http://backend:8000
ENV BACKEND_URL=$BACKEND_URL
RUN npm run build

FROM node:22.22.2-alpine3.22
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000 BACKEND_URL=http://backend:8000
COPY --from=builder --chown=node:node /app/.output ./.output
USER node
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
