// 함께 쓰기용 서버 연결 (Firebase Firestore).
// 구조: children/{childId}                         { name, birth?, createdAt, createdBy }
//       children/{childId}/members/{memberId}      가족 한 사람 { nickname, joinedAt }
//       children/{childId}/entries/{date_memberId} 기록 하나 — 한 사람당 하루 하나 (store.js 의 Entry)
// childId(20자, 약 100비트 무작위)가 곧 초대 코드다. 아는 사람만 그 아이의 하늘에 들어올 수 있다.
import { FIREBASE_CONFIG } from './firebase-config.js';

const SDK = 'https://www.gstatic.com/firebasejs/10.12.2';
const ALPHA = 'abcdefghijkmnpqrstuvwxyz23456789'; // 헷갈리는 l, o, 0, 1 제외 (32자)

export const cloudReady = () => !!FIREBASE_CONFIG;

let ready = null;
function init() {
  if (ready) return ready;
  ready = (async () => {
    const [{ initializeApp }, A, fs] = await Promise.all([
      import(`${SDK}/firebase-app.js`),
      import(`${SDK}/firebase-auth.js`),
      import(`${SDK}/firebase-firestore.js`),
    ]);
    const app = initializeApp(FIREBASE_CONFIG);
    const auth = A.getAuth(app);
    let db;
    try {
      // 오프라인에서도 쓰고, 연결되면 알아서 올라가게
      db = fs.initializeFirestore(app, {
        localCache: fs.persistentLocalCache({ tabManager: fs.persistentMultipleTabManager() }),
      });
    } catch {
      db = fs.getFirestore(app);
    }
    // 로그인 화면 없이 기기마다 익명 계정을 하나 쓴다
    const user = await new Promise((res, rej) => {
      const un = A.onAuthStateChanged(auth, (u) => {
        if (u) un(), res(u);
        else A.signInAnonymously(auth).catch(rej);
      });
    });
    return { fs, db, user };
  })();
  ready.catch(() => (ready = null)); // 실패하면 다음에 다시 시도
  return ready;
}

export function newChildId() {
  const b = crypto.getRandomValues(new Uint8Array(20));
  return Array.from(b, (x) => ALPHA[x % 32]).join('');
}

// 링크 전체, 하이픈 넣은 코드, 맨 코드 모두 받는다
export function parseCode(input = '') {
  const s = input.trim().toLowerCase();
  const m = s.match(/join=([a-z2-9-]+)/);
  const raw = (m ? m[1] : s).replace(/[\s-]/g, '');
  return new RegExp(`^[${ALPHA}]{20}$`).test(raw) ? raw : null;
}
export const formatCode = (id) => id.match(/.{1,5}/g).join('-');

export async function createChild(name, birth) {
  const { fs, db, user } = await init();
  const id = newChildId();
  const data = { name, createdAt: Date.now(), createdBy: user.uid };
  if (birth) data.birth = birth;
  await fs.setDoc(fs.doc(db, 'children', id), data);
  return id;
}

export async function getChild(id) {
  const { fs, db } = await init();
  const s = await fs.getDoc(fs.doc(db, 'children', id));
  return s.exists() ? s.data() : null;
}

// fields: { name?, birth? } — birth 가 '' 이면 지운다
export async function updateChild(id, fields) {
  const { fs, db } = await init();
  const data = { ...fields };
  if ('birth' in data && !data.birth) data.birth = fs.deleteField();
  await fs.updateDoc(fs.doc(db, 'children', id), data);
}

// 아이 정보(이름·출생 연월)가 바뀌면 함께 쓰는 가족 모두에게 반영
export async function watchChild(id, onData) {
  const { fs, db } = await init();
  return fs.onSnapshot(fs.doc(db, 'children', id), (s) => s.exists() && onData(s.data()), (e) => console.warn(e));
}

export async function watchEntries(id, onData, onError) {
  const { fs, db } = await init();
  return fs.onSnapshot(
    fs.collection(db, 'children', id, 'entries'),
    { includeMetadataChanges: true },
    (snap) => {
      const map = {};
      snap.forEach((d) => (map[d.id] = d.data()));
      onData(map, snap.metadata);
    },
    onError
  );
}

const keyOf = (e) => `${e.date}_${e.memberId}`;
const dataOf = ({ id, ...rest }) => rest; // id 는 문서 이름이라 내용에는 넣지 않는다

export async function putEntry(id, e) {
  const { fs, db } = await init();
  return fs.setDoc(fs.doc(db, 'children', id, 'entries', keyOf(e)), dataOf(e));
}

export async function deleteEntry(id, entryId) {
  const { fs, db } = await init();
  return fs.deleteDoc(fs.doc(db, 'children', id, 'entries', entryId));
}

// 여러 개 한 번에. skipExisting 이면 서버에 이미 있는 기록(같은 날 같은 사람)은 건드리지 않는다.
export async function putMany(id, list, { skipExisting = false } = {}) {
  if (!list.length) return 0;
  const { fs, db } = await init();
  let todo = list;
  if (skipExisting) {
    const have = new Set();
    (await fs.getDocs(fs.collection(db, 'children', id, 'entries'))).forEach((d) => have.add(d.id));
    todo = list.filter((e) => !have.has(keyOf(e)));
  }
  for (let i = 0; i < todo.length; i += 400) {
    const batch = fs.writeBatch(db);
    for (const e of todo.slice(i, i + 400)) batch.set(fs.doc(db, 'children', id, 'entries', keyOf(e)), dataOf(e));
    await batch.commit();
  }
  return todo.length;
}

// ── 가족 구성원 ──
export async function getMembers(id) {
  const { fs, db } = await init();
  const out = [];
  (await fs.getDocs(fs.collection(db, 'children', id, 'members'))).forEach((d) => out.push({ id: d.id, ...d.data() }));
  return out.sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0));
}

// 없을 때만 만든다
export async function ensureMember(id, memberId, nickname) {
  const { fs, db } = await init();
  const ref = fs.doc(db, 'children', id, 'members', memberId);
  if (!(await fs.getDoc(ref)).exists()) await fs.setDoc(ref, { nickname, joinedAt: Date.now() });
}

export async function renameMember(id, memberId, nickname) {
  const { fs, db } = await init();
  await fs.setDoc(fs.doc(db, 'children', id, 'members', memberId), { nickname }, { merge: true });
}

// 예전 구조(날짜당 기록 하나) → 새 구조로 옮긴다.
// newMembers: { memberId: nickname }, moves: [{ from: 옛 문서 이름, to: 새 문서 이름 | null, data }]
export async function migrate(id, newMembers, moves) {
  const { fs, db } = await init();
  const batch = fs.writeBatch(db);
  for (const [mid, nickname] of Object.entries(newMembers)) {
    batch.set(fs.doc(db, 'children', id, 'members', mid), { nickname, joinedAt: Date.now() });
  }
  for (const m of moves) {
    if (m.to) batch.set(fs.doc(db, 'children', id, 'entries', m.to), m.data);
    batch.delete(fs.doc(db, 'children', id, 'entries', m.from));
  }
  await batch.commit();
}
