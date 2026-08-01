// 原点。この面で唯一の操作点で、上7割から追い出した操作がここに全部集まっている。
//
// 3つの入力を1つの部品にまとめる:
//   ぽんと叩く       → いま選んでいるものに対する「実行」
//   押したまま引く   → 方向で行き先を選ぶ（意味は画面をまたいで固定）
//   押しっぱなしで離す → 扇を出したままにする（指を離しても目で見て選べる）
//
// **原点は必ず <button>**。この面は「隠しジェスチャではない」を主張の根拠にしているので、
// 支援技術から到達できない原点はこの面の否定になる。判定中は左右がそれぞれ独立したボタン。
// ドラッグを一度も使わずに、Tab と Enter と扇だけで全機能に到達できること。
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { BACK_DIR, DIRS } from './model.js';

const TAP_MS = 180;       // これより短く離したら「叩いた」
const MOVE_PX = 14;       // これを超えたら「引いた」
const COMMIT_PX = 40;     // これを超えないと行き先は決まらない（誤爆防止）
const LATCH_MS = 6000;    // 指を離したあと扇が残る時間

export const Origin = forwardRef(function Origin(
  { hand, split, verb, label, disabled, faceId, atRoot, onPrimary, onJudge, onDir, lobeLabels },
  ref,
) {
  const wrapRef = useRef(null);
  const aimRef = useRef(null);
  const fanRef = useRef(null);
  const [fan, setFan] = useState(null); // null | { latched, center }
  const [hot, setHot] = useState(null);
  const g = useRef(null);
  const handled = useRef(0);
  const latchT = useRef(null);
  const sx = hand === 'R' ? -1 : 1;

  const center = useCallback(() => {
    const r = wrapRef.current?.getBoundingClientRect();
    return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : { x: 0, y: 0 };
  }, []);

  const closeFan = useCallback(() => {
    clearTimeout(latchT.current);
    setFan(null);
    setHot(null);
  }, []);

  const openFan = useCallback((latched) => {
    clearTimeout(latchT.current);
    setFan({ latched, center: center() });
    if (latched) latchT.current = setTimeout(() => setFan(null), LATCH_MS);
  }, [center]);

  useImperativeHandle(ref, () => ({
    toggleFan() {
      if (fan) { closeFan(); return false; }
      openFan(true);
      return true;
    },
    closeFan,
    isFanOpen: () => !!fan,
  }), [fan, openFan, closeFan]);

  useEffect(() => () => clearTimeout(latchT.current), []);

  // 扇が開いたら最初のウェッジに焦点を移す（キーボード・支援技術の可視な代替経路）
  useEffect(() => {
    if (fan?.latched) fanRef.current?.querySelector('.tb-wedge')?.focus({ preventScroll: true });
  }, [fan?.latched]);

  const aim = (dist, deg) => {
    const el = aimRef.current;
    if (!el) return;
    el.style.opacity = dist > MOVE_PX ? '1' : '0';
    el.style.transform = `rotate(${deg}deg) scaleX(${Math.min(dist, 150) / 150})`;
  };

  const dirAt = (dx, dy) => {
    const dist = Math.hypot(dx, dy);
    if (dist < COMMIT_PX) return null;
    const ang = (Math.atan2(-dy, sx * dx) * 180) / Math.PI;
    if (ang < -40 && ang > -140) return BACK_DIR.id;
    const a = Math.max(0, Math.min(100, ang));
    return a < 15 ? 'today' : a < 45 ? 'shelf' : a < 75 ? 'search' : 'ask';
  };

  const onDown = (e) => {
    e.preventDefault();
    if (fan?.latched) closeFan();
    const r = wrapRef.current.getBoundingClientRect();
    const lobe = split ? ((e.clientX - r.left) < r.width / 2 ? 'fz' : 'ok') : null;
    g.current = { x: e.clientX, y: e.clientY, t: Date.now(), moved: false, lobe, id: e.pointerId };
    try { wrapRef.current.setPointerCapture(e.pointerId); } catch { /* noop */ }
    wrapRef.current.classList.add('is-press');
    g.current.timer = setTimeout(() => { if (g.current && !g.current.moved) openFan(false); }, TAP_MS);
  };

  const onMove = (e) => {
    const s = g.current;
    if (!s) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    const dist = Math.hypot(dx, dy);
    if (dist <= MOVE_PX) return;
    s.moved = true;
    clearTimeout(s.timer);
    if (!fan) openFan(false);
    aim(dist, (Math.atan2(dy, dx) * 180) / Math.PI);
    setHot(dirAt(dx, dy));
  };

  const finish = () => {
    const s = g.current;
    g.current = null;
    if (s) clearTimeout(s.timer);
    wrapRef.current?.classList.remove('is-press');
    aim(0, 0);
    return s;
  };

  const onUp = (e) => {
    const s = g.current;
    if (!s) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    const dt = Date.now() - s.t;
    const target = s.moved ? dirAt(dx, dy) : null;
    finish();
    if (s.moved) {
      closeFan();
      if (target) onDir(target);
      return;
    }
    if (dt < TAP_MS) {
      closeFan();
      handled.current = Date.now(); // 直後に飛んでくる click を二重発火させない
      if (s.lobe) onJudge(s.lobe);
      else onPrimary();
      return;
    }
    // 押しっぱなしのまま離した = 扇を残す。指を離しても目で見て選べる状態にする。
    openFan(true);
  };

  const onCancel = () => { finish(); closeFan(); };

  // 支援技術・キーボードからの activate は click で来る。pointer 経由の分だけ弾く。
  const guard = (fn) => (e) => {
    e.stopPropagation();
    if (Date.now() - handled.current < 400) return;
    handled.current = Date.now();
    fn();
  };

  const c = fan?.center || center();
  const dirLabel = (d) => (sx > 0 ? d.arrow : (d.arrowR || d.arrow));

  return (
    <>
      <p id="tb-origin-help" className="tb-sr">
        原点。叩くと、いま選んでいるものに対する操作を実行する。押したまま方向へ引くと行き先を選べる。
        同じ行き先は「行き先を選ぶ」からも選べる。
      </p>
      <div
        ref={wrapRef}
        className={`tb-origin${split ? ' is-split' : ''}${hand === 'R' ? ' is-right' : ''}`}
        role="group"
        aria-label="原点"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onCancel}
      >
        {split ? (
          <>
            <button type="button" className="tb-lobe tb-lobe-l" aria-label={lobeLabels?.fz} onClick={guard(() => onJudge('fz'))}>
              あやしい
            </button>
            <button type="button" className="tb-lobe tb-lobe-r" aria-label={lobeLabels?.ok} onClick={guard(() => onJudge('ok'))}>
              わかった
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className="tb-disc"
              aria-describedby="tb-origin-help"
              aria-disabled={disabled ? 'true' : 'false'}
              aria-label={label}
              onClick={guard(onPrimary)}
            >
              <span className="tb-verb">{verb}</span>
            </button>
            <span className="tb-hint4" aria-hidden="true">
              <s /><s /><s /><s /><s />
            </span>
          </>
        )}
      </div>

      <div
        ref={fanRef}
        className={`tb-fan${fan ? ' is-on' : ''}${fan?.latched ? ' is-latched' : ''}`}
        role="menu"
        aria-label="行き先"
        style={{ '--ox': `${c.x}px`, '--oy': `${c.y}px` }}
        onKeyDown={(e) => {
          const ws = [...fanRef.current.querySelectorAll('.tb-wedge')];
          const i = ws.indexOf(document.activeElement);
          if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { ws[(i + 1 + ws.length) % ws.length]?.focus(); e.preventDefault(); }
          else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { ws[(i - 1 + ws.length) % ws.length]?.focus(); e.preventDefault(); }
          else if (e.key === 'Escape') { closeFan(); e.preventDefault(); }
        }}
      >
        <span className="tb-scrim" aria-hidden="true" />
        <span ref={aimRef} className="tb-aim" aria-hidden="true" style={{ left: c.x, top: c.y }} />
        {DIRS.map((d) => {
          const rad = (d.deg * Math.PI) / 180;
          const x = c.x + sx * d.r * Math.cos(rad);
          const y = c.y - d.r * Math.sin(rad);
          const here = atRoot && faceId === d.id;
          return (
            <button
              key={d.id}
              type="button"
              role="menuitem"
              className={`tb-wedge${hot === d.id ? ' is-hot' : ''}${here ? ' is-here' : ''}`}
              aria-label={`${d.label}${here ? '（いまここ）' : ''}。原点から${d.say}へ引いても行ける`}
              style={{
                left: x, top: y,
                // 配置だけ回して中身は正立させる（ピルの原点に近い辺を半径に合わせる）
                transform: `translate(${(-50 + 50 * sx * Math.cos(rad)).toFixed(2)}%, ${(-50 - 50 * Math.sin(rad)).toFixed(2)}%)`,
              }}
              onClick={() => { closeFan(); onDir(d.id); }}
            >
              <span className="tb-wdir" aria-hidden="true">{dirLabel(d)}</span>
              <span className="tb-wlb">{d.label}</span>
            </button>
          );
        })}
        <button
          type="button"
          role="menuitem"
          className={`tb-wedge tb-wedge-back${hot === BACK_DIR.id ? ' is-hot' : ''}`}
          aria-label="ひとつ戻す。原点から下へ引いても戻せる"
          style={{ left: c.x, top: c.y + 54, transform: 'translate(-50%, 0)' }}
          onClick={() => { closeFan(); onDir(BACK_DIR.id); }}
        >
          <span className="tb-wdir" aria-hidden="true">{BACK_DIR.arrow}</span>
          <span className="tb-wlb">{BACK_DIR.label}</span>
        </button>
      </div>
    </>
  );
});
