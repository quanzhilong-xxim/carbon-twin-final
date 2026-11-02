/** @type {import('next').NextConfig} */
export default function nextConfig(phase) {
  return {
    reactStrictMode: true,
    poweredByHeader: false,
    allowedDevOrigins: ['127.0.0.1'],
    // Keep Vercel's standard production directory; dev never writes to it.
    distDir: phase === 'phase-development-server' ? (process.env.CARBONTWIN_DEV_DIR || '.next-dev') : '.next',
  };
}
