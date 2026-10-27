# 새록새록 앱 아이콘 시안 3종을 SVG 로 만든다 (1024×1024).
# python3 design/icon-concepts/make_icons.py
import math, os, random

OUT = os.path.dirname(os.path.abspath(__file__))
NAVY0, NAVY1 = '#080c22', '#1a1d47'
GOLD, WARM, LAV = '#ffd98a', '#fff3d2', '#b9b7ff'


def sparkle(cx, cy, R, k=0.13):
    """네 갈래 반짝임 별 (곡선으로 오목하게)."""
    p = lambda x, y: f'{cx + x:.1f},{cy + y:.1f}'
    c = R * k
    return (f'M{p(0, -R)} C{p(c, -c)} {p(c, -c)} {p(R, 0)} C{p(c, c)} {p(c, c)} {p(0, R)} '
            f'C{p(-c, c)} {p(-c, c)} {p(-R, 0)} C{p(-c, -c)} {p(-c, -c)} {p(0, -R)}Z')


def star(cx, cy, R, glow=2.2, core_op=1.0, gid='glowGold'):
    return (f'<circle cx="{cx}" cy="{cy}" r="{R * glow:.1f}" fill="url(#{gid})"/>'
            f'<path d="{sparkle(cx, cy, R)}" fill="{WARM}" opacity="{core_op}"/>'
            f'<circle cx="{cx}" cy="{cy}" r="{R * 0.11:.1f}" fill="#ffffff"/>')


def dust(seed, avoid, n=26):
    """배경의 아주 작은 별들 — 큰 형태(avoid: [(x,y,r)])를 피해서."""
    R = random.Random(seed)
    out = []
    while len(out) < n:
        x, y = R.uniform(70, 954), R.uniform(70, 954)
        if any(math.hypot(x - ax, y - ay) < ar for ax, ay, ar in avoid):
            continue
        r = R.choice([1.6, 2, 2.4, 3, 3.6])
        op = R.uniform(0.25, 0.7)
        out.append(f'<circle cx="{x:.0f}" cy="{y:.0f}" r="{r}" fill="#dfe3ff" opacity="{op:.2f}"/>')
    return ''.join(out)


DEFS = f'''<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="0.35" y2="1">
    <stop offset="0" stop-color="{NAVY0}"/><stop offset="1" stop-color="{NAVY1}"/>
  </linearGradient>
  <radialGradient id="haze" cx="0.5" cy="0.42" r="0.6">
    <stop offset="0" stop-color="#6c6fd8" stop-opacity="0.16"/><stop offset="1" stop-color="#6c6fd8" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="glowGold">
    <stop offset="0" stop-color="{GOLD}" stop-opacity="0.75"/>
    <stop offset="0.25" stop-color="{GOLD}" stop-opacity="0.28"/>
    <stop offset="1" stop-color="{GOLD}" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="glowLav">
    <stop offset="0" stop-color="{LAV}" stop-opacity="0.6"/>
    <stop offset="0.3" stop-color="{LAV}" stop-opacity="0.18"/>
    <stop offset="1" stop-color="{LAV}" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="goldInk" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#ffe7b0"/><stop offset="1" stop-color="#f3c46e"/>
  </linearGradient>
  <radialGradient id="blush">
    <stop offset="0" stop-color="#ffb18a" stop-opacity="0.55"/><stop offset="1" stop-color="#ffb18a" stop-opacity="0"/>
  </radialGradient>
  <filter id="soft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="14"/></filter>
</defs>'''


def wrap(body, seed, avoid):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">{DEFS}'
            f'<rect width="1024" height="1024" fill="url(#bg)"/><rect width="1024" height="1024" fill="url(#haze)"/>'
            f'{dust(seed, avoid)}{body}</svg>')


# ── A. 말풍선 별 — 아이의 한마디가 별이 된다 ──
def concept_a():
    L, R, T, B, r = 222, 802, 250, 700, 210
    tail = f'H{L + r + 70} L{L + 70},{B + 92} L{L + r - 4},{B - 4}'
    bubble = (f'M{L + r},{T} H{R - r} A{r},{r} 0 0 1 {R},{T + r} V{B - r} A{r},{r} 0 0 1 {R - r},{B} '
              f'{tail} A{r},{r} 0 0 1 {L},{B - r} V{T + r} A{r},{r} 0 0 1 {L + r},{T}Z')
    body = (f'<path d="{bubble}" fill="{GOLD}" fill-opacity="0.05" stroke="{GOLD}" stroke-width="40" '
            f'stroke-linejoin="round" opacity="0.35" filter="url(#soft)"/>'
            f'<path d="{bubble}" fill="none" stroke="{GOLD}" stroke-width="22" stroke-linejoin="round"/>'
            + star(512, 475, 138)
            + f'<path d="{sparkle(655, 352, 30)}" fill="{WARM}" opacity="0.75"/>')
    return wrap(body, 11, [(512, 480, 380), (300, 800, 90)])


# ── B. 떠오르는 기록 — 펼친 공책에서 별이 떠오른다 ──
def concept_b():
    sx, top, bot = 512, 640, 790
    left = f'M{sx},{top} C{sx - 70},{top - 44} {sx - 220},{top - 52} {sx - 300},{top - 22} V{bot - 26} C{sx - 220},{bot - 52} {sx - 70},{bot - 44} {sx},{bot}Z'
    right = f'M{sx},{top} C{sx + 70},{top - 44} {sx + 220},{top - 52} {sx + 300},{top - 22} V{bot - 26} C{sx + 220},{bot - 52} {sx + 70},{bot - 44} {sx},{bot}Z'
    lines = ''
    for i, dy in enumerate([40, 78]):
        w = 150 if i == 0 else 110
        lines += (f'<path d="M{sx - 250},{top - 10 + dy} C{sx - 200},{top - 26 + dy} {sx - 140},{top - 30 + dy} {sx - 250 + w},{top - 22 + dy}" '
                  f'fill="none" stroke="{LAV}" stroke-width="12" stroke-linecap="round" opacity="0.45"/>')
        lines += (f'<path d="M{sx + 250},{top - 10 + dy} C{sx + 200},{top - 26 + dy} {sx + 140},{top - 30 + dy} {sx + 250 - w},{top - 22 + dy}" '
                  f'fill="none" stroke="{LAV}" stroke-width="12" stroke-linecap="round" opacity="0.45"/>')
    # 공책 가운데에서 별까지 이어지는 빛의 점들 — 위로 갈수록 크고 밝게
    trail = ''
    pts = [(512, 588, 7, 0.35), (520, 540, 8, 0.45), (534, 494, 9.5, 0.6), (548, 450, 11, 0.75)]
    for x, y, rr, op in pts:
        trail += f'<circle cx="{x}" cy="{y}" r="{rr}" fill="{WARM}" opacity="{op}"/>'
    book = (f'<path d="{left}" fill="{LAV}" fill-opacity="0.07" stroke="{LAV}" stroke-width="18" stroke-linejoin="round"/>'
            f'<path d="{right}" fill="{LAV}" fill-opacity="0.07" stroke="{LAV}" stroke-width="18" stroke-linejoin="round"/>'
            f'<path d="M{sx},{top} V{bot}" stroke="{LAV}" stroke-width="18" stroke-linecap="round"/>')
    body = (f'<ellipse cx="512" cy="{bot - 40}" rx="330" ry="80" fill="url(#glowLav)" opacity="0.6"/>'
            + book + lines + trail + star(560, 318, 120))
    return wrap(body, 23, [(512, 700, 360), (560, 320, 230), (530, 520, 80)])


# ── C. 따옴표 별자리 — 아이의 말을 여는 따옴표가 별자리가 된다 ──
def quote(cx, cy, r):
    p = lambda x, y: f'{cx + x * r:.1f},{cy + y * r:.1f}'
    return (f'M{p(-0.97, -0.22)} C{p(-0.97, -1.35)} {p(-0.35, -2.05)} {p(0.62, -2.32)} '
            f'C{p(0.12, -1.9)} {p(-0.05, -1.4)} {p(0.36, -0.93)} A{r},{r} 0 1 1 {p(-0.97, -0.22)}Z')


def concept_c():
    r = 92
    q1, q2 = (400, 632), (628, 632)
    tip1 = (q1[0] + 0.62 * r, q1[1] - 2.32 * r)
    tip2 = (q2[0] + 0.62 * r, q2[1] - 2.32 * r)
    st = (792, 258)
    line = (f'<path d="M{tip1[0]:.0f},{tip1[1]:.0f} L{tip2[0]:.0f},{tip2[1]:.0f} L{st[0]},{st[1]}" fill="none" '
            f'stroke="{LAV}" stroke-width="7" stroke-linecap="round" stroke-dasharray="2 22" opacity="0.8"/>')
    glyphs = ''
    for (x, y) in (q1, q2):
        glyphs += f'<circle cx="{x}" cy="{y}" r="{r * 2.2}" fill="url(#glowGold)" opacity="0.8"/>'
    for (x, y) in (q1, q2):
        glyphs += f'<path d="{quote(x, y, r)}" fill="url(#goldInk)"/>'
    tips = ''.join(f'<circle cx="{x:.0f}" cy="{y:.0f}" r="9" fill="{WARM}" opacity="0.9"/>' for x, y in (tip1, tip2))
    body = line + glyphs + tips + star(st[0], st[1], 74)
    return wrap(body, 37, [(510, 560, 330), (790, 262, 170)])


# ── B. 잠든 아이의 말 — 한 줄로 이어 그린 말풍선 얼굴. 머리 위 곱슬이 새싹처럼 말려 오르고, 그 곁에 별이 뜬다 ──
def concept_b2():
    cx, cy, R = 512, 548, 282
    P = lambda deg, rr=R: (cx + rr * math.cos(math.radians(deg)), cy + rr * math.sin(math.radians(deg)))
    f = lambda pt: f'{pt[0]:.1f},{pt[1]:.1f}'
    s0 = P(292)            # 오른쪽 위에서 시작 (곱슬과 살짝 떨어진 열린 끝)
    t0 = P(117)            # 꼬리 시작 (밑동을 좁게)
    t1 = P(134)            # 꼬리 끝나고 다시 원으로
    tip = P(131, R + 98)   # 꼬리 끝 — 가늘게 쭉 빠진다 (왼쪽 아래)
    c0 = P(122, R + 34)    # 바깥 선만 아주 살짝 휘게
    e0 = P(248)            # 왼쪽 위 — 여기서 곱슬로 이어진다
    line = (f'M{f(s0)} A{R},{R} 0 1 1 {f(t0)} '
            f'Q{f(c0)} {f(tip)} L{f(t1)} '
            f'A{R},{R} 0 0 1 {f(e0)} '
            f'C{e0[0] - 6:.1f},{e0[1] - 78:.1f} {e0[0] + 70:.1f},{e0[1] - 128:.1f} {e0[0] + 122:.1f},{e0[1] - 96:.1f} '
            f'C{e0[0] + 172:.1f},{e0[1] - 64:.1f} {e0[0] + 150:.1f},{e0[1] - 2:.1f} {e0[0] + 108:.1f},{e0[1] - 6:.1f} '
            f'C{e0[0] + 78:.1f},{e0[1] - 9:.1f} {e0[0] + 72:.1f},{e0[1] - 40:.1f} {e0[0] + 92:.1f},{e0[1] - 52:.1f}')
    stroke = f'fill="none" stroke="{GOLD}" stroke-linecap="round" stroke-linejoin="round"'
    face = (
        # 감은 눈 ︶ ︶ — 앱 아이콘 크기에서도 보이게 크고 굵게
        f'<path d="M{cx - 156},{cy - 22} Q{cx - 103},{cy + 40} {cx - 50},{cy - 22}" {stroke} stroke-width="38"/>'
        f'<path d="M{cx + 50},{cy - 22} Q{cx + 103},{cy + 40} {cx + 156},{cy - 22}" {stroke} stroke-width="38"/>'
        # 오물거리는 입
        f'<path d="M{cx - 52},{cy + 98} Q{cx},{cy + 142} {cx + 52},{cy + 98}" {stroke} stroke-width="34"/>'
        # 볼의 온기
        f'<ellipse cx="{cx - 172}" cy="{cy + 72}" rx="40" ry="24" fill="url(#blush)"/>'
        f'<ellipse cx="{cx + 172}" cy="{cy + 72}" rx="40" ry="24" fill="url(#blush)"/>'
    )
    body = (f'<path d="{line}" {stroke} stroke-width="56" opacity="0.28" filter="url(#soft)"/>'
            f'<path d="{line}" {stroke} stroke-width="34"/>'
            + face + star(722, 196, 66))
    return wrap(body, 41, [(512, 560, 380), (722, 196, 150)])


for name, fn in (('a-speech-star', concept_a), ('b-sleepy-word', concept_b2), ('c-quote-constellation', concept_c)):
    with open(os.path.join(OUT, f'{name}.svg'), 'w') as f:
        f.write(fn())
print('ok')
