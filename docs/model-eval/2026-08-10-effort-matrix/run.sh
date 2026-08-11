#!/usr/bin/env bash
# モデル × effort 比較実験のランナー。
#
#   ./run.sh              12ケース全部（既に出力があるケースは飛ばす）
#   ./run.sh a            タスクAの6ケースだけ
#   ./run.sh b opus       タスクBの opus 3ケースだけ
#   ./run.sh a sonnet medium   1ケースだけ（動作確認用）
#   ./run.sh blind        採点用に runs/*.md を匿名化して runs/blind/ に置く
#
# 各ケースは claude -p の新規セッション。--model / --effort を起動時フラグで渡すので
# `/effort` が Not applied になる問題は起きない。

set -uo pipefail

KIT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(cd "$KIT/../../.." && pwd)"
RUNS="$KIT/runs"
RAW="$RUNS/raw"
METRICS="$RUNS/metrics.csv"

MODELS=(sonnet opus)
EFFORTS=(medium high xhigh)

# ---------- 匿名化モード ----------
if [[ "${1:-}" == "blind" ]]; then
  BLIND="$RUNS/blind"
  rm -rf "$BLIND" && mkdir -p "$BLIND"
  : > "$BLIND/.mapping.txt"
  i=0
  # ケース順ではなくファイル名のハッシュ順に並べ替えて、番号から条件を推測できないようにする
  while IFS= read -r f; do
    i=$((i + 1))
    n=$(printf '%02d' "$i")
    cp "$f" "$BLIND/$n.md"
    echo "$n  $(basename "$f" .md)" >> "$BLIND/.mapping.txt"
  done < <(find "$RUNS" -maxdepth 1 -name '*.md' | while read -r f; do
             echo "$(shasum "$f" | cut -c1-8)|$f"
           done | sort | cut -d'|' -f2)
  echo "→ $BLIND に $i 件。対応表は $BLIND/.mapping.txt（採点が終わるまで開かないこと）"
  exit 0
fi

# ---------- フィルタ ----------
WANT_TASK="${1:-}"
WANT_MODEL="${2:-}"
WANT_EFFORT="${3:-}"

mkdir -p "$RAW"
[[ -f "$METRICS" ]] || echo "case,task,model,effort,duration_s,output_tokens,cache_read_tokens,cost_usd,num_turns,chars,stray_files" > "$METRICS"

# タスクAはリポジトリ外で走らせる。$HOME の外に作るので、ユーザーレベルの
# CLAUDE.md も読み込まれず、6ケースの入力条件が完全に揃う。
# ケースごとに別ディレクトリを切る（共有すると前のケースの生成物が次のケースから見える）。
SCRATCH="$(mktemp -d)"
trap 'rm -rf "$SCRATCH"' EXIT

run_case() {
  local task="$1" model="$2" effort="$3"
  local name="${task}-${model}-${effort}"
  local out="$RUNS/$name.md" rawf="$RAW/$name.json"
  local workdir prompt

  if [[ -f "$out" ]]; then
    echo "skip  $name （出力済み。撮り直すなら $out を消す）"
    return
  fi

  if [[ "$task" == "a" ]]; then
    workdir="$SCRATCH/$name"    # ケース専用の空ディレクトリ。ツール不要・キット混入なし
    mkdir -p "$workdir"
  else
    workdir="$REPO"             # CLAUDE.md と web/DESIGN.md を読ませる
  fi
  prompt="$(cat "$KIT/task-${task}.md")"

  echo "run   $name ..."
  local t0 t1 dur
  t0=$(date +%s)
  ( cd "$workdir" && claude -p "$prompt" \
      --model "$model" --effort "$effort" \
      --output-format json ) > "$rawf" 2>"$RAW/$name.stderr"
  local rc=$?
  t1=$(date +%s)
  dur=$((t1 - t0))

  if [[ $rc -ne 0 ]] || ! jq -e '.result' "$rawf" >/dev/null 2>&1; then
    echo "  ✗ 失敗 (rc=$rc)。$RAW/$name.stderr と $rawf を見ること"
    rm -f "$rawf"
    return
  fi

  jq -r '.result' "$rawf" > "$out"

  # 指示に反してファイルを作ったケースは、その事実ごと保全する（指示追従の材料になる）
  local stray=0
  if [[ "$task" == "a" ]] && [[ -n "$(ls -A "$workdir" 2>/dev/null)" ]]; then
    mkdir -p "$RUNS/work"
    cp -R "$workdir" "$RUNS/work/$name"
    stray=$(find "$workdir" -type f | wc -l | tr -d ' ')
  fi

  # 起動フラグが本当に効いたかを記録に残す（違っていたらそのケースは捨てる）
  local got_model
  got_model=$(jq -r '.modelUsage // {} | keys | join(";")' "$rawf")

  printf '%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s\n' \
    "$name" "$task" "$model" "$effort" "$dur" \
    "$(jq -r '[.modelUsage // {} | .[] | .outputTokens // 0] | add // 0' "$rawf")" \
    "$(jq -r '[.modelUsage // {} | .[] | .cacheReadInputTokens // 0] | add // 0' "$rawf")" \
    "$(jq -r '.total_cost_usd // 0' "$rawf")" \
    "$(jq -r '.num_turns // 0' "$rawf")" \
    "$(wc -m < "$out" | tr -d ' ')" \
    "$stray" >> "$METRICS"

  echo "  ✓ ${dur}s  model=${got_model:-?}  out_tok=$(jq -r '[.modelUsage//{}|.[]|.outputTokens//0]|add//0' "$rawf")  stray_files=$stray  → $out"
}

for task in a b; do
  [[ -n "$WANT_TASK" && "$WANT_TASK" != "$task" ]] && continue
  for model in "${MODELS[@]}"; do
    [[ -n "$WANT_MODEL" && "$WANT_MODEL" != "$model" ]] && continue
    for effort in "${EFFORTS[@]}"; do
      [[ -n "$WANT_EFFORT" && "$WANT_EFFORT" != "$effort" ]] && continue
      run_case "$task" "$model" "$effort"
    done
  done
done

echo
echo "=== metrics ==="
column -s, -t "$METRICS"
