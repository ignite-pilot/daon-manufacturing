/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return {
      // 프로덕션: 루트(/) 및 SPA 경로는 Vite 빌드 index.html로 (public은 빌드 시 client/dist 복사)
      beforeFiles: [
        { source: '/api/:path*', destination: '/api/:path*' },
        { source: '/_next/:path*', destination: '/_next/:path*' },
        { source: '/assets/:path*', destination: '/assets/:path*' },
        { source: '/:path*', destination: '/index.html' },
      ],
    };
  },
};

module.exports = nextConfig;
