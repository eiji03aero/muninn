// 正本の markdown を描くだけの部品。[[wiki リンク]] の解決はここで済ませる。
// どの面でも「本文の中身」は同じであるべきなので共有する（見た目は .md の CSS 側で面が決める）。
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useData } from '../lib/ctx.js';
import { wikiToMarkdown } from '../lib/wiki.js';

// GFM（表・打ち消し線・自動リンク）。正本の markdown は既に表を使って書かれており、
// index.css にも .md table のスタイルがある。プラグイン不在のあいだ、それらは
// パイプ記号の生テキストとして出ていた（notes/follows/logs 合わせて16ファイル）。
const PLUGINS = [remarkGfm];

// 図版の src を配信ベース（/muninn/）に載せる。build-data.mjs が本文中の
// `assets/x.svg` を `atlas-media/<topic>/x.svg` に書き換えて渡してくるので、
// ここでは相対パスに BASE_URL を足すだけでよい（logs 側の MEDIA() と同じ役割）。
const Img = ({ src, alt, ...rest }) => {
  if (!src) return null;
  const abs = /^(https?:)?\/\//.test(src) || src.startsWith('data:') || src.startsWith('/');
  return (
    <img
      src={abs ? src : import.meta.env.BASE_URL + src}
      alt={alt || ''}
      loading="lazy"
      style={{ maxWidth: '100%', display: 'block', margin: '.6rem auto' }}
      {...rest}
    />
  );
};

export function Md({ text }) {
  const { idx } = useData();
  return (
    <div className="md">
      <ReactMarkdown remarkPlugins={PLUGINS} components={{ img: Img }}>
        {wikiToMarkdown(text || '', idx)}
      </ReactMarkdown>
    </div>
  );
}
