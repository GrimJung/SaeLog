# 탭 아이콘 2차: 오늘(A 말풍선 + 더하기) · 별자리(C) · 은하수(나선 은하 시안) · 평생기억(B 별 + 작은 사선 빛)
import math, os
D = os.path.dirname(os.path.abspath(__file__))
SRC = open(os.path.join(D, 'make_gnb.py')).read()
exec(SRC[:SRC.index('ICONS = {')])  # f, sparkle, bubble, W, DOT, SP

def spiral_arm(cx, cy, rot, start, a0, a1, r0, r1, squash=.55, n=40):
    """기울어진 납작한 나선 팔 하나 — 각도가 갈수록 반지름이 커진다"""
    pts = []
    for i in range(n + 1):
        t = i / n
        a = math.radians(start + a0 + (a1 - a0) * t)
        r = r0 + (r1 - r0) * t
        x, y = r * math.cos(a), r * math.sin(a) * squash
        c, s = math.cos(math.radians(rot)), math.sin(math.radians(rot))
        pts.append((cx + x * c - y * s, cy + x * s + y * c))
    d = f'M{f(pts[0][0])} {f(pts[0][1])}' + ''.join(f'L{f(x)} {f(y)}' for x, y in pts[1:])
    return d, pts[-1]

def galaxy(v):
    cx = cy = 12
    rot = -32
    if v == 1:  # 두 팔 나선 + 가운데 빛 — 참고 이미지의 구도를 가장 단순하게
        out = DOT(cx, cy, 2.3)
        for st in (0, 180):
            d, end = spiral_arm(cx, cy, rot, st, 0, 225, 3.6, 10)
            out += f'<path d="{d}"/>'
            out += DOT(round(end[0], 2), round(end[1], 2), 1.15)
        return out
    if v == 2:  # 안쪽 고리 + 바깥 팔 두 개 (속은 진하고 밖은 흐리게) — 깊이감
        out = DOT(cx, cy, 2.1)
        d, _ = spiral_arm(cx, cy, rot, 200, 0, 300, 4.4, 5.2)
        out += f'<path d="{d}" opacity=".9"/>'
        for st in (40, 220):
            d, end = spiral_arm(cx, cy, rot, st, 0, 120, 7.4, 10.4)
            out += f'<path d="{d}" opacity=".55"/>'
        out += DOT(18.9, 6.8, 1) + DOT(5.2, 17.4, 1)
        return out
    # v3 — 가운데가 앱 아이콘의 네 갈래 별인 나선
    out = SP(cx, cy, 3.4)
    for st in (0, 180):
        d, end = spiral_arm(cx, cy, rot, st, 20, 235, 4.6, 10)
        out += f'<path d="{d}" opacity=".8"/>'
        out += DOT(round(end[0], 2), round(end[1], 2), 1)
    return out

BIG = f'<path d="{sparkle(12, 12, 9.4, .2)}" fill="currentColor" stroke="none"/>'  # 허리가 가는 큰 네 갈래

def forever(v):
    if v == 1:  # 큰 네 갈래 별 + 사이사이 작은 네 갈래 (여덟 갈래)
        return f'<path d="{sparkle(12, 12, 7.2, .2)}" transform="rotate(45 12 12)" fill="currentColor" stroke="none" opacity=".65"/>' + BIG
    # v2 — 사이 빛을 가는 선으로 (더 가볍게)
    rays = ''.join(
        f'<path d="M{f(12 + 3.8 * math.cos(math.radians(a)))} {f(12 + 3.8 * math.sin(math.radians(a)))}L{f(12 + 7.2 * math.cos(math.radians(a)))} {f(12 + 7.2 * math.sin(math.radians(a)))}" stroke-width="1.2" opacity=".55"/>'
        for a in (45, 135, 225, 315))
    return rays + BIG

TODAY = f'<path d="{bubble(12.5, 11, 7.2)}"/><path d="M12.5 7.8v6.4M9.3 11h6.4"/>'
WEEK = f'<path d="M4 14.5c2.5-3 4.5-5.5 7-5.5s3.5 4 6 4 2.6-3 3-5" opacity=".55"/>{DOT(4, 14.5, 1.5)}{DOT(11, 9, 1.7)}{DOT(17, 13, 1.4)}{SP(20, 7.6, 2.6)}'

def svg(body, size):
    return f'<svg width="{size}" height="{size}" viewBox="0 0 24 24" {W}>{body}</svg>'

TABS = ['오늘', '별자리', '은하수', '평생기억']
def tabbar(icons, active):
    return '<div class="tabbar">' + ''.join(
        f'<div class="tab{" on" if i == active else ""}">{svg(b, 22)}<span>{lab}</span></div>' for i, (b, lab) in enumerate(zip(icons, TABS))) + '</div>'

def tile(body, cap, sub=''):
    return f'<figure><div class="tile">{svg(body, 64)}</div><figcaption>{cap}</figcaption>{f"<small>{sub}</small>" if sub else ""}</figure>'

G = [(1, '나선 두 팔', '참고 이미지 구도를 가장 단순하게. 22px에서도 소용돌이가 또렷해요.'),
     (2, '안쪽 고리 + 바깥 팔', '속은 진하고 밖은 흐리게 — 깊이감이 있지만 작은 크기에선 조금 복잡해요.'),
     (3, '가운데 별 나선', '중심이 앱 아이콘의 네 갈래 별. 별 탭들과 말투가 이어져요.')]
F = [(1, '사이 작은 별', '큰 네 갈래 사이로 작은 네 갈래가 겹쳐 여덟 갈래 — 앱 속 평생기억 별과 같은 모양.'),
     (2, '사이 가는 빛', '사이 빛을 가는 선으로 — 더 가볍고 반짝이는 느낌.')]

sections = []
sections.append('<section><p class="cap">확정 · 오늘(A + 더하기) · 별자리(C)</p><div class="row">'
                + tile(TODAY, '오늘', '말풍선 + 더하기 = 오늘의 새록 쓰기') + tile(WEEK, '별자리', 'C안 그대로') + '</div></section>')
sections.append('<section><p class="cap">은하수 시안</p><div class="row">'
                + ''.join(tile(galaxy(v), f'은하수 {v} · {n}', s) for v, n, s in G) + '</div></section>')
sections.append('<section><p class="cap">평생기억 시안</p><div class="row">'
                + ''.join(tile(forever(v), f'평생기억 {v} · {n}', s) for v, n, s in F) + '</div></section>')

combos = ''
for gv, *_ in G:
    for fv, *_ in F:
        icons = [TODAY, WEEK, galaxy(gv), forever(fv)]
        combos += f'<div class="combo"><p>은하수 {gv} + 평생기억 {fv}</p>{tabbar(icons, 2)}{tabbar(icons, 3)}</div>'

tpl = open(os.path.join(D, 'board.html')).read()
head = tpl[:tpl.index('</style>')] + '''
.wrap { display: grid; grid-template-columns: 1fr 1fr; gap: 0 56px; margin-top: 30px; }
section { margin-bottom: 26px; }
.row { display: flex; gap: 14px; }
.row figure { width: 150px; align-items: flex-start; }
.row .tile { width: 150px; height: 120px; aspect-ratio: auto; }
.row figcaption { font-size: 13.5px; color: #ece8f6; }
.row small { margin-top: -4px; font-size: 12px; line-height: 1.55; color: #75739a; word-break: keep-all; }
.combos { display: grid; grid-template-columns: 1fr 1fr; gap: 14px 18px; }
.combo p { font-size: 12px; color: #8f8db3; }
.combo .tabbar { margin-top: 6px; }
</style></head>'''
html = (head + '<body><header><div><h1>하단 탭 아이콘 2차</h1><p class="flow">오늘 + · 별자리 C · 은하수 나선 3가지 · 평생기억 여덟 갈래 2가지</p></div></header>'
        f'<div class="wrap"><div>{"".join(sections)}</div><div><p class="cap">실제 탭 22px · 조합별 (은하수/평생기억 선택 상태)</p><div class="combos">{combos}</div></div></div></body></html>')
open(os.path.join(D, 'board2.html'), 'w').write(html)
print('ok')
