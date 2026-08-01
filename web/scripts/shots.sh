#!/bin/bash
# 移設前後の見比べ用スクリーンショット取得。
# 使い方: bash scripts/shots.sh <出力ディレクトリ>
# 事前に `npx @playwright/cli open http://localhost:5173/muninn/` と resize 1980 1080 を済ませておく。
set -u
OUT="$1"
mkdir -p "$OUT"
BASE="http://localhost:5173/muninn/#"

shot() {
  local name="$1" path="$2"
  npx @playwright/cli goto "${BASE}${path}" > /dev/null
  sleep 1
  npx @playwright/cli screenshot --full-page --filename "${OUT}/${name}.png" > /dev/null
  echo "  ${name}  <- ${path}"
}

shot 01-edition   "/"
shot 02-shelf     "/shelf"
shot 03-shelfboard "/shelf/health--skincare"
shot 04-search    "/search"
shot 05-desk      "/desk"
shot 06-note      "/note/12-day-war-2025-israel-us-iran"
shot 07-follow    "/follow/argentina-nt"
shot 08-player    "/follow/argentina-nt/player/alexis-mac-allister"
shot 09-atlas     "/atlas/philosophy"
shot 10-concept   "/atlas/philosophy/concept/anaximander-apeiron"
shot 11-logtopic  "/log/coffee-beans"
shot 12-logentry  "/log/coffee-beans/entry/sample-ethiopia-yirgacheffe"
shot 13-legacy    "/notes"
echo "done -> $OUT"
