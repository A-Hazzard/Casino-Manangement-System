import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverRuntimeConfig: {
    mongoUri: process.env.MONGO_URI,
    jwtSecret: process.env.JWT_SECRET,
    emailUser: process.env.EMAIL_USER,
    sendgridApiKey: process.env.SENDGRID_API_KEY,
  },
  publicRuntimeConfig: {
    appEnv: process.env.NODE_ENV,
  },
};

export default nextConfig;
