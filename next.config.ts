import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    loader: "default",
  },
  async redirects() {
    return [
      {
        source: "/collection",
        destination: "/collection-report",
        permanent: true,
      },
      {
        source: "/collections",
        destination: "/collection-report",
        permanent: true,
      },
      {
        source: "/collection-reports",
        destination: "/collection-report",
        permanent: true,
      },
      {
        source: "/login/",
        destination: "/login",
        permanent: true,
      },
    ];
  },
  webpack: (config) => {
    // Fix for react-day-picker internal module resolution issues
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      os: false,
    };

    // Ignore problematic internal module requests from react-day-picker
    config.module.rules.push({
      test: /\.js$/,
      resolve: {
        fullySpecified: false,
      },
    });

    return config;
  },
};

export default nextConfig;
