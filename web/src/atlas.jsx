import { useEffect, useMemo, useState } from 'react';
import { Box, Flex, HStack, VStack, Heading, Text, Button } from '@chakra-ui/react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useData } from './lib/ctx.js';
import { AppBar, Chip, Chips, DueBadge, Card, Center, Md } from './ui.jsx';
import { C, tint } from './theme.js';

// ---- 読了トラッキング（localStorage・サーバ不要） ----
const READ_KEY = (slug) => `mn.atlas.${slug}.read`;
function loadRead(slug) {
  try { return new Set(JSON.parse(localStorage.getItem(READ_KEY(slug)) || '[]')); } catch { return new Set(); }
}
function saveRead(slug, set) {
  try { localStorage.setItem(READ_KEY(slug), JSON.stringify([...set])); } catch { /* noop */ }
}

const shortTitle = (t) => (t || '').split('—')[0].trim();

// ---- グラフ・レイアウト（requires の最長鎖で深さを決める決定的配置） ----
const NODE_W = 140;
const NODE_GAP = 22;
const ROW_H = 120;
const PAD_Y = 34;

function layoutGraph(concepts) {
  const bySlug = new Map(concepts.map((c) => [c.slug, c]));
  const cache = new Map();
  const depth = (slug, stack = new Set()) => {
    if (cache.has(slug)) return cache.get(slug);
    if (stack.has(slug)) return 0; // 循環ガード
    const reqs = (bySlug.get(slug)?.edges.requires || []).filter((r) => bySlug.has(r));
    let d = 0;
    if (reqs.length) {
      stack.add(slug);
      d = 1 + Math.max(...reqs.map((r) => depth(r, stack)));
      stack.delete(slug);
    }
    cache.set(slug, d);
    return d;
  };
  const withDepth = concepts.map((c) => ({ c, d: depth(c.slug) }));
  const maxDepth = Math.max(0, ...withDepth.map((x) => x.d));
  const levels = [];
  for (let i = 0; i <= maxDepth; i++) levels.push(withDepth.filter((x) => x.d === i).map((x) => x.c));
  const maxRow = Math.max(1, ...levels.map((l) => l.length));
  const width = Math.max(320, (NODE_W + NODE_GAP) * (maxRow + 1));
  const pos = new Map();
  levels.forEach((lvl, di) => {
    lvl.forEach((c, i) => {
      pos.set(c.slug, { x: (width * (i + 1)) / (lvl.length + 1), y: PAD_Y + di * ROW_H });
    });
  });
  const height = PAD_Y * 2 + maxDepth * ROW_H;
  return { pos, width, height };
}

function edgePath(a, b) {
  const midY = (a.y + b.y) / 2;
  return `M ${a.x} ${a.y} C ${a.x} ${midY}, ${b.x} ${midY}, ${b.x} ${b.y}`;
}

// ---- マップ（グラフ） ----
function MapView({ atlas, read, onOpen }) {
  const { pos, width, height } = useMemo(() => layoutGraph(atlas.concepts), [atlas]);
  const has = (s) => pos.has(s);

  const reqEdges = [];
  const conEdges = [];
  const seen = new Set();
  for (const c of atlas.concepts) {
    for (const r of c.edges.requires) if (has(r)) reqEdges.push({ from: pos.get(r), to: pos.get(c.slug), key: `r-${r}-${c.slug}` });
    for (const o of c.edges.contrasts) {
      if (!has(o)) continue;
      const k = [c.slug, o].sort().join('~');
      if (seen.has(k)) continue;
      seen.add(k);
      conEdges.push({ from: pos.get(c.slug), to: pos.get(o), key: `c-${k}` });
    }
  }

  return (
    <>
      <Box overflowX="auto" mx="-4" px="4" pb="2" style={{ WebkitOverflowScrolling: 'touch' }}>
        <Box position="relative" style={{ width: `${width}px`, height: `${height}px` }}>
          <svg width={width} height={height} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'visible' }}>
            {reqEdges.map((e) => (
              <path key={e.key} d={edgePath(e.from, e.to)} fill="none" stroke={C.sky} strokeOpacity="0.32" strokeWidth="1.5" />
            ))}
            {conEdges.map((e) => (
              <path key={e.key} d={edgePath(e.from, e.to)} fill="none" stroke={C.violet} strokeOpacity="0.3" strokeWidth="1.5" strokeDasharray="4 4" />
            ))}
          </svg>
          {atlas.concepts.map((c) => {
            const p = pos.get(c.slug);
            const stub = c.status === 'stub';
            const isRead = read.has(c.slug);
            return (
              <Box key={c.slug} position="absolute" cursor="pointer" className="press"
                style={{ left: `${p.x}px`, top: `${p.y}px`, transform: 'translate(-50%,-50%)', width: `${NODE_W}px` }}
                onClick={() => onOpen(c.slug)}>
                <Box className="glass-soft" px="2.5" py="2" borderRadius="12px" textAlign="center"
                  border="1px solid" borderStyle={stub ? 'dashed' : 'solid'}
                  borderColor={stub ? 'rgba(255,255,255,.16)' : isRead ? C.sky : C.line}
                  bg={isRead ? tint(C.sky, 16) : 'rgba(255,255,255,.05)'} opacity={stub ? 0.62 : 1}>
                  <Text fontSize="11px" fontWeight="700" lineHeight="1.3" color={isRead ? C.ink : C.muted}
                    style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {shortTitle(c.title)}
                  </Text>
                  {isRead && <Text fontSize="9px" color={C.sky} mt="0.5">読了</Text>}
                  {stub && <Text fontSize="9px" color={C.faint} mt="0.5">未執筆</Text>}
                </Box>
              </Box>
            );
          })}
        </Box>
      </Box>
      <HStack gap="4" mt="1" fontSize="11px" color={C.faint} wrap="wrap">
        <HStack gap="1.5"><Box w="14px" h="0" borderTop="1.5px solid" borderColor={C.sky} opacity="0.6" />前提</HStack>
        <HStack gap="1.5"><Box w="14px" h="0" borderTop="1.5px dashed" borderColor={C.violet} opacity="0.7" />対比</HStack>
        <Text>上が土台 / 下ほど発展 · 横スクロールで全体を見る</Text>
      </HStack>
    </>
  );
}

// ---- ルート（順路ステッパー） ----
function RouteView({ atlas, routeId, read, onOpen }) {
  const route = atlas.routes.find((r) => r.id === routeId) || atlas.routes[0];
  if (!route) return <Text fontSize="sm" color={C.muted}>ルートが定義されていないのだ</Text>;
  const steps = route.order.map((s) => atlas.concepts.find((c) => c.slug === s)).filter(Boolean);
  const readCount = steps.filter((s) => read.has(s.slug)).length;
  const pct = steps.length ? Math.round((readCount / steps.length) * 100) : 0;

  return (
    <VStack align="stretch" gap="4">
      <Box>
        <Text fontSize="sm" color={C.muted} mb="2">{route.desc}</Text>
        <Flex align="center" gap="2">
          <Box flex="1" h="6px" borderRadius="full" bg="rgba(255,255,255,.08)" overflow="hidden">
            <Box h="100%" borderRadius="full" bg="linear-gradient(90deg,#6ec1ff,#b79bff)" style={{ width: `${pct}%` }} />
          </Box>
          <Text fontSize="xs" color={C.faint} flexShrink="0">{readCount}/{steps.length} 読了</Text>
        </Flex>
      </Box>

      <VStack align="stretch" gap="0">
        {steps.map((c, i) => {
          const isRead = read.has(c.slug);
          const stub = c.status === 'stub';
          const last = i === steps.length - 1;
          return (
            <Flex key={c.slug} align="stretch" gap="3">
              <VStack gap="0" flexShrink="0" align="center" w="28px">
                <Flex w="28px" h="28px" borderRadius="full" align="center" justify="center" flexShrink="0"
                  fontSize="12px" fontWeight="800"
                  color={isRead ? '#08111f' : C.muted}
                  bg={isRead ? 'linear-gradient(120deg,#6ec1ff,#b79bff)' : 'transparent'}
                  border="1px solid" borderColor={isRead ? 'transparent' : C.line}>
                  {isRead ? '✓' : i + 1}
                </Flex>
                {!last && <Box flex="1" w="2px" bg={C.line} my="1" minH="14px" />}
              </VStack>
              <Box flex="1" pb={last ? '0' : '3'}>
                <Card onClick={() => onOpen(c.slug, route.id)}>
                  <HStack justify="space-between" align="start" gap="2">
                    <Box>
                      <Text fontWeight="700" fontSize="sm" color={stub ? C.muted : C.ink}>{shortTitle(c.title)}</Text>
                      <Text fontSize="xs" color={C.faint} mt="1" lineHeight="1.5">{c.gist}</Text>
                    </Box>
                    {stub && <Chip color={C.faint}>未執筆</Chip>}
                  </HStack>
                </Card>
              </Box>
            </Flex>
          );
        })}
      </VStack>
    </VStack>
  );
}

// ---- アトラス概要ページ（マップ ⇄ ルート） ----
export function Atlas() {
  const { idx } = useData();
  const { slug } = useParams();
  const navigate = useNavigate();
  const atlas = idx.atlases?.get(slug);
  const [view, setView] = useState('route');
  const [routeId, setRouteId] = useState(atlas?.routes?.[0]?.id);
  const [read] = useState(() => loadRead(slug));

  if (!atlas) return <Center><Text color={C.muted}>アトラスが見つからないのだ</Text><Button colorPalette="blue" onClick={() => navigate('/')}>ホームへ</Button></Center>;

  const written = atlas.concepts.filter((c) => c.status !== 'stub').length;
  const readCount = atlas.concepts.filter((c) => read.has(c.slug)).length;
  const open = (cslug, rid) => navigate(`/atlas/${slug}/concept/${cslug}${rid ? `?route=${rid}` : (routeId ? `?route=${routeId}` : '')}`);

  const tabs = [{ id: 'route', label: 'ルート' }, { id: 'map', label: 'マップ' }];

  return (
    <>
      <AppBar title={atlas.title} subtitle={`概念 ${atlas.concepts.length}（執筆済 ${written}） · 読了 ${readCount}`} />
      <Box maxW="720px" mx="auto" px="4" py="4" style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}>
        <Box mb="5"><Md text={atlas.body} /></Box>

        <Flex wrap="wrap" gap="2" mb="4">
          {tabs.map((t) => {
            const on = view === t.id;
            return (
              <Button key={t.id} size="sm" borderRadius="full" fontWeight="700" onClick={() => setView(t.id)}
                color={on ? '#08111f' : C.muted} bg={on ? 'linear-gradient(120deg,#6ec1ff,#b79bff)' : 'transparent'}
                border="1px solid" borderColor={on ? 'transparent' : C.line}
                _hover={{ color: on ? '#08111f' : C.ink }}>
                {t.label}
              </Button>
            );
          })}
        </Flex>

        {view === 'route' && atlas.routes.length > 1 && (
          <Flex wrap="wrap" gap="2" mb="4">
            {atlas.routes.map((r) => {
              const on = routeId === r.id;
              return (
                <Button key={r.id} size="xs" variant="outline" borderRadius="full"
                  color={on ? C.ink : C.muted} borderColor={on ? C.sky : C.line}
                  bg={on ? tint(C.sky, 14) : 'transparent'}
                  onClick={() => setRouteId(r.id)} _hover={{ color: C.ink }}>
                  {r.label}
                </Button>
              );
            })}
          </Flex>
        )}

        {view === 'route'
          ? <RouteView atlas={atlas} routeId={routeId} read={read} onOpen={open} />
          : <MapView atlas={atlas} read={read} onOpen={(cslug) => open(cslug)} />}
      </Box>
    </>
  );
}

// ---- 概念（章）リーダー ----
const EDGE_META = [
  { key: 'requires', label: '前提', color: C.sky },
  { key: 'contrasts', label: '対比', color: C.violet },
  { key: 'leadsTo', label: '発展', color: C.green },
  { key: 'elaborates', label: '深掘り', color: C.amber },
];

export function Concept() {
  const { idx } = useData();
  const { slug, cslug } = useParams();
  const [sp] = useSearchParams();
  const navigate = useNavigate();
  const atlas = idx.atlases?.get(slug);
  const concept = atlas?.concepts.find((c) => c.slug === cslug);

  useEffect(() => {
    if (atlas && concept && concept.status !== 'stub') {
      const s = loadRead(slug);
      if (!s.has(cslug)) { s.add(cslug); saveRead(slug, s); }
    }
  }, [slug, cslug, atlas, concept]);

  if (!atlas || !concept) return <Center><Text color={C.muted}>概念が見つからないのだ</Text><Button colorPalette="blue" onClick={() => navigate('/')}>ホームへ</Button></Center>;

  const byId = new Map(atlas.concepts.map((c) => [c.slug, c]));
  // アクティブなルート（?route=、無ければこの概念を含む最初のルート）で前後を決める
  const routeId = sp.get('route');
  const route = atlas.routes.find((r) => r.id === routeId && r.order.includes(cslug))
    || atlas.routes.find((r) => r.order.includes(cslug));
  const order = route?.order || [];
  const pos = order.indexOf(cslug);
  const prev = pos > 0 ? byId.get(order[pos - 1]) : null;
  const next = pos >= 0 && pos < order.length - 1 ? byId.get(order[pos + 1]) : null;
  const go = (c) => navigate(`/atlas/${slug}/concept/${c.slug}${route ? `?route=${route.id}` : ''}`);

  const distilled = concept.notes.map((n) => idx.notes.get(n)).filter(Boolean);
  const hasEdges = EDGE_META.some((m) => (concept.edges[m.key] || []).length);

  return (
    <>
      <AppBar title={shortTitle(concept.title)} subtitle={atlas.title} />
      <Box maxW="680px" mx="auto" px="4" py="4" style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}>
        {concept.tags?.length > 0 && <Box mb="4"><Chips items={concept.tags} color={C.sky} /></Box>}

        {concept.status === 'stub' ? (
          <Card>
            <Text fontSize="sm" color={C.ink} mb="1" fontWeight="600">この概念はまだ執筆されていないのだ</Text>
            <Text fontSize="sm" color={C.muted}>{concept.gist}</Text>
            <Text fontSize="xs" color={C.faint} mt="2">グラフ上の位置づけとつながりだけが置かれている。`/mn-learn` で本文を生成できる。</Text>
          </Card>
        ) : (
          <Md text={concept.body} />
        )}

        {hasEdges && (
          <Box className="glass-soft" p="4" borderRadius="14px" mt="6">
            <Heading size="xs" color={C.muted} mb="3" letterSpacing="0.02em">つながり</Heading>
            <VStack align="stretch" gap="2.5">
              {EDGE_META.map((m) => {
                const items = (concept.edges[m.key] || []).map((s) => byId.get(s)).filter(Boolean);
                if (!items.length) return null;
                return (
                  <Flex key={m.key} align="start" gap="2.5" wrap="wrap">
                    <Chip color={m.color}>{m.label}</Chip>
                    <Flex wrap="wrap" gap="2" flex="1">
                      {items.map((c) => (
                        <Text key={c.slug} as="button" onClick={() => go(c)} fontSize="sm" color={C.sky}
                          textAlign="left" style={{ borderBottom: `1px solid ${C.sky}55` }}>
                          {shortTitle(c.title)}
                        </Text>
                      ))}
                    </Flex>
                  </Flex>
                );
              })}
            </VStack>
          </Box>
        )}

        {distilled.length > 0 && (
          <Box mt="6">
            <Heading size="xs" color={C.muted} mb="2.5" letterSpacing="0.02em">キーポイント（覚える用）</Heading>
            <VStack align="stretch" gap="2">
              {distilled.map((n) => (
                <Card key={n.slug} onClick={() => navigate(`/note/${n.slug}`)}>
                  <HStack justify="space-between" align="start" gap="2">
                    <Text fontWeight="600" fontSize="sm" color={C.ink}>{n.title}</Text>
                    {n.due && <DueBadge />}
                  </HStack>
                </Card>
              ))}
            </VStack>
          </Box>
        )}

        {(prev || next) && (
          <Flex justify="space-between" gap="3" mt="8">
            {prev ? (
              <Button variant="outline" size="sm" borderRadius="12px" color={C.muted} borderColor={C.line}
                onClick={() => go(prev)} _hover={{ color: C.ink }} maxW="48%" textAlign="left" whiteSpace="normal" h="auto" py="2">
                ‹ {shortTitle(prev.title)}
              </Button>
            ) : <Box />}
            {next ? (
              <Button size="sm" borderRadius="12px" color="#08111f" fontWeight="700"
                bg="linear-gradient(120deg,#6ec1ff,#b79bff)"
                onClick={() => go(next)} maxW="48%" textAlign="right" whiteSpace="normal" h="auto" py="2">
                {shortTitle(next.title)} ›
              </Button>
            ) : <Box />}
          </Flex>
        )}
      </Box>
    </>
  );
}
