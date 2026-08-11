// 面「日報」の見た目の部品（グラス・ボトムタブ・カード）。**この面の中だけで使う**。
// 面A・面Bはグラスもボトムタブも使わないので、ここを共有部品にしてはいけない。
// 面をまたいで意味が同じもの（本文の描画・数値の解釈・相対日・コピー）は ../../shared/ にある。
import { useEffect, useState } from 'react';
import { Box, Flex, HStack, VStack, Heading, Text, Button, Spinner } from '@chakra-ui/react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useData } from '../../lib/ctx.js';
import { typeLabel, tagLabel, tagToParam } from '../../lib/graph.js';
import { copyText } from '../../shared/util.js';
import { C, ACCENT_GRADIENT, tint } from '../../shared/theme.js';

export { GROUP, GROUP_ORDER } from '../../shared/theme.js';
// 共有部品はこの面の入口からも引けるようにしておく（移設で各ページの import を書き換えないため）。
export { Md } from '../../shared/Md.jsx';
export { Sparkline, Delta } from '../../shared/Sparkline.jsx';
export { relDay, copyText } from '../../shared/util.js';

// ---------------- ページ枠 ----------------
// ボトムタブぶんの余白を必ず確保する（safe-area 込み）。
// タブの実高は minH 56px ＋ safe-area。最後の要素が隠れないよう余裕を足した値にする。
export function Page({ children, maxW = '720px' }) {
  return (
    <Box maxW={maxW} mx="auto" px="4" py="4"
      style={{ paddingBottom: 'calc(96px + env(safe-area-inset-bottom))' }}>
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

// ソフトキーボードに食われている高さ。
// iOS Safari はキーボードが出てもレイアウトビューポート（window.innerHeight）を変えず、
// ビジュアルビューポートだけが縮む。position:fixed はレイアウト側に貼り付くので、
// 何もしないとタブがキーボードの裏へ回り、ページがずれた分だけ画面の途中に浮いて見える。
// （日報で入力欄を持つのは「探す」だけなので、この事故はその画面でだけ起きていた）
// ビジュアルビューポートの下端との差だけ持ち上げて、見えている領域の下端に貼り直す。
function useKeyboardInset() {
  const [inset, setInset] = useState(0);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return undefined;
    const update = () => setInset(Math.max(0, Math.round(window.innerHeight - (vv.height + vv.offsetTop))));
    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => { vv.removeEventListener('resize', update); vv.removeEventListener('scroll', update); };
  }, []);
  return inset;
}

export function BottomTabs() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const kb = useKeyboardInset();
  return (
    <Box className="glass-bar" position="fixed" bottom="0" left="0" right="0" zIndex="30"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom)', borderBottom: 'none', borderTop: `1px solid ${C.line}`,
        // transform だけで動かす（レイアウトを起こさない・原則: transform/opacity のみ）
        transform: kb ? `translateY(-${kb}px)` : undefined,
      }}>
      <Flex maxW="720px" mx="auto">
        {TABS.map((t) => {
          const on = t.match(pathname);
          return (
            <Box as="button" key={t.to} flex="1" py="2" minH="56px" onClick={() => navigate(t.to)}
              className="press" textAlign="center" position="relative"
              aria-current={on ? 'page' : undefined}>
              <Text fontSize="22px" lineHeight="1.15" color={on ? C.ink : C.faint}>{t.icon}</Text>
              <Text fontSize="11.5px" mt="1" lineHeight="1.1" fontWeight={on ? '700' : '500'}
                color={on ? C.ink : C.faint}>
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

export { VStack, HStack, Flex, Box, Text, Heading, Button };
