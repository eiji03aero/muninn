import { useState } from 'react';
import { Box, Flex, HStack, VStack, SimpleGrid, Heading, Text, Button } from '@chakra-ui/react';
import { useNavigate, useParams } from 'react-router-dom';
import { useData } from './lib/ctx.js';
import { AppBar, Chip, Chips, Card, Center, Md } from './ui.jsx';
import { C, ACCENT_GRADIENT, tint } from './theme.js';

const MEDIA = (path) => import.meta.env.BASE_URL + path; // log-media/... → /muninn/log-media/...

// ---- 評価（★） ----
function Stars({ n, max = 5 }) {
  return (
    <HStack gap="0.5">
      {Array.from({ length: max }, (_, i) => (
        <span key={i} style={{ color: i < n ? C.amber : 'rgba(255,255,255,.16)', fontSize: '13px', lineHeight: 1 }}>★</span>
      ))}
    </HStack>
  );
}

// ---- フィールド値をタイプ別に描画 ----
function FieldValue({ field, value }) {
  if (value == null || value === '' || (Array.isArray(value) && !value.length)) return null;
  switch (field.type) {
    case 'rating': return <Stars n={value} max={field.max || 5} />;
    case 'bool': return <Text fontSize="sm" color={C.ink}>{value ? 'はい' : 'いいえ'}</Text>;
    case 'tags': return <Chips items={value} color={C.sky} />;
    case 'number': return <Text fontSize="sm" color={C.ink}>{value}{field.unit ? ` ${field.unit}` : ''}</Text>;
    case 'url':
      return <a href={value} target="_blank" rel="noreferrer" style={{ color: C.sky, borderBottom: `1px solid ${C.sky}55` }}>{value}</a>;
    default: return <Text fontSize="sm" color={C.ink}>{value}</Text>;
  }
}

const fieldOf = (topic, key) => topic.fields.find((f) => f.key === key);
const valOf = (entry, key) => entry.fields?.[key];

// ---- トピック一覧（/logs） ----
export function LogsIndex() {
  const { site } = useData();
  const navigate = useNavigate();
  const topics = site.logtopics || [];
  return (
    <>
      <AppBar title="ログ" subtitle={`トピック別の記録帖 · ${topics.length}トピック`} />
      <Box maxW="720px" mx="auto" px="4" py="4" style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}>
        {topics.length === 0 ? (
          <Text fontSize="sm" color={C.muted}>まだログがないのだ（`/mn-log` でトピックを作る）</Text>
        ) : (
          <VStack align="stretch" gap="3">
            {topics.map((t) => <TopicCard key={t.slug} topic={t} onClick={() => navigate(`/log/${t.slug}`)} />)}
          </VStack>
        )}
      </Box>
    </>
  );
}

export function TopicCard({ topic, onClick }) {
  const latest = topic.entries[0];
  const thumb = topic.entries.find((e) => e.image)?.image;
  return (
    <Box className="glass press" borderRadius="16px" overflow="hidden" cursor="pointer" onClick={onClick}>
      <Flex align="stretch">
        {thumb && (
          <Box w="88px" flexShrink="0" style={{ backgroundImage: `url(${MEDIA(thumb)})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
        )}
        <Box flex="1" minW="0" p="4">
          <Flex justify="space-between" align="start" gap="3">
            <Box flex="1" minW="0">
              <Heading size="sm" color={C.ink}>{topic.title}</Heading>
              <Text fontSize="xs" color={C.muted} mt="1" truncate>
                {latest ? `最新: ${latest.title}` : 'まだ記録なし'}
              </Text>
            </Box>
            <VStack align="end" gap="1.5" flexShrink="0">
              <Chip color={C.orange}>ログ</Chip>
              <Text fontSize="xs" color={C.faint}>{topic.entries.length}件</Text>
            </VStack>
          </Flex>
        </Box>
      </Flex>
    </Box>
  );
}

// ---- トピック（コレクション表示 /log/:topic） ----
export function LogTopic() {
  const { idx } = useData();
  const navigate = useNavigate();
  const { topic: slug } = useParams();
  const topic = idx.logtopics?.get(slug);
  const [filters, setFilters] = useState({}); // { fieldKey: value }
  if (!topic) return <Center><Text color={C.muted}>ログが見つからないのだ</Text><Button colorPalette="blue" onClick={() => navigate('/')}>ホームへ</Button></Center>;

  const filterFields = (topic.display.filters || []).map((k) => fieldOf(topic, k)).filter(Boolean);
  const setF = (key, value) => setFilters((p) => ({ ...p, [key]: p[key] === value ? undefined : value }));

  const entries = topic.entries.filter((e) =>
    filterFields.every((f) => {
      const sel = filters[f.key];
      if (sel == null) return true;
      const v = valOf(e, f.key);
      return f.type === 'rating' ? (typeof v === 'number' && v >= sel) : v === sel;
    })
  );

  return (
    <>
      <AppBar title={topic.title} subtitle={`${topic.entries.length}件の記録`} />
      <Box maxW="720px" mx="auto" px="4" py="4" style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}>
        {topic.intro && <Box mb="5"><Md text={topic.intro} /></Box>}

        {filterFields.length > 0 && (
          <VStack align="stretch" gap="2.5" mb="5">
            {filterFields.map((f) => {
              const values = f.type === 'rating'
                ? [5, 4, 3].map((n) => ({ v: n, label: `★${n}${n < 5 ? '+' : ''}` }))
                : [...new Set(topic.entries.map((e) => valOf(e, f.key)).filter((v) => v != null))].map((v) => ({ v, label: String(v) }));
              if (!values.length) return null;
              return (
                <Box key={f.key}>
                  <Text fontSize="11px" color={C.faint} mb="1.5">{f.label}</Text>
                  <Flex wrap="wrap" gap="2">
                    {values.map(({ v, label }) => {
                      const on = filters[f.key] === v;
                      return (
                        <Button key={String(v)} size="xs" borderRadius="full" fontWeight="600" onClick={() => setF(f.key, v)}
                          color={on ? '#08111f' : C.muted} bg={on ? ACCENT_GRADIENT : 'transparent'}
                          border="1px solid" borderColor={on ? 'transparent' : C.line}
                          _hover={{ color: on ? '#08111f' : C.ink }}>
                          {label}
                        </Button>
                      );
                    })}
                  </Flex>
                </Box>
              );
            })}
          </VStack>
        )}

        {entries.length === 0 ? (
          <Text fontSize="sm" color={C.muted}>条件に合う記録がないのだ</Text>
        ) : (
          <SimpleGrid columns={2} gap="3">
            {entries.map((e) => <EntryCard key={e.slug} topic={topic} entry={e} onClick={() => navigate(`/log/${slug}/entry/${e.slug}`)} />)}
          </SimpleGrid>
        )}
      </Box>
    </>
  );
}

function EntryCard({ topic, entry, onClick }) {
  const badge = topic.display.badge ? fieldOf(topic, topic.display.badge) : null;
  const badgeVal = badge ? valOf(entry, badge.key) : null;
  const sub = topic.display.subtitle ? valOf(entry, topic.display.subtitle) : null;
  const cardFields = (topic.display.cardFields || []).map((k) => fieldOf(topic, k)).filter(Boolean);
  return (
    <Box className="glass press" borderRadius="16px" overflow="hidden" cursor="pointer" onClick={onClick} display="flex" flexDirection="column">
      {entry.image && (
        <Box h="120px" style={{ backgroundImage: `url(${MEDIA(entry.image)})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
      )}
      <Box p="3" flex="1" display="flex" flexDirection="column" gap="1.5">
        <Text fontWeight="700" fontSize="sm" color={C.ink} lineHeight="1.35">{entry.title}</Text>
        {sub && <Text fontSize="xs" color={C.muted} truncate>{sub}</Text>}
        {badge?.type === 'rating' && typeof badgeVal === 'number' && <Stars n={badgeVal} max={badge.max || 5} />}
        {cardFields.length > 0 && (
          <Flex wrap="wrap" gap="1.5" mt="0.5">
            {cardFields.flatMap((f) => {
              const v = valOf(entry, f.key);
              if (v == null || v === '' || (Array.isArray(v) && !v.length)) return [];
              const items = f.type === 'tags' ? v : [f.type === 'number' && f.unit ? `${v} ${f.unit}` : v];
              return items.slice(0, 3).map((it, i) => <Chip key={`${f.key}-${i}`} color={C.faint}>{String(it)}</Chip>);
            })}
          </Flex>
        )}
      </Box>
    </Box>
  );
}

// ---- 記録詳細（/log/:topic/entry/:slug） ----
export function LogEntry() {
  const { idx } = useData();
  const navigate = useNavigate();
  const { topic: slug, slug: eslug } = useParams();
  const topic = idx.logtopics?.get(slug);
  const entry = topic?.entries.find((e) => e.slug === eslug);
  if (!topic || !entry) return <Center><Text color={C.muted}>記録が見つからないのだ</Text><Button colorPalette="blue" onClick={() => navigate('/')}>ホームへ</Button></Center>;

  // スキーマ順に、値のある field を並べる
  const rows = topic.fields.filter((f) => {
    const v = valOf(entry, f.key);
    return !(v == null || v === '' || (Array.isArray(v) && !v.length));
  });

  return (
    <>
      <AppBar title={entry.title} subtitle={topic.title} />
      <Box maxW="680px" mx="auto" px="4" py="4" style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}>
        {entry.image && (
          <Box mb="5" borderRadius="16px" overflow="hidden" className="glass">
            <img src={MEDIA(entry.image)} alt={entry.title} style={{ width: '100%', display: 'block' }} />
          </Box>
        )}

        <Box className="glass-soft" borderRadius="14px" px="4" py="1" mb="5">
          {rows.map((f, i) => (
            <Flex key={f.key} align="start" gap="3" py="2.5" borderTop={i ? `1px solid ${C.line}` : 'none'}>
              <Text fontSize="xs" color={C.faint} w="88px" flexShrink="0" pt="0.5">{f.label}</Text>
              <Box flex="1" minW="0"><FieldValue field={f} value={valOf(entry, f.key)} /></Box>
            </Flex>
          ))}
        </Box>

        {entry.body && <Md text={entry.body} />}

        <Box mt="6">
          <Button variant="outline" size="sm" borderRadius="12px" color={C.muted} borderColor={C.line}
            onClick={() => navigate(`/log/${slug}`)} _hover={{ color: C.ink }}>
            ‹ {topic.title}の一覧
          </Button>
        </Box>
      </Box>
    </>
  );
}
