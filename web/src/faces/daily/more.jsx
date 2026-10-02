// 「設定」タブ——アプリそのものを扱う場所。読みものはここに置かない。
//
// 以前このタブは `依頼`（できること／在庫の健康／未送信の依頼／画面のかたち）だった。
// 依頼文の見本や在庫の健康は**一度も開かれない説明書**になっていて、オーナーから「いらない」と
// 言われた（2026-10-02）。残したのは、ここが無くなると行き場を失う3つだけ:
//   - 未送信の依頼（再読の判定や深掘りの依頼は溜まり続けるので、束ねて渡す出口が要る）
//   - 履歴（最近見たもの・再読の記録。どちらも端末の中にしか無い）
//   - アプリの操作（最新の版を読み込み直す・画面のかたちを替える）
import { useState } from 'react';
import { Box, Flex, HStack, VStack, Text, Button } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../lib/ctx.js';
import { useShell } from '../../shell/ctx.js';
import { forceReload } from '../../shell/reload.js';
import { AppBar, Page, Slot, Card, CopyButton, relDay } from './ui.jsx';
import {
  loadPending, clearPending, loadSlips, clearSlips, slipsPrompt, loadSeen, recallLog, todayISO,
} from '../../lib/recall.js';
import { C, tint } from '../../shared/theme.js';

const LOG_SHOWN = 10;

function Row({ first, onClick, children }) {
  return (
    <Box as={onClick ? 'button' : 'div'} w="100%" textAlign="left" className={onClick ? 'press' : undefined}
      py="3" borderTop={first ? 'none' : `1px solid ${C.line}`} onClick={onClick}>
      {children}
    </Box>
  );
}

export function More() {
  const navigate = useNavigate();
  const { site, refresh } = useData();
  const { face, openSettings } = useShell();
  const [tick, setTick] = useState(0);
  const [reloading, setReloading] = useState(false);
  const today = todayISO();

  const pending = loadPending();
  const slips = loadSlips();
  const total = pending.length + slips.length;

  const seen = loadSeen();
  const titles = new Map(site.notes.map((n) => [n.slug, n.title]));
  const log = recallLog().slice(-LOG_SHOWN).reverse();

  return (
    <>
      <AppBar title="設定" back={false} />
      <Page>
        <VStack align="stretch" gap="6">

          <Box>
            <Slot>アプリ</Slot>
            <Card>
              <Text fontSize="sm" color={C.ink} fontWeight="700">最新の版を読み込み直す</Text>
              <Text fontSize="xs" color={C.muted} mt="1" lineHeight="1.7">
                アプリを終了しなくても、いま配信されている版に入れ替わります。読み込み直したあとは、もう一度ロックを解除します。
              </Text>
              <Button mt="3" size="sm" w="100%" borderRadius="12px" fontWeight="700" color={C.sky}
                bg={tint(C.sky, 14)} border="1px solid" borderColor={tint(C.sky, 34)}
                _hover={{ bg: tint(C.sky, 22) }} disabled={reloading}
                onClick={() => { setReloading(true); forceReload(); }}>
                {reloading ? '読み込み中…' : '↻ 読み込み直す'}
              </Button>
            </Card>
            {/* 画面のかたちは3つある。どのかたちからも設定に戻れないと「試したら二度と戻せない」が
                起きるので、この面の非常口はここ（常に下のタブから1タップで来られる場所）に置く。 */}
            <Box mt="3">
              <Card onClick={openSettings}>
                <Flex align="center" justify="space-between" gap="3">
                  <Box>
                    <Text fontSize="sm" color={C.ink} fontWeight="700">画面のかたち</Text>
                    <Text fontSize="xs" color={C.muted} mt="1" lineHeight="1.7">いまは「{face.label}」</Text>
                  </Box>
                  <Text fontSize="sm" color={C.faint} flexShrink="0">›</Text>
                </Flex>
              </Card>
            </Box>
          </Box>

          {total > 0 && (
            <Box>
              <Slot count={`${total}件`}>未送信の依頼</Slot>
              <Card>
                <VStack align="stretch" gap="2">
                  {pending.length > 0 && (
                    <HStack justify="space-between">
                      <Text fontSize="sm" color={C.ink}>答え合わせ（再読の結果）</Text>
                      <Text fontSize="xs" color={C.faint}>{pending.length}件</Text>
                    </HStack>
                  )}
                  {slips.map((s) => (
                    <HStack key={s.id} justify="space-between" gap="2">
                      <Text fontSize="sm" color={C.ink} lineHeight="1.5">{s.label}</Text>
                      <Text fontSize="xs" color={C.faint} flexShrink="0">{s.date}</Text>
                    </HStack>
                  ))}
                </VStack>
                <HStack gap="2" mt="4">
                  <CopyButton text={slipsPrompt(slips, pending)} w="100%">ぜんぶコピー</CopyButton>
                </HStack>
                <Button mt="2" size="xs" variant="ghost" color={C.faint} w="100%"
                  _hover={{ color: C.ink, bg: 'transparent' }}
                  onClick={() => { clearPending(); clearSlips(); setTick(tick + 1); refresh?.(); }}>
                  渡し終わったので消す
                </Button>
              </Card>
            </Box>
          )}

          <Box>
            <Slot>最近見たもの</Slot>
            {seen.length === 0 ? (
              <Card soft><Text fontSize="sm" color={C.muted}>まだありません</Text></Card>
            ) : (
              <Box className="glass-soft" borderRadius="14px" px="4" py="1">
                {seen.map((s, i) => (
                  <Row key={s.route} first={i === 0} onClick={() => navigate(s.route)}>
                    <HStack justify="space-between" align="start" gap="2">
                      <Text fontSize="sm" color={C.ink} fontWeight="600" lineHeight="1.5">{s.title}</Text>
                      <Text fontSize="10px" color={C.faint} flexShrink="0" mt="1">
                        {relDay(todayISO(new Date(s.at)), today)}
                      </Text>
                    </HStack>
                  </Row>
                ))}
              </Box>
            )}
          </Box>

          <Box>
            <Slot>再読の記録</Slot>
            {log.length === 0 ? (
              <Card soft><Text fontSize="sm" color={C.muted}>まだありません</Text></Card>
            ) : (
              <Box className="glass-soft" borderRadius="14px" px="4" py="1">
                {log.map((r, i) => (
                  <Row key={`${r.slug}:${r.date}:${i}`} first={i === 0}
                    onClick={titles.has(r.slug) ? () => navigate(`/note/${r.slug}`) : undefined}>
                    <HStack justify="space-between" align="start" gap="2">
                      <Text fontSize="sm" color={C.ink} lineHeight="1.5">{titles.get(r.slug) || r.slug}</Text>
                      <VStack gap="0" align="end" flexShrink="0" mt="0.5">
                        <Text fontSize="11px" fontWeight="700" color={r.q >= 3 ? C.green : C.amber}>
                          {r.q >= 3 ? 'わかった' : 'あやしい'}
                        </Text>
                        <Text fontSize="10px" color={C.faint}>{relDay(r.date, today)}</Text>
                      </VStack>
                    </HStack>
                  </Row>
                ))}
              </Box>
            )}
          </Box>

        </VStack>
      </Page>
    </>
  );
}
