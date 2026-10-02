// 強制リロード。PWA を「終了して開き直す」以外の方法で最新の版に入れ替えるための非常口。
//
// 新しい版はふだん**待たせて、次に開いたときに効かせる**（registerType: 'prompt'。DESIGN.md 原則18）。
// ところが iOS の PWA は「次に開く」がアプリの完全終了を要求するので、push した直後に
// 確かめたいときは面倒すぎた。ここでは読者が**自分で押したとき**だけ、Service Worker と
// キャッシュを捨ててから読み直す——足元を掘るのは、どうせ直後にページごと捨てる今だけなので原則18と衝突しない。
//
// 復号したデータはメモリにしか無いので、読み直すと解錠からやり直しになる（開き直しと同じ）。
export async function forceReload() {
  try {
    const regs = (await navigator.serviceWorker?.getRegistrations?.()) || [];
    await Promise.all(regs.map((r) => r.unregister()));
  } catch { /* SW が無い環境では何もしない */ }
  try {
    const keys = (await window.caches?.keys?.()) || [];
    await Promise.all(keys.map((k) => window.caches.delete(k)));
  } catch { /* noop */ }
  window.location.reload();
}
