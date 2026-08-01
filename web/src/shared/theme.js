// グラス方向のデザイントークン（ダーク固定）。JS側で色を参照する箇所で使う。
export const C = {
  bg: '#090a14',
  ink: '#f2f5ff',
  muted: '#97a0c4',
  faint: '#6b7091',
  line: 'rgba(255,255,255,0.12)',
  sky: '#6ec1ff',
  violet: '#b79bff',
  green: '#66e0ac',
  pink: '#ff7aa8',
  amber: '#ffce6e',
  orange: '#ff9e7a',
};

export const ACCENT_GRADIENT = 'linear-gradient(120deg,#6ec1ff,#b79bff)';

// ポジション別の色
export const GROUP = {
  GK: { label: 'GK', color: '#cbd5e6' },
  DF: { label: 'DF', color: C.sky },
  MF: { label: 'MF', color: C.green },
  FW: { label: 'FW', color: C.orange },
};
export const GROUP_ORDER = ['GK', 'DF', 'MF', 'FW'];

// 色から半透明の背景/枠を作る
export const tint = (color, pct = 16) => `color-mix(in srgb, ${color} ${pct}%, transparent)`;
