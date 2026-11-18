import {existsSync} from 'node:fs';
import path from 'node:path';

/** @type {import('next').NextConfig} */
export default function nextConfig(phase) {
  return {
    reactStrictMode: true,
    poweredByHeader: false,
    allowedDevOrigins: ['127.0.0.1'],
    // An isolated review build leaves the running development and previous
    // production previews intact. Normal deployments keep the standard path.
    distDir: phase === 'phase-development-server' ? (process.env.CARBONTWIN_DEV_DIR || '.next-dev') : (process.env.CARBONTWIN_PREVIEW_DIR || '.next'),
    // Story assets are content-addressed by filename (v1312A, v1311D, ...), so a long
    // immutable cache is safe and stops every visit from re-downloading the 20-35 MB
    // character GLBs over the slow review tunnel. Older revisions keep their own names.
    async headers() {
      return [
        {
          source: '/models/:path*',
          headers: [{key: 'Cache-Control', value: 'public, max-age=31536000, immutable'}],
        },
        {
          source: '/media/:path*',
          headers: [{key: 'Cache-Control', value: 'public, max-age=604800'}],
        },
      ];
    },
    // Local compiler caches are regenerable and do not belong in the runtime
    // artifact. Preserve portable/deployed defaults when this D drive is absent.
    webpack(config, {isServer,dev}) {
      const cacheRoot = process.env.CARBONTWIN_WEBPACK_CACHE_DIR ||
        (process.platform === 'win32' && existsSync('D:/Dev_Cache') ? 'D:/Dev_Cache/CarbonTwin_Next' : undefined);
      if (cacheRoot && !dev && config.cache && typeof config.cache === 'object' && config.cache.type === 'filesystem') {
        config.cache.cacheDirectory = path.join(cacheRoot,config.name || (isServer ? 'server' : 'client'));
      }
      return config;
    },
  };
}
