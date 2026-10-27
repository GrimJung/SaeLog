// 데이터 레이어 — 모드(밤하늘/정원)와 무관하다.
// Entry: { date:'YYYY-MM-DD', text, level:'pisik'|'mungkeul'|'forever', note,
//          createdAt, updatedAt, author?, editedBy? }
//
// 저장소는 세 가지 중 하나:
//  - local : 이 기기에만 (기본)
//  - cloud : 아이 한 명의 하늘(childId)을 가족과 함께 (cloud.js)
//  - demo  : ?demo — 메모리에만, 저장 안 함
import { toKey, todayKey } from './date.js';
import { rng } from './sky.js';
import * as cloud from './cloud.js';

export const LEVELS = [
  { id: 'pisik', label: '피식', desc: '웃겼던 말' },
  { id: 'mungkeul', label: '뭉클', desc: '찡했던 말' },
  { id: 'forever', label: '평생기억', desc: '절대 잊고 싶지 않은 말' },
];
export const levelOf = (id) => LEVELS.find((l) => l.id === id) || LEVELS[0];

const KEY = 'saerok:v1'; // 이 기기 전용 기록
const PKEY = 'saerok:profile'; // { childId, childName, nickname, lastChildId, lastChildName }
const CKEY = (id) => `saerok:cache:${id}`; // 함께 쓰는 하늘의 사본 (빠른 첫 화면용)

const ls = {
  get(k) {
    try {
      return JSON.parse(localStorage.getItem(k));
    } catch {
      return null;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch (e) {
      console.warn('저장 실패', e);
    }
  },
};

const isDemo = new URLSearchParams(location.search).has('demo');
const subs = new Set();
const emit = (type, info) => subs.forEach((fn) => fn(type, info));

let profile = ls.get(PKEY) || {};
let entries = {};
let sync = 'local'; // local | demo | connecting | synced | pending | offline | error
let unwatch = null;

const shared = () => !isDemo && !!profile.childId;
const localEntries = () => (ls.get(KEY) || {}).entries || {};

function boot() {
  if (isDemo) {
    entries = makeDemo();
    sync = 'demo';
  } else if (profile.childId) {
    entries = ls.get(CKEY(profile.childId)) || {};
    watch();
  } else {
    entries = localEntries();
  }
}

async function watch() {
  const id = profile.childId;
  unwatch?.();
  unwatch = null;
  setSync('connecting');
  try {
    const un = await cloud.watchEntries(
      id,
      (map, meta) => {
        if (id !== profile.childId) return;
        entries = map;
        ls.set(CKEY(id), map);
        sync = meta.hasPendingWrites ? 'pending' : meta.fromCache ? 'offline' : 'synced';
        emit('change');
      },
      (err) => {
        console.warn(err);
        setSync('error');
      }
    );
    if (id === profile.childId) unwatch = un;
    else un();
  } catch (e) {
    console.warn(e);
    setSync('offline');
  }
}

function setSync(s) {
  sync = s;
  emit('sync');
}

function persist() {
  if (isDemo) return;
  if (shared()) ls.set(CKEY(profile.childId), entries);
  else ls.set(KEY, { version: 1, entries });
}

function writeFailed(e) {
  console.warn(e);
  emit('error', e?.code === 'permission-denied' ? '저장 권한이 없어요. 초대 코드를 다시 확인해 주세요.' : '서버에 올리지 못했어요. 인터넷 연결을 확인해 주세요.');
}

function setProfile(p) {
  profile = p;
  ls.set(PKEY, p);
}

function connect(childId, childName, nickname) {
  setProfile({ ...profile, childId, childName, nickname, lastChildId: childId, lastChildName: childName });
  entries = ls.get(CKEY(childId)) || {};
  emit('change');
  watch();
}

const valid = (e) =>
  e && /^\d{4}-\d{2}-\d{2}$/.test(e.date) && typeof e.text === 'string' && e.text.trim() &&
  LEVELS.some((l) => l.id === e.level);

export const store = {
  isDemo,
  isShared: shared,
  profile: () => ({ ...profile }),
  syncState: () => sync,
  localCount: () => Object.keys(localEntries()).length,

  get: (date) => entries[date] || null,
  all: () => Object.values(entries).sort((a, b) => a.date.localeCompare(b.date)),
  inYear: (y) => store.all().filter((e) => e.date.startsWith(`${y}-`)),

  upsert({ date, text, level, note = '' }) {
    const now = Date.now();
    const prev = entries[date];
    const e = { date, text: text.trim(), level, note: note.trim(), createdAt: prev?.createdAt || now, updatedAt: now };
    if (shared()) {
      e.author = prev?.author || profile.nickname || '';
      if (prev?.author && prev.author !== profile.nickname) e.editedBy = profile.nickname;
    }
    entries = { ...entries, [date]: e };
    persist();
    emit('change');
    if (shared()) cloud.putEntry(profile.childId, e).catch(writeFailed);
    return e;
  },

  remove(date) {
    const { [date]: _, ...rest } = entries;
    entries = rest;
    persist();
    emit('change');
    if (shared()) cloud.deleteEntry(profile.childId, date).catch(writeFailed);
  },

  exportJSON: () => JSON.stringify({ app: 'saerok', version: 1, child: profile.childName || null, entries }, null, 2),

  // 가져오기는 병합: 같은 날짜면 더 최근에 고친 쪽을 남긴다.
  importJSON(text) {
    const data = JSON.parse(text);
    const changed = [];
    for (const e of Object.values(data.entries || {})) {
      if (!valid(e)) continue;
      const cur = entries[e.date];
      if (!cur || (e.updatedAt || 0) > (cur.updatedAt || 0)) {
        const next = { note: '', createdAt: Date.now(), updatedAt: Date.now(), ...e };
        entries = { ...entries, [e.date]: next };
        changed.push(next);
      }
    }
    persist();
    emit('change');
    if (shared() && changed.length) cloud.putMany(profile.childId, changed).catch(writeFailed);
    return changed.length;
  },

  // ── 가족과 함께 쓰기 ──

  // 새 하늘을 만들고, 이 기기에 있던 기록을 올린다.
  async startFamily(childName, nickname) {
    const id = await cloud.createChild(childName);
    const list = Object.values(localEntries()).map((e) => ({ ...e, author: e.author || nickname }));
    await cloud.putMany(id, list);
    connect(id, childName, nickname);
    return id;
  },

  // 초대 코드로 들어간다. merge 면 이 기기 기록 중 서버에 없는 날짜만 올린다.
  async joinFamily(code, nickname, merge = false) {
    const id = cloud.parseCode(code);
    if (!id) throw new Error('invalid');
    const child = await cloud.getChild(id);
    if (!child) throw new Error('notfound');
    if (merge) {
      const list = Object.values(localEntries()).map((e) => ({ ...e, author: e.author || nickname }));
      await cloud.putMany(id, list, { skipExisting: true });
    }
    connect(id, child.name, nickname);
    return child;
  },

  setNickname(nickname) {
    setProfile({ ...profile, nickname });
    emit('sync');
  },

  async renameChild(name) {
    await cloud.renameChild(profile.childId, name);
    setProfile({ ...profile, childName: name, lastChildName: name });
    emit('sync');
  },

  // 이 기기만 연결을 끊는다. 서버의 기록은 그대로 남는다.
  disconnect() {
    unwatch?.();
    unwatch = null;
    const { childId, childName, ...rest } = profile;
    setProfile(rest);
    entries = localEntries();
    sync = 'local';
    emit('change');
  },

  inviteLink: () => `${location.origin}${location.pathname}#join=${profile.childId}`,
  inviteCode: () => (profile.childId ? cloud.formatCode(profile.childId) : ''),

  subscribe(fn) {
    subs.add(fn);
    return () => subs.delete(fn);
  },
};

boot();

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
