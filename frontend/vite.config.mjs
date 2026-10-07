import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const projectRoot = dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, projectRoot, '');

  return {
    root: projectRoot,
    plugins: [react({ include: /\.[jt]sx?$/ })],
    build: {
      outDir: resolve(projectRoot, 'build'),
      emptyOutDir: true,
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      strictPort: true,
      proxy: {
        '/api': {
          target: env.COMMENT_TRACKER_API_PROXY || 'http://localhost:5000',
          changeOrigin: true,
          configure(proxy) {
            proxy.on('proxyReq', proxyReq => {
              proxyReq.setHeader('Origin', 'https://comment-tracker-frontend.onrender.com');
            });
            proxy.on('proxyRes', proxyRes => {
              const cookies = proxyRes.headers['set-cookie'];
              if (cookies) {
                proxyRes.headers['set-cookie'] = cookies.map(cookie => cookie
                  .replace(/;\s*SameSite=None/ig, '; SameSite=Lax')
                  .replace(/;\s*Secure/ig, ''));
              }
            });
          },
        },
      },
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: resolve(projectRoot, 'src/setupTests.js'),
    },
  };
});