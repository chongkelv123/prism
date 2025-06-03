# backend/services/platform-integrations-service/Dockerfile
FROM node:18-alpine

WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

EXPOSE 4005

CMD ["npm", "run", "dev"]