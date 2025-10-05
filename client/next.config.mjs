/** @type {import('next').NextConfig} */
const nextConfig = {
  // Fix workspace root warning when using Turbopack
  turbopack: {
    root: '..',
  },
};

export default nextConfig;
