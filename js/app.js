import { store, LEVELS, levelOf } from './store.js';
import * as D from './date.js';
import { currentMode } from './modes/index.js';
import { cloudReady, parseCode, formatCode } from './cloud.js';

const $ = (s, r = document) => r.querySelector(s);
const esc = (s = '') => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// iOS 사파리(특히 홈 화면 앱)는 CSS touch-action 을 무시하고 '두 번 탭 확대'를 할 때가 있다.
// 빠르게 두 번째 탭이 들어오면 사파리의 기본 동작(확대)을 막고, 누른 버튼은 직접 눌러 준다.
// 입력 칸과 은하수 캔버스(자체 확대·축소가 있음)는 건드리지 않는다.
{
  let lastTap = 0;
  document.addEventListener(
    'touchend',
    (ev) => {
      const now = Date.now();
      const quick = now - lastTap < 350;
      lastTap = now;
      if (!quick || ev.touches.length) return;
      const t = ev.target;
      if (t.closest?.('input, textarea, select, canvas, [contenteditable]')) return;
      ev.preventDefault();
      t.closest?.('button, a, label, [data-id]')?.click();
    },
    { passive: false }
  );
}

const mode = currentMode();
const viewState = {}; // 모드 뷰가 탭을 오가도 위치(주/연도)를 기억
const ICONS = {
  today: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M19 14.5A7.5 7.5 0 1 1 9.5 5a6 6 0 0 0 9.5 9.5Z"/><path d="M15 4.5v3M13.5 6h3" opacity=".7"/></svg>`,
  forever: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M12 3c.6 4.6 3.4 7.4 8 8-4.6.6-7.4 3.4-8 8-.6-4.6-3.4-7.4-8-8 4.6-.6 7.4-3.4 8-8Z"/></svg>`,
};
const TABS = [
  { id: 'today', label: '오늘', icon: ICONS.today },
  ...mode.views,
  { id: 'forever', label: '평생기억', icon: ICONS.forever },
];
const SYNC_LABEL = {
  connecting: '연결하는 중',
  synced: '함께 쓰는 중',
  pending: '올리는 중',
  offline: '오프라인 · 연결되면 올라가요',
  error: '연결에 문제가 있어요',
};

// 받침이 있으면 '이', 없으면 '가' (엄마가 / 준이)
const ga = (w = '') => {
  const c = w.charCodeAt(w.length - 1);
  return w + (c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 ? '이' : '가');
};

// 누가 띄운 별인지 (함께 쓰거나 예시 하늘일 때)
function whoLine(e) {
  if (!store.isFamily() || !e?.author) return '';
  return `${ga(e.author)} 띄운 별`;
}

// ── 탭 / 라우팅 ──
const views = $('#views');
const tabbar = $('#tabs');
for (const t of TABS) {
  const sec = document.createElement('section');
  sec.className = 'view';
  sec.id = `view-${t.id}`;
  sec.dataset.id = t.id;
  views.append(sec);
  tabbar.insertAdjacentHTML('beforeend',
    `<a class="tab" href="#${t.id}" data-id="${t.id}" role="tab">${t.icon}<span>${t.label}</span></a>`);
}

let active = null;
let handle = null;
function go() {
  if (location.hash.startsWith('#join=')) return handleJoinLink();
  const id = TABS.some((t) => t.id === location.hash.slice(1)) ? location.hash.slice(1) : 'today';
  if (handle) handle.unmount(), (handle = null);
  active = id;
  document.querySelectorAll('.view').forEach((v) => v.classList.toggle('active', v.dataset.id === id));
  document.querySelectorAll('.tab').forEach((a) => a.setAttribute('aria-selected', a.dataset.id === id));
  document.body.dataset.view = id;
  const sec = $(`#view-${id}`);
  const mv = mode.views.find((v) => v.id === id);
  if (mv) handle = mv.mount(sec, { store, showEntry, state: viewState });
  else if (id === 'today') fillToday();
  else if (id === 'forever') renderForever();
  window.scrollTo(0, 0);
}
window.addEventListener('hashchange', go);

// ── 오늘 기록 ──
let editDate = D.todayKey();
let dirty = false; // 쓰는 중이면 가족의 변경이 들어와도 입력칸을 덮어쓰지 않는다
const today = $('#view-today');
today.innerHTML = `
  <header class="page-head">
    <p class="eyebrow" id="t-eyebrow"></p>
    <div class="date-row">
      <button class="nav" data-d="-1" aria-label="전날">‹</button>
      <label class="date-pick"><span id="t-date"></span><input type="date" id="t-input" aria-label="날짜 고르기"></label>
      <button class="nav" data-d="1" aria-label="다음 날">›</button>
    </div>
    <p class="sub" id="t-sub"></p>
  </header>
  <form id="t-form" autocomplete="off">
    <div class="quote-wrap">
      <textarea id="t-text" rows="3" maxlength="300" placeholder="아이가 한 말을 그대로 적어주세요"></textarea>
    </div>
    <p class="field-label">어떤 기분이었나요?</p>
    <div class="levels" role="radiogroup">
      ${LEVELS.map((l) => `
        <label class="level">
          <input type="radio" name="level" value="${l.id}">
          <span class="star-ico ${l.id}"></span>
          <b>${l.label}</b><small>${l.desc}</small>
        </label>`).join('')}
    </div>
    <input id="t-note" class="note-input" maxlength="120" placeholder="상황 메모 (선택) · 예: 목욕하다가">
    <button class="primary" id="t-save" type="submit" disabled>하늘에 띄우기</button>
    <button class="ghost" id="t-del" type="button" hidden>내 기록 지우기</button>
  </form>
  <section class="family-day" id="t-family" hidden></section>`;

const form = $('#t-form');
const tText = $('#t-text');
const tNote = $('#t-note');
const tSave = $('#t-save');

function fillToday() {
  const isToday = editDate === D.todayKey();
  const e = store.mine(editDate);
  $('#t-eyebrow').textContent = isToday ? '오늘의 새록' : '지난 날의 새록';
  $('#t-date').textContent = isToday ? `오늘 · ${D.fmtShort(editDate)}` : D.fmtShort(editDate);
  $('#t-sub').textContent = e
    ? '이미 띄운 내 별이에요. 고쳐 쓸 수 있어요.'
    : isToday ? '아이 재우고, 오늘 하루를 한마디로.' : '그날 아이가 했던 말을 떠올려 보세요.';
  const inp = $('#t-input');
  inp.value = editDate;
  inp.max = D.todayKey();
  today.querySelector('[data-d="1"]').disabled = isToday;
  tText.value = e?.text || '';
  tNote.value = e?.note || '';
  form.querySelectorAll('input[name=level]').forEach((r) => (r.checked = r.value === e?.level));
  tSave.textContent = e ? '고쳐서 띄우기' : '하늘에 띄우기';
  $('#t-del').hidden = !e;
  renderFamilyDay();
  dirty = false;
  autoGrow();
  validate();
}

// 같은 날 가족이 띄운 별 (읽기만)
function renderFamilyDay() {
  const box = $('#t-family');
  const others = store.onDate(editDate).filter((x) => !store.isMine(x));
  box.hidden = !others.length;
  if (!others.length) return (box.innerHTML = '');
  box.innerHTML = `<p class="field-label">같은 날 가족이 띄운 별</p>
    ${others.map((x) => `
      <button type="button" class="fam-entry lv-${x.level}" data-id="${esc(x.id)}">
        <span class="star-ico ${x.level}"></span>
        <span class="fam-text">${esc(x.text)}</span>
        <span class="fam-who">${esc(x.author || '가족')} · ${levelOf(x.level).label}</span>
      </button>`).join('')}`;
}
$('#t-family').addEventListener('click', (ev) => {
  const b = ev.target.closest('[data-id]');
  if (b) showEntry(store.byId(b.dataset.id));
});
function validate() {
  tSave.disabled = !(tText.value.trim() && form.level.value);
}
function autoGrow() {
  tText.style.height = 'auto';
  tText.style.height = `${Math.max(96, tText.scrollHeight)}px`;
}
tText.addEventListener('input', () => ((dirty = true), autoGrow(), validate()));
tNote.addEventListener('input', () => (dirty = true));
form.addEventListener('change', () => ((dirty = true), validate()));
today.querySelectorAll('.nav').forEach((b) =>
  b.addEventListener('click', () => {
    const next = D.addDays(editDate, +b.dataset.d);
    if (next > D.todayKey()) return;
    editDate = next;
    fillToday();
  })
);
$('#t-input').addEventListener('change', (ev) => {
  if (ev.target.value && ev.target.value <= D.todayKey()) {
    editDate = ev.target.value;
    fillToday();
  }
});
form.addEventListener('submit', (ev) => {
  ev.preventDefault();
  if (tSave.disabled) return;
  const date = editDate;
  const saved = store.upsert({ date, text: tText.value, level: form.level.value, note: tNote.value });
  const hid = saved.text !== tText.value.trim() || saved.note !== tNote.value.trim();
  rise(form.level.value);
  fillToday();
  toast(hid ? '개인정보·욕설은 * 로 가려서 별을 띄웠어요' : `${D.fmtShort(date)} 하늘에 별이 떴어요`, {
    label: `${mode.views[0].label} 보기`,
    onClick: () => {
      viewState.week = D.weekStart(date);
      location.hash = `#${mode.views[0].id}`;
    },
  });
});
$('#t-del').addEventListener('click', () => {
  const msg = store.isShared() ? '가족의 별은 그대로 남아요.' : '';
  if (!confirm(`${D.fmtShort(editDate)}의 내 기록을 지울까요? ${msg}`)) return;
  store.remove(editDate);
  fillToday();
  toast('기록을 지웠어요');
});

function rise(level) {
  const r = tSave.getBoundingClientRect();
  const s = document.createElement('span');
  s.className = `rise star-ico ${level}`;
  s.style.left = `${r.left + r.width / 2}px`;
  s.style.top = `${r.top}px`;
  document.body.append(s);
  s.addEventListener('animationend', () => s.remove());
}

// ── 평생기억 모음 ──
function renderForever() {
  const list = store.all().filter((e) => e.level === 'forever').reverse();
  $('#view-forever').innerHTML = `
    <header class="page-head">
      <p class="eyebrow">평생기억</p>
      <h1>절대 잊고 싶지 않은 말</h1>
      ${list.length ? `<p class="sub">${list.length}개의 1등성</p>` : ''}
    </header>
    ${list.length
      ? `<div class="fcards">${list.map((e) => `
          <article class="fcard" data-id="${esc(e.id)}" tabindex="0">
            <span class="star-ico forever"></span>
            <blockquote>${esc(e.text)}</blockquote>
            <footer><time>${D.fmtLong(e.date)}</time>${e.note ? `<span>${esc(e.note)}</span>` : ''}${whoLine(e) ? `<span>${esc(whoLine(e))}</span>` : ''}</footer>
          </article>`).join('')}</div>`
      : `<div class="empty"><span class="star-ico forever"></span><p>꼭 간직하고 싶은 말이 생기면<br>‘평생기억’으로 띄워주세요.<br>가장 밝은 별로 여기 모여요.</p></div>`}`;
}
$('#view-forever').addEventListener('click', (ev) => {
  const c = ev.target.closest('.fcard');
  if (c) showEntry(store.byId(c.dataset.id));
});
$('#view-forever').addEventListener('keydown', (ev) => {
  const c = ev.target.closest('.fcard');
  if (c && ev.key === 'Enter') showEntry(store.byId(c.dataset.id));
});

// ── 별 카드 시트 ──
const sheet = $('#entry-sheet');
function showEntry(e) {
  if (!e) return;
  const lv = levelOf(e.level);
  sheet.querySelector('.sheet-card').className = `sheet-card lv-${e.level}`;
  sheet.querySelector('.badge').innerHTML = `<span class="star-ico ${e.level}"></span>${lv.label}`;
  sheet.querySelector('time').textContent = D.fmtLong(e.date);
  sheet.querySelector('blockquote').textContent = e.text;
  const note = sheet.querySelector('.note');
  note.textContent = e.note || '';
  note.hidden = !e.note;
  const who = sheet.querySelector('.who');
  who.textContent = whoLine(e);
  who.hidden = !who.textContent;
  // 내 별만 고칠 수 있다
  sheet.querySelector('[data-act=edit]').hidden = !store.isMine(e);
  // 같은 날 함께 뜬 별
  const also = store.onDate(e.date).filter((x) => x.id !== e.id);
  const box = sheet.querySelector('.also');
  box.hidden = !also.length;
  box.innerHTML = also.length
    ? `<p>같은 날 함께 뜬 별</p>${also.map((x) => `
        <button type="button" data-id="${esc(x.id)}"><span class="dot ${x.level}"></span><span class="txt">${esc(x.text)}</span><span class="by">${esc(x.author || '가족')}</span></button>`).join('')}`
    : '';
  sheet.dataset.date = e.date;
  if (sheet.hidden) openSheet(sheet);
}
sheet.querySelector('.also').addEventListener('click', (ev) => {
  const b = ev.target.closest('[data-id]');
  if (b) showEntry(store.byId(b.dataset.id));
});
sheet.querySelector('[data-act=edit]').addEventListener('click', () => {
  editDate = sheet.dataset.date;
  closeSheet(sheet);
  if (location.hash === '#today') fillToday();
  else location.hash = '#today';
});

function openSheet(s) {
  s.hidden = false;
  requestAnimationFrame(() => s.classList.add('open'));
}
function closeSheet(s) {
  s.classList.remove('open');
  setTimeout(() => !s.classList.contains('open') && (s.hidden = true), 220); // 그 사이 다시 열렸으면 그대로
}
// 바깥(어두운 배경)을 눌러 닫기 — 누르기 시작한 곳과 뗀 곳이 모두 배경일 때만.
// 입력 칸이 있는 창은 바깥을 눌러도 닫지 않는다. 사파리 자동 완성 막대 등을 누른 터치가
// 배경으로 새어 들어와 쓰던 내용이 날아가는 일을 막기 위해서. (취소·닫기 버튼으로만 닫힘)
document.querySelectorAll('.sheet').forEach((s) => {
  let downOnBackdrop = false;
  s.addEventListener('pointerdown', (ev) => (downOnBackdrop = ev.target === s));
  s.addEventListener('click', (ev) => {
    if (ev.target.closest('[data-act=close]')) return closeSheet(s);
    if (ev.target !== s || !downOnBackdrop) return;
    downOnBackdrop = false;
    if (s.querySelector('form')) {
      document.activeElement?.blur?.(); // 키보드만 내린다
      return;
    }
    closeSheet(s);
  });
});
// 키보드가 올라오면 창이 키보드(와 자동 완성 막대) 위로 올라오도록
// 실제로 보이는 영역(visualViewport)에 창을 맞춘다.
if (window.visualViewport) {
  const vv = window.visualViewport;
  const fitSheets = () => {
    const root = document.documentElement.style;
    root.setProperty('--vvt', `${vv.offsetTop}px`);
    root.setProperty('--vvh', `${vv.height}px`);
  };
  vv.addEventListener('resize', fitSheets);
  vv.addEventListener('scroll', fitSheets);
  fitSheets();
}
// 창 안의 칸을 누르면, 그 칸이 보이도록 창 안에서 스크롤
document.addEventListener('focusin', (ev) => {
  if (!ev.target.matches?.('.sheet input, .sheet textarea')) return;
  setTimeout(() => ev.target.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 300);
});

document.addEventListener('keydown', (ev) => {
  if (ev.key === 'Escape') document.querySelectorAll('.sheet.open').forEach(closeSheet);
});

// ── 메뉴 ──
const menu = $('#menu-sheet');
$('#menu-btn').addEventListener('click', () => {
  renderFamilyBox();
  openSheet(menu);
});
$('#child-chip').addEventListener('click', () => {
  renderFamilyBox();
  openSheet(menu);
});
$('#m-export').addEventListener('click', () => {
  const blob = new Blob([store.exportJSON()], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `saerok-${D.todayKey()}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});
$('#m-import').addEventListener('change', async (ev) => {
  const f = ev.target.files[0];
  if (!f) return;
  try {
    const n = store.importJSON(await f.text());
    closeSheet(menu);
    toast(`${n}개의 별을 가져왔어요`);
    go();
  } catch {
    toast('파일을 읽지 못했어요');
  }
  ev.target.value = '';
});
if (store.isDemo) {
  $('#demo-banner').hidden = false;
  $('#m-demo').href = './';
  $('#m-demo').textContent = '내 하늘로 돌아가기';
}

// ── 가족과 함께 쓰기 ──
function renderFamilyBox() {
  const box = $('#family-box');
  const p = store.profile();
  if (store.isDemo) return (box.innerHTML = '');
  if (!cloudReady()) {
    box.innerHTML = `<h3>가족과 함께 쓰기</h3>
      <p class="menu-desc">함께 쓰기를 켜려면 서버(Firebase) 연결이 필요해요. 아직 설정 전이에요.</p>`;
    return;
  }
  if (!p.childId) {
    box.innerHTML = `<h3>가족과 함께 쓰기</h3>
      <p class="menu-desc">아이 한 명의 하늘을 가족과 함께 채워요. 둘 다 쓰고, 둘 다 볼 수 있어요.</p>
      <button class="menu-item accent" data-fam="start">함께 쓰기 시작하기<small>새 하늘을 만들고 가족을 초대해요</small></button>
      <button class="menu-item" data-fam="join">초대 코드로 참여하기<small>가족에게 받은 링크나 코드가 있다면</small></button>
      ${p.lastChildId ? `<button class="menu-item" data-fam="rejoin">${esc(p.lastChildName || '')}의 하늘에 다시 연결하기</button>` : ''}
      <button class="menu-item" data-fam="profile">아이 정보${p.childName || p.birth ? `<small>${esc([p.childName, D.fmtBirth(p.birth)].filter(Boolean).join(' · '))}</small>` : '<small>출생 연월을 넣으면 은하수에 개월 수가 보여요</small>'}</button>`;
    return;
  }
  const s = store.syncState();
  box.innerHTML = `<h3>${esc(p.childName)}의 하늘</h3>
    <p class="menu-desc"><span class="sync-dot ${s}"></span>${SYNC_LABEL[s] || ''} · 나는 ‘${esc(p.nickname)}’</p>
    <button class="menu-item accent" data-fam="invite">가족 초대하기<small>초대 링크를 보내면 같은 하늘을 함께 써요</small></button>
    <button class="menu-item" data-fam="profile">아이 정보·호칭 바꾸기${p.birth ? `<small>${D.fmtBirth(p.birth)}</small>` : ''}</button>
    <button class="ghost leave" data-fam="leave">이 기기에서 연결 끊기</button>`;
}

$('#menu-sheet').addEventListener('click', (ev) => {
  const act = ev.target.closest('[data-fam]')?.dataset.fam;
  if (!act) return;
  if (act === 'start') famStart();
  else if (act === 'join') famJoin();
  else if (act === 'rejoin') famJoin(formatCode(store.profile().lastChildId));
  else if (act === 'invite') famInvite(false);
  else if (act === 'profile') famProfile();
  else if (act === 'leave') {
    const p = store.profile();
    if (!confirm(`이 기기에서 ${p.childName}의 하늘 연결을 끊을까요?\n함께 쓴 기록은 서버에 그대로 남고, 언제든 다시 연결할 수 있어요.`)) return;
    store.disconnect();
    renderFamilyBox();
    renderChip();
    go();
    toast('연결을 끊었어요. 이제 이 기기에만 저장돼요.');
  }
});

const famSheet = $('#family-sheet');
function fam(html) {
  $('#family-body').innerHTML = html;
  closeSheet(menu);
  openSheet(famSheet);
  // 창만 띄운다. 칸을 눌러야 키보드가 올라온다 (바로 키보드가 올라오면 창이 가려져서)
}

const NICKS = ['엄마', '아빠', '할머니', '할아버지'];
function birthField(value = '') {
  const max = D.todayKey().slice(0, 7);
  return `<label class="field"><span>출생 연월 <em>선택 · 은하수에 개월 수가 보여요</em></span>
      <input name="birth" type="month" autocomplete="off" min="2000-01" max="${max}" placeholder="예: 2025-03" value="${esc(value || '')}"></label>`;
}
// type=month 를 지원하지 않는 브라우저에선 글자로 들어오므로 '2025.3', '2025-03' 등을 정리
function readBirth(f) {
  const raw = f.birth.value.trim();
  if (!raw) return '';
  const m = raw.match(/^(\d{4})\D+(\d{1,2})/);
  const b = m ? `${m[1]}-${m[2].padStart(2, '0')}` : '';
  if (!D.isBirth(b) || b > D.todayKey().slice(0, 7)) throw new Error('birth');
  return b;
}
function nickField(value = '') {
  return `<label class="field"><span>내 호칭 <em>기록 옆에 표시돼요</em></span>
      <input name="nick_search" maxlength="10" required type="search" enterkeyhint="done" autocomplete="off" autocorrect="off" spellcheck="false" data-1p-ignore data-lpignore="true" data-form-type="other" placeholder="예: 엄마" value="${esc(value)}"></label>
    <div class="chips">${NICKS.map((n) => `<button type="button" class="chip" data-nick="${n}">${n}</button>`).join('')}</div>`;
}
famSheet.addEventListener('click', (ev) => {
  const chip = ev.target.closest('[data-nick]');
  if (chip) chip.closest('form').nick_search.value = chip.dataset.nick;
});

async function busy(btn, label, fn) {
  const prev = btn.textContent;
  btn.disabled = true;
  btn.textContent = label;
  const err = $('#family-body .form-err');
  if (err) err.hidden = true;
  try {
    await fn();
  } catch (e) {
    console.warn(e);
    if (err) {
      err.hidden = false;
      err.textContent =
        e.message === 'invalid' ? '코드 형식이 맞지 않아요. 받은 링크를 그대로 붙여넣어 보세요.'
        : e.message === 'notfound' ? '이 코드의 하늘을 찾지 못했어요. 다시 확인해 주세요.'
        : e.message === 'birth' ? '출생 연월을 다시 확인해 주세요. 예: 2025-03'
        : '연결하지 못했어요. 인터넷 연결을 확인하고 다시 시도해 주세요.';
    }
    btn.disabled = false;
    btn.textContent = prev;
  }
}

function famStart() {
  const n = store.localCount();
  fam(`<h3>함께 쓰기 시작하기</h3>
    <p class="menu-desc">우리 아이의 하늘을 하나 만들어요. 만든 뒤 초대 링크를 가족에게 보내면 돼요.</p>
    <form id="f-start" autocomplete="off">
      <label class="field"><span>아이 이&#8203;름</span><input name="kid_search" maxlength="20" required type="search" enterkeyhint="done" autocomplete="off" autocorrect="off" spellcheck="false" data-1p-ignore data-lpignore="true" data-form-type="other" placeholder="예: 새록이" value="${esc(store.profile().childName || '')}"></label>
      ${birthField(store.profile().birth)}
      ${nickField(store.profile().nickname)}
      ${n ? `<p class="menu-desc small">이 기기에 있던 별 ${n}개도 함께 올라가요.</p>` : ''}
      <p class="form-err" hidden></p>
      <div class="sheet-actions"><button type="button" class="ghost" data-act="close">취소</button><button class="secondary strong">하늘 만들기</button></div>
    </form>`);
  $('#f-start').addEventListener('submit', (ev) => {
    ev.preventDefault();
    const f = ev.target;
    const child = f.kid_search.value.trim();
    const nick = f.nick_search.value.trim();
    if (!child || !nick) return;
    busy(f.querySelector('.strong'), '만드는 중…', async () => {
      await store.startFamily(child, nick, readBirth(f));
      renderChip();
      go();
      famInvite(true);
    });
  });
}

function famJoin(code = '') {
  const p = store.profile();
  const n = store.localCount();
  fam(`<h3>초대 코드로 참여하기</h3>
    <p class="menu-desc">가족에게 받은 링크나 코드를 붙여넣어 주세요.</p>
    <form id="f-join" autocomplete="off">
      <label class="field"><span>초대 코드</span>
        <input name="code" required autocapitalize="off" autocomplete="off" spellcheck="false" placeholder="xxxxx-xxxxx-xxxxx-xxxxx" value="${esc(code)}"></label>
      ${nickField(p.nickname)}
      <p class="menu-desc small member-hint" hidden>이미 이 하늘에 있는 가족이면 내 호칭을 골라 주세요. 쓰던 별을 이어서 써요.</p>
      ${n && !p.childId ? `<label class="check"><input type="checkbox" name="merge" checked> 이 기기에 있던 별 ${n}개도 함께 옮기기<small>그 하늘에 내 별이 이미 있는 날은 그쪽을 남겨요</small></label>` : ''}
      ${p.childId ? `<p class="menu-desc small">지금 연결된 ${esc(p.childName)}의 하늘에서 바뀌어요.</p>` : ''}
      <p class="form-err" hidden></p>
      <div class="sheet-actions"><button type="button" class="ghost" data-act="close">취소</button><button class="secondary strong">함께 쓰기</button></div>
    </form>`);
  // 이 하늘에 이미 있는 가족을 맨 앞에 — 새 휴대폰이면 내 호칭을 골라 이어서 쓰면 된다
  const showMembers = (c) =>
    store.members(c).then((list) => {
      const chips = $('#f-join .chips');
      if (!chips || !list.length) return;
      chips.querySelectorAll('.chip.member').forEach((x) => x.remove());
      const names = list.map((m) => m.nickname);
      chips.querySelectorAll('.chip').forEach((x) => names.includes(x.dataset.nick) && x.remove());
      chips.insertAdjacentHTML('afterbegin', names.map((n) => `<button type="button" class="chip member" data-nick="${esc(n)}">${esc(n)}</button>`).join(''));
      $('#f-join .member-hint').hidden = false;
    }).catch(() => {});
  if (code) showMembers(code);
  $('#f-join').code.addEventListener('change', (ev) => showMembers(ev.target.value));

  $('#f-join').addEventListener('submit', (ev) => {
    ev.preventDefault();
    const f = ev.target;
    const nick = f.nick_search.value.trim();
    if (!nick) return;
    busy(f.querySelector('.strong'), '연결하는 중…', async () => {
      const child = await store.joinFamily(f.code.value, nick, !!f.merge?.checked);
      closeSheet(famSheet);
      renderChip();
      go();
      toast(`${child.name}의 하늘에 함께해요`);
    });
  });
}

function famInvite(first) {
  const p = store.profile();
  fam(`<h3>${first ? '하늘이 만들어졌어요' : '가족 초대하기'}</h3>
    <p class="menu-desc">이 링크를 받은 사람은 ${esc(p.childName)}의 하늘을 함께 보고 쓸 수 있어요.<br>꼭 가족에게만 보내주세요.</p>
    <div class="code-box"><small>초대 코드</small><code>${store.inviteCode()}</code></div>
    <div class="sheet-actions">
      <button class="ghost" data-inv="copy">링크 복사</button>
      ${navigator.share ? '<button class="secondary strong" data-inv="share">공유하기</button>' : ''}
      <button class="secondary" data-act="close">닫기</button>
    </div>`);
}
famSheet.addEventListener('click', async (ev) => {
  const act = ev.target.closest('[data-inv]')?.dataset.inv;
  if (!act) return;
  const link = store.inviteLink();
  const name = store.profile().childName;
  if (act === 'share') {
    try {
      await navigator.share({ title: '새록새록', text: `${name}의 하늘에 함께 별을 띄워요`, url: link });
    } catch {}
  } else {
    try {
      await navigator.clipboard.writeText(link);
      toast('초대 링크를 복사했어요');
    } catch {
      prompt('이 링크를 복사해서 보내주세요', link);
    }
  }
});

function famProfile() {
  const p = store.profile();
  const sh = store.isShared();
  fam(`<h3>${sh ? '아이 정보·호칭 바꾸기' : '아이 정보'}</h3>
    <form id="f-prof" autocomplete="off">
      <label class="field"><span>아이 이&#8203;름 ${sh ? '<em>가족 모두에게 바뀌어요</em>' : ''}</span><input name="kid_search" maxlength="20" type="search" enterkeyhint="done" autocomplete="off" autocorrect="off" spellcheck="false" data-1p-ignore data-lpignore="true" data-form-type="other" ${sh ? 'required' : ''} placeholder="예: 새록이" value="${esc(p.childName || '')}"></label>
      ${birthField(p.birth)}
      ${sh ? nickField(p.nickname) + '<p class="menu-desc small">이미 띄운 별의 이름표는 그대로 남아요.</p>' : ''}
      <p class="form-err" hidden></p>
      <div class="sheet-actions"><button type="button" class="ghost" data-act="close">취소</button><button class="secondary strong">저장</button></div>
    </form>`);
  $('#f-prof').addEventListener('submit', (ev) => {
    ev.preventDefault();
    const f = ev.target;
    const child = f.kid_search.value.trim();
    const nick = sh ? f.nick_search.value.trim() : '';
    if (sh && (!child || !nick)) return;
    busy(f.querySelector('.strong'), '저장하는 중…', async () => {
      await store.setChild({ name: child, birth: readBirth(f) });
      if (sh) store.setNickname(nick);
      closeSheet(famSheet);
      renderChip();
      toast('저장했어요');
    });
  });
}

// 초대 링크로 들어온 경우 (#join=코드) — 코드는 주소의 # 뒤에 있어 서버로 전송되지 않는다
function handleJoinLink() {
  const code = parseCode(location.hash.slice(1));
  history.replaceState(null, '', `${location.pathname}${location.search}#today`);
  go();
  if (store.isDemo) return;
  if (!cloudReady()) return toast('함께 쓰기가 아직 준비되지 않았어요');
  if (!code) return toast('초대 링크가 올바르지 않아요');
  if (store.profile().childId === code) return toast('이미 이 하늘을 함께 쓰고 있어요');
  famJoin(formatCode(code));
}

// ── 상단 아이 이름 + 연결 상태 ──
function renderChip() {
  const chip = $('#child-chip');
  const p = store.profile();
  chip.hidden = !store.isShared();
  if (chip.hidden) return;
  const s = store.syncState();
  chip.innerHTML = `<span class="sync-dot ${s}"></span>${esc(p.childName)}`;
  chip.title = SYNC_LABEL[s] || '';
}

// ── 토스트 ──
let toastTimer;
function toast(msg, action) {
  const t = $('#toast');
  t.innerHTML = `<span>${esc(msg)}</span>${action ? `<button>${esc(action.label)}</button>` : ''}`;
  if (action) t.querySelector('button').onclick = () => ((t.hidden = true), action.onClick());
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.hidden = true), 4200);
}

store.subscribe((type, info) => {
  if (type === 'error') return toast(info);
  renderChip();
  if (!menu.hidden) renderFamilyBox();
  if (type !== 'change') return;
  if (active === 'forever') renderForever();
  if (active === 'today') {
    if (!dirty && document.activeElement?.closest('#t-form') == null) fillToday();
    else renderFamilyDay(); // 쓰는 중이어도 가족의 별은 바로 보이게
  }
});

renderChip();
go();
