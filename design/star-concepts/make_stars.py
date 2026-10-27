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


def sym(key, lvl):
    """한 심볼의 SVG 본문 (defs, body)"""
    u = f'{key}{lvl}'
    if key == 'A':  # 빛의 세기 — 같은 별이 점점 밝고 따뜻해진다
        if lvl == 'pisik':
            d, h = halo(u, COOL, 34, .5)
            return d, h + f'<path d="{sparkle(23, 3.8)}" fill="{COOL}"/>'
        if lvl == 'mungkeul':
            d, h = halo(u, '#ffc890', 42, .5)
            return d, h + f'<path d="{sparkle(30, 4.6)}" fill="{WARM}"/><circle r="3.4" fill="{WHITE}"/>'
        d, h = halo(u, '#ffc46e', 50, .62)
        return d, (h + f'<path d="{sparkle(24, 3.4, 45)}" fill="{GOLD}" opacity=".85"/>'
                   f'<path d="{sparkle(47, 5.2)}" fill="#ffe4a8"/><circle r="5" fill="{WHITE}"/>')
    if key == 'B':  # 모양으로 구분 — 색 없이도 세 단계가 보인다
        if lvl == 'pisik':
            d, h = halo(u, COOL, 30, .45)
            return d, h + f'<circle r="13.5" fill="{COOL}"/>'
        if lvl == 'mungkeul':
            d, h = halo(u, '#ffc890', 44, .45)
            return d, h + f'<path d="{star5(25, 12)}" fill="{WARM}" stroke="{WARM}" stroke-width="9" stroke-linejoin="round"/>'
        d, h = halo(u, '#ffc46e', 50, .55)
        ring = 'transform="rotate(-24)"'
        return d, (h + f'<ellipse rx="44" ry="14" fill="none" stroke="{GOLD}" stroke-width="4.5" opacity=".55" {ring}/>'
                   f'<path d="{sparkle(33, 5)}" fill="#ffe4a8"/>'
                   # 고리가 별 앞을 지나가는 부분
                   f'<path d="M-40.2,17.9 A44,14 -24 0 0 40.2,-17.9" fill="none" stroke="{GOLD}" stroke-width="4.5" stroke-linecap="round" {""}/>'
                   f'<circle r="4.2" fill="{WHITE}"/>')
    # C — 선으로 그린 별 (앱 아이콘의 금빛 선과 같은 언어)
    if lvl == 'pisik':
        return '', f'<circle r="14" fill="none" stroke="{COOL}" stroke-width="10"/>'
    if lvl == 'mungkeul':
        return '', f'<path d="{sparkle(32, 7)}" fill="none" stroke="{WARM}" stroke-width="8.5" stroke-linejoin="round"/>'
    d, h = halo(u, '#ffc46e', 50, .5)
    return d, (h + f'<circle r="41" fill="none" stroke="{GOLD}" stroke-width="7"/>'
               f'<path d="{sparkle(27, 5)}" fill="{GOLD}"/>')


def svg(key, lvl, size):
    d, b = sym(key, lvl)
    return (f'<svg width="{size}" height="{size}" viewBox="-50 -50 100 100" aria-hidden="true">'
            f'<defs>{d}</defs>{b}</svg>')


SETS = [
    ('A', '빛의 세기', '같은 별이 단계마다 커지고, 따뜻해지고, 빛줄기가 늘어나요. 지금 별을 가장 자연스럽게 다듬은 버전.'),
    ('B', '모양으로 구분', '피식은 동그란 웃음 방울, 뭉클은 둥근 다섯 꼭지 별, 평생기억은 고리를 두른 별. 색을 못 봐도 구분돼요.'),
    ('C', '선으로 그린 별', '앱 아이콘의 금빛 선과 같은 굵기·말투. 평생기억만 속이 꽉 찬 별이라 가장 귀해 보여요.'),
]
LV = [('pisik', '피식', '완전 빵 터졌어'), ('mungkeul', '뭉클', '마음이 찡했어'), ('forever', '평생기억', '평생 잊지 않을게')]

# 각 심볼 파일
for k, *_ in SETS:
    for l, *_ in LV:
        open(os.path.join(OUT, f'{k}-{l}.svg'), 'w').write(
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
<header><h1>별 심볼 시안 · 피식 / 뭉클 / 평생기억</h1><p>밤하늘 팔레트 · 실제 크기 미리보기 포함</p></header>
<div class="grid">{''.join(cols)}</div>
</body></html>'''
open(os.path.join(OUT, 'board.html'), 'w').write(html)
print('ok')
