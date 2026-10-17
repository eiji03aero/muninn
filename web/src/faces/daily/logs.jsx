import { useEffect, useState } from 'react';
import { Box, Flex, HStack, VStack, SimpleGrid, Text, Button } from '@chakra-ui/react';
import { useNavigate, useParams } from 'react-router-dom';
import { useData } from '../../lib/ctx.js';
import { AppBar, Page, Card, Chip, Chips, CopyButton, Backlinks, NotFound, Md } from './ui.jsx';
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

// ---------------- 軸で並べる ----------------
// logs の設計思想は「並べて比べる」。以前は number / rating / enum / bool を列にした比較表だったが、
// スマホ幅では3列目から先が横スクロールの外に出て、**比べたい列が画面に入らなかった**（2026-10-17、オーナー指摘）。
// 表は全部の値を見せるが、「どれが良いか」の答えは読む人が自分で出すしかない。
// だから表をやめ、**軸（enum / bool / rating の項目）を1つ選ぶとその値ごとに束ね、束ごとの平均評価を並べる**。
// 比べた結果（どの束がいちばん高いか）を先に1行で言い切り、1件ずつの値は記録ページに任せる。
const AXIS_TYPES = ['enum', 'bool', 'rating'];
const isBlank = (v) => v == null || v === '' || (Array.isArray(v) && !v.length);

// 既定の軸: 記入の多い enum → 無ければ bool → 無ければ rating。記入の少ない軸を既定にすると
// ほぼ全件が「未記入」の1束に落ちて、何も比べていない画面になる。同数ならスキーマの順（原則10）。
function defaultAxis(topic, fields) {
  const filled = (f) => topic.entries.filter((e) => !isBlank(valOf(e, f.key))).length;
  for (const t of AXIS_TYPES) {
    const c = fields.filter((f) => f.type === t);
    if (c.length) return c.reduce((best, f) => (filled(f) > filled(best) ? f : best), c[0]).key;
  }
  return null;
}

// 平均を取る項目。サイトのカードで主役にしている rating（display.badge）を優先する。
function scoreFieldOf(topic) {
  const badge = topic.display.badge ? fieldOf(topic, topic.display.badge) : null;
  return badge?.type === 'rating' ? badge : topic.fields.find((f) => f.type === 'rating') || null;
}

function groupByAxis(topic, field, score) {
  const buckets = field.type === 'enum'
    ? (field.options || []).map((o) => ({ v: o, label: String(o) }))
    : field.type === 'bool'
      ? [{ v: true, label: `${field.label}：はい` }, { v: false, label: `${field.label}：いいえ` }]
      : Array.from({ length: field.max || 5 }, (_, i) => (field.max || 5) - i).map((n) => ({ v: n, label: `★${n}` }));
  const groups = buckets.map((b) => ({ ...b, entries: topic.entries.filter((e) => valOf(e, field.key) === b.v) }));
  groups.push({ v: null, label: '未記入', blank: true, entries: topic.entries.filter((e) => isBlank(valOf(e, field.key))) });
  return groups.filter((g) => g.entries.length).map((g) => {
    const vals = score ? g.entries.map((e) => valOf(e, score.key)).filter((v) => typeof v === 'number') : [];
    const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    // 束の中は評価の高い順。同点は元の並び（スキーマの display.sort）を保つ
    const entries = score
      ? [...g.entries].sort((a, b) => (valOf(b, score.key) ?? -1) - (valOf(a, score.key) ?? -1))
      : g.entries;
    return { ...g, avg, entries };
  });
}

// 一覧に出す名前。タイトルが「商品名 / 店」で、店が副題の項目として別にあるなら商品名だけにする
// （同じ店名を2行続けて読ませない）。
function entryName(topic, e) {
  const sub = topic.display.subtitle ? valOf(e, topic.display.subtitle) : null;
  const name = sub && e.title.includes(' / ') ? e.title.split(' / ')[0] : e.title;
  return { name, sub };
}

function AxisView({ topic, onOpen }) {
  const fields = topic.fields.filter((f) => AXIS_TYPES.includes(f.type));
  const [axisKey, setAxisKey] = useState(() => defaultAxis(topic, fields));
  const axis = fields.find((f) => f.key === axisKey) || fields[0];
  const score = scoreFieldOf(topic);
  const flag = topic.fields.find((f) => f.type === 'bool');
  const groups = groupByAxis(topic, axis, score);
  const max = score?.max || 5;

  const ranked = groups.filter((g) => !g.blank && g.entries.length >= 2 && g.avg != null).sort((a, b) => b.avg - a.avg);
  const insight = !score ? null
    : axis.key === score.key ? `${axis.label}ごとに並べています`
      : ranked.length ? `${ranked[0].label}（平均 ★${ranked[0].avg.toFixed(1)}・${ranked[0].entries.length}件）`
        : '比べられるほど記録がまだない';

  return (
    <VStack align="stretch" gap="3.5">
      <Box>
        <Text fontSize="11px" color={C.faint} letterSpacing="0.08em" mb="1.5">並べる軸</Text>
        <Flex role="group" aria-label="並べる軸" p="3px" borderRadius="12px" overflowX="auto"
          bg="rgba(255,255,255,.06)" border="1px solid rgba(255,255,255,.10)" style={{ scrollbarWidth: 'none' }}>
          {fields.map((f) => {
            const on = f.key === axis.key;
            return (
              <Box as="button" type="button" key={f.key} flex="1 0 auto" h="36px" px="3" borderRadius="9px"
                fontSize="13px" fontWeight="600" whiteSpace="nowrap" aria-pressed={on}
                color={on ? '#08111f' : C.muted} bg={on ? ACCENT_GRADIENT : 'transparent'}
                onClick={() => setAxisKey(f.key)}>
                {f.label}
              </Box>
            );
          })}
        </Flex>
      </Box>

      {insight && (
        <Box className="glass" px="4" py="3.5" borderRadius="16px">
          {axis.key !== score.key && ranked.length > 0 && (
            <Text fontSize="11px" color={C.faint}>この軸でいちばん高いのは</Text>
          )}
          <Text fontSize="md" fontWeight="700" color={C.ink} mt="1">{insight}</Text>
        </Box>
      )}

      {groups.map((g) => (
        <Box as="section" key={String(g.v)} className="glass-soft" overflow="hidden" aria-label={g.label}>
          <Flex align="center" gap="2.5" px="4" pt="3.5" pb="2.5">
            <Text fontSize="sm" fontWeight="700" color={g.blank ? C.muted : C.ink}>{g.label}</Text>
            <Text fontSize="11px" color={C.faint}>{g.entries.length}件</Text>
            {g.avg != null && axis.key !== score?.key && (
              <Flex ml="auto" align="center" gap="2" fontSize="12px" fontWeight="700" color={C.amber}
                style={{ fontVariantNumeric: 'tabular-nums' }}>
                平均 ★{g.avg.toFixed(1)}
                <Box w="56px" h="5px" borderRadius="full" bg="rgba(255,255,255,.08)" overflow="hidden">
                  <Box h="100%" borderRadius="full" bg={C.amber} style={{ width: `${Math.round((g.avg / max) * 100)}%` }} />
                </Box>
              </Flex>
            )}
          </Flex>
          {g.entries.map((e) => {
            const { name, sub } = entryName(topic, e);
            const s = score ? valOf(e, score.key) : null;
            return (
              <Flex as="button" type="button" key={e.slug} w="100%" textAlign="left" className="press"
                align="center" gap="3" px="4" py="2.5" borderTop={`1px solid ${C.line}`} onClick={() => onOpen(e)}>
                {score && (
                  <Flex w="38px" h="38px" borderRadius="10px" flexShrink="0" direction="column" align="center" justify="center"
                    lineHeight="1" color={C.amber} bg={tint(C.amber, 12)} border="1px solid" borderColor={tint(C.amber, 28)}>
                    <Text fontSize="15px" fontWeight="800">{typeof s === 'number' ? s : '—'}</Text>
                    <Text fontSize="9px" mt="0.5">★</Text>
                  </Flex>
                )}
                <Box flex="1" minW="0">
                  <Text fontSize="13px" fontWeight="600" color={C.ink} lineHeight="1.4" truncate>{name}</Text>
                  {sub && <Text fontSize="11px" color={C.faint} mt="0.5" truncate>{sub}</Text>}
                </Box>
                {flag && valOf(e, flag.key) === true && (
                  <Box flexShrink="0"><Chip color={C.green}>{flag.label}</Chip></Box>
                )}
              </Flex>
            );
          })}
        </Box>
      ))}
    </VStack>
  );
}

export function LogTopic() {
  const { idx } = useData();
  const navigate = useNavigate();
  const { topic: slug } = useParams();
  const topic = idx.logtopics?.get(slug);
  if (!topic) return <NotFound what="記録帖" />;

  const many = topic.entries.length >= 2;
  const canGroup = topic.fields.some((f) => AXIS_TYPES.includes(f.type));
  const open = (e) => navigate(`/log/${slug}/entry/${e.slug}`);
  const addPrompt = `/mn-log ${topic.title} に1件記録して。写真とひと言を渡すので、スキーマ（${topic.fields.map((f) => f.label).join(' / ')}）に整形して追加して。`;

  return (
    <>
      <AppBar title={topic.title} subtitle={`${topic.entries.length}件の記録`} />
      <Page>
        {/* 説明は折り畳む。開いた瞬間に見えるべきなのは比べた結果で、帳面の説明ではない */}
        {topic.intro && (
          <Box as="details" className="glass-soft" px="4" mb="4">
            <Box as="summary" display="flex" justifyContent="space-between" alignItems="center" minH="44px"
              fontSize="13px" color={C.muted} cursor="pointer" style={{ listStyle: 'none' }}>
              この記録帖について<span aria-hidden="true">▾</span>
            </Box>
            <Box pb="3"><Md text={topic.intro} /></Box>
          </Box>
        )}

        {!many || !canGroup ? (
          // 記録が1件のとき（または束ねられる項目が無いとき）は比べない。カードで並べるだけにする。
          <VStack align="stretch" gap="4">
            <SimpleGrid columns={2} gap="3">
              {topic.entries.map((e) => (
                <EntryCard key={e.slug} topic={topic} entry={e} onClick={() => open(e)} />
              ))}
            </SimpleGrid>
            {!many && (
              <Card soft>
                <Text fontSize="sm" color={C.ink} fontWeight="600">もう1件記録すると比べられる</Text>
                <Text fontSize="xs" color={C.muted} mt="1.5" lineHeight="1.7">
                  この記録帖は「並べて比べる」ためのもの。2件目から軸ごとに束ねて比べられる。
                </Text>
                <Box mt="3"><CopyButton text={addPrompt}>記録を依頼</CopyButton></Box>
              </Card>
            )}
          </VStack>
        ) : (
          <AxisView key={topic.slug} topic={topic} onOpen={open} />
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
