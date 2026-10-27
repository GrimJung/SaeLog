# 뭉클을 피식과 더 다르게: ① 빛 번짐 키우기 ② 작은 네 갈래 빛 ③ 둘을 조금씩
import os, random
D = os.path.dirname(os.path.abspath(__file__))
SRC = open(os.path.join(D, 'make_stars3.py')).read()
exec(SRC[:SRC.index('OPTS = [')])  # sym, orb, halo, ray, ray_defs, forever, S ...


def mungkeul(v):
    u = f'M{v}'
    if v == 0:  # 지금
        return sym('A', 'mungkeul')
    if v == 1:  # 빛 번짐을 키운다 — 넓고 진한 따뜻한 빛 + 은은한 빛 고리
        d1, h1 = halo(u + 'w', '#ffb878', 50, .42)
        d2, h2 = halo(u, '#ffd2a0', 30, .6)
        d3, o = orb(u, 15.5, '#fffaf2', '#ffd9b8', '#d59a72')
        ring = f'<circle r="25" fill="none" stroke="#ffe0c0" stroke-width="2" opacity=".25" filter="url(#{u}g)"/>'
        return d1 + d2 + d3 + blur(u + 'g', 1.6), h1 + ring + h2 + o
    if v == 2:  # 작은 네 갈래 빛 — 평생기억(여덟 갈래)으로 가는 중간 단계
        d1, h = halo(u, '#ffc890', 44, .5)
        d2, o = orb(u, 14, '#fffaf2', '#ffd9b8', '#d59a72')
        r = ray(u, 0, 34, 6.5, 0, .85) + ray(u, 90, 34, 6.5, 0, .85)
        return d1 + d2 + ray_defs(u, '#fff0dc'), h + r + o
    # 둘을 조금씩 — 번짐은 한 단계 넓게, 빛줄기는 짧고 흐리게
    d1, h1 = halo(u + 'w', '#ffb878', 50, .32)
    d2, h2 = halo(u, '#ffd2a0', 30, .55)
    d3, o = orb(u, 14.5, '#fffaf2', '#ffd9b8', '#d59a72')
    r = ray(u, 0, 28, 5.5, 0, .6) + ray(u, 90, 28, 5.5, 0, .6)
    return d1 + d2 + d3 + ray_defs(u, '#fff0dc'), h1 + h2 + r + o


OPTS = [
    (0, '지금', '구슬 + 따뜻한 빛. 작은 크기에선 피식과 색만 다르게 보여요.'),
    (1, '빛 번짐 키우기', '따뜻한 빛을 두 겹으로 넓게 번지게. 모양은 둥근 그대로, "마음이 찡하게 퍼지는" 느낌.'),
    (2, '작은 네 갈래 빛', '짧은 십자 빛줄기를 더해 피식(점) → 뭉클(네 갈래) → 평생기억(여덟 갈래)로 단계가 또렷해져요.'),
    (3, '둘을 조금씩', '번짐을 한 단계 넓히고 짧고 흐린 빛줄기를 살짝. 은은함은 지키면서 구분은 확실하게.'),
]
P, F = sym('A', 'pisik'), forever(1)
for v, *_ in OPTS[1:]:
    open(os.path.join(D, f'v4-mungkeul-{v}.svg'), 'w').write(S(mungkeul(v), 100).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" '))

def sky(v):
    random.seed(11)
    out = []
    for kind, n, s in [('p', 14, (9, 12)), ('m', 7, (18, 22)), ('f', 2, (30, 34))]:
        for _ in range(n):
            x, y, sz = random.uniform(5, 92), random.uniform(10, 88), random.uniform(*s)
            db = P if kind == 'p' else mungkeul(v) if kind == 'm' else F
            out.append(f'<span style="left:{x:.1f}%;top:{y:.1f}%">{S(db, round(sz))}</span>')
    return ''.join(out)

LV = [('피식', '완전 빵 터졌어'), ('뭉클', '마음이 찡했어'), ('평생기억', '평생 잊지 않을게')]
cols = []
for v, name, desc in OPTS:
    trio = [P, mungkeul(v), F]
    big = ''.join(f'<figure>{S(t, 96)}<figcaption>{lab}</figcaption></figure>' for t, (lab, _) in zip(trio, LV))
    chips = ''.join(f'<div class="chip{" on" if i == 1 else ""}">{S(t, 30)}<b>{lab}</b><small>{sub}</small></div>' for i, (t, (lab, sub)) in enumerate(zip(trio, LV)))
    rows = ''.join(f'<div class="row">{S(t, 24)}<span>{x}</span></div>' for t, x in zip(trio, ['공룡은 왜 코가 없어?', '엄마 아프지 마', '아빠 사랑해 우주만큼']))
    cols.append(f'''<section class="col{" now" if v == 0 else ""}">
  <p class="mark">{"지금" if v == 0 else "뭉클 " + str(v)}</p><h2>{name}</h2><p class="desc">{desc}</p>
  <div class="big">{big}</div>
  <p class="cap">기록 칩</p><div class="chips">{chips}</div>
  <p class="cap">목록</p><div class="rows">{rows}</div>
  <p class="cap">하늘</p><div class="sky">{sky(v)}</div>
</section>''')

tpl = open(os.path.join(D, 'board2.html')).read()
head = tpl[:tpl.index('<body>')].replace('width: 1500px', 'width: 1900px').replace('repeat(3, 1fr)', 'repeat(4, 1fr)')
head = head.replace('</style>', '.col { padding: 0 26px; } .col.now { opacity: .8; } .row svg { margin: -5px; } .big figure svg { width: 84px; height: 84px; }</style>')
html = (head + '<body><header><h1>뭉클 다듬기 · 피식과 더 다르게</h1><p>피식·평생기억은 그대로 · 뭉클만 바꿔 비교</p></header>'
        f'<div class="grid">{"".join(cols)}</div></body></html>')
open(os.path.join(D, 'board4.html'), 'w').write(html)
print('ok')
