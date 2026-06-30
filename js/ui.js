/**
 * Shared UI utilities: toasts, modals, skeletons, confetti, formatting.
 * Framework-free, dependency-free (except Confetti uses canvas).
 */

/* ---------- Toasts ---------- */
function toastHost() {
  let host = document.getElementById('toast-host');
  if (!host) {
    host = document.createElement('div');
    host.id = 'toast-host';
    document.body.appendChild(host);
  }
  return host;
}

export function toast(message, type = 'success', timeout = 3200) {
  const host = toastHost();
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span class="dot"></span><span>${escapeHtml(message)}</span>`;
  host.appendChild(el);
  setTimeout(() => {
    el.classList.add('out');
    el.addEventListener('animationend', () => el.remove(), { once: true });
  }, timeout);
}

/* ---------- Modal ---------- */
export function modal(innerHtml) {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `<div class="modal glass card-lg">${innerHtml}</div>`;
  document.body.appendChild(backdrop);
  const close = () => {
    backdrop.style.animation = 'fade-in var(--dur) reverse';
    setTimeout(() => backdrop.remove(), 280);
  };
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) close();
  });
  backdrop.querySelectorAll('[data-close]').forEach((b) =>
    b.addEventListener('click', close)
  );
  return { el: backdrop.querySelector('.modal'), close };
}

/* ---------- Skeleton ---------- */
export function skeletonCards(count = 3) {
  return Array.from({ length: count })
    .map(
      () => `<div class="glass card">
        <div class="skeleton skel-line short"></div>
        <div class="skeleton skel-block"></div>
        <div class="skeleton skel-line"></div>
      </div>`
    )
    .join('');
}

/* ---------- Empty state ---------- */
export function emptyState(emoji, text) {
  return `<div class="empty"><div class="emoji">${emoji}</div><p>${escapeHtml(
    text
  )}</p></div>`;
}

/* ---------- Formatting ---------- */
export function fmtPoints(n) {
  const v = Number(n) || 0;
  const sign = v > 0 ? '+' : '';
  return `${sign}${v.toLocaleString()}`;
}

export function fmtNumber(n) {
  return (Number(n) || 0).toLocaleString();
}

export function timeAgo(date) {
  const d = new Date(date);
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function countdown(toDate) {
  const diff = new Date(toDate).getTime() - Date.now();
  if (diff <= 0) return 'Ended';
  const h = Math.floor(diff / 3.6e6);
  const m = Math.floor((diff % 3.6e6) / 6e4);
  const s = Math.floor((diff % 6e4) / 1000);
  if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(
    s
  ).padStart(2, '0')}`;
}

export function initials(name = '?') {
  return name
    .trim()
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function avatarHtml(user, cls = '') {
  if (user && user.avatar_url) {
    return `<img class="avatar ${cls}" src="${user.avatar_url}" alt="${escapeHtml(
      user.display_name || ''
    )}" loading="lazy">`;
  }
  return `<span class="avatar ${cls}">${initials(
    (user && user.display_name) || '?'
  )}</span>`;
}

export function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/* ---------- Confetti ---------- */
export function confetti(duration = 2200) {
  let canvas = document.getElementById('confetti-canvas');
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.id = 'confetti-canvas';
    document.body.appendChild(canvas);
  }
  const ctx = canvas.getContext('2d');
  const resize = () => {
    canvas.width = innerWidth;
    canvas.height = innerHeight;
  };
  resize();
  window.addEventListener('resize', resize);
  const colors = ['#10b981', '#6ee7b7', '#f5c542', '#ffffff', '#38bdf8'];
  const pieces = Array.from({ length: 140 }, () => ({
    x: Math.random() * canvas.width,
    y: -20 - Math.random() * canvas.height,
    r: 4 + Math.random() * 6,
    c: colors[(Math.random() * colors.length) | 0],
    vy: 2 + Math.random() * 4,
    vx: -2 + Math.random() * 4,
    rot: Math.random() * Math.PI,
    vr: -0.2 + Math.random() * 0.4,
  }));
  const end = Date.now() + duration;
  (function frame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pieces.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.c;
      ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * 1.6);
      ctx.restore();
    });
    if (Date.now() < end) {
      requestAnimationFrame(frame);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      window.removeEventListener('resize', resize);
    }
  })();
}

/* ---------- Misc ---------- */
export function qs(sel, root = document) {
  return root.querySelector(sel);
}
export function qsa(sel, root = document) {
  return [...root.querySelectorAll(sel)];
}
export function debounce(fn, ms = 250) {
  let t;
  return (...a) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...a), ms);
  };
}
