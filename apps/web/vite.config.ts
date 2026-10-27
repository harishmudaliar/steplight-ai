/// <reference types="vitest" />
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { resolveApiBaseUrl } from '../../packages/shared/src/api/config';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const rootEnvDir = path.resolve(__dirname, '../../');
  const loadedEnv = loadEnv(mode, rootEnvDir, 'VITE_');
  const configuredApiUrl = process.env.VITE_API_BASE_URL || loadedEnv.VITE_API_BASE_URL;
  const apiBaseUrl = resolveApiBaseUrl(configuredApiUrl, mode === 'production');

  const isDevelopment = mode !== 'production';
  const developmentPolicy = isDevelopment
    ? ` ${new URL(apiBaseUrl).origin} ws://localhost:* ws://127.0.0.1:*`
    : '';
  const contentSecurityPolicy = [
    "default-src 'self'",
    `script-src 'self'${isDevelopment ? " 'unsafe-inline'" : ''}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    "img-src 'self' data: blob:",
    `connect-src 'self' https:${developmentPolicy}`,
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "frame-src 'none'",
    "form-action 'self'",
  ].join('; ');

  return {
  plugins: [
    react(),
    {
      name: 'steplight-renderer-csp',
      transformIndexHtml: {
        order: 'pre',
        handler() {
          return [{
            tag: 'meta',
            attrs: {
              'http-equiv': 'Content-Security-Policy',
              content: contentSecurityPolicy,
            },
            injectTo: 'head',
          }];
        },
      },
    },
  ],
  // Point Vite to root .env as local development source
  envDir: rootEnvDir,
  // STRICT SECURITY: Only expose variables with prefix VITE_ to the client bundle
  // Secrets like GEMINI_API_KEY, JWT_SECRET_KEY, DATABASE_URL are NEVER exposed to browser
  envPrefix: 'VITE_',
  base: './',
  resolve: {
    alias: {
      '@steplight/shared': path.resolve(__dirname, '../../packages/shared/src'),
    },
  },
  server: {
    port: 5173,
    host: 'localhost',
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
  };
});
