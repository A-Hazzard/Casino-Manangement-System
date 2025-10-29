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

    // Normalize module paths to handle case sensitivity warnings
    config.resolve.extensionAlias = {
      '.js': ['.js', '.ts', '.tsx'],
      '.jsx': ['.jsx', '.tsx'],
    };

    // Ignore case sensitivity warnings for module resolution
    if (config.resolve) {
      config.resolve.modules = config.resolve.modules || [];
    }

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

    // Suppress case sensitivity warnings
    config.ignoreWarnings = [
      ...(config.ignoreWarnings || []),
      /Failed to parse source map/,
      {
        module: /node_modules\/@radix-ui/,
        message: /multiple modules with names that only differ in casing/,
      },
    ];

    return config;
  },
};

export default nextConfig;
