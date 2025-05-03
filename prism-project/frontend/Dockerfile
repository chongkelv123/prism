# ─── Builder ─────────────────────────────────────────────────
FROM node:18-alpine AS builder
WORKDIR /app

# copy only manifest (lockfile optional)
COPY package.json package-lock.json* ./

# install all deps (npm ci → npm install fallback)
RUN npm install

# bring in your source & build
COPY . .
RUN npm run build         # dist/ gets generated

# ─── Production ──────────────────────────────────────────────
FROM nginx:stable-alpine
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
