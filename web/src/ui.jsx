import { useState } from 'react';
import { Box, Flex, HStack, VStack, Heading, Text, Button, Spinner } from '@chakra-ui/react';
import { useLocation, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { useData } from './lib/ctx.js';
import { wikiToMarkdown } from './lib/wiki.js';
import { typeLabel, tagLabel, tagToParam } from './lib/graph.js';
import { C, ACCENT_GRADIENT, tint } from './theme.js';

export { GROUP, GROUP_ORDER } from './theme.js';

// ---------------- ページ枠 ----------------
// ボトムタブぶんの余白を必ず確保する（safe-area 込み）。
export function Page({ children, maxW = '720px' }) {
  return (
    <Box maxW={maxW} mx="auto" px="4" py="4"
      style={{ paddingBottom: 'calc(84px + env(safe-area-inset-bottom))' }}>
      {children}
    </Box>
  );
}

export function AppBar({ title, subtitle, back = true, children }) {
  const navigate = useNavigate();
  return (
    <Box className="glass-bar" position="sticky" top="0" zIndex="20" px="4" pb="3"
      style={{ paddingTop: 'max(0.7rem, env(safe-area-inset-top))' }}>
      {back && (
        <Flex align="center" justify="space-between" mb="1">
          <Button size="xs" variant="ghost" color={C.muted} px="1" onClick={() => navigate(-1)}
            _hover={{ color: C.ink, bg: 'transparent' }}>‹ 戻る</Button>
          <Button size="xs" variant="ghost" color={C.muted} px="1" onClick={() => navigate('/search')}
            _hover={{ color: C.ink, bg: 'transparent' }}>⌕ 探す</Button>
        </Flex>
      )}
      <Heading size="md" color={C.ink} lineHeight="1.3" letterSpacing="-0.01em">{title}</Heading>
      {subtitle && <Text fontSize="sm" color={C.muted} mt="1">{subtitle}</Text>}
      {children}
    </Box>
  );
}

// ---------------- ボトムタブ ----------------
// 現状最大の構造欠陥（グローバルナビが無く、横移動が戻る/ホームだけ）を埋める。
// タブ名がそのまま「muninn でできること」の要約になっている。
const TABS = [
  { to: '/', label: '面', icon: '▣', match: (p) => p === '/' },
  { to: '/shelf', label: '棚', icon: '▤', match: (p) => p.startsWith('/shelf') },
  { to: '/search', label: '探す', icon: '⌕', match: (p) => p.startsWith('/search') },
  { to: '/desk', label: 'デスク', icon: '✎', match: (p) => p.startsWith('/desk') },
];

export function BottomTabs() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  return (
    <Box className="glass-bar" position="fixed" bottom="0" left="0" right="0" zIndex="30"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)', borderBottom: 'none', borderTop: `1px solid ${C.line}` }}>
      <Flex maxW="720px" mx="auto">
        {TABS.map((t) => {
          const on = t.match(pathname);
          return (
            <Box as="button" key={t.to} flex="1" py="2.5" onClick={() => navigate(t.to)}
              className="press" textAlign="center" position="relative"
              aria-current={on ? 'page' : undefined}>
              <Text fontSize="15px" lineHeight="1.1" color={on ? C.ink : C.faint}>{t.icon}</Text>
              <Text fontSize="10px" mt="0.5" fontWeight={on ? '700' : '500'} color={on ? C.ink : C.faint}>
                {t.label}
              </Text>
              {on && (
                <Box position="absolute" top="0" left="50%" w="26px" h="2px" borderRadius="0 0 2px 2px"
                  bg={ACCENT_GRADIENT} style={{ transform: 'translateX(-50%)' }} />
              )}
            </Box>
          );
        })}
      </Flex>
    </Box>
  );
}

// ---------------- 段（スロット）ラベル ----------------
export function Slot({ children, count, action }) {
  return (
    <Flex align="center" gap="2.5" mt="1" mb="2">
      <Text fontSize="11px" letterSpacing="0.14em" color={C.faint} flexShrink="0">{children}</Text>
      {count != null && <Text fontSize="11px" color={C.faint} flexShrink="0">{count}</Text>}
      <Box flex="1" h="1px" bg={C.line} />
      {action}
    </Flex>
  );
}

// ---------------- 汎用 ----------------
export function Chip({ children, color = C.muted, onClick }) {
  return (
    <Box as={onClick ? 'button' : 'span'} onClick={onClick} display="inline-block"
      px="2.5" py="1" borderRadius="full" fontSize="11px" fontWeight="600" lineHeight="1.4"
      color={color} bg={tint(color, 15)} border="1px solid" borderColor={tint(color, 30)}
      _hover={onClick ? { bg: tint(color, 26) } : undefined}>
      {children}
    </Box>
  );
}

export function Chips({ items, color = C.muted }) {
  if (!items?.length) return null;
  return <Flex wrap="wrap" gap="1.5">{items.map((it, i) => <Chip key={i} color={color}>{it}</Chip>)}</Flex>;
}

// タグは装飾ではなく入口。押すと棚板へ飛ぶ。
export function TagChips({ tags }) {
  const navigate = useNavigate();
  if (!tags?.length) return null;
  return (
    <Flex wrap="wrap" gap="1.5">
      {tags.filter((t) => t !== 'moc').map((t) => (
        <Chip key={t} color={C.sky} onClick={() => navigate(`/shelf/${tagToParam(t)}`)}>{tagLabel(t)}</Chip>
      ))}
    </Flex>
  );
}

export function Card({ children, onClick, soft }) {
  return (
    <Box className={`${soft ? 'glass-soft' : 'glass'}${onClick ? ' press' : ''}`} p="4" onClick={onClick}
      cursor={onClick ? 'pointer' : 'default'} textAlign="left" w="100%"
      as={onClick ? 'button' : 'div'}>
      {children}
    </Box>
  );
}

export function Center({ children }) {
  return <Flex minH="70vh" align="center" justify="center" direction="column" gap="3" p="6" textAlign="center">{children}</Flex>;
}

export function Loading() {
  return <Center><Spinner size="lg" color={C.sky} /></Center>;
}

export function Md({ text }) {
  const { idx } = useData();
  return <div className="md"><ReactMarkdown>{wikiToMarkdown(text || '', idx)}</ReactMarkdown></div>;
}

export function NotFound({ what }) {
  const navigate = useNavigate();
  return (
    <Center>
      <Text color={C.muted}>{what} が見つからないのだ</Text>
      <Button colorPalette="blue" onClick={() => navigate('/')}>面へ</Button>
    </Center>
  );
}

// ---------------- コピーボタン ----------------
// サイトは書き込めないが、書き込みの「意図」は渡せる。atlas の先行実装と同じ挙動。
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

export function CopyButton({ text, children, tone = 'sky', size = 'sm', w }) {
  const [done, setDone] = useState(false);
  const color = tone === 'amber' ? C.amber : tone === 'green' ? C.green : C.sky;
  return (
    <Button size={size} w={w} borderRadius="12px" fontWeight="700" flexShrink="0"
      whiteSpace="normal" h="auto" py="2" px="3" lineHeight="1.4"
      color={done ? C.ink : color} bg={done ? 'transparent' : tint(color, 14)}
      border="1px solid" borderColor={done ? C.line : tint(color, 34)}
      _hover={{ bg: done ? 'transparent' : tint(color, 22) }}
      onClick={async (e) => {
        e.stopPropagation();
        await copyText(text);
        setDone(true);
        setTimeout(() => setDone(false), 1800);
      }}>
      {done ? '✓ コピーした' : children}
    </Button>
  );
}

// ---------------- ここへ来る道（バックリンク） ----------------
// 全ノード型の詳細ページに例外なく置く。型によって有無が分かれると行き止まりがまだらに残る。
// muninn のリンク規約（`- [[x]] — 理由`）のおかげで「リンク元が書いた理由」ごと出せる。
export function Backlinks({ route, title }) {
  const navigate = useNavigate();
  const { graph } = useData();
  const list = graph.backlinks.get(route) || [];
  const relinkPrompt =
    `/mn 「${title}」（${route}）が muninn のどこからも辿れない状態になっている。` +
    `内容を読んで、関連する既存ノート・MOC・フォローから [[リンク]] を張って繋ぎ直して。` +
    `リンクには「なぜ関連するか」を一言添えること。確信のない連想リンクは張らないこと。`;

  return (
    <Box mt="7">
      <Slot>ここへ来る道{list.length ? ` ${list.length}` : ''}</Slot>
      {list.length === 0 ? (
        <Card soft>
          <Text fontSize="sm" color={C.muted}>この記事はまだどこからも辿れない</Text>
          <Box mt="3"><CopyButton text={relinkPrompt}>繋ぎ直しを依頼</CopyButton></Box>
        </Card>
      ) : (
        <Box className="glass-soft" borderRadius="14px" px="4" py="1">
          {list.map((b, i) => (
            <Box as="button" key={b.route} w="100%" textAlign="left" className="press"
              py="3" borderTop={i ? `1px solid ${C.line}` : 'none'}
              onClick={() => navigate(b.route)}>
              <HStack justify="space-between" align="start" gap="2">
                <Text fontSize="sm" color={C.ink} fontWeight="600" lineHeight="1.5">{b.title}</Text>
                <Text fontSize="10px" color={C.faint} flexShrink="0" mt="1">{typeLabel(b.type)}</Text>
              </HStack>
              {b.reason && <Text fontSize="xs" color={C.muted} mt="1" lineHeight="1.6">「{b.reason}」</Text>}
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}

// ---------------- スパークライン ----------------
// 定点観測の本質は「前回と比べる」。静止した数値タイルではその役に立たない。
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
    <Box position="relative" w="100%" h={`${H}px`}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" width="100%" height={H} aria-hidden="true"
        style={{ display: 'block' }}>
        <path d={area} fill={tint(color, 12)} />
        <path d={d} fill="none" stroke={color} strokeWidth="1.6" vectorEffect="non-scaling-stroke"
          strokeLinejoin="round" strokeLinecap="round" />
      </svg>
      <Box position="absolute" w="7px" h="7px" borderRadius="full"
        bg={isBest ? C.ink : color} pointerEvents="none"
        style={{
          left: `${lx}%`, top: `${(ly / H) * 100}%`, transform: 'translate(-50%,-50%)',
          boxShadow: isBest ? `0 0 8px ${color}` : 'none',
        }} />
    </Box>
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
    <HStack gap="1.5" align="baseline">
      <Text fontSize="sm" fontWeight="800" color={C.ink}>{last}{unit ? ` ${unit}` : ''}</Text>
      {diff != null && diff !== 0 && (
        <Text fontSize="10px" fontWeight="700" color={deltaColor}>
          {diff > 0 ? '▲' : '▼'}{Math.abs(diff)}
        </Text>
      )}
      {isBest && <Text fontSize="10px" fontWeight="700" color={C.amber}>自己ベスト</Text>}
    </HStack>
  );
}

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

export { VStack, HStack, Flex, Box, Text, Heading, Button };
