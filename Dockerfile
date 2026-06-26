# Use the current Node.js base image
FROM node:24-alpine

# Set working directory
WORKDIR /app/evolution1

# Copy package files for dependency caching
COPY package*.json ./

# Install dependencies (--legacy-peer-deps resolves next-auth peerOptional conflict with nodemailer v8)
RUN npm install --legacy-peer-deps

# Copy everything else
COPY . .

# ==========================================
# 1. PUBLIC BUILD-TIME ARGUMENTS
# ==========================================
# Next.js hardcodes these into the client bundle during 'npm run build'.
# They MUST be declared here so Next.js can see them during compilation.
ARG NODE_ENV=production
ARG NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

ENV NODE_ENV=${NODE_ENV}
ENV NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=${NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}

# ==========================================
# 2. RUNTIME ENVIRONMENT VARIABLES
# ==========================================
# These are server-side secrets. We do NOT need them at build time anymore!
# They will be injected automatically when the container boots up 
# (either from your local .env file or from your cloud provider's Secret Manager).
ENV API_BASE_URL=${API_BASE_URL:-http://localhost:3000}
ENV COOKIE_SECURE=${COOKIE_SECURE:-false}
ENV MONGODB_URI=${MONGODB_URI}
ENV JWT_SECRET=${JWT_SECRET}
ENV DEFAULT_PASSWORD=${DEFAULT_PASSWORD}
ENV ENABLE_E2E_AUTH=${ENABLE_E2E_AUTH:-true}
ENV MQTT_URI=${MQTT_URI}
ENV MQTT_PUB_TOPIC=${MQTT_PUB_TOPIC}
ENV MQTT_CFG_TOPIC=${MQTT_CFG_TOPIC}
ENV MQTT_SUB_TOPIC=${MQTT_SUB_TOPIC}
ENV GMAIL_USER=${GMAIL_USER}
ENV GMAIL_APP_PASSWORD=${GMAIL_APP_PASSWORD}
ENV GOOGLE_DRIVE_OAUTH_CLIENT_ID=${GOOGLE_DRIVE_OAUTH_CLIENT_ID}
ENV GOOGLE_DRIVE_OAUTH_CLIENT_SECRET=${GOOGLE_DRIVE_OAUTH_CLIENT_SECRET}
ENV GOOGLE_DRIVE_REFRESH_TOKEN=${GOOGLE_DRIVE_REFRESH_TOKEN}
ENV GOOGLE_DRIVE_ROOT_FOLDER_ID=${GOOGLE_DRIVE_ROOT_FOLDER_ID}
ENV INFOBIP_BASE_URL=${INFOBIP_BASE_URL}
ENV INFOBIP_API_KEY=${INFOBIP_API_KEY}

# ==========================================
# 3. BUILD THE NEXT.JS APP
# ==========================================
# Because server-side secrets aren't required to build the static pages,
# we only pass the public keys and clear dummy fallbacks for safety.
RUN NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=${NEXT_PUBLIC_GOOGLE_MAPS_API_KEY:-dummy_google_maps_key} \
    NODE_ENV=${NODE_ENV} \
    NODE_OPTIONS="--max-old-space-size=4096" \
    npm run build

# Expose the production port
EXPOSE 3000

# Start the app
CMD ["npm", "run", "start"]