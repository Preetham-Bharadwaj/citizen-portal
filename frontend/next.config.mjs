/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: '/citizen-portal',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
