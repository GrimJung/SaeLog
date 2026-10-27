// 데이터 레이어 — 모드(밤하늘/정원)와 무관하다.
// Entry: { id, date:'YYYY-MM-DD', memberId, author, text, level:'pisik'|'mungkeul'|'forever', note,
//          createdAt, updatedAt }
// 한 사람당 하루에 하나. id = `${date}_${memberId}`.
// 내 기록만 쓰고 고치고 지울 수 있다. 가족의 기록은 읽기만.
//
// 저장소는 세 가지 중 하나:
//  - local : 이 기기에만 (기본). 사람은 '나'(memberId 'me') 한 명
//  - cloud : 아이 한 명의 하늘(childId)을 가족과 함께 (cloud.js)
//  - demo  : ?demo — 메모리에만, 저장 안 함
import { toKey, todayKey } from './date.js';
import { rng, hash } from './sky.js';
import * as cloud from './cloud.js';

export const LEVELS = [
  { id: 'pisik', label: '피식', desc: '완전 빵 터졌어' },
  { id: 'mungkeul', label: '뭉클', desc: '마음이 찡했어' },
  { id: 'forever', label: '평생기억', desc: '평생 잊지 않을게' },
];
export const levelOf = (id) => LEVELS.find((l) => l.id === id) || LEVELS[0];

const KEY = 'saerok:v1'; // 이 기기 전용 기록 { version: 2, entries: { id: Entry } }
const PKEY = 'saerok:profile'; // { childId, childName, birth, nickname, memberId, lastChildId, lastChildName }
const CKEY = (id) => `saerok:cache:${id}`; // 함께 쓰는 하늘의 사본 (빠른 첫 화면용)
const ME = 'me'; // 이 기기에만 쓸 때의 '나'
const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/; // 예전 구조의 문서 이름 (날짜만)

// 호칭으로 정해지는 구성원 ID — 새 휴대폰에서 같은 호칭으로 들어오면 같은 사람으로 이어진다
export const memberIdFor = (nickname) => `m${hash(`member:${(nickname || '가족').trim()}`).toString(36)}`;
export const entryId = (date, memberId) => `${date}_${memberId}`;

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
let unwatchChild = null;
let migratedFor = null;

const shared = () => !isDemo && !!profile.childId;
const myId = () => (isDemo ? ME : shared() ? profile.memberId || memberIdFor(profile.nickname) : ME);

// 저장된 모양을 지금 구조로 맞춘다. 예전 구조(날짜가 곧 문서 이름)면 legacyMid(e) 의 사람 것으로 본다.
function normalize(map, legacyMid) {
  const out = {};
  for (const [k, e] of Object.entries(map || {})) {
    if (!e || !DATE_KEY.test(e.date || '')) continue;
    if (DATE_KEY.test(k)) {
      const memberId = e.memberId || legacyMid(e);
      const id = entryId(e.date, memberId);
      const { editedBy, ...rest } = e;
      if (!out[id]) out[id] = { ...rest, memberId, id };
    } else {
      out[k] = { ...e, id: k };
    }
  }
  return out;
}

function localEntries() {
  const data = ls.get(KEY) || {};
  const map = normalize(data.entries, () => ME);
  if (data.entries && data.version !== 2) ls.set(KEY, { version: 2, entries: map }); // 한 번만 옮겨 둔다
  return map;
}

function boot() {
  if (isDemo) {
    entries = makeDemo();
    sync = 'demo';
  } else if (profile.childId) {
    entries = normalize(ls.get(CKEY(profile.childId)), (e) => memberIdFor(e.author));
    ensureMe();
    watch();
  } else {
    entries = localEntries();
  }
}

// 함께 쓰는 하늘에서 '나'를 구성원으로 등록 (예전 버전에서 연결해 둔 기기도 여기서 채워진다)
function ensureMe() {
  if (!shared()) return;
  if (!profile.memberId) setProfile({ ...profile, memberId: memberIdFor(profile.nickname) });
  cloud.ensureMember(profile.childId, profile.memberId, profile.nickname || '가족').catch((e) => console.warn(e));
}

async function watch() {
  const id = profile.childId;
  stopWatch();
  setSync('connecting');
  cloud
    .watchChild(id, (c) => {
      if (id !== profile.childId) return;
      if (c.name === profile.childName && (c.birth || '') === (profile.birth || '')) return;
      setProfile({ ...profile, childName: c.name, birth: c.birth || '', lastChildName: c.name });
      emit('child');
    })
    .then((un) => (id === profile.childId ? (unwatchChild = un) : un()))
    .catch((e) => console.warn(e));
  try {
    const un = await cloud.watchEntries(
      id,
      (raw, meta) => {
        if (id !== profile.childId) return;
        // 서버에서 확인된 내용일 때만 (기기에만 잠깐 반영된, 아직 거절될 수 있는 쓰기는 옮기지 않는다)
        if (!meta.fromCache && !meta.hasPendingWrites && migratedFor !== id && Object.keys(raw).some((k) => DATE_KEY.test(k))) migrate(id, raw);
        entries = normalize(raw, (e) => memberIdFor(e.author));
        ls.set(CKEY(id), entries);
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

// 예전 구조(날짜당 기록 하나)를 서버에서 새 구조로 옮긴다. 쓴 사람(author)의 기록이 된다.
// 두 기기가 동시에 옮겨도 결과가 같도록 ID 는 호칭에서 정해진다. 세션마다 한 번만 시도.
async function migrate(cid, raw) {
  migratedFor = cid;
  try {
    const members = await cloud.getMembers(cid);
    const have = new Set(members.map((m) => m.id));
    const newMembers = {};
    const moves = Object.entries(raw)
      .filter(([k]) => DATE_KEY.test(k))
      .map(([k, e]) => {
        const nickname = (e.author || '').trim() || '가족';
        const mid = memberIdFor(nickname);
        if (!have.has(mid)) newMembers[mid] = nickname;
        const to = entryId(e.date, mid);
        const { editedBy, ...rest } = e;
        return { from: k, to: raw[to] ? null : to, data: { ...rest, memberId: mid, author: nickname, note: rest.note || '' } };
      });
    await cloud.migrate(cid, newMembers, moves);
  } catch (e) {
    console.warn('기록 옮기기 실패 (규칙을 새로 게시했는지 확인)', e);
  }
}

function stopWatch() {
  unwatch?.();
  unwatchChild?.();
  unwatch = unwatchChild = null;
}

function setSync(s) {
  sync = s;
  emit('sync');
}

function persist() {
  if (isDemo) return;
  if (shared()) ls.set(CKEY(profile.childId), entries);
  else ls.set(KEY, { version: 2, entries });
}

function writeFailed(e) {
  console.warn(e);
  emit('error', e?.code === 'permission-denied' ? '저장하지 못했어요. 앱을 완전히 닫았다가 다시 열어 주세요.' : '서버에 올리지 못했어요. 인터넷 연결을 확인해 주세요.');
}

function setProfile(p) {
  profile = p;
  ls.set(PKEY, p);
}

function connect(childId, childName, nickname, memberId, birth = '') {
  setProfile({ ...profile, childId, childName, birth, nickname, memberId, lastChildId: childId, lastChildName: childName });
  entries = normalize(ls.get(CKEY(childId)), (e) => memberIdFor(e.author));
  emit('change');
  watch();
}

// 이 기기 기록을 '나'(memberId)의 기록으로
const asMine = (list, memberId, nickname) =>
  list.map((e) => ({ ...e, memberId, author: nickname, id: entryId(e.date, memberId) }));

const valid = (e) =>
  e && /^\d{4}-\d{2}-\d{2}$/.test(e.date) && typeof e.text === 'string' && e.text.trim() &&
  LEVELS.some((l) => l.id === e.level);

const byTime = (a, b) => a.date.localeCompare(b.date) || (a.createdAt || 0) - (b.createdAt || 0);

export const store = {
  isDemo,
  isShared: shared,
  // 기록에 '누가'를 보여줄지 (함께 쓰거나 예시 하늘일 때)
  isFamily: () => shared() || isDemo,
  myId,
  isMine: (e) => !!e && e.memberId === myId(),
  profile: () => ({ ...profile }),
  syncState: () => sync,
  localCount: () => Object.keys(localEntries()).length,

  mine: (date) => entries[entryId(date, myId())] || null,
  onDate: (date) => Object.values(entries).filter((e) => e.date === date).sort(byTime),
  byId: (id) => entries[id] || null,
  all: () => Object.values(entries).sort(byTime),
  inYear: (y) => store.all().filter((e) => e.date.startsWith(`${y}-`)),

  // 내 기록만 쓴다
  upsert({ date, text, level, note = '' }) {
    const now = Date.now();
    const memberId = myId();
    const id = entryId(date, memberId);
    const prev = entries[id];
    const e = {
      id, date, memberId, author: shared() ? profile.nickname || '' : isDemo ? '엄마' : '',
      text: text.trim(), level, note: note.trim(), createdAt: prev?.createdAt || now, updatedAt: now,
    };
    entries = { ...entries, [id]: e };
    persist();
    emit('change');
    if (shared()) cloud.putEntry(profile.childId, e).catch(writeFailed);
    return e;
  },

  // 내 기록만 지운다
  remove(date) {
    const id = entryId(date, myId());
    if (!entries[id]) return;
    const { [id]: _, ...rest } = entries;
    entries = rest;
    persist();
    emit('change');
    if (shared()) cloud.deleteEntry(profile.childId, id).catch(writeFailed);
  },

  exportJSON: () => JSON.stringify({ app: 'saerok', version: 2, child: profile.childName || null, entries }, null, 2),

  // 가져오기는 병합: 같은 날 같은 사람이면 더 최근에 고친 쪽을 남긴다.
  // 예전 파일(날짜당 하나)이나 이 기기 전용 기록('나')은 내 기록으로 들어온다.
  importJSON(text) {
    const data = JSON.parse(text);
    const me = myId();
    const map = normalize(data.entries, () => me);
    const changed = [];
    for (let e of Object.values(map)) {
      if (!valid(e)) continue;
      if (e.memberId === ME && me !== ME) [e] = asMine([e], me, profile.nickname || '');
      const cur = entries[e.id];
      if (!cur || (e.updatedAt || 0) > (cur.updatedAt || 0)) {
        const next = { note: '', createdAt: Date.now(), updatedAt: Date.now(), ...e };
        entries = { ...entries, [next.id]: next };
        changed.push(next);
      }
    }
    persist();
    emit('change');
    if (shared() && changed.length) cloud.putMany(profile.childId, changed).catch(writeFailed);
    return changed.length;
  },

  // ── 가족과 함께 쓰기 ──

  // 새 하늘을 만들고, 이 기기에 있던 기록을 내 기록으로 올린다.
  async startFamily(childName, nickname, birth = '') {
    const id = await cloud.createChild(childName, birth);
    const mid = memberIdFor(nickname);
    await cloud.ensureMember(id, mid, nickname);
    await cloud.putMany(id, asMine(Object.values(localEntries()), mid, nickname));
    connect(id, childName, nickname, mid, birth);
    return id;
  },

  // 이 하늘의 가족 (참여 화면에서 '누구세요?' 고를 때)
  async members(code) {
    const id = cloud.parseCode(code);
    return id ? cloud.getMembers(id) : [];
  },

  // 초대 코드로 들어간다. 이미 있는 호칭을 고르면 그 사람으로 이어진다.
  // merge 면 이 기기 기록 중 서버에 없는 것만 내 기록으로 올린다.
  async joinFamily(code, nickname, merge = false) {
    const id = cloud.parseCode(code);
    if (!id) throw new Error('invalid');
    const child = await cloud.getChild(id);
    if (!child) throw new Error('notfound');
    const found = (await cloud.getMembers(id)).find((m) => m.nickname === nickname);
    const mid = found?.id || memberIdFor(nickname);
    if (!found) await cloud.ensureMember(id, mid, nickname);
    if (merge) await cloud.putMany(id, asMine(Object.values(localEntries()), mid, nickname), { skipExisting: true });
    connect(id, child.name, nickname, mid, child.birth || '');
    return child;
  },

  // 호칭을 바꿔도 같은 사람(memberId)이다. 이미 띄운 별의 이름표는 그대로.
  setNickname(nickname) {
    setProfile({ ...profile, nickname });
    if (shared() && profile.memberId) cloud.renameMember(profile.childId, profile.memberId, nickname).catch(writeFailed);
    emit('sync');
  },

  // 아이 이름·출생 연월. 함께 쓰는 중이면 가족 모두에게 바뀐다.
  async setChild({ name = profile.childName || '', birth = profile.birth || '' }) {
    if (shared()) {
      const fields = {};
      if (name !== profile.childName) fields.name = name;
      if (birth !== (profile.birth || '')) fields.birth = birth;
      if (Object.keys(fields).length) await cloud.updateChild(profile.childId, fields);
      setProfile({ ...profile, childName: name, birth, lastChildName: name });
    } else {
      setProfile({ ...profile, childName: name, birth });
    }
    emit('child');
  },

  // 이 기기만 연결을 끊는다. 서버의 기록은 그대로 남는다.
  disconnect() {
    stopWatch();
    const { childId, memberId, ...rest } = profile;
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
      const add = (memberId, author, lv) => {
        const p = pools[lv];
        out[entryId(date, memberId)] = {
          id: entryId(date, memberId), date, memberId, author, level: lv,
          text: p[Math.floor(R() * p.length)],
          note: notes[Math.floor(R() * notes.length)],
          createdAt: +d, updatedAt: +d,
        };
      };
      add(ME, '엄마', level);
      // 가끔은 아빠도 같은 날 별을 띄운다 → 쌍성
      if (R() < 0.18) add('dad', '아빠', R() < 0.5 ? 'pisik' : 'mungkeul');
    }
    d.setDate(d.getDate() + 1);
  }
  return out;
}
