/* AI insight detail drawer: AI explanation vs verified computation. */
import { state, insightById, evidenceById, visualizationById, datasetById } from './store.js';
import { openDrawer, statusBadge, icon, toast } from './ui.js';
import { esc, fmtInt, fmtDate, fmtPct } from './util.js';
import { renderChart, destroyAllCharts } from './charts.js';
import { buildVizData } from './analysis.js';
import { addRefToReport, markForReview, openChartFromInsight, refreshPage } from './actions.js';
import { openEvidencePanel } from './evidencePanel.js';
import { statusTone } from './ui.js';
import { checkLabel } from './evidencePanel.js';

export const CATEGORY_TONE = {
  Trend: 'blue', Correlation: 'violet', Anomaly: 'amber', Segment: 'teal', Forecast: 'violet', 'Data Quality': 'red',
};
export const CATEGORY_ICON = {
  Trend: 'chart', Correlation: 'spark', Anomaly: 'alert', Segment: 'grid', Forecast: 'sparkles', 'Data Quality': 'shield',
};

export function insightProofSummary(insight) {
  const ev = evidenceById(insight.evidenceId);
  if (!ev) return '';
  return `<div class="card" style="border-radius:12px">
    <div class="card-body" style="padding:14px 16px;display:flex;flex-direction:column;gap:8px">
      <div class="row-between">
        <div class="row" style="gap:6px">${icon('shield', 15)}<strong style="font-size:12.5px">Supporting evidence</strong></div>
        ${statusBadge(ev.superseded ? 'Superseded' : ev.status)}
      </div>
      <p style="font-size:12px;color:var(--ink-2);line-height:1.55">${esc(ev.claim)}</p>
      <div class="row wrap" style="gap:6px">
        <span class="badge badge-slate">${esc(ev.id)}</span>
        <span class="chip">Score ${ev.score}/100</span>
        <span class="chip">${ev.checks.filter((c) => c.status === 'pass').length}/${ev.checks.length} checks</span>
        <span class="chip">${esc(ev.datasetName)} · v${ev.versionNumber}</span>
      </div>
    </div>
  </div>`;
}

export function insightCardHtml(insight, options = {}) {
  const ev = evidenceById(insight.evidenceId);
  const chart = insight.visualizationId ? visualizationById(insight.visualizationId) : (ev ? state.data.visualizations.find((v) => v.evidenceId === ev.id) : null);
  const tone = CATEGORY_TONE[insight.category] || 'blue';
  return `<article class="insight-card" data-insight="${esc(insight.id)}">
    <div class="insight-card-head">
      <span class="cat-icon ${tone}">${icon(CATEGORY_ICON[insight.category] || 'sparkles', 14)}</span>
      <h3>${esc(insight.title)}</h3>
      ${statusBadge(insight.status)}
    </div>
    <p class="insight-card-desc">${esc(insight.description)}</p>
    <dl class="insight-facts">
      <div><dt>Confidence</dt><dd>${insight.confidence}% <span class="confidence"><span class="confidence-bar ${insight.confidence < 70 ? 'low' : ''}"><i style="width:${insight.confidence}%"></i></span></span></dd></div>
      <div><dt>Importance</dt><dd>${esc(insight.importance)}</dd></div>
      <div><dt>Category</dt><dd>${esc(insight.category)}</dd></div>
      <div><dt>Evidence coverage</dt><dd>${fmtPct(insight.evidenceCoverage, 0)}</dd></div>
      <div><dt>Dataset</dt><dd>${esc(insight.datasetName || '—')}</dd></div>
      <div><dt>Generated</dt><dd>${fmtDate(insight.generatedAt)}</dd></div>
    </dl>
    <div class="insight-mini-meta">
      <span class="chip chip-quiet">${icon('link', 11)} ${chart ? esc(chart.title) : 'No linked chart'}</span>
      <span class="chip chip-quiet">${esc(insight.supportingMetric || '')}</span>
    </div>
    ${options.showActions === false ? '' : `<div class="insight-card-foot">
      <button class="btn btn-secondary btn-sm" data-act="view-proof" data-id="${esc(insight.id)}">${icon('shield', 14)} View Proof</button>
      <button class="btn btn-ghost btn-sm" data-act="open-chart" data-id="${esc(insight.id)}">${icon('chart', 14)} Open Chart</button>
      <span class="spacer"></span>
      <button class="btn btn-ghost btn-sm" data-act="add-report" data-id="${esc(insight.id)}">${icon('plus', 14)} Add to Report</button>
      <button class="btn btn-ghost btn-sm" data-act="flag" data-id="${esc(insight.id)}">${icon('flag', 14)} Mark for Review</button>
    </div>`}
  </article>`;
}

export function openInsightDrawer(insightId) {
  const insight = insightById(insightId);
  if (!insight) return;
  const ev = evidenceById(insight.evidenceId);
  const chart = insight.visualizationId ? visualizationById(insight.visualizationId) : (ev ? state.data.visualizations.find((v) => v.evidenceId === ev.id) : null);
  const ds = datasetById(insight.datasetId);
  const tone = CATEGORY_TONE[insight.category] || 'blue';
  let chartData = null;
  if (chart && ds) {
    try { chartData = buildVizData(chart, ds); } catch { chartData = null; }
  }
  const body = `<div class="stack">
    <div class="row wrap" style="gap:6px">
      <span class="cat-icon ${tone}">${icon(CATEGORY_ICON[insight.category] || 'sparkles', 14)}</span>
      <span class="badge badge-${tone === 'red' ? 'red' : tone}">${esc(insight.category)}</span>
      ${statusBadge(insight.status)}
      <span class="badge badge-slate">${esc(insight.id)}</span>
      <span class="badge badge-blue">${esc(insight.importance)} importance</span>
    </div>

    <section>
      <h3 style="font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin-bottom:6px">Summary</h3>
      <p style="font-size:13px;line-height:1.7;color:var(--ink-2)">${esc(insight.description)}</p>
    </section>

    <section>
      <h3 style="font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin-bottom:6px">Business interpretation</h3>
      <div class="narrative">${esc(insight.interpretation)}</div>
    </section>

    <section>
      <h3 style="font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin-bottom:6px">Supporting evidence</h3>
      ${insightProofSummary(insight)}
      <div class="row" style="margin-top:8px">
        <button class="btn btn-soft btn-sm js-proof">${icon('shield', 14)} View Proof</button>
        <span class="small muted">Every figure traces to a deterministic calculation.</span>
      </div>
    </section>

    ${chart ? `<section>
      <h3 style="font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin-bottom:6px">Associated chart</h3>
      <div class="card" style="border-radius:10px"><div class="card-body" style="padding:12px">
        <div class="row-between" style="margin-bottom:6px"><strong style="font-size:12.5px">${esc(chart.title)}</strong>${statusBadge(chart.validationStatus)}</div>
        <div class="chart-box short"><canvas id="insightDrawerChart"></canvas></div>
      </div></div>
    </section>` : ''}

    <section>
      <h3 style="font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin-bottom:6px">Confidence and caveats</h3>
      <div class="row wrap" style="gap:6px;margin-bottom:8px">
        <span class="chip chip-teal">Confidence ${insight.confidence}%</span>
        <span class="chip">Evidence coverage ${fmtPct(insight.evidenceCoverage, 0)}</span>
        ${ev ? statusBadge(ev.superseded ? 'Superseded' : ev.status) : ''}
      </div>
      <ul style="margin:0;padding-left:18px;color:var(--ink-2);font-size:12px;line-height:1.65">
        ${insight.caveats.map((c) => `<li>${esc(c)}</li>`).join('')}
      </ul>
    </section>

    ${ev ? `<section>
      <h3 style="font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin-bottom:6px">Validation checks</h3>
      <div class="checks">
        ${ev.checks.slice(0, 7).map((c) => `<div class="check-row check-${c.status}">
          <span class="check-icon">${icon(c.status === 'pass' ? 'check' : c.status === 'warn' ? 'alert' : 'x', 11)}</span>
          <div><strong>${esc(checkLabel(c))}</strong><span>${esc(c.detail)}</span></div>
        </div>`).join('')}
      </div>
    </section>` : ''}

    <section>
      <h3 style="font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin-bottom:6px">What this does not prove</h3>
      <div class="callout warn">${icon('info', 15)}<div>
        <ul style="margin:0;padding-left:16px;display:flex;flex-direction:column;gap:4px">
          ${insight.doesNotProve.map((c) => `<li>${esc(c)}</li>`).join('')}
        </ul>
        ${insight.category === 'Correlation' ? '<div style="margin-top:6px"><strong>This relationship is correlational and should not be interpreted as causal.</strong></div>' : ''}
      </div></div>
    </section>

    <section>
      <h3 style="font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin-bottom:6px">Reproducibility</h3>
      <p class="small muted" style="line-height:1.6">${ev ? `Computed on ${esc(ev.datasetName)} v${ev.versionNumber} · fingerprint ${esc(ev.fingerprint.slice(0, 26))}… · ${fmtInt(ev.sampleSize)} records in scope.` : 'No evidence artifact is linked to this insight.'}</p>
      <div class="row" style="margin-top:8px">
        <button class="btn btn-secondary btn-sm js-full-proof">${icon('external', 14)} Open full proof trail</button>
        <button class="btn btn-ghost btn-sm js-reproduce">${icon('refresh', 14)} Reproduce now</button>
      </div>
      <div id="insightReproMount" style="margin-top:10px"></div>
    </section>
  </div>`;

  const footer = `<button class="btn btn-ghost" data-act="add-report">${icon('plus', 15)} Add to report</button>
    ${insight.status === 'Needs Review' || insight.status === 'Rejected'
    ? '<span class="badge badge-amber" style="align-self:center">Needs review before decision use</span>'
    : `<button class="btn btn-ghost" data-act="flag">${icon('flag', 15)} Mark for Review</button>`}
    <span class="grow"></span>
    <button class="btn btn-secondary" data-act="open-chart">${icon('chart', 15)} Open chart</button>
    <button class="btn btn-primary" data-act="view-proof">${icon('shield', 15)} View proof</button>`;

  const panel = openDrawer({ title: insight.title, subtitle: `${insight.id} · ${insight.category} · generated ${fmtDate(insight.generatedAt)}`, body, footer });

  if (chart && chartData && chartData.kind === 'chart') {
    renderChart('insightDrawerChart', { ...chartData.spec, showLegend: true });
  } else if (chart && chartData && chartData.kind === 'heatmap') {
    const el = panel.overlay.querySelector('#insightDrawerChart');
    if (el) el.parentElement.innerHTML = '<p class="small muted">Open the chart to view the correlation matrix.</p>';
  }

  panel.overlay.querySelector('.js-proof')?.addEventListener('click', () => { panel.close(); openEvidencePanel(insight.evidenceId); });
  panel.overlay.querySelector('.js-full-proof')?.addEventListener('click', () => {
    panel.close();
    if (insight.evidenceId) location.hash = `#/evidence/${encodeURIComponent(insight.evidenceId)}`;
  });
  panel.overlay.querySelector('.js-reproduce')?.addEventListener('click', async () => {
    const mount = panel.overlay.querySelector('#insightReproMount');
    if (ev) {
      const { runReproduction } = await import('./evidencePanel.js');
      await runReproduction(ev, mount);
    }
  });
  panel.overlay.querySelectorAll('[data-act]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const act = btn.dataset.act;
      if (act === 'view-proof') { panel.close(); openEvidencePanel(insight.evidenceId); }
      if (act === 'open-chart') { panel.close(); openChartFromInsight(insight); }
      if (act === 'add-report') addRefToReport({ type: 'insight', id: insight.id, label: insight.title });
      if (act === 'flag') { panel.close(); markForReview(insight.id); }
    });
  });
  return panel;
}

export function insightForCardActions(insightId, action) {
  const insight = insightById(insightId);
  if (!insight) return;
  if (action === 'view-proof') openInsightDrawer(insight.id);
  if (action === 'open-chart') openChartFromInsight(insight);
  if (action === 'add-report') addRefToReport({ type: 'insight', id: insight.id, label: insight.title });
  if (action === 'flag') markForReview(insight.id);
}
