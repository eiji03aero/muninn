// 「作品」——お題・全ての稿・各稿の講評が1本に積まれた、muninn で唯一のアウトプット concern。
//
// **正本の順序（第1稿から時系列）で読ませない。** 正本がその順に積むのは推敲の軌跡が資産だからで、
// 読む順序としては別物になる——完成した作品を第1稿から読ませるのは、映画を撮影順に見せるのと同じ。
// だから status で組版を変える:
//   done      … 完成稿が先。推敲の記録は畳んで後ろ（作品として読める状態を既定にする）
//   drafting  … 最新稿と「次に直すところ」が1画面目。過去の稿は畳んで後ろ（次に書くための画面）
// 点は「前回の自分との差分」なので、合計の推移と軸ごとの推移を出す（絶対評価としては読ませない）。
import { useEffect, useState } from 'react';
import { Box, Flex, HStack, VStack, Text } from '@chakra-ui/react';
import { useParams } from 'react-router-dom';
import { useData } from '../../lib/ctx.js';
import { AppBar, Page, Slot, Card, Chip, TagChips, Backlinks, NotFound, Md, Sparkline, relDay } from './ui.jsx';
import { pieceStatus, latestRound } from '../../lib/groups.js';
import { splitPiece, axisSeries } from '../../lib/writings.js';
import { markSeen, todayISO } from '../../lib/recall.js';
import { C } from '../../shared/theme.js';

const TONE = { amber: C.amber, green: C.green, faint: C.faint };

// 折りたたみ。稿は「読みたいときだけ開く」ものなので、既定は閉じる。
function Fold({ title, meta, open, onToggle, children }) {
  return (
    <Box className="glass-soft" borderRadius="14px" overflow="hidden">
      <Flex as="button" w="100%" textAlign="left" className="press" px="4" py="3"
        align="center" justify="space-between" gap="3" onClick={onToggle}>
        <Box minW="0">
          <Text fontSize="sm" color={C.ink} fontWeight="700">{title}</Text>
          {meta && <Text fontSize="11px" color={C.faint} mt="0.5">{meta}</Text>}
        </Box>
        <Text fontSize="sm" color={C.faint} flexShrink="0">{open ? '▴' : '▾'}</Text>
      </Flex>
      {open && <Box px="4" pb="4" borderTop={`1px solid ${C.line}`} pt="3">{children}</Box>}
    </Box>
  );
}

function Drafts({ versions, rounds }) {
  const [open, setOpen] = useState(null);
  if (!versions.length) return null;
  return (
    <VStack align="stretch" gap="2">
      {[...versions].reverse().map((ver) => {
        const r = rounds.find((x) => x.v === ver.v);
        const on = open === ver.v;
        return (
          <Fold key={ver.v} open={on} onToggle={() => setOpen(on ? null : ver.v)}
            title={`第${ver.v}稿`}
            meta={[ver.date, r && typeof r.total === 'number' ? `${r.total}点` : null]
              .filter(Boolean).join(' · ')}>
            <Md text={ver.text} />
            {ver.critique && (
              <Box mt="4" pt="3" borderTop={`1px solid ${C.line}`}><Md text={ver.critique} /></Box>
            )}
          </Fold>
        );
      })}
    </VStack>
  );
}

// 次に直すところ（focus）。**1稿につき1つだけ**というのがこの仕組みの肝なので、目立つ場所に1枚で出す。
function Focus({ round }) {
  if (!round?.focus) return null;
  return (
    <Box className="glass" p="4" borderRadius="18px" style={{ borderTop: `2px solid ${C.amber}` }}>
      <Text fontSize="10px" fontWeight="800" letterSpacing="0.12em" color={C.amber} mb="2">
        次に直すところ · 第{round.v}稿の講評より
      </Text>
      <Text fontSize="sm" color={C.ink} lineHeight="1.8">{round.focus}</Text>
      {round.note && <Text fontSize="11px" color={C.faint} mt="2" lineHeight="1.6">※ {round.note}</Text>}
    </Box>
  );
}

function Scores({ piece, axes, max }) {
  const scored = piece.rounds.filter((r) => typeof r.total === 'number');
  if (!scored.length) return null;
  const first = scored[0], last = scored[scored.length - 1];
  const totals = scored.filter((r) => r.date).map((r) => ({ date: r.date, value: r.total }));
  const series = axisSeries(piece, axes);

  return (
    <Card>
      <HStack justify="space-between" align="baseline" mb="1">
        <Text fontSize="11px" color={C.muted}>合計（{max}点満点）</Text>
        <Text fontSize="xs" fontWeight="700" color={last.total >= first.total ? C.green : C.amber}>
          {first.total} → {last.total}
        </Text>
      </HStack>
      {/* 点は高いほど良いのが自明な唯一の指標なので goal を宣言なしで up に固定してよい（原則9の例外） */}
      {totals.length >= 2 && <Box mb="4"><Sparkline points={totals} height={48} goal="up" /></Box>}

      <VStack align="stretch" gap="2.5">
        {series.map((s) => {
          const from = s.points[0].value, to = s.points[s.points.length - 1].value;
          const diff = to - from;
          return (
            <Flex key={s.key} align="center" gap="3">
              <Text fontSize="11px" color={C.muted} w="3.2em" flexShrink="0">{s.label}</Text>
              <Flex gap="1" flex="1" align="baseline">
                {s.points.map((p, i) => (
                  <Text key={i} fontSize="11px" color={i === s.points.length - 1 ? C.ink : C.faint}
                    fontWeight={i === s.points.length - 1 ? '800' : '500'}>
                    {p.value}{i < s.points.length - 1 && <Box as="span" color={C.faint}> ·</Box>}
                  </Text>
                ))}
              </Flex>
              <Text fontSize="11px" flexShrink="0"
                color={diff > 0 ? C.green : diff < 0 ? C.pink : C.faint}>
                {diff > 0 ? `+${diff}` : diff < 0 ? `${diff}` : '±0'}
              </Text>
            </Flex>
          );
        })}
      </VStack>
      <Text fontSize="11px" color={C.faint} mt="3" lineHeight="1.6">
        点は絶対評価ではなく、前回の自分との差分を見るためのもの。
      </Text>
    </Card>
  );
}

export function Piece() {
  const { site, idx } = useData();
  const { slug } = useParams();
  const [critique, setCritique] = useState(false);
  const piece = idx.pieces?.get(slug) || null;
  const today = todayISO();

  useEffect(() => { if (piece) markSeen(`/piece/${slug}`, piece.title); }, [piece, slug]);

  if (!piece) return <NotFound what="作品" />;

  const rubric = site.writings?.rubric;
  const axes = rubric?.axes || [];
  const max = (rubric?.max || 5) * (axes.length || 5);
  const status = pieceStatus(piece.status);
  const last = latestRound(piece);
  const doc = splitPiece(piece.body);
  const done = piece.status === 'done' && !!doc.final;
  const latestVersion = doc.versions.length ? doc.versions[doc.versions.length - 1] : null;
  const history = done ? doc.versions : doc.versions.slice(0, -1);
  const axisLabel = (key) => axes.find((a) => a.key === key)?.label || key;
  const promptText = doc.prompt || piece.prompt;

  return (
    <>
      <AppBar title={piece.title} subtitle={piece.form} />
      <Page maxW="680px">
        <HStack justify="space-between" align="start" gap="3" mb="4" wrap="wrap">
          <HStack gap="2" wrap="wrap">
            <Chip color={TONE[status.tone] || C.muted}>{status.label}</Chip>
            {last && <Chip color={C.sky}>{last.total}/{max}</Chip>}
            <Chip color={C.faint}>全{piece.rounds.length}稿</Chip>
            {piece.targetAxes?.length > 0 && (
              <Chip color={C.violet}>鍛える軸：{piece.targetAxes.map(axisLabel).join('・')}</Chip>
            )}
          </HStack>
          {piece.updated && (
            <Text fontSize="11px" color={C.faint} flexShrink="0" mt="1">
              最終更新 {relDay(piece.updated, today)}
            </Text>
          )}
        </HStack>
        <TagChips tags={piece.tags} />

        {/* 完成した作品は、まず作品として読める。講評も稿の履歴も後ろに畳む */}
        {done && (
          <Box mt="6">
            <Slot>完成稿</Slot>
            <Md text={doc.final} />
          </Box>
        )}

        {/* 推敲中は「次に何を直すか」が用なので、最新稿とその重点を1画面目に置く */}
        {!done && latestVersion && (
          <Box mt="6">
            <Slot count={last?.total != null ? `${last.total}/${max}` : null}>
              最新の稿 · 第{latestVersion.v}稿{latestVersion.date ? ` · ${latestVersion.date}` : ''}
            </Slot>
            <Md text={latestVersion.text} />
            <Box mt="4"><Focus round={last} /></Box>
            {latestVersion.critique && (
              <Box mt="3">
                <Fold title="この稿の講評" open={critique} onToggle={() => setCritique(!critique)}>
                  <Md text={latestVersion.critique} />
                </Fold>
              </Box>
            )}
          </Box>
        )}

        {/* 構造を読み取れなかった作品（テンプレートから外れているもの）は、本文をそのまま出す。
            劣化するが壊れない——読めない作品を作らないほうが大事。 */}
        {!doc.versions.length && !doc.final && (
          <Box mt="6"><Md text={piece.body} /></Box>
        )}

        {promptText && (
          <Box mt="7">
            <Slot>お題</Slot>
            <Card soft><Md text={promptText} /></Card>
          </Box>
        )}

        {piece.rounds.length > 0 && (
          <Box mt="7">
            <Slot count={`${piece.rounds.length}稿`}>点の推移</Slot>
            <Scores piece={piece} axes={axes} max={max} />
          </Box>
        )}

        {/* 推敲中は最新稿を上に出しているので、ここでは繰り返さない（同じ文章が1画面に2度出ない） */}
        {history.length > 0 && (
          <Box mt="7">
            <Slot count={history.length}>{done ? '推敲の記録' : 'これまでの稿'}</Slot>
            <Drafts versions={history} rounds={piece.rounds} />
          </Box>
        )}

        {doc.memo && (
          <Box mt="7">
            <Slot>作品メモ（設定）</Slot>
            <Card soft><Md text={doc.memo} /></Card>
          </Box>
        )}

        {doc.extras.map((e) => (
          <Box mt="7" key={e.title}>
            <Slot>{e.title}</Slot>
            <Md text={e.body} />
          </Box>
        ))}

        {axes.length > 0 && (
          <Box mt="7">
            <Slot>評価の軸</Slot>
            <Card soft>
              <VStack align="stretch" gap="1.5">
                {axes.map((a) => (
                  <Text key={a.key} fontSize="xs" color={C.muted} lineHeight="1.7">
                    <b style={{ color: C.ink }}>{a.label}</b> — {a.desc}
                  </Text>
                ))}
              </VStack>
              <Text fontSize="11px" color={C.faint} mt="2.5" lineHeight="1.6">
                軸は毎回この5つに固定する。変えると、上達したかどうかが測れなくなる。
              </Text>
            </Card>
          </Box>
        )}

        <Backlinks route={`/piece/${piece.slug}`} title={piece.title} />
      </Page>
    </>
  );
}
