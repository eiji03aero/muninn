// 面をまたいで使える純粋関数。UI ライブラリに依存させない
// （面ごとに見た目は変わってよいが、「昨日」の数え方まで面ごとに変えたら記録が読めなくなる）。

// ---------------- 相対日 ----------------
export function relDay(date, today) {
  if (!date) return '';
  const d = Math.round((new Date(`${today}T00:00:00`) - new Date(`${date}T00:00:00`)) / 86400000);
  if (d <= 0) return '今日';
  if (d === 1) return '昨日';
  if (d < 7) return `${d}日前`;
  if (d < 28) return `${Math.floor(d / 7)}週間前`;
  if (d < 365) return `${Math.floor(d / 30)}ヶ月前`;
  return String(date);
}

// ---------------- クリップボード ----------------
// サイトは書き込めないが、書き込みの「意図」は渡せる。
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch { /* noop */ }
    document.body.removeChild(ta);
  }
}
