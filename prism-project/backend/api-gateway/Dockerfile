# ─── Builder Stage ───────────────────────────────────────────
FROM node:18-alpine AS builder
WORKDIR /usr/src/app

# Copy only manifest (lockfile optional)
COPY package.json package-lock.json* ./

# Install all dependencies (dev + prod)
RUN npm install

# Copy source and compile TypeScript → dist/
COPY . .
RUN npm run build

# ─── Production Stage ────────────────────────────────────────
FROM node:18-alpine
WORKDIR /usr/src/app

# Copy manifest again (lockfile optional)
COPY package.json package-lock.json* ./

# Install only production dependencies
RUN npm install --omit=dev

# Pull in compiled output
COPY --from=builder /usr/src/app/dist ./dist

# (Optional) copy any static assets needed at runtime
# COPY --from=builder /usr/src/app/public ./public

ENV NODE_ENV=production \
    PORT=3000

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "dist/index.js"]
