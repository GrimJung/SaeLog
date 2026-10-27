# 1안(진주빛 구슬) 다듬기: 평생기억이 뭉클보다 한 단계 더 '별처럼' 빛줄기를 뿜도록 — 3가지 빛줄기
import os, random
SRC = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'make_stars2.py')).read()
exec(SRC[:SRC.index('SETS = [')])  # sparkle, halo, blur, orb, sym ... 재사용

OUT = os.path.dirname(os.path.abspath(__file__))


def ray(u, ang, length, width, color, op, flt='rb'):
    """가운데가 밝고 끝으로 갈수록 사라지는 가는 빛줄기"""
    return (f'<g transform="rotate({ang})"><path d="M{-length},0 Q0,{-width} {length},0 Q0,{width} {-length},0Z" '
            f'fill="url(#{u}ray)" opacity="{op}" filter="url(#{u}{flt})"/></g>')


def ray_defs(u, color):
    return (f'<linearGradient id="{u}ray"><stop offset="0" stop-color="{color}" stop-opacity="0"/>'
            f'<stop offset=".5" stop-color="{color}"/><stop offset="1" stop-color="{color}" stop-opacity="0"/></linearGradient>'
            + blur(u + 'rb', .7))


def forever(v):
    u = f'F{v}'
    d1, h = halo(u, '#ffc46e', 50, .62)
    d2, o = orb(u, 13.5, '#fffbea', '#ffdc93', '#d39a45')
    d = d1 + d2 + ray_defs(u, '#fff0c8')
    if v == 1:  # 여덟 갈래 — 긴 십자 + 짧은 사선 (밤하늘 별 사진의 빛 번짐)
        # 빛줄기 가장자리를 부드럽게: 넓고 흐린 빛 위에 가늘고 덜 흐린 빛을 겹친다
        d += blur(u + 'soft', 3.4) + blur(u + 'mid', 1.6)
        r = ''.join(ray(u, a, 50, 12, 0, .36, 'soft') + ray(u, a, 48, 4.5, 0, .95, 'mid') for a in (0, 90))
        r += ''.join(ray(u, a, 32, 11, 0, .28, 'soft') + ray(u, a, 30, 5, 0, .6, 'mid') for a in (45, -45))
        return d, h + r + o
    if v == 2:  # 빛줄기 + 퍼져 나가는 빛의 물결 (은은한 고리 두 겹)
        d += blur(u + 'w', 1.2)
        waves = (f'<circle r="27" fill="none" stroke="#ffe3a8" stroke-width="2.2" opacity=".35" filter="url(#{u}w)"/>'
                 f'<circle r="40" fill="none" stroke="#ffe3a8" stroke-width="1.6" opacity=".18" filter="url(#{u}w)"/>')
        r = ray(u, 0, 49, 8.5, 0, 1) + ray(u, 90, 49, 8.5, 0, 1)
        return d, h + waves + r + o
    # v3 반짝임 — 길이가 다른 여섯 갈래 + 아이콘의 네 갈래 별이 겹쳐 '반짝' 하는 순간
    d += blur(u + 's', 1.3)
    r = (ray(u, 0, 50, 8, 0, 1) + ray(u, 90, 45, 8, 0, 1) + ray(u, 30, 28, 5, 0, .55)
         + ray(u, -60, 24, 4.6, 0, .5) + ray(u, 120, 22, 4.4, 0, .45))
    sp = f'<path d="{sparkle(30, 5.5)}" fill="#ffe7b0" opacity=".9" filter="url(#{u}s)"/>'
    return d, h + r + sp + o


def S(defs_body, size):
    d, b = defs_body
    return f'<svg width="{size}" height="{size}" viewBox="-50 -50 100 100" aria-hidden="true"><defs>{d}</defs>{b}</svg>'


OPTS = [
    (1, '여덟 갈래 빛', '긴 십자와 짧은 사선이 함께 뻗어요. 밤하늘 사진 속 밝은 별처럼 가장 "별다운" 모양.'),
    (2, '빛의 물결', '십자 빛줄기에 둥글게 퍼져 나가는 빛의 고리가 은은하게. "평생" 오래 울리는 느낌.'),
    (3, '반짝이는 순간', '길이가 다른 빛줄기와 아이콘의 네 갈래 별이 겹쳐, 막 반짝인 순간처럼 살아 있어요.'),
]
P, M = sym('A', 'pisik'), sym('A', 'mungkeul')

for v, *_ in OPTS:
    open(os.path.join(OUT, f'v3-forever-{v}.svg'), 'w').write(S(forever(v), 100).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" '))

random.seed(7)
def sky(v):
    out = []
    for kind, n, s in [('p', 14, (9, 12)), ('m', 6, (16, 20)), ('f', 2, (34, 40))]:
        for _ in range(n):
            x, y, sz = random.uniform(4, 92), random.uniform(10, 86), random.uniform(*s)
            db = P if kind == 'p' else M if kind == 'm' else forever(v)
            out.append(f'<span style="left:{x:.1f}%;top:{y:.1f}%">{S(db, round(sz))}</span>')
    return ''.join(out)

LV = [('피식', '완전 빵 터졌어'), ('뭉클', '마음이 찡했어'), ('평생기억', '평생 잊지 않을게')]
cols = []
for v, name, desc in OPTS:
    trio = [P, M, forever(v)]
    big = ''.join(f'<figure>{S(t, 96)}<figcaption>{lab}</figcaption></figure>' for t, (lab, _) in zip(trio, LV))
    chips = ''.join(f'<div class="chip{" on" if i == 2 else ""}">{S(t, 30)}<b>{lab}</b><small>{sub}</small></div>' for i, (t, (lab, sub)) in enumerate(zip(trio, LV)))
    rows = ''.join(f'<div class="row">{S(t, 16)}<span>{x}</span></div>' for t, x in zip(trio, ['공룡은 왜 코가 없어?', '엄마 아프지 마, 내가 호 해줄게', '아빠 사랑해 우주만큼']))
    cols.append(f'''<section class="col">
  <p class="mark">1-{v}</p><h2>{name}</h2><p class="desc">{desc}</p>
  <div class="big">{big}</div>
  <p class="cap">기록 칩</p><div class="chips">{chips}</div>
  <p class="cap">목록</p><div class="rows">{rows}</div>
  <p class="cap">하늘</p><div class="sky">{sky(v)}</div>
</section>''')

tpl = open(os.path.join(OUT, 'board2.html')).read()
head = tpl[:tpl.index('<body>')]
html = (head + '<body><header><h1>별 심볼 1안 · 평생기억 다듬기</h1><p>피식·뭉클은 1안 그대로 · 평생기억의 빛줄기 3가지</p></header>'
        f'<div class="grid">{"".join(cols)}</div></body></html>')
open(os.path.join(OUT, 'board3.html'), 'w').write(html)
print('ok')
