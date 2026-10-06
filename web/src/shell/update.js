// 新しい版が配信されたことを**早く知る**ための検出。入れ替えはしない。
//
// 配信の入れ替えは `registerType: 'prompt'`（DESIGN.md 原則18）なので、新しい Service Worker は
// インストールされたあと **waiting のまま待つ**。待っているあいだページは古い版のままで、
// 実際に入れ替わるのは「このアプリを握っているクライアントが全部消えてから、次に開いたとき」。
// iOS のホーム画面 PWA では、これが「アプリスイッチャーからスワイプして消す」を意味する
// ——バックグラウンドに回しただけでは消えない。だから「開く→終了→もう一度開く」の2回が要り、
// しかも**待っていることが画面のどこにも出ない**ので、更新が来ているのかどうかを毎回勘で判断していた。
//
// ここがやるのは2つだけ:
//   1. 前面に戻るたびに `registration.update()` を投げて、新しい版の有無を早く知る
//   2. waiting が居ることを呼び出し側に伝える
//
// **`skipWaiting` は呼ばない。** 走っているページからキャッシュを取り上げないのが原則18で、
// 2026-08-21 にそれで真っ白になっている。入れ替えるのは読者が押したときだけで、
// そのときは `shell/reload.js` が Service Worker とキャッシュを捨ててページごと読み直す
// ——掘った足元に立っているページはもう無いので、原則18と衝突しない。

// 前面に戻るたびに毎回ネットワークを叩かない。アプリ切り替えで何度も往復するため。
const MIN_CHECK_MS = 60_000;
let lastCheck = 0;

export function subscribeUpdate(onReady) {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return () => {};

  let dead = false;
  let reg = null;

  // waiting が居る＝新しい版がもう手元にあり、活性化を待っている状態。
  // controller が居ないとき（初回インストール）は「更新」ではないので出さない。
  const announce = () => {
    if (!dead && reg?.waiting && navigator.serviceWorker.controller) onReady();
  };

  const watch = (w) => {
    if (!w?.addEventListener) return;
    w.addEventListener('statechange', () => { if (w.state === 'installed') announce(); });
  };

  const check = async () => {
    if (dead || !reg) return;
    const now = Date.now();
    if (now - lastCheck < MIN_CHECK_MS) return;
    lastCheck = now;
    try { await reg.update(); } catch { /* 圏外・配信側の不調。次の機会に見る */ }
  };

  navigator.serviceWorker.getRegistration()
    .then((r) => {
      if (dead || !r) return;
      reg = r;
      announce();            // 前回開いたときに入って、ずっと待っている場合がある
      watch(r.installing);
      watch(r.waiting);
      r.addEventListener('updatefound', () => watch(r.installing));
      check();
    })
    .catch(() => { /* dev（SW 未登録）では何も起きない */ });

  const onVisible = () => {
    if (document.visibilityState !== 'visible') return;
    announce();
    check();
  };
  document.addEventListener('visibilitychange', onVisible);
  window.addEventListener('focus', onVisible);

  return () => {
    dead = true;
    document.removeEventListener('visibilitychange', onVisible);
    window.removeEventListener('focus', onVisible);
  };
}
