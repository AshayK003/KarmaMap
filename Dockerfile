FROM node:20-alpine
WORKDIR /app

# Install ALL deps (including dev for TypeScript build)
COPY backend/package*.json ./
RUN npm ci

# Copy backend source
COPY backend/ .

# Build TypeScript
RUN npm run build

# Remove devDependencies after build
RUN npm prune --production

EXPOSE 3001
CMD ["node", "dist/index.js"]
