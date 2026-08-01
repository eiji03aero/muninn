// 定点観測の数値表示。面が変わっても「数字の解釈」は変わってはいけない（DESIGN.md 原則9）ので、
// 折れ線と前回比・自己ベスト判定はここに一本化する。UI ライブラリに依存させない
// （面A・面B は Chakra を使わないため、共有部品が Chakra を引き込むと道連れになる）。
import { C, tint } from './theme.js';

export function Sparkline({ points, height = 44, color = C.sky, goal = null }) {
  if (!points || points.length < 2) return null;
  const vals = points.map((p) => p.value);
  const min = Math.min(...vals), max = Math.max(...vals);
  const span = max - min || 1;
  const W = 100, H = height;
  const xy = points.map((p, i) => [
    (i / (points.length - 1)) * W,
    H - 4 - ((p.value - min) / span) * (H - 10),
  ]);
  const d = xy.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
  const area = `${d} L${W},${H} L0,${H} Z`;
  const [lx, ly] = xy[xy.length - 1];
  // 終点を強調するのは「良い方向の最高記録」のときだけ。中立の指標では強調しない。
  const isBest = goal ? vals[vals.length - 1] === (goal === 'up' ? max : min) : false;
  // 横方向は幅いっぱいに引き伸ばす（preserveAspectRatio="none"）ので、終点マーカーを SVG の
  // circle で描くと楕円に潰れる。マーカーだけは HTML 要素として % 配置する。
  return (
    <div style={{ position: 'relative', width: '100%', height: `${H}px` }}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" width="100%" height={H} aria-hidden="true"
        style={{ display: 'block' }}>
        <path d={area} fill={tint(color, 12)} />
        <path d={d} fill="none" stroke={color} strokeWidth="1.6" vectorEffect="non-scaling-stroke"
          strokeLinejoin="round" strokeLinecap="round" />
      </svg>
      <div style={{
        position: 'absolute', width: '7px', height: '7px', borderRadius: '9999px',
        background: isBest ? C.ink : color, pointerEvents: 'none',
        left: `${lx}%`, top: `${(ly / H) * 100}%`, transform: 'translate(-50%,-50%)',
        boxShadow: isBest ? `0 0 8px ${color}` : 'none',
      }} />
    </div>
  );
}

// 数値と前回比。
// goal（up=大きいほど良い / down=小さいほど良い / null=中立）を見て改善・悪化を判定する。
// 中立の指標に「自己ベスト」を出したり、増加を緑にしたりしない——たとえばフェース角は
// 大きくなるほど悪いので、最大値を成果として見せると定点観測が嘘をつくことになる。
export function Delta({ points, unit, goal }) {
  if (!points?.length) return null;
  const vals = points.map((p) => p.value);
  const last = vals[vals.length - 1];
  const prev = vals.length > 1 ? vals[vals.length - 2] : null;
  const diff = prev == null ? null : Math.round((last - prev) * 100) / 100;

  let deltaColor = C.muted;
  if (goal && diff) deltaColor = (goal === 'up') === diff > 0 ? C.green : C.pink;

  const isBest = goal
    ? last === (goal === 'up' ? Math.max(...vals) : Math.min(...vals)) && vals.length > 1
    : false;

  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.375rem' }}>
      <span style={{ fontSize: '0.875rem', fontWeight: 800, color: C.ink, lineHeight: 1.5 }}>
        {last}{unit ? ` ${unit}` : ''}
      </span>
      {diff != null && diff !== 0 && (
        <span style={{ fontSize: '10px', fontWeight: 700, color: deltaColor, lineHeight: 1.5 }}>
          {diff > 0 ? '▲' : '▼'}{Math.abs(diff)}
        </span>
      )}
      {isBest && <span style={{ fontSize: '10px', fontWeight: 700, color: C.amber, lineHeight: 1.5 }}>自己ベスト</span>}
    </div>
  );
}
