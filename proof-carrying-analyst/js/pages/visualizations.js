/* Visualization gallery, chart builder and drill-down. */
import {
  state, datasetById, versionOf, save, logActivity, currentUser, activeInsights,
} from '../store.js';
import { pageHeader, statusBadge, icon, emptyState, openModal, toast, confirmDialog } from '../ui.js';
import {
  esc, fmtInt, fmtDate, fmtDateTime, timeAgo, uid, nowISO, fmtCompact, fmtPct, downloadBlob, toCsv, slugify, fmtMoney,
} from '../util.js';
import { renderChart, downloadChartPng, heatmapHtml } from '../charts.js';
import { buildVizData, drilldownFilters, VIZ_TYPES, AGGREGATIONS } from '../analysis.js';
import { buildEvidence, CALCS } from '../calc.js';
import { openEvidencePanel } from '../evidencePanel.js';
import { addRefToReport } from '../actions.js';

const galleryState = { q: '', from: '', to: '', type: 'all' };

function nextEvidenceId() {
  const nums = state.data.evidence.map((e) => /^EV-2025-(\d+)$/.exec(e.id)).filter(Boolean).map((m) => Number(m[1]));
  return `EV-2025-${String((nums.length ? Math.max(...nums) : 0) + 1).padStart(3, '0')}`;
}

function nextVizId() {
  const nums = state.data.visualizations.map((v) => Number(v.id.replace('VIZ-', ''))).filter((n) => Number.isFinite(n));
  return `VIZ-${String((nums.length ? Math.max(...nums) : 0) + 1).padStart(3, '0')}`;
}

function galleryFilters(viz) {
  const filters = [...(viz.filters || [])];
  const ds = datasetById(viz.datasetId);
  if (!ds) return filters;
  const dateCol = ds.columns.find((c) => c.type === 'date');
  if (dateCol && (galleryState.from || galleryState.to)) {
    filters.push({
      field: dateCol.key, op: 'between',
      value: galleryState.from || '2000-01-01', value2: galleryState.to || '2999-12-31',
    });
  }
  return filters;
}

function dataFor(viz) {
  const ds = datasetById(viz.datasetId);
  if (!ds) return null;
  try {
    return { ds, data: buildVizData({ ...viz, filters: galleryFilters(viz) }, ds), filtered: !!(galleryState.from || galleryState.to) };
  } catch (err) {
    console.error(err);
    return { ds, data: null, error: err.message };
  }
}

export function render(root, params) {
  const datasets = state.data.datasets.filter((d) => !d.archived);
  const activeDataset = datasetById(state.data.workspace.activeDatasetId) || datasets[0];
  const highlight = params.query.get('chart');
  const charts = state.data.visualizations.filter((v) => {
    if (galleryState.q && !`${v.title} ${v.description}`.toLowerCase().includes(galleryState.q.toLowerCase())) return false;
    if (galleryState.type !== 'all' && v.type !== galleryState.type) return false;
    return true;
  });

  root.innerHTML = `<div class="stack">
    ${pageHeader({
    eyebrow: 'Visualizations',
    title: 'Chart gallery',
    description: 'Every chart is bound to a dataset version, an applied filter set and an evidence artifact. A chart inherits the validation status of its evidence.',
    actions: `<button class="btn btn-secondary" id="vizExportAll">${icon('download', 15)} Export gallery CSV</button>
        <button class="btn btn-primary" id="vizCreate">${icon('plus', 15)} Create Visualization</button>`,
  })}

    <div class="card">
      <div class="table-toolbar">
        <div class="search-field grow">${icon('search', 14)}<input class="input" id="vizSearch" type="search" placeholder="Search charts" value="${esc(galleryState.q)}" aria-label="Search charts" /></div>
        <select class="select" id="vizType" aria-label="Filter by chart type">
          <option value="all">All chart types</option>
          ${VIZ_TYPES.map((t) => `<option value="${t.value}" ${galleryState.type === t.value ? 'selected' : ''}>${esc(t.label)}</option>`).join('')}
        </select>
        <div class="row" style="gap:6px">
          <label class="small muted" for="vizFrom">From</label>
          <input class="input" id="vizFrom" type="date" value="${esc(galleryState.from)}" style="width:140px" aria-label="Filter charts from date" />
          <label class="small muted" for="vizTo">To</label>
          <input class="input" id="vizTo" type="date" value="${esc(galleryState.to)}" style="width:140px" aria-label="Filter charts to date" />
          ${galleryState.from || galleryState.to ? '<button class="btn btn-ghost btn-sm" id="vizClearRange">Clear</button>' : ''}
        </div>
        <span class="small muted">${charts.length} charts</span>
      </div>
      <div class="card-foot" style="border-top:none;padding:10px 16px;background:var(--surface-2)">
        ${icon('info', 14)}<span class="tiny muted" style="flex:1">Date range applies a temporary view filter to every chart. Saved evidence reflects each chart’s stored definition; open the proof to see the exact selection used.</span>
      </div>
    </div>

    ${charts.length === 0
    ? `<div class="card">${emptyState({ iconName: 'chart', title: 'No charts match these filters', message: 'Clear the search or date range, or create a new visualization.', action: '<button class="btn btn-secondary" id="vizClearAll">Clear filters</button>' })}</div>`
    : `<div class="viz-grid">
        ${charts.map((v) => vizCard(v, highlight === v.id)).join('')}
      </div>`}
  </div>`;

  charts.forEach((viz) => {
    const { ds, data, error, filtered } = dataFor(viz) || {};
    if (!data) {
      const el = document.getElementById(`vizChartFallback_${viz.id}`);
      if (el && error) el.textContent = error;
      return;
    }
    if (data.kind === 'heatmap') {
      const el = document.getElementById(`vizHeat_${viz.id}`);
      if (el) el.innerHTML = heatmapHtml(data.matrix, data.fields, { labels: { revenue: 'Revenue', profit: 'Profit', units: 'Units', discount: 'Discount', tickets: 'Tickets', csat: 'CSAT' } });
      return;
    }
    renderChart(`vizChart_${viz.id}`, {
      ...data.spec,
      onPointClick: (index) => openDrilldown(viz, ds, index, data),
    });
    if (filtered) {
      // nothing extra: badge already shown in the card header
    }
  });

  if (highlight) {
    const el = document.getElementById(`vizCard_${highlight}`);
    if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  document.getElementById('vizCreate')?.addEventListener('click', () => openVizModal({ datasetId: activeDataset.id }));
  document.getElementById('vizSearch')?.addEventListener('input', (e) => { galleryState.q = e.target.value; render(root, { id: null, query: new URLSearchParams() }); document.getElementById('vizSearch').focus(); });
  document.getElementById('vizType')?.addEventListener('change', (e) => { galleryState.type = e.target.value; render(root, { id: null, query: new URLSearchParams() }); });
  document.getElementById('vizFrom')?.addEventListener('change', (e) => { galleryState.from = e.target.value; render(root, { id: null, query: new URLSearchParams() }); });
  document.getElementById('vizTo')?.addEventListener('change', (e) => { galleryState.to = e.target.value; render(root, { id: null, query: new URLSearchParams() }); });
  document.getElementById('vizClearRange')?.addEventListener('click', () => { galleryState.from = ''; galleryState.to = ''; render(root, { id: null, query: new URLSearchParams() }); });
  document.getElementById('vizClearAll')?.addEventListener('click', () => { galleryState.q = ''; galleryState.type = 'all'; galleryState.from = ''; galleryState.to = ''; render(root, { id: null, query: new URLSearchParams() }); });
  document.getElementById('vizExportAll')?.addEventListener('click', () => {
    const rows = [['Chart', 'Type', 'Dataset', 'Version', 'Status', 'Evidence', 'Filters']];
    charts.forEach((v) => rows.push([v.title, v.type, datasetById(v.datasetId)?.name || '', `v${v.versionNumber}`, v.validationStatus, v.evidenceId, (v.filters || []).length ? `${v.filters.length} filters` : 'none']));
    downloadBlob(toCsv(rows), 'visualizations-gallery.csv', 'text/csv;charset=utf-8');
    toast('Gallery exported', 'success', 'Chart inventory downloaded as CSV.');
  });

  root.querySelectorAll('[data-viz-act]').forEach((btn) => btn.addEventListener('click', () => {
    const viz = state.data.visualizations.find((v) => v.id === btn.dataset.id);
    if (!viz) return;
    const act = btn.dataset.vizAct;
    if (act === 'edit') openVizModal({ viz });
    if (act === 'duplicate') duplicateViz(viz);
    if (act === 'png') {
      const ok = downloadChartPng(`vizChart_${viz.id}`, `${slugify(viz.title)}.png`);
      toast(ok ? 'Chart downloaded' : 'PNG unavailable', ok ? 'success' : 'warning', ok ? `${slugify(viz.title)}.png` : 'This chart type renders as HTML; use CSV export instead.');
    }
    if (act === 'csv') {
      const built = dataFor(viz);
      if (!built?.data) return;
      const rows = [built.data.table.columns, ...built.data.table.rows];
      downloadBlob(toCsv(rows), `${slugify(viz.title)}.csv`, 'text/csv;charset=utf-8');
      toast('Chart data downloaded', 'success', 'CSV extract written.');
    }
    if (act === 'evidence') openEvidencePanel(viz.evidenceId);
    if (act === 'report') addRefToReport({ type: 'chart', id: viz.id, label: viz.title });
  }));
}

function vizCard(viz, highlighted) {
  const ds = datasetById(viz.datasetId);
  const built = dataFor(viz);
  const filtered = built?.filtered;
  return `<article class="viz-card" id="vizCard_${esc(viz.id)}">
    <div class="viz-card-head">
      <div class="grow"><h3>${esc(viz.title)}</h3><p>${esc(viz.description)}</p></div>
      ${statusBadge(viz.validationStatus)}
    </div>
    <div class="viz-meta">
      <span class="badge badge-slate">v${viz.versionNumber}</span>
      <span class="badge badge-blue">${esc(ds?.name || 'Dataset')}</span>
      ${(viz.filters || []).length ? `<span class="badge badge-violet">${icon('filter', 10)} ${viz.filters.length} filter${viz.filters.length === 1 ? '' : 's'}</span>` : '<span class="chip chip-quiet">No filters</span>'}
      ${filtered ? '<span class="badge badge-amber">Date range view</span>' : ''}
      <span>${timeAgo(viz.updatedAt)}</span>
    </div>
    <div class="${viz.type === 'heatmap' ? '' : 'chart-box'}" id="vizChartWrap_${esc(viz.id)}">
      ${viz.type === 'heatmap'
    ? `<div id="vizHeat_${esc(viz.id)}"></div>`
    : `<canvas id="vizChart_${esc(viz.id)}" role="img" aria-label="${esc(viz.title)}"></canvas><div id="vizChartFallback_${esc(viz.id)}"></div>`}
    </div>
    <div class="viz-foot">
      <button class="btn btn-ghost btn-xs" data-viz-act="evidence" data-id="${esc(viz.id)}">${icon('shield', 13)} View Evidence</button>
      <span class="spacer"></span>
      <button class="icon-btn" title="Edit chart" data-viz-act="edit" data-id="${esc(viz.id)}" aria-label="Edit ${esc(viz.title)}">${icon('edit', 15)}</button>
      <button class="icon-btn" title="Duplicate chart" data-viz-act="duplicate" data-id="${esc(viz.id)}" aria-label="Duplicate ${esc(viz.title)}">${icon('duplicate', 15)}</button>
      <button class="icon-btn" title="Download PNG" data-viz-act="png" data-id="${esc(viz.id)}" aria-label="Download PNG">${icon('download', 15)}</button>
      <button class="icon-btn" title="Download CSV" data-viz-act="csv" data-id="${esc(viz.id)}" aria-label="Download CSV">${icon('table', 15)}</button>
      <button class="icon-btn" title="Add to report" data-viz-act="report" data-id="${esc(viz.id)}" aria-label="Add to report">${icon('plus', 15)}</button>
    </div>
  </article>`;
}

function openDrilldown(viz, ds, index, built) {
  const data = built || dataFor(viz)?.data;
  if (!data || !data.spec) return;
  const filters = drilldownFilters(viz, index, data);
  const label = data.spec.labels[index];
  if (!filters.length) {
    toast('Drill-down unavailable', 'info', 'This chart type does not map a point to a single dimension value.');
    return;
  }
  const rows = ds.rows.filter((r) => filters.every((f) => {
    const ci = ds.columns.findIndex((c) => c.key === f.field);
    if (ci < 0) return true;
    const v = r[ci];
    if (f.op === 'between') return String(v) >= f.value && String(v) <= f.value2;
    if (f.op === 'eq') return String(v) === String(f.value);
    return true;
  }));
  const cols = ['txn_id', 'date', 'region', 'category', 'channel', 'revenue', 'profit'];
  const idxs = cols.map((c) => ds.columns.findIndex((x) => x.key === c)).filter((i) => i >= 0);
  const header = idxs.map((i) => ds.columns[i].label);
  openModal({
    title: `Drill-down · ${label ?? 'selected point'}`,
    subtitle: `${fmtInt(rows.length)} rows match · ${data.table.columns[0]} = ${label}`,
    size: 'lg',
    body: `<div class="table-wrap" style="max-height:420px;overflow:auto"><table class="data">
      <thead><tr>${header.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead>
      <tbody>${rows.slice(0, 100).map((r) => `<tr>${idxs.map((i) => `<td>${esc(ds.columns[i].type === 'numeric' ? fmtMoney(Number(r[i])) : String(r[i] ?? '—'))}</td>`).join('')}</tr>`).join('')}</tbody>
    </table></div>
    <p class="tiny muted" style="margin-top:8px">Showing the first ${Math.min(rows.length, 100)} of ${fmtInt(rows.length)} matching rows.</p>`,
    footer: `<button class="btn btn-secondary js-close">Close</button><a class="btn btn-primary" href="#/datasets/${ds.id}?tab=preview">Open full dataset</a>`,
  });
}

function duplicateViz(viz) {
  const ds = datasetById(viz.datasetId);
  const copy = JSON.parse(JSON.stringify(viz));
  copy.id = nextVizId();
  copy.title = `${viz.title} (copy)`;
  copy.updatedAt = nowISO();
  copy.createdBy = currentUser().name;
  const built = dataFor(viz)?.data;
  const ev = createVizEvidence({ ...copy, datasetId: viz.datasetId, versionNumber: versionOf(ds).version }, ds, built);
  copy.evidenceId = ev.id;
  copy.validationStatus = ev.status;
  state.data.visualizations.unshift(copy);
  save();
  logActivity('analysis', 'Visualization duplicated', `${viz.title} → ${copy.title}`);
  toast('Chart duplicated', 'success', 'A new evidence artifact was created for the copy.');
  window.dispatchEvent(new Event('pcda:refresh'));
}

function createVizEvidence(viz, ds, built) {
  const data = built || dataFor(viz)?.data;
  let claim = `${viz.title}.`;
  let calcKind = 'custom_aggregate';
  let params = { dimension: viz.dimension, metric: viz.metric, aggregation: viz.aggregation };
  let required = [viz.dimension, viz.metric].filter(Boolean);
  if (viz.type === 'heatmap') {
    calcKind = 'corr_matrix';
    params = {};
    required = ['revenue', 'profit', 'units', 'discount', 'tickets', 'csat'];
    claim = `${viz.title}. Pairwise Pearson correlations across six numeric fields, computed on the current version.`;
  } else if (viz.type === 'scatter') {
    if (viz.secondary === 'churn') {
      calcKind = 'corr_tickets_churn';
      params = {};
      required = ['tickets', 'churn'];
      claim = `${viz.title}. Support-ticket volume against the recorded churn-risk band, with a Pearson correlation.`;
    } else {
      calcKind = 'custom_correlation';
      params = { xField: viz.dimension, yField: viz.secondary };
      required = [viz.dimension, viz.secondary];
      claim = `${viz.title}. Pearson correlation between ${viz.dimension} and ${viz.secondary} on the current version.`;
    }
  } else if (viz.type === 'histogram' && viz.metric === 'revenue') {
    calcKind = 'series_revenue_hist';
    params = {};
    required = ['revenue'];
    claim = `${viz.title}. Distribution of transaction revenue on the current version.`;
  } else if (data && data.table) {
    const rows = data.table.rows;
    const first = rows[0];
    claim = `${viz.title}. ${fmtInt(data.rows)} rows aggregated; ${first ? `${first[0]} ${first[1]}` : 'no groups'}.`;
  }
  if (!CALCS[calcKind]) calcKind = 'custom_aggregate';
  const ev = buildEvidence(ds, versionOf(ds), {
    id: nextEvidenceId(), calcKind, params,
    filters: viz.filters || [], required, claim, type: 'Visualization',
  });
  ev.artifacts = [{ type: 'Chart', label: viz.title, ref: viz.id }];
  state.data.evidence.unshift(ev);
  return ev;
}

/* ---------------- chart builder ---------------- */

export function openVizModal({ viz = null, prefill = null, evidenceId = null } = {}) {
  const datasets = state.data.datasets.filter((d) => !d.archived);
  const baseDatasetId = viz?.datasetId || prefill?.datasetId || state.data.workspace.activeDatasetId || datasets[0].id;
  const draft = {
    datasetId: baseDatasetId,
    title: viz?.title || prefill?.title || 'Untitled visualization',
    description: viz?.description || prefill?.description || '',
    type: viz?.type || prefill?.type || 'bar',
    dimension: viz?.dimension || prefill?.dimension || 'region',
    metric: viz?.metric || prefill?.metric || 'revenue',
    aggregation: viz?.aggregation || prefill?.aggregation || 'sum',
    secondary: viz?.secondary || prefill?.secondary || '',
    secondaryMetric: viz?.secondaryMetric || prefill?.secondaryMetric || '',
    filters: (viz?.filters || prefill?.filters || []).slice(),
    limitFrom: '',
    limitTo: '',
  };

  const { close } = openModal({
    title: viz ? 'Edit visualization' : 'Create visualization',
    subtitle: 'The preview runs the same deterministic aggregation that will back the saved chart.',
    size: 'xl',
    body: `<div class="form-grid" style="grid-template-columns:1.05fr .95fr;gap:20px">
      <div class="stack-sm">
        <div class="field"><label for="vzTitle">Title<span class="req">*</span></label><input class="input" id="vzTitle" value="${esc(draft.title)}" /></div>
        <div class="field"><label for="vzDesc">Description</label><textarea class="input" id="vzDesc" rows="2">${esc(draft.description)}</textarea></div>
        <div class="form-grid">
          <div class="field"><label for="vzDataset">Dataset</label><select class="select" id="vzDataset">${datasets.map((d) => `<option value="${esc(d.id)}" ${d.id === draft.datasetId ? 'selected' : ''}>${esc(d.name)}</option>`).join('')}</select></div>
          <div class="field"><label for="vzType">Chart type</label><select class="select" id="vzType">${VIZ_TYPES.map((t) => `<option value="${t.value}" ${draft.type === t.value ? 'selected' : ''}>${esc(t.label)}</option>`).join('')}</select></div>
        </div>
        <div class="form-grid">
          <div class="field"><label for="vzDim">Dimension</label><select class="select" id="vzDim"></select></div>
          <div class="field"><label for="vzMetric">Metric</label><select class="select" id="vzMetric"></select></div>
        </div>
        <div class="form-grid">
          <div class="field"><label for="vzAgg">Aggregation</label><select class="select" id="vzAgg">${AGGREGATIONS.map((a) => `<option value="${a.value}" ${draft.aggregation === a.value ? 'selected' : ''}>${esc(a.label)}</option>`).join('')}</select></div>
          <div class="field" id="vzSecondaryWrap"><label for="vzSecondary">Series / secondary field</label><select class="select" id="vzSecondary"></select></div>
        </div>
        <div class="form-grid">
          <div class="field"><label for="vzFrom">Filter from (optional)</label><input class="input" id="vzFrom" type="date" value="${esc(draft.limitFrom)}" /></div>
          <div class="field"><label for="vzTo">Filter to (optional)</label><input class="input" id="vzTo" type="date" value="${esc(draft.limitTo)}" /></div>
        </div>
        <div id="vzFilterChips" class="row wrap" style="gap:4px"></div>
        <div class="callout">${icon('shield', 15)}<div>Saving creates a linked evidence artifact with the dataset fingerprint, aggregation SQL, row counts and validation checks.</div></div>
      </div>
      <div class="stack-sm">
        <div class="row-between"><strong style="font-size:12.5px">Live preview</strong><span class="badge badge-blue" id="vzPreviewBadge">—</span></div>
        <div class="card" style="border-radius:12px"><div class="card-body" style="padding:10px">
          <div class="chart-box" style="height:250px"><canvas id="vzPreview"></canvas></div>
          <div id="vzPreviewHeat"></div>
          <div id="vzPreviewTable" style="margin-top:8px"></div>
        </div></div>
        <p class="tiny muted" id="vzPreviewNote">Preview updates as you change fields.</p>
      </div>
    </div>`,
    footer: `<button class="btn btn-ghost js-close">Cancel</button><button class="btn btn-primary" id="vzSave">${icon('check', 15)} ${viz ? 'Save changes' : 'Save visualization'}</button>`,
    onMount: (root) => {
      const dsSelect = root.querySelector('#vzDataset');
      const typeSelect = root.querySelector('#vzType');
      const dimSelect = root.querySelector('#vzDim');
      const metricSelect = root.querySelector('#vzMetric');
      const aggSelect = root.querySelector('#vzAgg');
      const secondarySelect = root.querySelector('#vzSecondary');

      function currentDs() { return datasetById(dsSelect.value); }

      function fillFields() {
        const ds = currentDs();
        const catFields = ds.columns.filter((c) => c.type !== 'text');
        dimSelect.innerHTML = `${draft.type === 'heatmap' ? '<option value="">All numeric fields</option>' : ''}${catFields.map((c) => `<option value="${esc(c.key)}" ${draft.dimension === c.key ? 'selected' : ''}>${esc(c.label)} (${c.type})</option>`).join('')}`;
        metricSelect.innerHTML = ds.columns.filter((c) => c.type === 'numeric').map((c) => `<option value="${esc(c.key)}" ${draft.metric === c.key ? 'selected' : ''}>${esc(c.label)}</option>`).join('');
        const secondaryOptions = draft.type === 'stackedBar'
          ? ds.columns.filter((c) => c.type === 'categorical').map((c) => `<option value="${esc(c.key)}" ${draft.secondary === c.key ? 'selected' : ''}>${esc(c.label)}</option>`).join('')
          : draft.type === 'groupedBar'
            ? ds.columns.filter((c) => c.type === 'numeric').map((c) => `<option value="${esc(c.key)}" ${draft.secondaryMetric === c.key ? 'selected' : ''}>${esc(c.label)}</option>`).join('')
            : draft.type === 'scatter'
              ? ds.columns.filter((c) => c.type === 'numeric' || c.key === 'churn').map((c) => `<option value="${esc(c.key)}" ${draft.secondary === c.key ? 'selected' : ''}>${esc(c.label)}</option>`).join('')
              : '';
        secondarySelect.innerHTML = secondaryOptions || '<option value="">Not applicable</option>';
        root.querySelector('#vzSecondaryWrap').style.display = secondaryOptions ? '' : 'none';
        if (!secondaryOptions && secondarySelect.value) secondarySelect.value = '';
      }

      function readDraft() {
        draft.datasetId = dsSelect.value;
        draft.type = typeSelect.value;
        draft.title = root.querySelector('#vzTitle').value;
        draft.description = root.querySelector('#vzDesc').value;
        draft.dimension = dimSelect.value || null;
        draft.metric = metricSelect.value;
        draft.aggregation = aggSelect.value;
        draft.secondary = typeSelect.value === 'stackedBar' || typeSelect.value === 'scatter' ? secondarySelect.value : '';
        draft.secondaryMetric = typeSelect.value === 'groupedBar' ? secondarySelect.value : '';
        draft.limitFrom = root.querySelector('#vzFrom').value;
        draft.limitTo = root.querySelector('#vzTo').value;
        const ds = currentDs();
        const dateCol = ds.columns.find((c) => c.type === 'date');
        draft.filters = [];
        if (dateCol && (draft.limitFrom || draft.limitTo)) {
          draft.filters.push({ field: dateCol.key, op: 'between', value: draft.limitFrom || '2000-01-01', value2: draft.limitTo || '2999-12-31' });
        }
        root.querySelector('#vzFilterChips').innerHTML = draft.filters.length
          ? `<span class="badge badge-violet">${icon('filter', 10)} ${esc(draft.filters[0].field)} ${esc(draft.filters[0].value)} → ${esc(draft.filters[0].value2)}</span>`
          : '<span class="chip chip-quiet">No filters applied</span>';
      }

      function preview() {
        readDraft();
        const ds = currentDs();
        root.querySelector('#vzPreviewHeat').innerHTML = '';
        root.querySelector('#vzPreviewTable').innerHTML = '';
        root.querySelector('#vzPreview').parentElement.style.display = '';
        let data;
        try {
          data = buildVizData({ ...draft, filters: draft.filters }, ds);
        } catch (err) {
          root.querySelector('#vzPreviewNote').textContent = err.message;
          return;
        }
        if (data.kind === 'heatmap') {
          root.querySelector('#vzPreview').parentElement.style.display = 'none';
          root.querySelector('#vzPreviewHeat').innerHTML = heatmapHtml(data.matrix, data.fields, { labels: { revenue: 'Revenue', profit: 'Profit', units: 'Units', discount: 'Discount', tickets: 'Tickets', csat: 'CSAT' } });
        } else {
          renderChart('vzPreview', { ...data.spec, showLegend: true });
        }
        root.querySelector('#vzPreviewBadge').textContent = `${fmtInt(data.rows)} rows`;
        root.querySelector('#vzPreviewTable').innerHTML = `<div class="table-wrap" style="border:1px solid var(--line);border-radius:8px;max-height:150px;overflow:auto"><table class="data"><thead><tr>${data.table.columns.map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${data.table.rows.slice(0, 6).map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
        root.querySelector('#vzPreviewNote').textContent = 'Preview runs the deterministic aggregation. Save to create the linked evidence artifact.';
      }

      ['input', 'change'].forEach((ev) => root.querySelector('.modal-body').addEventListener(ev, (e) => {
        if (e.target.id === 'vzDataset') { draft.dimension = currentDs().columns.find((c) => c.type === 'categorical')?.key; draft.metric = currentDs().columns.find((c) => c.type === 'numeric')?.key || 'revenue'; fillFields(); }
        if (e.target.id === 'vzType') { draft.type = e.target.value; fillFields(); }
        preview();
      }));

      fillFields();
      preview();

      root.querySelector('#vzSave').addEventListener('click', () => {
        readDraft();
        if (!draft.title.trim()) { toast('Title required', 'warning'); return; }
        const ds = currentDs();
        const built = buildVizData({ ...draft, filters: draft.filters }, ds);
        const record = {
          id: viz ? viz.id : nextVizId(),
          title: draft.title.trim(),
          description: draft.description.trim() || 'Custom visualization.',
          type: draft.type,
          datasetId: ds.id,
          datasetVersionId: ds.currentVersionId,
          versionNumber: versionOf(ds).version,
          dimension: draft.dimension,
          metric: draft.metric,
          aggregation: draft.aggregation,
          secondary: draft.secondary || null,
          secondaryMetric: draft.secondaryMetric || null,
          filters: draft.filters,
          chartConfig: {},
          evidenceId: viz?.evidenceId || evidenceId || null,
          validationStatus: viz?.validationStatus || 'Needs Review',
          updatedAt: nowISO(),
          createdBy: currentUser().name,
        };
        const reuse = evidenceId && !viz ? state.data.evidence.find((e) => e.id === evidenceId) : null;
        if (reuse) {
          record.evidenceId = reuse.id;
          record.validationStatus = reuse.status;
          reuse.artifacts = [{ type: 'Chart', label: record.title, ref: record.id }];
        } else {
          const ev = createVizEvidence(record, ds, built);
          record.evidenceId = ev.id;
          record.validationStatus = ev.status;
        }
        if (viz) {
          const index = state.data.visualizations.findIndex((v) => v.id === viz.id);
          state.data.visualizations[index] = { ...state.data.visualizations[index], ...record, evidenceId: record.evidenceId };
          logActivity('analysis', 'Visualization updated', `${record.title} · linked evidence ${record.evidenceId}`);
          toast('Chart updated', 'success', `Linked evidence ${record.evidenceId} regenerated for the new definition.`);
        } else {
          state.data.visualizations.unshift(record);
          logActivity('analysis', 'Visualization created', `${record.title} · linked evidence ${record.evidenceId}`);
          toast('Visualization saved', 'success', `Linked evidence ${record.evidenceId} created.`);
        }
        save();
        close();
        if (location.hash.startsWith('#/visualizations')) window.dispatchEvent(new Event('pcda:refresh'));
        else location.hash = '#/visualizations';
      });
    },
  });
  return close;
}
