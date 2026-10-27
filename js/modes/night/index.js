import { mountWeek } from './week.js';
import { mountYear } from './year.js';

export default {
  id: 'night',
  name: '밤하늘',
  views: [
    {
      id: 'week',
      label: '별자리',
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M4 16 9 9l5 4 6-7" stroke-linecap="round" stroke-linejoin="round" opacity=".6"/><circle cx="4" cy="16" r="1.6" fill="currentColor"/><circle cx="9" cy="9" r="1.9" fill="currentColor"/><circle cx="14" cy="13" r="1.4" fill="currentColor"/><circle cx="20" cy="6" r="2.2" fill="currentColor"/></svg>`,
      mount: mountWeek,
    },
    {
      id: 'year',
      label: '은하수',
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M3 15c4-1 6-6 10-7s6 1 8-1" opacity=".55"/><path d="M3 18c5-1 7-5 11-6s5 0 7-1" opacity=".3"/><circle cx="7" cy="12.5" r="1.2" fill="currentColor"/><circle cx="12" cy="9.2" r="1.7" fill="currentColor"/><circle cx="17" cy="8.4" r="1.1" fill="currentColor"/></svg>`,
      mount: mountYear,
    },
  ],
};
