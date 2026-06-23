FROM node:20-alpine
WORKDIR /app

# Install ALL deps (including dev for TypeScript build)
COPY backend/package*.json ./
RUN npm ci

# Copy backend source
COPY backend/ .

# Build TypeScript
RUN npm run build

# Now set production and prune devDependencies
ENV NODE_ENV=production
RUN npm prune

EXPOSE 3001
CMD ["node", "dist/index.js"]
