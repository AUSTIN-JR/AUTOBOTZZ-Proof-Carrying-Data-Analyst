/* UI primitives: icons, badges, modals, drawers, toasts, empty states. */
import { esc } from './util.js';

const ICONS = {
  overview: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  datasets: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v7c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 12v7c0 1.7 3.6 3 8 3s8-1.3 8-3v-7"/>',
  studio: '<path d="M9 3h6"/><path d="M10 3v5.5L4.8 18a2 2 0 0 0 1.7 3h11a2 2 0 0 0 1.7-3L14 8.5V3"/><path d="M7.5 14h9"/>',
  chart: '<path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-7"/><path d="M22 20H2"/>',
  sparkles: '<path d="M12 3l1.9 4.6L18.5 9.5l-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9L12 3z"/><path d="M18.5 15.5l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9.9-2.1z"/>',
  shield: '<path d="M12 3l7.5 3v6c0 4.5-3.2 8.2-7.5 9.5C7.7 20.2 4.5 16.5 4.5 12V6L12 3z"/><path d="M9 12.2l2 2 4-4.2"/>',
  report: '<path d="M14 3H6.5A1.5 1.5 0 0 0 5 4.5v15A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5V8l-5-5z"/><path d="M14 3v5h5"/><path d="M8.5 13h7"/><path d="M8.5 17h5"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.7 9a1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.6-3.6"/>',
  bell: '<path d="M18 8a6 6 0 1 0-12 0c0 6-2.5 7-2.5 7h17S18 14 18 8z"/><path d="M10.3 20a2 2 0 0 0 3.4 0"/>',
  upload: '<path d="M12 16V4"/><path d="M7 9l5-5 5 5"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/>',
  download: '<path d="M12 4v12"/><path d="M7 11l5 5 5-5"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/>',
  check: '<path d="M4.5 12.5l5 5 10-11"/>',
  alert: '<path d="M12 3l9.5 17H2.5L12 3z"/><path d="M12 9v5"/><path d="M12 17.5v.01"/>',
  x: '<path d="M5 5l14 14"/><path d="M19 5L5 19"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6"/><path d="M12 7.5v.01"/>',
  filter: '<path d="M3 5h18l-7 8v6l-4 2v-8L3 5z"/>',
  sigma: '<path d="M18 5H6l6 7-6 7h12"/>',
  history: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  'chevron-down': '<path d="M6 9l6 6 6-6"/>',
  'chevron-right': '<path d="M9 6l6 6-6 6"/>',
  'chevron-left': '<path d="M15 6l-6 6 6 6"/>',
  'chevron-up': '<path d="M6 15l6-6 6 6"/>',
  plus: '<path d="M12 5v14"/><path d="M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M15 5.5A1.5 1.5 0 0 0 13.5 4H5.5A1.5 1.5 0 0 0 4 5.5v8A1.5 1.5 0 0 0 5.5 15"/>',
  play: '<path d="M8 5l11 7-11 7V5z"/>',
  refresh: '<path d="M20 11a8 8 0 1 0-2.3 6.7"/><path d="M20 4v7h-7"/>',
  trash: '<path d="M4 7h16"/><path d="M9 7V5h6v2"/><path d="M6 7l1 13h10l1-13"/>',
  edit: '<path d="M4 20h4L20 8l-4-4L4 16v4z"/><path d="M14 6l4 4"/>',
  duplicate: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 5.5A1.5 1.5 0 0 0 14.5 4H5.5A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16"/>',
  more: '<circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/>',
  'arrow-up': '<path d="M12 19V5"/><path d="M6 11l6-6 6 6"/>',
  'arrow-down': '<path d="M12 5v14"/><path d="M18 13l-6 6-6-6"/>',
  'arrow-right': '<path d="M4 12h15"/><path d="M13 6l6 6-6 6"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18"/><path d="M8 3v4"/><path d="M16 3v4"/>',
  tag: '<path d="M20 12.5L12.5 20 4 11.5V4h7.5L20 12.5z"/><circle cx="8.2" cy="8.2" r="1.2"/>',
  hash: '<path d="M10 3L8 21"/><path d="M16 3l-2 18"/><path d="M4 8.5h16"/><path d="M3.5 15.5h16"/>',
  type: '<path d="M4 6h16"/><path d="M12 6v14"/><path d="M9 20h6"/>',
  lock: '<rect x="4.5" y="10" width="15" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4.5 21a7.5 7.5 0 0 1 15 0"/>',
  external: '<path d="M14 4h6v6"/><path d="M20 4l-8 8"/><path d="M19 14v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/>',
  print: '<path d="M7 9V4h10v5"/><rect x="4" y="9" width="16" height="8" rx="2"/><path d="M7 14h10v7H7z"/>',
  share: '<circle cx="18" cy="5.5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="18.5" r="2.5"/><path d="M8.2 10.8l7.6-4"/><path d="M8.2 13.2l7.6 4"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5V12l3.2 2"/>',
  eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>',
  link: '<path d="M10 13.5a3.5 3.5 0 0 0 5 0l3-3a3.5 3.5 0 0 0-5-5l-1 1"/><path d="M14 10.5a3.5 3.5 0 0 0-5 0l-3 3a3.5 3.5 0 0 0 5 5l1-1"/>',
  flag: '<path d="M5 21V4"/><path d="M5 4h9l-1.5 4H19l-2 5H5"/>',
  sliders: '<path d="M4 6h10"/><path d="M18 6h2"/><path d="M4 12h4"/><path d="M12 12h8"/><path d="M4 18h12"/><path d="M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
  spark: '<path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z"/>',
  grid: '<rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/>',
  list: '<path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M3.5 6h.01"/><path d="M3.5 12h.01"/><path d="M3.5 18h.01"/>',
  table: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9.5h18"/><path d="M3 15h18"/><path d="M9 4v16"/>',
  inbox: '<path d="M4 13l2.5-8h11L20 13"/><path d="M4 13v5a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-5h-4.5a3.5 3.5 0 0 1-7 0H4z"/>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"/>',
  book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5v-15z"/><path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20v3H6.5A2.5 2.5 0 0 1 4 20.5z"/>',
  terminal: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9l3 3-3 3"/><path d="M13 15h4"/>',
  columns: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M12 4v16"/>',
  database: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/>',
};

export function icon(name, size = 16, className = '') {
  const body = ICONS[name] || ICONS.info;
  return `<svg class="icon ${className}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
}

const STATUS_TONE = {
  Verified: 'green',
  Reproducible: 'teal',
  Warning: 'amber',
  'Needs Review': 'amber',
  'Failed Validation': 'red',
  Rejected: 'red',
  Superseded: 'slate',
  Draft: 'slate',
  Published: 'green',
  Analyzed: 'green',
  Processing: 'amber',
  Completed: 'green',
  'In progress': 'amber',
  Active: 'green',
  Open: 'amber',
  Acknowledged: 'blue',
  Resolved: 'green',
};

const STATUS_ICON = {
  Verified: 'check',
  Reproducible: 'refresh',
  Warning: 'alert',
  'Needs Review': 'clock',
  'Failed Validation': 'x',
  Rejected: 'x',
  Superseded: 'history',
};

export function statusTone(status) {
  return STATUS_TONE[status] || 'slate';
}

export function statusBadge(status, extraClass = '') {
  const tone = statusTone(status);
  const ic = STATUS_ICON[status];
  return `<span class="badge badge-${tone} ${extraClass}">${ic ? icon(ic, 12) : '<span class="badge-dot"></span>'}${esc(status)}</span>`;
}

export function severityBadge(severity) {
  const map = { warning: ['amber', 'Warning'], info: ['blue', 'Info'], critical: ['red', 'Critical'], success: ['green', 'Pass'] };
  const [tone, label] = map[severity] || ['slate', severity];
  return `<span class="badge badge-${tone}"><span class="badge-dot"></span>${label}</span>`;
}

export function avatar(user, size = 'md') {
  return `<span class="avatar avatar-${size} avatar-${user.color || 'slate'}" title="${esc(user.name)}">${esc(user.initials || user.name.slice(0, 2).toUpperCase())}</span>`;
}

export function copyChip(text, label = null) {
  return `<button type="button" class="code-chip js-copy" data-copy="${esc(text)}" title="Copy ${esc(label || 'value')}">
    <code>${esc(label || text)}</code>${icon('copy', 13)}</button>`;
}

/* ---------------- overlays ---------------- */

let overlayStack = [];

export function openModal({ title, subtitle = '', body, footer = '', size = 'md', onMount, headerExtra = '' }) {
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.innerHTML = `
    <div class="modal modal-${size}" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <header class="modal-head">
        <div>
          <h2 id="modal-title">${esc(title)}</h2>
          ${subtitle ? `<p class="modal-sub">${esc(subtitle)}</p>` : ''}
        </div>
        <div class="modal-head-actions">${headerExtra}<button type="button" class="icon-btn js-close" aria-label="Close dialog">${icon('x', 18)}</button></div>
      </header>
      <div class="modal-body">${body}</div>
      ${footer ? `<footer class="modal-foot">${footer}</footer>` : ''}
    </div>`;
  document.body.appendChild(overlay);
  document.body.classList.add('no-scroll');
  const previous = document.activeElement;
  const close = () => {
    overlay.remove();
    overlayStack = overlayStack.filter((o) => o !== overlay);
    if (!overlayStack.length) document.body.classList.remove('no-scroll');
    if (previous && previous.focus) previous.focus();
  };
  overlayStack.push(overlay);
  overlay.querySelectorAll('.js-close').forEach((btn) => btn.addEventListener('click', close));
  overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) close(); });
  overlay.addEventListener('keydown', (e) => trapFocus(e, overlay));
  const first = overlay.querySelector('input, textarea, select, button:not(.js-close)');
  if (first) setTimeout(() => first.focus(), 30);
  if (onMount) onMount(overlay, close);
  return { overlay, close, root: overlay };
}

function trapFocus(e, container) {
  if (e.key === 'Escape') {
    e.preventDefault();
    container.querySelector('.js-close')?.click();
    return;
  }
  if (e.key !== 'Tab') return;
  const focusables = Array.from(container.querySelectorAll('a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'))
    .filter((el) => el.offsetParent !== null);
  if (!focusables.length) return;
  const firstEl = focusables[0];
  const lastEl = focusables[focusables.length - 1];
  if (e.shiftKey && document.activeElement === firstEl) { e.preventDefault(); lastEl.focus(); }
  else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); firstEl.focus(); }
}

let drawerOpen = null;

export function openDrawer({ title, subtitle = '', body, footer = '', width = 'evidence', onMount }) {
  closeDrawer();
  const overlay = document.createElement('div');
  overlay.className = 'overlay overlay-drawer';
  overlay.innerHTML = `
    <aside class="drawer drawer-${width}" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
      <header class="drawer-head">
        <div>
          <h2 id="drawer-title">${esc(title)}</h2>
          ${subtitle ? `<p class="drawer-sub">${esc(subtitle)}</p>` : ''}
        </div>
        <button type="button" class="icon-btn js-close" aria-label="Close panel">${icon('x', 18)}</button>
      </header>
      <div class="drawer-body">${body}</div>
      ${footer ? `<footer class="drawer-foot">${footer}</footer>` : ''}
    </aside>`;
  document.body.appendChild(overlay);
  document.body.classList.add('no-scroll');
  const close = () => { overlay.remove(); drawerOpen = null; document.body.classList.remove('no-scroll'); };
  drawerOpen = { overlay, close };
  overlay.querySelectorAll('.js-close').forEach((btn) => btn.addEventListener('click', close));
  overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) close(); });
  overlay.addEventListener('keydown', (e) => trapFocus(e, overlay));
  setTimeout(() => overlay.querySelector('.js-close')?.focus(), 30);
  if (onMount) onMount(overlay, close);
  return { overlay, close };
}

export function closeDrawer() {
  if (drawerOpen) drawerOpen.close();
}

let toastTimer = null;
export function toast(message, type = 'success', detail = '') {
  let host = document.querySelector('.toast-host');
  if (!host) {
    host = document.createElement('div');
    host.className = 'toast-host';
    host.setAttribute('role', 'status');
    host.setAttribute('aria-live', 'polite');
    document.body.appendChild(host);
  }
  const ic = { success: 'check', error: 'alert', warning: 'alert', info: 'info' }[type] || 'info';
  host.innerHTML = `<div class="toast toast-${type}">
    <span class="toast-icon">${icon(ic, 16)}</span>
    <div class="toast-text"><strong>${esc(message)}</strong>${detail ? `<span>${esc(detail)}</span>` : ''}</div>
  </div>`;
  host.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => host.classList.remove('show'), 4200);
}

export function confirmDialog({ title, message, confirmLabel = 'Confirm', danger = false }) {
  return new Promise((resolve) => {
    const { close } = openModal({
      title,
      body: `<p class="confirm-message">${esc(message)}</p>`,
      size: 'sm',
      footer: `<button type="button" class="btn btn-ghost js-cancel">Cancel</button>
        <button type="button" class="btn ${danger ? 'btn-danger' : 'btn-primary'} js-confirm">${esc(confirmLabel)}</button>`,
      onMount: (root) => {
        root.querySelector('.js-cancel').addEventListener('click', () => { close(); resolve(false); });
        root.querySelector('.js-confirm').addEventListener('click', () => { close(); resolve(true); });
        root.querySelector('.js-close').addEventListener('click', () => resolve(false));
      },
    });
  });
}

export function emptyState({ iconName = 'inbox', title, message, action = '' }) {
  return `<div class="empty-state">
    <span class="empty-icon">${icon(iconName, 26)}</span>
    <h3>${esc(title)}</h3>
    <p>${esc(message)}</p>
    ${action}
  </div>`;
}

export function progressRing(score, size = 64, tone = null) {
  const color = tone || (score >= 90 ? '#059669' : score >= 80 ? '#d97706' : '#dc2626');
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(100, Math.max(0, score)) / 100) * c;
  return `<span class="ring" style="width:${size}px;height:${size}px">
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true">
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="rgba(15,23,42,.09)" stroke-width="6"/>
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${color}" stroke-width="6"
        stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${offset}" transform="rotate(-90 ${size / 2} ${size / 2})"/>
    </svg>
    <strong>${score}</strong>
  </span>`;
}

export function pageHeader({ eyebrow = '', title, description = '', actions = '' }) {
  return `<header class="page-head">
    <div class="page-head-copy">
      ${eyebrow ? `<span class="eyebrow">${esc(eyebrow)}</span>` : ''}
      <h1>${esc(title)}</h1>
      ${description ? `<p class="page-desc">${esc(description)}</p>` : ''}
    </div>
    ${actions ? `<div class="page-head-actions">${actions}</div>` : ''}
  </header>`;
}

export function field({ label, name, type = 'text', value = '', placeholder = '', hint = '', options = null, required = false }) {
  const id = `f_${name}`;
  return `<div class="field">
    <label for="${id}">${esc(label)}${required ? '<span class="req">*</span>' : ''}</label>
    ${options
      ? `<select id="${id}" name="${esc(name)}">${options.map((o) => `<option value="${esc(o.value)}" ${String(o.value) === String(value) ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}</select>`
      : type === 'textarea'
        ? `<textarea id="${id}" name="${esc(name)}" rows="3" placeholder="${esc(placeholder)}">${esc(value)}</textarea>`
        : `<input id="${id}" name="${esc(name)}" type="${type}" value="${esc(value)}" placeholder="${esc(placeholder)}" ${required ? 'required' : ''} />`}
    ${hint ? `<span class="field-hint">${esc(hint)}</span>` : ''}
  </div>`;
}
