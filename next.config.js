/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return {
      // SPA 폴백: /api, /_next, /assets 제외한 경로만 /index.html로 (API 404 방지)
      beforeFiles: [
        { source: '/_next/:path*', destination: '/_next/:path*' },
        { source: '/assets/:path*', destination: '/assets/:path*' },
        // /api 로 시작하지 않는 경로만 index.html로 (정규식)
        { source: '/:path((?!api/).)*', destination: '/index.html' },
      ],
    };
  },
};

module.exports = nextConfig;
