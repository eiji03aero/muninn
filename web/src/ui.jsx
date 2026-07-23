import { Box, Flex, HStack, Badge, Heading, Text, Button, Spinner } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { useData } from './lib/ctx.js';
import { wikiToMarkdown } from './lib/wiki.js';

export const GROUP = {
  GK: { label: 'GK', palette: 'gray' },
  DF: { label: 'DF', palette: 'blue' },
  MF: { label: 'MF', palette: 'green' },
  FW: { label: 'FW', palette: 'red' },
};
export const GROUP_ORDER = ['GK', 'DF', 'MF', 'FW'];

export function AppBar({ title, subtitle, back = true }) {
  const navigate = useNavigate();
  return (
    <Box
      position="sticky"
      top="0"
      zIndex="10"
      bg="white"
      borderBottomWidth="1px"
      px="4"
      pb="3"
      style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
    >
      {back && (
        <Button size="xs" variant="ghost" mb="1" px="1" onClick={() => navigate(-1)}>
          ‹ 戻る
        </Button>
      )}
      <Heading size="md" lineHeight="1.3">{title}</Heading>
      {subtitle && <Text fontSize="sm" color="gray.500" mt="0.5">{subtitle}</Text>}
    </Box>
  );
}

export function Chip({ children, palette = 'gray' }) {
  return <Badge colorPalette={palette} variant="subtle" borderRadius="full" px="2">{children}</Badge>;
}

export function Chips({ items, palette = 'gray' }) {
  if (!items || !items.length) return null;
  return (
    <Flex wrap="wrap" gap="1.5">
      {items.map((it, i) => <Chip key={i} palette={palette}>{it}</Chip>)}
    </Flex>
  );
}

export function DueBadge() {
  return <Badge colorPalette="red" variant="solid" borderRadius="full" px="2">復習</Badge>;
}

export function Card({ children, onClick }) {
  return (
    <Box
      borderWidth="1px"
      borderRadius="xl"
      bg="white"
      p="4"
      onClick={onClick}
      cursor={onClick ? 'pointer' : 'default'}
      _active={onClick ? { transform: 'scale(0.99)' } : undefined}
      transition="transform 0.05s"
    >
      {children}
    </Box>
  );
}

export function Center({ children }) {
  return <Flex minH="60vh" align="center" justify="center" direction="column" gap="3" p="6" textAlign="center">{children}</Flex>;
}

export function Loading() {
  return <Center><Spinner size="lg" /></Center>;
}

const MD_CSS = {
  '& h2': { fontSize: '1.05rem', fontWeight: 700, marginTop: '1.1rem', marginBottom: '0.4rem' },
  '& h3': { fontSize: '1rem', fontWeight: 700, marginTop: '0.9rem', marginBottom: '0.3rem' },
  '& p': { margin: '0.5rem 0', lineHeight: 1.85 },
  '& ul': { paddingLeft: '1.25rem', margin: '0.4rem 0', listStyle: 'disc' },
  '& ol': { paddingLeft: '1.25rem', margin: '0.4rem 0', listStyle: 'decimal' },
  '& li': { margin: '0.25rem 0', lineHeight: 1.7 },
  '& a': { color: '#2b6cb0', textDecoration: 'underline' },
  '& strong': { fontWeight: 700 },
  '& code': { background: '#edf2f7', padding: '0.1rem 0.3rem', borderRadius: '4px', fontSize: '0.9em' },
  '& hr': { border: 0, borderTop: '1px solid #e2e8f0', margin: '1rem 0' },
  '& table': { width: '100%', borderCollapse: 'collapse', margin: '0.6rem 0', fontSize: '0.9rem', display: 'block', overflowX: 'auto' },
  '& th, & td': { border: '1px solid #e2e8f0', padding: '0.3rem 0.5rem', textAlign: 'left' },
  '& blockquote': { borderLeft: '3px solid #cbd5e0', paddingLeft: '0.75rem', color: '#4a5568', margin: '0.5rem 0' },
};

export function Md({ text }) {
  const { idx } = useData();
  const md = wikiToMarkdown(text || '', idx);
  return (
    <Box css={MD_CSS} fontSize="0.95rem" color="gray.800">
      <ReactMarkdown>{md}</ReactMarkdown>
    </Box>
  );
}
