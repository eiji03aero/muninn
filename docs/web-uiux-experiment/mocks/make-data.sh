#!/bin/sh
# モックが読む実データ `mn-data.js` を、正本から作り直す。
#
#   前提: web/public/site.json（平文の派生JSON）が要る。無ければ先に:
#       cd web && npm run build:data      # ← MN_SITE_PASSWORD を設定していないこと（平文が出る）
#
#   使い方:
#       sh docs/web-uiux-experiment/mocks/make-data.sh
#
# 出力される `mn-data.js` は派生物なので git には入れない（.gitignore 済み）。
# タイトル・タグ・想起の問い・**リンクの理由**・観測値は削らない。本文だけ抄録にする。
set -e

ROOT=$(cd "$(dirname "$0")/../../.." && pwd)
SITE="$ROOT/web/public/site.json"
OUT="$(cd "$(dirname "$0")" && pwd)/mn-data.js"

if [ ! -f "$SITE" ]; then
  echo "❌ $SITE が無い。先に  cd web && npm run build:data  を実行すること" >&2
  exit 1
fi

jq -r '{
  generatedAt: .generatedAt,
  notes: [.notes[] | {slug, title, tags, kind, created, updated, recall, next: .srs.next, last: .srs.last, links,
    linkrefs: [ .body | split("\n")[] | capture("\\[\\[(?<t>[^\\]|]+?)(\\|[^\\]]+)?\\]\\]\\s*(?:—|―|--)\\s*(?<r>.+)$") | {t: (.t|gsub("^\\s+|\\s+$";"")), r: (.r|gsub("^\\s+|\\s+$";""))} ],
    ex: (.body[0:240])}],
  mocs: [.mocs[] | {slug, title, sections: [.sections[] | {title, items: [.items[] | {target, alias, reason}]}]}],
  follows: [.follows[] | {name, title, followType, goal, tags, snapshot, focus, nextMatches, series, coach, formation, rivals,
     entities: [.entities[] | {slug,title,group,role,club,status,deepDive,strengths,developing,changelog}],
     sessions: [.sessions[] | {date, summary, metrics, ex: (.body[0:180])}]}],
  atlases: [.atlases[] | {slug, title, tags, routes, ex: (.body[0:260]),
     concepts: [.concepts[] | {slug,title,gist,status,created,updated,edges,notes,tags, ex: (.body[0:260])}]}],
  logtopics: [.logtopics[] | {slug,title,tags,fields,display, entries: [.entries[] | {slug,title,created,image,fields, ex: (.body[0:180])}]}]
} | "window.MN = " + tojson + ";"' "$SITE" > "$OUT"

node --check "$OUT"
echo "✅ $OUT を生成した（$(wc -c < "$OUT" | tr -d ' ') バイト）"
