/** @type {import('next').NextConfig} */
const nextConfig = {
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
    ];
  },
  // other configurations can be added here
};

module.exports = nextConfig;