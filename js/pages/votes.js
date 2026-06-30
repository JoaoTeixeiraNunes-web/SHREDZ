import { requireAuth } from '../auth.js';
import { renderShell } from '../shell.js';
import { listVotes, castVote, subscribeTable } from '../api.js';
import { avatarHtml, countdown, escapeHtml, qs, toast, confetti } from '../ui.js';

const me = await requireAuth();
if (me) {
  if (me.role === 'admin') {
    window.location.replace('admin/admin-dashboard.html');
  } else {
    init();
  }
}

async function init() {
  await renderShell('votes.html');
  await render();
  subscribeTable('votes', () => render());
  subscribeTable('vote_responses', () => render());
}

async function render() {
  const all = await listVotes();
  const active = all.filter((v) => v.status === 'active');
  const finished = all.filter((v) => v.status === 'finished');

  qs('#main').innerHTML = `
    <div class="page-head fade-up"><h1>Votes</h1><p>One vote per poll · you can't vote twice</p></div>
    ${active.length ? `<h3 class="fade-up" style="margin-bottom:12px">Active</h3>${active.map(voteCard).join('')}` : ''}
    ${finished.length ? `<h3 class="fade-up" style="margin:24px 0 12px">Results</h3>${finished.map(voteCard).join('')}` : ''}
    ${!all.length ? '<div class="empty"><div class="emoji">🗳️</div><p>No votes yet</p></div>' : ''}`;

  qs('#main').addEventListener('click', onVote);
}

function voteCard(v) {
  const responses = v.vote_responses || [];
  const myResponse = responses.find((r) => r.voter_id === me.id);
  const voted = !!myResponse || v.status === 'finished';
  const tally = {};
  responses.forEach((r) => {
    tally[r.option_id] = tally[r.option_id] || { count: 0, sum: 0 };
    tally[r.option_id].count++;
    tally[r.option_id].sum += r.rating || 0;
  });

  return `<div class="glass card fade-up" style="margin-bottom:16px">
    <div class="row between">
      <h3>${escapeHtml(v.title)}</h3>
      <span class="pill ${v.status==='active'?'pill-info':''}">${v.status==='active'?`⏱ ${countdown(v.end_date)}`:'Finished'}</span>
    </div>
    <div class="tertiary" style="font-size:.8rem">${v.vote_type==='rating'?'Rate each 1–10':'Pick one winner'}${voted&&v.status==='active'?' · ✅ You voted':''}</div>
    <div class="opt-grid">
      ${(v.vote_options||[]).map((o)=>optionCard(v,o,voted,tally[o.id])).join('')}
    </div>
    ${v.status==='finished'&&v.winner_id?`<div class="pill pill-gold" style="margin-top:14px">🏆 Winner: ${escapeHtml(((v.vote_options||[]).find((o)=>o.user_id===v.winner_id)?.users?.display_name)||'TBD')}</div>`:''}
  </div>`;
}

function optionCard(v, o, voted, t) {
  const u = o.users || {};
  const label = escapeHtml(u.display_name || o.label || '');
  const stat = t ? (v.vote_type==='rating' ? `⭐ ${(t.sum/t.count).toFixed(1)}` : `${t.count} vote${t.count>1?'s':''}`) : '';
  return `<div class="opt ${voted?'disabled':''}">
    ${o.image_url?`<img src="${o.image_url}" alt="${label}">`:''}
    <div class="meta">
      <div class="row between"><strong>${label}</strong><span class="tertiary" style="font-size:.78rem">${stat}</span></div>
      ${!voted ? (v.vote_type==='rating'
        ? `<div class="rating-row">${Array.from({length:10},(_,i)=>`<button data-vote="${v.id}" data-opt="${o.id}" data-rating="${i+1}">${i+1}</button>`).join('')}</div>`
        : `<button class="btn btn-primary btn-sm btn-block" style="margin-top:8px" data-vote="${v.id}" data-opt="${o.id}">Vote</button>`) : ''}
    </div></div>`;
}

async function onVote(e) {
  const btn = e.target.closest('[data-vote]');
  if (!btn) return;
  try {
    await castVote({ voteId: btn.dataset.vote, optionId: btn.dataset.opt, voterId: me.id, rating: btn.dataset.rating ? +btn.dataset.rating : null });
    confetti(1400); toast('Vote cast!');
    render();
  } catch (err) {
    toast(/duplicate|unique/i.test(err.message) ? 'You already voted in this poll' : (err.message||'Vote failed'), 'error');
  }
}
