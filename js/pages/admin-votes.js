import { requireAuth } from '../auth.js';
import { adminShell, adminTabs } from './admin-common.js';
import { listVotes, createVote, listUsers, notifyAll, subscribeTable } from '../api.js';
import { supabase } from '../supabase.js';
import { fmtNumber, countdown, escapeHtml, qs, toast, modal, confetti } from '../ui.js';

const me = await requireAuth({ admin: true });
let users = [];
if (me) init();

async function init() {
  await adminShell('admin-votes.html');
  users = await listUsers();
  await render();
  subscribeTable('votes', () => render());
}

async function render() {
  const all = await listVotes();
  qs('#main').innerHTML = `
    ${adminTabs('admin-votes.html')}
    <div class="page-head fade-up row between"><div><h1>Votes</h1><p>Create polls & declare winners</p></div>
      <button class="btn btn-primary" id="new">+ New Vote</button></div>
    <div class="grid grid-2">${all.map(card).join('') || '<div class="empty"><p>No votes</p></div>'}</div>`;
  qs('#new').addEventListener('click', newModal);
  qs('#main').querySelectorAll('[data-finish]').forEach((b)=>b.addEventListener('click',()=>finishModal(b.dataset.finish, b.dataset.title)));
}

function card(v) {
  const active = v.status==='active';
  const count = (v.vote_responses||[]).length;
  return `<div class="glass card fade-up">
    <div class="row between"><span class="pill ${active?'pill-info':''}">${active?'Active':'Finished'}</span>
      <span class="pill">${active?`⏱ ${countdown(v.end_date)}`:'Done'}</span></div>
    <h3 style="margin-top:10px">${escapeHtml(v.title)}</h3>
    <div class="tertiary" style="font-size:.8rem">${v.vote_type==='rating'?'Rating 1–10':'Single winner'} · ${count} responses</div>
    ${active?`<button class="btn btn-gold btn-sm btn-block" style="margin-top:14px" data-finish="${v.id}" data-title="${escapeHtml(v.title)}">Finish & pick winner</button>`:''}
  </div>`;
}

function newModal() {
  const rows = users.map((u)=>`<label class="row" style="gap:8px;padding:6px 0">
    <input type="checkbox" value="${u.id}" data-name="${escapeHtml(u.display_name)}">
    <span class="spacer">${escapeHtml(u.display_name)}</span>
    <input class="input" type="url" placeholder="Optional image URL" data-img="${u.id}" style="max-width:240px"></label>`).join('');
  const m = modal(`<h3>New Vote</h3>
    <div class="stack" style="margin-top:14px">
      <div class="field"><label>Title</label><input class="input" id="v-title" placeholder="Best Progress"></div>
      <div class="field"><label>Type</label><select class="select" id="v-type">
        <option value="single">Single winner</option><option value="rating">Rate everyone 1–10</option></select></div>
      <div class="field"><label>Duration (hours)</label><input class="input" id="v-hours" type="number" value="24"></div>
      <div class="field"><label>Entrants (tick + optional photo URL)</label><div style="max-height:200px;overflow:auto">${rows}</div></div>
      <div class="row" style="gap:8px;margin-top:6px">
        <button class="btn btn-ghost" data-close>Cancel</button>
        <button class="btn btn-primary spacer" id="v-save">Create</button></div>
    </div>`);
  m.el.querySelector('#v-save').addEventListener('click', async () => {
    const title = m.el.querySelector('#v-title').value.trim();
    if (!title) return toast('Title required','error');
    const checks = [...m.el.querySelectorAll('input[type=checkbox]:checked')];
    if (checks.length < 2) return toast('Pick at least 2 entrants','error');
    const hours = +m.el.querySelector('#v-hours').value || 24;
    try {
      toast('Creating…','info');
      const options = [];
      for (const c of checks) {
        const image_url = m.el.querySelector(`input[data-img="${c.value}"]`).value.trim() || null;
        options.push({ user_id: c.value, label: c.dataset.name, image_url });
      }
      await createVote({ title, category: title, vote_type: m.el.querySelector('#v-type').value, end_date: new Date(Date.now()+hours*3.6e6).toISOString(), status:'active' }, options);
      await notifyAll(`Vote created: ${title}`, `${title} is live — cast your vote now`, 'update');
      toast('Vote created'); m.close(); render();
    } catch (err) { toast(err.message||'Failed','error'); }
  });
}

function finishModal(id, title) {
  const m = modal(`<h3>Finish: ${escapeHtml(title)}</h3>
    <p class="muted" style="margin:8px 0">Tallies votes automatically and sets the winner. Optionally award bonus points.</p>
    <div class="field"><label>Bonus points to winner (optional)</label><input class="input" id="bonus" type="number" value="300"></div>
    <div class="row" style="gap:8px;margin-top:12px">
      <button class="btn btn-ghost" data-close>Cancel</button>
      <button class="btn btn-gold spacer" id="fin">Finish vote</button></div>`);
  m.el.querySelector('#fin').addEventListener('click', async () => {
    try {
      const { error } = await supabase.rpc('finish_vote', { p_vote: id, p_bonus: +m.el.querySelector('#bonus').value || 0 });
      if (error) throw error;
      confetti(); toast('Vote finished'); m.close(); render();
    } catch (err) { toast(err.message||'Failed','error'); }
  });
}
