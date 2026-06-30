import { requireAuth } from '../auth.js';
import { renderShell } from '../shell.js';
import { listTransactions, subscribeTable } from '../api.js';
import { fmtNumber, fmtPoints, timeAgo, escapeHtml, qs, debounce } from '../ui.js';

const me = await requireAuth();
let all = [];
let filter = 'all';
let search = '';
if (me) init();

async function init() {
  await renderShell('history.html');
  await load();
  subscribeTable('transactions', () => load());
}

async function load() {
  all = await listTransactions(me.id);
  render();
}

function render() {
  const cats = ['all','daily','bonus','penalty','challenge','vote'];
  const filtered = all.filter((t) =>
    (filter==='all' || t.category===filter) &&
    (!search || t.title.toLowerCase().includes(search) || (t.description||'').toLowerCase().includes(search))
  );

  qs('#main').innerHTML = `
    <div class="page-head fade-up"><h1>Transaction History</h1><p>Your full points ledger</p></div>
    <div class="glass card fade-up" style="margin-bottom:16px">
      <input class="input" id="search" placeholder="Search transactions…" value="${escapeHtml(search)}">
      <div class="row wrap" style="margin-top:12px;gap:8px">
        ${cats.map((c)=>`<button class="pill ${filter===c?'pill-primary':''}" data-cat="${c}" style="cursor:pointer;text-transform:capitalize">${c}</button>`).join('')}
      </div>
    </div>
    <div class="glass card fade-up">
      ${filtered.length ? filtered.map(row).join('') : '<div class="empty"><div class="emoji">🔍</div><p>No matching transactions</p></div>'}
    </div>`;

  qs('#search').addEventListener('input', debounce((e)=>{ search=e.target.value.toLowerCase(); render(); }, 200));
  qs('#main').querySelectorAll('[data-cat]').forEach((b)=>b.addEventListener('click',()=>{ filter=b.dataset.cat; render(); }));
  const s = qs('#search'); s.focus(); s.setSelectionRange(s.value.length, s.value.length);
}

function row(t) {
  const cls = t.points>=0?'move-up':'move-down';
  return `<div class="row between" style="padding:12px 0;border-bottom:1px solid var(--card-border)">
    <div><div style="font-weight:600">${escapeHtml(t.title)}</div>
      <div class="tertiary" style="font-size:.78rem">${escapeHtml(t.description||'')} · ${timeAgo(t.created_at)}
      <span class="pill" style="margin-left:6px;text-transform:capitalize">${t.category}</span></div></div>
    <div style="text-align:right"><div class="mono ${cls}" style="font-weight:700">${fmtPoints(t.points)}</div>
      <div class="tertiary mono" style="font-size:.74rem">bal ${fmtNumber(t.running_balance)}</div></div></div>`;
}
