/* Application shell: routing, navigation, global search, menus. */
import {
  initStore, state, currentUser, activeInsights, activeEvidence, save, resetWorkspace,
  exportWorkspace, storageUsage, datasetById,
} from './store.js';
import { destroyAllCharts } from './charts.js';
import { closeDrawer, icon, toast, openModal, confirmDialog, avatar } from './ui.js';
import { esc, fmtCompact, fmtDate, timeAgo, copyText, downloadBlob } from './util.js';

import * as Overview from './pages/overview.js';
import * as Datasets from './pages/datasets.js';
import * as Studio from './pages/studio.js';
import * as Visualizations from './pages/visualizations.js';
import * as Insights from './pages/insights.js';
import * as Evidence from './pages/evidence.js';
import * as Reports from './pages/reports.js';
import * as Settings from './pages/settings.js';

const PAGES = {
  overview: Overview,
  datasets: Datasets,
  studio: Studio,
  visualizations: Visualizations,
  insights: Insights,
  evidence: Evidence,
  reports: Reports,
  settings: Settings,
};

const view = document.getElementById('view');
let currentRoute = { name: 'overview', params: { id: null, query: new URLSearchParams() } };

function parseRoute() {
  const raw = location.hash.replace(/^#\/?/, '');
  const [pathPart, queryPart] = raw.split('?');
  const parts = pathPart.split('/').filter(Boolean);
  const name = parts[0] || 'overview';
  return {
    name: PAGES[name] ? name : 'overview',
    params: {
      id: parts[1] ? decodeURIComponent(parts[1]) : null,
      query: new URLSearchParams(queryPart || ''),
    },
  };
}

export function render() {
  const route = parseRoute();
  currentRoute = route;
  destroyAllCharts();
  closeDrawer();
  view.innerHTML = '';
  try {
    PAGES[route.name].render(view, route.params);
  } catch (err) {
    console.error(err);
    view.innerHTML = `<div class="empty-state"><h3>This screen could not render</h3><p>${esc(err.message)}</p></div>`;
  }
  setActiveNav(route.name);
  const url = route.params.query.toString();
  if (url) history.replaceState(null, '', `${location.pathname}${location.search}${location.hash.split('?')[0]}?${url}`);
  window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  closeMobileNav();
}

function setActiveNav(name) {
  document.querySelectorAll('.nav-item').forEach((item) => {
    const active = item.dataset.route === name || (name === 'datasets' && item.dataset.route === 'datasets');
    item.classList.toggle('active', active);
    if (active) item.setAttribute('aria-current', 'page');
    else item.removeAttribute('aria-current');
  });
}

function hydrateShell() {
  const user = currentUser();
  const avatarEl = document.getElementById('topAvatar');
  avatarEl.textContent = user.initials;
  avatarEl.className = `avatar avatar-md avatar-${user.color}`;
  document.getElementById('topUserName').textContent = user.name;
  document.getElementById('topUserRole').textContent = user.title || user.role;

  const select = document.getElementById('datasetSelect');
  const datasets = state.data.datasets.filter((d) => !d.archived);
  if (!state.data.workspace.activeDatasetId || !datasets.some((d) => d.id === state.data.workspace.activeDatasetId)) {
    state.data.workspace.activeDatasetId = datasets[0]?.id || null;
  }
  select.innerHTML = datasets.map((d) => `<option value="${esc(d.id)}" ${d.id === state.data.workspace.activeDatasetId ? 'selected' : ''}>${esc(d.name)}</option>`).join('');

  const review = activeInsights().filter((i) => i.status === 'Needs Review').length;
  document.getElementById('navInsightCount').textContent = review ? String(review) : '';
  document.getElementById('navEvidenceCount').textContent = String(activeEvidence().length);
  const insights = activeInsights();
  const coverage = insights.length ? Math.round(insights.reduce((a, i) => a + (i.evidenceCoverage || 0), 0) / insights.length) : 0;
  document.getElementById('coverageStat').textContent = `${coverage}% of findings carry a proof record`;
  const unread = state.data.notifications.filter((n) => !n.read).length;
  const dot = document.getElementById('notifDot');
  if (dot) dot.hidden = !unread;
}

/* ---------------- menus ---------------- */

function renderNotifications() {
  const menu = document.getElementById('notifMenu');
  const items = state.data.notifications;
  menu.innerHTML = `<div class="dropdown-head"><span>Notifications</span><button class="link-btn js-read-all">Mark all read</button></div>
    ${items.length ? items.map((n) => `<button class="dropdown-item ${n.read ? '' : 'unread'}" data-notif="${esc(n.id)}">
      <span class="di-icon">${icon(n.kind === 'export' ? 'download' : n.kind === 'check' ? 'shield' : 'bell', 14)}</span>
      <span class="di-body"><strong>${esc(n.title)}</strong><span>${esc(n.detail)}</span><em>${timeAgo(n.at)}</em></span>
    </button>`).join('') : '<div class="search-empty">No notifications</div>'}
    <div class="dropdown-foot"><button class="btn btn-secondary btn-sm btn-block js-close-notif">Close</button></div>`;
  menu.querySelector('.js-read-all')?.addEventListener('click', () => {
    state.data.notifications.forEach((n) => { n.read = true; });
    save();
    renderNotifications();
    hydrateShell();
  });
  menu.querySelector('.js-close-notif')?.addEventListener('click', () => toggleMenu('notifMenu', false));
  menu.querySelectorAll('[data-notif]').forEach((btn) => btn.addEventListener('click', () => {
    const n = state.data.notifications.find((x) => x.id === btn.dataset.notif);
    if (n) { n.read = true; save(); hydrateShell(); }
    toggleMenu('notifMenu', false);
    if (/report/i.test(btn.textContent)) location.hash = '#/reports';
    else if (/finding|review/i.test(btn.textContent)) location.hash = '#/insights';
    else location.hash = '#/datasets';
  }));
}

function renderUserMenu() {
  const user = currentUser();
  const menu = document.getElementById('userMenu');
  menu.innerHTML = `<div class="dropdown-head"><span>${esc(user.name)}</span><span class="badge badge-violet">${esc(user.role)}</span></div>
    <div style="padding:12px 16px;display:flex;gap:10px;align-items:center;border-bottom:1px solid var(--line)">
      ${avatar(user, 'md')}
      <div style="display:flex;flex-direction:column"><strong style="font-size:12.5px">${esc(user.email)}</strong><span style="font-size:11px;color:var(--muted)">${esc(state.data.workspace.name)}</span></div>
    </div>
    <button class="dropdown-item" data-go="#/settings"><span class="di-icon">${icon('settings', 14)}</span><span class="di-body"><strong>Workspace settings</strong><span>Profile, validation thresholds, data</span></span></button>
    <button class="dropdown-item" data-go="#/evidence"><span class="di-icon">${icon('shield', 14)}</span><span class="di-body"><strong>Evidence Vault</strong><span>${activeEvidence().length} proof records</span></span></button>
    <button class="dropdown-item js-export"><span class="di-icon">${icon('download', 14)}</span><span class="di-body"><strong>Export workspace</strong><span>Download the demo workspace as JSON</span></span></button>
    <div class="dropdown-foot"><button class="btn btn-secondary btn-sm btn-block js-reset">Reset demo data</button></div>`;
  menu.querySelectorAll('[data-go]').forEach((btn) => btn.addEventListener('click', () => { location.hash = btn.dataset.go; toggleMenu('userMenu', false); }));
  menu.querySelector('.js-export').addEventListener('click', () => {
    downloadBlob(exportWorkspace(), 'proof-carrying-workspace.json', 'application/json');
    toast('Workspace exported', 'success', 'JSON bundle downloaded');
    toggleMenu('userMenu', false);
  });
  menu.querySelector('.js-reset').addEventListener('click', async () => {
    toggleMenu('userMenu', false);
    const ok = await confirmDialog({ title: 'Reset demo workspace?', message: 'This restores the seeded Acme Retail Analytics workspace and discards local changes. It cannot be undone.', confirmLabel: 'Reset workspace', danger: true });
    if (ok) { resetWorkspace(); hydrateShell(); location.hash = '#/overview'; render(); toast('Workspace reset', 'success', 'Seeded demo data restored.'); }
  });
}

function toggleMenu(id, show) {
  const menu = document.getElementById(id);
  const isHidden = menu.hidden;
  const next = typeof show === 'boolean' ? show : isHidden;
  ['notifMenu', 'userMenu'].forEach((m) => { document.getElementById(m).hidden = true; });
  document.getElementById('notificationBtn').setAttribute('aria-expanded', 'false');
  document.getElementById('userMenuBtn').setAttribute('aria-expanded', 'false');
  if (next) {
    menu.hidden = false;
    if (id === 'notifMenu') { renderNotifications(); document.getElementById('notificationBtn').setAttribute('aria-expanded', 'true'); }
    if (id === 'userMenu') { renderUserMenu(); document.getElementById('userMenuBtn').setAttribute('aria-expanded', 'true'); }
  }
}

/* ---------------- global search ---------------- */

function runSearch(term) {
  const q = term.trim().toLowerCase();
  const box = document.getElementById('searchResults');
  if (!q) { box.hidden = true; box.innerHTML = ''; return; }
  const match = (s) => String(s || '').toLowerCase().includes(q);
  const groups = [];
  const datasets = state.data.datasets.filter((d) => match(d.name) || match(d.fileName) || match(d.description));
  if (datasets.length) groups.push({
    label: 'Datasets', items: datasets.slice(0, 4).map((d) => ({
      icon: 'datasets', title: d.name, meta: `${fmtCompact(d.rowCount)} rows · v${d.versions.length}`, nav: `#/datasets/${d.id}`,
    })),
  });
  const insights = activeInsights().filter((i) => match(i.title) || match(i.description) || match(i.category));
  if (insights.length) groups.push({
    label: 'AI insights', items: insights.slice(0, 5).map((i) => ({
      icon: 'sparkles', title: i.title, meta: `${i.category} · ${i.status}`, nav: `#/insights?insight=${encodeURIComponent(i.id)}`,
    })),
  });
  const evidence = state.data.evidence.filter((e) => match(e.claim) || match(e.id) || match(e.datasetName));
  if (evidence.length) groups.push({
    label: 'Evidence artifacts', items: evidence.slice(0, 5).map((e) => ({
      icon: 'shield', title: e.claim, meta: `${e.id} · ${e.status}`, nav: `#/evidence/${encodeURIComponent(e.id)}`,
    })),
  });
  const charts = state.data.visualizations.filter((v) => match(v.title) || match(v.description));
  if (charts.length) groups.push({
    label: 'Visualizations', items: charts.slice(0, 4).map((v) => ({
      icon: 'chart', title: v.title, meta: `${v.type} · ${v.validationStatus}`, nav: `#/visualizations?chart=${encodeURIComponent(v.id)}`,
    })),
  });
  const reports = state.data.reports.filter((r) => match(r.title) || match(r.audience));
  if (reports.length) groups.push({
    label: 'Reports', items: reports.slice(0, 3).map((r) => ({
      icon: 'report', title: r.title, meta: `${r.status} · ${fmtDate(r.updatedAt)}`, nav: `#/reports/${encodeURIComponent(r.id)}`,
    })),
  });

  if (!groups.length) {
    box.innerHTML = `<div class="search-empty">No matches for “${esc(term)}”.<br /><span class="tiny">Search datasets, insights, evidence IDs or reports.</span></div>`;
  } else {
    box.innerHTML = groups.map((g) => `<div class="search-group"><div class="search-group-label">${esc(g.label)}</div>
      ${g.items.map((it) => `<a class="search-item" href="${it.nav}" role="option">
        <span class="si-icon">${icon(it.icon, 15)}</span>
        <span class="si-title">${esc(it.title)}</span>
        <span class="si-meta">${esc(it.meta)}</span>
      </a>`).join('')}</div>`).join('');
  }
  box.hidden = false;
  box.setAttribute('aria-expanded', 'true');
}

/* ---------------- mobile nav ---------------- */

function openMobileNav(open) {
  document.getElementById('sidebar').classList.toggle('open', open);
  document.getElementById('mobileScrim').hidden = !open;
  document.getElementById('menuBtn').setAttribute('aria-expanded', String(open));
}
function closeMobileNav() { openMobileNav(false); }

/* ---------------- boot ---------------- */

function boot() {
  initStore();
  hydrateShell();
  if (!location.hash) location.hash = '#/overview';

  window.addEventListener('hashchange', render);
  window.addEventListener('pcda:refresh', render);
  document.getElementById('nav').addEventListener('click', (e) => {
    const link = e.target.closest('.nav-item');
    if (link) closeMobileNav();
  });

  document.getElementById('menuBtn').addEventListener('click', () => {
    openMobileNav(!document.getElementById('sidebar').classList.contains('open'));
  });
  document.getElementById('mobileScrim').addEventListener('click', closeMobileNav);

  document.getElementById('datasetSelect').addEventListener('change', (e) => {
    state.data.workspace.activeDatasetId = e.target.value;
    save();
    render();
  });

  document.getElementById('notificationBtn').addEventListener('click', (e) => { e.stopPropagation(); toggleMenu('notifMenu'); });
  document.getElementById('userMenuBtn').addEventListener('click', (e) => { e.stopPropagation(); toggleMenu('userMenu'); });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#notifMenu') && !e.target.closest('#notificationBtn')) document.getElementById('notifMenu').hidden = true;
    if (!e.target.closest('#userMenu') && !e.target.closest('#userMenuBtn')) document.getElementById('userMenu').hidden = true;
    if (!e.target.closest('.search-wrap')) {
      const box = document.getElementById('searchResults');
      if (box) { box.hidden = true; box.setAttribute('aria-expanded', 'false'); }
    }
  });

  const search = document.getElementById('globalSearch');
  let searchTimer = null;
  search.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => runSearch(search.value), 120);
  });
  search.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { search.blur(); document.getElementById('searchResults').hidden = true; }
    if (e.key === 'Enter') {
      const first = document.querySelector('#searchResults .search-item');
      if (first) { location.hash = first.getAttribute('href'); document.getElementById('searchResults').hidden = true; search.value = ''; }
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && !/input|textarea|select/i.test(document.activeElement.tagName)) {
      e.preventDefault();
      search.focus();
    }
  });

  document.getElementById('uploadBtn').addEventListener('click', () => Datasets.openUploadModal());

  document.addEventListener('click', async (e) => {
    const copyBtn = e.target.closest('.js-copy');
    if (copyBtn) {
      const ok = await copyText(copyBtn.dataset.copy);
      toast(ok ? 'Copied to clipboard' : 'Copy failed', ok ? 'success' : 'error');
    }
    const nav = e.target.closest('[data-nav]');
    if (nav) location.hash = nav.dataset.nav;
  });

  if (state.data.workspace.activeDatasetId) saveNowSafe();
  render();
}

function saveNowSafe() {
  try { save(); } catch { /* persistence is best-effort */ }
}

document.addEventListener('DOMContentLoaded', boot);
