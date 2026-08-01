#!/usr/bin/env python3
"""移設前後のスクリーンショットを画素単位で比べる。

面（faces/）を触る作業には自動テストが無いので、「日報の振る舞いを変えていない」ことを
担保する手段がこれしかない。バイト差＝見た目の差とは限らない（PNG の圧縮や
backdrop-filter の縁のアンチエイリアスで数百画素は普通にずれる）ため、
差の量と、差が固まっている場所まで出す。

使い方:
    bash scripts/shots.sh /tmp/before      # 変更前に撮る
    （変更する）
    bash scripts/shots.sh /tmp/after       # 変更後に撮る
    python3 scripts/pngdiff.py /tmp/before/01-edition.png /tmp/after/01-edition.png

標準ライブラリだけで PNG を復号する（この確認のために依存を足さない）。
"""
import sys
import zlib
import struct


def read_png(path):
    with open(path, 'rb') as f:
        data = f.read()
    assert data[:8] == b'\x89PNG\r\n\x1a\n', f'not a png: {path}'
    pos, idat, meta = 8, b'', None
    while pos < len(data):
        ln, typ = struct.unpack('>I4s', data[pos:pos + 8])
        body = data[pos + 8:pos + 8 + ln]
        if typ == b'IHDR':
            meta = struct.unpack('>IIBBBBB', body)
        elif typ == b'IDAT':
            idat += body
        pos += 12 + ln
    w, h, depth, color, _, _, interlace = meta
    assert depth == 8 and interlace == 0, f'unsupported png: {path}'
    ch = {0: 1, 2: 3, 3: 1, 4: 2, 6: 4}[color]
    raw = zlib.decompress(idat)
    stride = w * ch
    out = bytearray(h * stride)
    prev = bytearray(stride)
    p = 0
    for y in range(h):
        ft = raw[p]
        p += 1
        line = bytearray(raw[p:p + stride])
        p += stride
        if ft == 1:
            for i in range(ch, stride):
                line[i] = (line[i] + line[i - ch]) & 0xFF
        elif ft == 2:
            for i in range(stride):
                line[i] = (line[i] + prev[i]) & 0xFF
        elif ft == 3:
            for i in range(stride):
                a = line[i - ch] if i >= ch else 0
                line[i] = (line[i] + ((a + prev[i]) >> 1)) & 0xFF
        elif ft == 4:
            for i in range(stride):
                a = line[i - ch] if i >= ch else 0
                b = prev[i]
                c = prev[i - ch] if i >= ch else 0
                pa, pb, pc = abs(b - c), abs(a - c), abs(a + b - 2 * c)
                pr = a if (pa <= pb and pa <= pc) else (b if pb <= pc else c)
                line[i] = (line[i] + pr) & 0xFF
        out[y * stride:(y + 1) * stride] = line
        prev = line
    return w, h, ch, bytes(out)


def main():
    a, b = sys.argv[1], sys.argv[2]
    wa, ha, ca, da = read_png(a)
    wb, hb, _, db = read_png(b)
    if (wa, ha) != (wb, hb):
        print(f'画面の大きさが違う: {wa}x{ha} vs {wb}x{hb}')
        return 1

    xs, ys, worst = [], [], 0
    for y in range(ha):
        base = y * wa * ca
        for x in range(wa):
            i = base + x * ca
            d = max(abs(da[i + k] - db[i + k]) for k in range(min(ca, 3)))
            if d:
                xs.append(x)
                ys.append(y)
                worst = max(worst, d)

    total = wa * ha
    if not xs:
        print(f'{wa}x{ha}  差なし')
        return 0
    print(f'{wa}x{ha}  差のある画素 {len(xs)}/{total} ({len(xs) / total * 100:.4f}%)  最大差 {worst}')
    print(f'  固まっている場所: x={min(xs)}..{max(xs)}  y={min(ys)}..{max(ys)}')
    print('  ※ 縁だけに散っていて最大差が小さいなら、ぼかしのアンチエイリアス由来で見た目は同じことが多い。'
          '\n     広い面に散っている・文字の位置がずれているなら本物の変化なので、目で見て確かめること。')
    return 2


if __name__ == '__main__':
    sys.exit(main())
