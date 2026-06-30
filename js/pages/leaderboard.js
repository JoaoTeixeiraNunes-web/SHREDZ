import { requireAuth } from '../auth.js';
import { renderShell } from '../shell.js';
import { leaderboard, subscribeTable } from '../api.js';
import { avatarHtml, fmtNumber, fmtPoints, escapeHtml, qs } from '../ui.js';

const me = await requireAuth();
if (me) init();

async function init() {
  await renderShell('leaderboard.html');
  await render();
  subscribeTable('users', () => render());
  subscribeTable('transactions', () => render());
}

async function render() {
  const board = await leaderboard();
  const [first, second, third] = board;
  const rest = board.slice(3);

  function move(u) {
    if (!u.prev_rank) return '<span class="move-same">–</span>';
    if (u.prev_rank > u.rank) return `<span class="move-up">▲ ${u.prev_rank - u.rank}</span>`;
    if (u.prev_rank < u.rank) return `<span class="move-down">▼ ${u.rank - u.prev_rank}</span>`;
    return '<span class="move-same">–</span>';
  }

  qs('#main').innerHTML = `
    <div class="page-head fade-up"><h1>Leaderboard</h1><p>Season 1 standings</p></div>
    <div class="podium fade-up">
      ${spot(second,'p2','🥈')}
      ${spot(first,'p1','🥇')}
      ${spot(third,'p3','🥉')}
    </div>
    <div class="glass card fade-up" style="padding:6px">
      ${board.map((u) => `
        <div class="lb-row ${u.id===me.id?'me':''}">
          <span style="font-weight:800;text-align:center">${u.rank<=3?['🥇','🥈','🥉'][u.rank-1]:'#'+u.rank}</span>
          <div class="row">${avatarHtml(u,'avatar-sm')}<div>
            <div style="font-weight:600">${escapeHtml(u.display_name)}</div>
            <div class="tertiary" style="font-size:.76rem">${fmtPoints(u.weekly_gain)} this week</div>
          </div></div>
          <span class="mono" style="font-size:.85rem">${move(u)}</span>
          <span class="mono" style="font-weight:800">${fmtNumber(u.points)}</span>
        </div>`).join('')}
    </div>`;

  function spot(u, cls, medal) {
    if (!u) return '<div class="spot"></div>';
    return `<div class="spot ${cls}">
      ${avatarHtml(u,'avatar-lg')}
      <div style="font-weight:700;margin-top:8px">${escapeHtml(u.display_name)}</div>
      <div class="mono muted" style="font-size:.85rem">${fmtNumber(u.points)}</div>
      <div class="pillar">${medal}</div>
    </div>`;
  }
}
