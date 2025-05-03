FROM node:18-alpine

# Install dependencies needed for bcrypt compilation
RUN apk add --no-cache make gcc g++ python3 

WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies and rebuild bcrypt
RUN npm install
RUN npm rebuild bcrypt --build-from-source

# Copy source code
COPY . .

EXPOSE 4000

CMD ["npm", "run", "dev"]