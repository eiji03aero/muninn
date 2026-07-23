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
        description: '個人ナレッジベースのビューア（follows / notes / moc）',
        start_url: '/muninn/',
        scope: '/muninn/',
        display: 'standalone',
        background_color: '#0f172a',
        theme_color: '#0f172a',
        icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }],
      },
      workbox: { globPatterns: ['**/*.{js,css,html,svg,json}'] },
    }),
  ],
});
