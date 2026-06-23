FROM node:20-alpine
WORKDIR /app

# Install backend deps
COPY backend/package*.json ./
RUN npm ci --production

# Copy backend source
COPY backend/ .

# Build TypeScript
RUN npm run build

EXPOSE 3001
CMD ["node", "dist/index.js"]
