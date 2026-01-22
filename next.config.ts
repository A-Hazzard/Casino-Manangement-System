import type { NextConfig } from 'next';
import type { Configuration } from 'webpack';
import withBundleAnalyzer from '@next/bundle-analyzer';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    loader: 'default',
  },
  outputFileTracingExcludes: {
    '*': [
      'scripts/**',
      'backup/**',
      'mongo-migration/**',
      'node_modules/**/test/**',
      'node_modules/**/tests/**',
      'node_modules/**/*.test.js',
      'node_modules/**/*.spec.js',
      'node_modules/**/README.md',
      'node_modules/**/CHANGELOG.md',
      'node_modules/**/LICENSE',
    ],
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
  webpack: (config: Configuration) => {
    if (!config.resolve) {
      config.resolve = {};
    }

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
    if (!config.resolve.modules) {
      config.resolve.modules = [];
    }

    if (!config.module) {
      config.module = { rules: [] };
    }

    if (!config.module.rules) {
      config.module.rules = [];
    }

    // Ignore problematic internal module requests
    if (Array.isArray(config.module.rules)) {
      config.module.rules.push({
        test: /\.js$/,
        resolve: {
          fullySpecified: false,
        },
      });
    }

    // Ignore SendGrid modules that use Node.js APIs in client-side code
    if (!config.externals) {
      config.externals = [];
    }

    if (Array.isArray(config.externals)) {
      config.externals.push({
        '@sendgrid/helpers': 'commonjs @sendgrid/helpers',
        '@sendgrid/mail': 'commonjs @sendgrid/mail',
      });
    }

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
  // Turbopack configuration for Next.js 16+
  // Turbopack handles most module resolution automatically
  // This empty config silences the warning about webpack config with no turbopack config
  turbopack: {},
};

const withAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

export default withAnalyzer(nextConfig);

