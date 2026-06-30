import { requireAuth } from '../auth.js';
import { adminShell, adminTabs } from './admin-common.js';
import { listChallenges, createChallenge, finalizeChallenge, listUsers, notifyAll, subscribeTable } from '../api.js';
import { fmtNumber, countdown, escapeHtml, qs, toast, modal, confetti } from '../ui.js';

const me = await requireAuth({ admin: true });
let users = [];
if (me) init();

async function init() {
  await adminShell('admin-challenges.html');
  users = await listUsers();
  await render();
  subscribeTable('weekly_challenges', () => render());
}

async function render() {
  const all = await listChallenges();
  qs('#main').innerHTML = `
    ${adminTabs('admin-challenges.html')}
    <div class="page-head fade-up row between"><div><h1>Challenges</h1><p>Create & finalize events</p></div>
      <button class="btn btn-primary" id="new">+ New Challenge</button></div>
    <div class="grid grid-2">
      ${all.map(card).join('') || '<div class="empty"><p>No challenges</p></div>'}
    </div>`;
  qs('#new').addEventListener('click', newModal);
  qs('#main').querySelectorAll('[data-finalize]').forEach((b)=>b.addEventListener('click',()=>finalizeModal(b.dataset.finalize, b.dataset.title, +b.dataset.points)));
}

function card(c) {
  const active = c.status==='active';
  return `<div class="glass card fade-up">
    <div class="row between"><span class="pill ${active?'pill-gold':''}">${active?'Active':'Finished'}</span>
      <span class="pill">${active?`⏱ ${countdown(c.end_date)}`:'Done'}</span></div>
    <h3 style="margin-top:10px">${escapeHtml(c.title)}</h3>
    <p class="muted" style="margin-top:4px">${escapeHtml(c.description||'')}</p>
    <div class="pill pill-primary" style="margin-top:10px">${fmtNumber(c.points)} pts</div>
    ${active?`<button class="btn btn-gold btn-sm btn-block" style="margin-top:14px" data-finalize="${c.id}" data-title="${escapeHtml(c.title)}" data-points="${c.points}">Finalize & pick winners</button>`:''}
  </div>`;
}

function newModal() {
  const m = modal(`<h3>New Challenge</h3>
    <div class="stack" style="margin-top:14px">
      <div class="field"><label>Title</label><input class="input" id="c-title"></div>
      <div class="field"><label>Description</label><textarea class="textarea" id="c-desc"></textarea></div>
      <div class="field"><label>Points (winner pool base)</label><input class="input" id="c-pts" type="number" value="500"></div>
      <div class="row" style="gap:10px">
        <div class="field spacer"><label>Start</label><input class="input" id="c-start" type="date"></div>
        <div class="field spacer"><label>End</label><input class="input" id="c-end" type="date"></div></div>
      <div class="field"><label>Banner image URL</label><input class="input" id="c-img" type="url" placeholder="https://..."></div>
      <div class="row" style="gap:8px;margin-top:6px">
        <button class="btn btn-ghost" data-close>Cancel</button>
        <button class="btn btn-primary spacer" id="c-save">Create</button></div>
    </div>`);
  m.el.querySelector('#c-save').addEventListener('click', async () => {
    const title = m.el.querySelector('#c-title').value.trim();
    const start = m.el.querySelector('#c-start').value;
    const end = m.el.querySelector('#c-end').value;
    if (!title || !start || !end) return toast('Title & dates required','error');
    try {
      const image_url = m.el.querySelector('#c-img').value.trim() || null;
      await createChallenge({ title, description: m.el.querySelector('#c-desc').value.trim(), points: +m.el.querySelector('#c-pts').value||0, start_date: new Date(start).toISOString(), end_date: new Date(end).toISOString(), image_url, status:'active' });
      await notifyAll(`Challenge started: ${title}`, `${title} is now live`, 'update');
      toast('Challenge created'); m.close(); render();
    } catch (err) { toast(err.message||'Failed','error'); }
  });
}

function finalizeModal(id, title, base) {
  const opts = users.map((u)=>`<option value="${u.id}">${escapeHtml(u.display_name)}</option>`).join('');
  const m = modal(`<h3>Finalize: ${escapeHtml(title)}</h3>
    <p class="muted" style="margin:8px 0">Pick winners. Suggested split: 1st ${base}, 2nd ${Math.round(base*0.6)}, 3rd ${Math.round(base*0.3)}.</p>
    <div class="stack">
      ${[['1st',base],['2nd',Math.round(base*0.6)],['3rd',Math.round(base*0.3)]].map(([place,pts],i)=>`
        <div class="row" style="gap:8px"><span style="width:34px;font-weight:700">${place}</span>
          <select class="select spacer" id="w${i}"><option value="">— none —</option>${opts}</select>
          <input class="input" id="p${i}" type="number" value="${pts}" style="width:90px"></div>`).join('')}
      <div class="row" style="gap:8px;margin-top:6px">
        <button class="btn btn-ghost" data-close>Cancel</button>
        <button class="btn btn-gold spacer" id="f-save">Award & finish</button></div>
    </div>`);
  m.el.querySelector('#f-save').addEventListener('click', async () => {
    const winners = [];
    [0,1,2].forEach((i)=>{ const uid=m.el.querySelector('#w'+i).value; if(uid) winners.push({ user_id:uid, place:i+1, points:+m.el.querySelector('#p'+i).value||0 }); });
    if (!winners.length) return toast('Pick at least one winner','error');
    try { await finalizeChallenge(id, winners); confetti(); toast('Challenge finalized'); m.close(); render(); }
    catch (err) { toast(err.message||'Failed','error'); }
  });
}
