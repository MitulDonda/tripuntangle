FROM node:20-alpine

# Install OpenSSL for Prisma Query Engine (required for SSL DB connections)
RUN apk add --no-cache openssl

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install all dependencies (including types/typescript for build)
RUN npm install

# Copy source
COPY . .

# Build TypeScript
RUN npm run build

# Expose port
EXPOSE 3000

CMD ["npm", "start"]
