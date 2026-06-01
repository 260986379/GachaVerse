FROM node:20-alpine AS frontend-build
WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci --omit=dev
COPY backend/ ./
COPY --from=frontend-build /frontend/dist ./frontend/dist
COPY frontend/src/data/ ./frontend/src/data/
EXPOSE 8080
ENV PORT=8080
CMD ["node", "server.js"]
