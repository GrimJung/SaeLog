// 데이터 레이어 — 모드(밤하늘/정원)와 무관하다.
// Entry: { date:'YYYY-MM-DD', text, level:'pisik'|'mungkeul'|'forever', note, createdAt, updatedAt }
import { toKey, todayKey } from './date.js';
import { rng } from './sky.js';

export const LEVELS = [
  { id: 'pisik', label: '피식', desc: '웃겼던 말' },
  { id: 'mungkeul', label: '뭉클', desc: '찡했던 말' },
  { id: 'forever', label: '평생기억', desc: '절대 잊고 싶지 않은 말' },
];
export const levelOf = (id) => LEVELS.find((l) => l.id === id) || LEVELS[0];

const KEY = 'saerok:v1';
const isDemo = new URLSearchParams(location.search).has('demo');
const subs = new Set();
let state = load();

function load() {
  if (isDemo) return { version: 1, entries: makeDemo() };
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s && s.entries) return s;
  } catch {}
  return { version: 1, entries: {} };
}

function commit() {
  if (!isDemo) {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('저장 실패', e);
    }
  }
  subs.forEach((fn) => fn());
}

const valid = (e) =>
  e && /^\d{4}-\d{2}-\d{2}$/.test(e.date) && typeof e.text === 'string' && e.text.trim() &&
  LEVELS.some((l) => l.id === e.level);

export const store = {
  isDemo,
  get: (date) => state.entries[date] || null,
  all: () => Object.values(state.entries).sort((a, b) => a.date.localeCompare(b.date)),
  inYear: (y) => store.all().filter((e) => e.date.startsWith(`${y}-`)),

  upsert({ date, text, level, note = '' }) {
    const now = Date.now();
    const prev = state.entries[date];
    state.entries[date] = {
      date,
      text: text.trim(),
      level,
      note: note.trim(),
      createdAt: prev?.createdAt || now,
      updatedAt: now,
    };
    commit();
    return state.entries[date];
  },

  remove(date) {
    delete state.entries[date];
    commit();
  },

  exportJSON: () => JSON.stringify({ app: 'saerok', ...state }, null, 2),

  // 가져오기는 병합: 같은 날짜면 더 최근에 고친 쪽을 남긴다.
  importJSON(text) {
    const data = JSON.parse(text);
    const list = Object.values(data.entries || {});
    let n = 0;
    for (const e of list) {
      if (!valid(e)) continue;
      const cur = state.entries[e.date];
      if (!cur || (e.updatedAt || 0) > (cur.updatedAt || 0)) {
        state.entries[e.date] = { note: '', createdAt: Date.now(), updatedAt: Date.now(), ...e };
        n++;
      }
    }
    commit();
    return n;
  },

  subscribe(fn) {
    subs.add(fn);
    return () => subs.delete(fn);
  },
};

// ── 예시 하늘 (?demo) — 메모리에만 존재하고 저장되지 않는다 ──
function makeDemo() {
  const pools = {
    pisik: [
      '아빠 머리에 눈 왔어', '구름이 솜사탕 먹고 싶대', '아빠는 왜 맨날 졸려?',
      '브로콜리는 작은 나무야', '양말이 짝꿍을 잃어버렸대', '아빠 배는 북이야',
      '비가 하늘에서 샤워하는 거야', '나는 커서 공룡 의사가 될 거야',
      '엄마가 제일 예뻐, 두 번째도 엄마야', '달팽이는 집을 업고 다녀서 힘들겠다',
      '별은 밤에 켜는 전등이야?', '내 방귀는 무지개 색이야',
    ],
    mungkeul: [
      '엄마, 달님이 우리 따라와!', '내가 안아줄게, 그럼 안 슬퍼', '할머니 손은 따뜻한 빵 같아',
      '나 이제 형님이야. 근데 오늘만 아기 할래', '오늘 하루 너무 길었어. 근데 재밌었어',
      '엄마도 어렸을 때 엄마 있었어?', '코 자고 일어나면 또 놀자', '내 꿈에 엄마 초대할게',
    ],
    forever: [
      '엄마 사랑해, 우주만큼 하고 하나 더', '고마워, 나 낳아줘서',
      '엄마 울지 마, 내가 웃겨줄게', '내 마음에 엄마 방 있어',
    ],
  };
  const notes = ['', '', '', '목욕하다가', '잠들기 직전에', '아침 등원길에', '저녁 먹다가', '그림 그리면서'];
  const R = rng(20240101);
  const out = {};
  const end = todayKey();
  const d = new Date(new Date().getFullYear() - 1, 0, 1);
  while (toKey(d) <= end) {
    if (R() < 0.55) {
      const x = R();
      const level = x < 0.07 ? 'forever' : x < 0.36 ? 'mungkeul' : 'pisik';
      const pool = pools[level];
      const date = toKey(d);
      out[date] = {
        date, level,
        text: pool[Math.floor(R() * pool.length)],
        note: notes[Math.floor(R() * notes.length)],
        createdAt: +d, updatedAt: +d,
      };
    }
    d.setDate(d.getDate() + 1);
  }
  return out;
}
