// つまみ。読む領域（上7割）を、指を下3割に置いたままスクロールさせるための握り。
//
// なぜ要るか: この面は「操作は下の一点」を主張しているのに、**読む操作＝スクロールだけが
// 例外**で、親指を画面の真ん中まで伸ばさないと進まなかった。長い記事ほどそうなるので、
// 「片手で完結する」という約束が一番効いてほしい場面で崩れていた。
//
// 置き場所は原点のすぐ右。左下の原点を支点にした親指の弧の内側で、上7割には一切出さない
// （受け入れ条件1「上7割に操作要素ゼロ」を割らない）。**縦スクロールバーの定位置は右端だが、
// 右端は左手の親指から最も遠い**ので、慣習より到達性を採った。
//
// 隠しジェスチャにはしない（受け入れ条件6）。つまみは `role="scrollbar"` のフォーカス可能な
// 要素で、矢印キー・PageUp/Down でも動く。掴んで動かす以外に、溝を叩けば1画面ぶん送る。
import { useCallback, useEffect, useRef, useState } from 'react';

const PAGE = 0.86;      // 溝を叩いたときに送る量（1画面ぶん＝行が1つも飛ばない程度に残す）
const STEP = 64;        // 矢印キー1回ぶん
const MIN_GRIP = 36;    // 握りの最小の高さ

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function Rail({ viewRef, resetKey, controls }) {
  const trackRef = useRef(null);
  const gripRef = useRef(null);
  const drag = useRef(null);
  const raf = useRef(0);
  const [live, setLive] = useState(false);   // スクロールできる中身があるか
  const [pos, setPos] = useState(0);         // 0..100（読み上げ用。描画は直接 style を触る）

  // 描画は React を通さない。スクロール1フレームごとに再レンダリングすると帯がもたつく。
  const paint = useCallback(() => {
    const v = viewRef.current;
    const track = trackRef.current;
    const grip = gripRef.current;
    if (!v || !track || !grip) return;
    const span = v.scrollHeight - v.clientHeight;
    const th = track.clientHeight;
    if (span <= 4 || th <= 0) { setLive(false); return; }
    setLive(true);
    const gh = Math.max(MIN_GRIP, Math.round((v.clientHeight / v.scrollHeight) * th));
    const ratio = Math.min(1, Math.max(0, v.scrollTop / span));
    grip.style.height = `${gh}px`;
    grip.style.transform = `translateY(${Math.round((th - gh) * ratio)}px)`;
    setPos(Math.round(ratio * 100));
  }, [viewRef]);

  const schedule = useCallback(() => {
    if (raf.current) return;
    raf.current = requestAnimationFrame(() => { raf.current = 0; paint(); });
  }, [paint]);

  useEffect(() => {
    const v = viewRef.current;
    if (!v) return undefined;
    paint();
    v.addEventListener('scroll', schedule, { passive: true });
    const ro = new ResizeObserver(schedule);
    ro.observe(v);
    if (v.firstElementChild) ro.observe(v.firstElementChild);
    return () => {
      v.removeEventListener('scroll', schedule);
      ro.disconnect();
      cancelAnimationFrame(raf.current);
      raf.current = 0;
    };
  }, [viewRef, paint, schedule, resetKey]);

  const scrollTo = (top, smooth) => {
    const v = viewRef.current;
    if (!v) return;
    if (smooth && !reduced()) v.scrollTo({ top, behavior: 'smooth' });
    else v.scrollTop = top;
  };

  // 握りを掴んで動かす。溝の長さ ↔ 本文の長さの比で写すので、長い記事でも端から端まで届く。
  const onDown = (e) => {
    const v = viewRef.current;
    const track = trackRef.current;
    if (!v || !track) return;
    e.preventDefault();
    e.stopPropagation();
    const tr = track.getBoundingClientRect();
    const gr = gripRef.current.getBoundingClientRect();
    const span = v.scrollHeight - v.clientHeight;
    const travel = tr.height - gr.height;
    const onGrip = e.clientY >= gr.top && e.clientY <= gr.bottom;
    if (!onGrip) {
      // 溝を叩いた = 1画面ぶん送る。掴まなくても進めるので、握りが小さいときの逃げ道になる。
      const dir = e.clientY < gr.top ? -1 : 1;
      scrollTo(v.scrollTop + dir * v.clientHeight * PAGE, true);
      return;
    }
    drag.current = { y: e.clientY, top: v.scrollTop, span, travel };
    try { track.setPointerCapture(e.pointerId); } catch { /* noop */ }
    track.classList.add('is-grab');
    document.getSelection?.()?.removeAllRanges?.();
  };

  const onMove = (e) => {
    const d = drag.current;
    if (!d) return;
    e.preventDefault();
    if (d.travel <= 0) return;
    scrollTo(d.top + ((e.clientY - d.y) / d.travel) * d.span, false);
  };

  const onUp = () => {
    drag.current = null;
    trackRef.current?.classList.remove('is-grab');
  };

  const onKeyDown = (e) => {
    const v = viewRef.current;
    if (!v) return;
    const span = v.scrollHeight - v.clientHeight;
    const go = (top) => { scrollTo(Math.min(span, Math.max(0, top)), true); e.preventDefault(); };
    if (e.key === 'ArrowDown') go(v.scrollTop + STEP);
    else if (e.key === 'ArrowUp') go(v.scrollTop - STEP);
    else if (e.key === 'PageDown') go(v.scrollTop + v.clientHeight * PAGE);
    else if (e.key === 'PageUp') go(v.scrollTop - v.clientHeight * PAGE);
    else if (e.key === 'Home') go(0);
    else if (e.key === 'End') go(span);
  };

  return (
    <div
      ref={trackRef}
      className={`tb-rail${live ? '' : ' is-off'}`}
      role="scrollbar"
      aria-controls={controls}
      aria-orientation="vertical"
      aria-label="読むところを送る"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pos}
      aria-disabled={live ? 'false' : 'true'}
      tabIndex={live ? 0 : -1}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      onKeyDown={onKeyDown}
    >
      <span className="tb-railgrip" ref={gripRef} aria-hidden="true" />
    </div>
  );
}
