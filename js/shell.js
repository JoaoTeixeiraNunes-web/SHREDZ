/**
 * Renders the shared topbar + floating nav + notifications panel
 * into pages that include <div id="app-shell"></div>.
 */
import { getProfile, signOut, isAdmin } from './auth.js';
import { supabase } from './supabase.js';
import { avatarHtml, timeAgo, escapeHtml, qs } from './ui.js';
import { listNotifications, markAllRead, subscribeNotifications } from './api.js';

const ICONS = {
  home: '<path d="M3 11.5 12 4l9 7.5M5 10v10h14V10"/>',
  trophy:
    '<path d="M6 4h12v3a6 6 0 0 1-12 0V4ZM6 5H3v2a3 3 0 0 0 3 3M18 5h3v2a3 3 0 0 1-3 3M9 17h6v3H9z"/>',
  check: '<path d="M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
  flag: '<path d="M4 21V4m0 0 12 0-2 4 2 4H4"/>',
  vote: '<path d="M9 11l3 3 8-8M4 4h10v6M4 14h6v6H4z"/>',
  history: '<path d="M3 3v5h5M3.05 13A9 9 0 1 0 6 5.3L3 8M12 7v5l3 3"/>',
  user: '<path d="M20 21a8 8 0 1 0-16 0M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3Z"/>',
  bell: '<path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0"/>',
};

function icon(name) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;
}

const LOGO = `<svg class="logo" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs><linearGradient id="sg" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#10b981"/><stop offset="1" stop-color="#6ee7b7"/>
  </linearGradient></defs>
  <path d="M30 6 14 26h9l-5 16 20-22h-9l1-14Z" fill="url(#sg)"/>
</svg>`;

export function brandLogo() {
  return LOGO;
}

export async function renderShell(active) {
  const host = qs('#app-shell');
  if (!host) return;
  const profile = await getProfile();
  const admin = await isAdmin();

  const links = [
    ['dashboard.html', 'home', 'Home'],
    ['leaderboard.html', 'trophy', 'Ranks'],
    ['challenges.html', 'flag', 'Events'],
    ['votes.html', 'vote', 'Votes'],
    ['history.html', 'history', 'History'],
    ['profile.html', 'user', 'Profile'],
  ];

  host.innerHTML = `
    <header class="topbar">
      <a href="dashboard.html" class="brand">${LOGO}<span>Shredz</span></a>
      <div class="actions">
        <button class="btn btn-icon btn-ghost notif-btn" id="notif-toggle" aria-label="Notifications">
          ${icon('bell')}<span class="badge hidden" id="notif-count">0</span>
        </button>
        <button class="btn btn-sm btn-ghost" id="signout-btn">Sign out</button>
      </div>
    </header>
    <nav class="nav">
      ${links
        .map(
          ([href, ic, label]) =>
            `<a href="${href}" class="${active === href ? 'active' : ''}">${icon(
              ic
            )}<span>${label}</span></a>`
        )
        .join('')}
      ${
        admin
          ? `<a href="admin/admin-dashboard.html" class="admin ${
              active && active.startsWith('admin') ? 'active' : ''
            }">${icon('shield')}<span>Admin</span></a>`
          : ''
      }
    </nav>`;

  qs('#signout-btn').addEventListener('click', () => signOut());
  wireNotifications(profile);
}

async function wireNotifications(profile) {
  if (!profile) return;
  const countEl = qs('#notif-count');
  const toggle = qs('#notif-toggle');
  let panel = null;

  async function refreshBadge() {
    const items = await listNotifications(profile.id);
    const unread = items.filter((n) => !n.read).length;
    if (unread > 0) {
      countEl.textContent = unread > 9 ? '9+' : unread;
      countEl.classList.remove('hidden');
    } else {
      countEl.classList.add('hidden');
    }
    return items;
  }

  toggle.addEventListener('click', async () => {
    if (panel) {
      panel.remove();
      panel = null;
      return;
    }
    const items = await listNotifications(profile.id);
    panel = document.createElement('div');
    panel.className = 'notif-panel glass';
    panel.innerHTML = `
      <div class="row between" style="padding:8px 8px 4px">
        <strong>Notifications</strong>
        <button class="btn btn-sm btn-ghost" id="mark-read">Mark all read</button>
      </div>
      ${
        items.length
          ? items
              .map(
                (n) => `<div class="notif-item ${n.read ? '' : 'unread'}">
            <div>
              <div class="n-title">${escapeHtml(n.title)}</div>
              <div class="n-body">${escapeHtml(n.body || '')}</div>
              <div class="n-time">${timeAgo(n.created_at)}</div>
            </div></div>`
              )
              .join('')
          : '<div class="empty"><p>No notifications yet</p></div>'
      }`;
    document.body.appendChild(panel);
    panel.querySelector('#mark-read').addEventListener('click', async () => {
      await markAllRead(profile.id);
      await refreshBadge();
      panel.querySelectorAll('.notif-item').forEach((i) =>
        i.classList.remove('unread')
      );
    });
    document.addEventListener(
      'click',
      (e) => {
        if (panel && !panel.contains(e.target) && e.target !== toggle && !toggle.contains(e.target)) {
          panel.remove();
          panel = null;
        }
      },
      { once: true }
    );
  });

  await refreshBadge();
  subscribeNotifications(profile.id, () => refreshBadge());
}
