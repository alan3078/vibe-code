FROM node:20-alpine AS build
WORKDIR /workspace
ARG VITE_API_URL=http://localhost:3000/api
ENV VITE_API_URL=$VITE_API_URL
COPY package.json package-lock.json ./
COPY apps/portal/package.json apps/portal/package.json
RUN npm ci
COPY apps/portal apps/portal
RUN npm --workspace apps/portal run build

FROM nginx:1.27-alpine
COPY apps/portal/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /workspace/apps/portal/dist /usr/share/nginx/html
EXPOSE 80
