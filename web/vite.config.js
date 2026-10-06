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
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,json}'],
        // **正本まるごと（site.enc.json）を precache する**のがこのサイトの前提。
        // 読む面なので、開いた瞬間に全部読める／圏外でも読めることの価値が大きく、
        // しかもコード（チャンク）とデータを**同じ版として一緒に差し替えられる**
        // ——`registerType: 'prompt'` で足元を掘らない（原則18）ためには、
        // データだけが先に新しくなる状態を作らないほうが安全。
        //
        // ところが workbox の既定は 1ファイル 2MiB までで、**超えると警告ではなくビルドが落ちる**。
        // 2026-10-03、蓄積が増えて site.enc.json が 2.1MiB を踏み、
        // **Pages のデプロイが6回連続で失敗していたのに誰も気づかなかった**
        // （push は通る／サイトは古いまま、という最悪の黙り方をする）。
        // 蓄積は増え続けるので、上限は「次に踏むのが当分先」の値まで引き上げておく。
        maximumFileSizeToCacheInBytes: 16 * 1024 * 1024,
      },
    }),
  ],
});
