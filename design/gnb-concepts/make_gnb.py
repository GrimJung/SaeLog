# 하단 탭(GNB) 아이콘 시안 A/B/C → board.html
# 24×24, 선 굵기 1.6, 둥근 끝 — 앱 아이콘(잠든 아이의 말)의 금빛 선과 같은 말투.
# currentColor 로 그려서 탭의 기본/선택 색을 그대로 따른다.
import math, os

OUT = os.path.dirname(os.path.abspath(__file__))
f = lambda v: f'{v:.2f}'.rstrip('0').rstrip('.')


def sparkle(cx, cy, R, k=None):
    k = k if k is not None else R * 0.22
    p = [(cx, cy - R), (cx + R, cy), (cx, cy + R), (cx - R, cy)]
    c = [(cx + k, cy - k), (cx + k, cy + k), (cx - k, cy + k), (cx - k, cy - k)]
    d = f'M{f(p[0][0])} {f(p[0][1])}'
    for i in range(4):
        n = p[(i + 1) % 4]
        d += f'Q{f(c[i][0])} {f(c[i][1])} {f(n[0])} {f(n[1])}'
    return d + 'Z'


def bubble(cx, cy, r, tail_a=128, tail_len=3.6):
    """앱 아이콘처럼 왼쪽 아래로 꼬리가 난 둥근 말풍선 (선 하나)"""
    a0, a1 = math.radians(tail_a - 16), math.radians(tail_a + 12)
    p0 = (cx + r * math.cos(a0), cy + r * math.sin(a0))
    p1 = (cx + r * math.cos(a1), cy + r * math.sin(a1))
    ta = math.radians(tail_a + 4)
    tip = (cx + (r + tail_len) * math.cos(ta), cy + (r + tail_len) * math.sin(ta))
    return (f'M{f(p1[0])} {f(p1[1])}A{r} {r} 0 1 1 {f(p0[0])} {f(p0[1])}'
            f'L{f(tip[0])} {f(tip[1])}Z')


W = 'fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"'
DOT = lambda x, y, r: f'<circle cx="{x}" cy="{y}" r="{r}" fill="currentColor" stroke="none"/>'
SP = lambda x, y, R, op=1: f'<path d="{sparkle(x, y, R)}" fill="currentColor" stroke="none" opacity="{op}"/>'

ICONS = {
    # A — 말에서 별로: 처음(오늘)과 끝(평생기억)이 앱 아이콘의 말풍선
    'A': {
        'today': f'<path d="{bubble(12.5, 11, 7.2)}"/><path d="M8.6 11.2q1.3 1.4 2.6 0M13.8 11.2q1.3 1.4 2.6 0"/>',
        'week': f'<path d="M4.5 16.5 9.5 9l5 4.5 5-7.5" opacity=".55"/>{DOT(4.5, 16.5, 1.5)}{DOT(9.5, 9, 1.8)}{DOT(14.5, 13.5, 1.4)}{SP(19.5, 6, 3.2)}',
        'year': f'<path d="M3.5 15.5C7 15 9 9.5 13 8.5s6 .5 7.5-1" opacity=".55"/><path d="M4.5 19c4-.5 6.5-5 10-6s5 0 6-.6" opacity=".3"/>{DOT(7.5, 13.2, 1.1)}{DOT(12, 10, 1.5)}{DOT(16.5, 9, 1)}{DOT(10.5, 15.6, .9)}{SP(17.6, 13.4, 2)}',
        'forever': f'<path d="{bubble(12.5, 11, 7.2)}"/>{SP(12.5, 11, 4.3)}',
    },
    # B — 별이 자란다: 하나 떠오르고 → 이어지고 → 모이고 → 가장 밝게
    'B': {
        'today': f'<path d="M3.5 18.5h17" opacity=".45"/><path d="M7 18.5a5 5 0 0 1 10 0" opacity=".7"/>{SP(12, 8.2, 3.6)}<path d="M12 2.6v1" opacity=".5"/>',
        'week': f'<path d="M3.5 15 8 9.5l4 3.5 4.5-6 4 2.5" opacity=".55"/>{DOT(3.5, 15, 1.4)}{DOT(8, 9.5, 1.6)}{DOT(12, 13, 1.4)}{DOT(16.5, 7, 1.8)}{DOT(20.5, 9.5, 1.3)}',
        'year': (f'<path d="M3 17C8 15 9 8 21 6.5" opacity=".35"/>'
                 + ''.join(DOT(x, y, r) for x, y, r in [(5, 15.8, .8), (7.3, 13.4, 1.1), (9.8, 11.2, .9), (11.2, 13.3, .8), (12.6, 9.6, 1.3),
                                                       (14.6, 11, .8), (15.6, 8.4, 1), (17.8, 7.6, 1.2), (19.4, 9.2, .7), (8.6, 15.6, .7)])),
        'forever': f'{SP(11, 13, 7.2)}{SP(18.6, 5.4, 2.6, .75)}',
    },
    # C — 잠든 밤: 아이처럼 잠든 달 → 별자리 → 둥근 은하 → 마음에 간직한 별
    'C': {
        'today': f'<path d="M19 14.5A7.5 7.5 0 1 1 9.5 5a6 6 0 0 0 9.5 9.5Z"/><path d="M8 13.4q1.2 1.2 2.4 0" />{SP(17.2, 5.4, 2.2)}',
        'week': f'<path d="M4 14.5c2.5-3 4.5-5.5 7-5.5s3.5 4 6 4 2.6-3 3-5" opacity=".55"/>{DOT(4, 14.5, 1.5)}{DOT(11, 9, 1.7)}{DOT(17, 13, 1.4)}{SP(20, 7.6, 2.6)}',
        'year': f'<ellipse cx="12" cy="12" rx="9.2" ry="4.2" transform="rotate(-24 12 12)" opacity=".55"/>{SP(12, 12, 3.6)}{DOT(4.6, 14.6, 1)}{DOT(19.2, 8.8, 1.2)}{DOT(16, 15.6, .8)}',
        'forever': f'<path d="M12 20s-7.5-4.6-7.5-10A4.2 4.2 0 0 1 12 7.6 4.2 4.2 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10Z"/>{SP(12, 12.2, 3)}',
    },
}

SETS = [
    ('A', '말에서 별로', '오늘은 앱 아이콘처럼 잠든 얼굴의 말풍선, 평생기억은 별을 품은 말풍선. "아이의 말이 별이 된다"는 흐름이 처음과 끝에서 이어져요.'),
    ('B', '별이 자란다', '오늘 별 하나가 떠오르고 → 일주일이 이어져 별자리 → 한 해가 모여 은하수 → 가장 밝은 별로. 탭을 따라 별이 점점 많아지고 밝아져요.'),
    ('C', '잠든 밤', '아이를 재운 밤의 시간. 오늘은 눈 감은 달, 은하수는 둥근 은하, 평생기억은 마음(하트)에 간직한 별. 가장 다정하고 이야기가 있어요.'),
]
TABS = [('today', '오늘'), ('week', '별자리'), ('year', '은하수'), ('forever', '평생기억')]


def svg(k, t, size):
    return f'<svg width="{size}" height="{size}" viewBox="0 0 24 24" {W}>{ICONS[k][t]}</svg>'


def tabbar(k, active):
    return '<div class="tabbar">' + ''.join(
        f'<div class="tab{" on" if t == active else ""}">{svg(k, t, 22)}<span>{lab}</span></div>' for t, lab in TABS) + '</div>'


cols = []
for k, name, desc in SETS:
    big = ''.join(f'<figure><div class="tile">{svg(k, t, 64)}</div><figcaption>{lab}</figcaption></figure>' for t, lab in TABS)
    bars = ''.join(tabbar(k, t) for t, _ in TABS[:2]) + tabbar(k, 'forever')
    cols.append(f'''<section class="col"><p class="mark">{k}</p><h2>{name}</h2><p class="desc">{desc}</p>
<div class="big">{big}</div><p class="cap">실제 탭 · 22px (선택된 탭만 금빛)</p>{bars}</section>''')

# 지금 쓰는 아이콘 (비교용)
CUR = {
    'today': '<path d="M19 14.5A7.5 7.5 0 1 1 9.5 5a6 6 0 0 0 9.5 9.5Z"/><path d="M15 4.5v3M13.5 6h3" opacity=".7"/>',
    'week': '<path d="M4 16 9 9l5 4 6-7" opacity=".6"/><circle cx="4" cy="16" r="1.6" fill="currentColor"/><circle cx="9" cy="9" r="1.9" fill="currentColor"/><circle cx="14" cy="13" r="1.4" fill="currentColor"/><circle cx="20" cy="6" r="2.2" fill="currentColor"/>',
    'year': '<path d="M3 15c4-1 6-6 10-7s6 1 8-1" opacity=".55"/><path d="M3 18c5-1 7-5 11-6s5 0 7-1" opacity=".3"/><circle cx="7" cy="12.5" r="1.2" fill="currentColor"/><circle cx="12" cy="9.2" r="1.7" fill="currentColor"/><circle cx="17" cy="8.4" r="1.1" fill="currentColor"/>',
    'forever': '<path d="M12 3c.6 4.6 3.4 7.4 8 8-4.6.6-7.4 3.4-8 8-.6-4.6-3.4-7.4-8-8 4.6-.6 7.4-3.4 8-8Z"/>',
}
ICONS['now'] = CUR
now_bar = tabbar('now', 'week')

html = f'''<!doctype html><html lang="ko"><head><meta charset="utf-8">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">
<style>
@font-face {{ font-family: 'MaruBuri'; src: url(https://hangeul.pstatic.net/hangeul_static/webfont/MaruBuri/MaruBuri-Regular.woff2) format('woff2'); }}
* {{ box-sizing: border-box; margin: 0; }}
body {{ width: 1600px; padding: 52px 60px 56px; color: #ece8f6; font-family: 'Pretendard Variable', sans-serif;
  background: radial-gradient(1200px 700px at 50% -10%, rgba(108,111,216,.16), transparent 70%), #070b1d; }}
header {{ display: flex; justify-content: space-between; align-items: end; padding-bottom: 24px; border-bottom: 1px solid rgba(255,255,255,.08); }}
h1 {{ font-family: 'MaruBuri', serif; font-weight: 400; font-size: 30px; }}
header .now {{ display: flex; align-items: center; gap: 14px; color: #75739a; font-size: 12px; }}
header .now .tabbar {{ width: 330px; margin: 0; }}
.flow {{ margin-top: 8px; color: #75739a; font-size: 13px; }}
.grid {{ display: grid; grid-template-columns: repeat(3, 1fr); margin-top: 32px; }}
.col {{ padding: 0 30px; }} .col + .col {{ border-left: 1px solid rgba(255,255,255,.06); }}
.mark {{ color: #ffd98a; font-size: 13px; letter-spacing: .3em; }}
h2 {{ margin-top: 6px; font-family: 'MaruBuri', serif; font-weight: 400; font-size: 23px; }}
.desc {{ margin-top: 8px; min-height: 66px; color: #8f8db3; font-size: 13.5px; line-height: 1.65; word-break: keep-all; }}
.big {{ margin-top: 18px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }}
figure {{ display: flex; flex-direction: column; align-items: center; gap: 10px; }}
.tile {{ width: 100%; aspect-ratio: 1; border-radius: 18px; display: grid; place-items: center; color: #ffe9cf;
  background: rgba(255,255,255,.03); }}
.tile svg {{ filter: drop-shadow(0 0 10px rgba(255,210,150,.35)); }}
figcaption {{ font-size: 13px; color: #b3b0cc; }}
.cap {{ margin: 24px 0 10px; font-size: 11px; letter-spacing: .12em; color: #4e4c74; }}
.tabbar {{ margin-top: 10px; height: 62px; display: grid; grid-template-columns: repeat(4, 1fr); border-radius: 16px;
  background: rgba(7,10,26,.86); border: 1px solid rgba(255,255,255,.06); }}
.tab {{ display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; color: #75739a; font-size: 11px; }}
.tab.on {{ color: #ffe9cf; }} .tab.on svg {{ filter: drop-shadow(0 0 6px rgba(255,210,150,.5)); }}
</style></head><body>
<header><div><h1>하단 탭 아이콘 시안 · A / B / C</h1><p class="flow">오늘의 한마디 → 일주일 별자리 → 한 해 은하수 → 평생 간직할 별</p></div>
<div class="now"><span>지금</span>{now_bar}</div></header>
<div class="grid">{''.join(cols)}</div></body></html>'''
open(os.path.join(OUT, 'board.html'), 'w').write(html)
print('ok')
