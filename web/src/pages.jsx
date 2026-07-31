import { useEffect, useMemo, useState } from 'react';
import { Box, Flex, HStack, VStack, SimpleGrid, Heading, Text, Button, Textarea } from '@chakra-ui/react';
import { useNavigate, useParams } from 'react-router-dom';
import { useData } from './lib/ctx.js';
import {
  AppBar, Page, Slot, Card, Chip, Chips, TagChips, CopyButton, Backlinks,
  Sparkline, Delta, NotFound, Md, relDay, GROUP, GROUP_ORDER,
} from './ui.jsx';
import { cleanTitle, tagLabel } from './lib/graph.js';
import {
  effectiveSrs, recordVerdict, markSeen, todayISO, daysBetween, effectiveNext,
} from './lib/recall.js';
import { C, ACCENT_GRADIENT, tint } from './theme.js';

const clipHref = (c) => (c.url ? c.url : `https://www.youtube.com/results?search_query=${encodeURIComponent(c.query || c.title || '')}`);
const statusColor = (s) => (s === 'injured' ? C.pink : s === 'inactive' ? C.faint : C.green);

// ---------------- 記事 ----------------
export function Note() {
  const navigate = useNavigate();
  const { site, idx, graph, shadow, refresh } = useData();
  const { slug } = useParams();
  const n = idx.notes.get(slug);
  const today = todayISO();
  const [memo, setMemo] = useState('');
  const [judged, setJudged] = useState(null);

  useEffect(() => { if (n) markSeen(`/note/${n.slug}`, n.title); }, [n]);

  // 「次の1枚」は決定的に1枚だけ。選ばせない——3枚並べた瞬間に判断コストが生まれ、
  // 行き止まりが「選択の麻痺」に置き換わるだけになる。
  const next = useMemo(() => {
    if (!n) return null;
    const others = site.notes.filter((x) => x.slug !== n.slug);
    const sameTag = others
      .filter((x) => x.kind === 'knowledge' && x.tags?.some((t) => n.tags?.includes(t)))
      .filter((x) => !effectiveSrs(x, shadow)?.last)
      .sort((a, b) => (effectiveNext(a, shadow) || '') .localeCompare(effectiveNext(b, shadow) || ''));
    if (sameTag.length) return sameTag[0];
    const mine = new Set((graph.backlinks.get(`/note/${n.slug}`) || []).map((b) => b.route));
    const shared = others.find((x) =>
      (graph.backlinks.get(`/note/${x.slug}`) || []).some((b) => mine.has(b.route)));
    if (shared) return shared;
    const bundle = graph.bundles.find((b) => b.items.some((i) => i.node.route === `/note/${n.slug}`));
    if (bundle) {
      const i = bundle.items.findIndex((x) => x.node.route === `/note/${n.slug}`);
      const nb = bundle.items[i + 1] || bundle.items[i - 1];
      if (nb && nb.node.type === 'note') return idx.notes.get(nb.node.slug);
    }
    return null;
  }, [n, site, graph, shadow, idx]);

  if (!n) return <NotFound what="記事" />;

  const srs = effectiveSrs(n, shadow);
  const judge = (ok) => {
    const r = recordVerdict(n, ok, memo.trim().length > 0, shadow);
    setJudged({ ok, next: r.next });
    setTimeout(() => refresh?.(), 600);
  };

  return (
    <>
      <AppBar title={n.title} />
      <Page maxW="680px">
        <HStack justify="space-between" align="start" gap="3" mb="4">
          <TagChips tags={n.tags} />
          {srs?.last && (
            <Text fontSize="11px" color={C.faint} flexShrink="0" mt="1">
              最後に読んだ {relDay(srs.last, today)}
            </Text>
          )}
        </HStack>

        <Md text={n.body} />

        <Backlinks route={`/note/${n.slug}`} title={n.title} />

        {n.kind === 'knowledge' && (
          <Box mt="7">
            <Slot>想起</Slot>
            <Card soft>
              {judged ? (
                <HStack justify="space-between">
                  <Text fontSize="sm" color={judged.ok ? C.green : C.amber} fontWeight="700">
                    {judged.ok ? '✓ わかった' : '△ あやしい'}
                  </Text>
                  <Text fontSize="xs" color={C.faint}>次は {judged.next}</Text>
                </HStack>
              ) : (
                <>
                  <Text fontSize="sm" color={C.ink} lineHeight="1.8">
                    {n.recall || 'この記事の要点を、自分の言葉で説明できる？'}
                  </Text>
                  <Textarea mt="3" value={memo} onChange={(e) => setMemo(e.target.value)} rows={2} fontSize="13px"
                    placeholder="思い出せる範囲で一言（任意）"
                    color={C.ink} bg="rgba(255,255,255,.04)" border="1px solid" borderColor={C.line}
                    borderRadius="12px" _placeholder={{ color: C.faint, fontSize: '11px' }}
                    _focus={{ borderColor: C.sky, outline: 'none' }} />
                  <HStack gap="2" mt="3">
                    <Button flex="1" size="sm" borderRadius="12px" fontWeight="700" color="#08111f"
                      bg={ACCENT_GRADIENT} _hover={{ opacity: 0.92 }} onClick={() => judge(true)}>わかった</Button>
                    <Button flex="1" size="sm" borderRadius="12px" fontWeight="600" color={C.muted}
                      bg="transparent" border="1px solid" borderColor={C.line}
                      _hover={{ color: C.ink }} onClick={() => judge(false)}>あやしい</Button>
                  </HStack>
                </>
              )}
            </Card>
          </Box>
        )}

        {next && (
          <Box mt="7">
            <Slot>次の1枚</Slot>
            <Card onClick={() => navigate(`/note/${next.slug}`)}>
              <Text fontSize="sm" color={C.ink} fontWeight="700" lineHeight="1.55">{next.title}</Text>
              <Text fontSize="11px" color={C.faint} mt="1.5">
                {next.tags?.map(tagLabel).join(' · ')}
              </Text>
            </Card>
          </Box>
        )}
      </Page>
    </>
  );
}

// ---------------- 定点 ----------------
function SeriesBlock({ follow }) {
  const usable = (follow.series || []).filter((s) => s.points.length >= 2);
  const single = (follow.series || []).filter((s) => s.points.length === 1);

  if (!usable.length) {
    // グラフが描けない観測を空白のまま放置しない。空状態を導線に変える。
    const prompt = `/mn-follow ${follow.title} の観測をもう1回記録したい。前回との比較を出せるようにしたいので、同じ条件で計測した結果を記録して。`;
    return (
      <Card soft>
        <Text fontSize="sm" color={C.ink} fontWeight="600">
          {single.length || follow.sessions.length ? 'まだ1回しか観測がない' : 'まだ観測がない'}
        </Text>
        <Text fontSize="xs" color={C.muted} mt="1.5" lineHeight="1.7">
          もう1回記録すると、前回との推移が出る。
        </Text>
        <Box mt="3"><CopyButton text={prompt}>観測を依頼</CopyButton></Box>
      </Card>
    );
  }

  return (
    <VStack align="stretch" gap="4">
      {usable.map((s) => (
        <Card key={s.key}>
          <HStack justify="space-between" align="baseline" mb="1.5">
            <Text fontSize="xs" color={C.muted}>{s.key}</Text>
            <Delta points={s.points} goal={s.goal} />
          </HStack>
          <Sparkline points={s.points} height={52} goal={s.goal} />
          <HStack justify="space-between" mt="1">
            <Text fontSize="10px" color={C.faint}>{s.points[0].date}</Text>
            <Text fontSize="10px" color={C.faint}>{s.points[s.points.length - 1].date}</Text>
          </HStack>
        </Card>
      ))}
    </VStack>
  );
}

function Sessions({ follow }) {
  const [open, setOpen] = useState(null);
  if (!follow.sessions?.length) return <Text fontSize="sm" color={C.muted}>まだ観測記録がないのだ</Text>;
  return (
    <VStack align="stretch" gap="2">
      {follow.sessions.map((s) => {
        const on = open === s.date;
        return (
          <Box key={s.date} className="glass-soft" borderRadius="14px" overflow="hidden">
            <Flex as="button" w="100%" textAlign="left" className="press" px="4" py="3"
              align="start" justify="space-between" gap="3" onClick={() => setOpen(on ? null : s.date)}>
              <Box minW="0">
                <Text fontSize="xs" color={C.sky} fontWeight="700">{s.date}</Text>
                {s.summary && <Text fontSize="sm" color={C.ink} mt="1" lineHeight="1.6">{s.summary}</Text>}
              </Box>
              <Text fontSize="sm" color={C.faint} flexShrink="0">{on ? '▴' : '▾'}</Text>
            </Flex>
            {on && <Box px="4" pb="4" borderTop={`1px solid ${C.line}`} pt="3"><Md text={s.body} /></Box>}
          </Box>
        );
      })}
    </VStack>
  );
}

export function Follow() {
  const navigate = useNavigate();
  const { site, idx } = useData();
  const { name } = useParams();
  const follow = idx.follows.get(name);
  const today = todayISO();
  if (!follow) return <NotFound what="定点" />;

  const isInterest = follow.followType === 'interest';
  const nm = follow.nextMatches?.[0];
  const days = nm?.date ? -daysBetween(today, nm.date) : null;
  const relatedNotes = site.notes.filter((n) => n.tags?.some((t) => follow.tags?.includes(t)));

  return (
    <>
      <AppBar title={follow.title}
        subtitle={follow.coach ? `監督: ${follow.coach}${follow.formation ? ` · ${follow.formation}` : ''}` : follow.goal} />
      <Page>
        <VStack align="stretch" gap="6">

          {nm && days != null && days >= 0 && (
            <Box className="glass" p="4" borderRadius="20px" style={{ borderTop: `2px solid ${C.violet}` }}>
              <Text fontSize="10px" fontWeight="800" letterSpacing="0.12em" color={C.violet} mb="2">
                次戦 · あと{days}日
              </Text>
              <Heading size="sm" color={C.ink}>vs {nm.opponent}</Heading>
              <Text fontSize="xs" color={C.muted} mt="1">
                {nm.competition}{nm.home === false ? ' · アウェイ' : nm.home ? ' · ホーム' : ''}
              </Text>
              <Box mt="3">
                <CopyButton tone="amber" text={`/mn-brief ${follow.name} の次戦（vs ${nm.opponent}）の見どころをまとめて。蓄積している知識・選手ドシエ・直近の観測を横断して、予習ブリーフィングを作って。`}>
                  予習を頼む
                </CopyButton>
              </Box>
            </Box>
          )}

          {follow.snapshot?.length > 0 && (
            <Card>
              <VStack align="stretch" gap="2">
                {follow.snapshot.map((s, i) => (
                  <HStack key={i} align="start" gap="2.5">
                    <Box mt="2" w="5px" h="5px" borderRadius="full" bg={C.sky} flexShrink="0" />
                    <Text fontSize="sm" color={C.ink} opacity="0.88" lineHeight="1.7">{s}</Text>
                  </HStack>
                ))}
              </VStack>
            </Card>
          )}

          {!isInterest && (
            <>
              <Box>
                <Slot>推移</Slot>
                <SeriesBlock follow={follow} />
              </Box>

              {follow.focus?.length > 0 && (
                <Box>
                  <Slot>重点課題</Slot>
                  <VStack align="stretch" gap="2.5">
                    {follow.focus.map((f, i) => (
                      <Card key={i}>
                        <HStack justify="space-between" align="start" gap="2" mb={f.note ? '1.5' : '0'}>
                          <HStack gap="2" align="center">
                            <Flex w="20px" h="20px" borderRadius="full" align="center" justify="center" flexShrink="0"
                              fontSize="11px" fontWeight="800" color="#08111f" bg={ACCENT_GRADIENT}>{i + 1}</Flex>
                            <Text fontWeight="700" fontSize="sm" color={C.ink}>{f.title}</Text>
                          </HStack>
                          {f.priority && <Chip color={C.pink}>最優先</Chip>}
                        </HStack>
                        {f.note && <Text fontSize="xs" color={C.muted} lineHeight="1.7" pl="7">{f.note}</Text>}
                      </Card>
                    ))}
                  </VStack>
                </Box>
              )}
            </>
          )}

          {isInterest && follow.entities.length > 0 && (
            <Box>
              <Slot count={follow.entities.length}>スカッド</Slot>
              <VStack align="stretch" gap="4">
                {GROUP_ORDER.map((g) => {
                  const members = follow.entities.filter((e) => e.group === g);
                  if (!members.length) return null;
                  return (
                    <Box key={g}>
                      <HStack mb="2"><Chip color={GROUP[g].color}>{GROUP[g].label}</Chip>
                        <Text fontSize="xs" color={C.faint}>{members.length}</Text></HStack>
                      <SimpleGrid columns={2} gap="3">
                        {members.map((e) => (
                          <Card key={e.slug} onClick={() => navigate(`/follow/${name}/player/${e.slug}`)}>
                            <HStack justify="space-between" align="start" mb="1">
                              <Text fontWeight="700" fontSize="sm" color={C.ink}>{e.title.replace(/（.*$/, '')}</Text>
                              {e.deepDive && <Text fontSize="11px" color={C.violet}>★</Text>}
                            </HStack>
                            <Text fontSize="xs" color={C.muted} lineHeight="1.4">{e.role}</Text>
                            <Text fontSize="xs" color={C.faint} mt="1">{e.club}</Text>
                            {e.status === 'injured' && <Box mt="2"><Chip color={C.pink}>負傷</Chip></Box>}
                          </Card>
                        ))}
                      </SimpleGrid>
                    </Box>
                  );
                })}
              </VStack>
            </Box>
          )}

          {isInterest && follow.nextMatches?.length > 1 && (
            <Box>
              <Slot>日程</Slot>
              <VStack align="stretch" gap="2">
                {follow.nextMatches.slice(1).map((m, i) => (
                  <Card key={i}>
                    <Text fontSize="sm" fontWeight="600" color={C.ink}>{m.date} vs {m.opponent}</Text>
                    <Text fontSize="xs" color={C.muted} mt="0.5">{m.competition}</Text>
                  </Card>
                ))}
              </VStack>
            </Box>
          )}

          {isInterest && follow.rivals?.length > 0 && (
            <Box>
              <Slot>ライバル</Slot>
              <VStack align="stretch" gap="2">
                {follow.rivals.map((r, i) => (
                  <Card key={i}>
                    <Text fontSize="sm" fontWeight="600" color={C.ink}>{r.name}</Text>
                    <Text fontSize="xs" color={C.muted} mt="0.5" lineHeight="1.6">{r.note}</Text>
                  </Card>
                ))}
              </VStack>
            </Box>
          )}

          <Box>
            <Slot count={follow.sessions.length}>観測</Slot>
            <Sessions follow={follow} />
          </Box>

          {relatedNotes.length > 0 && (
            <Box>
              <Slot count={relatedNotes.length}>この対象の知識</Slot>
              <VStack align="stretch" gap="2">
                {relatedNotes.map((n) => (
                  <Card key={n.slug} onClick={() => navigate(`/note/${n.slug}`)}>
                    <Text fontSize="sm" color={C.ink} fontWeight="600" lineHeight="1.5">{n.title}</Text>
                  </Card>
                ))}
              </VStack>
            </Box>
          )}

          {follow.body && (
            <Box>
              <Slot>前提と経緯</Slot>
              <Md text={follow.body} />
            </Box>
          )}

          <Backlinks route={`/follow/${follow.name}`} title={follow.title} />
        </VStack>
      </Page>
    </>
  );
}

// ---------------- 人物ドシエ ----------------
export function Player() {
  const { idx } = useData();
  const { name, slug } = useParams();
  const follow = idx.follows.get(name);
  const e = follow?.entities.find((x) => x.slug === slug);
  useEffect(() => { if (e) markSeen(`/follow/${name}/player/${slug}`, e.title); }, [e, name, slug]);
  if (!e) return <NotFound what="人物" />;

  return (
    <>
      <AppBar title={e.title} subtitle={e.role} />
      <Page maxW="680px">
        <HStack mb="5" gap="2" wrap="wrap">
          <Chip color={GROUP[e.group]?.color || C.muted}>{e.group}</Chip>
          <Chip color={statusColor(e.status)}>{e.status}</Chip>
          {e.deepDive && <Chip color={C.violet}>★ 深掘り</Chip>}
          <Text fontSize="sm" color={C.muted}>{e.club}{e.number ? ` · #${e.number}` : ''}</Text>
        </HStack>

        {e.strengths?.length > 0 && (
          <Box mb="5"><Slot>強み</Slot><Chips items={e.strengths} color={C.green} /></Box>
        )}
        {e.developing?.length > 0 && (
          <Box mb="5"><Slot>強化中 / 弱み</Slot><Chips items={e.developing} color={C.amber} /></Box>
        )}

        {e.clips?.length > 0 && (
          <Box mb="5">
            <Slot>参考クリップ</Slot>
            <VStack align="stretch" gap="2">
              {e.clips.map((c, i) => (
                <a key={i} href={clipHref(c)} target="_blank" rel="noreferrer"
                  style={{ color: C.sky, textDecoration: 'none', borderBottom: `1px solid ${C.sky}55`, alignSelf: 'start' }}>
                  ▶ {c.title}
                </a>
              ))}
            </VStack>
          </Box>
        )}

        {e.changelog?.length > 0 && (
          <Box mb="5">
            <Slot>直近フォーム・変化</Slot>
            <VStack align="stretch" gap="2">
              {e.changelog.map((c, i) => (
                <Text key={i} fontSize="sm" color={C.ink} lineHeight="1.7">
                  <b style={{ color: C.sky }}>{c.date}</b> — {c.note}
                </Text>
              ))}
            </VStack>
          </Box>
        )}

        {e.body && <Box mt="6"><Md text={e.body} /></Box>}

        <Backlinks route={`/follow/${name}/player/${slug}`} title={e.title} />
      </Page>
    </>
  );
}
