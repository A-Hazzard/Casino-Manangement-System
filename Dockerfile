# ⚡ Stage 1: Base Image
FROM node:18-alpine AS base
# Set working directory
WORKDIR /app

# Enable Corepack and use the latest pnpm
RUN corepack enable && corepack use pnpm

# ⚡ Stage 2: Dependencies Layer
FROM base AS deps

# Copy package.json and lock file separately for better caching
COPY package.json pnpm-lock.yaml ./

# Install dependencies using pnpm
RUN pnpm install --frozen-lockfile

# ⚡ Stage 3: Development Image
FROM base AS dev

# Set environment variables for development mode
ENV NODE_ENV=development

# Copy project files (excluding node_modules for volume mounting)
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Install additional tools (for debugging inside container)
RUN apk add --no-cache bash

# Expose Next.js default port
EXPOSE 3000

# Run Next.js in development mode
CMD ["pnpm", "dev"]
