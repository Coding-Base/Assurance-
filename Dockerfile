# Multi-stage production build for SubseaFlow CAD Platform
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Serve stage using lightweight node server or preview
EXPOSE 3000

CMD ["npm", "run", "dev"]
