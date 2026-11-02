/* Analysis Studio: configuration, deterministic runs, lineage and evidence. */
import {
  state, datasetById, versionOf, save, logActivity, currentUser, reportById,
} from '../store.js';
import {
  pageHeader, statusBadge, icon, emptyState, openModal, toast, statusTone, field,
} from '../ui.js';
import {
  esc, fmtInt, fmtPct, fmtDate, fmtCompactMoney, fmtMoney, shortFingerprint, timeAgo, uid, nowISO,
  parseDate,
} from '../util.js';
import { renderChart, destroyAllCharts } from '../charts.js';
import { analyze, ANALYSIS_TYPES, AGGREGATIONS } from '../analysis.js';
import { buildEvidence, idxMap } from '../calc.js';
import { openEvidencePanel, checkLabel } from '../evidencePanel.js';
import { openVizModal } from './visualizations.js';

const studio = {
  datasetId: null,
  type: 'trend',
  metric: 'revenue',
  dimension: 'date',
  aggregation: 'sum',
  filters: [],
  transformations: [{ type: 'remove_duplicates' }, { type: 'remove_missing' }],
  settings: { confidenceLevel: 95, minSample: 30 },
  question: '',
  result: null,
  evidenceId: null,
  runId: null,
  running: false,
  loadedRun: null,
};

const TRANSFORMATION_LIBRARY = [
  { type: 'remove_duplicates', label: 'Remove duplicate transactions', detail: 'Dedupe on Transaction ID before aggregation' },
  { type: 'remove_missing', label: 'Remove missing values', detail: 'Exclude rows where the selected metric is null' },
  { type: 'exclude_invalid', label: 'Exclude invalid values', detail: 'Drop range-violating discount, CSAT and unit values' },
  { type: 'date_bucket', label: 'Bucket dates by month', detail: 'Group dates into calendar months' },
  { type: 'sort', label: 'Sort by metric (descending)', detail: 'Order the result table by the selected metric' },
  { type: 'limit', label: 'Limit to top 10 rows', detail: 'Show only the ten largest groups' },
];

const PRESETS = [
  {
    title: 'Revenue by month with quarter-over-quarter growth', icon: 'chart',
    description: 'Monthly revenue totals with the Q4 seasonal uplift annotated.',
    config: { type: 'trend', metric: 'revenue', dimension: 'date', aggregation: 'sum' },
  },
  {
    title: 'Profit margin by region and product category', icon: 'grid',
    description: 'Profit margin per region with the category mix behind it.',
    config: { type: 'segmentation', metric: 'profit', dimension: 'region', aggregation: 'margin' },
  },
  {
    title: 'Correlation between support tickets and churn risk', icon: 'spark',
    description: 'How ticket volume moves with the recorded churn-risk band.',
    config: { type: 'correlation', metric: 'churn', dimension: 'tickets', aggregation: 'count' },
  },
  {
    title: 'Outlier detection for unusually large transactions', icon: 'alert',
    description: 'Tukey fence over revenue with the flagged transactions listed.',
    config: { type: 'outlier', metric: 'revenue', dimension: 'region', aggregation: 'sum' },
  },
  {
    title: 'Customer-segment comparison for revenue and satisfaction', icon: 'columns',
    description: 'Revenue and CSAT side by side for each customer segment.',
    config: { type: 'segmentation', metric: 'revenue', dimension: 'segment', aggregation: 'sum' },
  },
  {
    title: 'Discount impact on units sold', icon: 'tag',
    description: 'Association between discount depth and units, with margin caveats.',
    config: { type: 'correlation', metric: 'units', dimension: 'discount', aggregation: 'count' },
  },
];

export function render(root, params) {
  const datasets = state.data.datasets.filter((d) => !d.archived);
  const requested = params.query.get('dataset') || state.data.workspace.activeDatasetId;
  const ds = datasetById(requested) || datasets[0];
  if (!ds) {
    root.innerHTML = `<div class="card">${emptyState({ iconName: 'datasets', title: 'No dataset available', message: 'Upload a dataset before running an analysis.', action: '<a class="btn btn-primary" href="#/datasets">Go to datasets</a>' })}</div>`;
    return;
  }
  if (studio.datasetId !== ds.id) {
    studio.datasetId = ds.id;
    if (!params.query.get('run')) { studio.result = null; studio.evidenceId = null; studio.runId = null; }
  }

  const runId = params.query.get('run');
  if (runId && studio.runId !== runId) {
    const run = state.data.analyses.find((a) => a.id === runId);
    if (run) {
      studio.type = run.type;
      studio.metric = run.metric || 'revenue';
      studio.dimension = run.dimension || 'date';
      studio.aggregation = run.aggregation || 'sum';
      studio.filters = run.filters || [];
      studio.transformations = run.transformations || [];
      studio.settings = { ...studio.settings, ...(run.settings || {}) };
      studio.runId = run.id;
      studio.evidenceId = run.evidenceId || null;
      studio.result = analyze(runConfig(ds));
      studio.loadedRun = run;
    }
  }
  if (params.query.get('autorun') && !studio.result) {
    studio.running = true;
    setTimeout(() => { studio.running = false; studio.result = analyze(runConfig(ds)); window.dispatchEvent(new Event('pcda:refresh')); }, 900);
  }

  root.innerHTML = `<div class="stack">
    ${pageHeader({
    eyebrow: 'Analysis Studio',
    title: 'Compose an analysis',
    description: 'Choose fields, filters and transformations. Every run produces a deterministic result, a lineage record and a validation status.',
    actions: `<span class="badge badge-slate">${esc(ds.name)} · v${versionOf(ds).version}</span>`,
  })}
    <div class="studio-grid">
      ${leftPanel(ds)}
      <div class="analysis-canvas card" id="analysisCanvas">${canvasHtml(ds)}</div>
      ${rightPanel(ds)}
    </div>
  </div>`;

  bind(root, ds);
  if (studio.result && !studio.running) renderResultChart(studio.result, ds);
}

function runConfig(ds) {
  return {
    dataset: ds, type: studio.type, metric: studio.metric, dimension: studio.dimension,
    aggregation: studio.aggregation, filters: studio.filters, transformations: studio.transformations,
    settings: studio.settings, question: studio.question,
  };
}

function selectedFieldsText() {
  const parts = [];
  if (studio.metric) parts.push(studio.metric);
  if (studio.dimension) parts.push(studio.dimension);
  return parts;
}

function leftPanel(ds) {
  const groups = { numeric: [], categorical: [], date: [], text: [] };
  ds.columns.forEach((c) => groups[c.type]?.push(c));
  const labelFor = (key) => ds.columns.find((c) => c.key === key)?.label || key;
  return `<div class="stack">
    <section class="studio-panel">
      <div class="studio-panel-head"><h2>Configuration</h2><span class="badge badge-blue">v${versionOf(ds).version}</span></div>
      <div class="studio-section">
        <label for="stDataset">Dataset</label>
        <select class="select" id="stDataset">
          ${state.data.datasets.filter((d) => !d.archived).map((d) => `<option value="${esc(d.id)}" ${d.id === ds.id ? 'selected' : ''}>${esc(d.name)}</option>`).join('')}
        </select>
      </div>
      <div class="studio-section">
        <label for="stType">Analysis type</label>
        <select class="select" id="stType">
          ${ANALYSIS_TYPES.map((t) => `<option value="${t.value}" ${studio.type === t.value ? 'selected' : ''}>${esc(t.label)}</option>`).join('')}
        </select>
        <div class="row wrap" style="margin-top:8px;gap:4px">
          ${studio.metric ? `<span class="chip chip-blue">${icon('hash', 11)} ${esc(labelFor(studio.metric))}</span>` : ''}
          ${studio.dimension ? `<span class="chip chip-teal">${icon('tag', 11)} ${esc(labelFor(studio.dimension))}</span>` : ''}
        </div>
      </div>
      <div class="studio-section">
        <span class="studio-label">Field browser</span>
        ${['numeric', 'categorical', 'date', 'text'].map((type) => groups[type].length ? `<div class="field-group">
          <div class="field-group-title">${type === 'categorical' ? 'Categorical' : type} (${groups[type].length})</div>
          ${groups[type].map((c) => `<button class="field-pill ${studio.metric === c.key || studio.dimension === c.key ? 'selected' : ''}" data-field="${esc(c.key)}" data-ftype="${c.type}">
            ${icon(c.type === 'numeric' ? 'hash' : c.type === 'date' ? 'calendar' : c.type === 'categorical' ? 'tag' : 'type', 12)}
            <span>${esc(c.label)}</span><span class="fp-type">${studio.metric === c.key ? 'metric' : studio.dimension === c.key ? 'dim' : ''}</span>
          </button>`).join('')}
        </div>` : '').join('')}
        <p class="tiny muted" style="margin-top:6px">Click a numeric field to set the metric; a categorical or date field to set the dimension.</p>
      </div>
      <div class="studio-section">
        <div class="row-between"><span class="studio-label" style="margin:0">Filters</span><button class="link-btn" id="addFilter">${icon('plus', 11)} Add filter</button></div>
        <div style="margin-top:8px">
          ${studio.filters.length ? studio.filters.map((f, i) => `<div class="filter-chip">${icon('filter', 11)} ${esc(filterLabel(ds, f))}<button data-rm-filter="${i}" aria-label="Remove filter">${icon('x', 11)}</button></div>`).join('') : '<p class="tiny muted">No filters — all rows in the version are in scope.</p>'}
        </div>
      </div>
      <div class="studio-section">
        <span class="studio-label">Transformations</span>
        ${studio.transformations.map((t, i) => {
    const def = TRANSFORMATION_LIBRARY.find((x) => x.type === t.type);
    return `<div class="transform-item"><span class="ti-num">${i + 1}</span><span>${esc(def?.label || t.type)}</span><button class="icon-btn" data-rm-transform="${i}" aria-label="Remove transformation">${icon('x', 12)}</button></div>`;
  }).join('') || '<p class="tiny muted">No transformations applied.</p>'}
        <select class="select" id="addTransform" style="margin-top:6px">
          <option value="">+ Add transformation…</option>
          ${TRANSFORMATION_LIBRARY.filter((t) => !studio.transformations.some((s) => s.type === t.type)).map((t) => `<option value="${t.type}">${esc(t.label)}</option>`).join('')}
        </select>
      </div>
      <div class="studio-section">
        <span class="studio-label">Statistical settings</span>
        <div class="stack-sm">
          <div class="field"><label for="stConf">Confidence level</label>
            <select class="select" id="stConf">
              ${[90, 95, 99].map((c) => `<option value="${c}" ${studio.settings.confidenceLevel === c ? 'selected' : ''}>${c}%</option>`).join('')}
            </select>
          </div>
          <div class="field"><label for="stSample">Minimum sample size</label>
            <input class="input" id="stSample" type="number" min="1" max="10000" value="${studio.settings.minSample}" />
          </div>
          ${studio.type === 'segmentation' ? `<div class="field"><label for="stAgg">Aggregation</label>
            <select class="select" id="stAgg">${AGGREGATIONS.map((a) => `<option value="${a.value}" ${studio.aggregation === a.value ? 'selected' : ''}>${esc(a.label)}</option>`).join('')}</select>
          </div>` : ''}
          ${studio.type === 'custom' ? `<div class="field"><label for="stQuestion">Question</label><input class="input" id="stQuestion" type="text" value="${esc(studio.question)}" placeholder="How did revenue change from Q3 to Q4?" /></div>` : ''}
        </div>
      </div>
      <div class="studio-section">
        <button class="btn btn-primary btn-block" id="runAnalysis">${icon('play', 15)} Run Analysis</button>
        <p class="tiny muted" style="margin-top:7px;text-align:center">Deterministic · no model inference on the numbers</p>
      </div>
    </section>
  </div>`;
}

function filterLabel(ds, f) {
  const label = ds.columns.find((c) => c.key === f.field)?.label || f.field;
  if (f.op === 'between') return `${label} ${f.value} → ${f.value2}`;
  if (f.op === 'in') return `${label} in ${Array.isArray(f.value) ? f.value.join(', ') : f.value}`;
  return `${label} ${f.op} ${f.value}`;
}

function canvasHtml(ds) {
  if (studio.running) {
    return `<div class="loading-panel">
      <span class="spinner spinner-lg"></span>
      <strong style="color:var(--ink)">Running deterministic analysis…</strong>
      <div class="loading-steps">
        ${['Validating dataset fingerprint', 'Applying filters and transformations', 'Executing the calculation', 'Running validation checks'].map((s, i) => `<div class="loading-step ${i === 0 ? 'done' : ''}"><span class="ls-dot">${i === 0 ? '✓' : ''}</span>${s}</div>`).join('')}
      </div>
    </div>`;
  }
  if (!studio.result) {
    return `<div class="card-head"><div><h2>Start from a preset or compose your own</h2><p>Preset analyses are the fastest way to see how evidence is built. Every run stays editable.</p></div></div>
      <div class="card-body">
        <div class="dataset-grid" style="grid-template-columns:repeat(auto-fill,minmax(250px,1fr))">
          ${PRESETS.map((p, i) => `<button class="insight-mini" data-preset="${i}" style="text-align:left;gap:9px">
            <div class="insight-mini-top"><span class="cat-icon">${icon(p.icon, 13)}</span><h3>${esc(p.title)}</h3></div>
            <p>${esc(p.description)}</p>
            <span class="link-btn">Load analysis ${icon('arrow-right', 11)}</span>
          </button>`).join('')}
        </div>
        <div class="callout" style="margin-top:14px">${icon('shield', 15)}<div>Every result in this workspace is produced by a deterministic calculation. The AI never invents a number: it explains a computed result and links to its proof record.</div></div>
      </div>`;
  }
  const r = studio.result;
  const evidence = studio.evidenceId ? state.data.evidence.find((e) => e.id === studio.evidenceId) : null;
  return `<div class="canvas-head">
      <div><h2>${esc(r.title)}</h2><p>${esc(r.subtitle)}</p></div>
      <div class="row wrap" style="gap:6px">
        ${statusBadge(r.validation.status === 'Draft' ? 'Reproducible' : r.validation.status)}
        <span class="chip">Score ${r.validation.score}/100</span>
        <span class="chip">${fmtInt(r.lineage.sampleSize)} rows</span>
      </div>
    </div>
    <div class="canvas-body">
      ${r.empty ? `<div class="empty-state">${icon('terminal', 26)}<h3>No deterministic mapping yet</h3><p>${esc(r.narrative)}</p></div>` : `
      <dl class="kpi-strip">${r.kpis.map((k) => `<div class="kpi-tile"><dt>${esc(k.label)}</dt><dd>${esc(k.value)}</dd></div>`).join('')}</dl>
      ${r.chart ? `<div class="chart-box"><canvas id="studioChart"></canvas></div>` : ''}
      <div class="narrative">${esc(r.narrative)}</div>
      ${r.table ? `<div class="table-wrap" style="border:1px solid var(--line);border-radius:10px;max-height:320px;overflow:auto">
        <table class="data"><thead><tr>${r.table.columns.map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead>
        <tbody>${tableRows(r).map((row) => `<tr>${row.map((c) => `<td>${esc(String(c))}</td>`).join('')}</tr>`).join('')}</tbody></table>
      </div>` : ''}
      <div class="row wrap" style="gap:8px;border-top:1px solid var(--line);padding-top:14px">
        <button class="btn btn-secondary btn-sm" id="saveAnalysis">${icon('check', 14)} Save analysis</button>
        <button class="btn btn-secondary btn-sm" id="createViz">${icon('chart', 14)} Create visualization</button>
        <button class="btn btn-secondary btn-sm" id="genEvidence">${icon('shield', 14)} Generate evidence artifact</button>
        ${evidence ? `<a class="btn btn-soft btn-sm" href="#/evidence/${evidence.id}">${icon('external', 14)} ${esc(evidence.id)} · ${esc(evidence.status)}</a>` : ''}
        <span class="grow"></span>
        <button class="btn btn-ghost btn-sm" id="openProof">${icon('link', 14)} ${evidence ? 'Open full proof trail' : 'Proof trail unlocks after evidence'}</button>
      </div>`}
    </div>`;
}

function tableRows(r) {
  const sortTx = studio.transformations.find((t) => t.type === 'sort');
  const limitTx = studio.transformations.find((t) => t.type === 'limit');
  let rows = r.table.rows.slice();
  if (sortTx) {
    rows.sort((a, b) => {
      const av = Number(String(a[1]).replace(/[$,%]/g, ''));
      const bv = Number(String(b[1]).replace(/[$,%]/g, ''));
      return Number.isFinite(av) && Number.isFinite(bv) ? bv - av : 0;
    });
  }
  if (limitTx) rows = rows.slice(0, 10);
  return rows;
}

function rightPanel(ds) {
  const r = studio.result;
  const evidence = studio.evidenceId ? state.data.evidence.find((e) => e.id === studio.evidenceId) : null;
  const version = versionOf(ds);
  return `<aside class="stack studio-proof">
    <section class="studio-panel">
      <div class="studio-panel-head"><h2>Lineage</h2>${r ? (r.evidenceSpec ? icon('check', 13) : '') : ''}</div>
      <div class="studio-section">
        <div class="proof-list">
          <div class="proof-list-item"><span class="pl-label">Dataset</span><span class="pl-value">${esc(ds.name)}</span></div>
          <div class="proof-list-item"><span class="pl-label">Version</span><span class="pl-value">v${version.version} · ${esc(shortFingerprint(version.fingerprint))}</span></div>
          <div class="proof-list-item"><span class="pl-label">Fields</span><span class="pl-value">${selectedFieldsText().map((f) => esc(ds.columns.find((c) => c.key === f)?.label || f)).join(', ') || '—'}</span></div>
          <div class="proof-list-item"><span class="pl-label">Filters</span><span class="pl-value">${studio.filters.length ? studio.filters.map((f) => esc(filterLabel(ds, f))).join('<br />') : 'None'}</span></div>
          <div class="proof-list-item"><span class="pl-label">Transformations</span><span class="pl-value">${studio.transformations.length ? studio.transformations.map((t) => esc(TRANSFORMATION_LIBRARY.find((x) => x.type === t.type)?.label || t.type)).join('<br />') : 'None'}</span></div>
          <div class="proof-list-item"><span class="pl-label">Assumptions</span><span class="pl-value">${(r?.lineage.assumptions || []).map(esc).join('<br />') || '—'}</span></div>
        </div>
      </div>
      <div class="studio-section">
        <span class="studio-label">Validation</span>
        ${r ? `<div class="row-between" style="margin-bottom:6px">${statusBadge(r.validation.status === 'Draft' ? 'Reproducible' : r.validation.status)}<strong class="small">${r.validation.score}/100</strong></div>
          <div class="checks">${r.checks.slice(0, 5).map((c) => `<div class="check-row check-${c.status}" style="padding:6px 8px">
            <span class="check-icon">${icon(c.status === 'pass' ? 'check' : c.status === 'warn' ? 'alert' : 'x', 10)}</span>
            <div><strong style="font-size:11.5px">${esc(checkLabel(c))}</strong></div>
          </div>`).join('')}</div>
          <p class="tiny muted" style="margin-top:8px">${r.validation.pendingReproduction ? 'Reproduction is pending: generate an evidence artifact to recompute and lock the result.' : ''}</p>`
    : '<p class="tiny muted">Run an analysis to see its validation status.</p>'}
      </div>
      <div class="studio-section">
        <span class="studio-label">Records</span>
        <div class="row-between"><span class="small muted">Included</span><strong class="small">${r ? fmtInt(r.lineage.sampleSize) : '—'}</strong></div>
        <div class="row-between" style="margin-top:4px"><span class="small muted">Excluded</span><strong class="small">${r ? fmtInt(r.lineage.excluded) : '—'}</strong></div>
      </div>
      <div class="studio-section">
        ${evidence
    ? `<a class="btn btn-secondary btn-block btn-sm" href="#/evidence/${evidence.id}">${icon('shield', 14)} Open full proof trail</a>`
    : `<button class="btn btn-secondary btn-block btn-sm" id="proofDisabled" disabled>${icon('lock', 14)} Open full proof trail</button>
           <p class="tiny muted" style="margin-top:6px">Generate an evidence artifact to unlock the full proof trail.</p>`}
      </div>
    </section>
    ${r?.caveats?.length ? `<div class="callout warn">${icon('info', 15)}<div><strong>Caveats.</strong><ul style="margin:4px 0 0;padding-left:16px">${r.caveats.map((c) => `<li>${esc(c)}</li>`).join('')}</ul></div></div>` : ''}
  </aside>`;
}

function renderResultChart(result, ds) {
  if (!result.chart) return;
  renderChart('studioChart', { ...result.chart, showLegend: result.chart.showLegend !== false });
}

function nextEvidenceId() {
  const nums = state.data.evidence
    .map((e) => /^EV-2025-(\d+)$/.exec(e.id))
    .filter(Boolean)
    .map((m) => Number(m[1]));
  return `EV-2025-${String((nums.length ? Math.max(...nums) : 0) + 1).padStart(3, '0')}`;
}

function claimFromResult(ds, result) {
  const firstSentence = result.narrative.split(/(?<=\.)\s/)[0] || result.title;
  return `${result.title.replace(/·/g, '—')}. ${firstSentence}`.trim();
}

function bind(root, ds) {
  const rerender = () => render(root, { id: null, query: new URLSearchParams(`dataset=${ds.id}`) });

  document.getElementById('stDataset')?.addEventListener('change', (e) => {
    studio.datasetId = e.target.value;
    studio.result = null;
    studio.evidenceId = null;
    location.hash = `#/studio?dataset=${e.target.value}`;
  });
  document.getElementById('stType')?.addEventListener('change', (e) => {
    studio.type = e.target.value;
    if (studio.type === 'trend' || studio.type === 'forecast') studio.dimension = 'date';
    if (studio.type === 'correlation' && studio.metric === 'revenue') studio.metric = 'units';
    studio.result = null;
    rerender();
  });
  document.getElementById('stAgg')?.addEventListener('change', (e) => { studio.aggregation = e.target.value; });
  document.getElementById('stConf')?.addEventListener('change', (e) => { studio.settings.confidenceLevel = Number(e.target.value); });
  document.getElementById('stSample')?.addEventListener('change', (e) => { studio.settings.minSample = Number(e.target.value) || 30; });
  document.getElementById('stQuestion')?.addEventListener('input', (e) => { studio.question = e.target.value; });

  root.querySelectorAll('[data-field]').forEach((btn) => btn.addEventListener('click', () => {
    const key = btn.dataset.field;
    const type = btn.dataset.ftype;
    if (type === 'numeric') { studio.metric = key; if (studio.type === 'segmentation') studio.aggregation = 'avg'; }
    else studio.dimension = key;
    studio.result = null;
    rerender();
  }));

  document.getElementById('addFilter')?.addEventListener('click', () => openFilterModal(ds, rerender));
  root.querySelectorAll('[data-rm-filter]').forEach((btn) => btn.addEventListener('click', () => {
    studio.filters.splice(Number(btn.dataset.rmFilter), 1);
    studio.result = null;
    rerender();
  }));
  document.getElementById('addTransform')?.addEventListener('change', (e) => {
    if (!e.target.value) return;
    studio.transformations.push({ type: e.target.value });
    rerender();
  });
  root.querySelectorAll('[data-rm-transform]').forEach((btn) => btn.addEventListener('click', () => {
    studio.transformations.splice(Number(btn.dataset.rmTransform), 1);
    rerender();
  }));

  root.querySelectorAll('[data-preset]').forEach((btn) => btn.addEventListener('click', () => {
    const preset = PRESETS[Number(btn.dataset.preset)];
    Object.assign(studio, preset.config);
    studio.evidenceId = null;
    studio.runId = null;
    studio.result = null;
    studio.running = true;
    render(root, { id: null, query: new URLSearchParams(`dataset=${ds.id}`) });
    setTimeout(() => {
      studio.running = false;
      studio.result = analyze(runConfig(ds));
      render(root, { id: null, query: new URLSearchParams(`dataset=${ds.id}`) });
      toast('Analysis complete', 'success', `${fmtInt(studio.result.lineage.sampleSize)} rows · validation ${studio.result.validation.score}/100`);
    }, 1000);
  }));

  document.getElementById('runAnalysis')?.addEventListener('click', () => {
    studio.running = true;
    studio.evidenceId = null;
    studio.runId = null;
    render(root, { id: null, query: new URLSearchParams(`dataset=${ds.id}`) });
    setTimeout(() => {
      studio.running = false;
      studio.result = analyze(runConfig(ds));
      render(root, { id: null, query: new URLSearchParams(`dataset=${ds.id}`) });
      if (studio.result.empty) toast('No mapped calculation', 'warning', 'Rephrase the question or pick an analysis type.');
      else toast('Analysis complete', 'success', `${fmtInt(studio.result.lineage.sampleSize)} rows · validation ${studio.result.validation.score}/100`);
    }, 1000);
  });

  document.getElementById('saveAnalysis')?.addEventListener('click', () => {
    if (!studio.result || studio.result.empty) return;
    const id = `RUN-${String(state.data.analyses.length + 1).padStart(3, '0')}`;
    const run = {
      id, datasetId: ds.id, datasetVersionId: ds.currentVersionId, versionNumber: versionOf(ds).version,
      title: studio.result.title, type: studio.type, metric: studio.metric, dimension: studio.dimension,
      aggregation: studio.aggregation, filters: studio.filters, transformations: studio.transformations,
      settings: studio.settings, status: 'Completed', createdBy: currentUser().name, createdAt: nowISO(),
      selectedFields: selectedFieldsText(), statisticalMethods: studio.type === 'correlation' ? 'Pearson correlation with a two-sided significance test' : 'Deterministic aggregation',
      outputSummary: studio.result.kpis.map((k) => `${k.label}: ${k.value}`).join(' · '),
      validationResult: studio.result.validation.status === 'Draft' ? 'Passed' : studio.result.validation.status,
      evidenceId: studio.evidenceId,
    };
    state.data.analyses.push(run);
    studio.runId = run.id;
    save();
    logActivity('analysis', 'Analysis saved', `${run.title} · v${versionOf(ds).version}`);
    toast('Analysis saved', 'success', 'It now appears in the dataset analysis history.');
    render(root, { id: null, query: new URLSearchParams(`dataset=${ds.id}`) });
  });

  document.getElementById('genEvidence')?.addEventListener('click', (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Generating…';
    setTimeout(() => {
      const r = studio.result;
      const spec = r.evidenceSpec;
      if (!spec) { toast('No mapped calculation', 'warning'); btn.disabled = false; return; }
      try {
      const ev = buildEvidence(ds, versionOf(ds), {
        id: nextEvidenceId(), calcKind: spec.calcKind, params: spec.params, filters: studio.filters,
        required: spec.required, claim: claimFromResult(ds, r), type: studio.type === 'custom' ? 'Analysis' : 'Analysis',
        sampleThreshold: studio.settings.minSample,
      });
      ev.artifacts = [{ type: 'Analysis run', label: r.title, ref: studio.runId || 'unsaved' }];
      state.data.evidence.unshift(ev);
      studio.evidenceId = ev.id;
      if (studio.runId) {
        const run = state.data.analyses.find((a) => a.id === studio.runId);
        if (run) { run.evidenceId = ev.id; run.validationResult = ev.status; }
      }
      save();
      logActivity('validation', 'Evidence artifact generated', `${ev.id} · ${ev.claim}`);
      toast('Evidence artifact created', ev.status === 'Verified' ? 'success' : 'warning', `${ev.id} · score ${ev.score}/100 · ${ev.status}`);
      render(root, { id: null, query: new URLSearchParams(`dataset=${ds.id}`) });
      } catch (err) {
        btn.disabled = false;
        btn.innerHTML = 'Generate evidence artifact';
        toast('Evidence could not be generated', 'error', err.message);
      }
    }, 700);
  });

  document.getElementById('createViz')?.addEventListener('click', () => {
    if (!studio.result) return;
    openVizModal({
      prefill: {
        datasetId: ds.id,
        title: studio.result.title,
        description: studio.result.narrative.slice(0, 180),
        type: studio.type === 'trend' ? 'line' : studio.type === 'correlation' ? 'scatter' : 'bar',
        dimension: studio.dimension,
        metric: studio.metric,
        aggregation: studio.aggregation,
        filters: studio.filters,
      },
      evidenceId: studio.evidenceId,
    });
  });

  document.getElementById('openProof')?.addEventListener('click', () => {
    if (studio.evidenceId) location.hash = `#/evidence/${studio.evidenceId}`;
    else toast('No evidence yet', 'info', 'Use “Generate evidence artifact” first.');
  });
}

function openFilterModal(ds, onSave) {
  const group = (type) => ds.columns.filter((c) => c.type === type);
  const allFields = [...group('categorical'), ...group('numeric'), ...group('date')];
  const { close } = openModal({
    title: 'Add filter',
    subtitle: 'Filters are applied before any calculation and recorded in the lineage.',
    size: 'sm',
    body: `<div class="stack-sm">
      <div class="field"><label for="fltField">Field</label>
        <select class="select" id="fltField">${allFields.map((c) => `<option value="${esc(c.key)}">${esc(c.label)} (${c.type})</option>`).join('')}</select>
      </div>
      <div class="field"><label for="fltOp">Operator</label>
        <select class="select" id="fltOp">
          <option value="eq">equals</option><option value="neq">not equals</option>
          <option value="gt">greater than</option><option value="gte">greater than or equal</option>
          <option value="lt">less than</option><option value="lte">less than or equal</option>
          <option value="between">between</option><option value="contains">contains</option>
        </select>
      </div>
      <div class="form-grid">
        <div class="field"><label for="fltValue">Value</label><input class="input" id="fltValue" placeholder="e.g. North" /></div>
        <div class="field"><label for="fltValue2">Value 2 (between)</label><input class="input" id="fltValue2" placeholder="e.g. 2025-10-01" /></div>
      </div>
    </div>`,
    footer: `<button class="btn btn-ghost js-cancel">Cancel</button><button class="btn btn-primary js-add">Apply filter</button>`,
    onMount: (root) => {
      root.querySelector('.js-cancel').addEventListener('click', close);
      root.querySelector('.js-add').addEventListener('click', () => {
        const field = root.querySelector('#fltField').value;
        const op = root.querySelector('#fltOp').value;
        const value = root.querySelector('#fltValue').value.trim();
        const value2 = root.querySelector('#fltValue2').value.trim();
        if (!value) { toast('Value required', 'warning'); return; }
        studio.filters.push({ field, op, value, ...(op === 'between' ? { value2 } : {}) });
        studio.result = null;
        close();
        onSave();
      });
    },
  });
}
