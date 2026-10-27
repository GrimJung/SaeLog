# 피식/뭉클/평생기억 별 심볼 시안 3종 → board.html (+ 각 심볼 SVG)
# viewBox -50..50 기준. 실제 크기(12px 목록 점, 22px 칩, 하늘)에서 구분되는지가 핵심.
import math, os, random

OUT = os.path.dirname(os.path.abspath(__file__))
COOL, WARM, GOLD, WHITE = '#e1e5ff', '#ffe6c8', '#ffd98a', '#fffaf0'
f = lambda v: f'{v:.1f}'


def sparkle(R, k, rot=0, cx=0, cy=0):
    """오목한 네 갈래 빛 (앱 아이콘의 별과 같은 모양). k: 허리 두께"""
    pts = []
    for i in range(4):
        a = math.radians(rot + i * 90 - 90)
        b = math.radians(rot + i * 90 - 45)
        pts.append(((cx + R * math.cos(a), cy + R * math.sin(a)), (cx + k * math.cos(b), cy + k * math.sin(b))))
    d = f'M{f(pts[0][0][0])},{f(pts[0][0][1])} '
    for i in range(4):
        c = pts[i][1]
        n = pts[(i + 1) % 4][0]
        d += f'Q{f(c[0])},{f(c[1])} {f(n[0])},{f(n[1])} '
    return d + 'Z'


def star5(R, r):
    p = []
    for i in range(10):
        a = math.radians(-90 + i * 36)
        rr = R if i % 2 == 0 else r
        p.append(f'{f(rr * math.cos(a))},{f(rr * math.sin(a))}')
    return 'M' + ' L'.join(p) + 'Z'


def halo(id_, color, r, op):
    return (f'<radialGradient id="{id_}"><stop offset="0" stop-color="{color}" stop-opacity="{op}"/>'
            f'<stop offset="1" stop-color="{color}" stop-opacity="0"/></radialGradient>', f'<circle r="{r}" fill="url(#{id_})"/>')


def blur(id_, sd):
    return f'<filter id="{id_}" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="{sd}"/></filter>'


def orb(u, r, light, base, shadow, sd=1.1):
    """빛이 왼쪽 위에서 오는 은은한 구슬 — 가장자리는 흐리게"""
    return (f'<radialGradient id="{u}o" cx=".4" cy=".38" r=".7" fx=".34" fy=".3">'
            f'<stop offset="0" stop-color="{light}"/><stop offset=".5" stop-color="{base}"/>'
            f'<stop offset="1" stop-color="{shadow}" stop-opacity=".85"/></radialGradient>{blur(u + "b", sd)}',
            f'<circle r="{r}" fill="url(#{u}o)" filter="url(#{u}b)"/>'
            f'<ellipse cx="{-r * .32:.1f}" cy="{-r * .38:.1f}" rx="{r * .3:.1f}" ry="{r * .2:.1f}" fill="#fff" opacity=".7" filter="url(#{u}b)"/>')


def core(u, r, color, fx=.42, fy=.4):
    return (f'<radialGradient id="{u}c" fx="{fx}" fy="{fy}"><stop offset="0" stop-color="#fff"/>'
            f'<stop offset=".45" stop-color="{color}"/><stop offset="1" stop-color="{color}" stop-opacity="0"/></radialGradient>',
            f'<circle r="{r}" fill="url(#{u}c)"/>')


def sym(key, lvl):
    """한 심볼의 SVG 본문 (defs, body)"""
    u = f'{key}{lvl}'
    if key == 'A':  # 진주빛 구슬
        if lvl == 'pisik':
            d1, h = halo(u, '#b9bfff', 34, .5)
            d2, o = orb(u, 11, '#ffffff', '#cfd3ff', '#8b90d8')
            return d1 + d2, h + o
        if lvl == 'mungkeul':
            d1, h = halo(u, '#ffc890', 44, .5)
            d2, o = orb(u, 15.5, '#fffaf2', '#ffd9b8', '#d59a72')
            return d1 + d2, h + o
        d1, h = halo(u, '#ffc46e', 50, .62)
        d2, o = orb(u, 18, '#fffbea', '#ffdc93', '#d39a45')
        rays = f'<path d="{sparkle(48, 3.5)}" fill="#ffe7b0" opacity=".75" filter="url(#{u}r)"/>'
        return d1 + d2 + blur(u + 'r', 1.6), h + rays + o
    if key == 'B':  # 겹빛 — 안은 따뜻하고 밖은 차가운 빛이 겹겹이
        if lvl == 'pisik':
            d1, h = halo(u, '#b9bfff', 32, .55)
            d2, c = core(u, 11, '#d9ddff')
            return d1 + d2, h + c
        if lvl == 'mungkeul':
            d1, h1 = halo(u + 'o', '#a9a6ff', 48, .28)
            d2, h2 = halo(u, '#ffc890', 28, .6)
            d3, c = core(u, 13, '#ffe2c4')
            cross = f'<path d="{sparkle(34, 2.6)}" fill="#fff0de" opacity=".5" filter="url(#{u}x)"/>'
            return d1 + d2 + d3 + blur(u + 'x', 1.5), h1 + h2 + cross + c
        d1, h1 = halo(u + 'o', '#a9a6ff', 50, .32)
        d2, h2 = halo(u, '#ffc46e', 34, .66)
        d3, c = core(u, 15, '#ffd98a')
        ring = f'<circle r="29" fill="none" stroke="#ffe0a0" stroke-width="2" opacity=".28" filter="url(#{u}x)"/>'
        cross = (f'<path d="{sparkle(49, 3)}" fill="#ffefc8" opacity=".85" filter="url(#{u}x)"/>'
                 f'<path d="{sparkle(25, 2.2, 45)}" fill="#ffe2a0" opacity=".45" filter="url(#{u}x)"/>')
        return d1 + d2 + d3 + blur(u + 'x', 1.4), h1 + ring + h2 + cross + c
    # C — 말랑한 별: 통통한 네 갈래 별에 위에서 비추는 빛과 흐린 가장자리
    def puffy(R, k, light, base, shadow, sd, cx=0, cy=0, tag=''):
        return (f'<linearGradient id="{u}{tag}g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="{light}"/>'
                f'<stop offset=".5" stop-color="{base}"/><stop offset="1" stop-color="{shadow}"/></linearGradient>{blur(u + tag + "b", sd)}',
                f'<path d="{sparkle(R, k, 0, cx, cy)}" fill="url(#{u}{tag}g)" filter="url(#{u}{tag}b)"/>')
    if lvl == 'pisik':
        d1, h = halo(u, '#b9bfff', 32, .5)
        d2, p = puffy(18, 7.5, '#ffffff', '#d6daff', '#9297dc', 1)
        return d1 + d2, h + p
    if lvl == 'mungkeul':
        d1, h = halo(u, '#ffc890', 44, .5)
        d2, p = puffy(27, 8.5, '#fffaf2', '#ffdcbc', '#d99c72', 1.2)
        return d1 + d2, h + p + f'<circle cx="-5" cy="-6" r="4" fill="#fff" opacity=".75" filter="url(#{u}b)"/>'
    d1, h = halo(u, '#ffc46e', 50, .6)
    d2, p = puffy(38, 9.5, '#fffbea', '#ffdc93', '#d39a45', 1.4)
    d3, q = puffy(10, 3.5, '#fffbea', '#ffe2a0', '#d9a456', 1.3, 31, -30, 's')
    return d1 + d2 + d3, h + p + q + f'<circle cx="-7" cy="-8" r="5" fill="#fff" opacity=".8" filter="url(#{u}b)"/>'


def svg(key, lvl, size):
    d, b = sym(key, lvl)
    return (f'<svg width="{size}" height="{size}" viewBox="-50 -50 100 100" aria-hidden="true">'
            f'<defs>{d}</defs>{b}</svg>')


SETS = [
    ('A', '진주빛 구슬', '왼쪽 위에서 빛을 받은 작은 구슬. 지금의 은은한 빛 점에 둥근 볼륨과 반짝임만 더했어요. 평생기억엔 흐린 빛줄기.'),
    ('B', '겹빛', '안쪽은 따뜻하고 바깥은 라벤더로 번지는 빛이 겹겹이 쌓여 깊이가 생겨요. 단계마다 빛 층과 흐린 십자가 늘어나요.'),
    ('C', '말랑한 별', '앱 아이콘의 네 갈래 별을 통통하고 흐릿하게. 위에서 비추는 빛으로 말랑한 입체감, 평생기억엔 작은 별 하나가 따라와요.'),
]
LV = [('pisik', '피식', '완전 빵 터졌어'), ('mungkeul', '뭉클', '마음이 찡했어'), ('forever', '평생기억', '평생 잊지 않을게')]

# 각 심볼 파일
for k, *_ in SETS:
    for l, *_ in LV:
        open(os.path.join(OUT, f'v2-{k}-{l}.svg'), 'w').write(
            svg(k, l, 100).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" '))

random.seed(7)
def sky(key):
    # 실제 하늘처럼: 피식이 많고 평생기억은 드물게
    out = []
    for lvl, n, s in [('pisik', 14, (9, 12)), ('mungkeul', 6, (16, 20)), ('forever', 2, (30, 34))]:
        for _ in range(n):
            x, y, sz = random.uniform(4, 92), random.uniform(8, 86), random.uniform(*s)
            out.append(f'<span style="left:{x:.1f}%;top:{y:.1f}%">{svg(key, lvl, round(sz))}</span>')
    return ''.join(out)

cols = []
for k, name, desc in SETS:
    big = ''.join(f'<figure>{svg(k, l, 96)}<figcaption>{lab}</figcaption></figure>' for l, lab, _ in LV)
    chips = ''.join(f'<div class="chip{" on" if l == "mungkeul" else ""}">{svg(k, l, 26)}<b>{lab}</b><small>{sub}</small></div>' for l, lab, sub in LV)
    rows = ''.join(f'<div class="row">{svg(k, l, 14)}<span>{t}</span></div>' for (l, *_), t in zip(LV, ['공룡은 왜 코가 없어?', '엄마 아프지 마, 내가 호 해줄게', '아빠 사랑해 우주만큼']))
    cols.append(f'''<section class="col">
  <p class="mark">{k}</p><h2>{name}</h2><p class="desc">{desc}</p>
  <div class="big">{big}</div>
  <p class="cap">기록 칩 · 26px</p><div class="chips">{chips}</div>
  <p class="cap">목록 · 14px</p><div class="rows">{rows}</div>
  <p class="cap">하늘</p><div class="sky">{sky(k)}</div>
</section>''')

html = f'''<!doctype html><html lang="ko"><head><meta charset="utf-8">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">
<style>
@font-face {{ font-family: 'MaruBuri'; src: url(https://hangeul.pstatic.net/hangeul_static/webfont/MaruBuri/MaruBuri-Regular.woff2) format('woff2'); }}
* {{ box-sizing: border-box; margin: 0; }}
body {{ width: 1500px; padding: 56px 64px 64px; color: #ece8f6; font-family: 'Pretendard Variable', sans-serif;
  background: radial-gradient(1200px 700px at 50% -10%, rgba(108,111,216,.16), transparent 70%), #070b1d; }}
header {{ display: flex; justify-content: space-between; align-items: baseline; padding-bottom: 26px; border-bottom: 1px solid rgba(255,255,255,.08); }}
h1 {{ font-family: 'MaruBuri', serif; font-weight: 400; font-size: 30px; }}
header p {{ color: #75739a; font-size: 13px; }}
.grid {{ display: grid; grid-template-columns: repeat(3, 1fr); gap: 0; margin-top: 34px; }}
.col {{ padding: 0 34px; }} .col + .col {{ border-left: 1px solid rgba(255,255,255,.06); }}
.mark {{ color: #ffd98a; font-size: 13px; letter-spacing: .3em; }}
h2 {{ margin-top: 6px; font-family: 'MaruBuri', serif; font-weight: 400; font-size: 23px; }}
.desc {{ margin-top: 8px; min-height: 66px; color: #8f8db3; font-size: 13.5px; line-height: 1.65; word-break: keep-all; }}
.big {{ margin-top: 18px; display: flex; justify-content: space-between; padding: 22px 14px 16px; border-radius: 20px; background: rgba(255,255,255,.025); }}
figure {{ display: flex; flex-direction: column; align-items: center; gap: 10px; }}
figcaption {{ font-family: 'MaruBuri', serif; font-size: 15px; color: #b3b0cc; }}
.cap {{ margin: 22px 0 8px; font-size: 11px; letter-spacing: .12em; color: #4e4c74; }}
.chips {{ display: flex; gap: 8px; }}
.chip {{ flex: 1; padding: 14px 4px 10px; border-radius: 16px; background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.07);
  display: flex; flex-direction: column; align-items: center; gap: 4px; }}
.chip.on {{ background: rgba(255,233,207,.08); border-color: rgba(255,217,138,.45); }}
.chip b {{ margin-top: 4px; font-family: 'MaruBuri', serif; font-weight: 400; font-size: 15px; }}
.chip small {{ font-size: 10.5px; color: #75739a; }}
.rows {{ border-top: 1px solid rgba(255,255,255,.06); }}
.row {{ display: flex; align-items: center; gap: 12px; padding: 11px 4px; border-bottom: 1px solid rgba(255,255,255,.06); font-family: 'MaruBuri', serif; font-size: 15px; }}
.row svg {{ flex: none; }}
.sky {{ position: relative; height: 190px; border-radius: 18px; overflow: hidden;
  background: linear-gradient(180deg, #060a1c, #0b1130 65%, #161a3b); }}
.sky span {{ position: absolute; transform: translate(-50%, -50%); line-height: 0; }}
</style></head><body>
<header><h1>별 심볼 시안 2 · 은은하게, 살짝 입체감</h1><p>밤하늘 팔레트 · 실제 크기 미리보기 포함</p></header>
<div class="grid">{''.join(cols)}</div>
</body></html>'''
open(os.path.join(OUT, 'board2.html'), 'w').write(html)
print('ok')
