/** Shared helper: render shell on /admin/ pages and fix relative links. */
import { renderShell } from '../shell.js';
import { qs } from '../ui.js';

export async function adminShell(active) {
  await renderShell(active);
  document.body.classList.add('admin-shell');
  qs('#app-shell').querySelectorAll('a[href]').forEach((a) => {
    const href = a.getAttribute('href');
    if (href.startsWith('http')) return;
    if (href.startsWith('admin/')) {
      a.setAttribute('href', href.replace('admin/', ''));
    } else if (!href.startsWith('..') && !/^admin-/.test(href)) {
      a.setAttribute('href', '../' + href);
    }
  });
}

export function adminTabs(current) {
  const tabs = [
    ['admin-dashboard.html', 'Overview'],
    ['admin-checkins.html', 'Check-ins'],
    ['admin-users.html', 'Users & Points'],
    ['admin-challenges.html', 'Challenges'],
    ['admin-votes.html', 'Votes'],
    ['admin-settings.html', 'Settings'],
  ];
  return `<div class="row wrap fade-up" style="margin-bottom:18px;gap:8px">
    ${tabs.map(([h,l])=>`<a class="pill ${current===h?'pill-gold':''}" href="${h}">${l}</a>`).join('')}
  </div>`;
}
