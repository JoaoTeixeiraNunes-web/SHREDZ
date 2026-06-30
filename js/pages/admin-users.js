import { requireAuth } from '../auth.js';
import { adminShell, adminTabs } from './admin-common.js';
import { listUsers, awardPoints, updateProfile, notifyAll, resetAllData, subscribeTable } from '../api.js';
import { avatarHtml, fmtNumber, escapeHtml, qs, toast, modal, confetti, debounce } from '../ui.js';

const me = await requireAuth({ admin: true });
let users = [];
let search = '';
if (me) init();

async function init() {
  await adminShell('admin-users.html');
  await load();
  subscribeTable('transactions', () => load());
}

async function load() { users = await listUsers(); render(); }

function render() {
  const filtered = users.filter((u) => u.display_name.toLowerCase().includes(search));
  qs('#main').innerHTML = `
    ${adminTabs('admin-users.html')}
    <div class="page-head fade-up"><h1>Users & Points</h1><p>Award or revoke points</p></div>
    <div class="glass card fade-up" style="margin-bottom:16px">
      <div class="row between" style="gap:12px">
        <input class="input" id="search" placeholder="Search users…" value="${escapeHtml(search)}">
        <button class="btn btn-danger btn-sm" id="reset-points">Reset all points</button>
      </div>
    </div>
    <div class="grid grid-2">
      ${filtered.map(userCard).join('')}
    </div>`;
  qs('#search').addEventListener('input', debounce((e)=>{ search=e.target.value.toLowerCase(); render(); }, 150));
  const s = qs('#search'); s.focus(); s.setSelectionRange(s.value.length,s.value.length);
  qs('#main').querySelectorAll('[data-award]').forEach((b)=>b.addEventListener('click',()=>pointsModal(b.dataset.award, b.dataset.name, b.dataset.mode)));
  qs('#main').querySelectorAll('[data-avatar]').forEach((b)=>b.addEventListener('click',()=>avatarModal(b.dataset.avatar, b.dataset.name, b.dataset.avatarUrl)));
  qs('#reset-points').addEventListener('click', resetPointsModal);
}

function userCard(u) {
  return `<div class="glass card fade-up">
    <div class="row between">
      <div class="row">${avatarHtml(u)}<div>
        <div style="font-weight:700">${escapeHtml(u.display_name)}</div>
        <div class="tertiary mono" style="font-size:.82rem">${fmtNumber(u.points)} pts</div></div></div>
    </div>
    <div class="row" style="gap:8px;margin-top:14px">
      <button class="btn btn-secondary btn-sm spacer" data-avatar="${u.id}" data-name="${escapeHtml(u.display_name)}" data-avatar-url="${escapeHtml(u.avatar_url||'')}">Set avatar</button>
      <button class="btn btn-primary btn-sm spacer" data-award="${u.id}" data-name="${escapeHtml(u.display_name)}" data-mode="award">+ Award</button>
      <button class="btn btn-danger btn-sm spacer" data-award="${u.id}" data-name="${escapeHtml(u.display_name)}" data-mode="revoke">− Revoke</button>
    </div></div>`;
}

function pointsModal(userId, name, mode) {
  const revoke = mode === 'revoke';
  const m = modal(`<h3>${revoke?'Revoke from':'Award to'} ${escapeHtml(name)}</h3>
    <div class="stack" style="margin-top:14px">
      <div class="field"><label>Title</label><input class="input" id="p-title" placeholder="${revoke?'Points Revoked':'Bonus Points'}"></div>
      <div class="field"><label>Description</label><input class="input" id="p-desc"></div>
      <div class="field"><label>Points (positive number)</label><input class="input" id="p-pts" type="number" min="1" value="100"></div>
      <div class="row" style="gap:8px;margin-top:6px">
        <button class="btn btn-ghost" data-close>Cancel</button>
        <button class="btn ${revoke?'btn-danger':'btn-primary'} spacer" id="p-save">${revoke?'Revoke':'Award'}</button></div>
    </div>`);
  m.el.querySelector('#p-save').addEventListener('click', async () => {
    const pts = Math.abs(+m.el.querySelector('#p-pts').value || 0);
    if (!pts) return toast('Enter points','error');
    const title = m.el.querySelector('#p-title').value.trim() || (revoke?'Points Revoked':'Bonus Points');
    try {
      await awardPoints({ userId, title, description: m.el.querySelector('#p-desc').value.trim(), points: revoke?-pts:pts, category: revoke?'penalty':'bonus' });
      if (!revoke) {
        await notifyAll(`${name} was awarded +${pts} pts`, `${title}`, 'broadcast');
        confetti();
      }
      toast(revoke?'Points revoked':'Points awarded');
      m.close(); load();
    } catch (err) { toast(err.message||'Failed','error'); }
  });
}

function resetPointsModal() {
  const m = modal(`<h3>🚨 FULL DATA RESET</h3>
    <div class="stack" style="margin-top:14px">
      <p class="muted"><strong>WARNING:</strong> This will permanently delete:</p>
      <ul style="margin:8px 0; padding-left:20px; list-style:disc">
        <li>All user points (set to 0)</li>
        <li>All transactions & history</li>
        <li>All challenges & results</li>
        <li>All votes & responses</li>
        <li>All pending submissions</li>
      </ul>
      <p class="muted" style="margin-top:8px">This action <strong>cannot be undone</strong>.</p>
      <div class="row" style="gap:8px;margin-top:12px">
        <button class="btn btn-ghost" data-close>Cancel</button>
        <button class="btn btn-danger spacer btn-reset" id="r-save">I understand - Reset everything</button></div>
    </div>`);
  m.el.querySelector('#r-save').addEventListener('click', async () => {
    try {
      await resetAllData();
      await notifyAll('Full Data Reset', '🚨 Admin reset all user points, challenges, votes, submissions, and transactions.');
      toast('All data reset successfully');
      setTimeout(() => { m.close(); load(); }, 500);
    } catch (err) {
      toast(err.message||'Failed to reset data','error');
    }
  });
}

function avatarModal(userId, name, currentUrl) {
  const m = modal(`<h3>Set avatar for ${escapeHtml(name)}</h3>
    <div class="stack" style="margin-top:14px">
      <div class="field"><label>Image URL</label><input class="input" id="u-avatar" type="url" placeholder="https://..." value="${escapeHtml(currentUrl)}"></div>
      <div class="tertiary" style="font-size:.82rem">Leave blank to clear the avatar.</div>
      <div class="row" style="gap:8px;margin-top:6px">
        <button class="btn btn-ghost" data-close>Cancel</button>
        <button class="btn btn-primary spacer" id="u-save">Save avatar</button></div>
    </div>`);
  m.el.querySelector('#u-save').addEventListener('click', async () => {
    const avatar_url = m.el.querySelector('#u-avatar').value.trim() || null;
    try {
      await updateProfile(userId, { avatar_url });
      toast('Avatar updated');
      m.close(); load();
    } catch (err) {
      toast(err.message || 'Failed to update avatar', 'error');
    }
  });
}
