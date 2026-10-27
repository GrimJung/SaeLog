// 일주일 = 별을 선으로 이은 별자리. 같은 날 가족이 함께 띄운 별은 쌍성으로.
import { setupCanvas, makeBackdrop, drawStar, rng, hash, loop, clamp } from '../../sky.js';
import * as D from '../../date.js';
import { levelOf } from '../../store.js';

const R_STAR = { pisik: 2.4, mungkeul: 3.6, forever: 5.4 };
const PAIR = 9; // 쌍성: 하루 자리에서 떨어진 거리(px)
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function mountWeek(el, { store, showEntry, state }) {
  let ws = state.week || D.weekStart(D.todayKey());
  el.innerHTML = `
    <div class="view-head">
      <button class="nav" data-step="-7" aria-label="지난 주">‹</button>
      <div class="title"><h2></h2><p></p></div>
      <button class="nav" data-step="7" aria-label="다음 주">›</button>
    </div>
    <div class="sky sky-week"><canvas aria-label="이번 주 별자리"></canvas></div>
    <ul class="entry-list"></ul>`;

  const canvas = el.querySelector('canvas');
  let backdrop = null;
  const cv = setupCanvas(canvas, () => (backdrop = null));
  let days, byDay, pts, rec, t0;

  function load(animate = true) {
    state.week = ws;
    days = Array.from({ length: 7 }, (_, i) => D.addDays(ws, i));
    byDay = days.map((d) => store.onDate(d));
    rec = byDay.map((l, i) => (l.length ? i : -1)).filter((i) => i >= 0);
    const R = rng(hash('week' + ws));
    let y = 0.3 + R() * 0.4;
    pts = days.map((_, i) => {
      y = clamp(y + (R() - 0.5) * 0.44, 0.2, 0.78);
      return { x: 0.1 + (0.8 * i) / 6 + (R() - 0.5) * 0.07, y, ph: R() * 6.28 };
    });
    if (animate) {
      t0 = performance.now();
      backdrop = null;
    }

    el.querySelector('h2').textContent = `${D.weekLabel(ws)} 별자리`;
    el.querySelector('.title p').textContent = `${D.fmtDot(ws)} – ${D.fmtDot(D.addDays(ws, 6))}`;
    el.querySelector('[data-step="7"]').disabled = D.addDays(ws, 7) > D.todayKey();

    const list = el.querySelector('.entry-list');
    list.innerHTML = rec.length
      ? rec.flatMap((i) => byDay[i]).map((e) => `<li><button data-id="${esc(e.id)}">
            <span class="dot ${e.level}"></span>
            <span class="when">${D.WD[D.fromKey(e.date).getDay()]}</span>
            <span class="txt">${esc(e.text)}</span>
            <span class="lv">${levelOf(e.level).label}${store.isFamily() && e.author ? ` · ${esc(e.author)}` : ''}</span></button></li>`).join('')
      : `<li class="quiet">고요한 하늘이에요</li>`;
  }

  el.querySelectorAll('.nav').forEach((b) =>
    b.addEventListener('click', () => {
      ws = D.addDays(ws, +b.dataset.step);
      load();
    })
  );
  el.querySelector('.entry-list').addEventListener('click', (ev) => {
    const b = ev.target.closest('button[data-id]');
    if (b) showEntry(store.byId(b.dataset.id));
  });

  const P = (i) => ({ x: pts[i].x * cv.w, y: pts[i].y * cv.h });
  // 그날 k번째 별의 자리 — 하나면 가운데, 여럿이면 가운데를 두고 서로 마주 보게(쌍성)
  const SP = (i, k) => {
    const c = P(i);
    const n = byDay[i].length;
    if (n < 2) return c;
    const a = pts[i].ph + (k / n) * Math.PI * 2;
    return { x: c.x + Math.cos(a) * PAIR, y: c.y + Math.sin(a) * PAIR * 0.8 };
  };

  canvas.addEventListener('click', (ev) => {
    const r = canvas.getBoundingClientRect();
    const mx = ev.clientX - r.left;
    const my = ev.clientY - r.top;
    let best = null;
    let bd = 32;
    for (const i of rec) {
      byDay[i].forEach((e, k) => {
        const p = SP(i, k);
        const d = Math.hypot(p.x - mx, p.y - my);
        if (d < bd) (bd = d), (best = e);
      });
    }
    if (best) showEntry(best);
  });

  function draw(t) {
    const { ctx, w, h, dpr } = cv;
    if (!w) return;
    if (!backdrop) backdrop = makeBackdrop(w, h, dpr, hash(ws));
    ctx.drawImage(backdrop, 0, 0, w, h);
    const age = t - t0;

    // 선: 기록된 날끼리만, 차례로 그어진다
    const segs = rec.length - 1;
    const prog = clamp(age / 1500, 0, 1) * segs;
    ctx.strokeStyle = 'rgba(196,204,255,0.3)';
    ctx.lineWidth = 1;
    for (let k = 0; k < segs; k++) {
      const f = clamp(prog - k, 0, 1);
      if (f <= 0) break;
      const a = P(rec[k]);
      const b = P(rec[k + 1]);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(a.x + (b.x - a.x) * f, a.y + (b.y - a.y) * f);
      ctx.stroke();
    }

    ctx.globalCompositeOperation = 'lighter';
    rec.forEach((i, k) => {
      const ap = clamp((age - k * 140) / 600, 0, 1);
      byDay[i].forEach((e, j) => {
        const p = SP(i, j);
        const tw = 0.82 + 0.18 * Math.sin(t * 0.0016 + pts[i].ph + j * 2.1);
        const base = e.level === 'pisik' ? 0.72 : 1;
        drawStar(ctx, p.x, p.y, e.level, R_STAR[e.level], ap * tw * base);
      });
    });
    ctx.globalCompositeOperation = 'source-over';

    ctx.font = '11px "Pretendard Variable", sans-serif';
    ctx.textAlign = 'center';
    rec.forEach((i, k) => {
      const p = P(i);
      const ap = clamp((age - k * 140) / 600, 0, 1);
      ctx.fillStyle = `rgba(200,200,232,${0.45 * ap})`;
      ctx.fillText(D.WD[D.fromKey(days[i]).getDay()], p.x, p.y + 24);
    });
  }

  load();
  const stop = loop(draw);
  // 가족이 새로 띄운 별이 바로 보이도록
  const unsub = store.subscribe((type) => type === 'change' && load(false));
  return {
    unmount() {
      stop();
      unsub();
      cv.destroy();
    },
  };
}
