# backend/services/report-generation-service/Dockerfile
FROM node:18-alpine

WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Create storage directory
RUN mkdir -p storage

EXPOSE 4002

CMD ["npm", "run", "dev"]