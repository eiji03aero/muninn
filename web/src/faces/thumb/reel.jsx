// 帯。原点のすぐ上に置く「候補を選ぶ」ためのリール。
//
// 選択（帯）と決定（原点）を分けている。1点だけで N 個から選ぼうとすると隠しモードになるので、
// ここは意図的に2箇所にした（a-rationale.md の自己申告どおり、方針からの逸脱ではある）。
//
// 左端は 28px から始める。iOS の「左端から横に引くと戻る」帯（20px）に一度も掛けないため。
import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';

const ITEM_W = 88;
const GAP = 10;
const STEP = ITEM_W + GAP;
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function Reel({ items, index, onIndex, onActivate, empty, resetKey }) {
  const el = useRef(null);
  const suppress = useRef(false);
  const raf = useRef(0);
  const settle = useRef(0);
  const cur = useRef(index);

  const fisheye = useCallback(() => {
    const node = el.current;
    if (!node) return;
    const sl = node.scrollLeft;
    for (let i = 0; i < node.children.length; i += 1) {
      const d = Math.abs(i * STEP - sl);
      const s = 1 + 0.4 * Math.max(0, 1 - d / 130);
      const o = 0.4 + 0.6 * Math.max(0, 1 - d / 200);
      node.children[i].style.transform = `scale(${s.toFixed(3)})`;
      node.children[i].style.opacity = o.toFixed(2);
    }
  }, []);

  const pad = useCallback(() => {
    const node = el.current;
    if (!node) return;
    const p = Math.max(0, (node.clientWidth - ITEM_W) / 2);
    node.style.paddingLeft = `${p}px`;
    node.style.paddingRight = `${p}px`;
  }, []);

  const jump = useCallback((i, smooth) => {
    const node = el.current;
    if (!node) return;
    suppress.current = true;
    if (smooth && !reduced()) node.scrollTo({ left: i * STEP, behavior: 'smooth' });
    else node.scrollLeft = i * STEP;
    // smooth のあいだも scroll が飛んでくるので、落ち着いてから解除する
    clearTimeout(settle.current);
    settle.current = setTimeout(() => { suppress.current = false; fisheye(); }, smooth && !reduced() ? 320 : 0);
  }, [fisheye]);

  // 場面が変わったら、選択位置に合わせて置き直す（アニメーションはしない）。
  // 中身の更新（判定ずみの印など）では動かさない——スクロール中に位置を奪われるため。
  useLayoutEffect(() => {
    pad();
    cur.current = index;
    jump(index, false);
  }, [resetKey, pad, jump]); // eslint-disable-line react-hooks/exhaustive-deps

  useLayoutEffect(() => { pad(); fisheye(); }, [items.length, pad, fisheye]);

  // 親が選択を動かした（自動送り・キーボード）ときだけ滑らせる
  useEffect(() => {
    if (cur.current === index) return;
    cur.current = index;
    jump(index, true);
  }, [index, jump]);

  useEffect(() => {
    const onResize = () => { pad(); jump(cur.current, false); };
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); clearTimeout(settle.current); };
  }, [pad, jump]);

  const onScroll = () => {
    if (raf.current) return;
    raf.current = requestAnimationFrame(() => {
      raf.current = 0;
      fisheye();
      if (suppress.current) return;
      const node = el.current;
      const i = Math.max(0, Math.min(Math.round(node.scrollLeft / STEP), items.length - 1));
      if (i !== cur.current) { cur.current = i; onIndex(i); }
    });
  };

  const onKeyDown = (e) => {
    const move = (i) => {
      const n = Math.max(0, Math.min(i, items.length - 1));
      cur.current = n;
      jump(n, true);
      onIndex(n);
      setTimeout(() => el.current?.children[n]?.focus({ preventScroll: true }), 60);
      e.preventDefault();
    };
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') move(index + 1);
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') move(index - 1);
    else if (e.key === 'Home') move(0);
    else if (e.key === 'End') move(items.length - 1);
  };

  return (
    <div className="tb-reelwrap">
      <div
        ref={el}
        className="tb-reel"
        role="listbox"
        aria-label="候補の帯"
        onScroll={onScroll}
        onKeyDown={onKeyDown}
        onWheel={(e) => {
          // 縦ホイールしかない環境（PC）でも帯を回せるようにする
          if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) el.current.scrollLeft += e.deltaY;
        }}
      >
        {items.map((it, i) => (
          <button
            /* eslint-disable-next-line react/no-array-index-key */
            key={`${it.k}:${it.l}:${i}`}
            type="button"
            role="option"
            aria-selected={i === index}
            tabIndex={i === index ? 0 : -1}
            aria-label={`${it.k}：${it.l}${it.done ? '（判定ずみ）' : ''}`}
            className={`tb-ri${it.done ? ' is-done' : ''}${it.tone ? ` is-${it.tone}` : ''}${i === index ? ' is-on' : ''}`}
            onClick={() => { if (i === index) onActivate(i); else { cur.current = i; jump(i, true); onIndex(i); } }}
          >
            <span className="tb-rk" aria-hidden="true">{it.k}</span>
            <span className="tb-rl" aria-hidden="true">{it.l}</span>
          </button>
        ))}
      </div>
      <span className="tb-reelmark" aria-hidden="true" />
      {items.length === 0 && <p className="tb-reelempty">{empty}</p>}
    </div>
  );
}
