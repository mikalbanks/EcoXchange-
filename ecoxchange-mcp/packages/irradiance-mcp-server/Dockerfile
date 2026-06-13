# Irradiance MCP server image.
#
# IMPORTANT: the build context must be the `ecoxchange-mcp` workspace root, not
# this package directory, because the server depends on the `@ecoxchange/shared`
# workspace package. The root docker-compose.yml sets the context accordingly:
#   build:
#     context: ./ecoxchange-mcp
#     dockerfile: packages/irradiance-mcp-server/Dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY packages ./packages
RUN npm ci
# Build the shared package before the server so its type/JS output exists.
RUN npm run build -w @ecoxchange/shared \
 && npm run build -w @ecoxchange/irradiance-mcp-server

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3002
# Copy hoisted node_modules (includes the @ecoxchange/shared symlink) and the
# built workspace packages.
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
EXPOSE 3002
CMD ["node", "packages/irradiance-mcp-server/dist/index.js"]
