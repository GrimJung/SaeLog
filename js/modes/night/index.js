import { mountWeek } from './week.js';
import { mountYear } from './year.js';

export default {
  id: 'night',
  name: '밤하늘',
  views: [
    {
      id: 'week',
      label: '별자리',
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14.5c2.5-3 4.5-5.5 7-5.5s3.5 4 6 4 2.6-3 3-5" opacity=".55"/><circle cx="4" cy="14.5" r="1.5" fill="currentColor" stroke="none"/><circle cx="11" cy="9" r="1.7" fill="currentColor" stroke="none"/><circle cx="17" cy="13" r="1.4" fill="currentColor" stroke="none"/><path d="M20 5Q20.57 7.03 22.6 7.6Q20.57 8.17 20 10.2Q19.43 8.17 17.4 7.6Q19.43 7.03 20 5Z" fill="currentColor" stroke="none" opacity="1"/></svg>`,
      mount: mountWeek,
    },
    {
      id: 'year',
      label: '은하수',
      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="2.3" fill="currentColor" stroke="none"/><path d="M15.05 10.09L15.28 10.19L15.48 10.32L15.66 10.48L15.79 10.68L15.9 10.91L15.95 11.17L15.97 11.46L15.93 11.78L15.85 12.12L15.71 12.49L15.52 12.87L15.28 13.26L14.98 13.66L14.64 14.07L14.24 14.47L13.8 14.87L13.31 15.26L12.78 15.63L12.22 15.99L11.62 16.31L11.01 16.6L10.37 16.86L9.72 17.07L9.07 17.24L8.42 17.36L7.78 17.43L7.16 17.44L6.57 17.4L6.01 17.29L5.49 17.13L5.02 16.91L4.61 16.62L4.25 16.28L3.97 15.88L3.76 15.42L3.62 14.91L3.57 14.36L3.61 13.76L3.73 13.12L3.94 12.45"/><circle cx="3.94" cy="12.45" r="1.15" fill="currentColor" stroke="none"/><path d="M8.95 13.91L8.72 13.81L8.52 13.68L8.34 13.52L8.21 13.32L8.1 13.09L8.05 12.83L8.03 12.54L8.07 12.22L8.15 11.88L8.29 11.51L8.48 11.13L8.72 10.74L9.02 10.34L9.36 9.93L9.76 9.53L10.2 9.13L10.69 8.74L11.22 8.37L11.78 8.01L12.38 7.69L12.99 7.4L13.63 7.14L14.28 6.93L14.93 6.76L15.58 6.64L16.22 6.57L16.84 6.56L17.43 6.6L17.99 6.71L18.51 6.87L18.98 7.09L19.39 7.38L19.75 7.72L20.03 8.12L20.24 8.58L20.38 9.09L20.43 9.64L20.39 10.24L20.27 10.88L20.06 11.55"/><circle cx="20.06" cy="11.55" r="1.15" fill="currentColor" stroke="none"/></svg>`,
      mount: mountYear,
    },
  ],
};
