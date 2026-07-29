import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages のサブパス配信（https://<user>.github.io/muninn/）に合わせて base を固定。
export default defineConfig({
  base: '/muninn/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'muninn',
        short_name: 'muninn',
        description: '個人ナレッジベースのビューア（follows / notes / moc / atlas / logs）',
        start_url: '/muninn/',
        scope: '/muninn/',
        display: 'standalone',
        background_color: '#090a14',
        theme_color: '#090a14',
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'icon-maskable.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: { globPatterns: ['**/*.{js,css,html,svg,png,json}'] },
    }),
  ],
});
