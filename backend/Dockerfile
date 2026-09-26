FROM node:20-alpine
WORKDIR /app
COPY backend/package*.json ./
# --omit=optional drops firebase-admin's optional Firestore/Storage clients.
# Only admin.auth() is used; those packages carried every remaining npm advisory (#53).
# If the backend ever uses admin.firestore() or admin.storage(), remove --omit=optional.
RUN npm ci --omit=dev --omit=optional
COPY backend/ ./
EXPOSE 8080
ENV PORT=8080
CMD ["node", "server.js"]
