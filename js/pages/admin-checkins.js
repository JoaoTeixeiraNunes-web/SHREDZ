import { requireAuth } from '../auth.js';
import { adminShell, adminTabs } from './admin-common.js';
import {
  pendingSubmissions, approveSubmission, rejectSubmission,
  listHabits, createHabit, setHabitActive, subscribeTable,
} from '../api.js';
import { avatarHtml, fmtNumber, timeAgo, escapeHtml, qs, toast, modal, confetti } from '../ui.js';

const me = await requireAuth({ admin: true });
if (me) init();

async function init() {
  await adminShell('admin-checkins.html');
  await render();
  subscribeTable('daily_submissions', () => render());
}

async function render() {
  const [pending, habits] = await Promise.all([pendingSubmissions(), listHabits()]);
  qs('#main').innerHTML = `
    ${adminTabs('admin-checkins.html')}
    <div class="page-head fade-up"><h1>Check-ins</h1><p>Approve submissions & manage habits</p></div>
    <div class="grid grid-2">
      <div class="glass card fade-up">
        <div class="row between"><h3>Pending</h3><span class="pill pill-pending">${pending.length}</span></div>
        <div class="stack" id="pending" style="margin-top:12px;gap:10px">
          ${pending.length ? pending.map(pendRow).join('') : '<div class="empty"><div class="emoji">✅</div><p>All caught up</p></div>'}
        </div>
      </div>
      <div class="glass card fade-up">
        <div class="row between"><h3>Habits</h3><button class="btn btn-primary btn-sm" id="new-habit">+ New</button></div>
        <div class="stack" style="margin-top:12px;gap:8px">
          ${habits.map((h)=>`<div class="row between">
            <div><div style="font-weight:600">${escapeHtml(h.title)}</div>
              <div class="tertiary" style="font-size:.78rem">${escapeHtml(h.description||'')}</div></div>
            <span class="pill pill-primary">+${fmtNumber(h.points)}</span></div>`).join('')}
        </div>
      </div>
    </div>`;

  qs('#pending').addEventListener('click', onAction);
  qs('#new-habit').addEventListener('click', habitModal);
}

function pendRow(s) {
  const u = s.users || {};
  return `<div class="row between" style="padding:10px;border-radius:14px;background:var(--card)">
    <div class="row">${avatarHtml(u,'avatar-sm')}<div>
      <div style="font-weight:600">${escapeHtml(u.display_name||'User')}</div>
      <div class="tertiary" style="font-size:.78rem">${escapeHtml(s.habit_title)} · +${s.points} · ${timeAgo(s.created_at)}</div></div></div>
    <div class="row" style="gap:6px">
      <button class="btn btn-primary btn-sm" data-approve="${s.id}">✓</button>
      <button class="btn btn-danger btn-sm" data-reject="${s.id}">✗</button></div></div>`;
}

async function onAction(e) {
  const ap = e.target.closest('[data-approve]');
  const rj = e.target.closest('[data-reject]');
  try {
    if (ap) { await approveSubmission(ap.dataset.approve); confetti(); toast('Approved'); render(); }
    else if (rj) { await rejectSubmission(rj.dataset.reject); toast('Rejected','info'); render(); }
  } catch (err) { toast(err.message||'Failed','error'); }
}

function habitModal() {
  const m = modal(`<h3>New Habit</h3>
    <div class="stack" style="margin-top:14px">
      <div class="field"><label>Title</label><input class="input" id="h-title" placeholder="e.g. Gym Workout"></div>
      <div class="field"><label>Description</label><input class="input" id="h-desc"></div>
      <div class="field"><label>Points</label><input class="input" id="h-pts" type="number" value="100"></div>
      <div class="row" style="gap:8px;margin-top:6px">
        <button class="btn btn-ghost" data-close>Cancel</button>
        <button class="btn btn-primary spacer" id="h-save">Create</button></div>
    </div>`);
  m.el.querySelector('#h-save').addEventListener('click', async () => {
    const title = m.el.querySelector('#h-title').value.trim();
    if (!title) return toast('Title required','error');
    try {
      await createHabit({ title, description: m.el.querySelector('#h-desc').value.trim(), points: +m.el.querySelector('#h-pts').value || 0 });
      toast('Habit created'); m.close(); render();
    } catch (err) { toast(err.message||'Failed','error'); }
  });
}
