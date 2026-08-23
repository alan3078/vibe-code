FROM node:20-alpine AS build
WORKDIR /workspace
COPY package.json package-lock.json ./
COPY apps/control-plane/package.json apps/control-plane/package.json
RUN npm ci
COPY apps/control-plane apps/control-plane
RUN npm --workspace apps/control-plane run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY apps/control-plane/package.json apps/control-plane/package.json
RUN npm ci --omit=dev --workspace apps/control-plane && npm cache clean --force
COPY --from=build /workspace/apps/control-plane/dist ./apps/control-plane/dist
COPY workspace-template/golden-app ./workspace-template/golden-app
COPY apps/control-plane/start.sh /usr/local/bin/vibe-control-plane-start
RUN mkdir -p /var/lib/vibe/workspaces \
  && chown -R node:node /var/lib/vibe \
  && chmod 0755 /usr/local/bin/vibe-control-plane-start
EXPOSE 3000
ENTRYPOINT ["/usr/local/bin/vibe-control-plane-start"]
