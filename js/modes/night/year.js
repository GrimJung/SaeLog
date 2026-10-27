// 1년 = 은하수. 한 달 = 성단. 줌인/줌아웃.
// 줌아웃해도 평생기억(1등성)은 최소 크기를 보장해 묻히지 않게 한다.
import { setupCanvas, makeBackdrop, drawStar, rng, hash, gauss, loop, clamp } from '../../sky.js';
import * as D from '../../date.js';

const LONG = 3000;
const SHORT = 1500;
const BASE = { pisik: 2.6, mungkeul: 4.2, forever: 6.4 }; // 월드 단위 반지름
const MINR = { pisik: 0.55, mungkeul: 1.15, forever: 3.2 }; // 화면 최소 px
const MAXR = { pisik: 4, mungkeul: 6.5, forever: 10 };
const CLUSTER_R = 125;

export function mountYear(el, { store, showEntry, state }) {
  let year = state.year || new Date().getFullYear();
  el.innerHTML = `
    <div class="sky sky-year">
      <canvas aria-label="한 해 은하수"></canvas>
      <div class="year-head">
        <button class="nav" data-step="-1" aria-label="지난 해">‹</button>
        <div class="title"><h2></h2><p></p></div>
        <button class="nav" data-step="1" aria-label="다음 해">›</button>
      </div>
      <div class="zoom-ctl">
        <button data-z="out" aria-label="축소">−</button>
        <button data-z="fit">전체</button>
        <button data-z="in" aria-label="확대">+</button>
      </div>
    </div>`;

  const canvas = el.querySelector('canvas');
  let world = null; // { vertical, W, H, centers, dust, haze }
  let stars = [];
  let backdrop = null;
  const cam = { x: 0, y: 0, s: 1 };
  let fitS = 1;
  let tween = null;

  const cv = setupCanvas(canvas, ({ w, h }) => {
    backdrop = null;
    const vertical = h > w;
    if (!world || world.vertical !== vertical) {
      world = buildWorld(vertical);
      placeStars();
      fit(false);
    } else {
      fitS = computeFit();
      clampCam();
    }
  });

  // ── 월드 ──
  function curve(u) {
    // 은하수 띠의 중심선 (긴 축 a, 짧은 축 b)
    return { a: 240 + u * (LONG - 480), b: SHORT / 2 + Math.sin(u * Math.PI * 1.6 + 0.2) * 330 };
  }
  function buildWorld(vertical) {
    const toXY = (a, b) => (vertical ? { x: b, y: a } : { x: a, y: b });
    const W = vertical ? SHORT : LONG;
    const H = vertical ? LONG : SHORT;
    const centers = Array.from({ length: 12 }, (_, m) => {
      const c = curve(m / 11);
      return toXY(c.a, c.b);
    });

    const R = rng(7);
    const N = 3600;
    const dust = { x: new Float32Array(N), y: new Float32Array(N), s: new Float32Array(N), a: new Float32Array(N), c: new Uint8Array(N) };
    for (let i = 0; i < N; i++) {
      const c = curve(R() * 1.12 - 0.06);
      const p = toXY(c.a + gauss(R) * 40, c.b + gauss(R) * 150);
      dust.x[i] = p.x;
      dust.y[i] = p.y;
      dust.s[i] = 0.4 + R() * 0.9;
      dust.a[i] = 0.06 + R() * 0.32;
      dust.c[i] = Math.floor(R() * 3);
    }

    // 은하수 안개 (저해상도 오프스크린)
    const k = 0.3;
    const haze = document.createElement('canvas');
    haze.width = Math.round(W * k);
    haze.height = Math.round(H * k);
    const g = haze.getContext('2d');
    g.scale(k, k);
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 160; i++) {
      const c = curve(R() * 1.1 - 0.05);
      const p = toXY(c.a, c.b + gauss(R) * 60);
      const rad = 140 + R() * 160;
      const warm = R() < 0.25;
      const gr = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, rad);
      gr.addColorStop(0, warm ? 'rgba(200,150,170,0.045)' : 'rgba(110,115,220,0.05)');
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr;
      g.fillRect(p.x - rad, p.y - rad, rad * 2, rad * 2);
    }
    for (const p of centers) {
      const gr = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, CLUSTER_R * 1.5);
      gr.addColorStop(0, 'rgba(180,170,255,0.07)');
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr;
      g.fillRect(p.x - 200, p.y - 200, 400, 400);
    }
    return { vertical, W, H, centers, dust, haze };
  }

  function placeStars() {
    if (!world) return;
    const list = store.inYear(year);
    stars = list.map((e) => {
      const d = D.fromKey(e.date);
      const m = d.getMonth();
      const i = d.getDate() - 1;
      const R = rng(hash(`${year}-${m}`));
      const rot = R() * 6.283;
      const Rd = rng(hash(e.date));
      const ang = i * 2.39996 + rot + (Rd() - 0.5) * 0.3;
      const rad = 20 * Math.sqrt(i + 0.6) + (Rd() - 0.5) * 6;
      const c = world.centers[m];
      return { x: c.x + Math.cos(ang) * rad, y: c.y + Math.sin(ang) * rad, e, ph: Rd() * 6.28, day: i + 1 };
    });
    // 평생기억이 위에 그려지도록
    const order = { pisik: 0, mungkeul: 1, forever: 2 };
    stars.sort((a, b) => order[a.e.level] - order[b.e.level]);

    el.querySelector('h2').textContent = `${year}년 은하수`;
    const nf = list.filter((e) => e.level === 'forever').length;
    el.querySelector('.title p').textContent = list.length ? `별 ${list.length}개 · 1등성 ${nf}개` : '아직 고요한 하늘';
    el.querySelector('[data-step="1"]').disabled = year >= new Date().getFullYear();
  }

  // ── 카메라 ──
  // 위쪽 제목(≈64px)과 아래 줌 버튼(≈60px)을 피해서 맞춘다
  const HEAD = 64;
  const FOOT = 60;
  function computeFit() {
    return Math.min((cv.w - 24) / world.W, (cv.h - HEAD - FOOT) / (world.H - 160));
  }
  function clampCam() {
    cam.x = clamp(cam.x, 0, world.W);
    cam.y = clamp(cam.y, 0, world.H);
    cam.s = clamp(cam.s, fitS * 0.8, fitS * 16);
  }
  function fit(animate = true) {
    fitS = computeFit();
    flyTo(world.W / 2, world.H / 2 - (HEAD - FOOT) / 2 / fitS, fitS, animate);
  }
  function flyTo(x, y, s, animate = true) {
    if (!animate) {
      Object.assign(cam, { x, y, s });
      clampCam();
      return;
    }
    tween = { from: { ...cam }, to: { x, y, s }, t0: performance.now(), dur: 650 };
  }
  function zoomAt(sx, sy, f) {
    tween = null;
    const wx = (sx - cv.w / 2) / cam.s + cam.x;
    const wy = (sy - cv.h / 2) / cam.s + cam.y;
    cam.s = clamp(cam.s * f, fitS * 0.8, fitS * 16);
    cam.x = wx - (sx - cv.w / 2) / cam.s;
    cam.y = wy - (sy - cv.h / 2) / cam.s;
    clampCam();
  }
  const toScreen = (x, y) => ({ x: (x - cam.x) * cam.s + cv.w / 2, y: (y - cam.y) * cam.s + cv.h / 2 });
  const starR = (lv) => clamp(BASE[lv] * cam.s, MINR[lv], MAXR[lv]);

  // ── 입력 ──
  const pointers = new Map();
  let moved = false;
  let pinch = null;
  const local = (ev) => {
    const r = canvas.getBoundingClientRect();
    return { x: ev.clientX - r.left, y: ev.clientY - r.top };
  };
  canvas.addEventListener('pointerdown', (ev) => {
    canvas.setPointerCapture(ev.pointerId);
    pointers.set(ev.pointerId, local(ev));
    if (pointers.size === 1) moved = false;
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), s: cam.s };
      moved = true;
    }
  });
  canvas.addEventListener('pointermove', (ev) => {
    if (!pointers.has(ev.pointerId)) return;
    const prev = pointers.get(ev.pointerId);
    const cur = local(ev);
    pointers.set(ev.pointerId, cur);
    if (pointers.size === 1) {
      const dx = cur.x - prev.x;
      const dy = cur.y - prev.y;
      if (Math.abs(dx) + Math.abs(dy) > 0.5) {
        if (!moved && Math.hypot(dx, dy) < 4) return;
        moved = true;
        tween = null;
        cam.x -= dx / cam.s;
        cam.y -= dy / cam.s;
        clampCam();
      }
    } else if (pointers.size === 2 && pinch) {
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      zoomAt(mid.x, mid.y, (pinch.s * d) / pinch.d / cam.s);
    }
  });
  const up = (ev) => {
    const p = pointers.get(ev.pointerId);
    pointers.delete(ev.pointerId);
    if (pointers.size < 2) pinch = null;
    if (p && !moved && pointers.size === 0) tap(p.x, p.y);
  };
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', (ev) => {
    pointers.delete(ev.pointerId);
    pinch = null;
  });
  canvas.addEventListener('wheel', (ev) => {
    ev.preventDefault();
    const p = local(ev);
    zoomAt(p.x, p.y, Math.exp(-ev.deltaY * 0.0018));
  }, { passive: false });
  canvas.addEventListener('dblclick', (ev) => {
    const p = local(ev);
    zoomAt(p.x, p.y, 2);
  });

  function tap(x, y) {
    let best = null;
    let bd = Infinity;
    const far = cam.s < fitS * 2;
    for (const st of stars) {
      const p = toScreen(st.x, st.y);
      const d = Math.hypot(p.x - x, p.y - y);
      // 멀리서는 1등성만 바로 열리고, 나머지는 성단 확대로 넘어간다
      const reach = far ? (st.e.level === 'forever' ? 16 : 0) : Math.max(18, starR(st.e.level) * 2.5);
      if (d < reach && d - (st.e.level === 'forever' ? 6 : 0) < bd) (bd = d), (best = st);
    }
    if (best) return showEntry(best.e);
    // 멀리서 성단을 누르면 그 달로 날아간다
    if (cam.s < fitS * 2.5) {
      world.centers.forEach((c, m) => {
        const p = toScreen(c.x, c.y);
        const d = Math.hypot(p.x - x, p.y - y);
        if (d < CLUSTER_R * cam.s + 24 && d < bd) (bd = d), (best = c);
      });
      if (best) flyTo(best.x, best.y, Math.min(fitS * 5, Math.min(cv.w, cv.h) / (CLUSTER_R * 3)));
    }
  }

  el.querySelectorAll('.year-head .nav').forEach((b) =>
    b.addEventListener('click', () => {
      year += +b.dataset.step;
      state.year = year;
      placeStars();
      fit();
    })
  );
  el.querySelector('.zoom-ctl').addEventListener('click', (ev) => {
    const z = ev.target.closest('button')?.dataset.z;
    if (z === 'fit') fit();
    else if (z === 'in') flyTo(cam.x, cam.y, clamp(cam.s * 1.8, fitS * 0.8, fitS * 16));
    else if (z === 'out') flyTo(cam.x, cam.y, clamp(cam.s / 1.8, fitS * 0.8, fitS * 16));
  });

  // ── 그리기 ──
  const DUST = ['200,205,255', '170,180,255', '255,225,205'];
  const ease = (x) => 1 - Math.pow(1 - x, 3);

  function draw(t) {
    const { ctx, w, h, dpr } = cv;
    if (!w || !world) return;
    if (tween) {
      const f = ease(clamp((t - tween.t0) / tween.dur, 0, 1));
      for (const k of ['x', 'y']) cam[k] = tween.from[k] + (tween.to[k] - tween.from[k]) * f;
      cam.s = Math.exp(Math.log(tween.from.s) + (Math.log(tween.to.s) - Math.log(tween.from.s)) * f);
      if (f >= 1) (tween = null), clampCam();
    }
    if (!backdrop) backdrop = makeBackdrop(w, h, dpr, hash('year'));
    ctx.drawImage(backdrop, 0, 0, w, h);

    // 안개
    const o = toScreen(0, 0);
    ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(world.haze, o.x, o.y, world.W * cam.s, world.H * cam.s);

    // 먼지 별 (기록 아님 — 분위기)
    const { dust } = world;
    const ds = clamp(cam.s * 1.6, 0.5, 2.2);
    for (let i = 0; i < dust.x.length; i++) {
      const x = (dust.x[i] - cam.x) * cam.s + w / 2;
      const y = (dust.y[i] - cam.y) * cam.s + h / 2;
      if (x < -2 || y < -2 || x > w + 2 || y > h + 2) continue;
      ctx.fillStyle = `rgba(${DUST[dust.c[i]]},${dust.a[i]})`;
      const s = dust.s[i] * ds;
      ctx.fillRect(x, y, s, s);
    }

    // 기록 별
    const zoomed = cam.s / fitS;
    for (const st of stars) {
      const p = toScreen(st.x, st.y);
      const r = starR(st.e.level);
      const pad = r * 10;
      if (p.x < -pad || p.y < -pad || p.x > w + pad || p.y > h + pad) continue;
      const tw = 0.8 + 0.2 * Math.sin(t * 0.0014 + st.ph);
      const base = st.e.level === 'pisik' ? clamp(0.45 + zoomed * 0.12, 0.45, 0.85) : 1;
      drawStar(ctx, p.x, p.y, st.e.level, r, base * tw);
    }
    ctx.globalCompositeOperation = 'source-over';

    // 달 이름
    // 세로 배치에선 성단 옆, 가로 배치에선 성단 위에 (구불구불한 띠의 바깥쪽으로)
    ctx.font = '12px "Gowun Batang", serif';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = `rgba(214,210,240,${clamp(0.75 - zoomed * 0.04, 0.35, 0.7)})`;
    world.centers.forEach((c, m) => {
      const p = toScreen(c.x, c.y);
      const off = CLUSTER_R * cam.s * 0.9 + 10;
      if (world.vertical) {
        const left = c.x > world.W / 2;
        ctx.textAlign = left ? 'right' : 'left';
        ctx.fillText(`${m + 1}월`, p.x + (left ? -off : off), p.y);
      } else {
        const up = c.y < world.H / 2;
        ctx.textAlign = 'center';
        ctx.fillText(`${m + 1}월`, p.x, p.y + (up ? -off : off));
      }
    });
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';

    // 많이 확대하면 날짜
    if (zoomed > 4.5) {
      ctx.font = '10px "Gowun Dodum", sans-serif';
      ctx.fillStyle = `rgba(200,200,232,${clamp((zoomed - 4.5) / 2, 0, 0.5)})`;
      for (const st of stars) {
        const p = toScreen(st.x, st.y);
        if (p.x < 0 || p.y < 0 || p.x > w || p.y > h) continue;
        ctx.fillText(st.day, p.x, p.y + starR(st.e.level) + 13);
      }
    }
  }

  const stop = loop(draw);
  return {
    unmount() {
      stop();
      cv.destroy();
    },
  };
}
