import { store, LEVELS, levelOf } from './store.js';
import * as D from './date.js';
import { currentMode } from './modes/index.js';

const $ = (s, r = document) => r.querySelector(s);
const esc = (s = '') => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

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
    <p class="field-label">어떤 말이었나요?</p>
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
    <button class="ghost" id="t-del" type="button" hidden>이 날의 기록 지우기</button>
  </form>`;

const form = $('#t-form');
const tText = $('#t-text');
const tNote = $('#t-note');
const tSave = $('#t-save');

function fillToday() {
  const isToday = editDate === D.todayKey();
  const e = store.get(editDate);
  $('#t-eyebrow').textContent = isToday ? '오늘의 새록' : '지난 날의 새록';
  $('#t-date').textContent = isToday ? `오늘 · ${D.fmtShort(editDate)}` : D.fmtShort(editDate);
  $('#t-sub').textContent = e ? '이미 떠 있는 별이에요. 고쳐 쓸 수 있어요.' : isToday ? '아이 재우고, 오늘 하루를 한마디로.' : '그날 아이가 했던 말을 떠올려 보세요.';
  const inp = $('#t-input');
  inp.value = editDate;
  inp.max = D.todayKey();
  today.querySelector('[data-d="1"]').disabled = isToday;
  tText.value = e?.text || '';
  tNote.value = e?.note || '';
  form.querySelectorAll('input[name=level]').forEach((r) => (r.checked = r.value === e?.level));
  tSave.textContent = e ? '고쳐서 띄우기' : '하늘에 띄우기';
  $('#t-del').hidden = !e;
  autoGrow();
  validate();
}
function validate() {
  tSave.disabled = !(tText.value.trim() && form.level.value);
}
function autoGrow() {
  tText.style.height = 'auto';
  tText.style.height = `${Math.max(96, tText.scrollHeight)}px`;
}
tText.addEventListener('input', () => (autoGrow(), validate()));
form.addEventListener('change', validate);
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
  store.upsert({ date, text: tText.value, level: form.level.value, note: tNote.value });
  rise(form.level.value);
  fillToday();
  toast(`${D.fmtShort(date)} 하늘에 별이 떴어요`, {
    label: `${mode.views[0].label} 보기`,
    onClick: () => {
      viewState.week = D.weekStart(date);
      location.hash = `#${mode.views[0].id}`;
    },
  });
});
$('#t-del').addEventListener('click', () => {
  if (!confirm(`${D.fmtShort(editDate)}의 기록을 지울까요?`)) return;
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
          <article class="fcard" data-date="${e.date}" tabindex="0">
            <span class="star-ico forever"></span>
            <blockquote>${esc(e.text)}</blockquote>
            <footer><time>${D.fmtLong(e.date)}</time>${e.note ? `<span>${esc(e.note)}</span>` : ''}</footer>
          </article>`).join('')}</div>`
      : `<div class="empty"><span class="star-ico forever"></span><p>꼭 간직하고 싶은 말이 생기면<br>‘평생기억’으로 띄워주세요.<br>가장 밝은 별로 여기 모여요.</p></div>`}`;
}
$('#view-forever').addEventListener('click', (ev) => {
  const c = ev.target.closest('.fcard');
  if (c) showEntry(store.get(c.dataset.date));
});
$('#view-forever').addEventListener('keydown', (ev) => {
  const c = ev.target.closest('.fcard');
  if (c && ev.key === 'Enter') showEntry(store.get(c.dataset.date));
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
  sheet.dataset.date = e.date;
  openSheet(sheet);
}
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
  setTimeout(() => (s.hidden = true), 220);
}
document.querySelectorAll('.sheet').forEach((s) =>
  s.addEventListener('click', (ev) => {
    if (ev.target === s || ev.target.closest('[data-act=close]')) closeSheet(s);
  })
);
document.addEventListener('keydown', (ev) => {
  if (ev.key === 'Escape') document.querySelectorAll('.sheet.open').forEach(closeSheet);
});

// ── 메뉴: 백업 ──
const menu = $('#menu-sheet');
$('#menu-btn').addEventListener('click', () => openSheet(menu));
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

store.subscribe(() => {
  if (active === 'forever') renderForever();
});

go();
