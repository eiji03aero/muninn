import { useEffect, useMemo, useState } from 'react';
import { Box, Flex, HStack, VStack, SimpleGrid, Text, Button } from '@chakra-ui/react';
import { useNavigate, useParams } from 'react-router-dom';
import { useData } from '../../lib/ctx.js';
import { AppBar, Page, Slot, Card, Chip, Chips, CopyButton, Backlinks, NotFound, Md } from './ui.jsx';
import { markSeen } from '../../lib/recall.js';
import { C, ACCENT_GRADIENT, tint } from '../../shared/theme.js';

const MEDIA = (path) => import.meta.env.BASE_URL + path;

function Stars({ n, max = 5 }) {
  return (
    <HStack gap="0.5">
      {Array.from({ length: max }, (_, i) => (
        <span key={i} style={{ color: i < n ? C.amber : 'rgba(255,255,255,.16)', fontSize: '13px', lineHeight: 1 }}>★</span>
      ))}
    </HStack>
  );
}

function FieldValue({ field, value }) {
  if (value == null || value === '' || (Array.isArray(value) && !value.length)) return null;
  switch (field.type) {
    case 'rating': return <Stars n={value} max={field.max || 5} />;
    case 'bool': return <Text fontSize="sm" color={C.ink}>{value ? 'はい' : 'いいえ'}</Text>;
    case 'tags': return <Chips items={value} color={C.sky} />;
    case 'number': return <Text fontSize="sm" color={C.ink}>{value}{field.unit ? ` ${field.unit}` : ''}</Text>;
    case 'url':
      return <a href={value} target="_blank" rel="noreferrer" style={{ color: C.sky, borderBottom: `1px solid ${C.sky}55` }}>{value}</a>;
    default: return <Text fontSize="sm" color={C.ink} lineHeight="1.7">{value}</Text>;
  }
}

const fieldOf = (topic, key) => topic.fields.find((f) => f.key === key);
const valOf = (entry, key) => entry.fields?.[key];

// 比較テーブル。logs の設計思想は「並べて比べる」なのに、現状はグリッドと絞り込みしか無く
// 思想が UI に到達していなかった。number / rating / enum / bool を列にしてソート可能にする。
function CompareTable({ topic, entries, onOpen }) {
  const cols = topic.fields.filter((f) => ['number', 'rating', 'enum', 'bool'].includes(f.type));
  const [sort, setSort] = useState({ key: null, asc: false });

  const rows = useMemo(() => {
    if (!sort.key) return entries;
    const kv = (e) => valOf(e, sort.key);
    return [...entries].sort((a, b) => {
      const av = kv(a), bv = kv(b);
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      return (av < bv ? -1 : av > bv ? 1 : 0) * (sort.asc ? 1 : -1);
    });
  }, [entries, sort]);

  const toggle = (key) => setSort((s) => (s.key === key ? { key, asc: !s.asc } : { key, asc: false }));
  const flag = topic.fields.find((f) => f.type === 'bool');

  return (
    <Box className="glass" borderRadius="16px" overflowX="auto" style={{ WebkitOverflowScrolling: 'touch' }}>
      <Box as="table" w="100%" style={{ borderCollapse: 'collapse', minWidth: `${140 + cols.length * 86}px` }}>
        <Box as="thead">
          <Box as="tr">
            <Box as="th" position="sticky" left="0" zIndex="1" textAlign="left" px="3" py="2.5"
              fontSize="10px" letterSpacing="0.08em" color={C.faint} fontWeight="600"
              style={{ background: 'rgba(16,18,32,.94)', borderBottom: `1px solid ${C.line}` }}>
              {topic.title.replace(/の記録$/, '')}
            </Box>
            {cols.map((f) => (
              <Box as="th" key={f.key} textAlign="left" px="3" py="2.5" whiteSpace="nowrap"
                fontSize="10px" letterSpacing="0.08em" fontWeight="600"
                color={sort.key === f.key ? C.sky : C.faint} cursor="pointer"
                onClick={() => toggle(f.key)} style={{ borderBottom: `1px solid ${C.line}` }}>
                {f.label}{sort.key === f.key ? (sort.asc ? ' ▲' : ' ▼') : ''}
              </Box>
            ))}
          </Box>
        </Box>
        <Box as="tbody">
          {rows.map((e) => {
            const on = flag && valOf(e, flag.key) === true;
            return (
              <Box as="tr" key={e.slug} className="press" cursor="pointer" onClick={() => onOpen(e)}
                style={{ background: on ? tint(C.green, 10) : 'transparent' }}>
                <Box as="td" position="sticky" left="0" zIndex="1" px="3" py="2.5" minW="140px"
                  style={{ background: on ? 'rgba(22,34,32,.96)' : 'rgba(16,18,32,.94)', borderBottom: `1px solid ${C.line}` }}>
                  <Text fontSize="xs" color={C.ink} fontWeight="600" lineHeight="1.4">{e.title}</Text>
                </Box>
                {cols.map((f) => {
                  const v = valOf(e, f.key);
                  return (
                    <Box as="td" key={f.key} px="3" py="2.5" whiteSpace="nowrap"
                      style={{ borderBottom: `1px solid ${C.line}` }}>
                      {f.type === 'rating' && typeof v === 'number' ? (
                        <Text fontSize="xs" color={C.amber} style={{ fontVariantNumeric: 'tabular-nums' }}>★{v}</Text>
                      ) : f.type === 'bool' ? (
                        <Text fontSize="xs" color={v ? C.green : C.faint}>{v ? '○' : '—'}</Text>
                      ) : (
                        <Text fontSize="xs" color={v == null ? C.faint : C.ink} style={{ fontVariantNumeric: 'tabular-nums' }}>
                          {v == null ? '—' : `${v}${f.unit ? ` ${f.unit}` : ''}`}
                        </Text>
                      )}
                    </Box>
                  );
                })}
              </Box>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
}

function EntryCard({ topic, entry, onClick }) {
  const badge = topic.display.badge ? fieldOf(topic, topic.display.badge) : null;
  const badgeVal = badge ? valOf(entry, badge.key) : null;
  const sub = topic.display.subtitle ? valOf(entry, topic.display.subtitle) : null;
  const cardFields = (topic.display.cardFields || []).map((k) => fieldOf(topic, k)).filter(Boolean);
  return (
    <Box className="glass press" borderRadius="16px" overflow="hidden" cursor="pointer" onClick={onClick}
      display="flex" flexDirection="column">
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

export function LogTopic() {
  const { idx } = useData();
  const navigate = useNavigate();
  const { topic: slug } = useParams();
  const topic = idx.logtopics?.get(slug);
  const [filters, setFilters] = useState({});
  const [view, setView] = useState('compare');
  if (!topic) return <NotFound what="記録帖" />;

  const many = topic.entries.length >= 2;
  const filterFields = many ? (topic.display.filters || []).map((k) => fieldOf(topic, k)).filter(Boolean) : [];
  const setF = (key, value) => setFilters((p) => ({ ...p, [key]: p[key] === value ? undefined : value }));

  const entries = topic.entries.filter((e) =>
    filterFields.every((f) => {
      const sel = filters[f.key];
      if (sel == null) return true;
      const v = valOf(e, f.key);
      return f.type === 'rating' ? (typeof v === 'number' && v >= sel) : v === sel;
    }),
  );

  const addPrompt = `/mn-log ${topic.title} に1件記録して。写真とひと言を渡すので、スキーマ（${topic.fields.map((f) => f.label).join(' / ')}）に整形して追加して。`;

  return (
    <>
      <AppBar title={topic.title} subtitle={`${topic.entries.length}件の記録`} />
      <Page>
        {topic.intro && <Box mb="5"><Md text={topic.intro} /></Box>}

        {!many ? (
          // 記録が1件のときは比較を出さない。絞り込みも出さない（絞る意味がない）。
          <VStack align="stretch" gap="4">
            <SimpleGrid columns={2} gap="3">
              {topic.entries.map((e) => (
                <EntryCard key={e.slug} topic={topic} entry={e}
                  onClick={() => navigate(`/log/${slug}/entry/${e.slug}`)} />
              ))}
            </SimpleGrid>
            <Card soft>
              <Text fontSize="sm" color={C.ink} fontWeight="600">もう1件記録すると比べられる</Text>
              <Text fontSize="xs" color={C.muted} mt="1.5" lineHeight="1.7">
                この記録帖は「並べて比べる」ためのもの。2件目から比較表が出る。
              </Text>
              <Box mt="3"><CopyButton text={addPrompt}>記録を依頼</CopyButton></Box>
            </Card>
          </VStack>
        ) : (
          <VStack align="stretch" gap="4">
            <Flex wrap="wrap" gap="2">
              {[{ id: 'compare', label: '比較' }, { id: 'grid', label: 'グリッド' }].map((t) => {
                const on = view === t.id;
                return (
                  <Button key={t.id} size="xs" borderRadius="full" fontWeight="600" onClick={() => setView(t.id)}
                    color={on ? '#08111f' : C.muted} bg={on ? ACCENT_GRADIENT : 'transparent'}
                    border="1px solid" borderColor={on ? 'transparent' : C.line}
                    _hover={{ color: on ? '#08111f' : C.ink }}>{t.label}</Button>
                );
              })}
            </Flex>

            {filterFields.length > 0 && (
              <VStack align="stretch" gap="2.5">
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
                              _hover={{ color: on ? '#08111f' : C.ink }}>{label}</Button>
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
            ) : view === 'compare' ? (
              <CompareTable topic={topic} entries={entries} onOpen={(e) => navigate(`/log/${slug}/entry/${e.slug}`)} />
            ) : (
              <SimpleGrid columns={2} gap="3">
                {entries.map((e) => (
                  <EntryCard key={e.slug} topic={topic} entry={e}
                    onClick={() => navigate(`/log/${slug}/entry/${e.slug}`)} />
                ))}
              </SimpleGrid>
            )}
          </VStack>
        )}

        <Backlinks route={`/log/${topic.slug}`} title={topic.title} />
      </Page>
    </>
  );
}

export function LogEntry() {
  const { idx } = useData();
  const navigate = useNavigate();
  const { topic: slug, slug: eslug } = useParams();
  const topic = idx.logtopics?.get(slug);
  const entry = topic?.entries.find((e) => e.slug === eslug);
  useEffect(() => { if (entry) markSeen(`/log/${slug}/entry/${eslug}`, entry.title); }, [entry, slug, eslug]);
  if (!topic || !entry) return <NotFound what="記録" />;

  const rows = topic.fields.filter((f) => {
    const v = valOf(entry, f.key);
    return !(v == null || v === '' || (Array.isArray(v) && !v.length));
  });

  return (
    <>
      <AppBar title={entry.title} subtitle={topic.title} />
      <Page maxW="680px">
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

        <Backlinks route={`/log/${slug}/entry/${eslug}`} title={entry.title} />

        <Box mt="6">
          <Button variant="outline" size="sm" borderRadius="12px" color={C.muted} borderColor={C.line}
            onClick={() => navigate(`/log/${slug}`)} _hover={{ color: C.ink }}>
            ‹ {topic.title}の一覧
          </Button>
        </Box>
      </Page>
    </>
  );
}
