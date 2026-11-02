/* Overview dashboard. */
import {
  state, currentUser, dashboardMetrics, datasetById, insightById, activeInsights, save,
} from '../store.js';
import { pageHeader, statusBadge, icon, progressRing, statusTone, toast } from '../ui.js';
import {
  esc, fmtCompact, fmtInt, fmtPct, fmtSigned, fmtCompactMoney, fmtDate, timeAgo, fmtMoney, fmtDateTime,
} from '../util.js';
import { renderChart } from '../charts.js';
import { buildVizData, drilldownFilters } from '../analysis.js';
import { openInsightDrawer } from '../insightPanel.js';
import { openEvidencePanel } from '../evidencePanel.js';

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

function deltaHtml(delta) {
  const dir = delta.direction;
  const ic = dir === 'up' ? 'arrow-up' : dir === 'down' ? 'arrow-down' : 'minus';
  return `<span class="stat-delta"><span class="delta delta-${dir}">${icon(ic, 11)} ${esc(delta.label.replace(' vs previous run', ''))}</span><span>vs previous run</span></span>`;
}

export function render(root) {
  const m = dashboardMetrics();
  const datasets = state.data.datasets.filter((d) => !d.archived);
  if (!datasets.length) {
    root.innerHTML = `<div class="stack">${pageHeader({ eyebrow: 'Acme Retail Analytics', title: `${greeting()}, ${currentUser().name.split(' ')[0]}`, description: 'No datasets are in this workspace yet.' })}
      <div class="card">${require_empty()}</div></div>`;
    document.getElementById('ovUploadEmpty')?.addEventListener('click', async () => {
      const mod = await import('./datasets.js');
      mod.openUploadModal();
    });
    return;
  }
  const quality = m.quality.value;
  const verifiedInsights = activeInsights().filter((i) => i.status === 'Verified').slice(0, 4);
  const retail = datasetById(state.data.workspace.activeDatasetId) || datasets[0];
  const revenueViz = state.data.visualizations.find((v) => v.id === 'VIZ-001');
  const revenueEv = revenueViz ? state.data.evidence.find((e) => e.id === revenueViz.evidenceId) : null;
  const q4Growth = revenueEv?.extra?.growth ?? null;
  const alerts = buildAlerts(datasets);

  root.innerHTML = `<div class="stack">
    ${pageHeader({
    eyebrow: 'Acme Retail Analytics',
    title: `${greeting()}, ${currentUser().name.split(' ')[0]}`,
    description: `Your workspace has ${datasets.length} datasets, ${m.verified.value} validated insights, and ${m.review.value} findings requiring review.`,
    actions: `<button class="btn btn-secondary" id="ovStudio">${icon('studio', 15)} Open Analysis Studio</button>
        <button class="btn btn-primary" id="ovUpload">${icon('upload', 15)} Upload Dataset</button>`,
  })}

    <section class="stat-grid" aria-label="Workspace summary">
      ${statCard('Active datasets', fmtInt(m.datasets.value), m.datasets.delta, 'datasets', 'blue')}
      ${statCard('Rows analyzed', fmtInt(m.rows.value), m.rows.delta, 'table', 'teal')}
      ${statCard('AI insights generated', fmtInt(m.insights.value), m.insights.delta, 'sparkles', 'violet')}
      ${statCard('Verified findings', fmtInt(m.verified.value), m.verified.delta, 'shield', 'green')}
      ${statCard('Findings needing review', fmtInt(m.review.value), m.review.delta, 'clock', 'amber')}
      ${statCard('Overall data quality', `${quality}%`, m.quality.delta, 'check', 'blue')}
    </section>

    <section class="card">
      <div class="card-head">
        <div><h2>Recent dataset activity</h2><p>Every dataset is versioned; each version carries a fingerprint and a quality profile.</p></div>
        <div class="card-head-actions"><a class="link-btn" href="#/datasets">View all datasets ${icon('arrow-right', 13)}</a></div>
      </div>
      <div class="table-wrap">
        <table class="data">
          <thead><tr><th>Dataset</th><th>Source</th><th>Version</th><th class="num">Rows</th><th>Quality</th><th>Last analyzed</th><th>Status</th><th></th></tr></thead>
          <tbody>
            ${datasets.map((d) => `<tr>
              <td><a href="#/datasets/${d.id}" class="cell-strong" style="color:var(--ink)">${esc(d.name)}</a>
                <div class="tiny muted">${esc(d.fileName)}</div></td>
              <td><span class="badge badge-slate">${esc(d.sourceType)}</span></td>
              <td>v${d.versions.length}</td>
              <td class="num">${fmtInt(d.rowCount)}</td>
              <td><div class="quality-inline"><span class="meter" style="width:56px"><i class="${d.quality.score >= 90 ? 'green' : d.quality.score >= 80 ? 'amber' : 'red'}" style="width:${d.quality.score}%"></i></span><span class="small strong">${d.quality.score}</span></div></td>
              <td class="small">${timeAgo(d.lastAnalyzedAt)}</td>
              <td>${statusBadge(d.status)}</td>
              <td class="num"><a class="btn btn-secondary btn-xs" href="#/datasets/${d.id}">Open</a></td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </section>

    <div class="dash-grid">
      <section class="card dash-span">
        <div class="card-head">
          <div><h2>Revenue performance</h2><p>Monthly revenue for ${esc(retail.name)} · v${retail.versions.length}${revenueEv ? ` · ${revenueEv.id}` : ''}</p></div>
          <div class="card-head-actions">
            <span class="badge badge-slate">FY2025</span>
            ${revenueEv ? statusBadge(revenueEv.status) : ''}
            <button class="btn btn-secondary btn-sm" id="chartEvidenceBtn">${icon('shield', 14)} View evidence</button>
          </div>
        </div>
        <div class="card-body">
          <div class="chart-box tall"><canvas id="overviewRevenueChart"></canvas></div>
          ${q4Growth !== null ? `<div class="row wrap" style="margin-top:10px;gap:14px">
            <div class="metric-inline">${icon('chart', 14)} Q4 vs Q3 <strong>${fmtSigned(q4Growth, 1)}</strong></div>
            <div class="metric-inline">${icon('info', 14)} Click any point to drill into the underlying transactions.</div>
          </div>` : ''}
        </div>
      </section>

      <section class="card">
        <div class="card-head">
          <div><h2>Key verified insights</h2><p>Each card links to a reproducible evidence artifact.</p></div>
          <a class="link-btn" href="#/insights">All insights ${icon('arrow-right', 13)}</a>
        </div>
        <div class="card-body" style="display:flex;flex-direction:column;gap:12px">
          ${verifiedInsights.map((ins) => `<article class="insight-mini">
            <div class="insight-mini-top">
              <span class="cat-icon teal">${icon('sparkles', 13)}</span>
              <h3>${esc(ins.title)}</h3>
            </div>
            <p>${esc(ins.description.length > 150 ? ins.description.slice(0, 150) + '…' : ins.description)}</p>
            <div class="insight-mini-meta">
              <span class="badge badge-green">${icon('check', 11)} Verified</span>
              <span>${esc(ins.impact.label)}: <strong style="color:var(--ink)">${esc(ins.impact.value)}</strong></span>
              <span>· ${ins.confidence}% confidence</span>
            </div>
            <div class="insight-mini-foot">
              <span class="tiny muted">${esc(ins.supportingMetric)}</span>
              <button class="btn btn-secondary btn-sm" data-insight="${esc(ins.id)}">${icon('shield', 14)} Inspect Evidence</button>
            </div>
          </article>`).join('')}
        </div>
      </section>

      <section class="card">
        <div class="card-head">
          <div><h2>Quality alerts</h2><p>${alerts.length} open signal${alerts.length === 1 ? '' : 's'} on the current versions.</p></div>
          <a class="link-btn" href="#/datasets/${retail.id}?tab=quality">Quality report</a>
        </div>
        <div class="alert-list">
          ${alerts.map((a) => `<div class="alert-row">
            <span class="alert-icon ${a.tone}">${icon(a.icon, 14)}</span>
            <div class="alert-body">
              <strong>${esc(a.title)}${a.badge ? ` ${a.badge}` : ''}</strong>
              <p>${esc(a.detail)}</p>
              <div class="alert-action">${a.action || ''}</div>
            </div>
          </div>`).join('')}
        </div>
      </section>

      <section class="card">
        <div class="card-head"><div><h2>Analysis activity</h2><p>Recent events across the workspace.</p></div></div>
        <div class="card-body">
          <div class="timeline">
            ${state.data.activity.slice(0, 6).map((a) => `<div class="tl-item">
              <span class="tl-dot ${a.type === 'validation' ? 'green' : a.type === 'export' ? 'violet' : a.type === 'review' ? 'amber' : ''}">${icon(a.type === 'upload' ? 'upload' : a.type === 'analysis' ? 'studio' : a.type === 'validation' ? 'check' : a.type === 'export' ? 'download' : 'flag', 12)}</span>
              <div class="tl-body"><strong>${esc(a.title)}</strong><span>${esc(a.detail)}</span><em>${timeAgo(a.at)}</em></div>
            </div>`).join('')}
          </div>
        </div>
      </section>
    </div>
  </div>`;

  // charts
  if (revenueViz) {
    const data = buildVizData(revenueViz, retail);
    const spec = { ...data.spec, showLegend: false };
    spec.q4Band = spec.labels.length >= 12 ? { fromIndex: 9, toIndex: 11, label: `Q4 · ${q4Growth !== null ? fmtSigned(q4Growth, 1) : ''}` } : null;
    spec.onPointClick = (index) => openDrilldown(revenueViz, retail, index);
    renderChart('overviewRevenueChart', spec);
  }

  document.querySelectorAll('[data-insight]').forEach((btn) => btn.addEventListener('click', () => openInsightDrawer(btn.dataset.insight)));
  document.getElementById('chartEvidenceBtn')?.addEventListener('click', () => { if (revenueEv) openEvidencePanel(revenueEv.id); });
  document.getElementById('ovStudio')?.addEventListener('click', () => { location.hash = '#/studio'; });
  document.getElementById('ovUpload')?.addEventListener('click', async () => {
    const mod = await import('./datasets.js');
    mod.openUploadModal();
  });
  document.querySelectorAll('[data-ds-tab]').forEach((btn) => btn.addEventListener('click', () => {
    location.hash = `#/datasets/${btn.dataset.ds}?tab=${btn.dataset.dsTab}`;
  }));
}

function require_empty() {
  return `<div class="empty-state">
    <span class="empty-icon">${icon('datasets', 26)}</span>
    <h3>No datasets uploaded</h3>
    <p>Upload a CSV to profile it, run automated analysis and produce evidence-backed insights. Every dashboard metric requires a dataset with a recorded fingerprint.</p>
    <button class="btn btn-primary" id="ovUploadEmpty">${icon('upload', 15)} Upload Dataset</button>
  </div>`;
}

function statCard(label, value, delta, iconName, tone) {
  return `<article class="stat-card">
    <div class="stat-top"><span class="stat-label">${esc(label)}</span><span class="stat-icon ${tone}">${icon(iconName, 14)}</span></div>
    <div class="stat-value">${esc(value)}</div>
    ${deltaHtml(delta)}
  </article>`;
}

function m_q4Growth() {
  const viz = state.data.visualizations.find((v) => v.id === 'VIZ-001');
  const ev = viz ? state.data.evidence.find((e) => e.id === viz.evidenceId) : null;
  return ev?.extra?.growth ?? null;
}

function buildAlerts(datasets) {
  const retail = datasets.find((d) => d.id === 'ds_retail') || datasets[0];
  const alerts = [];
  const issues = retail.quality.issues || [];
  const pick = (frag) => issues.find((i) => i.title.toLowerCase().includes(frag));
  const missing = pick('missing');
  const dup = pick('duplicate');
  const dates = pick('date');
  if (missing) alerts.push({
    title: missing.title, tone: '', icon: 'alert', badge: '<span class="badge badge-amber">Warning</span>',
    detail: missing.detail,
    action: `<button class="btn btn-ghost btn-xs" data-ds="${retail.id}" data-ds-tab="quality">Review in quality report ${icon('arrow-right', 12)}</button>`,
  });
  if (dup) alerts.push({
    title: dup.title, tone: '', icon: 'duplicate', badge: '<span class="badge badge-amber">Warning</span>',
    detail: dup.detail,
    action: `<button class="btn btn-ghost btn-xs" data-ds="${retail.id}" data-ds-tab="quality">Inspect duplicates ${icon('arrow-right', 12)}</button>`,
  });
  if (dates) alerts.push({
    title: dates.title, tone: 'info', icon: 'calendar', badge: '<span class="badge badge-blue">Info</span>',
    detail: dates.detail,
    action: `<button class="btn btn-ghost btn-xs" data-ds="${retail.id}" data-ds-tab="schema">View schema ${icon('arrow-right', 12)}</button>`,
  });
  const small = activeInsights().find((i) => i.status === 'Rejected');
  if (small) alerts.push({
    title: 'Small-sample warning', tone: 'red', icon: 'alert', badge: '<span class="badge badge-red">Failed validation</span>',
    detail: `${small.title}. The cell has too few rows for a decision-grade claim.`,
    action: `<button class="btn btn-ghost btn-xs" data-insight="${small.id}">Inspect finding ${icon('arrow-right', 12)}</button>`,
  });
  return alerts.slice(0, 4);
}

function openDrilldown(viz, dataset, index) {
  const filters = drilldownFilters(viz, index, { spec: { labels: buildVizData(viz, dataset).spec.labels } });
  const data = buildVizData(viz, dataset);
  const label = data.spec.labels[index];
  const rows = dataset.rows.filter((r) => {
    if (!filters.length) return true;
    return filters.every((f) => {
      const ci = dataset.columns.findIndex((c) => c.key === f.field);
      const v = r[ci];
      if (f.op === 'between') return String(v) >= f.value && String(v) <= f.value2;
      if (f.op === 'eq') return String(v) === String(f.value);
      return true;
    });
  });
  if (!filters.length) {
    toast('Drill-down unavailable', 'info', 'This chart does not map to a single dimension value.');
    return;
  }
  const cols = ['txn_id', 'date', 'region', 'category', 'channel', 'revenue', 'profit'];
  const colIdx = cols.map((c) => dataset.columns.findIndex((x) => x.key === c)).filter((i) => i >= 0);
  const money = new Set(['revenue', 'profit']);
  const header = colIdx.map((i) => dataset.columns[i].label);
  const tableRows = rows.slice(0, 100).map((r) => colIdx.map((i) => (money.has(dataset.columns[i].key) ? fmtMoney(Number(r[i])) : String(r[i] ?? '—'))));
  import('../ui.js').then(({ openModal, icon }) => {
    openModal({
      title: `Drill-down · ${label}`,
      subtitle: `${fmtInt(rows.length)} transactions match this data point`,
      size: 'lg',
      body: `<div class="table-wrap" style="max-height:420px;overflow-y:auto">
        <table class="data"><thead><tr>${header.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead>
        <tbody>${tableRows.length ? tableRows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('') : '<tr><td colspan="7" class="cell-muted">No rows in this bucket.</td></tr>'}</tbody></table></div>
        <p class="tiny muted" style="margin-top:8px">Showing the first ${Math.min(rows.length, 100)} of ${fmtInt(rows.length)} matching transactions.</p>`,
      footer: `<span class="small muted">Drill-down applies the chart filter to the underlying rows.</span><span class="grow"></span><a class="btn btn-secondary" href="#/datasets/${dataset.id}?tab=preview">Open dataset preview</a>`,
    });
  });
}
