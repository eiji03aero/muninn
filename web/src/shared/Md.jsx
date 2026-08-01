// 正本の markdown を描くだけの部品。[[wiki リンク]] の解決はここで済ませる。
// どの面でも「本文の中身」は同じであるべきなので共有する（見た目は .md の CSS 側で面が決める）。
import ReactMarkdown from 'react-markdown';
import { useData } from '../lib/ctx.js';
import { wikiToMarkdown } from '../lib/wiki.js';

export function Md({ text }) {
  const { idx } = useData();
  return <div className="md"><ReactMarkdown>{wikiToMarkdown(text || '', idx)}</ReactMarkdown></div>;
}
