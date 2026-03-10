/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: '/citizen-portal',
  assetPrefix: '/citizen-portal/',
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
};

export default nextConfig;