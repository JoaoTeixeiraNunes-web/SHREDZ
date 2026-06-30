import { requireAuth } from '../auth.js';
import { renderShell } from '../shell.js';
import { listHabits, submitCheckin, mySubmissions } from '../api.js';
import { PROOF_EMAIL } from '../config.js';
import { fmtNumber, escapeHtml, timeAgo, qs, toast, modal } from '../ui.js';

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
  await renderShell('checkins.html');
  await render();
}

async function render() {
  const [habits, subs] = await Promise.all([listHabits(), mySubmissions(me.id)]);
  const today = getMelbourneDateString(new Date());
  const submittedToday = new Set(
    subs.filter((s) => getMelbourneDateString(new Date(s.created_at)) === today)
        .map((s) => s.habit_title)
  );
  const currentMelbourne = getMelbourneTimeString(new Date());
  const allDone = habits.every((h) => submittedToday.has(h.title));

  qs('#main').innerHTML = `
    <div class="page-head fade-up"><h1>Daily Check-in</h1>
      <p>Melbourne time: ${currentMelbourne}. You have until midnight Melbourne time to submit today’s check-in.</p></div>

    <div class="glass card fade-up" style="margin-bottom:18px;border-color:rgba(245,197,66,.3)">
      <div class="row between" style="gap:12px">
        <div>
          <div class="row" style="gap:10px;align-items:center"><span style="font-size:1.3rem">⏱️</span>
            <div><strong>Submit by midnight Melbourne time</strong></div></div>
          <div class="tertiary" style="font-size:.9rem;margin-top:6px">Local Melbourne time is shown here so you can plan your check-in correctly.</div>
        </div>
        <span class="pill pill-primary">${today}</span>
      </div>
    </div>

    <div class="glass card fade-up" style="margin-bottom:18px;border-color:rgba(245,197,66,.3)">
      <div class="row"><span style="font-size:1.3rem">📧</span>
      <div><strong>Send proof to:</strong> <span class="mono">${PROOF_EMAIL}</span>
      <div class="tertiary" style="font-size:.82rem">Points are awarded only after an admin approves.</div></div></div>
    </div>

    ${allDone ? `<div class="glass card fade-up" style="margin-bottom:18px">
      <div class="row" style="gap:12px;align-items:center">
        <span class="pill pill-primary">✅</span>
        <div><strong>All check-ins completed for Melbourne today.</strong>
          <div class="tertiary" style="font-size:.9rem;margin-top:4px">Come back after midnight Melbourne time for the next day.</div></div>
      </div>
    </div>` : ''}

    <div class="grid grid-2" id="habit-grid">
      ${habits.map((h) => habitCard(h, submittedToday.has(h.title))).join('')}
    </div>

    <div class="glass card fade-up" style="margin-top:22px">
      <h3>My Recent Submissions</h3>
      <div class="stack" style="margin-top:12px;gap:10px">
        ${subs.slice(0,10).map(subRow).join('') || '<span class="muted">Nothing yet</span>'}
      </div>
    </div>`;

  qs('#habit-grid').addEventListener('click', onSubmit);
}

function habitCard(h, done) {
  return `<div class="glass card card-hover fade-up">
    <div class="row between"><h3>${escapeHtml(h.title)}</h3>
      <span class="pill pill-primary">+${fmtNumber(h.points)}</span></div>
    <p class="muted" style="margin:8px 0 16px">${escapeHtml(h.description||'')}</p>
    ${done
      ? '<span class="pill pill-pending btn-block" style="justify-content:center">⏳ Pending today</span>'
      : `<button class="btn btn-primary btn-block" data-id="${h.id}" data-title="${escapeHtml(h.title)}" data-points="${h.points}">Submit</button>`}
  </div>`;
}

function subRow(s) {
  const pill = s.status==='approved'?'pill-primary':s.status==='rejected'?'pill-danger':'pill-pending';
  return `<div class="row between">
    <div><div style="font-weight:600">${escapeHtml(s.habit_title)}</div>
      <div class="tertiary" style="font-size:.78rem">${timeAgo(s.created_at)}</div></div>
    <span class="pill ${pill}">${s.status}</span></div>`;
}

async function onSubmit(e) {
  const btn = e.target.closest('button[data-id]');
  if (!btn) return;
  btn.disabled = true; btn.textContent = 'Submitting…';
  try {
    await submitCheckin(me.id, { id: btn.dataset.id, title: btn.dataset.title, points: +btn.dataset.points });
    modal(`<div class="text-c">
      <div style="font-size:2.4rem">✅</div>
      <h3 style="margin-top:8px">Submission Recorded</h3>
      <p class="muted" style="margin:10px 0">Please send proof to:<br><strong class="mono">${PROOF_EMAIL}</strong></p>
      <p class="muted">Awaiting administrator approval.</p>
      <button class="btn btn-primary btn-block" style="margin-top:16px" data-close>Got it</button>
    </div>`);
    render();
  } catch (err) {
    toast(err.message || 'Submission failed', 'error');
    btn.disabled = false; btn.textContent = 'Submit';
  }
}
