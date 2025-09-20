# Use Node 20 base image
FROM node:20-alpine

# Set working directory
WORKDIR /app/evolution1

# Install pnpm 10
RUN corepack enable && corepack prepare pnpm@10.0.0 --activate

# Copy package file for dependency caching
COPY ./package.json ./

# Install dependencies (without frozen lockfile since it may not exist)
RUN pnpm install

# Copy everything else
COPY . .

# Set environment variables (will be replaced via GitLab CI)
ARG NODE_ENV
ARG MONGO_URI
ARG JWT_SECRET
ARG EMAIL_USER
ARG SENDGRID_API_KEY

ENV NODE_ENV=${NODE_ENV}
ENV MONGO_URI=${MONGO_URI}
ENV JWT_SECRET=${JWT_SECRET}
ENV EMAIL_USER=${EMAIL_USER}
ENV SENDGRID_API_KEY=${SENDGRID_API_KEY}

# Build the Next.js app
# Provide placeholder values for build-time checks if not passed via --build-arg
# The actual runtime values will be set by the ENV instructions above using ARGs passed during build or CI/CD runtime injection
RUN MONGO_URI=${MONGO_URI:-dummy_mongo_uri} \
    JWT_SECRET=${JWT_SECRET:-dummy_jwt_secret} \
    EMAIL_USER=${EMAIL_USER:-dummy_email_user} \
    SENDGRID_API_KEY=${SENDGRID_API_KEY:-dummy_sendgrid_key} \
    NODE_ENV=${NODE_ENV:-production} \
    pnpm build

# Expose the production port
EXPOSE 3000

# Start the app
CMD ["pnpm", "start"]
