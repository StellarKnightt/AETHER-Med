# ============================================
# AETHER-Med Frontend Dockerfile
# Node 20 + React + Vite
# ============================================

FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install dependencies
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install

# Copy source
COPY frontend/ .

# Expose Vite dev server port
EXPOSE 5173

# Run Vite dev server (accessible from outside container)
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
