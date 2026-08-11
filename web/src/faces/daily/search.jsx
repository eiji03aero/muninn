import { useMemo, useState } from 'react';
import { Box, Flex, HStack, VStack, Text, Input, Button } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../lib/ctx.js';
import { AppBar, Page, Slot, Card, Chip, CopyButton } from './ui.jsx';
import { typeLabel, tagLabel, tagToParam } from '../../lib/graph.js';
import { loadSeen } from '../../lib/recall.js';
import { C } from '../../shared/theme.js';

// ビルド時インデックスは作らない。site.json は復号済みで全メモリ上にあり、90記事規模なら
// 素の indexOf の総当たりで数ミリ秒。過剰設計を避ける。
const TYPE_ORDER = ['note', 'concept', 'session', 'entity', 'logentry', 'follow', 'atlas', 'logtopic'];

function snippet(body, q) {
  const i = (body || '').toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return null;
  const from = Math.max(0, i - 40);
  const to = Math.min(body.length, i + q.length + 40);
  return {
    pre: (from > 0 ? '…' : '') + body.slice(from, i),
    hit: body.slice(i, i + q.length),
    post: body.slice(i + q.length, to) + (to < body.length ? '…' : ''),
  };
}

export function Search() {
  const navigate = useNavigate();
  const { graph, site } = useData();
  const [q, setQ] = useState('');
  const query = q.trim();

  const results = useMemo(() => {
    if (query.length < 1) return [];
    const lc = query.toLowerCase();
    const out = [];
    for (const n of graph.nodes) {
      if (n.type === 'moc') continue;
      const hay = [n.title, (n.tags || []).join(' '), n.body,
        n.type === 'logentry' ? Object.values(n.ref.fields || {}).join(' ') : '',
        n.type === 'concept' ? n.ref.gist || '' : ''].join('\n');
      if (!hay.toLowerCase().includes(lc)) continue;
      out.push({ node: n, snip: snippet(n.body, query) || snippet(hay, query) });
    }
    return out;
  }, [query, graph]);

  const grouped = useMemo(() => {
    const g = new Map();
    for (const r of results) {
      if (!g.has(r.node.type)) g.set(r.node.type, []);
      g.get(r.node.type).push(r);
    }
    return [...g.entries()].sort((a, b) => TYPE_ORDER.indexOf(a[0]) - TYPE_ORDER.indexOf(b[0]));
  }, [results]);

  const seen = loadSeen();
  const topTags = graph.tags.slice(0, 6);

  const askPrompt =
    `/mn 「${query}」について調べて、muninn に記録して。` +
    `客観的な事実は kind: knowledge の原子ノートにして、既存ノートと相互リンクすること。` +
    `（muninn の中を探したが見つからなかったので新規に調べてほしい）`;

  return (
    <>
      <AppBar title="探す" back={false} subtitle="覚えていることから引く">
        <Box mt="3">
          {/* autoFocus を付けない。PWA standalone では開いた瞬間にソフトキーボードが立ち上がり、
              下端固定のタブがキーボードの上へ押し上げられて「探すだけタブの位置が違う」状態になる。
              入力欄は画面の一番目立つ位置にあるので、打ちたいときに触れば足りる。
              （Safari タブでは autoFocus が無視されるため、この差は standalone でだけ出ていた） */}
          <Input placeholder="本文もタグも横断して探す" value={q} onChange={(e) => setQ(e.target.value)}
            color={C.ink} bg="rgba(255,255,255,.05)" border="1px solid" borderColor={C.line}
            borderRadius="14px" _placeholder={{ color: C.faint }}
            _focus={{ borderColor: C.sky, outline: 'none' }} />
        </Box>
      </AppBar>
      <Page>
        {!query ? (
          <VStack align="stretch" gap="6">
            {seen.length > 0 && (
              <Box>
                <Slot>最近見たもの</Slot>
                <VStack align="stretch" gap="2">
                  {seen.map((s) => (
                    <Card key={s.route} onClick={() => navigate(s.route)}>
                      <Text fontSize="sm" color={C.ink} lineHeight="1.5">{s.title}</Text>
                    </Card>
                  ))}
                </VStack>
              </Box>
            )}
            <Box>
              <Slot>よく使うタグ</Slot>
              <Flex wrap="wrap" gap="2">
                {topTags.map((t) => (
                  <Button key={t.tag} size="xs" variant="outline" borderRadius="full" color={C.muted}
                    borderColor={C.line} _hover={{ color: C.ink, bg: 'rgba(255,255,255,.05)' }}
                    onClick={() => navigate(`/shelf/${tagToParam(t.tag)}`)}>
                    {t.label} <Box as="span" color={C.faint} ml="1">{t.count}</Box>
                  </Button>
                ))}
              </Flex>
            </Box>
          </VStack>
        ) : results.length === 0 ? (
          <Card soft>
            <Text fontSize="sm" color={C.ink} fontWeight="600">muninn にはまだ無い</Text>
            <Text fontSize="xs" color={C.muted} mt="1.5" lineHeight="1.7">
              探して無かったことが、次の蓄積の入口になる。
            </Text>
            <Box mt="3"><CopyButton text={askPrompt}>これを調べて記録してもらう</CopyButton></Box>
          </Card>
        ) : (
          <VStack align="stretch" gap="6">
            {grouped.map(([type, list]) => (
              <Box key={type}>
                <Slot count={list.length}>{typeLabel(type)}</Slot>
                <VStack align="stretch" gap="2">
                  {list.map(({ node, snip }) => (
                    <Card key={node.route} onClick={() => navigate(node.route)}>
                      <Text fontSize="sm" color={C.ink} fontWeight="600" lineHeight="1.5">{node.short}</Text>
                      {snip && (
                        <Text fontSize="11px" color={C.faint} mt="1.5" lineHeight="1.7">
                          {snip.pre}
                          <Box as="span" color={C.ink} fontWeight="700" bg="rgba(110,193,255,.16)" px="0.5">{snip.hit}</Box>
                          {snip.post}
                        </Text>
                      )}
                    </Card>
                  ))}
                </VStack>
              </Box>
            ))}
          </VStack>
        )}
      </Page>
    </>
  );
}
