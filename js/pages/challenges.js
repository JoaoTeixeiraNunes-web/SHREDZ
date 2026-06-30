import { requireAuth } from '../auth.js';
import { renderShell } from '../shell.js';
import { listChallenges, subscribeTable } from '../api.js';
import { avatarHtml, fmtNumber, countdown, timeAgo, escapeHtml, qs } from '../ui.js';

const me = await requireAuth();
if (me) init();

async function init() {
  await renderShell('challenges.html');
  await render();
  subscribeTable('weekly_challenges', () => render());
  subscribeTable('challenge_results', () => render());
}

async function render() {
  const all = await listChallenges();
  const active = all.filter((c) => c.status === 'active');
  const finished = all.filter((c) => c.status === 'finished');

  qs('#main').innerHTML = `
    <div class="page-head fade-up"><h1>Weekly Challenges</h1><p>Compete for bonus points</p></div>
    ${active.length ? `<h3 class="fade-up" style="margin-bottom:12px">Active</h3>
      <div class="grid grid-2">${active.map(card).join('')}</div>` : ''}
    ${finished.length ? `<h3 class="fade-up" style="margin:24px 0 12px">Past Challenges</h3>
      <div class="grid grid-2">${finished.map(card).join('')}</div>` : ''}
    ${!all.length ? '<div class="empty"><div class="emoji">🏁</div><p>No challenges yet</p></div>' : ''}`;
}

function card(c) {
  const results = (c.challenge_results || []).sort((a,b)=>a.place-b.place);
  const active = c.status === 'active';
  return `<div class="glass card-hover fade-up" style="padding:0;overflow:hidden">
    ${c.image_url ? `<img src="${c.image_url}" alt="" style="height:160px;width:100%;object-fit:cover">` : ''}
    <div class="card">
      <div class="row between">
        <span class="pill ${active?'pill-gold':''}">${active?'Active':'Finished'}</span>
        <span class="pill">${active?`⏱ ${countdown(c.end_date)}`:timeAgo(c.end_date)}</span>
      </div>
      <h3 style="margin-top:10px">${escapeHtml(c.title)}</h3>
      <p class="muted" style="margin-top:4px">${escapeHtml(c.description||'')}</p>
      <div class="pill pill-primary" style="margin-top:12px">🏆 ${fmtNumber(c.points)} pts</div>
      ${results.length ? `<hr class="divider">
        <div class="stack" style="gap:8px">${results.map((r)=>{
          const u = r.users||{}; const medal=['🥇','🥈','🥉'][r.place-1];
          return `<div class="row between"><div class="row">${medal} ${avatarHtml(u,'avatar-sm')}
            <span style="font-weight:600">${escapeHtml(u.display_name||'')}</span></div>
            <span class="pill pill-gold">+${fmtNumber(r.points)}</span></div>`;
        }).join('')}</div>` : ''}
    </div></div>`;
}
