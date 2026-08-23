FROM node:22-alpine

# Run as a non-root user for the runtime stage.
RUN addgroup -S app && adduser -S app -G app

WORKDIR /app

# Install ALL deps first (dev deps needed for the TypeScript build) so Docker
# can cache this layer independently of source changes.
COPY backend/package*.json ./
RUN npm ci

# Copy backend source and build.
COPY backend/ ./
RUN npm run build

# Production image: prune dev dependencies, drop root, declare a health check
# against /health (which now verifies database reachability).
ENV NODE_ENV=production
RUN npm prune --omit=dev && npm cache clean --force

USER app
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3001/health || exit 1

CMD ["node", "dist/index.js"]
