import { requireAuth } from '../auth.js';
import { renderShell } from '../shell.js';
import {
  leaderboard, listHabits, mySubmissions, listTransactions,
  listChallenges, listVotes, listNotifications, subscribeTable,
} from '../api.js';
import {
  avatarHtml, fmtNumber, fmtPoints, timeAgo, countdown, escapeHtml,
  skeletonCards, emptyState, qs,
} from '../ui.js';

const me = await requireAuth();
if (me) init();

function getMelbourneTimeString(date) {
  return new Intl.DateTimeFormat('en-AU', {
    timeZone: 'Australia/Melbourne',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

function getMelbourneDateString(date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Australia/Melbourne',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

async function init() {
  qs('#skeleton').innerHTML = skeletonCards(4);
  await renderShell('dashboard.html');
  await render();
  // Realtime: refresh on transaction / notification changes
  subscribeTable('transactions', () => render());
  subscribeTable('daily_submissions', () => render());
}

async function render() {
  const [board, habits, subs, tx, challenges, votes, notifs] = await Promise.all([
    leaderboard(), listHabits(), mySubmissions(me.id),
    listTransactions(me.id), listChallenges(), listVotes(),
    listNotifications(me.id),
  ]);

  const meRanked = board.find((u) => u.id === me.id) || { ...me, rank: '-' };
  const pending = subs.filter((s) => s.status === 'pending');
  const activeChallenge = challenges.find((c) => c.status === 'active');
  const activeVotes = votes.filter((v) => v.status === 'active');
  const recentTx = tx.slice(0, 5);
  const latestNotifs = notifs.slice(0, 4);
  const top = board.slice(0, 5);

  qs('#main').innerHTML = `
    <div class="page-head fade-up">
      <h1>Welcome back, ${escapeHtml(me.display_name)} 👋</h1>
      <p>Melbourne time: ${getMelbourneTimeString(new Date())}. Complete your daily check-in before midnight.</p>
    </div>

    <div class="glass card fade-up" style="margin-bottom:18px">
      <div class="row between">
        <div>
          <h3 style="margin:0">Daily Check-in</h3>
          <p class="muted" style="margin:6px 0 0">Submit your daily check-in by midnight Melbourne time. Votes are shown here too for quick access.</p>
        </div>
        <a class="btn btn-primary" href="checkins.html">Check in now</a>
      </div>
    </div>

    <div class="grid grid-4 fade-up">
      <div class="glass card stat"><div class="stat-label">Current Rank</div>
        <div class="stat-value">#${meRanked.rank}</div></div>
      <div class="glass card stat"><div class="stat-label">Points</div>
        <div class="stat-value mono">${fmtNumber(meRanked.points)}</div></div>
      <div class="glass card stat"><div class="stat-label">Pending Check-ins</div>
        <div class="stat-value">${pending.length}</div></div>
      <div class="glass card stat"><div class="stat-label">Weekly Gain</div>
        <div class="stat-value mono move-up">${fmtPoints(meRanked.weekly_gain)}</div></div>
    </div>

    <div class="grid grid-2" style="margin-top:18px">
      <div class="stack">
        ${activeChallenge ? challengeCard(activeChallenge) : ''}
        <div class="glass card fade-up">
          <div class="row between"><h3>Quick Actions</h3></div>
          <div class="row wrap" style="margin-top:12px">
            <a class="btn btn-primary" href="checkins.html">Daily Check-in</a>
            <a class="btn btn-ghost" href="votes.html">Vote now${activeVotes.length ? ` (${activeVotes.length})` : ''}</a>
            <a class="btn btn-ghost" href="challenges.html">Challenges</a>
            <a class="btn btn-ghost" href="history.html">History</a>
          </div>
        </div>
        <div class="glass card fade-up">
          <h3>Active Votes</h3>
          ${activeVotes.length ? `<div class="stack" style="margin-top:10px;gap:8px">
              ${activeVotes.map((v) => `<a class="row between" href="votes.html" style="padding:10px;border-radius:14px;background:var(--card)">
                <span>${escapeHtml(v.title)}</span>
                <span class="pill pill-info">⏱ ${countdown(v.end_date)}</span></a>`).join('')}
            </div>` : '<p class="muted" style="margin:12px 0 0">No active votes right now.</p>'}
        </div>
        <div class="glass card fade-up">
          <h3>Recent Transactions</h3>
          <div class="stack" style="margin-top:12px;gap:10px">
            ${recentTx.length ? recentTx.map(txRow).join('') : emptyState('💳','No transactions yet')}
          </div>
          <a class="btn btn-ghost btn-sm btn-block" style="margin-top:12px" href="history.html">View all</a>
        </div>
      </div>

      <div class="stack">
        <div class="glass card fade-up">
          <div class="row between"><h3>Leaderboard</h3><a class="pill pill-primary" href="leaderboard.html">Full board</a></div>
          <div class="stack" style="margin-top:12px;gap:8px">
            ${top.map(boardRow).join('')}
          </div>
        </div>

      </div>
    </div>`;
}

function challengeCard(c) {
  return `<div class="glass card-hover fade-up" style="padding:0;overflow:hidden" onclick="location.href='challenges.html'">
    ${c.image_url ? `<img src="${c.image_url}" alt="" style="height:150px;width:100%;object-fit:cover">` : ''}
    <div class="card">
      <div class="row between"><span class="pill pill-gold">Weekly Challenge</span>
        <span class="pill">⏱ ${countdown(c.end_date)}</span></div>
      <h3 style="margin-top:10px">${escapeHtml(c.title)}</h3>
      <p class="muted" style="margin-top:4px">${escapeHtml(c.description || '')}</p>
      <div class="pill pill-primary" style="margin-top:12px">🏆 ${fmtNumber(c.points)} pts</div>
    </div></div>`;
}

function activeVotesCard(votes) {
  return `<div class="glass card fade-up">
    <h3>Active Votes</h3>
    <div class="stack" style="margin-top:10px;gap:8px">
      ${votes.map((v) => `<a class="row between" href="votes.html" style="padding:10px;border-radius:14px;background:var(--card)">
        <span>${escapeHtml(v.title)}</span>
        <span class="pill pill-info">⏱ ${countdown(v.end_date)}</span></a>`).join('')}
    </div></div>`;
}

function txRow(t) {
  const cls = t.points >= 0 ? 'move-up' : 'move-down';
  return `<div class="row between">
    <div><div style="font-weight:600">${escapeHtml(t.title)}</div>
      <div class="tertiary" style="font-size:.78rem">${timeAgo(t.created_at)}</div></div>
    <div class="mono ${cls}" style="font-weight:700">${fmtPoints(t.points)}</div></div>`;
}

function boardRow(u) {
  const medal = u.rank === 1 ? '🥇' : u.rank === 2 ? '🥈' : u.rank === 3 ? '🥉' : `#${u.rank}`;
  return `<div class="row between">
    <div class="row"><span style="width:28px;text-align:center;font-weight:700">${medal}</span>
      ${avatarHtml(u,'avatar-sm')}<span style="font-weight:600">${escapeHtml(u.display_name)}</span></div>
    <span class="mono" style="font-weight:700">${fmtNumber(u.points)}</span></div>`;
}

function notifRow(n) {
  return `<div class="row" style="gap:10px">
    <span class="dot" style="width:8px;height:8px;border-radius:50%;background:var(--primary);flex-shrink:0"></span>
    <div><div style="font-weight:600;font-size:.9rem">${escapeHtml(n.title)}</div>
      <div class="tertiary" style="font-size:.76rem">${escapeHtml(n.body || '')}</div>
      <div class="tertiary" style="font-size:.76rem; margin-top:4px">${timeAgo(n.created_at)}</div></div></div>`;
}

