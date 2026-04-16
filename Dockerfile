# Use Node 20 base image
FROM node:20-alpine

# Set working directory
WORKDIR /app/evolution1

# Install bun
RUN npm install -g bun

# Copy package file for dependency caching
COPY ./package.json ./

# Install dependencies (without frozen lockfile since it may not exist)
RUN bun install

# Copy everything else
COPY . .

# Set environment variables (will be replaced via GitLab CI)
ARG NODE_ENV
ARG MONGODB_URI
ARG JWT_SECRET

ENV NODE_ENV=${NODE_ENV}
ENV MONGODB_URI=${MONGODB_URI}
ENV JWT_SECRET=${JWT_SECRET}

# Build the Next.js app
# Provide placeholder values for build-time checks if not passed via --build-arg
# The actual runtime values will be set by the ENV instructions above using ARGs passed during build or CI/CD runtime injection
RUN MONGODB_URI=${MONGODB_URI:-dummy_MONGODB_URI} \
    JWT_SECRET=${JWT_SECRET:-dummy_jwt_secret} \
    NODE_ENV=${NODE_ENV:-production} \
    bun run build

# Expose the production port
EXPOSE 3000

# Start the app
CMD ["bun", "run", "start"]
