/* Reports: builder and printable viewer. */
import {
  state, reportById, insightById, visualizationById, evidenceById, datasetById, activeInsights,
  save, logActivity, currentUser, reportVerification, userById,
} from '../store.js';
import { pageHeader, statusBadge, icon, emptyState, openModal, toast, confirmDialog } from '../ui.js';
import {
  esc, fmtInt, fmtDate, fmtDateTime, fmtPct, nowISO, downloadBlob, toCsv, slugify,
} from '../util.js';
import { renderChart } from '../charts.js';
import { buildVizData } from '../analysis.js';
import { openEvidencePanel } from '../evidencePanel.js';
import { evidenceBundle } from '../evidencePanel.js';

const builderState = { editing: false, reportId: null };

export function render(root, params) {
  const reports = state.data.reports;
  const current = params.id ? reportById(params.id) : (builderState.reportId ? reportById(builderState.reportId) : reports[0]);
  if (!current) {
    root.innerHTML = `<div class="stack">${pageHeader({ eyebrow: 'Reports', title: 'Reports', description: 'Assemble validated findings into a decision document.' })}<div class="card">${emptyState({ iconName: 'report', title: 'No reports yet', message: 'Create a report from validated findings and their evidence.', action: '<button class="btn btn-primary" id="newReportEmpty">Create report</button>' })}</div></div>`;
    document.getElementById('newReportEmpty')?.addEventListener('click', () => createReport(root));
    return;
  }
  const verification = reportVerification(current);

  root.innerHTML = `<div class="stack">
    ${pageHeader({
    eyebrow: 'Reports',
    title: builderState.editing && builderState.reportId === current.id ? 'Report builder' : 'Reports',
    description: 'A report shows verified and unverified findings side by side, with every claim linked to its evidence.',
    actions: `<button class="btn btn-secondary" id="newReport">${icon('plus', 15)} New report</button>
        <button class="btn btn-ghost" id="printReport" ${builderState.editing ? 'disabled' : ''}>${icon('print', 15)} Export PDF</button>`,
  })}
    <div class="reports-layout">
      <div>
        ${builderState.editing && builderState.reportId === current.id ? builderHtml(current) : viewerHtml(current, verification)}
      </div>
      <aside class="stack">
        <div class="card">
          <div class="card-head"><h2>Reports</h2><span class="badge badge-slate">${reports.length}</span></div>
          <div>${reports.map((r) => `<div class="report-list-item ${r.id === current.id ? 'active' : ''}" data-report="${esc(r.id)}">
            <span class="cat-icon ${r.status === 'Published' ? 'teal' : ''}">${icon('report', 14)}</span>
            <div class="grow"><h3>${esc(r.title)}</h3><p>${esc(r.audience)} · ${esc(r.status)}</p><p class="tiny muted">Updated ${fmtDate(r.updatedAt)}</p></div>
          </div>`).join('')}</div>
        </div>
        <div class="card">
          <div class="card-head"><h2>Verification summary</h2></div>
          <div class="card-body stack-sm">
            ${verificationRow('Verified & reproducible', verification.verified, 'green')}
            ${verificationRow('Needs review', verification.review, 'amber')}
            ${verificationRow('Rejected / warning', verification.rejected, 'red')}
            <div class="divider"></div>
            <div class="row-between"><span class="small muted">Total findings</span><strong class="small">${verification.total}</strong></div>
            <div class="meter" style="margin-top:4px"><i class="green" style="width:${verification.total ? (verification.verified / verification.total) * 100 : 0}%"></i></div>
            <p class="tiny muted">A report cannot label a finding verified unless its evidence passes validation and reproduction.</p>
          </div>
        </div>
        <div class="card">
          <div class="card-head"><h2>Export</h2></div>
          <div class="card-body stack-sm">
            <button class="btn btn-secondary btn-block" id="exportPdf">${icon('print', 15)} Export PDF</button>
            <button class="btn btn-secondary btn-block" id="exportCsv">${icon('table', 15)} Export CSV</button>
            <button class="btn btn-secondary btn-block" id="exportBundle">${icon('shield', 15)} Download Evidence Bundle</button>
            <button class="btn btn-secondary btn-block" id="shareReport">${icon('share', 15)} Share Report</button>
          </div>
        </div>
      </aside>
    </div>
  </div>`;

  document.querySelectorAll('[data-report]').forEach((el) => el.addEventListener('click', () => {
    builderState.editing = false;
    builderState.reportId = el.dataset.report;
    location.hash = `#/reports/${el.dataset.report}`;
  }));
  document.getElementById('newReport')?.addEventListener('click', () => createReport(root));
  document.getElementById('printReport')?.addEventListener('click', () => window.print());
  document.getElementById('exportPdf')?.addEventListener('click', () => window.print());
  document.getElementById('exportCsv')?.addEventListener('click', () => exportReportCsv(current));
  document.getElementById('exportBundle')?.addEventListener('click', () => exportReportBundle(current));
  document.getElementById('shareReport')?.addEventListener('click', () => shareReport(current));
  document.getElementById('editReport')?.addEventListener('click', () => { builderState.editing = true; builderState.reportId = current.id; render(root, { id: current.id, query: new URLSearchParams() }); });
  document.getElementById('cancelEdit')?.addEventListener('click', () => { builderState.editing = false; render(root, { id: current.id, query: new URLSearchParams() }); });
  document.getElementById('saveReport')?.addEventListener('click', () => saveReport(root, current));

  if (!builderState.editing) mountReportCharts(current);
  if (builderState.editing) bindBuilder(root, current);
}

function verificationRow(label, value, tone) {
  return `<div class="row-between"><span class="small muted">${esc(label)}</span><span class="badge badge-${tone}">${value}</span></div>`;
}

/* ---------------- viewer ---------------- */

function viewerHtml(report, verification) {
  const author = userById(report.createdBy);
  const allVerified = verification.total > 0 && verification.verified === verification.total;
  return `<article class="report-doc">
    <div class="report-banner ${allVerified ? '' : 'warn'}">
      <span class="rb-icon">${icon(allVerified ? 'shield' : 'alert', 17)}</span>
      <div>
        <strong>${verification.verified} of ${verification.total} findings are verified and reproducible.</strong>
        <p>${verification.review ? `${verification.review} finding${verification.review === 1 ? '' : 's'} need review and ${verification.rejected} carry warnings or were rejected. ` : ''}Each finding links to a proof record carrying its formula, source version and validation result.</p>
      </div>
    </div>
    <div class="row-between" style="align-items:flex-start">
      <div>
        <h1 class="report-title">${esc(report.title)}</h1>
        <p class="report-subtitle">Prepared for ${esc(report.audience)}</p>
      </div>
      ${statusBadge(report.status)}
    </div>
    <div class="report-meta">
      <span>${icon('user', 13)} ${esc(author.name)}</span>
      <span>${icon('calendar', 13)} ${fmtDate(report.createdAt)}</span>
      <span>${icon('clock', 13)} Updated ${fmtDate(report.updatedAt)}</span>
      <span class="grow"></span>
      <button class="btn btn-secondary btn-sm no-print" id="editReport">${icon('edit', 13)} Edit report</button>
    </div>
    ${report.sections.map((section, i) => renderSection(report, section, i)).join('')}
  </article>`;
}

function renderSection(report, section, index) {
  const title = `<h2><span class="rsec-num">${String(index + 1).padStart(2, '0')}</span>${esc(section.title)}</h2>`;
  const body = section.body;
  const bodyHtml = Array.isArray(body)
    ? `<ul>${body.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>`
    : body ? `<p>${esc(body)}</p>` : '';

  if (section.type === 'insights' || section.type === 'risk') {
    const items = (section.refs || []).map((id) => insightById(id)).filter(Boolean);
    return `<section class="report-section">${title}
      ${bodyHtml}
      ${items.length ? items.map((ins) => {
    const ev = evidenceById(ins.evidenceId);
    return `<div class="report-finding">
        <span class="cat-icon ${ins.category === 'Correlation' ? 'violet' : ins.category === 'Data Quality' ? 'red' : 'teal'}">${icon('sparkles', 13)}</span>
        <div class="rf-body">
          <strong>${esc(ins.title)}</strong>
          <p>${esc(ins.description)}</p>
          <p class="tiny muted" style="margin-top:4px">${esc(ins.supportingMetric || '')} · confidence ${ins.confidence}%</p>
        </div>
        <div class="stack-sm" style="align-items:flex-end;flex-shrink:0">
          ${statusBadge(ins.status)}
          ${ev ? `<a class="evidence-ref" href="#/evidence/${ev.id}" data-ev="${esc(ev.id)}">${icon('shield', 10)} ${esc(ev.id)}</a>` : ''}
        </div>
      </div>`;
  }).join('') : '<p class="small muted">No findings selected.</p>'}
    </section>`;
  }

  if (section.type === 'charts') {
    const charts = (section.refs || []).map((id) => visualizationById(id)).filter(Boolean);
    return `<section class="report-section">${title}
      ${bodyHtml}
      ${charts.length ? charts.map((viz) => {
    const ev = evidenceById(viz.evidenceId);
    return `<div class="report-chart">
        <div class="row-between" style="margin-bottom:4px">
          <strong style="font-size:12.5px">${esc(viz.title)}</strong>
          <span class="row" style="gap:6px">${statusBadge(viz.validationStatus)}${ev ? `<a class="evidence-ref" href="#/evidence/${ev.id}">${icon('shield', 10)} ${esc(ev.id)}</a>` : ''}</span>
        </div>
        ${viz.type === 'heatmap' ? `<p class="small muted">Correlation matrix — open the visualization gallery for the full heatmap.</p>` : `<div class="chart-box"><canvas id="reportChart_${esc(viz.id)}" data-viz="${esc(viz.id)}"></canvas></div>`}
      </div>`;
  }).join('') : '<p class="small muted">No charts selected.</p>'}
    </section>`;
  }

  if (section.type === 'metrics') {
    const items = (section.refs || []).map((id) => evidenceById(id)).filter(Boolean);
    return `<section class="report-section">${title}
      ${bodyHtml}
      <dl class="kpi-strip" style="margin-top:10px">
        ${items.map((ev) => `<div class="kpi-tile"><dt>${esc((ev.computation.resultLines[0] || {}).label || ev.type)}</dt><dd>${esc((ev.computation.resultLines[0] || {}).value || ev.displayValue)}</dd>
          <a class="tiny" href="#/evidence/${ev.id}">${esc(ev.id)}</a></div>`).join('')}
      </dl>
    </section>`;
  }

  if (section.type === 'quality') {
    const ds = datasetById(section.datasetId || report.sections.find((s) => s.type === 'quality')?.datasetId);
    return `<section class="report-section">${title}
      ${bodyHtml}
      ${ds ? `<div class="row wrap" style="gap:10px;margin-top:10px">
        <span class="chip">Quality score ${ds.quality.score}/100</span>
        <span class="chip">${ds.quality.issues.filter((i) => i.severity === 'warning').length} warnings</span>
        <span class="chip">${fmtInt(ds.quality.metrics.duplicateRows)} duplicate rows excluded</span>
        <span class="chip">${fmtPct(ds.quality.metrics.nullPct)} missing cells</span>
      </div>` : ''}
      ${section.type === 'quality' && (report.limitations || []).length ? `<div style="margin-top:12px"><strong style="font-size:12.5px">Limitations</strong><ul>${report.limitations.map((l) => `<li>${esc(l)}</li>`).join('')}</ul></div>` : ''}
    </section>`;
  }

  if (section.type === 'evidence') {
    const items = (section.refs || []).map((id) => evidenceById(id)).filter(Boolean);
    return `<section class="report-section">${title}
      ${bodyHtml}
      <div class="report-appendix">
        ${items.length ? items.map((ev) => `<div class="report-appendix-item">
          <code>${esc(ev.id)}</code>
          <div class="grow"><span>${esc(ev.claim)}</span><div class="tiny muted">${esc(ev.datasetName)} v${ev.versionNumber} · ${ev.score}/100 · ${esc(ev.status)}</div></div>
          <a class="evidence-ref" href="#/evidence/${ev.id}">${icon('external', 10)} Open</a>
        </div>`).join('') : '<p class="small muted">No evidence artifacts selected.</p>'}
      </div>
    </section>`;
  }

  if (section.type === 'methodology') {
    return `<section class="report-section">${title}<p>${esc(report.methodology || body || '')}</p></section>`;
  }

  if (section.type === 'limitations') {
    const items = (report.limitations || []).filter(Boolean);
    return `<section class="report-section">${title}${bodyHtml}${items.length ? `<ul>${items.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>` : ''}</section>`;
  }

  if (section.type === 'recommendations' || section.type === 'actions') {
    return `<section class="report-section">${title}${bodyHtml}</section>`;
  }

  return `<section class="report-section">${title}${bodyHtml}</section>`;
}

function mountReportCharts(report) {
  report.sections.filter((s) => s.type === 'charts').forEach((s) => {
    (s.refs || []).forEach((id) => {
      const viz = visualizationById(id);
      if (!viz || viz.type === 'heatmap') return;
      const ds = datasetById(viz.datasetId);
      if (!ds) return;
      try {
        const data = buildVizData(viz, ds);
        renderChart(`reportChart_${viz.id}`, { ...data.spec, showLegend: true });
      } catch (err) { console.warn(err); }
    });
  });
}

/* ---------------- builder ---------------- */

function builderHtml(report) {
  const all = activeInsights();
  return `<div class="card">
    <div class="card-head">
      <div><h2>Edit report</h2><p>Reorder sections, edit copy, and choose which findings and charts are included.</p></div>
      <div class="card-head-actions">
        <button class="btn btn-ghost btn-sm" id="cancelEdit">Cancel</button>
        <button class="btn btn-primary btn-sm" id="saveReport">${icon('check', 14)} Save report</button>
      </div>
    </div>
    <div class="card-body stack">
      <div class="form-grid">
        <div class="field"><label for="rpTitle">Title</label><input class="input" id="rpTitle" value="${esc(report.title)}" /></div>
        <div class="field"><label for="rpAudience">Audience</label><input class="input" id="rpAudience" value="${esc(report.audience)}" /></div>
        <div class="field full"><label for="rpSummary">Executive summary</label><textarea class="input" id="rpSummary" rows="3">${esc(report.summary)}</textarea></div>
        <div class="field"><label for="rpStatus">Status</label><select class="select" id="rpStatus"><option ${report.status === 'Draft' ? 'selected' : ''}>Draft</option><option ${report.status === 'Published' ? 'selected' : ''}>Published</option></select></div>
      </div>

      <div class="divider"></div>
      <div class="row-between"><strong style="font-size:13px">Sections</strong><span class="small muted">Drag-free ordering with the arrows</span></div>
      <div class="builder-list" id="sectionList">
        ${report.sections.map((section, i) => `<div class="builder-item" data-section="${esc(section.id)}">
          <span class="ti-num" style="width:22px;height:22px;border-radius:6px;background:var(--surface-3);display:grid;place-items:center;font-size:10px;font-weight:700">${i + 1}</span>
          <div class="bi-body">
            <input type="text" value="${esc(section.title)}" data-sec-title="${esc(section.id)}" aria-label="Section title" />
            <span>${esc(section.type)}${section.refs?.length ? ` · ${section.refs.length} reference${section.refs.length === 1 ? '' : 's'}` : ''}</span>
            ${['summary', 'risk', 'quality', 'actions', 'recommendations', 'methodology', 'limitations', 'custom'].includes(section.type)
    ? `<textarea class="input" rows="2" style="margin-top:6px;height:auto;padding:6px 8px;font-size:12px" data-sec-body="${esc(section.id)}" placeholder="Section copy">${esc(Array.isArray(section.body) ? section.body.join('\n') : section.body || '')}</textarea>`
    : ''}
            ${section.refs?.length ? `<div class="row wrap" style="gap:4px;margin-top:6px">${section.refs.map((ref, ri) => `<span class="chip">${esc(refTitle(section.type, ref))}<button class="link-btn" data-rm-ref="${ri}" data-sec="${esc(section.id)}" aria-label="Remove">×</button></span>`).join('')}</div>` : ''}
            ${['insights', 'charts', 'evidence', 'metrics', 'risk'].includes(section.type) ? `<div class="row" style="margin-top:6px"><button class="btn btn-ghost btn-xs" data-add-ref="${esc(section.id)}" data-sec-type="${section.type}">${icon('plus', 11)} Add ${section.type === 'charts' ? 'chart' : section.type === 'evidence' ? 'evidence' : 'finding'}</button></div>` : ''}
          </div>
          <div class="bi-actions">
            <button class="icon-btn" data-move="up" data-sec="${esc(section.id)}" aria-label="Move up" ${i === 0 ? 'disabled' : ''}>${icon('chevron-up', 14)}</button>
            <button class="icon-btn" data-move="down" data-sec="${esc(section.id)}" aria-label="Move down" ${i === report.sections.length - 1 ? 'disabled' : ''}>${icon('chevron-down', 14)}</button>
            <button class="icon-btn" data-del-sec="${esc(section.id)}" aria-label="Remove section">${icon('trash', 14)}</button>
          </div>
        </div>`).join('')}
      </div>
      <div class="row wrap" style="gap:8px">
        <select class="select" id="addSectionType" style="width:240px">
          <option value="">+ Add section…</option>
          <option value="summary">Executive summary</option>
          <option value="insights">Verified findings</option>
          <option value="charts">Visual analysis</option>
          <option value="risk">Risk signals</option>
          <option value="quality">Data quality</option>
          <option value="methodology">Methodology</option>
          <option value="limitations">Limitations</option>
          <option value="evidence">Evidence appendix</option>
          <option value="actions">Recommended actions</option>
          <option value="custom">Custom section</option>
        </select>
        <span class="small muted">${all.length} active insights available</span>
      </div>
      <div class="form-grid">
        <div class="field"><label for="rpMethod">Methodology</label><textarea class="input" id="rpMethod" rows="3">${esc(report.methodology || '')}</textarea></div>
        <div class="field"><label for="rpLimits">Limitations (one per line)</label><textarea class="input" id="rpLimits" rows="3">${esc((report.limitations || []).join('\n'))}</textarea></div>
      </div>
    </div>
  </div>`;
}

function refTitle(type, id) {
  if (type === 'charts') return visualizationById(id)?.title || id;
  if (type === 'evidence') return evidenceById(id)?.claim || id;
  return insightById(id)?.title || id;
}

function bindBuilder(root, report) {
  const rerender = () => render(root, { id: report.id, query: new URLSearchParams() });
  document.querySelectorAll('[data-move]').forEach((btn) => btn.addEventListener('click', () => {
    const idx = report.sections.findIndex((s) => s.id === btn.dataset.sec);
    const target = btn.dataset.move === 'up' ? idx - 1 : idx + 1;
    if (target < 0 || target >= report.sections.length) return;
    [report.sections[idx], report.sections[target]] = [report.sections[target], report.sections[idx]];
    save();
    rerender();
  }));
  document.querySelectorAll('[data-del-sec]').forEach((btn) => btn.addEventListener('click', () => {
    report.sections = report.sections.filter((s) => s.id !== btn.dataset.delSec);
    save();
    rerender();
  }));
  document.querySelectorAll('[data-rm-ref]').forEach((btn) => btn.addEventListener('click', () => {
    const section = report.sections.find((s) => s.id === btn.dataset.sec);
    section.refs.splice(Number(btn.dataset.rmRef), 1);
    save();
    rerender();
  }));
  document.getElementById('addSectionType')?.addEventListener('change', (e) => {
    if (!e.target.value) return;
    const labels = {
      summary: 'Executive Summary', insights: 'Verified Findings', charts: 'Visual Analysis', risk: 'Risk Signals',
      quality: 'Data Quality and Limitations', methodology: 'Methodology', limitations: 'Limitations',
      evidence: 'Evidence Appendix', actions: 'Recommended Actions', custom: 'Custom Section',
    };
    report.sections.push({ id: `sec-${Date.now()}`, type: e.target.value, title: labels[e.target.value], body: e.target.value === 'actions' ? [] : '', refs: [] });
    save();
    rerender();
  });
  document.querySelectorAll('[data-add-ref]').forEach((btn) => btn.addEventListener('click', () => {
    openPicker(btn.dataset.secType, report, () => { save(); rerender(); }, root);
  }));

  // persist title/body edits as they are typed
  document.getElementById('rpTitle')?.addEventListener('input', (e) => { report.title = e.target.value; });
  document.getElementById('rpAudience')?.addEventListener('input', (e) => { report.audience = e.target.value; });
  document.getElementById('rpSummary')?.addEventListener('input', (e) => { report.summary = e.target.value; });
  document.getElementById('rpMethod')?.addEventListener('input', (e) => { report.methodology = e.target.value; });
  document.getElementById('rpLimits')?.addEventListener('input', (e) => { report.limitations = e.target.value.split('\n').filter(Boolean); });
  document.getElementById('rpStatus')?.addEventListener('change', (e) => { report.status = e.target.value; });
  document.querySelectorAll('[data-sec-title]').forEach((input) => input.addEventListener('input', () => {
    const sec = report.sections.find((s) => s.id === input.dataset.secTitle);
    if (sec) sec.title = input.value;
  }));
  document.querySelectorAll('[data-sec-body]').forEach((input) => input.addEventListener('input', () => {
    const sec = report.sections.find((s) => s.id === input.dataset.secBody);
    if (!sec) return;
    if (sec.type === 'actions' || sec.type === 'custom' || sec.type === 'summary') {
      sec.body = input.value.includes('\n') ? input.value.split('\n').filter(Boolean) : input.value;
    } else sec.body = input.value;
  }));
}

function openPicker(sectionType, report, onDone, root) {
  const candidates = sectionType === 'charts'
    ? state.data.visualizations.map((v) => ({ id: v.id, title: v.title, meta: `${v.type} · ${v.validationStatus}` }))
    : sectionType === 'evidence'
      ? state.data.evidence.filter((e) => !e.superseded).map((e) => ({ id: e.id, title: e.claim, meta: `${e.id} · ${e.status}` }))
      : activeInsights().map((i) => ({ id: i.id, title: i.title, meta: `${i.category} · ${i.status}` }));
  const { close } = openModal({
    title: `Add ${sectionType === 'charts' ? 'chart' : sectionType === 'evidence' ? 'evidence' : 'finding'}`,
    subtitle: 'Select one or more items to include.',
    size: 'md',
    body: `<div class="stack-sm" style="max-height:420px;overflow-y:auto">
      ${candidates.map((c) => `<label class="checkbox" style="padding:9px 11px;border:1px solid var(--line);border-radius:8px">
        <input type="checkbox" value="${esc(c.id)}" />
        <span>${esc(c.title)}<em>${esc(c.meta)}</em></span>
      </label>`).join('')}
    </div>`,
    footer: `<button class="btn btn-ghost js-close">Cancel</button><button class="btn btn-primary js-confirm">Add selected</button>`,
    onMount: (modalRoot) => {
      modalRoot.querySelector('.js-close').addEventListener('click', close);
      modalRoot.querySelector('.js-confirm').addEventListener('click', () => {
        const picked = Array.from(modalRoot.querySelectorAll('input[type=checkbox]:checked')).map((i) => i.value);
        if (!picked.length) { toast('Nothing selected', 'warning'); return; }
        const section = report.sections.find((s) => s.type === sectionType);
        if (!section) {
          report.sections.push({
            id: `sec-${Date.now()}`, type: sectionType,
            title: sectionType === 'charts' ? 'Visual Analysis' : sectionType === 'evidence' ? 'Evidence Appendix' : 'Verified Findings',
            refs: [],
          });
        }
        const target = report.sections.find((s) => s.type === sectionType);
        picked.forEach((id) => { if (!target.refs.includes(id)) target.refs.push(id); });
        close();
        onDone();
        toast('Added to report', 'success', `${picked.length} item${picked.length === 1 ? '' : 's'} included.`);
      });
    },
  });
}

function saveReport(root, report) {
  report.updatedAt = nowISO();
  if (!report.sections.some((s) => s.type === 'evidence') && state.data.workspace.settings?.allowWarningsInReports !== true) {
    // Evidence appendix is generated automatically from selected findings.
    const ids = new Set();
    report.sections.forEach((s) => ['insights', 'risk'].forEach((t) => { if (s.type === t) (s.refs || []).forEach((r) => ids.add(r)); }));
    const evIds = Array.from(ids).map((id) => insightById(id)?.evidenceId).filter(Boolean);
    if (evIds.length) report.sections.push({ id: `sec-${Date.now()}`, type: 'evidence', title: 'Evidence Appendix', refs: evIds });
  }
  save();
  logActivity('report', 'Report saved', `${report.title} · ${report.sections.length} sections`);
  toast('Report saved', 'success', 'Verification summary updated from the selected findings.');
  builderState.editing = false;
  render(root, { id: report.id, query: new URLSearchParams() });
}

function createReport(root) {
  const { close } = openModal({
    title: 'New report',
    subtitle: 'Start with a skeleton; validated findings and evidence can be added next.',
    size: 'sm',
    body: `<div class="stack-sm">
      <div class="field"><label for="nrTitle">Report title<span class="req">*</span></label><input class="input" id="nrTitle" placeholder="e.g. Q1 2026 Revenue Review" /></div>
      <div class="field"><label for="nrAudience">Audience</label><input class="input" id="nrAudience" placeholder="e.g. Executive leadership team" /></div>
      <div class="callout">${icon('shield', 15)}<div>The verification banner is computed from the findings you include — it cannot be set manually.</div></div>
    </div>`,
    footer: `<button class="btn btn-ghost js-close">Cancel</button><button class="btn btn-primary js-create">Create report</button>`,
    onMount: (modalRoot) => {
      modalRoot.querySelector('.js-close').addEventListener('click', close);
      modalRoot.querySelector('.js-create').addEventListener('click', () => {
        const title = modalRoot.querySelector('#nrTitle').value.trim();
        if (!title) { toast('Title required', 'warning'); return; }
        const report = {
          id: `RPT-${String(state.data.reports.length + 1).padStart(3, '0')}`,
          title,
          audience: modalRoot.querySelector('#nrAudience').value.trim() || 'Internal stakeholders',
          status: 'Draft',
          createdBy: currentUser().id,
          createdAt: nowISO(),
          updatedAt: nowISO(),
          summary: '',
          methodology: 'All figures are computed from the linked dataset versions using deterministic aggregations. Duplicate rows and null metric values are excluded and recorded in each evidence artifact.',
          limitations: ['Comparisons are observational; no causal claims are made.'],
          sections: [
            { id: `sec-${Date.now()}a`, type: 'summary', title: 'Executive Summary', body: '' },
            { id: `sec-${Date.now()}b`, type: 'insights', title: 'Verified Findings', refs: [] },
            { id: `sec-${Date.now()}c`, type: 'charts', title: 'Visual Analysis', refs: [] },
            { id: `sec-${Date.now()}d`, type: 'quality', title: 'Data Quality and Limitations', body: '' },
            { id: `sec-${Date.now()}e`, type: 'evidence', title: 'Evidence Appendix', refs: [] },
            { id: `sec-${Date.now()}f`, type: 'actions', title: 'Recommended Actions', body: [] },
          ],
          exportOptions: ['PDF', 'CSV', 'Evidence bundle'],
        };
        state.data.reports.unshift(report);
        save();
        close();
        builderState.editing = true;
        builderState.reportId = report.id;
        location.hash = `#/reports/${report.id}`;
        toast('Report created', 'success', 'Add validated findings to build the evidence appendix.');
      });
    },
  });
}

/* ---------------- exports ---------------- */

function reportFindings(report) {
  const ids = new Set();
  report.sections.forEach((s) => { if (s.type === 'insights' || s.type === 'risk') (s.refs || []).forEach((id) => ids.add(id)); });
  return Array.from(ids).map((id) => insightById(id)).filter(Boolean);
}

function exportReportCsv(report) {
  const rows = [['Finding', 'Category', 'Status', 'Confidence', 'Evidence ID', 'Evidence status', 'Validation score']];
  reportFindings(report).forEach((ins) => {
    const ev = evidenceById(ins.evidenceId);
    rows.push([ins.title, ins.category, ins.status, ins.confidence, ins.evidenceId, ev ? ev.status : '', ev ? ev.score : '']);
  });
  downloadBlob(toCsv(rows), `${slugify(report.title)}-findings.csv`, 'text/csv;charset=utf-8');
  toast('Report exported', 'success', 'Findings CSV downloaded.');
}

function exportReportBundle(report) {
  const evIds = new Set();
  report.sections.forEach((s) => {
    if (s.type === 'evidence' || s.type === 'metrics') (s.refs || []).forEach((r) => evIds.add(r));
    if (s.type === 'insights' || s.type === 'risk') (s.refs || []).forEach((r) => { const ev = insightById(r)?.evidenceId; if (ev) evIds.add(ev); });
    if (s.type === 'charts') (s.refs || []).forEach((r) => { const ev = visualizationById(r)?.evidenceId; if (ev) evIds.add(ev); });
  });
  const bundle = {
    bundle: 'proof-carrying-data-analyst/report@1',
    exportedAt: nowISO(),
    report,
    verification: reportVerification(report),
    evidence: Array.from(evIds).map((id) => evidenceById(id)).filter(Boolean).map((e) => JSON.parse(evidenceBundle(e))),
  };
  downloadBlob(JSON.stringify(bundle, null, 2), `${slugify(report.title)}-evidence-bundle.json`, 'application/json');
  logActivity('export', 'Report exported', `${report.title} · evidence bundle`);
  toast('Evidence bundle downloaded', 'success', `${evIds.size} artifacts included.`);
}

function shareReport(report) {
  const url = `${location.origin}${location.pathname}#/reports/${report.id}`;
  navigator.clipboard?.writeText(url).then(
    () => toast('Share link copied', 'success', 'Anyone with workspace access can open this report.'),
    () => toast('Share link ready', 'info', url),
  );
  logActivity('export', 'Report shared', `${report.title} · link copied`);
}
