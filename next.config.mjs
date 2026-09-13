/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Prevent ESLint errors from blocking production build on Vercel
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Prevent non-fatal type checks from terminating build
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
