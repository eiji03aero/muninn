import { useState } from 'react';
import { Box, Flex, HStack, VStack, SimpleGrid, Heading, Text, Badge, Button, Input } from '@chakra-ui/react';
import { useNavigate, useParams } from 'react-router-dom';
import { useData } from './lib/ctx.js';
import { AppBar, Chip, Chips, DueBadge, Card, Center, Md, GROUP, GROUP_ORDER } from './ui.jsx';

function Page({ children }) {
  return (
    <Box maxW="720px" mx="auto" px="4" py="4" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
      {children}
    </Box>
  );
}
function Section({ title, children }) {
  return (
    <Box mb="6">
      {title && <Heading size="sm" mb="2" color="gray.600">{title}</Heading>}
      {children}
    </Box>
  );
}
function NotFound({ what }) {
  const navigate = useNavigate();
  return <Center><Text>{what} が見つからないのだ</Text><Button onClick={() => navigate('/')}>ホームへ</Button></Center>;
}
const ftPalette = (t) => (t === 'interest' ? 'purple' : 'teal');
const statusPalette = (s) => (s === 'injured' ? 'red' : s === 'inactive' ? 'gray' : 'green');
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
            {site.follows.map((f) => {
              const count = f.entities.length ? `選手 ${f.entities.length}` : `観測 ${f.sessions.length}`;
              return (
                <Card key={f.name} onClick={() => navigate(`/follow/${f.name}`)}>
                  <Flex justify="space-between" align="start" gap="3">
                    <Box>
                      <Heading size="sm" mb="1">{f.title}</Heading>
                      <Text fontSize="sm" color="gray.500">{f.coach ? `監督: ${f.coach}` : f.goal}</Text>
                    </Box>
                    <VStack align="end" gap="1">
                      <Chip palette={ftPalette(f.followType)}>{f.followType}</Chip>
                      <Text fontSize="xs" color="gray.500">{count}</Text>
                    </VStack>
                  </Flex>
                </Card>
              );
            })}
          </VStack>
        </Section>

        <Section title="ノート / 蘊蓄">
          <Card onClick={() => navigate('/notes')}>
            <Flex justify="space-between" align="center">
              <Box>
                <Text fontWeight="600">全ノートを見る</Text>
                <Text fontSize="sm" color="gray.500">knowledge {kCount} · insight {iCount}</Text>
              </Box>
              {dueCount > 0 && <Badge colorPalette="red" borderRadius="full" px="2">復習 {dueCount}</Badge>}
            </Flex>
          </Card>
          <Flex wrap="wrap" gap="2" mt="3">
            {site.mocs.map((m) => (
              <Button key={m.slug} size="xs" variant="outline" borderRadius="full" onClick={() => navigate(`/moc/${m.slug}`)}>
                {m.title.replace(/ —.*$/, '').replace(/（.*?）/, '')}
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
    { id: 'squad', label: 'スカッド' },
    { id: 'schedule', label: '日程' },
    { id: 'trivia', label: '蘊蓄' },
    { id: 'timeline', label: 'タイムライン' },
    { id: 'overview', label: '概要' },
  ];

  return (
    <>
      <AppBar title={follow.title} subtitle={follow.coach ? `監督: ${follow.coach} · ${follow.formation || ''}` : follow.goal} />
      <Page>
        {follow.snapshot?.length > 0 && (
          <Card>
            <VStack align="stretch" gap="1.5">
              {follow.snapshot.map((s, i) => (
                <Text key={i} fontSize="sm">・{s}</Text>
              ))}
              {nm && (
                <Text fontSize="sm" color="purple.600" fontWeight="600" mt="1">
                  次戦: vs {nm.opponent}（{nm.competition}）{days != null ? ` — あと${days}日` : ''}
                </Text>
              )}
            </VStack>
          </Card>
        )}

        {isInterest ? (
          <>
            <Flex wrap="wrap" gap="2" my="4">
              {tabs.map((t) => (
                <Button key={t.id} size="sm" variant={tab === t.id ? 'solid' : 'outline'} onClick={() => setTab(t.id)}>
                  {t.label}
                </Button>
              ))}
            </Flex>

            {tab === 'squad' && (
              <VStack align="stretch" gap="5">
                {GROUP_ORDER.map((g) => {
                  const members = follow.entities.filter((e) => e.group === g);
                  if (!members.length) return null;
                  return (
                    <Box key={g}>
                      <HStack mb="2">
                        <Chip palette={GROUP[g].palette}>{GROUP[g].label}</Chip>
                        <Text fontSize="xs" color="gray.500">{members.length}</Text>
                      </HStack>
                      <SimpleGrid columns={2} gap="3">
                        {members.map((e) => (
                          <Card key={e.slug} onClick={() => navigate(`/follow/${name}/player/${e.slug}`)}>
                            <HStack justify="space-between" mb="1">
                              <Text fontWeight="700" fontSize="sm">{e.title.replace(/（.*$/, '')}</Text>
                              {e.deepDive && <Text fontSize="xs">⭐</Text>}
                            </HStack>
                            <Text fontSize="xs" color="gray.500" lineHeight="1.4">{e.role}</Text>
                            <Text fontSize="xs" color="gray.400" mt="1">{e.club}</Text>
                            {e.status === 'injured' && <Badge colorPalette="red" size="sm" mt="1">負傷</Badge>}
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
                        <Text fontWeight="600">{m.date} vs {m.opponent}</Text>
                        <Text fontSize="sm" color="gray.500">{m.competition}{m.home === false ? ' · アウェイ' : m.home ? ' · ホーム' : ''}</Text>
                      </Card>
                    ))
                  ) : (
                    <Text fontSize="sm" color="gray.500">未取得なのだ（`/mn-collect` で更新予定）</Text>
                  )}
                </Section>
                <Section title="ライバル">
                  <VStack align="stretch" gap="2">
                    {follow.rivals?.map((r, i) => (
                      <Card key={i}><Text fontWeight="600">{r.name}</Text><Text fontSize="sm" color="gray.500">{r.note}</Text></Card>
                    ))}
                  </VStack>
                </Section>
              </VStack>
            )}

            {tab === 'trivia' && (
              <VStack align="stretch" gap="3">
                {relatedNotes.map((n) => (
                  <Card key={n.slug} onClick={() => navigate(`/note/${n.slug}`)}>
                    <HStack justify="space-between">
                      <Text fontWeight="600" fontSize="sm">{n.title}</Text>
                      {n.due && <DueBadge />}
                    </HStack>
                    <Chip palette={n.kind === 'knowledge' ? 'blue' : 'gray'}>{n.kind}</Chip>
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
  if (!follow.sessions?.length) return <Text fontSize="sm" color="gray.500">まだ観測記録がないのだ</Text>;
  return (
    <VStack align="stretch" gap="4">
      {follow.sessions.map((s) => (
        <Box key={s.date} borderLeftWidth="3px" borderColor="gray.200" pl="3">
          <Heading size="xs" color="gray.600" mb="1">{s.date}</Heading>
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
        <HStack mb="3" gap="2" wrap="wrap">
          <Chip palette={GROUP[e.group]?.palette || 'gray'}>{e.group}</Chip>
          <Chip palette={statusPalette(e.status)}>{e.status}</Chip>
          {e.deepDive && <Chip palette="yellow">⭐ 深掘り</Chip>}
          <Text fontSize="sm" color="gray.500">{e.club}{e.number ? ` · #${e.number}` : ''}</Text>
        </HStack>

        {e.strengths?.length > 0 && <Section title="強み"><Chips items={e.strengths} palette="green" /></Section>}
        {e.developing?.length > 0 && <Section title="強化中 / 弱み"><Chips items={e.developing} palette="orange" /></Section>}

        {e.clips?.length > 0 && (
          <Section title="参考クリップ">
            <VStack align="stretch" gap="2">
              {e.clips.map((c, i) => (
                <a key={i} href={clipHref(c)} target="_blank" rel="noreferrer" style={{ color: '#2b6cb0', textDecoration: 'underline' }}>
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
                <Text key={i} fontSize="sm">
                  <b style={{ color: '#4a5568' }}>{c.date}</b> — {c.note}
                </Text>
              ))}
            </VStack>
          </Section>
        )}

        <Section title=""><Md text={e.body} /></Section>
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
          <Chip palette={n.kind === 'knowledge' ? 'blue' : 'gray'}>{n.kind}</Chip>
          {n.due && <DueBadge />}
          {n.srs?.next && <Text fontSize="xs" color="gray.500">next {n.srs.next}</Text>}
        </HStack>
        {n.tags?.length > 0 && <Box mb="3"><Chips items={n.tags} palette="cyan" /></Box>}
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
        <Input placeholder="タイトル・タグで検索" value={q} onChange={(e) => setQ(e.target.value)} mb="3" />
        <Flex wrap="wrap" gap="2" mb="4">
          {site.mocs.map((m) => (
            <Button key={m.slug} size="xs" variant="outline" borderRadius="full" onClick={() => navigate(`/moc/${m.slug}`)}>
              {m.title.replace(/ —.*$/, '').replace(/（.*?）/, '')}
            </Button>
          ))}
        </Flex>
        <VStack align="stretch" gap="2">
          {list.map((n) => (
            <Card key={n.slug} onClick={() => navigate(`/note/${n.slug}`)}>
              <HStack justify="space-between" align="start">
                <Text fontWeight="600" fontSize="sm">{n.title}</Text>
                <HStack gap="1">
                  {n.due && <DueBadge />}
                  <Chip palette={n.kind === 'knowledge' ? 'blue' : 'gray'}>{n.kind}</Chip>
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
