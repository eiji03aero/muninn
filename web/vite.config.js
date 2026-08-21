import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages のサブパス配信（https://<user>.github.io/muninn/）に合わせて base を固定。
export default defineConfig({
  base: '/muninn/',
  plugins: [
    react(),
    VitePWA({
      // **`autoUpdate` にしない。** autoUpdate は新しい Service Worker に
      // `skipWaiting` + `clientsClaim` + 古いキャッシュの掃除をさせるので、
      // **開いたままのページの足元でアセットが消える**。GitHub Pages は毎回 dist を
      // 丸ごと置き換えてファイル名も変わるため、消えた瞬間に古い index.html を握った
      // ページは「もう存在しないチャンク」を取りに行き、面の動的 import が落ちて真っ白になる。
      // 解錠（Face ID）に数秒かかるぶん、ちょうどこの窓に入りやすかった。
      //
      // `prompt` にすると新しい SW は待機したままになり、**全部のクライアントが閉じてから**
      // 入れ替わる。PWA は毎回終了して開き直すので、更新は「次に開いたとき」に効く。
      // 走っているページからキャッシュを奪わないことのほうが、更新の即時性より大事。
      registerType: 'prompt',
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
