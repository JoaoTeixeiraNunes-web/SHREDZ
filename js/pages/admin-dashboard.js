import { requireAuth } from '../auth.js';
import { renderShell } from '../shell.js';
import {
  pendingSubmissions, approveSubmission, rejectSubmission,
  listUsers, awardPoints, listChallenges, listVotes, subscribeTable,
} from '../api.js';
import { avatarHtml, fmtNumber, fmtPoints, timeAgo, escapeHtml, qs, toast, modal, confetti } from '../ui.js';

const me = await requireAuth({ admin: true });
if (me) init();

async function init() {
  // Admin pages live in /admin/, so fix relative shell links.
  await renderShell('admin-dashboard.html');
  fixShellLinks();
  await render();
  subscribeTable('daily_submissions', () => render());
  subscribeTable('transactions', () => render());
}

function fixShellLinks() {
  qs('#app-shell').querySelectorAll('a[href]').forEach((a) => {
    const href = a.getAttribute('href');
    if (!href.startsWith('admin') && !href.startsWith('..') && !href.startsWith('http')) {
      a.setAttribute('href', '../' + href);
    } else if (href.startsWith('admin/')) {
      a.setAttribute('href', href.replace('admin/', ''));
    }
  });
}

async function render() {
  const [pending, users, challenges, votes] = await Promise.all([
    pendingSubmissions(), listUsers(), listChallenges(), listVotes(),
  ]);
  const totalPoints = users.reduce((s, u) => s + u.points, 0);

  qs('#main').innerHTML = `
    <div class="page-head fade-up"><h1>Admin Dashboard</h1><p>Manage the season</p></div>

    <div class="grid grid-4 fade-up">
      <div class="glass card stat"><div class="stat-label">Total Users</div><div class="stat-value">${users.length}</div></div>
      <div class="glass card stat"><div class="stat-label">Pending Approvals</div><div class="stat-value" style="color:var(--warning)">${pending.length}</div></div>
      <div class="glass card stat"><div class="stat-label">Points Awarded</div><div class="stat-value mono">${fmtNumber(totalPoints)}</div></div>
      <div class="glass card stat"><div class="stat-label">Challenges / Votes</div><div class="stat-value">${challenges.length}/${votes.length}</div></div>
    </div>

    <div class="row wrap fade-up" style="margin:18px 0;gap:10px">
      <a class="btn btn-ghost" href="admin-checkins.html">Check-ins</a>
      <a class="btn btn-ghost" href="admin-users.html">Users & Points</a>
      <a class="btn btn-ghost" href="admin-challenges.html">Challenges</a>
      <a class="btn btn-ghost" href="admin-votes.html">Votes</a>
      <a class="btn btn-ghost" href="admin-settings.html">Settings</a>
    </div>

    <div class="grid grid-2">
      <div class="glass card fade-up">
        <div class="row between"><h3>Pending Submissions</h3><span class="pill pill-pending">${pending.length}</span></div>
        <div class="stack" id="pending-list" style="margin-top:12px;gap:10px">
          ${pending.length ? pending.map(pendRow).join('') : '<div class="empty"><div class="emoji">✅</div><p>All caught up</p></div>'}
        </div>
      </div>
      <div class="glass card fade-up">
        <h3>Top Members</h3>
        <div class="stack" style="margin-top:12px;gap:8px">
          ${users.slice(0,6).map((u,i)=>`<div class="row between">
            <div class="row"><span style="width:24px;font-weight:700">#${i+1}</span>${avatarHtml(u,'avatar-sm')}<span style="font-weight:600">${escapeHtml(u.display_name)}</span></div>
            <span class="mono" style="font-weight:700">${fmtNumber(u.points)}</span></div>`).join('')}
        </div>
      </div>
    </div>`;

  qs('#pending-list').addEventListener('click', onPendingAction);
}

function pendRow(s) {
  const u = s.users || {};
  return `<div class="row between" style="padding:10px;border-radius:14px;background:var(--card)">
    <div class="row">${avatarHtml(u,'avatar-sm')}
      <div><div style="font-weight:600">${escapeHtml(u.display_name||'User')}</div>
      <div class="tertiary" style="font-size:.78rem">${escapeHtml(s.habit_title)} · +${s.points} · ${timeAgo(s.created_at)}</div></div></div>
    <div class="row" style="gap:6px">
      <button class="btn btn-primary btn-sm" data-approve="${s.id}">Approve</button>
      <button class="btn btn-danger btn-sm" data-reject="${s.id}">Reject</button>
    </div></div>`;
}

async function onPendingAction(e) {
  const ap = e.target.closest('[data-approve]');
  const rj = e.target.closest('[data-reject]');
  try {
    if (ap) {
      e.target.disabled = true;
      await approveSubmission(ap.dataset.approve);
      confetti(); toast('Approved & points awarded');
      render();
    } else if (rj) {
      e.target.disabled = true;
      await rejectSubmission(rj.dataset.reject);
      toast('Submission rejected', 'info');
      render();
    }
  } catch (err) { toast(err.message || 'Action failed', 'error'); render(); }
}
