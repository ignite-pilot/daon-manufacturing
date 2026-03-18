import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  root: 'client',
  plugins: [react()],
  server: {
    port: 3500,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        // 로그인 응답 Set-Cookie가 3500에서도 저장·전송되도록 (개발 시 포트 불일치 보정)
        cookieDomainRewrite: 'localhost',
        secure: false,
      },
    },
  },
});
