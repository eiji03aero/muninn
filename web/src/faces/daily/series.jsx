// 「続きもの」——中身が増え続ける入れ物（連載・記録帖・定点）の一覧。
//
// なぜこの画面が要るか: 棚はタグの在庫マップなので、連載も記録帖も「中の1ノード」として
// 散らばって出るだけだった。探すは名前を覚えている人にしか効かない。
// 結果、「そもそもどんな連載があるんだっけ」に答える場所がサイトのどこにも無かった。
// ここは**その1問だけ**に答える（原則7: 面が答えられないジョブを面に押し込まない）。
import { useMemo, useState } from 'react';
import { Box, Flex, HStack, VStack, Text, Button } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../lib/ctx.js';
import { AppBar, Page, Slot, Card, Chip, CopyButton, relDay } from './ui.jsx';
import { tagLabel, tagToParam } from '../../lib/graph.js';
import { buildSeries, countText, kindMeta, SERIES_KINDS } from '../../lib/series.js';
import { todayISO } from '../../lib/recall.js';
import { C, ACCENT_GRADIENT, tint } from '../../shared/theme.js';

const KIND_COLOR = { atlas: C.violet, log: C.green, follow: C.amber };

// 分け方は3つだけ。増やすほど「どれで見ていたか」が分からなくなる。
const MODES = [
  { id: 'kind', label: 'かたち別' },
  { id: 'tag', label: 'テーマ別' },
  { id: 'recent', label: '動いた順' },
];

function groupItems(mode, items) {
  if (mode === 'kind') {
    return SERIES_KINDS
      .map((k) => ({ id: k.id, label: k.label, hint: k.lead, items: items.filter((i) => i.kind === k.id) }))
      .filter((g) => g.items.length > 0);
  }
  if (mode === 'tag') {
    const byTag = new Map();
    for (const it of items) {
      const tags = it.tags.filter((t) => t !== 'moc');
      if (!tags.length) {
        if (!byTag.has('')) byTag.set('', []);
        byTag.get('').push(it);
        continue;
      }
      // 複数タグを持つ入れ物はどちらのテーマからも見つかるべきなので、両方に出す。
      for (const t of tags) {
        if (!byTag.has(t)) byTag.set(t, []);
        byTag.get(t).push(it);
      }
    }
    return [...byTag.entries()]
      .map(([tag, list]) => ({
        id: tag || '__none', label: tag ? tagLabel(tag) : 'テーマ未設定',
        to: tag ? `/shelf/${tagToParam(tag)}` : null, items: list,
      }))
      .sort((a, b) => (b.items.length - a.items.length) || a.label.localeCompare(b.label, 'ja'))
      .sort((a, b) => (a.id === '__none' ? 1 : 0) - (b.id === '__none' ? 1 : 0));
  }
  return [{ id: 'recent', label: null, items }];
}

function Bar({ pct }) {
  return (
    <Box mt="2.5" h="5px" borderRadius="full" bg="rgba(255,255,255,.08)" overflow="hidden">
      <Box h="100%" borderRadius="full" bg={ACCENT_GRADIENT} style={{ width: `${pct}%` }} />
    </Box>
  );
}

function SeriesCard({ item, today, onOpen }) {
  const meta = kindMeta(item.kind);
  const color = KIND_COLOR[item.kind];
  return (
    <Card onClick={() => onOpen(item.route)}>
      <HStack justify="space-between" align="start" gap="2.5">
        <Text fontSize="sm" fontWeight="700" color={C.ink} lineHeight="1.5">{item.title}</Text>
        <Box flexShrink="0"><Chip color={color}>{meta.label}</Chip></Box>
      </HStack>
      {item.gist && (
        <Text fontSize="xs" color={C.muted} mt="1.5" lineHeight="1.7"
          style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {item.gist}
        </Text>
      )}
      <HStack justify="space-between" align="baseline" gap="2" mt="2.5">
        <Text fontSize="11px" color={C.faint}>{countText(item)}</Text>
        {item.updated && <Text fontSize="11px" color={C.faint} flexShrink="0">{relDay(item.updated, today)}</Text>}
      </HStack>
      {item.progress != null && item.total > 0 && <Bar pct={Math.round(item.progress * 100)} />}
    </Card>
  );
}

export function Series() {
  const navigate = useNavigate();
  const { site, reads } = useData();
  const [mode, setMode] = useState('kind');
  const today = todayISO();

  const items = useMemo(() => buildSeries(site, reads), [site, reads]);
  const groups = useMemo(() => groupItems(mode, items), [mode, items]);

  // 「続きから」: 読みかけの連載（1章でも読んだ）を先頭に差し出す。
  // 1本も読みかけが無いときだけ、いちばん新しい連載を1本だけ「はじめから」として出す——
  // 未読の連載を全部ここに並べると、下の一覧と丸ごと同じものが2度出て嵩むだけになる。
  const reading = items.filter((i) => i.kind === 'atlas' && i.next && i.done > 0).slice(0, 3);
  const resume = reading.length
    ? reading
    : items.filter((i) => i.kind === 'atlas' && i.next).slice(0, 1);

  const counts = SERIES_KINDS
    .map((k) => ({ k, n: items.filter((i) => i.kind === k.id).length }))
    .filter((x) => x.n > 0)
    .map((x) => `${x.k.label} ${x.n}`)
    .join(' · ');

  const startPrompt =
    '/mn-learn 〜について学びたいので、学習アトラス（知識グラフ＋読む順路）を作って。\n' +
    '（記録帖を始めたいときは代わりに `/mn-log 〜を記録したい。記録項目を設計して` と頼む）';

  return (
    <>
      <AppBar title="続きもの" back={false} subtitle={counts || '中身が増えていくもの'} />
      <Page>
        <VStack align="stretch" gap="6">

          {resume.length > 0 && (
            <Box>
              <Slot>{reading.length ? '続きから' : 'まずはここから'}</Slot>
              <VStack align="stretch" gap="3">
                {resume.map((i) => (
                  <Card key={i.key} onClick={() => navigate(i.next.route)}>
                    <Text fontSize="11px" color={C.faint}>
                      {i.title}{i.next.routeLabel ? ` — ${i.next.routeLabel}` : ''}
                    </Text>
                    <Text fontSize="sm" color={C.ink} fontWeight="700" mt="1">
                      {i.done > 0 ? '次の章' : '第1章'}：{i.next.title}
                    </Text>
                    {i.next.gist && (
                      <Text fontSize="xs" color={C.muted} mt="1" lineHeight="1.7"
                        style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {i.next.gist}
                      </Text>
                    )}
                    <Flex align="center" gap="2.5" mt="3">
                      <Box flex="1" h="5px" borderRadius="full" bg="rgba(255,255,255,.08)" overflow="hidden">
                        <Box h="100%" borderRadius="full" bg={ACCENT_GRADIENT}
                          style={{ width: `${Math.round((i.progress || 0) * 100)}%` }} />
                      </Box>
                      <Text fontSize="11px" color={C.faint} flexShrink="0">読了 {i.done}/{i.total}</Text>
                    </Flex>
                  </Card>
                ))}
              </VStack>
            </Box>
          )}

          {items.length === 0 ? (
            <Card soft>
              <Text fontSize="sm" color={C.ink} fontWeight="600">まだ続きものが無い</Text>
              <Text fontSize="xs" color={C.muted} mt="1.5" lineHeight="1.7">
                1トピックを順路つきで学ぶか、同じ項目で貯めて比べるところから始める。
              </Text>
              <Box mt="3"><CopyButton text={startPrompt}>始める依頼をつくる</CopyButton></Box>
            </Card>
          ) : (
            <Box>
              <Slot count={`${items.length}`}>分け方</Slot>
              <Flex wrap="wrap" gap="2">
                {MODES.map((m) => {
                  const on = mode === m.id;
                  return (
                    <Button key={m.id} size="xs" borderRadius="full" fontWeight="600"
                      onClick={() => setMode(m.id)}
                      color={on ? '#08111f' : C.muted} bg={on ? ACCENT_GRADIENT : 'transparent'}
                      border="1px solid" borderColor={on ? 'transparent' : C.line}
                      _hover={{ color: on ? '#08111f' : C.ink }}>
                      {m.label}
                    </Button>
                  );
                })}
              </Flex>

              <VStack align="stretch" gap="5" mt="4">
                {groups.map((g) => (
                  <Box key={g.id}>
                    {g.label && (
                      <Slot count={g.items.length}
                        action={g.to ? (
                          <Button size="xs" variant="ghost" color={C.faint} px="1" flexShrink="0"
                            _hover={{ color: C.ink, bg: 'transparent' }}
                            onClick={() => navigate(g.to)}>テーマへ ›</Button>
                        ) : null}>
                        {g.label}
                      </Slot>
                    )}
                    {g.hint && <Text fontSize="11px" color={C.faint} mt="-1" mb="2.5" lineHeight="1.6">{g.hint}</Text>}
                    <VStack align="stretch" gap="3">
                      {g.items.map((i) => (
                        <SeriesCard key={`${g.id}:${i.key}`} item={i} today={today}
                          onOpen={(r) => navigate(r)} />
                      ))}
                    </VStack>
                  </Box>
                ))}
              </VStack>
            </Box>
          )}

          {items.length > 0 && (
            <Box className="glass-soft" p="4" borderRadius="14px" border="1px solid" borderColor={tint(C.violet, 26)}>
              <Text fontSize="sm" color={C.ink} fontWeight="700">新しく始める</Text>
              <Text fontSize="xs" color={C.muted} mt="1" lineHeight="1.7">
                読む順路つきで学ぶなら連載、同じ項目で貯めて比べるなら記録帖。
              </Text>
              <Box mt="3"><CopyButton text={startPrompt}>始める依頼をつくる</CopyButton></Box>
            </Box>
          )}

        </VStack>
      </Page>
    </>
  );
}
