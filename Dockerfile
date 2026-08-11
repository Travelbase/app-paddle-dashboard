# syntax=docker/dockerfile:1
#
# Team Paddle Dashboard — one tiny Node container that serves the static
# dashboard (dashboard.html + images/) and proxies /api/export to the legacy
# Travelbase export API. serve.js uses only Node built-ins, so there is nothing
# to install.
#
# Served under apps.travelbase.eu/a/paddle-dashboard/ behind the apps-gateway
# (Logto SSO). BASE_PATH lets serve.js strip that prefix.
FROM node:20-alpine
WORKDIR /app

COPY package.json serve.js dashboard.html favicon.svg ./
COPY images ./images

ENV NODE_ENV=production \
    PORT=8080 \
    BASE_PATH=/a/paddle-dashboard/

EXPOSE 8080
CMD ["node", "serve.js"]
