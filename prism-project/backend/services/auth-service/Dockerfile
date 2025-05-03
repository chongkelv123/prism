# ─── Builder ─────────────────────────────────────────────────
FROM node:18-alpine AS builder
WORKDIR /usr/src/app

# install deps
COPY package*.json ./
RUN npm ci

# compile (assumes "build" → outputs to ./dist)
COPY . .
RUN npm run build

# ─── Production ──────────────────────────────────────────────
FROM node:18-alpine
WORKDIR /usr/src/app

# copy only what we need
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY package*.json ./

ENV NODE_ENV=production \
    PORT=4000

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:4000/health || exit 1

CMD ["node", "dist/index.js"]
