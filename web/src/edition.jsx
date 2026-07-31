import { useMemo, useState } from 'react';
import { Box, Flex, HStack, VStack, Heading, Text, Button, Textarea } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { useData } from './lib/ctx.js';
import { AppBar, Page, Slot, Card, Chip, CopyButton, Sparkline, Delta, relDay, Md } from './ui.jsx';
import { composeEdition, staleness } from './lib/edition.js';
import { recordVerdict, loadPending, todayISO, doneThisWeek, daysBetween } from './lib/recall.js';
import { cleanTitle, shortTitle, tagLabel, tagToParam, typeLabel } from './lib/graph.js';
import { C, ACCENT_GRADIENT, tint } from './theme.js';

// ---------------- 題字 ----------------
// 「更新 N日前」を出すのは、面が閲覧日で組まれている（＝押していなくても今日の面である）ことの表明。
function Masthead({ site, today }) {
  const stale = staleness(site.generatedAt, today);
  const d = new Date(`${today}T00:00:00`);
  const wd = '日月火水木金土'[d.getDay()];
  return (
    <Box className="glass-bar" position="sticky" top="0" zIndex="20" px="4" pt="3" pb="2.5"
      style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
      <Flex align="baseline" justify="space-between" gap="3">
        <Heading size="lg" color={C.ink} letterSpacing="0.34em" fontWeight="600" lineHeight="1">muninn</Heading>
        <Text fontSize="10px" color={C.faint} flexShrink="0">
          {stale === 0 ? '更新 今日' : `更新 ${stale}日前`}
        </Text>
      </Flex>
      <Text fontSize="11px" color={C.muted} mt="1.5">{today}（{wd}）</Text>
    </Box>
  );
}

// ---------------- リード ----------------
function Lead({ card }) {
  const navigate = useNavigate();
  if (!card) return null;

  // 中に個別リンク（特集の箇条書き）を持つカードは button にしない。入れ子ボタンは不正な DOM で、
  // クリック判定も壊れる。遷移先が1つに決まるカードだけを button にする。
  const Frame = ({ kicker, kickColor = C.amber, title, children, to }) => (
    <Box as={to ? 'button' : 'div'} w="100%" textAlign="left"
      className={`glass${to ? ' press' : ''}`} p="4" borderRadius="20px"
      onClick={to ? () => navigate(to) : undefined} cursor={to ? 'pointer' : 'default'}
      style={{ borderTop: `2px solid ${kickColor}` }}>
      <Text fontSize="10px" fontWeight="800" letterSpacing="0.12em" color={kickColor} mb="2">{kicker}</Text>
      <Heading size="sm" color={C.ink} lineHeight="1.5" letterSpacing="-0.01em">{title}</Heading>
      {children}
    </Box>
  );

  switch (card.type) {
    case 'speed':
      return (
        <Frame kicker={`速報 · ${relDay(card.node.updated, todayISO())}`} kickColor={C.green}
          title={card.node.short} to={card.node.route}>
          <Text fontSize="xs" color={C.faint} mt="2.5">{typeLabel(card.node.type)}</Text>
        </Frame>
      );
    case 'milestone': {
      const pts = card.series.points;
      return (
        <Frame kicker={`自己ベスト · ${card.point.date}`} kickColor={C.amber}
          title={`${card.series.key} ${card.point.value} — ${cleanTitle(card.follow.title)}`}
          to={`/follow/${card.follow.name}`}>
          <Box mt="3"><Sparkline points={pts} color={C.amber} goal={card.series.goal} /></Box>
        </Frame>
      );
    }
    case 'chapter-new':
      return (
        <Frame kicker="新章 · 未読" kickColor={C.violet} title={shortTitle(card.concept.title)}
          to={`/atlas/${card.atlas.slug}/concept/${card.concept.slug}`}>
          <Text fontSize="sm" color={C.muted} mt="2" lineHeight="1.7">{card.concept.gist}</Text>
        </Frame>
      );
    case 'brief':
      return (
        <Frame kicker={`予習 · あと${card.days}日`} kickColor={C.violet}
          title={`${cleanTitle(card.follow.title)} vs ${card.match.opponent}`}
          to={`/follow/${card.follow.name}`}>
          <VStack align="stretch" gap="1.5" mt="3">
            {(card.follow.snapshot || []).slice(0, 2).map((s, i) => (
              <Text key={i} fontSize="xs" color={C.muted} lineHeight="1.65">○ {s}</Text>
            ))}
          </VStack>
        </Frame>
      );
    case 'feature':
      return (
        <Frame kicker="特集" kickColor={C.sky} title={`${card.bundle.title} — ${card.bundle.items.length}本`}>
          <VStack align="stretch" gap="0" mt="3">
            {card.bundle.items.slice(0, 3).map((it) => (
              <Box as="button" key={it.node.route} textAlign="left" className="press" py="1.5"
                onClick={() => navigate(it.node.route)}>
                <Text fontSize="sm" color={C.sky} lineHeight="1.5">○ {it.label || it.node.short}</Text>
              </Box>
            ))}
            {card.bundle.items.length > 3 && (
              <Text fontSize="xs" color={C.faint} mt="1">＋{card.bundle.items.length - 3}本</Text>
            )}
          </VStack>
        </Frame>
      );
    case 'revival':
      return (
        <Frame kicker={`復刻 · ${card.ago}日ぶり`} kickColor={C.orange} title={card.note.title}
          to={`/note/${card.note.slug}`}>
          <Flex wrap="wrap" gap="1.5" mt="3">
            {(card.note.tags || []).map((t) => <Chip key={t} color={C.faint}>{tagLabel(t)}</Chip>)}
          </Flex>
        </Frame>
      );
    default:
      return null;
  }
}

// ---------------- 再読カード（伏せ記事） ----------------
// クイズUIではなく読み物として出す。muninn のタイトルは言い切り形＝答えそのものなので、
// タイトルを伏せて recall の問いだけを見せる。「クイズを始める」というモード切替が無いので
// 起動コストがゼロ——ここが、ターミナルを開いて /mn-review を打つ現状との決定的な差。
export function RecallCard({ note, index, total, onDone }) {
  const navigate = useNavigate();
  const { shadow } = useData();
  const [flipped, setFlipped] = useState(false);
  const [memo, setMemo] = useState('');
  const [done, setDone] = useState(null);

  const judge = (ok) => {
    const next = recordVerdict(note, ok, memo.trim().length > 0, shadow);
    setDone({ ok, next });
    setTimeout(() => onDone?.(), 900);
  };

  if (done) {
    return (
      <Card soft>
        <HStack justify="space-between">
          <Text fontSize="sm" color={done.ok ? C.green : C.amber} fontWeight="700">
            {done.ok ? '✓ わかった' : '△ あやしい'}
          </Text>
          <Text fontSize="xs" color={C.faint}>次は {done.next.next}</Text>
        </HStack>
      </Card>
    );
  }

  return (
    <Card>
      <HStack justify="space-between" align="center" mb="2.5">
        <Flex wrap="wrap" gap="1.5">
          {(note.tags || []).slice(0, 2).map((t) => <Chip key={t} color={C.sky}>{tagLabel(t)}</Chip>)}
        </Flex>
        {total > 1 && <Text fontSize="10px" color={C.faint} flexShrink="0">{index + 1}/{total}</Text>}
      </HStack>

      {!flipped ? (
        <>
          {note.recall ? (
            <Text fontSize="sm" color={C.ink} lineHeight="1.8">{note.recall}</Text>
          ) : (
            // recall 未設定のフォールバック。劣化するが壊れない。
            <>
              <Text fontSize="xs" color={C.faint} mb="1.5">{note.created} に書いた記事</Text>
              <Text fontSize="sm" color={C.ink} lineHeight="1.8">これ、何の話だったか？</Text>
            </>
          )}
          <Button mt="4" w="100%" size="sm" borderRadius="12px" fontWeight="700"
            color={C.ink} bg="transparent" border="1px solid" borderColor={C.line}
            _hover={{ bg: 'rgba(255,255,255,.06)' }} onClick={() => setFlipped(true)}>
            めくる
          </Button>
        </>
      ) : (
        <>
          <Heading size="sm" color={C.ink} lineHeight="1.55" mb="2">{note.title}</Heading>
          <Box maxH="260px" overflowY="auto" pr="1"><Md text={note.body} /></Box>

          <Box mt="4" pt="3.5" borderTop={`1px dashed ${C.line}`}>
            <Text fontSize="11px" color={C.faint} mb="1.5">思い出せる範囲で一言（任意）</Text>
            <Textarea value={memo} onChange={(e) => setMemo(e.target.value)} rows={2} fontSize="13px"
              placeholder="自分の言葉で書くと、わかった＝q5 として記録する"
              color={C.ink} bg="rgba(255,255,255,.04)" border="1px solid" borderColor={C.line}
              borderRadius="12px" _placeholder={{ color: C.faint, fontSize: '11px' }}
              _focus={{ borderColor: C.sky, outline: 'none' }} />
            <HStack gap="2" mt="3">
              <Button flex="1" size="sm" borderRadius="12px" fontWeight="700" color="#08111f"
                bg={ACCENT_GRADIENT} _hover={{ opacity: 0.92 }} onClick={() => judge(true)}>
                わかった
              </Button>
              <Button flex="1" size="sm" borderRadius="12px" fontWeight="600" color={C.muted}
                bg="transparent" border="1px solid" borderColor={C.line}
                _hover={{ color: C.ink }} onClick={() => judge(false)}>
                あやしい
              </Button>
            </HStack>
          </Box>

          <Button mt="2.5" size="xs" variant="ghost" color={C.faint} w="100%"
            _hover={{ color: C.ink, bg: 'transparent' }} onClick={() => navigate(`/note/${note.slug}`)}>
            記事を開く ›
          </Button>
        </>
      )}
    </Card>
  );
}

// ---------------- 面 ----------------
export function Edition() {
  const navigate = useNavigate();
  const { site, graph, shadow, reads, refresh } = useData();
  const today = todayISO();
  const pending = loadPending();

  const ed = useMemo(
    () => composeEdition({ site, graph, shadow, reads, pendingCount: pending.length, today }),
    [site, graph, shadow, reads, pending.length, today],
  );
  const week = doneThisWeek();

  return (
    <>
      <Masthead site={site} today={today} />
      <Page>
        <VStack align="stretch" gap="6">

          {ed.lead && <Box><Lead card={ed.lead} /></Box>}

          {ed.aside.length > 0 && (
            <VStack align="stretch" gap="2">
              {ed.aside.map((a, i) =>
                a.type === 'countdown' ? (
                  <Flex as="button" key={i} onClick={() => navigate(`/follow/${a.follow.name}`)}
                    className="glass-soft press" px="4" py="3" borderRadius="14px"
                    align="center" justify="space-between" w="100%" textAlign="left">
                    <Box minW="0">
                      <Text fontSize="10px" color={C.faint}>次戦 · {cleanTitle(a.follow.title)}</Text>
                      <Text fontSize="sm" color={C.ink} fontWeight="600" mt="0.5">vs {a.match.opponent}</Text>
                    </Box>
                    <Text fontSize="sm" color={C.violet} fontWeight="700" flexShrink="0">あと{a.days}日 ›</Text>
                  </Flex>
                ) : (
                  <Flex as="button" key={i} onClick={() => navigate('/desk')}
                    className="glass-soft press" px="4" py="3" borderRadius="14px"
                    align="center" justify="space-between" w="100%" textAlign="left">
                    <Text fontSize="sm" color={C.ink} fontWeight="600">未送信の伝票</Text>
                    <Text fontSize="sm" color={C.amber} fontWeight="700" flexShrink="0">{a.count}件 ›</Text>
                  </Flex>
                ),
              )}
            </VStack>
          )}

          <Box>
            <Slot action={week > 0 ? <Text fontSize="11px" color={C.green}>今週 {week}件</Text> : null}>
              今日の再読
            </Slot>
            {ed.recall.length === 0 ? (
              <Card soft><Text fontSize="sm" color={C.muted}>今日の再読はない</Text></Card>
            ) : (
              <VStack align="stretch" gap="3">
                {ed.recall.map((r, i) => (
                  <RecallCard key={r.note.slug} note={r.note} index={i} total={ed.recall.length} onDone={refresh} />
                ))}
              </VStack>
            )}
          </Box>

          {ed.chapter && (
            <Box>
              <Slot>連載</Slot>
              <Card onClick={() => navigate(`/atlas/${ed.chapter.atlas.slug}/concept/${ed.chapter.concept.slug}?route=${ed.chapter.route.id}`)}>
                <Text fontSize="xs" color={C.faint}>{cleanTitle(ed.chapter.atlas.title)} — {ed.chapter.route.label}</Text>
                <Text fontSize="sm" color={C.ink} fontWeight="700" mt="1" mb="3">
                  次の章：{shortTitle(ed.chapter.concept.title)}
                </Text>
                <Flex align="center" gap="2.5">
                  <Box flex="1" h="6px" borderRadius="full" bg="rgba(255,255,255,.08)" overflow="hidden">
                    <Box h="100%" borderRadius="full" bg={ACCENT_GRADIENT}
                      style={{ width: `${Math.round((ed.chapter.readCount / ed.chapter.total) * 100)}%` }} />
                  </Box>
                  <Text fontSize="xs" color={C.faint} flexShrink="0">
                    読了 {ed.chapter.readCount}/{ed.chapter.total}
                  </Text>
                </Flex>
              </Card>
            </Box>
          )}

          {ed.feature && (
            <Box>
              <Slot count={`${ed.feature.bundle.items.length}本`}>特集</Slot>
              <Card>
                <HStack justify="space-between" align="baseline" mb="2.5">
                  <Text fontSize="sm" color={C.ink} fontWeight="700">{ed.feature.bundle.title}</Text>
                  {ed.feature.bundle.tag && (
                    <Button size="xs" variant="ghost" color={C.faint} px="1" flexShrink="0"
                      _hover={{ color: C.ink, bg: 'transparent' }}
                      onClick={() => navigate(`/shelf/${tagToParam(ed.feature.bundle.tag)}`)}>棚へ ›</Button>
                  )}
                </HStack>
                <VStack align="stretch" gap="0">
                  {ed.feature.bundle.items.slice(0, 4).map((it) => (
                    <Box as="button" key={it.node.route} textAlign="left" className="press" py="1.5"
                      onClick={() => navigate(it.node.route)}>
                      <Text fontSize="sm" color={C.sky} lineHeight="1.5">○ {it.label || it.node.short}</Text>
                      {it.reason && <Text fontSize="11px" color={C.faint} lineHeight="1.5">{it.reason}</Text>}
                    </Box>
                  ))}
                </VStack>
                {ed.feature.bundle.items.length > 4 && (
                  <Text fontSize="xs" color={C.faint} mt="2">＋{ed.feature.bundle.items.length - 4}本</Text>
                )}
              </Card>
            </Box>
          )}

          {ed.records.length > 0 && (
            <Box>
              <Slot>記録</Slot>
              <VStack align="stretch" gap="3">
                {ed.records.map((r, i) =>
                  r.type === 'series' ? (
                    <Card key={i} onClick={() => navigate(`/follow/${r.follow.name}`)}>
                      <HStack justify="space-between" mb="2">
                        <Text fontSize="sm" color={C.ink} fontWeight="700">{cleanTitle(r.follow.title)}</Text>
                        <Text fontSize="10px" color={C.faint}>{r.follow.sessions[0]?.date}</Text>
                      </HStack>
                      <VStack align="stretch" gap="2.5">
                        {/* 良し悪しを判定できる指標（goal 宣言あり）を先に見せる */}
                        {r.follow.series
                          .filter((s) => s.points.length >= 2)
                          .sort((a, b) => (b.goal ? 1 : 0) - (a.goal ? 1 : 0))
                          .slice(0, 3).map((s) => (
                            <Box key={s.key}>
                              <HStack justify="space-between" align="baseline" mb="0.5">
                                <Text fontSize="11px" color={C.muted}>{s.key}</Text>
                                <Delta points={s.points} goal={s.goal} />
                              </HStack>
                              <Sparkline points={s.points} height={30} goal={s.goal} />
                            </Box>
                          ))}
                      </VStack>
                    </Card>
                  ) : (
                    <Card key={i} onClick={() => navigate(`/log/${r.topic.slug}`)}>
                      <Text fontSize="sm" color={C.ink} fontWeight="700">{r.topic.title}</Text>
                      <Text fontSize="xs" color={C.muted} mt="1">{r.topic.entries.length}件を比べる ›</Text>
                    </Card>
                  ),
                )}
              </VStack>
            </Box>
          )}

          <Box>
            <Slot>今号の在庫</Slot>
            <Flex as="button" onClick={() => navigate('/shelf')} className="glass-soft press"
              px="4" py="3" borderRadius="14px" align="center" justify="space-between" w="100%" textAlign="left">
              <Text fontSize="xs" color={C.muted} lineHeight="1.7">
                {ed.inventory.notes}記事 / {ed.inventory.concepts}章 / {ed.inventory.sessions}観測 / {ed.inventory.entries}記録
              </Text>
              <Text fontSize="sm" color={C.faint} flexShrink="0">棚 ›</Text>
            </Flex>
          </Box>

        </VStack>
      </Page>
    </>
  );
}
