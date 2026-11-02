/* Workspace state, localStorage persistence and derived selectors. */
import { debounce, sum, uid, nowISO } from './util.js';
import { overallQuality } from './profile.js';
import { buildWorkspace, generateRetailRows, generateTicketRows, generateSurveyRows } from './seed.js';

const KEY = 'pcda.workspace.v1';

export const state = {
  data: null,
  storageOk: true,
  listeners: new Set(),
};

export function subscribe(fn) {
  state.listeners.add(fn);
  return () => state.listeners.delete(fn);
}

export function emit() {
  state.listeners.forEach((fn) => {
    try { fn(state.data); } catch (err) { console.error(err); }
  });
}

function regenerateRows(dataset) {
  const spec = dataset.seedSpec;
  if (!spec) return dataset;
  if (spec.kind === 'retail') dataset.rows = generateRetailRows(spec.seed, spec.rowCount);
  else if (spec.kind === 'tickets') dataset.rows = generateTicketRows(spec.seed, spec.rowCount);
  else if (spec.kind === 'survey') dataset.rows = generateSurveyRows(spec.seed, spec.rowCount);
  return dataset;
}

export function initStore() {
  let raw = null;
  try { raw = localStorage.getItem(KEY); } catch { state.storageOk = false; }
  if (raw) {
    try {
      state.data = JSON.parse(raw);
    } catch {
      state.data = null;
    }
  }
  if (!state.data || state.data.version !== 1 || !state.data.datasets) {
    state.data = buildWorkspace();
    saveNow();
  } else {
    state.data.datasets.forEach((ds) => { if (!ds.rows) regenerateRows(ds); });
  }
  return state.data;
}

export function saveNow() {
  try {
    const payload = {
      ...state.data,
      datasets: state.data.datasets.map((ds) => (ds.seedSpec ? { ...ds, rows: null } : ds)),
    };
    localStorage.setItem(KEY, JSON.stringify(payload));
    state.storageOk = true;
  } catch (err) {
    state.storageOk = false;
    console.warn('Workspace could not be persisted to localStorage:', err.message);
  }
}

export const save = debounce(() => { saveNow(); emit(); }, 220);

export function resetWorkspace() {
  state.data = buildWorkspace();
  saveNow();
  emit();
}

export function exportWorkspace() {
  return JSON.stringify({
    ...state.data,
    datasets: state.data.datasets.map((ds) => ({ ...ds, rows: ds.seedSpec ? undefined : ds.rows })),
    exportedAt: nowISO(),
  }, null, 2);
}

export function storageUsage() {
  try {
    const raw = localStorage.getItem(KEY) || '';
    return raw.length;
  } catch { return 0; }
}

/* ---------------- selectors ---------------- */

export function currentUser() {
  return state.data.users.find((u) => u.id === state.data.currentUserId) || state.data.users[0];
}

export function userById(id) {
  return state.data.users.find((u) => u.id === id) || { name: 'Unknown', initials: '—', color: 'slate' };
}

export function datasetById(id) {
  return state.data.datasets.find((d) => d.id === id) || null;
}

export function evidenceById(id) {
  return state.data.evidence.find((e) => e.id === id) || null;
}

export function insightById(id) {
  return state.data.insights.find((i) => i.id === id) || null;
}

export function visualizationById(id) {
  return state.data.visualizations.find((v) => v.id === id) || null;
}

export function analysisById(id) {
  return state.data.analyses.find((a) => a.id === id) || null;
}

export function reportById(id) {
  return state.data.reports.find((r) => r.id === id) || null;
}

export function activeInsights() {
  return state.data.insights.filter((i) => !i.archived);
}

export function activeEvidence() {
  return state.data.evidence.filter((e) => !e.superseded);
}

export function versionOf(dataset) {
  return dataset ? dataset.versions.find((v) => v.id === dataset.currentVersionId) : null;
}

export function evidenceForDataset(datasetId) {
  return state.data.evidence.filter((e) => e.datasetId === datasetId);
}

export function insightForEvidence(evidenceId) {
  return state.data.insights.find((i) => i.evidenceId === evidenceId && !i.archived) || null;
}

export function datasetRowsFor(dataset) {
  return dataset.rows || [];
}

export function logActivity(type, title, detail) {
  state.data.activity.unshift({ id: uid('act'), type, title, detail, at: nowISO() });
  state.data.activity = state.data.activity.slice(0, 40);
  save();
}

export function addNotification(title, detail, kind = 'info') {
  state.data.notifications.unshift({ id: uid('ntf'), title, detail, at: nowISO(), read: false, kind });
  state.data.notifications = state.data.notifications.slice(0, 20);
  save();
}

/* ---------------- dashboard metrics ---------------- */

export function dashboardMetrics() {
  const d = state.data;
  const datasets = d.datasets.filter((x) => !x.archived);
  const rows = sum(datasets, (ds) => ds.rowCount || 0);
  const insights = activeInsights();
  const verified = insights.filter((i) => i.status === 'Verified').length;
  const review = insights.filter((i) => i.status === 'Needs Review').length;
  const quality = overallQuality(datasets) ?? 0;
  const prev = d.workspace.previousRun || { datasets: 0, rows: 0, insights: 0, verified: 0, review: 0, quality: 0 };
  const delta = (now, before, unit = '') => {
    const diff = now - before;
    return {
      value: diff,
      label: `${diff > 0 ? '+' : ''}${unit === '%' ? diff.toFixed(0) : diff}${unit} vs previous run`,
      direction: diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat',
    };
  };
  return {
    datasets: { value: datasets.length, delta: delta(datasets.length, prev.datasets) },
    rows: { value: rows, delta: delta(rows, prev.rows) },
    insights: { value: d.insights.length, delta: delta(d.insights.length, prev.insights) },
    verified: { value: verified, delta: delta(verified, prev.verified) },
    review: { value: review, delta: delta(review, prev.review) },
    quality: { value: quality, delta: delta(quality, prev.quality, '%') },
    activeInsights: insights,
  };
}

export function reportVerification(report) {
  const ids = new Set();
  report.sections.forEach((s) => {
    if (['insights', 'risk', 'metrics'].includes(s.type)) (s.refs || []).forEach((r) => ids.add(r));
  });
  const selected = Array.from(ids).map(insightById).filter(Boolean);
  const verified = selected.filter((i) => i.status === 'Verified').length;
  const review = selected.filter((i) => i.status === 'Needs Review').length;
  const rejected = selected.filter((i) => i.status === 'Rejected' || i.status === 'Warning').length;
  return { total: selected.length, verified, review, rejected, selected };
}
