FROM node:18-alpine

# Create app directory
WORKDIR /app

# Copy package files for efficient caching
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Expose port
EXPOSE 5173

# Command for development with hot reloading
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]