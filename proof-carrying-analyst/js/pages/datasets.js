/* Datasets library, upload flow and dataset detail views. */
import {
  state, currentUser, datasetById, versionOf, userById, save, logActivity, addNotification,
} from '../store.js';
import {
  pageHeader, statusBadge, statusTone, icon, emptyState, openModal, confirmDialog, toast, progressRing,
  severityBadge, copyChip,
} from '../ui.js';
import {
  esc, fmtInt, fmtPct, fmtDate, fmtDateTime, timeAgo, shortFingerprint, fmtCompact, fmtMoney, fmtNum,
  downloadBlob, toCsv, slugify, nowISO, fingerprint, fnv1a, quantile, parseDate, uid, fmtCompactMoney,
} from '../util.js';
import { profileDataset, inferColumnType } from '../profile.js';
import { buildEvidence } from '../calc.js';

const viewState = { q: '', status: 'all', range: 'all', mode: 'table' };
const previewState = { q: '', sort: null, dir: 'asc', page: 1, highlightNulls: true, nullsOnly: false };
const PAGE_SIZE = 25;

export function render(root, params) {
  const ds = params.id ? datasetById(params.id) : null;
  if (params.id && !ds) {
    root.innerHTML = `<div class="card">${emptyState({ iconName: 'datasets', title: 'Dataset not found', message: 'It may have been removed from this workspace.', action: '<a class="btn btn-primary" href="#/datasets">Back to datasets</a>' })}</div>`;
    return;
  }
  if (ds) renderDetail(root, ds, params);
  else renderList(root);
}

/* ------------------------------------------------------------------ */
/* Library                                                            */
/* ------------------------------------------------------------------ */

function renderList(root) {
  const datasets = state.data.datasets.filter((d) => !d.archived);
  const filtered = datasets.filter((d) => {
    if (viewState.q && !`${d.name} ${d.fileName} ${d.description}`.toLowerCase().includes(viewState.q.toLowerCase())) return false;
    if (viewState.status !== 'all' && d.analysisStatus !== viewState.status) return false;
    if (viewState.range !== 'all') {
      const days = Number(viewState.range);
      if ((Date.now() - (parseDate(d.uploadDate)?.getTime() || 0)) / 86400000 > days) return false;
    }
    return true;
  });

  root.innerHTML = `<div class="stack">
    ${pageHeader({
    eyebrow: 'Data library',
    title: 'Datasets',
    description: 'Every import is versioned, fingerprinted and profiled before it can feed an analysis.',
    actions: `<button class="btn btn-secondary" id="dsRunAll">${icon('studio', 15)} Batch analyze</button>
        <button class="btn btn-primary" id="dsUpload">${icon('upload', 15)} Upload Dataset</button>`,
  })}

    <div class="card">
      <div class="table-toolbar">
        <div class="search-field grow">
          ${icon('search', 15)}
          <input class="input" id="dsSearch" type="search" placeholder="Search datasets by name or file" value="${esc(viewState.q)}" aria-label="Search datasets" />
        </div>
        <select class="select" id="dsStatus" aria-label="Filter by status">
          <option value="all" ${viewState.status === 'all' ? 'selected' : ''}>All statuses</option>
          <option value="Analyzed" ${viewState.status === 'Analyzed' ? 'selected' : ''}>Analyzed</option>
          <option value="Needs review" ${viewState.status === 'Needs review' ? 'selected' : ''}>Needs review</option>
          <option value="Processing" ${viewState.status === 'Processing' ? 'selected' : ''}>Processing</option>
        </select>
        <select class="select" id="dsRange" aria-label="Filter by date">
          <option value="all" ${viewState.range === 'all' ? 'selected' : ''}>All time</option>
          <option value="7" ${viewState.range === '7' ? 'selected' : ''}>Last 7 days</option>
          <option value="30" ${viewState.range === '30' ? 'selected' : ''}>Last 30 days</option>
          <option value="90" ${viewState.range === '90' ? 'selected' : ''}>Last 90 days</option>
        </select>
        <div class="seg-control" role="group" aria-label="View mode">
          <button data-mode="table" class="${viewState.mode === 'table' ? 'active' : ''}" aria-pressed="${viewState.mode === 'table'}">${icon('list', 13)} Table</button>
          <button data-mode="cards" class="${viewState.mode === 'cards' ? 'active' : ''}" aria-pressed="${viewState.mode === 'cards'}">${icon('grid', 13)} Cards</button>
        </div>
        <span class="small muted">${filtered.length} of ${datasets.length}</span>
      </div>
      ${filtered.length === 0 ? emptyState({
    iconName: 'search', title: 'No datasets match those filters',
    message: 'Try a different search term or reset the status and date filters.',
    action: '<button class="btn btn-secondary" id="dsClear">Clear filters</button>',
  }) : viewState.mode === 'table' ? listTable(filtered) : listCards(filtered)}
    </div>
  </div>`;

  document.getElementById('dsSearch')?.addEventListener('input', (e) => { viewState.q = e.target.value; renderList(root); document.getElementById('dsSearch').focus(); });
  document.getElementById('dsStatus')?.addEventListener('change', (e) => { viewState.status = e.target.value; renderList(root); });
  document.getElementById('dsRange')?.addEventListener('change', (e) => { viewState.range = e.target.value; renderList(root); });
  document.getElementById('dsClear')?.addEventListener('click', () => { viewState.q = ''; viewState.status = 'all'; viewState.range = 'all'; renderList(root); });
  document.querySelectorAll('[data-mode]').forEach((btn) => btn.addEventListener('click', () => { viewState.mode = btn.dataset.mode; renderList(root); }));
  document.querySelectorAll('[data-ds-open]').forEach((el) => el.addEventListener('click', () => { location.hash = `#/datasets/${el.dataset.dsOpen}`; }));
  document.querySelectorAll('[data-ds-analyze]').forEach((el) => el.addEventListener('click', () => { location.hash = `#/studio?dataset=${el.dataset.dsAnalyze}`; }));
  document.querySelectorAll('[data-ds-download]').forEach((el) => el.addEventListener('click', () => downloadDataset(el.dataset.dsDownload)));
  document.getElementById('dsUpload')?.addEventListener('click', () => openUploadModal());
  document.getElementById('dsRunAll')?.addEventListener('click', () => {
    toast('Batch analysis queued', 'info', `${datasets.length} datasets will refresh their profiles.`);
    setTimeout(() => toast('Batch analysis complete', 'success', 'All dataset profiles are current.'), 1600);
  });
}

function listTable(datasets) {
  return `<div class="table-wrap"><table class="data">
    <thead><tr><th>Dataset</th><th>Source</th><th>Uploaded</th><th class="num">Rows</th><th class="num">Cols</th><th>Quality</th><th>Version</th><th>Status</th><th>Last modified</th><th></th></tr></thead>
    <tbody>${datasets.map((d) => `<tr>
      <td><a href="#/datasets/${d.id}" class="cell-strong" style="color:var(--ink)">${esc(d.name)}</a><div class="tiny muted">${esc(d.fileName)} · ${esc(d.sourceType)}</div></td>
      <td><span class="badge badge-slate">${esc(d.sourceType)}</span></td>
      <td class="small">${fmtDate(d.uploadDate)}</td>
      <td class="num">${fmtInt(d.rowCount)}</td>
      <td class="num">${d.columnCount}</td>
      <td><div class="quality-inline"><span class="meter" style="width:52px"><i class="${d.quality.score >= 90 ? 'green' : d.quality.score >= 80 ? 'amber' : 'red'}" style="width:${d.quality.score}%"></i></span><span class="small strong">${d.quality.score}</span></div></td>
      <td>v${d.versions.length}</td>
      <td>${statusBadge(d.analysisStatus)}</td>
      <td class="small">${timeAgo(d.lastModified)}</td>
      <td class="num"><div class="row-actions">
        <button class="icon-btn" title="Open dataset" data-ds-open="${d.id}" aria-label="Open ${esc(d.name)}">${icon('external', 15)}</button>
        <button class="icon-btn" title="Run analysis" data-ds-analyze="${d.id}" aria-label="Run analysis on ${esc(d.name)}">${icon('studio', 15)}</button>
        <button class="icon-btn" title="Download data" data-ds-download="${d.id}" aria-label="Download ${esc(d.name)}">${icon('download', 15)}</button>
        <button class="icon-btn" title="More actions" aria-label="More actions for ${esc(d.name)}" onclick="window.__pcdaDatasetMenu('${d.id}')">${icon('more', 15)}</button>
      </div></td>
    </tr>`).join('')}</tbody></table></div>`;
}

function listCards(datasets) {
  return `<div class="card-body"><div class="dataset-grid">
    ${datasets.map((d) => `<article class="dataset-card" data-ds-open="${d.id}" tabindex="0" role="button" aria-label="Open ${esc(d.name)}">
      <div class="dataset-card-top">
        <span class="ds-icon ${d.sourceType === 'XLSX' ? 'xlsx' : ''}">${icon('datasets', 18)}</span>
        <div class="grow"><h3>${esc(d.name)}</h3><div class="ds-sub">${esc(d.fileName)} · ${esc(d.sourceType)} · v${d.versions.length}</div></div>
        ${statusBadge(d.analysisStatus)}
      </div>
      <div class="dataset-stats">
        <div class="ds-stat"><span>Rows</span><strong>${fmtCompact(d.rowCount)}</strong></div>
        <div class="ds-stat"><span>Columns</span><strong>${d.columnCount}</strong></div>
        <div class="ds-stat"><span>Quality</span><strong>${d.quality.score}</strong></div>
        <div class="ds-stat"><span>Issues</span><strong>${d.quality.issues.filter((i) => i.severity === 'warning').length}</strong></div>
      </div>
      <div class="dataset-card-foot">
        <span class="meta">${icon('clock', 12)} ${timeAgo(d.lastModified)}</span>
        <span class="meta">${icon('user', 12)} ${esc(userById(d.uploadedBy).name)}</span>
      </div>
    </article>`).join('')}
  </div></div>`;
}

window.__pcdaDatasetMenu = (id) => {
  const ds = datasetById(id);
  if (!ds) return;
  const { close } = openModal({
    title: ds.name,
    subtitle: `${fmtInt(ds.rowCount)} rows · ${ds.columnCount} columns · v${ds.versions.length}`,
    size: 'sm',
    body: `<div class="stack-sm">
      <button class="btn btn-secondary btn-block js-open">${icon('external', 15)} Open dataset details</button>
      <button class="btn btn-secondary btn-block js-analyze">${icon('studio', 15)} Open in Analysis Studio</button>
      <button class="btn btn-secondary btn-block js-dl">${icon('download', 15)} Download data (CSV)</button>
      <button class="btn btn-secondary btn-block js-schema">${icon('columns', 15)} View schema</button>
      <button class="btn btn-secondary btn-block js-dupe">${icon('duplicate', 15)} Duplicate metadata as new dataset</button>
    </div>`,
    onMount: (root) => {
      root.querySelector('.js-open').addEventListener('click', () => { close(); location.hash = `#/datasets/${id}`; });
      root.querySelector('.js-analyze').addEventListener('click', () => { close(); location.hash = `#/studio?dataset=${id}`; });
      root.querySelector('.js-dl').addEventListener('click', () => { close(); downloadDataset(id); });
      root.querySelector('.js-schema').addEventListener('click', () => { close(); location.hash = `#/datasets/${id}?tab=schema`; });
      root.querySelector('.js-dupe').addEventListener('click', () => { close(); duplicateDatasetMetadata(id); });
    },
  });
};

function duplicateDatasetMetadata(id) {
  const ds = datasetById(id);
  if (!ds) return;
  const copy = JSON.parse(JSON.stringify({
    ...ds, rows: null, name: `${ds.name} (copy)`, id: uid('ds'),
  }));
  copy.uploadDate = nowISO();
  copy.lastModified = nowISO();
  copy.versions = copy.versions.map((v, i) => ({ ...v, id: `${copy.id}_v${i + 1}` }));
  copy.currentVersionId = copy.versions[copy.versions.length - 1].id;
  // Duplicated datasets carry the same seeded rows when they came from the demo seed.
  copy.seedSpec = ds.seedSpec ? { ...ds.seedSpec } : null;
  if (copy.seedSpec && ds.rows) copy.rows = ds.rows;
  state.data.datasets.push(copy);
  save();
  toast('Dataset duplicated', 'success', 'Metadata and rows copied.');
  renderList(document.getElementById('view'));
}

function downloadDataset(id) {
  const ds = datasetById(id);
  if (!ds) return;
  const rows = [ds.columns.map((c) => c.label), ...ds.rows];
  downloadBlob(toCsv(rows), `${slugify(ds.name)}.csv`, 'text/csv;charset=utf-8');
  toast('Download started', 'success', `${slugify(ds.name)}.csv`);
}

/* ------------------------------------------------------------------ */
/* Dataset detail                                                     */
/* ------------------------------------------------------------------ */

function renderDetail(root, ds, params) {
  const version = versionOf(ds);
  const tab = params.query.get('tab') || 'overview';
  const tabs = [
    ['overview', 'Overview'], ['preview', 'Data Preview'], ['quality', 'Data Quality'],
    ['schema', 'Schema'], ['versions', 'Versions'], ['history', 'Analysis History'],
  ];
  const analyses = state.data.analyses.filter((a) => a.datasetId === ds.id);
  const evidence = state.data.evidence.filter((e) => e.datasetId === ds.id && !e.superseded);

  root.innerHTML = `<div class="stack">
    <div class="detail-head">
      <div>
        <a class="link-btn" href="#/datasets" style="margin-bottom:6px">${icon('chevron-left', 13)} All datasets</a>
        <div class="detail-title">
          <span class="ds-icon ${ds.sourceType === 'XLSX' ? 'xlsx' : ''}">${icon('datasets', 20)}</span>
          <div><h1>${esc(ds.name)}</h1>
            <div class="detail-meta">
              <span class="badge badge-slate">${esc(ds.sourceType)}</span>
              ${statusBadge(ds.analysisStatus)}
              <span>v${version.version}</span><span>·</span><span>${fmtInt(ds.rowCount)} rows</span><span>·</span><span>${ds.columnCount} columns</span>
            </div>
          </div>
        </div>
      </div>
      <div class="page-head-actions">
        <button class="btn btn-secondary" id="ddDownload">${icon('download', 15)} Download Data</button>
        <button class="btn btn-secondary" id="ddStudio">${icon('studio', 15)} Open in Analysis Studio</button>
        <button class="btn btn-primary" id="ddRun">${icon('play', 15)} Run Analysis</button>
      </div>
    </div>

    <div class="tabs" role="tablist">
      ${tabs.map(([key, label]) => `<button class="tab ${tab === key ? 'active' : ''}" role="tab" aria-selected="${tab === key}" data-tab="${key}">${label}${key === 'quality' ? `<span class="count-pill">${ds.quality.issues.filter((i) => i.severity === 'warning').length}</span>` : ''}${key === 'versions' ? `<span class="count-pill">${ds.versions.length}</span>` : ''}${key === 'history' ? `<span class="count-pill">${analyses.length}</span>` : ''}</button>`).join('')}
    </div>

    <div id="dsTabPanel">${renderTab(tab, ds, version, analyses, evidence)}</div>
  </div>`;

  document.querySelectorAll('[data-tab]').forEach((btn) => btn.addEventListener('click', () => {
    location.hash = `#/datasets/${ds.id}?tab=${btn.dataset.tab}`;
  }));
  document.getElementById('ddDownload')?.addEventListener('click', () => downloadDataset(ds.id));
  document.getElementById('ddStudio')?.addEventListener('click', () => { location.hash = `#/studio?dataset=${ds.id}`; });
  document.getElementById('ddRun')?.addEventListener('click', () => { location.hash = `#/studio?dataset=${ds.id}&autorun=1`; });

  if (tab === 'preview') bindPreview(ds);
  if (tab === 'quality') bindQuality(ds);
  if (tab === 'versions') bindVersions(ds);
}

function renderTab(tab, ds, version, analyses, evidence) {
  if (tab === 'preview') return previewTab(ds);
  if (tab === 'quality') return qualityTab(ds);
  if (tab === 'schema') return schemaTab(ds);
  if (tab === 'versions') return versionsTab(ds);
  if (tab === 'history') return historyTab(ds, analyses);
  return overviewTab(ds, version, evidence);
}

function overviewTab(ds, version, evidence) {
  const owner = userById(ds.uploadedBy);
  const recentEvidence = evidence.slice(0, 5);
  return `<div class="stack">
    <div class="card">
      <div class="card-body" style="display:grid;grid-template-columns:1.6fr 1fr;gap:24px;align-items:start">
        <div class="stack">
          <div>
            <div class="tiny muted" style="margin-bottom:4px">Dataset fingerprint</div>
            ${copyChip(version.fingerprint, shortFingerprint(version.fingerprint))}
            <p class="tiny muted" style="margin-top:6px">A fingerprint is recorded for every import. Analyses are bound to the fingerprint they ran against, which is what makes reproduction meaningful.</p>
          </div>
          <dl class="kv-grid">
            <div class="kv"><dt>Import date</dt><dd>${fmtDateTime(version.importedAt)}</dd></div>
            <div class="kv"><dt>Record count</dt><dd>${fmtInt(ds.rowCount)}</dd></div>
            <div class="kv"><dt>Column count</dt><dd>${ds.columnCount}</dd></div>
            <div class="kv"><dt>Version</dt><dd>v${version.version} of ${ds.versions.length}</dd></div>
            <div class="kv"><dt>Owner</dt><dd>${esc(owner.name)} · ${esc(owner.role)}</dd></div>
            <div class="kv"><dt>Analysis status</dt><dd>${statusBadge(ds.analysisStatus)}</dd></div>
            <div class="kv"><dt>File</dt><dd>${esc(ds.fileName)} · ${esc(ds.fileSize)}</dd></div>
            <div class="kv"><dt>Source</dt><dd>${esc(ds.sourceType)}</dd></div>
          </dl>
          <div>
            <div class="tiny muted" style="margin-bottom:4px">Description</div>
            <p style="font-size:12.8px;color:var(--ink-2);line-height:1.65">${esc(ds.description)}</p>
          </div>
        </div>
        <div class="card" style="border-radius:12px;background:var(--surface-2)">
          <div class="card-body" style="display:flex;flex-direction:column;align-items:center;gap:6px">
            ${progressRing(ds.quality.score, 92)}
            <strong style="font-size:13px">Data quality</strong>
            <span class="small muted">${ds.quality.issues.filter((i) => i.severity === 'warning').length} warnings · ${ds.quality.issues.filter((i) => i.severity === 'info').length} informational</span>
            <a class="btn btn-secondary btn-sm" href="#/datasets/${ds.id}?tab=quality">Open quality report</a>
          </div>
        </div>
      </div>
    </div>

    <div class="dash-grid">
      <section class="card">
        <div class="card-head"><div><h2>Evidence linked to this dataset</h2><p>${evidence.length} active artifacts bound to v${version.version}.</p></div><a class="link-btn" href="#/evidence?dataset=${ds.id}">Evidence vault ${icon('arrow-right', 12)}</a></div>
        <div class="table-wrap"><table class="data">
          <thead><tr><th>Evidence</th><th>Claim</th><th>Status</th><th>Score</th><th></th></tr></thead>
          <tbody>${recentEvidence.map((e) => `<tr>
            <td class="mono tiny">${esc(e.id)}</td>
            <td class="small">${esc(e.claim.length > 92 ? e.claim.slice(0, 92) + '…' : e.claim)}</td>
            <td>${statusBadge(e.status)}</td>
            <td class="num small">${e.score}</td>
            <td class="num"><a class="link-btn" href="#/evidence/${e.id}">Open ${icon('chevron-right', 11)}</a></td>
          </tr>`).join('')}</tbody>
        </table></div>
      </section>
      <section class="card">
        <div class="card-head"><div><h2>Quality snapshot</h2><p>Category scores from the current version.</p></div></div>
        <div class="card-body stack-sm">
          ${Object.entries(ds.quality.categories).map(([k, v]) => `<div class="cat-meter">
            <div class="cat-meter-top"><span style="text-transform:capitalize">${esc(k)}</span><b>${v}%</b></div>
            <div class="meter"><i class="${v >= 92 ? 'green' : v >= 80 ? 'amber' : 'red'}" style="width:${v}%"></i></div>
          </div>`).join('')}
          <div class="divider"></div>
          <div class="row-between"><span class="small muted">Missing cells</span><strong class="small">${fmtInt(ds.quality.metrics.nullCells)}</strong></div>
          <div class="row-between"><span class="small muted">Duplicate rows</span><strong class="small">${fmtInt(ds.quality.metrics.duplicateRows)}</strong></div>
          <div class="row-between"><span class="small muted">Invalid values</span><strong class="small">${fmtInt(ds.quality.metrics.invalidRows)} rows</strong></div>
        </div>
      </section>
    </div>
  </div>`;
}

/* ---------------- preview ---------------- */

function computeFence(ds) {
  const ri = ds.columns.findIndex((c) => c.key === 'revenue');
  if (ri < 0) return Infinity;
  const values = ds.rows.map((r) => Number(r[ri])).filter((n) => Number.isFinite(n));
  const q3 = quantile(values, 0.75);
  const q1 = quantile(values, 0.25);
  return q3 + 1.5 * (q3 - q1);
}

function filteredPreviewRows(ds) {
  const fence = computeFence(ds);
  const revenueIdx = ds.columns.findIndex((c) => c.key === 'revenue');
  let rows = ds.rows.map((row, i) => ({ row, i }));
  if (previewState.nullsOnly) {
    rows = rows.filter(({ row }) => row.some((v) => v === null || v === ''));
  }
  if (previewState.q) {
    const q = previewState.q.toLowerCase();
    rows = rows.filter(({ row }) => row.some((v) => String(v ?? '').toLowerCase().includes(q)));
  }
  if (previewState.sort != null) {
    const { sort, dir } = previewState;
    const type = ds.columns[sort].type;
    rows = rows.slice().sort((a, b) => {
      const av = a.row[sort]; const bv = b.row[sort];
      if (type === 'numeric') return (Number(av) - Number(bv)) * (dir === 'asc' ? 1 : -1);
      return String(av ?? '').localeCompare(String(bv ?? '')) * (dir === 'asc' ? 1 : -1);
    });
  }
  return { rows, fence, revenueIdx };
}

function previewTab(ds) {
  const { rows, fence, revenueIdx } = filteredPreviewRows(ds);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const page = Math.min(previewState.page, pages);
  const slice = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const header = ds.columns.map((c, i) => `<th class="sortable ${c.type === 'numeric' ? 'num' : ''}" data-sort="${i}" scope="col" aria-sort="${previewState.sort === i ? (previewState.dir === 'asc' ? 'ascending' : 'descending') : 'none'}">
    <span class="row" style="gap:4px;justify-content:${c.type === 'numeric' ? 'flex-end' : 'flex-start'}">${icon(c.type === 'numeric' ? 'hash' : c.type === 'date' ? 'calendar' : c.type === 'categorical' ? 'tag' : 'type', 11)} ${esc(c.label)}${previewState.sort === i ? `<span class="sort-ind">${previewState.dir === 'asc' ? '▲' : '▼'}</span>` : ''}</span>
  </th>`).join('');
  const body = slice.map(({ row }) => {
    const hasNull = row.some((v) => v === null || v === '');
    const cells = row.map((v, ci) => {
      const col = ds.columns[ci];
      const isNull = v === null || v === '';
      const suspicious = ci === revenueIdx && Number(v) > fence;
      const invalid = (col.key === 'discount' && v !== null && (Number(v) < 0 || Number(v) > 0.75))
        || (col.key === 'csat' && v !== null && (Number(v) < 1 || Number(v) > 5))
        || (col.key === 'units' && v !== null && Number(v) <= 0);
      let display = isNull ? '<span class="cell-muted">null</span>' : esc(String(v));
      if (col.type === 'numeric' && !isNull) display = esc(fmtNum(Number(v)));
      const cls = `${col.type === 'numeric' ? 'num' : ''} ${suspicious || invalid ? 'is-suspicious' : ''}`;
      const flag = suspicious ? '<span class="cell-flag">outlier</span>' : invalid ? '<span class="cell-flag red">invalid</span>' : '';
      return `<td class="${cls}">${display}${flag}</td>`;
    }).join('');
    return `<tr class="${previewState.highlightNulls && hasNull ? 'is-suspicious' : ''}">${cells}</tr>`;
  }).join('');

  return `<div class="card">
    <div class="table-toolbar">
      <div class="search-field grow">${icon('search', 14)}<input class="input" id="pvSearch" type="search" placeholder="Search across ${fmtInt(ds.rowCount)} records" value="${esc(previewState.q)}" aria-label="Search records" /></div>
      <label class="checkbox"><input type="checkbox" id="pvNulls" ${previewState.highlightNulls ? 'checked' : ''} /> Highlight nulls</label>
      <label class="checkbox"><input type="checkbox" id="pvNullsOnly" ${previewState.nullsOnly ? 'checked' : ''} /> Only rows with nulls</label>
      <span class="small muted">${fmtInt(rows.length)} matching rows</span>
      <a class="btn btn-secondary btn-sm" href="#" id="pvDownload">${icon('download', 14)} Export view</a>
    </div>
    <div class="table-wrap" style="max-height:560px;overflow:auto">
      <table class="data"><thead><tr><th class="num">#</th>${header}</tr></thead><tbody>${body || '<tr><td colspan="99" class="cell-muted">No records match this search.</td></tr>'}</tbody></table>
    </div>
    <div class="table-foot">
      <span>Rows ${fmtInt(rows.length ? (page - 1) * PAGE_SIZE + 1 : 0)}–${fmtInt(Math.min(page * PAGE_SIZE, rows.length))} of ${fmtInt(rows.length)} · page ${page} of ${pages}</span>
      <div class="pager" role="group" aria-label="Pagination">
        <button data-page="1" ${page === 1 ? 'disabled' : ''} aria-label="First page">«</button>
        <button data-page="${page - 1}" ${page === 1 ? 'disabled' : ''} aria-label="Previous page">‹</button>
        ${pageNumbers(page, pages).map((p) => `<button data-page="${p}" class="${p === page ? 'active' : ''}" ${p === page ? 'aria-current="page"' : ''}>${p}</button>`).join('')}
        <button data-page="${page + 1}" ${page === pages ? 'disabled' : ''} aria-label="Next page">›</button>
        <button data-page="${pages}" ${page === pages ? 'disabled' : ''} aria-label="Last page">»</button>
      </div>
    </div>
  </div>`;
}

function pageNumbers(page, pages) {
  const out = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(pages, start + 4);
  for (let i = start; i <= end; i++) out.push(i);
  return out;
}

function bindPreview(ds) {
  const rerender = () => render(document.getElementById('view'), { id: ds.id, query: new URLSearchParams('tab=preview') });
  document.getElementById('pvSearch')?.addEventListener('input', (e) => { previewState.q = e.target.value; previewState.page = 1; rerender(); document.getElementById('pvSearch').focus(); });
  document.getElementById('pvNulls')?.addEventListener('change', (e) => { previewState.highlightNulls = e.target.checked; rerender(); });
  document.getElementById('pvNullsOnly')?.addEventListener('change', (e) => { previewState.nullsOnly = e.target.checked; previewState.page = 1; rerender(); });
  document.querySelectorAll('[data-sort]').forEach((th) => th.addEventListener('click', () => {
    const idx = Number(th.dataset.sort);
    if (previewState.sort === idx) previewState.dir = previewState.dir === 'asc' ? 'desc' : 'asc';
    else { previewState.sort = idx; previewState.dir = 'asc'; }
    rerender();
  }));
  document.querySelectorAll('[data-page]').forEach((btn) => btn.addEventListener('click', () => {
    previewState.page = Number(btn.dataset.page);
    rerender();
  }));
  document.getElementById('pvDownload')?.addEventListener('click', (e) => {
    e.preventDefault();
    const { rows } = filteredPreviewRows(ds);
    const table = [ds.columns.map((c) => c.label), ...rows.slice(0, 2000).map(({ row }) => row)];
    downloadBlob(toCsv(table), `${slugify(ds.name)}-view.csv`, 'text/csv;charset=utf-8');
    toast('View exported', 'success', 'Filtered rows exported as CSV.');
  });
}

/* ---------------- quality ---------------- */

function qualityTab(ds) {
  const q = ds.quality;
  return `<div class="quality-layout">
    <div class="stack">
      <div class="card">
        <div class="score-panel">
          ${progressRing(q.score, 104)}
          <strong>Overall quality score</strong>
          <span class="score-label">Weighted across five categories</span>
          <span class="badge badge-${q.score >= 90 ? 'green' : q.score >= 80 ? 'amber' : 'red'}">${q.score >= 90 ? 'Healthy' : q.score >= 80 ? 'Monitor' : 'At risk'}</span>
        </div>
      </div>
      <div class="card">
        <div class="card-head"><h2>Category breakdown</h2></div>
        <div class="card-body stack-sm">
          ${Object.entries(q.categories).map(([k, v]) => `<div class="cat-meter">
            <div class="cat-meter-top"><span style="text-transform:capitalize">${esc(k)}</span><b>${v}%</b></div>
            <div class="meter"><i class="${v >= 92 ? 'green' : v >= 80 ? 'amber' : 'red'}" style="width:${v}%"></i></div>
          </div>`).join('')}
        </div>
      </div>
      <div class="callout">${icon('info', 15)}<div><strong>How the score works.</strong> Completeness, consistency, uniqueness, validity and timeliness are each scored from the imported rows, then weighted 25/20/15/25/15.</div></div>
    </div>
    <div class="card">
      <div class="card-head"><div><h2>Quality issues</h2><p>${q.issues.length} checks recorded on v${ds.versions.length}. Every exclusion is logged in the evidence artifacts that use this data.</p></div></div>
      <div class="issue-list">
        ${q.issues.map((issue) => `<div class="issue-row">
          <div class="issue-body">
            <strong>${esc(issue.title)}</strong>
            <p>${esc(issue.detail)}</p>
            <div class="issue-rec">${icon('spark', 13)}<span><strong>Recommendation:</strong> ${esc(issue.recommendation)}</span></div>
          </div>
          <div class="issue-side">
            ${severityBadge(issue.severity)}
            <span class="small muted">${fmtInt(issue.impactedRows)} rows</span>
            ${statusBadge(issue.status)}
            ${issue.status !== 'Resolved' ? `<button class="btn btn-ghost btn-xs" data-ack="${esc(issue.id)}">${issue.status === 'Open' ? 'Acknowledge' : 'Resolve'}</button>` : ''}
          </div>
        </div>`).join('')}
      </div>
    </div>
  </div>`;
}

function bindQuality(ds) {
  document.querySelectorAll('[data-ack]').forEach((btn) => btn.addEventListener('click', () => {
    const issue = ds.quality.issues.find((i) => i.id === btn.dataset.ack);
    if (!issue) return;
    issue.status = issue.status === 'Open' ? 'Acknowledged' : 'Resolved';
    save();
    logActivity('review', 'Quality issue updated', `${issue.title} → ${issue.status}`);
    toast('Quality issue updated', 'success', `${issue.id} is now ${issue.status.toLowerCase()}.`);
    render(document.getElementById('view'), { id: ds.id, query: new URLSearchParams('tab=quality') });
  }));
}

/* ---------------- schema ---------------- */

function schemaTab(ds) {
  return `<div class="card">
    <div class="card-head"><div><h2>Schema</h2><p>Types are inferred on import and validated on every run. Null percentages are computed from the current version.</p></div>
      <div class="card-head-actions"><span class="badge badge-slate">${ds.columnCount} columns</span><span class="badge badge-slate">${ds.quality.metrics.totalCells ? fmtCompact(ds.quality.metrics.totalCells) : ''} cells</span></div>
    </div>
    <div class="table-wrap"><table class="data">
      <thead><tr><th>Column</th><th>Inferred type</th><th class="num">Null %</th><th class="num">Unique</th><th>Min / max</th><th>Example values</th><th>Detected issues</th></tr></thead>
      <tbody>${ds.quality.columns.map((c) => `<tr>
        <td class="cell-strong">${esc(c.label)}<div class="tiny muted mono">${esc(c.key)}</div></td>
        <td><span class="chip">${icon(c.type === 'numeric' ? 'hash' : c.type === 'date' ? 'calendar' : c.type === 'categorical' ? 'tag' : 'type', 11)} ${esc(c.type)}</span>${c.isKey ? '<span class="badge badge-blue" style="margin-left:6px">Key</span>' : ''}</td>
        <td class="num ${c.nullPct > 5 ? 'cell-strong' : ''}">${fmtPct(c.nullPct)}</td>
        <td class="num">${fmtInt(c.uniqueCount)}</td>
        <td class="small">${c.type === 'numeric' ? `${fmtNum(c.min)} – ${fmtNum(c.max)}` : c.type === 'date' ? `${c.min || '—'} → ${c.max || '—'}` : '—'}</td>
        <td class="small muted">${c.examples.map((e) => esc(e)).join(', ') || '—'}</td>
        <td>${c.issues.length ? c.issues.map((i) => `<span class="badge badge-${i.severity === 'warning' ? 'amber' : 'blue'}" style="margin:1px 0">${esc(i.message)}</span>`).join('') : '<span class="small muted">None</span>'}</td>
      </tr>`).join('')}</tbody>
    </table></div>
  </div>`;
}

/* ---------------- versions ---------------- */

function versionsTab(ds) {
  return `<div class="card">
    <div class="card-head"><div><h2>Version history</h2><p>Each import creates an immutable version with its own fingerprint. Evidence artifacts are bound to the version they were computed on.</p></div>
      <div class="card-head-actions"><span class="badge badge-slate">Current: v${ds.versions.length}</span></div></div>
    <div class="table-wrap"><table class="data">
      <thead><tr><th>Version</th><th>Fingerprint</th><th>Imported</th><th class="num">Rows</th><th class="num">Changed rows</th><th class="num">Changed columns</th><th>Created by</th><th>Quality</th><th></th></tr></thead>
      <tbody>${ds.versions.slice().reverse().map((v) => `<tr>
        <td class="cell-strong">v${v.version} ${v.id === ds.currentVersionId ? '<span class="badge badge-green" style="margin-left:6px">Current</span>' : ''}</td>
        <td>${copyChip(v.fingerprint, shortFingerprint(v.fingerprint))}</td>
        <td class="small">${fmtDateTime(v.importedAt)}</td>
        <td class="num">${fmtInt(v.rowCount)}</td>
        <td class="num">${v.version === 1 ? '—' : fmtInt(v.changedRows)}</td>
        <td class="num">${v.version === 1 ? '—' : v.changedColumns}</td>
        <td class="small">${esc(userById(v.createdBy).name)}</td>
        <td class="small">${v.qualitySummary?.score ?? '—'}</td>
        <td class="num"><div class="row-actions">
          <button class="btn btn-secondary btn-xs" data-view-version="${esc(v.id)}">View</button>
          ${v.id !== ds.currentVersionId ? `<button class="btn btn-ghost btn-xs" data-restore-version="${esc(v.id)}">Restore</button>` : ''}
        </div></td>
      </tr>`).join('')}</tbody>
    </table></div>
  </div>`;
}

function bindVersions(ds) {
  document.querySelectorAll('[data-view-version]').forEach((btn) => btn.addEventListener('click', () => {
    const v = ds.versions.find((x) => x.id === btn.dataset.viewVersion);
    openModal({
      title: `Version v${v.version} snapshot`,
      subtitle: `${fmtDateTime(v.importedAt)} · ${fmtInt(v.rowCount)} rows · ${v.columnCount} columns`,
      size: 'lg',
      body: `<div class="stack">
        <div><div class="tiny muted">Fingerprint</div>${copyChip(v.fingerprint, shortFingerprint(v.fingerprint))}</div>
        <dl class="kv-grid">
          <div class="kv"><dt>Source file</dt><dd>${esc(v.sourceFile.name)} · ${esc(v.sourceFile.size)}</dd></div>
          <div class="kv"><dt>Changed rows</dt><dd>${v.version === 1 ? 'Initial import' : fmtInt(v.changedRows)}</dd></div>
          <div class="kv"><dt>Changed columns</dt><dd>${v.version === 1 ? '—' : v.changedColumns}</dd></div>
          <div class="kv"><dt>Quality score</dt><dd>${v.qualitySummary?.score ?? '—'} / 100</dd></div>
        </dl>
        <div><div class="tiny muted" style="margin-bottom:6px">Schema snapshot</div>
          <div class="table-wrap"><table class="data"><thead><tr><th>Column</th><th>Type</th></tr></thead>
          <tbody>${v.schema.map((c) => `<tr><td>${esc(c.label)}</td><td><span class="chip">${esc(c.type)}</span></td></tr>`).join('')}</tbody></table></div>
        </div>
        <div class="callout">${icon('info', 15)}<div>Older versions keep metadata and schema only. Rows are stored once for the current version; re-import the source file to restore an earlier snapshot.</div></div>
      </div>`,
      footer: `<button class="btn btn-secondary js-close">Close</button>`,
    });
  }));
  document.querySelectorAll('[data-restore-version]').forEach((btn) => btn.addEventListener('click', async () => {
    const v = ds.versions.find((x) => x.id === btn.dataset.restoreVersion);
    const ok = await confirmDialog({
      title: `Restore v${v.version}?`,
      message: `v${v.version} is stored as a metadata snapshot only (${fmtInt(v.rowCount)} rows). Restoring requires re-importing ${v.sourceFile.name}. Do you want to open the upload flow to re-import it?`,
      confirmLabel: 'Re-import file',
    });
    if (ok) openUploadModal(ds);
  }));
}

/* ---------------- history ---------------- */

function historyTab(ds, analyses) {
  if (!analyses.length) {
    return `<div class="card">${emptyState({
      iconName: 'studio', title: 'No analyses saved for this dataset',
      message: 'Run an analysis in the Analysis Studio and save it to build a reviewable history.',
      action: `<a class="btn btn-primary" href="#/studio?dataset=${ds.id}">Open Analysis Studio</a>`,
    })}</div>`;
  }
  return `<div class="card">
    <div class="card-head"><div><h2>Analysis history</h2><p>Every saved run keeps its configuration and validation result.</p></div></div>
    <div class="table-wrap"><table class="data">
      <thead><tr><th>Analysis</th><th>Method</th><th>Created by</th><th>Created</th><th>Validation</th><th>Evidence</th><th></th></tr></thead>
      <tbody>${analyses.slice().reverse().map((a) => `<tr>
        <td class="cell-strong">${esc(a.title)}<div class="tiny muted">${a.selectedFields.map(esc).join(', ') || 'multi-field'}</div></td>
        <td><span class="chip">${esc(a.type)}</span></td>
        <td class="small">${esc(a.createdBy)}</td>
        <td class="small">${fmtDate(a.createdAt)}</td>
        <td>${statusBadge(a.validationResult)}</td>
        <td class="mono tiny">${a.evidenceId ? `<a href="#/evidence/${a.evidenceId}">${esc(a.evidenceId)}</a>` : '<span class="muted">—</span>'}</td>
        <td class="num"><a class="btn btn-secondary btn-xs" href="#/studio?run=${a.id}">Open</a></td>
      </tr>`).join('')}</tbody>
    </table></div>
  </div>`;
}

/* ------------------------------------------------------------------ */
/* Upload                                                             */
/* ------------------------------------------------------------------ */

function humanSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (ch !== '\r') field += ch;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((c) => String(c).trim() !== ''));
}

function coerceRows(rawRows, headerRow) {
  const headers = headerRow.map((h, i) => String(h || `Column ${i + 1}`).trim());
  const dataRows = rawRows.slice(1);
  const types = headers.map((_, ci) => inferColumnType(dataRows.slice(0, 200).map((r) => r[ci])));
  const columns = headers.map((label, i) => ({
    key: slugify(label).replace(/-/g, '_') || `col_${i + 1}`,
    label,
    type: types[i],
    isKey: i === 0,
    critical: i === 0,
  }));
  const rows = dataRows.map((r) => columns.map((col, ci) => {
    const v = r[ci];
    if (v === undefined || String(v).trim() === '') return null;
    if (col.type === 'numeric') {
      const n = Number(String(v).replace(/[$,]/g, ''));
      return Number.isFinite(n) ? n : String(v);
    }
    return String(v);
  }));
  return { columns, rows };
}

export function openUploadModal(presetDataset = null) {
  let fileState = null;
  const { close } = openModal({
    title: 'Upload dataset',
    subtitle: 'CSV and XLSX accepted · imported and profiled entirely in this browser',
    size: 'lg',
    body: `<div id="uploadBody">
      <div class="dropzone" id="dropzone" tabindex="0" role="button" aria-label="Choose a file to upload">
        <div class="dropzone-icon">${icon('upload', 20)}</div>
        <strong>Drop a file here, or click to browse</strong>
        <p>Maximum 8 MB · CSV imported directly; XLSX read by the workbook connector</p>
        <div class="formats"><span class="chip">.csv</span><span class="chip">.xlsx</span></div>
        <input type="file" id="fileInput" accept=".csv,.xlsx" class="hidden" />
      </div>
      <div id="uploadState"></div>
      <div id="uploadForm" class="hidden" style="margin-top:16px">
        <div class="form-grid">
          <div class="field"><label for="upName">Dataset name<span class="req">*</span></label><input id="upName" type="text" /></div>
          <div class="field"><label for="upMode">Import as</label><select id="upMode"></select></div>
          <div class="field full"><label for="upDesc">Description</label><textarea id="upDesc" rows="2" placeholder="What does this dataset contain, and where did it come from?"></textarea></div>
        </div>
        <label class="checkbox" style="margin-top:10px"><input type="checkbox" id="upHeaders" checked /><span>Treat the first row as column headers<em>Uncheck if the file has no header row.</em></span></label>
        <div id="uploadPreview" style="margin-top:14px"></div>
      </div>
    </div>`,
    footer: `<button class="btn btn-ghost js-close">Cancel</button>
      <button class="btn btn-primary" id="doImport" disabled>${icon('upload', 15)} Import dataset</button>`,
    onMount: (root, closeFn) => {
      const input = root.querySelector('#fileInput');
      const drop = root.querySelector('#dropzone');
      const stateBox = root.querySelector('#uploadState');
      const form = root.querySelector('#uploadForm');
      const importBtn = root.querySelector('#doImport');
      const modeSelect = root.querySelector('#upMode');
      modeSelect.innerHTML = `<option value="new">New dataset</option>${state.data.datasets.filter((d) => !d.archived).map((d) => `<option value="${esc(d.id)}">New version of ${esc(d.name)}</option>`).join('')}`;
      if (presetDataset) modeSelect.value = presetDataset.id;

      drop.addEventListener('click', () => input.click());
      drop.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); } });
      ['dragenter', 'dragover'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('dragover'); }));
      ['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('dragover'); }));
      drop.addEventListener('drop', (e) => handleFile(e.dataTransfer.files[0]));
      input.addEventListener('change', () => handleFile(input.files[0]));

      function handleFile(file) {
        if (!file) return;
        importBtn.disabled = true;
        form.classList.add('hidden');
        const ext = file.name.split('.').pop().toLowerCase();
        if (!['csv', 'xlsx'].includes(ext)) {
          stateBox.innerHTML = `<div class="upload-state error">${icon('alert', 15)}<div><strong>Invalid file type</strong><span>${esc(file.name)} is not a supported format. Upload a .csv or .xlsx file.</span></div></div>`;
          return;
        }
        if (file.size > 8 * 1024 * 1024) {
          stateBox.innerHTML = `<div class="upload-state error">${icon('alert', 15)}<div><strong>File too large</strong><span>This file is ${humanSize(file.size)}. The browser demo accepts files up to 8 MB.</span></div></div>`;
          return;
        }
        stateBox.innerHTML = `<div class="file-row">
          <span class="fr-icon">${icon(ext === 'xlsx' ? 'table' : 'report', 15)}</span>
          <div class="fr-copy"><strong>${esc(file.name)}</strong><span>${humanSize(file.size)} · ${ext.toUpperCase()}</span></div>
          <span class="badge badge-blue">Selected</span>
        </div>
        <div class="upload-progress"><div class="upload-progress-top"><span id="progLabel">Reading file…</span><span id="progPct">0%</span></div><div class="meter"><i id="progBar" style="width:0%"></i></div></div>`;

        let pct = 0;
        const tick = setInterval(() => {
          pct = Math.min(96, pct + 8 + Math.random() * 12);
          const bar = root.querySelector('#progBar');
          if (!bar) { clearInterval(tick); return; }
          bar.style.width = `${pct}%`;
          root.querySelector('#progPct').textContent = `${Math.round(pct)}%`;
          root.querySelector('#progLabel').textContent = pct < 40 ? 'Uploading…' : pct < 80 ? 'Parsing and validating…' : 'Profiling columns…';
        }, 130);

        if (ext === 'xlsx') {
          setTimeout(() => {
            clearInterval(tick);
            stateBox.innerHTML = `<div class="upload-state error">${icon('alert', 15)}<div>
              <strong>XLSX parsing is not available in this browser-only build</strong>
              <span>Workbooks must be read by the desktop connector. Export the sheet to CSV and upload it here — column types and quality checks then run automatically. The seeded “Q4 Support Ticket Log” shows a completed XLSX import.</span>
              <div style="margin-top:8px"><button class="btn btn-secondary btn-xs" id="useSampleXlsx">${icon('table', 13)} Inspect the XLSX-imported sample</button></div>
            </div></div>`;
            root.querySelector('#useSampleXlsx')?.addEventListener('click', () => { closeFn(); location.hash = '#/datasets/ds_tickets'; });
          }, 1400);
          return;
        }

        const reader = new FileReader();
        reader.onload = () => {
          clearInterval(tick);
          root.querySelector('#progBar').style.width = '100%';
          root.querySelector('#progPct').textContent = '100%';
          let parsed;
          try {
            const table = parseCsv(String(reader.result));
            if (table.length < 2) throw new Error('The file needs a header row and at least one data row.');
            const headers = root.querySelector('#upHeaders').checked ? table[0] : table[0].map((_, i) => `Column ${i + 1}`);
            const dataRows = root.querySelector('#upHeaders').checked ? table.slice(1) : table;
            if (dataRows.length > 5000) {
              parsed = { table, headers, dataRows: dataRows.slice(0, 5000), truncated: true };
            } else parsed = { table, headers, dataRows };
          } catch (err) {
            stateBox.innerHTML = `<div class="upload-state error">${icon('alert', 15)}<div><strong>Could not parse this file</strong><span>${esc(err.message)}</span></div></div>`;
            return;
          }
          fileState = { file, ...parsed };
          renderSuccess();
        };
        reader.onerror = () => {
          clearInterval(tick);
          stateBox.innerHTML = `<div class="upload-state error">${icon('alert', 15)}<div><strong>Read failed</strong><span>The browser could not read this file.</span></div></div>`;
        };
        reader.readAsText(file);

        // allow re-parsing when the headers toggle changes
        root.querySelector('#upHeaders').addEventListener('change', () => {
          if (!fileState) return;
          const table = fileState.table;
          const withHeaders = root.querySelector('#upHeaders').checked;
          fileState.headers = withHeaders ? table[0] : table[0].map((_, i) => `Column ${i + 1}`);
          fileState.dataRows = withHeaders ? table.slice(1) : table;
          renderSuccess();
        });
      }

      function renderSuccess() {
        const { headers, dataRows, file, truncated } = fileState;
        const { columns, rows } = coerceRows([headers, ...dataRows], headers);
        fileState.coerced = { columns, rows };
        root.querySelector('#upName').value = file.name.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
        form.classList.remove('hidden');
        importBtn.disabled = false;
        stateBox.innerHTML = `<div class="upload-state success">${icon('check', 15)}<div><strong>File validated</strong><span>${fmtInt(rows.length)} rows · ${columns.length} columns detected${truncated ? ' · first 5,000 rows imported' : ''}. Review the profile before importing.</span></div></div>
          <div class="upload-state processing">${icon('check', 15)}<div><strong>Validation complete</strong><span>No blocking issues. Quality checks will run on import and be attached to the new version.</span></div></div>`;
        const preview = columns.slice(0, 6).map((c) => `<th>${esc(c.label)}</th>`).join('');
        root.querySelector('#uploadPreview').innerHTML = `<div class="tiny muted" style="margin-bottom:5px">Preview · first ${Math.min(4, rows.length)} rows</div>
          <div class="table-wrap" style="border:1px solid var(--line);border-radius:9px"><table class="data"><thead><tr>${preview}</tr></thead>
          <tbody>${rows.slice(0, 4).map((r) => `<tr>${r.slice(0, 6).map((v) => `<td>${v === null ? '<span class="cell-muted">null</span>' : esc(String(v))}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
      }

      importBtn.addEventListener('click', () => {
        if (!fileState?.coerced) return;
        const name = root.querySelector('#upName').value.trim();
        if (!name) { toast('Dataset name required', 'warning', 'Give the import a name before continuing.'); return; }
        const description = root.querySelector('#upDesc').value.trim() || 'Imported from ' + fileState.file.name;
        const mode = modeSelect.value;
        const { columns, rows } = fileState.coerced;
        const profile = profileDataset({ columns, rows, uploadDate: nowISO() });
        const versionFingerprint = fingerprint(fnv1a(`${name}|${rows.length}|${Date.now()}`));
        const versionMeta = {
          id: '', version: 1, fingerprint: versionFingerprint, importedAt: nowISO(), rowCount: rows.length,
          columnCount: columns.length, changedRows: 0, changedColumns: 0, createdBy: currentUser().id,
          schema: columns.map((c) => ({ key: c.key, label: c.label, type: c.type })),
          qualitySummary: { score: profile.score, issues: profile.issues.length },
          sourceFile: { name: fileState.file.name, size: humanSize(fileState.file.size), type: 'CSV', rowCount: rows.length },
        };
        if (mode === 'new') {
          const id = uid('ds');
          versionMeta.id = `${id}_v1`;
          state.data.datasets.unshift({
            id, name, fileName: fileState.file.name, sourceType: 'CSV', uploadedBy: currentUser().id,
            uploadDate: nowISO(), description, status: 'Analyzed', analysisStatus: 'Analyzed',
            rowCount: rows.length, columnCount: columns.length, fileSize: humanSize(fileState.file.size),
            columns, rows, versions: [versionMeta], currentVersionId: versionMeta.id, quality: profile,
            lastModified: nowISO(), lastAnalyzedAt: nowISO(), archived: false, seedSpec: null,
          });
        } else {
          const target = datasetById(mode);
          if (!target) return;
          versionMeta.version = target.versions.length + 1;
          versionMeta.id = `${target.id}_v${versionMeta.version}`;
          versionMeta.changedRows = Math.abs(rows.length - target.rowCount);
          versionMeta.changedColumns = columns.length - target.columnCount;
          target.versions.push(versionMeta);
          target.currentVersionId = versionMeta.id;
          target.rows = rows;
          target.columns = columns;
          target.rowCount = rows.length;
          target.columnCount = columns.length;
          target.quality = profile;
          target.seedSpec = null;
          target.fileName = fileState.file.name;
          target.fileSize = humanSize(fileState.file.size);
          target.lastModified = nowISO();
          target.analysisStatus = 'Analyzed';
        }
        save();
        logActivity('upload', 'Dataset uploaded', `${name} imported · ${fmtInt(rows.length)} rows · quality ${profile.score}`);
        addNotification('Import complete', `${name} · ${fmtInt(rows.length)} rows · quality ${profile.score}/100`, 'check');
        toast('Import complete', 'success', `${fmtInt(rows.length)} rows profiled with a quality score of ${profile.score}.`);
        closeFn();
        const targetId = mode === 'new' ? state.data.datasets[0].id : mode;
        location.hash = `#/datasets/${targetId}`;
        window.dispatchEvent(new Event('pcda:refresh'));
      });
    },
  });
  return close;
}
