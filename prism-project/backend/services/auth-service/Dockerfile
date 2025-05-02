FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Copy package files for efficient caching
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY dist/ ./dist/

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:4000/health || exit 1

# Environment variables
ENV NODE_ENV=production \
    PORT=4000

# Expose port
EXPOSE 4000

# Command
CMD ["node", "dist/index.js"]