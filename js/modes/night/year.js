// 1년 = 은하수. 한 달 = 성단. 줌인/줌아웃.
// 해마다 은하수 모양이 다르다(shapes.js). 12개의 달 성단이 그 모양의 윤곽을 따라 놓인다.
// 끝까지 줌아웃하면 '우리의 우주' — 지금까지의 은하수들이 한 하늘에 떠 있다.
// 줌아웃해도 평생기억(1등성)은 최소 크기를 보장해 묻히지 않게 한다.
import { setupCanvas, makeBackdrop, drawStar, rng, hash, gauss, loop, clamp } from '../../sky.js';
import * as D from '../../date.js';
import { shapeOf, layoutShape } from './shapes.js';

const BASE = { pisik: 2.6, mungkeul: 4.2, forever: 6.4 }; // 월드 단위 반지름
const MINR = { pisik: 0.55, mungkeul: 1.15, forever: 3.2 }; // 화면 최소 px
const MAXR = { pisik: 4, mungkeul: 6.5, forever: 10 };
const CLUSTER_R = 125;
const STEP = 340; // 윤곽선을 따라 성단 사이 간격
const PAIR = 5.5; // 쌍성: 하루 자리에서 떨어진 거리(월드 단위)
const MARGIN = 210;
const GK = 0.1; // 우주에서 은하수 하나의 축척
const GAP = 270; // 우주에서 은하수 사이 간격 (아래 이름표 자리 포함)
const HEAD = 64; // 위쪽 제목
const FOOT = 60; // 아래 줌 버튼
const ORDER = { pisik: 0, mungkeul: 1, forever: 2 };
const DUST = ['200,205,255', '170,180,255', '255,225,205'];

const ease = (x) => 1 - Math.pow(1 - x, 3);
const smooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

// 윤곽을 따라가며 달 성단을 놓되, 꼬리·귀처럼 좁은 곳에 몰리지 않도록
// 앞 성단과의 '직선거리'가 d 이상일 때만 다음 성단을 놓는다. d 는 12개가 꼭 맞게 이분 탐색.
function spread(path, n, closed) {
  const steps = 1600;
  const pts = Array.from({ length: steps + 1 }, (_, i) => path.at(i / steps));
  const t0 = closed ? 0 : 0.02;
  const t1 = closed ? 1 : 0.98;
  const place = (d) => {
    const out = [];
    let last = null;
    for (let i = Math.round(t0 * steps); i <= Math.round(t1 * steps); i++) {
      const p = pts[i];
      if (!last || Math.hypot(p.x - last.x, p.y - last.y) >= d) {
        if (closed && out.length && Math.hypot(p.x - pts[0].x, p.y - pts[0].y) < d * 0.8) continue;
        out.push(i / steps);
        last = p;
      }
    }
    return out;
  };
  let lo = 10;
  let hi = path.len;
  for (let k = 0; k < 30; k++) {
    const mid = (lo + hi) / 2;
    if (place(mid).length >= n) lo = mid;
    else hi = mid;
  }
  const ts = place(lo).slice(0, n);
  // 열린 모양은 마지막 달이 끝에 닿도록 살짝 늘린다
  if (!closed && ts.length === n) {
    const k = (t1 - t0) / (ts[n - 1] - t0 || 1);
    return ts.map((t) => t0 + (t - t0) * k);
  }
  while (ts.length < n) ts.push((ts.length + 0.5) / n);
  return ts;
}

export function mountYear(el, { store, showEntry, state }) {
  const nowY = new Date().getFullYear();
  let year = state.year || nowY;
  let mode = state.uni ? 'uni' : 'year';
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
  let vertical = null;
  let worlds = new Map(); // year → 월드 (모양·먼지·안개)
  let starCache = new Map(); // year → 기록 별 위치
  let sprites = new Map(); // year → 우주에서 쓸 작은 그림
  let world = null;
  let uni = null; // { gal: [...], W, H, dust }
  let backdrop = null;
  const cam = { x: 0, y: 0, s: 1 };
  const ucam = { x: 0, y: 0, s: 1 };
  let fitS = 1;
  let ufit = 1;
  let tween = null;

  const cv = setupCanvas(canvas, ({ w, h }) => {
    backdrop = null;
    const v = h > w;
    if (v !== vertical) {
      vertical = v;
      worlds = new Map();
      starCache = new Map();
      sprites = new Map();
      world = getWorld(year);
      fit(false);
      uni = null;
      if (mode === 'uni') {
        buildUni();
        uniFit(false);
      }
    } else {
      fitS = computeFit(world);
      clampCam();
      if (uni) {
        ufit = computeUfit();
        clampU();
      }
    }
    renderHead();
  });

  // ── 한 해의 월드 ──
  function getWorld(y) {
    if (!worlds.has(y)) worlds.set(y, buildWorld(y));
    return worlds.get(y);
  }

  function buildWorld(y) {
    const shape = shapeOf(y);
    const L = layoutShape(shape, { vertical, targetLen: STEP * (shape.closed ? 12 : 11.4), margin: MARGIN });
    const { W, H, main, deco } = L;
    const cx = W / 2;
    const cy = H / 2;
    const centers = spread(main, 12, L.closed).map((t) => {
      const p = main.at(t);
      const s = Math.sign(p.nx * (p.x - cx) + p.ny * (p.y - cy)) || 1; // 바깥쪽
      return { x: p.x, y: p.y, ox: p.nx * s, oy: p.ny * s };
    });

    const R = rng(hash(`shape-${y}`));
    const NM = 2700;
    const ND = deco.length ? 700 : 0;
    const NA = 500;
    const N = NM + ND + NA;
    const dust = { x: new Float32Array(N), y: new Float32Array(N), s: new Float32Array(N), a: new Float32Array(N), c: new Uint8Array(N) };
    for (let i = 0; i < N; i++) {
      let x;
      let yy;
      let a = 0.06 + R() * 0.32;
      if (i < NM) {
        const p = main.at(R());
        const off = gauss(R) * 50;
        x = p.x + p.nx * off;
        yy = p.y + p.ny * off;
      } else if (i < NM + ND) {
        const d = deco[Math.floor(R() * deco.length)];
        const p = d.at(R());
        const off = gauss(R) * 12;
        x = p.x + p.nx * off;
        yy = p.y + p.ny * off;
      } else {
        x = R() * W;
        yy = R() * H;
        a *= 0.45;
      }
      dust.x[i] = x;
      dust.y[i] = yy;
      dust.s[i] = 0.4 + R() * 0.9;
      dust.a[i] = a;
      dust.c[i] = Math.floor(R() * 3);
    }

    // 은하수 안개 (저해상도 오프스크린)
    const k = 0.3;
    const haze = document.createElement('canvas');
    haze.width = Math.max(1, Math.round(W * k));
    haze.height = Math.max(1, Math.round(H * k));
    const g = haze.getContext('2d');
    g.scale(k, k);
    g.globalCompositeOperation = 'lighter';
    const blob = (x, yy, rad, col) => {
      const gr = g.createRadialGradient(x, yy, 0, x, yy, rad);
      gr.addColorStop(0, col);
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr;
      g.fillRect(x - rad, yy - rad, rad * 2, rad * 2);
    };
    for (let d = 0; d < main.len; d += 55) {
      const p = main.at(d / main.len);
      const warm = R() < 0.25;
      blob(p.x + gauss(R) * 22, p.y + gauss(R) * 22, 100 + R() * 120, warm ? 'rgba(200,150,170,0.05)' : 'rgba(110,115,220,0.06)');
    }
    for (const dp of deco) {
      for (let d = 0; d < dp.len; d += 26) {
        const p = dp.at(d / dp.len);
        blob(p.x, p.y, 40 + R() * 30, 'rgba(150,150,240,0.05)');
      }
    }
    for (const p of centers) blob(p.x, p.y, CLUSTER_R * 1.5, 'rgba(180,170,255,0.07)');

    // 별자리 선처럼 그릴 윤곽 (점을 솎아서)
    const thin = (pts, n) => pts.filter((_, i) => i % n === 0 || i === pts.length - 1);
    const lines = [thin(main.pts, 3), ...deco.map((d) => thin(d.pts, 2))];
    return { year: y, shape, W, H, centers, dust, haze, lines };
  }

  // 그 해 기록 별의 위치
  function starsOf(y) {
    if (starCache.has(y)) return starCache.get(y);
    const wd = getWorld(y);
    // 같은 날 별끼리 묶어서, 여럿이면 하루 자리를 두고 마주 보는 쌍성으로
    const days = new Map();
    for (const e of store.inYear(y)) {
      if (!days.has(e.date)) days.set(e.date, []);
      days.get(e.date).push(e);
    }
    const list = [];
    for (const [date, es] of days) {
      const d = D.fromKey(date);
      const m = d.getMonth();
      const i = d.getDate() - 1;
      const R = rng(hash(`${y}-${m}`));
      const rot = R() * 6.283;
      const Rd = rng(hash(date));
      const ang = i * 2.39996 + rot + (Rd() - 0.5) * 0.3;
      const rad = 20 * Math.sqrt(i + 0.6) + (Rd() - 0.5) * 6;
      const c = wd.centers[m];
      const cx = c.x + Math.cos(ang) * rad;
      const cy = c.y + Math.sin(ang) * rad;
      const ph = Rd() * 6.28;
      es.forEach((e, k) => {
        const a = ph + (k / es.length) * Math.PI * 2;
        const off = es.length > 1 ? PAIR : 0;
        list.push({ x: cx + Math.cos(a) * off, y: cy + Math.sin(a) * off, e, ph: ph + k * 2.1, day: i + 1, first: k === 0 });
      });
    }
    // 평생기억이 위에 그려지도록
    list.sort((a, b) => ORDER[a.e.level] - ORDER[b.e.level]);
    starCache.set(y, list);
    return list;
  }

  // ── 제목 ──
  function renderHead() {
    const h = el.querySelector('h2');
    const p = el.querySelector('.title p');
    const navs = el.querySelectorAll('.year-head .nav');
    if (mode === 'uni') {
      const all = store.all();
      h.textContent = '우리의 우주';
      p.textContent = all.length ? `은하수 ${uni?.gal.length || 1}개 · 별 ${all.length}개` : '아직 고요한 우주';
      navs.forEach((b) => (b.style.visibility = 'hidden'));
      return;
    }
    navs.forEach((b) => (b.style.visibility = ''));
    if (!world) return;
    const age = ageAt(year);
    h.textContent = `${year}년 은하수`;
    if (age) {
      const s = document.createElement('span');
      s.className = 'age';
      s.textContent = age;
      h.append(s);
    }
    const list = store.inYear(year);
    const nf = list.filter((e) => e.level === 'forever').length;
    const name = world.shape.name;
    p.textContent = list.length ? `${name} · 별 ${list.length}개 · 1등성 ${nf}개` : `${name} · 아직 고요한 하늘`;
    el.querySelector('[data-step="1"]').disabled = year >= nowY;
  }

  // 아이 나이: 올해는 오늘 기준, 지난 해는 그해 12월 기준
  function ageAt(y) {
    const now = new Date();
    return D.ageLabel(store.profile().birth, y >= now.getFullYear() ? now : new Date(y, 11, 31));
  }

  // ── 한 해 카메라 ──
  const computeFit = (wd) => Math.min((cv.w - 36) / wd.W, (cv.h - HEAD - FOOT) / wd.H);
  const fitCenter = (wd, s) => ({ x: wd.W / 2, y: wd.H / 2 - (HEAD - FOOT) / 2 / s });
  function clampCam() {
    cam.x = clamp(cam.x, 0, world.W);
    cam.y = clamp(cam.y, 0, world.H);
    cam.s = clamp(cam.s, fitS * 0.8, fitS * 16);
  }
  function fit(animate = true) {
    fitS = computeFit(world);
    const c = fitCenter(world, fitS);
    flyTo(cam, c.x, c.y, fitS, animate);
  }

  // ── 우주 ──
  function buildUni() {
    const all = store.all();
    const birth = store.profile().birth;
    let first = nowY;
    if (all.length) first = Math.min(first, +all[0].date.slice(0, 4));
    if (D.isBirth(birth)) first = Math.min(first, +birth.slice(0, 4));
    first = Math.max(first, nowY - 30);

    const gal = [];
    let pos = 0;
    const n = nowY - first + 1;
    for (let y = first; y <= nowY; y++) {
      const wd = getWorld(y);
      const w = wd.W * GK;
      const h = wd.H * GK;
      const R = rng(hash(`u${y}`));
      const zig = n > 1 ? ((y - first) % 2 ? 1 : -1) * (vertical ? 70 : 50) + (R() - 0.5) * 60 : 0;
      const g = { year: y, world: wd, w, h };
      if (vertical) {
        g.x0 = zig - w / 2;
        g.y0 = pos;
        pos += h + GAP;
      } else {
        g.x0 = pos;
        g.y0 = zig - h / 2;
        pos += w + GAP;
      }
      gal.push(g);
    }
    // 여백을 두고 0부터 시작하게
    const pad = 220;
    const x0 = Math.min(...gal.map((g) => g.x0)) - pad;
    const y0 = Math.min(...gal.map((g) => g.y0)) - pad - 30;
    const x1 = Math.max(...gal.map((g) => g.x0 + g.w)) + pad;
    const y1 = Math.max(...gal.map((g) => g.y0 + g.h)) + pad + 30;
    for (const g of gal) {
      g.x0 -= x0;
      g.y0 -= y0;
    }
    const W = x1 - x0;
    const H = y1 - y0;

    const R = rng(hash('universe'));
    const N = 900;
    const dust = { x: new Float32Array(N), y: new Float32Array(N), s: new Float32Array(N), a: new Float32Array(N) };
    for (let i = 0; i < N; i++) {
      dust.x[i] = -1500 + R() * (W + 3000);
      dust.y[i] = -1500 + R() * (H + 3000);
      dust.s[i] = 0.4 + R() * 1.1;
      dust.a[i] = 0.08 + R() * 0.4;
    }
    uni = { gal, W, H, dust };
    ufit = computeUfit();
  }
  function computeUfit() {
    const aw = cv.w - 24;
    const ah = cv.h - HEAD - FOOT;
    let s = Math.min(aw / uni.W, ah / uni.H);
    // 은하수가 하나뿐이어도 화면을 꽉 채우지 않게
    for (const g of uni.gal) s = Math.min(s, 0.42 / Math.max(g.w / aw, g.h / ah));
    return s;
  }
  function uniCenter(s) {
    return { x: uni.W / 2, y: uni.H / 2 - (HEAD - FOOT) / 2 / s };
  }
  function uniFit(animate = true) {
    ufit = computeUfit();
    const c = uniCenter(ufit);
    flyTo(ucam, c.x, c.y, ufit, animate);
  }
  const galMax = () => Math.max(...uni.gal.map((g) => computeFit(g.world) / GK));
  function clampU() {
    ucam.x = clamp(ucam.x, 0, uni.W);
    ucam.y = clamp(ucam.y, 0, uni.H);
    ucam.s = clamp(ucam.s, ufit * 0.6, galMax() * 1.05);
  }
  const galOf = (y) => uni.gal.find((g) => g.year === y) || uni.gal.at(-1);
  // 화면 가운데에 가장 가까운 은하수
  function focusGal() {
    let best = uni.gal[0];
    let bd = Infinity;
    for (const g of uni.gal) {
      const d = Math.hypot(g.x0 + g.w / 2 - ucam.x, g.y0 + g.h / 2 - ucam.y) / Math.max(g.w, g.h);
      if (d < bd) (bd = d), (best = g);
    }
    return best;
  }
  // 1이면 우주 카메라가 그 은하수를 '한 해 화면 전체'로 보는 배율
  const ratio = (g) => (ucam.s * GK) / computeFit(g.world);
  // 은하수 g 를 보는 우주 카메라 → 한 해 카메라
  const yearCamOf = (g) => ({ s: ucam.s * GK, x: (ucam.x - g.x0) / GK, y: (ucam.y - g.y0) / GK });

  // 한 해 → 우주
  function enterUni(animate) {
    if (!uni) buildUni();
    const g = galOf(year);
    ucam.s = cam.s / GK;
    ucam.x = g.x0 + cam.x * GK;
    ucam.y = g.y0 + cam.y * GK;
    if (pinch) pinch.s /= GK;
    mode = 'uni';
    state.uni = true;
    tween = null;
    ufit = computeUfit();
    if (animate) uniFit(true);
    renderHead();
  }
  // 우주 → 한 해 (카메라가 이미 그 은하수에 맞춰져 있을 때)
  function switchToYear(g) {
    if (year !== g.year) {
      year = g.year;
      state.year = year;
    }
    world = g.world;
    fitS = computeFit(world);
    Object.assign(cam, yearCamOf(g));
    if (pinch) pinch.s *= GK;
    mode = 'year';
    state.uni = false;
    tween = null;
    clampCam();
    renderHead();
  }
  // 우주에서 은하수 하나로 날아 들어간다
  function flyIntoYear(g) {
    const fs = computeFit(g.world);
    const c = fitCenter(g.world, fs);
    flyTo(ucam, g.x0 + c.x * GK, g.y0 + c.y * GK, fs / GK, true, () => switchToYear(g));
  }

  // ── 공통 카메라 ──
  function flyTo(c, x, y, s, animate = true, done) {
    if (!animate) {
      Object.assign(c, { x, y, s });
      tween = null;
      if (c === cam) clampCam();
      done?.();
      return;
    }
    tween = { c, from: { ...c }, to: { x, y, s }, t0: performance.now(), dur: c === ucam ? 900 : 650, done };
  }
  function zoomAt(sx, sy, f) {
    tween = null;
    const c = mode === 'uni' ? ucam : cam;
    const wx = (sx - cv.w / 2) / c.s + c.x;
    const wy = (sy - cv.h / 2) / c.s + c.y;
    let s = c.s * f;
    if (mode === 'year' && s < fitS * 0.8) {
      // 끝까지 줌아웃 → 우주로
      if (cam.s > fitS * 0.8 * 1.001) s = fitS * 0.8;
      else {
        enterUni(false);
        return zoomAt(sx, sy, f);
      }
    }
    if (mode === 'uni') s = clamp(s, ufit * 0.6, galMax() * 1.05);
    else s = clamp(s, fitS * 0.8, fitS * 16);
    c.s = s;
    c.x = wx - (sx - cv.w / 2) / c.s;
    c.y = wy - (sy - cv.h / 2) / c.s;
    if (mode === 'uni') {
      clampU();
      // 은하수 하나를 화면 가득 볼 만큼 들어가면 그 해로
      const g = focusGal();
      if (ratio(g) >= 1) switchToYear(g);
    } else clampCam();
  }
  const toScreen = (c, x, y) => ({ x: (x - c.x) * c.s + cv.w / 2, y: (y - c.y) * c.s + cv.h / 2 });
  const starR = (lv, s) => clamp(BASE[lv] * s, MINR[lv], MAXR[lv]);

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
      pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), s: (mode === 'uni' ? ucam : cam).s };
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
        const c = mode === 'uni' ? ucam : cam;
        c.x -= dx / c.s;
        c.y -= dy / c.s;
        if (mode === 'uni') clampU();
        else clampCam();
      }
    } else if (pointers.size === 2 && pinch) {
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      zoomAt(mid.x, mid.y, (pinch.s * d) / pinch.d / (mode === 'uni' ? ucam : cam).s);
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
    if (mode === 'uni') {
      for (const g of uni.gal) {
        const a = toScreen(ucam, g.x0, g.y0);
        const b = toScreen(ucam, g.x0 + g.w, g.y0 + g.h);
        if (x > a.x - 20 && x < b.x + 20 && y > a.y - 20 && y < b.y + 40) return flyIntoYear(g);
      }
      return;
    }
    let best = null;
    let bd = Infinity;
    const far = cam.s < fitS * 2;
    for (const st of starsOf(year)) {
      const p = toScreen(cam, st.x, st.y);
      const d = Math.hypot(p.x - x, p.y - y);
      // 멀리서는 1등성만 바로 열리고, 나머지는 성단 확대로 넘어간다
      const reach = far ? (st.e.level === 'forever' ? 16 : 0) : Math.max(18, starR(st.e.level, cam.s) * 2.5);
      if (d < reach && d - (st.e.level === 'forever' ? 6 : 0) < bd) (bd = d), (best = st);
    }
    if (best) return showEntry(best.e);
    // 멀리서 성단을 누르면 그 달로 날아간다
    if (cam.s < fitS * 2.5) {
      world.centers.forEach((c) => {
        const p = toScreen(cam, c.x, c.y);
        const d = Math.hypot(p.x - x, p.y - y);
        if (d < CLUSTER_R * cam.s + 24 && d < bd) (bd = d), (best = c);
      });
      if (best) flyTo(cam, best.x, best.y, Math.min(fitS * 5, Math.min(cv.w, cv.h) / (CLUSTER_R * 3)));
    }
  }

  el.querySelectorAll('.year-head .nav').forEach((b) =>
    b.addEventListener('click', () => {
      if (mode !== 'year') return;
      year += +b.dataset.step;
      state.year = year;
      world = getWorld(year);
      renderHead();
      fit();
    })
  );
  el.querySelector('.zoom-ctl').addEventListener('click', (ev) => {
    const z = ev.target.closest('button')?.dataset.z;
    if (!z) return;
    if (mode === 'uni') {
      if (z === 'fit') uniFit();
      else if (z === 'out') flyTo(ucam, ucam.x, ucam.y, Math.max(ufit * 0.6, ucam.s / 1.8));
      else {
        const g = focusGal();
        if ((ucam.s * 1.8 * GK) / computeFit(g.world) >= 0.9) flyIntoYear(g);
        else flyTo(ucam, ucam.x, ucam.y, ucam.s * 1.8);
      }
      return;
    }
    if (z === 'fit') fit();
    else if (z === 'in') flyTo(cam, cam.x, cam.y, clamp(cam.s * 1.8, fitS * 0.8, fitS * 16));
    else if (cam.s <= fitS * 0.8 * 1.02) enterUni(true); // 끝까지 줄였으면 우주로
    else flyTo(cam, cam.x, cam.y, clamp(cam.s / 1.8, fitS * 0.8, fitS * 16));
  });

  // ── 그리기 ──
  function draw(t) {
    const { ctx, w, h, dpr } = cv;
    if (!w || !world) return;
    if (tween) {
      const f = ease(clamp((t - tween.t0) / tween.dur, 0, 1));
      const { c, from, to } = tween;
      for (const k of ['x', 'y']) c[k] = from[k] + (to[k] - from[k]) * f;
      c.s = Math.exp(Math.log(from.s) + (Math.log(to.s) - Math.log(from.s)) * f);
      if (f >= 1) {
        const done = tween.done;
        tween = null;
        if (c === cam) clampCam();
        done?.();
      }
    }
    if (!backdrop) backdrop = makeBackdrop(w, h, dpr, hash('year'));
    ctx.drawImage(backdrop, 0, 0, w, h);
    if (mode === 'uni') drawUni(t);
    else drawYear(t, world, cam, starsOf(year), 1);
  }

  function drawYear(t, wd, c, stars, alpha) {
    const { ctx, w, h } = cv;
    const zoomed = c.s / computeFit(wd);
    ctx.globalAlpha = alpha;

    // 안개
    const o = toScreen(c, 0, 0);
    ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(wd.haze, o.x, o.y, wd.W * c.s, wd.H * c.s);

    // 별자리 선 (그해의 모양)
    ctx.strokeStyle = `rgba(190,186,255,${clamp(0.16 - (zoomed - 1) * 0.03, 0.04, 0.16)})`;
    ctx.lineWidth = 1;
    ctx.setLineDash([1.5, 5]);
    ctx.lineCap = 'round';
    for (const line of wd.lines) {
      ctx.beginPath();
      line.forEach(([x, y], i) => {
        const p = toScreen(c, x, y);
        if (i) ctx.lineTo(p.x, p.y);
        else ctx.moveTo(p.x, p.y);
      });
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // 먼지 별 (기록 아님 — 분위기)
    const { dust } = wd;
    const ds = clamp(c.s * 1.6, 0.5, 2.2);
    for (let i = 0; i < dust.x.length; i++) {
      const x = (dust.x[i] - c.x) * c.s + w / 2;
      const y = (dust.y[i] - c.y) * c.s + h / 2;
      if (x < -2 || y < -2 || x > w + 2 || y > h + 2) continue;
      ctx.fillStyle = `rgba(${DUST[dust.c[i]]},${dust.a[i]})`;
      const s = dust.s[i] * ds;
      ctx.fillRect(x, y, s, s);
    }

    // 기록 별
    for (const st of stars) {
      const p = toScreen(c, st.x, st.y);
      const r = starR(st.e.level, c.s);
      const pad = r * 10;
      if (p.x < -pad || p.y < -pad || p.x > w + pad || p.y > h + pad) continue;
      const tw = 0.8 + 0.2 * Math.sin(t * 0.0014 + st.ph);
      const base = st.e.level === 'pisik' ? clamp(0.45 + zoomed * 0.12, 0.45, 0.85) : 1;
      drawStar(ctx, p.x, p.y, st.e.level, r, base * tw * alpha);
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = alpha;

    // 달 이름 — 모양의 바깥쪽에
    ctx.font = '12px "Gowun Batang", serif';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = `rgba(214,210,240,${clamp(0.75 - zoomed * 0.04, 0.35, 0.7)})`;
    // 이름표 위치(가운데 기준)를 잡고, 겹치는 것끼리는 살짝 밀어낸다
    const LW = 30;
    const LH = 15;
    const labels = wd.centers.map((cc) => {
      const p = toScreen(c, cc.x, cc.y);
      const off = CLUSTER_R * c.s * 0.9 + 12;
      const x = p.x + cc.ox * off + cc.ox * (LW / 2) * (Math.abs(cc.ox) > 0.45 ? 1 : 0);
      return { x, y: p.y + cc.oy * off };
    });
    for (let k = 0; k < 4; k++) {
      for (let i = 0; i < 12; i++) {
        for (let j = i + 1; j < 12; j++) {
          const a = labels[i];
          const b = labels[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const ox = LW - Math.abs(dx);
          const oy = LH - Math.abs(dy);
          if (ox <= 0 || oy <= 0) continue;
          if (ox < oy * 1.6) {
            const m = (dx >= 0 ? 1 : -1) * (ox / 2 + 0.5);
            a.x -= m;
            b.x += m;
          } else {
            const m = (dy >= 0 ? 1 : -1) * (oy / 2 + 0.5);
            a.y -= m;
            b.y += m;
          }
        }
      }
    }
    ctx.textAlign = 'center';
    labels.forEach((l, m) => ctx.fillText(`${m + 1}월`, clamp(l.x, LW / 2 + 4, w - LW / 2 - 4), l.y));
    ctx.textBaseline = 'alphabetic';

    // 많이 확대하면 날짜
    if (zoomed > 4.5) {
      ctx.font = '10px "Gowun Dodum", sans-serif';
      ctx.fillStyle = `rgba(200,200,232,${clamp((zoomed - 4.5) / 2, 0, 0.5)})`;
      for (const st of stars) {
        if (!st.first) continue; // 쌍성은 날짜를 한 번만
        const p = toScreen(c, st.x, st.y);
        if (p.x < 0 || p.y < 0 || p.x > w || p.y > h) continue;
        ctx.fillText(st.day, p.x, p.y + starR(st.e.level, c.s) + 13);
      }
    }
    ctx.globalAlpha = 1;
  }

  // 우주에서 쓰는 은하수 한 장 그림
  function spriteOf(g) {
    if (sprites.has(g.year)) return sprites.get(g.year);
    const wd = g.world;
    const SPR = 420 * Math.min(2, cv.dpr || 1);
    const k = SPR / Math.max(wd.W, wd.H);
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(wd.W * k));
    c.height = Math.max(1, Math.round(wd.H * k));
    const x = c.getContext('2d');
    x.globalCompositeOperation = 'lighter';
    x.drawImage(wd.haze, 0, 0, c.width, c.height);
    x.strokeStyle = 'rgba(190,186,255,0.22)';
    x.lineWidth = SPR / 420;
    x.setLineDash([1.5 * (SPR / 420), 4 * (SPR / 420)]);
    for (const line of wd.lines) {
      x.beginPath();
      line.forEach(([px, py], i) => (i ? x.lineTo(px * k, py * k) : x.moveTo(px * k, py * k)));
      x.stroke();
    }
    x.setLineDash([]);
    const { dust } = wd;
    const u = SPR / 420;
    for (let i = 0; i < dust.x.length; i++) {
      x.fillStyle = `rgba(${DUST[dust.c[i]]},${Math.min(1, dust.a[i] * 1.5)})`;
      x.fillRect(dust.x[i] * k, dust.y[i] * k, 0.9 * u, 0.9 * u);
    }
    const R = { pisik: 0.9, mungkeul: 1.6, forever: 3.4 };
    for (const st of starsOf(g.year)) drawStar(x, st.x * k, st.y * k, st.e.level, R[st.e.level] * u, 1);
    sprites.set(g.year, c);
    return c;
  }

  function drawUni(t) {
    const { ctx, w, h } = cv;
    if (!uni) buildUni();

    // 먼 우주의 별
    const { dust } = uni;
    const ds = clamp(ucam.s * 4, 0.5, 1.6);
    ctx.fillStyle = 'rgb(205,210,255)';
    for (let i = 0; i < dust.x.length; i++) {
      // 살짝 시차를 줘서 깊이감
      const x = (dust.x[i] - ucam.x) * ucam.s * 0.6 + w / 2;
      const y = (dust.y[i] - ucam.y) * ucam.s * 0.6 + h / 2;
      if (x < -2 || y < -2 || x > w + 2 || y > h + 2) continue;
      ctx.globalAlpha = dust.a[i] * (0.75 + 0.25 * Math.sin(t * 0.001 + i));
      ctx.fillRect(x, y, dust.s[i] * ds, dust.s[i] * ds);
    }
    ctx.globalAlpha = 1;

    const focus = focusGal();
    const ya = smooth(0.35, 0.8, ratio(focus)); // 가까워질수록 한 해 화면으로 겹쳐 보인다

    ctx.globalCompositeOperation = 'lighter';
    for (const g of uni.gal) {
      const a = toScreen(ucam, g.x0, g.y0);
      const gw = g.w * ucam.s;
      const gh = g.h * ucam.s;
      if (a.x > w || a.y > h || a.x + gw < 0 || a.y + gh < 0) continue;
      const alpha = g === focus ? 1 - ya : 1;
      if (alpha <= 0.01) continue;
      // 숨 쉬듯 아주 천천히 밝아졌다 어두워진다
      ctx.globalAlpha = alpha * (0.88 + 0.12 * Math.sin(t * 0.0007 + g.year));
      ctx.drawImage(spriteOf(g), a.x, a.y, gw, gh);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    // 이름표
    for (const g of uni.gal) {
      const alpha = (g === focus ? 1 - ya : 1) * clamp(1.4 - ratio(g), 0, 1);
      if (alpha <= 0.01) continue;
      const p = toScreen(ucam, g.x0 + g.w / 2, g.y0 + g.h);
      const age = ageAt(g.year);
      const n = starsOf(g.year).length;
      ctx.globalAlpha = alpha;
      ctx.textAlign = 'center';
      ctx.font = '15px "Gowun Batang", serif';
      ctx.fillStyle = 'rgba(236,232,246,0.92)';
      ctx.fillText(`${g.year}`, p.x, p.y + 16);
      ctx.font = '11px "Gowun Dodum", sans-serif';
      ctx.fillStyle = 'rgba(179,176,204,0.85)';
      ctx.fillText([g.world.shape.name, age, n ? `별 ${n}개` : ''].filter(Boolean).join(' · '), p.x, p.y + 33);
    }
    ctx.globalAlpha = 1;

    if (ya > 0.01) drawYear(t, focus.world, yearCamOf(focus), starsOf(focus.year), ya);
  }

  const stop = loop(draw);
  const unsub = store.subscribe((type) => {
    if (type !== 'change' && type !== 'child') return;
    starCache = new Map();
    sprites = new Map();
    if (uni) {
      const keep = { ...ucam };
      buildUni();
      Object.assign(ucam, keep);
      clampU();
    }
    renderHead();
  });

  return {
    unmount() {
      stop();
      unsub();
      cv.destroy();
    },
  };
}
