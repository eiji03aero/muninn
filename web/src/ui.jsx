import { Box, Flex, HStack, Heading, Text, Button, Spinner } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { useData } from './lib/ctx.js';
import { wikiToMarkdown } from './lib/wiki.js';
import { C, ACCENT_GRADIENT, tint } from './theme.js';

export { GROUP, GROUP_ORDER } from './theme.js';

export function AppBar({ title, subtitle, back = true, children }) {
  const navigate = useNavigate();
  return (
    <Box
      className="glass-bar"
      position="sticky"
      top="0"
      zIndex="20"
      px="4"
      pb="3"
      style={{ paddingTop: 'max(0.7rem, env(safe-area-inset-top))' }}
    >
      {back && (
        <Flex align="center" justify="space-between" mb="1">
          <Button size="xs" variant="ghost" color={C.muted} px="1" onClick={() => navigate(-1)}
            _hover={{ color: C.ink, bg: 'transparent' }}>
            ‹ 戻る
          </Button>
          <Button size="xs" variant="ghost" color={C.muted} px="1" onClick={() => navigate('/')}
            _hover={{ color: C.ink, bg: 'transparent' }}>
            ⌂ ホーム
          </Button>
        </Flex>
      )}
      <Heading size="md" color={C.ink} lineHeight="1.25" letterSpacing="-0.01em">{title}</Heading>
      {subtitle && <Text fontSize="sm" color={C.muted} mt="1">{subtitle}</Text>}
      {children}
    </Box>
  );
}

export function Chip({ children, color = C.muted }) {
  return (
    <Box as="span" display="inline-block" px="2.5" py="1" borderRadius="full"
      fontSize="11px" fontWeight="600" lineHeight="1.4"
      color={color} bg={tint(color, 15)} border="1px solid" borderColor={tint(color, 30)}>
      {children}
    </Box>
  );
}

export function Chips({ items, color = C.muted }) {
  if (!items || !items.length) return null;
  return (
    <Flex wrap="wrap" gap="1.5">
      {items.map((it, i) => <Chip key={i} color={color}>{it}</Chip>)}
    </Flex>
  );
}

export function DueBadge() {
  return (
    <Box as="span" display="inline-block" px="2.5" py="1" borderRadius="full"
      fontSize="10px" fontWeight="800" letterSpacing="0.04em"
      color="#0b0f1e" bg={ACCENT_GRADIENT}
      boxShadow="0 4px 14px -4px rgba(140,170,255,.7)">
      復習
    </Box>
  );
}

export function Card({ children, onClick }) {
  return (
    <Box className={onClick ? 'glass press' : 'glass'} p="4" onClick={onClick}
      cursor={onClick ? 'pointer' : 'default'}>
      {children}
    </Box>
  );
}

export function Center({ children }) {
  return (
    <Flex minH="70vh" align="center" justify="center" direction="column" gap="3" p="6" textAlign="center">
      {children}
    </Flex>
  );
}

export function Loading() {
  return <Center><Spinner size="lg" color={C.sky} /></Center>;
}

export function Md({ text }) {
  const { idx } = useData();
  const md = wikiToMarkdown(text || '', idx);
  return <div className="md"><ReactMarkdown>{md}</ReactMarkdown></div>;
}
