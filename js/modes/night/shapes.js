// 해마다 다른 은하수 모양.
// 12개의 달 성단이 모양의 윤곽선을 따라 순서대로 놓인다. 윤곽선은 별자리 선처럼 희미하게 그려진다.
//
// 모양 정의
// - path: 메인 윤곽선. [x, y] 또는 [x, y, 1](뾰족한 꼭짓점) 점 목록(0~100 격자, y 아래로)
//         또는 f(t) → [x, y] 함수(t: 0~1)
// - closed: 닫힌 도형인지
// - smooth: 점 사이를 부드럽게 이을지
// - deco: 성단이 놓이지 않는 장식 선들 (눈, 물줄기 등)
// - turn: 세로 화면이면 90° 돌려도 되는 모양 (기호·기하학)
//
// 특정 종교·나라·정치·단체를 떠올리게 하는 모양은 쓰지 않는다
// (예: 오각별, 초승달, 십자가, 육각별, 물고기 표식, 국기·문장에 쓰이는 꽃·잎 등).

const T = Math.PI * 2;

const circle = (cx, cy, r, n = 16) => Array.from({ length: n + 1 }, (_, i) => [cx + Math.cos((i / n) * T) * r, cy + Math.sin((i / n) * T) * r]);

export const SHAPES = [
  {
    id: 'whale',
    name: '고래',
    closed: true,
    smooth: true,
    path: [
      [6, 56], [13, 41], [34, 32], [60, 35], [78, 45], [87, 48, 1], [92, 33], [97, 35, 1], [92, 51, 1],
      [98, 64, 1], [93, 66], [86, 55, 1], [70, 62], [45, 70], [22, 69], [10, 64],
    ],
    deco: [circle(22, 51, 2.2, 10), [[25, 30], [23, 20], [18, 12]], [[25, 30], [29, 19], [35, 13]]],
  },
  {
    id: 'heart',
    name: '하트',
    closed: true,
    turn: false,
    path: (t) => {
      const a = t * T;
      return [16 * Math.sin(a) ** 3, -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a))];
    },
  },
  {
    id: 'rabbit',
    name: '토끼',
    closed: true,
    smooth: true,
    path: [
      [50, 94], [33, 90], [26, 75], [30, 59], [37, 53], [31, 31], [32, 9, 1], [42, 11], [45, 31], [46, 50],
      [50, 49], [54, 50], [55, 31], [58, 11], [68, 9, 1], [69, 31], [63, 53], [70, 59], [74, 75], [67, 90],
    ],
    deco: [circle(41, 70, 1.8, 8), circle(59, 70, 1.8, 8)],
  },
  {
    id: 'spiral',
    name: '소용돌이',
    closed: false,
    turn: false,
    path: (t) => {
      const a = 0.6 + t * T * 2.15;
      const r = 9 + t * 41;
      return [Math.cos(a) * r, Math.sin(a) * r];
    },
  },
  {
    id: 'cloud',
    name: '구름',
    closed: true,
    smooth: true,
    path: [
      [18, 72], [8, 62], [10, 50], [20, 45, 1], [22, 33], [34, 25], [46, 29, 1], [54, 18], [70, 16], [80, 26, 1],
      [90, 32], [95, 46], [88, 60], [78, 72, 1], [48, 74],
    ],
  },
  {
    id: 'infinity',
    name: '무한대',
    closed: true,
    turn: true,
    path: (t) => {
      const a = t * T + Math.PI / 2;
      const d = 1 + Math.sin(a) ** 2;
      return [(Math.cos(a) / d) * 50, ((Math.sin(a) * Math.cos(a)) / d) * 50];
    },
  },
  {
    id: 'cat',
    name: '고양이',
    closed: true,
    smooth: true,
    path: [
      [50, 88], [27, 83], [14, 67], [13, 48], [17, 33], [13, 8, 1], [34, 26], [50, 24], [66, 26],
      [87, 8, 1], [83, 33], [87, 48], [86, 67], [73, 83],
    ],
    deco: [circle(37, 52, 2.4, 10), circle(63, 52, 2.4, 10), [[46, 62], [50, 65], [54, 62]], [[30, 64], [8, 61]], [[70, 64], [92, 61]]],
  },
  {
    id: 'hexagon',
    name: '벌집',
    closed: true,
    smooth: false,
    turn: true,
    path: Array.from({ length: 7 }, (_, i) => {
      const a = (i / 6) * T;
      return [50 + Math.cos(a) * 50, 50 + Math.sin(a) * 50];
    }),
    deco: [Array.from({ length: 7 }, (_, i) => {
      const a = (i / 6) * T + Math.PI / 6;
      return [50 + Math.cos(a) * 20, 50 + Math.sin(a) * 20];
    })],
  },
  {
    id: 'bear',
    name: '곰',
    closed: true,
    smooth: true,
    path: [
      [50, 90], [28, 86], [14, 70], [12, 52], [18, 37, 1], [10, 26], [14, 14], [26, 12], [33, 22, 1], [50, 18],
      [67, 22, 1], [74, 12], [86, 14], [90, 26], [82, 37, 1], [88, 52], [86, 70], [72, 86],
    ],
    deco: [circle(37, 50, 2.4, 10), circle(63, 50, 2.4, 10), circle(50, 66, 10, 16), circle(50, 61, 2, 8)],
  },
  {
    id: 'river',
    name: '은하강',
    closed: false,
    turn: true,
    path: (t) => [t * 100, Math.sin(t * Math.PI * 1.6 + 0.2) * 14],
  },
];

// 해마다 다른 모양 (이웃한 해는 항상 다르다)
export const shapeOf = (year) => SHAPES[(((year - 2026) % SHAPES.length) + SHAPES.length) % SHAPES.length];

// ── 윤곽선 → 촘촘한 점 목록 ──
function densify(shape) {
  if (typeof shape.path === 'function') {
    const n = 480;
    return Array.from({ length: n + 1 }, (_, i) => shape.path(i / n));
  }
  return polyline(shape.path, shape.closed, shape.smooth);
}

function polyline(src, closed, smooth) {
  const P = src.map((p) => ({ x: p[0], y: p[1], c: !!p[2] }));
  if (closed && (P[0].x !== P.at(-1).x || P[0].y !== P.at(-1).y)) P.push({ ...P[0] });
  if (!smooth) {
    const out = [];
    for (let i = 0; i < P.length - 1; i++) {
      for (let k = 0; k < 24; k++) {
        const f = k / 24;
        out.push([P[i].x + (P[i + 1].x - P[i].x) * f, P[i].y + (P[i + 1].y - P[i].y) * f]);
      }
    }
    out.push([P.at(-1).x, P.at(-1).y]);
    return out;
  }
  // Catmull-Rom. 꼭짓점 표시가 있는 점은 접선을 0으로 해 뾰족하게.
  const n = P.length;
  const at = (i) => (closed ? P[(i + n - 1) % (n - 1)] : P[Math.max(0, Math.min(n - 1, i))]);
  const tan = (i) => {
    const p = P[i];
    if (p.c) return { x: 0, y: 0 };
    const a = closed && i === 0 ? P[n - 2] : at(i - 1);
    const b = closed && i === n - 1 ? P[1] : at(i + 1);
    return { x: (b.x - a.x) * 0.5, y: (b.y - a.y) * 0.5 };
  };
  const out = [];
  for (let i = 0; i < n - 1; i++) {
    const p0 = P[i];
    const p1 = P[i + 1];
    const m0 = tan(i);
    const m1 = tan(i + 1);
    for (let k = 0; k < 24; k++) {
      const t = k / 24;
      const t2 = t * t;
      const t3 = t2 * t;
      const h00 = 2 * t3 - 3 * t2 + 1;
      const h10 = t3 - 2 * t2 + t;
      const h01 = -2 * t3 + 3 * t2;
      const h11 = t3 - t2;
      out.push([h00 * p0.x + h10 * m0.x + h01 * p1.x + h11 * m1.x, h00 * p0.y + h10 * m0.y + h01 * p1.y + h11 * m1.y]);
    }
  }
  out.push([P.at(-1).x, P.at(-1).y]);
  return out;
}

function lengthOf(pts) {
  let L = 0;
  for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return L;
}

// 호 길이 기준으로 위치를 찾는 경로
export class Path {
  constructor(pts) {
    this.pts = pts;
    this.cum = [0];
    for (let i = 1; i < pts.length; i++) {
      this.cum.push(this.cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    }
    this.len = this.cum.at(-1) || 1;
  }
  // t: 0~1 → { x, y, nx, ny } (nx, ny: 단위 법선)
  at(t) {
    const d = Math.max(0, Math.min(1, t)) * this.len;
    let lo = 0;
    let hi = this.cum.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (this.cum[mid] < d) lo = mid;
      else hi = mid;
    }
    const a = this.pts[lo];
    const b = this.pts[hi];
    const seg = this.cum[hi] - this.cum[lo] || 1;
    const f = (d - this.cum[lo]) / seg;
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const l = Math.hypot(dx, dy) || 1;
    return { x: a[0] + dx * f, y: a[1] + dy * f, nx: -dy / l, ny: dx / l };
  }
}

// 모양을 월드 좌표로: 메인 윤곽선 길이가 targetLen 이 되도록 크기를 맞추고, 여백(margin)을 둔다.
export function layoutShape(shape, { vertical, targetLen, margin }) {
  let main = densify(shape);
  let deco = (shape.deco || []).map((d) => polyline(d, false, true));

  // 세로 화면에서 가로로 긴 기호는 90° 돌린다
  const bb0 = bbox([main]);
  if (shape.turn && vertical && bb0.w > bb0.h) {
    const rot = (p) => [-p[1], p[0]];
    main = main.map(rot);
    deco = deco.map((d) => d.map(rot));
  }

  const k = targetLen / lengthOf(main);
  const bb = bbox([main, ...deco]);
  const tf = (p) => [(p[0] - bb.x) * k + margin, (p[1] - bb.y) * k + margin];
  main = main.map(tf);
  deco = deco.map((d) => d.map(tf));
  return {
    W: bb.w * k + margin * 2,
    H: bb.h * k + margin * 2,
    main: new Path(main),
    deco: deco.map((d) => new Path(d)),
    closed: !!shape.closed,
  };
}

function bbox(lists) {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const l of lists) {
    for (const [x, y] of l) {
      x0 = Math.min(x0, x);
      y0 = Math.min(y0, y);
      x1 = Math.max(x1, x);
      y1 = Math.max(y1, y);
    }
  }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}
