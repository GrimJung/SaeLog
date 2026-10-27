// 밤하늘 그리기 도구 — 별은 전부 코드로 만든다 (원 + 글로우 + 빛줄기).

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hash(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function gauss(R) {
  let u = 0;
  while (!u) u = R();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * R());
}

// k = 글로우 반경 / 별 핵 반경
export const STAR = {
  pisik: { core: [222, 230, 255], glow: [150, 168, 255], k: 4, glowA: 0.3 },
  mungkeul: { core: [255, 245, 228], glow: [255, 206, 160], k: 6, glowA: 0.42 },
  forever: { core: [255, 242, 205], glow: [255, 190, 100], k: 9, glowA: 0.62, spikes: true },
};

const sprites = {};
function sprite(level) {
  if (sprites[level]) return sprites[level];
  const st = STAR[level];
  const S = 192;
  const m = S / 2;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  const [r, gg, b] = st.glow;
  const A = st.glowA;

  const gl = g.createRadialGradient(m, m, 0, m, m, m);
  gl.addColorStop(0, `rgba(${r},${gg},${b},${A})`);
  gl.addColorStop(0.16, `rgba(${r},${gg},${b},${A * 0.45})`);
  gl.addColorStop(0.45, `rgba(${r},${gg},${b},${A * 0.1})`);
  gl.addColorStop(1, `rgba(${r},${gg},${b},0)`);
  g.fillStyle = gl;
  g.fillRect(0, 0, S, S);

  const cr = m / st.k;
  const [cr0, cg0, cb0] = st.core;
  g.globalCompositeOperation = 'lighter';

  if (st.spikes) {
    const spike = (angle, len, wid, a) => {
      g.save();
      g.translate(m, m);
      g.rotate(angle);
      const lg = g.createLinearGradient(-len, 0, len, 0);
      lg.addColorStop(0, `rgba(${cr0},${cg0},${cb0},0)`);
      lg.addColorStop(0.5, `rgba(${cr0},${cg0},${cb0},${a})`);
      lg.addColorStop(1, `rgba(${cr0},${cg0},${cb0},0)`);
      g.fillStyle = lg;
      g.beginPath();
      g.moveTo(-len, 0);
      g.lineTo(0, -wid / 2);
      g.lineTo(len, 0);
      g.lineTo(0, wid / 2);
      g.closePath();
      g.fill();
      g.restore();
    };
    spike(0, m, cr * 0.7, 0.9);
    spike(Math.PI / 2, m, cr * 0.7, 0.9);
    spike(Math.PI / 4, m * 0.45, cr * 0.4, 0.45);
    spike(-Math.PI / 4, m * 0.45, cr * 0.4, 0.45);
  }

  const core = g.createRadialGradient(m, m, 0, m, m, cr * 1.4);
  core.addColorStop(0, 'rgba(255,255,255,1)');
  core.addColorStop(0.45, `rgba(${cr0},${cg0},${cb0},1)`);
  core.addColorStop(1, `rgba(${cr0},${cg0},${cb0},0)`);
  g.fillStyle = core;
  g.beginPath();
  g.arc(m, m, cr * 1.4, 0, Math.PI * 2);
  g.fill();

  return (sprites[level] = c);
}

// r = 화면에서 별 핵의 반지름(px). 호출하는 쪽에서 globalCompositeOperation='lighter' 권장.
export function drawStar(ctx, x, y, level, r, alpha = 1) {
  const st = STAR[level];
  const d = r * st.k * 2;
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  ctx.drawImage(sprite(level), x - d / 2, y - d / 2, d, d);
  ctx.globalAlpha = 1;
}

// 기록과 무관한 배경 하늘 (아주 희미한 먼 별들)
export function makeBackdrop(w, h, dpr, seed) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w * dpr));
  c.height = Math.max(1, Math.round(h * dpr));
  const g = c.getContext('2d');
  g.scale(dpr, dpr);

  const bg = g.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#060a1c');
  bg.addColorStop(0.65, '#0b1130');
  bg.addColorStop(1, '#161a3b');
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);

  const R = rng(seed);
  for (let i = 0; i < 3; i++) {
    const x = R() * w;
    const y = R() * h;
    const rad = (0.3 + R() * 0.4) * Math.max(w, h);
    const ng = g.createRadialGradient(x, y, 0, x, y, rad);
    ng.addColorStop(0, `rgba(${90 + R() * 40},${80 + R() * 30},${170 + R() * 40},0.07)`);
    ng.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = ng;
    g.fillRect(0, 0, w, h);
  }

  const n = Math.round((w * h) / 1600);
  for (let i = 0; i < n; i++) {
    g.fillStyle = `rgba(210,215,255,${0.06 + R() * 0.28})`;
    const s = R() < 0.93 ? 0.6 : 1.1;
    g.fillRect(R() * w, R() * h, s, s);
  }
  return c;
}

export function setupCanvas(canvas, onResize) {
  const ctx = canvas.getContext('2d');
  const s = { ctx, w: 0, h: 0, dpr: 1 };
  const ro = new ResizeObserver(() => {
    const r = canvas.getBoundingClientRect();
    if (!r.width || !r.height) return;
    s.dpr = Math.min(2, window.devicePixelRatio || 1);
    s.w = r.width;
    s.h = r.height;
    canvas.width = Math.round(r.width * s.dpr);
    canvas.height = Math.round(r.height * s.dpr);
    ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);
    onResize?.(s);
  });
  ro.observe(canvas);
  s.destroy = () => ro.disconnect();
  return s;
}

export function loop(fn) {
  let run = true;
  let id = 0;
  const f = (t) => {
    if (!run) return;
    fn(t);
    id = requestAnimationFrame(f);
  };
  id = requestAnimationFrame(f);
  return () => {
    run = false;
    cancelAnimationFrame(id);
  };
}

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
