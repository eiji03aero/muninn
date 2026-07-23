import { useState } from 'react';
import { Box, Flex, HStack, VStack, SimpleGrid, Heading, Text, Button, Input } from '@chakra-ui/react';
import { useNavigate, useParams } from 'react-router-dom';
import { useData } from './lib/ctx.js';
import { AppBar, Chip, Chips, DueBadge, Card, Center, Md } from './ui.jsx';
import { C, ACCENT_GRADIENT, GROUP, GROUP_ORDER } from './theme.js';

function Page({ children }) {
  return (
    <Box maxW="720px" mx="auto" px="4" py="4" style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}>
      {children}
    </Box>
  );
}
function Section({ title, children }) {
  return (
    <Box mb="6">
      {title && <Heading size="sm" mb="2.5" color={C.muted} letterSpacing="0.02em">{title}</Heading>}
      {children}
    </Box>
  );
}
function NotFound({ what }) {
  const navigate = useNavigate();
  return <Center><Text color={C.muted}>{what} が見つからないのだ</Text><Button colorPalette="blue" onClick={() => navigate('/')}>ホームへ</Button></Center>;
}
function TabRow({ tabs, tab, setTab }) {
  return (
    <Flex wrap="wrap" gap="2" my="4">
      {tabs.map((t) => {
        const on = tab === t.id;
        return (
          <Button key={t.id} size="sm" borderRadius="full" fontWeight="600" onClick={() => setTab(t.id)}
            color={on ? '#08111f' : C.muted} bg={on ? ACCENT_GRADIENT : 'transparent'}
            border="1px solid" borderColor={on ? 'transparent' : C.line}
            _hover={{ color: on ? '#08111f' : C.ink, bg: on ? ACCENT_GRADIENT : 'rgba(255,255,255,.05)' }}>
            {t.label}
          </Button>
        );
      })}
    </Flex>
  );
}
const Star = () => <span style={{ color: C.violet, textShadow: '0 0 10px rgba(183,155,255,.8)', fontSize: '12px' }}>★</span>;
const ftColor = (t) => (t === 'interest' ? C.violet : C.sky);
const statusColor = (s) => (s === 'injured' ? C.pink : s === 'inactive' ? C.faint : C.green);
const clipHref = (c) => (c.url ? c.url : `https://www.youtube.com/results?search_query=${encodeURIComponent(c.query || c.title || '')}`);

// ---------------- Home ----------------
export function Home() {
  const { site } = useData();
  const navigate = useNavigate();
  const dueCount = site.notes.filter((n) => n.due).length;
  const kCount = site.notes.filter((n) => n.kind === 'knowledge').length;
  const iCount = site.notes.filter((n) => n.kind === 'insight').length;
  return (
    <>
      <AppBar title="muninn" subtitle={`個人ナレッジベース · ${site.generatedAt} 時点`} back={false} />
      <Page>
        <Section title="フォロー">
          <VStack align="stretch" gap="3">
            {site.follows.map((f) => (
              <Card key={f.name} onClick={() => navigate(`/follow/${f.name}`)}>
                <Flex justify="space-between" align="start" gap="3">
                  <Box>
                    <Heading size="sm" mb="1" color={C.ink}>{f.title}</Heading>
                    <Text fontSize="sm" color={C.muted}>{f.coach ? `監督: ${f.coach}` : f.goal}</Text>
                  </Box>
                  <VStack align="end" gap="1.5" flexShrink="0">
                    <Chip color={ftColor(f.followType)}>{f.followType}</Chip>
                    <Text fontSize="xs" color={C.faint}>{f.entities.length ? `選手 ${f.entities.length}` : `観測 ${f.sessions.length}`}</Text>
                  </VStack>
                </Flex>
              </Card>
            ))}
          </VStack>
        </Section>

        <Section title="ノート / 蘊蓄">
          <Card onClick={() => navigate('/notes')}>
            <Flex justify="space-between" align="center">
              <Box>
                <Text fontWeight="600" color={C.ink}>全ノートを見る</Text>
                <Text fontSize="sm" color={C.muted}>knowledge {kCount} · insight {iCount}</Text>
              </Box>
              {dueCount > 0 && <DueBadge />}
            </Flex>
          </Card>
          <Flex wrap="wrap" gap="2" mt="3">
            {site.mocs.map((m) => (
              <Button key={m.slug} size="xs" variant="outline" borderRadius="full" color={C.muted}
                borderColor={C.line} _hover={{ color: C.ink, bg: 'rgba(255,255,255,.05)' }}
                onClick={() => navigate(`/moc/${m.slug}`)}>
                {m.title.replace(/\s*—.*$/, '').replace(/（.*?）/, '')}
              </Button>
            ))}
          </Flex>
        </Section>
      </Page>
    </>
  );
}

// ---------------- Follow ----------------
export function Follow() {
  const { site, idx } = useData();
  const navigate = useNavigate();
  const { name } = useParams();
  const follow = idx.follows.get(name);
  const [tab, setTab] = useState('squad');
  if (!follow) return <NotFound what="フォロー" />;

  const isInterest = follow.followType === 'interest' && follow.entities.length > 0;
  const relatedNotes = site.notes.filter((n) => n.tags?.some((t) => follow.tags?.includes(t)));
  const nm = follow.nextMatches?.[0];
  const days = nm ? Math.ceil((new Date(nm.date) - new Date(site.generatedAt)) / 86400000) : null;
  const tabs = [
    { id: 'squad', label: 'スカッド' }, { id: 'schedule', label: '日程' },
    { id: 'trivia', label: '蘊蓄' }, { id: 'timeline', label: 'タイムライン' }, { id: 'overview', label: '概要' },
  ];

  return (
    <>
      <AppBar title={follow.title} subtitle={follow.coach ? `監督: ${follow.coach} · ${follow.formation || ''}` : follow.goal} />
      <Page>
        {follow.snapshot?.length > 0 && (
          <Card>
            <VStack align="stretch" gap="2">
              {follow.snapshot.map((s, i) => (
                <HStack key={i} align="start" gap="2.5">
                  <Box mt="2" w="5px" h="5px" borderRadius="full" bg={C.sky} flexShrink="0" />
                  <Text fontSize="sm" color={C.ink} opacity="0.86">{s}</Text>
                </HStack>
              ))}
              {nm && (
                <Text fontSize="sm" color={C.violet} fontWeight="600" mt="1">
                  次戦: vs {nm.opponent}（{nm.competition}）{days != null ? ` — あと${days}日` : ''}
                </Text>
              )}
            </VStack>
          </Card>
        )}

        {isInterest ? (
          <>
            <TabRow tabs={tabs} tab={tab} setTab={setTab} />

            {tab === 'squad' && (
              <VStack align="stretch" gap="5">
                {GROUP_ORDER.map((g) => {
                  const members = follow.entities.filter((e) => e.group === g);
                  if (!members.length) return null;
                  return (
                    <Box key={g}>
                      <HStack mb="2.5">
                        <Chip color={GROUP[g].color}>{GROUP[g].label}</Chip>
                        <Text fontSize="xs" color={C.faint}>{members.length}</Text>
                      </HStack>
                      <SimpleGrid columns={2} gap="3">
                        {members.map((e) => (
                          <Card key={e.slug} onClick={() => navigate(`/follow/${name}/player/${e.slug}`)}>
                            <HStack justify="space-between" align="start" mb="1">
                              <Text fontWeight="700" fontSize="sm" color={C.ink}>{e.title.replace(/（.*$/, '')}</Text>
                              {e.deepDive && <Star />}
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
            )}

            {tab === 'schedule' && (
              <VStack align="stretch" gap="4">
                <Section title="次の試合">
                  {follow.nextMatches?.length ? (
                    follow.nextMatches.map((m, i) => (
                      <Card key={i}>
                        <Text fontWeight="600" color={C.ink}>{m.date} vs {m.opponent}</Text>
                        <Text fontSize="sm" color={C.muted}>{m.competition}{m.home === false ? ' · アウェイ' : m.home ? ' · ホーム' : ''}</Text>
                      </Card>
                    ))
                  ) : (
                    <Text fontSize="sm" color={C.muted}>未取得なのだ（`/mn-collect` で更新予定）</Text>
                  )}
                </Section>
                <Section title="ライバル">
                  <VStack align="stretch" gap="2">
                    {follow.rivals?.map((r, i) => (
                      <Card key={i}><Text fontWeight="600" color={C.ink}>{r.name}</Text><Text fontSize="sm" color={C.muted}>{r.note}</Text></Card>
                    ))}
                  </VStack>
                </Section>
              </VStack>
            )}

            {tab === 'trivia' && (
              <VStack align="stretch" gap="3">
                {relatedNotes.map((n) => (
                  <Card key={n.slug} onClick={() => navigate(`/note/${n.slug}`)}>
                    <HStack justify="space-between" align="start" mb="2">
                      <Text fontWeight="600" fontSize="sm" color={C.ink}>{n.title}</Text>
                      {n.due && <DueBadge />}
                    </HStack>
                    <Chip color={n.kind === 'knowledge' ? C.sky : C.muted}>{n.kind}</Chip>
                  </Card>
                ))}
              </VStack>
            )}

            {tab === 'timeline' && <Timeline follow={follow} />}
            {tab === 'overview' && <Md text={follow.body} />}
          </>
        ) : (
          <>
            <Section title="概要"><Md text={follow.body} /></Section>
            <Section title="タイムライン"><Timeline follow={follow} /></Section>
          </>
        )}
      </Page>
    </>
  );
}

function Timeline({ follow }) {
  if (!follow.sessions?.length) return <Text fontSize="sm" color={C.muted}>まだ観測記録がないのだ</Text>;
  return (
    <VStack align="stretch" gap="4">
      {follow.sessions.map((s) => (
        <Box key={s.date} borderLeftWidth="2px" borderColor={C.line} pl="3">
          <Heading size="xs" color={C.sky} mb="1">{s.date}</Heading>
          <Md text={s.body} />
        </Box>
      ))}
    </VStack>
  );
}

// ---------------- Player ----------------
export function Player() {
  const { idx } = useData();
  const { name, slug } = useParams();
  const follow = idx.follows.get(name);
  const e = follow?.entities.find((x) => x.slug === slug);
  if (!e) return <NotFound what="選手" />;
  return (
    <>
      <AppBar title={e.title} subtitle={e.role} />
      <Page>
        <HStack mb="4" gap="2" wrap="wrap">
          <Chip color={GROUP[e.group]?.color || C.muted}>{e.group}</Chip>
          <Chip color={statusColor(e.status)}>{e.status}</Chip>
          {e.deepDive && <Chip color={C.violet}>★ 深掘り</Chip>}
          <Text fontSize="sm" color={C.muted}>{e.club}{e.number ? ` · #${e.number}` : ''}</Text>
        </HStack>

        {e.strengths?.length > 0 && <Section title="強み"><Chips items={e.strengths} color={C.green} /></Section>}
        {e.developing?.length > 0 && <Section title="強化中 / 弱み"><Chips items={e.developing} color={C.amber} /></Section>}

        {e.clips?.length > 0 && (
          <Section title="参考クリップ">
            <VStack align="stretch" gap="2">
              {e.clips.map((c, i) => (
                <a key={i} href={clipHref(c)} target="_blank" rel="noreferrer"
                  style={{ color: C.sky, textDecoration: 'none', borderBottom: `1px solid ${C.sky}55`, alignSelf: 'start' }}>
                  ▶ {c.title}
                </a>
              ))}
            </VStack>
          </Section>
        )}

        {e.changelog?.length > 0 && (
          <Section title="直近フォーム・変化">
            <VStack align="stretch" gap="2">
              {e.changelog.map((c, i) => (
                <Text key={i} fontSize="sm" color={C.ink}>
                  <b style={{ color: C.sky }}>{c.date}</b> — {c.note}
                </Text>
              ))}
            </VStack>
          </Section>
        )}

        <Box mt="6"><Md text={e.body} /></Box>
      </Page>
    </>
  );
}

// ---------------- Note ----------------
export function Note() {
  const { idx } = useData();
  const { slug } = useParams();
  const n = idx.notes.get(slug);
  if (!n) return <NotFound what="ノート" />;
  return (
    <>
      <AppBar title={n.title} />
      <Page>
        <HStack mb="3" gap="2" wrap="wrap">
          <Chip color={n.kind === 'knowledge' ? C.sky : C.muted}>{n.kind}</Chip>
          {n.due && <DueBadge />}
          {n.srs?.next && <Text fontSize="xs" color={C.faint}>next {n.srs.next}</Text>}
        </HStack>
        {n.tags?.length > 0 && <Box mb="4"><Chips items={n.tags} color={C.sky} /></Box>}
        <Md text={n.body} />
      </Page>
    </>
  );
}

// ---------------- NotesIndex ----------------
export function NotesIndex() {
  const { site } = useData();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const dueCount = site.notes.filter((n) => n.due).length;
  const list = site.notes
    .filter((n) => !q || n.title.toLowerCase().includes(q.toLowerCase()) || n.tags?.some((t) => t.includes(q)))
    .sort((a, b) => (a.due === b.due ? a.title.localeCompare(b.title) : a.due ? -1 : 1));
  return (
    <>
      <AppBar title="ノート / 蘊蓄" subtitle={`${site.notes.length}件 · 復習期限 ${dueCount}`} />
      <Page>
        <Input placeholder="タイトル・タグで検索" value={q} onChange={(e) => setQ(e.target.value)}
          color={C.ink} bg="rgba(255,255,255,.05)" border="1px solid" borderColor={C.line} borderRadius="14px"
          _placeholder={{ color: C.faint }} _focus={{ borderColor: C.sky, outline: 'none' }} mb="3" />
        <Flex wrap="wrap" gap="2" mb="4">
          {site.mocs.map((m) => (
            <Button key={m.slug} size="xs" variant="outline" borderRadius="full" color={C.muted}
              borderColor={C.line} _hover={{ color: C.ink, bg: 'rgba(255,255,255,.05)' }}
              onClick={() => navigate(`/moc/${m.slug}`)}>
              {m.title.replace(/\s*—.*$/, '').replace(/（.*?）/, '')}
            </Button>
          ))}
        </Flex>
        <VStack align="stretch" gap="2">
          {list.map((n) => (
            <Card key={n.slug} onClick={() => navigate(`/note/${n.slug}`)}>
              <HStack justify="space-between" align="start">
                <Text fontWeight="600" fontSize="sm" color={C.ink}>{n.title}</Text>
                <HStack gap="1.5" flexShrink="0">
                  {n.due && <DueBadge />}
                  <Chip color={n.kind === 'knowledge' ? C.sky : C.muted}>{n.kind}</Chip>
                </HStack>
              </HStack>
            </Card>
          ))}
        </VStack>
      </Page>
    </>
  );
}

// ---------------- Moc ----------------
export function Moc() {
  const { idx } = useData();
  const { slug } = useParams();
  const m = idx.mocs.get(slug);
  if (!m) return <NotFound what="MOC" />;
  return (
    <>
      <AppBar title={m.title} />
      <Page><Md text={m.body} /></Page>
    </>
  );
}
