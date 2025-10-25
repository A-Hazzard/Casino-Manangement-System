import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    loader: 'default',
  },
  async redirects() {
    return [
      {
        source: '/collection',
        destination: '/collection-report',
        permanent: true,
      },
      {
        source: '/collections',
        destination: '/collection-report',
        permanent: true,
      },
      {
        source: '/collection-reports',
        destination: '/collection-report',
        permanent: true,
      },
      {
        source: '/login/',
        destination: '/login',
        permanent: true,
      },
    ];
  },
  webpack: config => {
    // Fix for react-day-picker and SendGrid internal module resolution issues
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      os: false,
      crypto: false,
      stream: false,
      util: false,
      buffer: false,
      events: false,
      http: false,
      https: false,
      net: false,
      tls: false,
      zlib: false,
      url: false,
      querystring: false,
    };

    // Ignore problematic internal module requests
    config.module.rules.push({
      test: /\.js$/,
      resolve: {
        fullySpecified: false,
      },
    });

    // Ignore SendGrid modules that use Node.js APIs in client-side code
    config.externals = config.externals || [];
    config.externals.push({
      '@sendgrid/helpers': 'commonjs @sendgrid/helpers',
      '@sendgrid/mail': 'commonjs @sendgrid/mail',
    });

    return config;
  },
};

export default nextConfig;
