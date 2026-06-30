import { requireAuth } from '../auth.js';
import { renderShell } from '../shell.js';
import { leaderboard, listTransactions, mySubmissions, updateProfile, uploadImage } from '../api.js';
import { supabase } from '../supabase.js';
import { BUCKETS } from '../config.js';
import { avatarHtml, fmtNumber, fmtPoints, timeAgo, escapeHtml, qs, toast } from '../ui.js';

const me = await requireAuth();
if (me) init();

async function init() {
  await renderShell('profile.html');
  await render();
}

async function render() {
  const [board, tx, subs] = await Promise.all([
    leaderboard(), listTransactions(me.id), mySubmissions(me.id),
  ]);
  const ranked = board.find((u) => u.id === me.id) || me;
  const [ach, badges] = await Promise.all([
    supabase.from('achievements').select('*').eq('user_id', me.id),
    supabase.from('badges').select('*').eq('user_id', me.id),
  ]);
  const approved = subs.filter((s) => s.status === 'approved').length;
  const pending = subs.filter((s) => s.status === 'pending').length;

  qs('#main').innerHTML = `
    <div class="glass card-lg fade-up">
      <div class="row" style="gap:18px">
        ${avatarHtml(ranked,'avatar-lg')}
        <div><h1 style="font-size:1.7rem">${escapeHtml(ranked.display_name)}</h1>
          <div class="row wrap" style="margin-top:6px">
            <span class="pill pill-primary">Rank #${ranked.rank}</span>
            <span class="pill pill-gold">${fmtNumber(ranked.points)} pts</span>
          </div></div>
        <div class="spacer"></div>
        <label class="btn btn-ghost btn-sm">Change photo
          <input type="file" id="avatar-input" accept="image/*" hidden></label>
      </div>
    </div>

    <div class="grid grid-4 fade-up" style="margin-top:18px">
      <div class="glass card stat"><div class="stat-label">Completed</div><div class="stat-value">${approved}</div></div>
      <div class="glass card stat"><div class="stat-label">Pending</div><div class="stat-value">${pending}</div></div>
      <div class="glass card stat"><div class="stat-label">Achievements</div><div class="stat-value">${(ach.data||[]).length}</div></div>
      <div class="glass card stat"><div class="stat-label">Badges</div><div class="stat-value">${(badges.data||[]).length}</div></div>
    </div>

    <div class="grid grid-2" style="margin-top:18px">
      <div class="glass card fade-up"><h3>Progress</h3><canvas id="chart" height="180"></canvas></div>
      <div class="stack">
        <div class="glass card fade-up"><h3>Badges</h3>
          <div class="row wrap" style="margin-top:10px">
            ${(badges.data||[]).map((b)=>`<span class="pill pill-gold">${b.icon||'🏅'} ${escapeHtml(b.title)}</span>`).join('') || '<span class="muted">No badges yet</span>'}
          </div></div>
        <div class="glass card fade-up"><h3>Achievements</h3>
          <div class="stack" style="margin-top:10px;gap:8px">
            ${(ach.data||[]).map((a)=>`<div class="row"><span style="font-size:1.3rem">${a.icon||'🏆'}</span>
              <div><div style="font-weight:600">${escapeHtml(a.title)}</div>
              <div class="tertiary" style="font-size:.78rem">${escapeHtml(a.description||'')}</div></div></div>`).join('') || '<span class="muted">No achievements yet</span>'}
          </div></div>
      </div>
    </div>

    <div class="glass card fade-up" style="margin-top:18px"><h3>Recent History</h3>
      <div class="stack" style="margin-top:10px;gap:10px">
        ${tx.slice(0,8).map((t)=>`<div class="row between">
          <div><div style="font-weight:600">${escapeHtml(t.title)}</div>
          <div class="tertiary" style="font-size:.78rem">${timeAgo(t.created_at)} · bal ${fmtNumber(t.running_balance)}</div></div>
          <div class="mono ${t.points>=0?'move-up':'move-down'}" style="font-weight:700">${fmtPoints(t.points)}</div>
        </div>`).join('') || '<span class="muted">No history</span>'}
      </div></div>`;

  drawChart(tx);
  wireAvatar();
}

function drawChart(tx) {
  const ordered = [...tx].reverse();
  const labels = ordered.map((t) => new Date(t.created_at).toLocaleDateString(undefined,{month:'short',day:'numeric'}));
  const data = ordered.map((t) => t.running_balance);
  const ctx = qs('#chart');
  if (!ctx || !window.Chart) return;
  new Chart(ctx, {
    type: 'line',
    data: { labels, datasets: [{ data, borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,.15)', fill: true, tension: 0.35, pointRadius: 0, borderWidth: 3 }] },
    options: { plugins: { legend: { display: false } }, scales: { x: { grid: { display:false }, ticks:{ color:'#6b7078' } }, y: { grid:{ color:'rgba(255,255,255,.06)' }, ticks:{ color:'#6b7078' } } } },
  });
}

function wireAvatar() {
  const input = qs('#avatar-input');
  input.addEventListener('change', async () => {
    const file = input.files[0];
    if (!file) return;
    try {
      toast('Uploading…', 'info');
      const url = await uploadImage(BUCKETS.avatars, file, `${me.id}/`);
      await updateProfile(me.id, { avatar_url: url });
      toast('Profile photo updated');
      render();
    } catch (e) { toast(e.message || 'Upload failed', 'error'); }
  });
}
