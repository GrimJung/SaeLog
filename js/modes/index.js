// 모드 = 같은 데이터를 다르게 그리는 레이어.
// 새 모드(예: 정원)는 { id, name, views:[{ id, label, icon, mount(el, ctx) → { unmount } }] } 형태로 추가한다.
import night from './night/index.js';

export const MODES = { night };

export function currentMode() {
  let id = 'night';
  try {
    id = localStorage.getItem('saerok:mode') || id;
  } catch {}
  return MODES[id] || night;
}
