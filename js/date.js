// 날짜는 항상 로컬 기준 'YYYY-MM-DD' 문자열로 다룬다.
export const WD = ['일', '월', '화', '수', '목', '금', '토'];
const ORD = ['첫째', '둘째', '셋째', '넷째', '다섯째'];

const pad = (n) => String(n).padStart(2, '0');
export const toKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const fromKey = (k) => {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const todayKey = () => toKey(new Date());
export const addDays = (k, n) => {
  const d = fromKey(k);
  d.setDate(d.getDate() + n);
  return toKey(d);
};

// 월요일 시작 주
export const weekStart = (k) => {
  const d = fromKey(k);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return toKey(d);
};

export const fmtLong = (k) => {
  const d = fromKey(k);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 ${WD[d.getDay()]}요일`;
};
export const fmtShort = (k) => {
  const d = fromKey(k);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${WD[d.getDay()]})`;
};
export const fmtDot = (k) => {
  const d = fromKey(k);
  return `${d.getMonth() + 1}.${d.getDate()}`;
};

// "10월 넷째 주" — 그 주의 목요일이 속한 달 기준
export const weekLabel = (ws) => {
  const th = fromKey(addDays(ws, 3));
  return `${th.getMonth() + 1}월 ${ORD[Math.ceil(th.getDate() / 7) - 1]} 주`;
};

export const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
