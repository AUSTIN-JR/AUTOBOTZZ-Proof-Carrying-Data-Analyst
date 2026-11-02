/* Evidence proof rendering shared by the drawer and the full Evidence Vault page. */
import {
  state, datasetById, save, insightForEvidence, visualizationById, activeInsights,
  reportById,
} from './store.js';
import { statusBadge, icon, copyChip, toast, openDrawer, openModal, statusTone } from './ui.js';
import {
  esc, fmtInt, fmtDate, fmtDateTime, shortFingerprint, copyText, downloadBlob, toCsv, slugify, nowISO,
} from './util.js';
import { reproduceEvidence } from './calc.js';
import { addRefToReport, markForReview, refreshPage } from './actions.js';

export function linkedChart(ev) {
  return state.data.visualizations.find((v) => v.evidenceId === ev.id) || null;
}
export function linkedAnalysis(ev) {
  return state.data.analyses.find((a) => a.evidenceId === ev.id) || null;
}
export function linkedReports(ev) {
  const insight = insightForEvidence(ev.id);
  return state.data.reports.filter((r) => r.sections.some((s) => {
    const refs = s.refs || [];
    return refs.includes(ev.id) || (insight && refs.includes(insight.id));
  }));
}

export function evidenceHero(ev) {
  const scoreTone = ev.score >= 92 ? 'green' : ev.score >= 80 ? 'amber' : 'red';
  return `<section class="proof-hero">
    <div class="proof-hero-top">
      ${statusBadge(ev.superseded ? 'Superseded' : ev.status)}
      <span class="badge badge-blue">${esc(ev.type)}</span>
      <span class="badge badge-slate">${esc(ev.id)}</span>
      ${ev.claim && /\b(proves|proven|causes|caused)\b/i.test(ev.claim) ? `<span class="badge badge-red">Causal language flagged</span>` : ''}
    </div>
    <p class="proof-claim">${esc(ev.claim)}</p>
    <dl class="proof-hero-meta">
      <div><dt>Dataset</dt><dd>${esc(ev.datasetName)} · v${ev.versionNumber}</dd></div>
      <div><dt>Validation score</dt><dd>${ev.score} / 100</dd></div>
      <div><dt>Confidence</dt><dd>${esc(ev.confidence)}</dd></div>
      <div><dt>Owner</dt><dd>${esc(ev.owner)}</dd></div>
      <div><dt>Created</dt><dd>${fmtDate(ev.createdAt)}</dd></div>
    </dl>
  </section>`;
}

export function verificationSection(ev) {
  const cats = [
    ['Data Integrity', ev.categories.integrity], ['Methodology', ev.categories.methodology],
    ['Statistical Reliability', ev.categories.statistical], ['Reproducibility', ev.categories.reproducibility],
    ['Documentation', ev.categories.documentation],
  ];
  const tone = (n) => (n >= 92 ? 'green' : n >= 80 ? 'amber' : 'red');
  return `<section class="proof-section">
    <div class="proof-section-head"><span class="proof-num">2</span><h3>Verification status</h3></div>
    <div class="validation-score">
      <div>
        <div class="vs-value">${ev.score}<small>/100</small></div>
        <p>Validation score</p>
      </div>
      <div class="vs-bars">
        ${cats.map(([label, n]) => `<div class="vs-bar"><span>${label}</span><div class="meter"><i class="${tone(n)}" style="width:${n}%"></i></div><b>${n}</b></div>`).join('')}
      </div>
    </div>
    <div class="row wrap" style="margin-top:12px;gap:8px">
      ${statusBadge(ev.superseded ? 'Superseded' : ev.status)}
      <span class="chip">Confidence: ${esc(ev.confidence)}</span>
      <span class="chip">${ev.checks.filter((c) => c.status === 'pass').length}/${ev.checks.length} checks passed</span>
      ${ev.checks.some((c) => c.status === 'fail') ? '<span class="badge badge-red">Cannot be labelled Verified</span>' : ''}
      ${ev.checks.some((c) => c.status === 'warn') ? '<span class="badge badge-amber">Needs review before decision use</span>' : ''}
    </div>
  </section>`;
}

export function sourceSection(ev) {
  const ds = datasetById(ev.datasetId);
  return `<section class="proof-section">
    <div class="proof-section-head"><span class="proof-num">3</span><h3>Source data</h3></div>
    <dl class="kv-grid">
      <div class="kv"><dt>Dataset</dt><dd>${esc(ev.datasetName)}</dd></div>
      <div class="kv"><dt>Version</dt><dd>v${ev.versionNumber}${ev.superseded ? ' (superseded)' : ''}</dd></div>
      <div class="kv"><dt>Source fields</dt><dd>${ev.sourceFields.map(esc).join(', ') || 'Whole table'}</dd></div>
      <div class="kv"><dt>Source row count</dt><dd>${fmtInt(ev.sourceRowCount)}</dd></div>
    </dl>
    <div style="margin-top:12px">
      <div class="tiny muted" style="margin-bottom:4px">Dataset fingerprint</div>
      ${copyChip(ev.fingerprint, shortFingerprint(ev.fingerprint))}
    </div>
    ${ds ? `<p class="proof-note" style="margin-top:10px">Row counts reflect the imported version, not the filtered selection. Reproduce recomputes against the stored version fingerprint.</p>` : ''}
  </section>`;
}

export function selectionSection(ev) {
  const sel = ev.selection;
  return `<section class="proof-section">
    <div class="proof-section-head"><span class="proof-num">4</span><h3>Data selection</h3></div>
    <div class="callout" style="margin-bottom:12px">${icon('filter', 15)}<div>${esc(sel.description)}</div></div>
    <dl class="kv-grid">
      <div class="kv"><dt>Rows before selection</dt><dd>${fmtInt(sel.rowsBefore)}</dd></div>
      <div class="kv"><dt>Rows included</dt><dd>${fmtInt(sel.rowsAfter)}</dd></div>
      <div class="kv"><dt>Rows excluded</dt><dd>${fmtInt(sel.excluded)}</dd></div>
      <div class="kv"><dt>Duplicate records excluded</dt><dd>${fmtInt(sel.duplicatesExcluded)}</dd></div>
    </dl>
  </section>`;
}

export function transformSection(ev) {
  return `<section class="proof-section">
    <div class="proof-section-head"><span class="proof-num">5</span><h3>Transformation log</h3></div>
    <div class="transform-log">
      ${ev.transformLog.map((step, i) => `<div class="tl-step">
        <span class="step-num">${i + 1}</span>
        <div><strong>${esc(step.step)}</strong><span>${esc(step.detail)}</span></div>
      </div>`).join('')}
    </div>
  </section>`;
}

export function codeBlock(ev) {
  return `<div class="code-block">
    <div class="code-head"><span>Reproducible computation</span><button type="button" data-act="copy-code">${icon('copy', 12)} Copy</button></div><code>${esc(ev.computation.code)}</code>
  </div>`;
}

export function computationSection(ev) {
  return `<section class="proof-section">
    <div class="proof-section-head"><span class="proof-num">6</span><h3>Reproducible computation</h3></div>
    ${codeBlock(ev)}
    ${ev.computation.resultLines?.length ? `<div class="result-lines">
      ${ev.computation.resultLines.map((l) => `<div class="result-line"><span>${esc(l.label)}</span><strong>${esc(l.value)}</strong></div>`).join('')}
    </div>` : ''}
    <p class="proof-note" style="margin-top:10px"><strong>Method.</strong> ${esc(ev.methodology)}</p>
  </section>`;
}

export function checksSection(ev) {
  return `<section class="proof-section">
    <div class="proof-section-head"><span class="proof-num">7</span><h3>Validation checks</h3></div>
    <div class="checks">
      ${ev.checks.map((c) => `<div class="check-row check-${c.status}">
        <span class="check-icon">${icon(c.status === 'pass' ? 'check' : c.status === 'warn' ? 'alert' : 'x', 11)}</span>
        <div><strong>${esc(checkLabel(c))}</strong><span>${esc(c.detail)}</span></div>
        <span class="badge badge-${c.status === 'pass' ? 'green' : c.status === 'warn' ? 'amber' : 'red'}" style="margin-left:auto">${c.status === 'pass' ? 'Pass' : c.status === 'warn' ? 'Warning' : 'Fail'}</span>
      </div>`).join('')}
    </div>
  </section>`;
}

const CHECK_LABELS = {
  fingerprint: 'Dataset fingerprint matches source version',
  schema: 'Required source columns exist',
  types: 'Data types are valid',
  duplicates: 'Duplicate rows identified',
  nulls: 'Null-value impact assessed',
  outliers: 'Outliers assessed',
  formula: 'Formula / query successfully executed',
  assumptions: 'Statistical assumptions documented',
  sample: 'Sample size threshold met',
  significance: 'Statistical significance checked when relevant',
  causal: 'Correlation labelled non-causal',
  reproduction: 'Reproduction run matches original result',
  linked: 'Evidence linked to the resulting claim',
};

export function checkLabel(c) {
  return CHECK_LABELS[c.key] || c.label || c.key;
}

export function assumptionsSection(ev) {
  return `<section class="proof-section">
    <div class="proof-section-head"><span class="proof-num">8</span><h3>Assumptions and limitations</h3></div>
    <ul style="margin:0;padding-left:18px;display:flex;flex-direction:column;gap:6px">
      ${ev.assumptions.map((a) => `<li class="small" style="color:var(--ink-2);line-height:1.6">${esc(a)}</li>`).join('')}
      ${ev.caveats.map((c) => `<li class="small" style="color:var(--amber);line-height:1.6">${esc(c)}</li>`).join('')}
    </ul>
  </section>`;
}

export function artifactsSection(ev) {
  const chart = linkedChart(ev);
  const run = linkedAnalysis(ev);
  const reports = linkedReports(ev);
  const items = [];
  if (chart) items.push({ icon: 'chart', label: chart.title, meta: 'Linked visualization', nav: `#/visualizations?chart=${encodeURIComponent(chart.id)}` });
  if (run) items.push({ icon: 'studio', label: run.title, meta: 'Linked analysis run', nav: `#/studio?run=${encodeURIComponent(run.id)}` });
  reports.forEach((r) => items.push({ icon: 'report', label: r.title, meta: `Report · ${r.status}`, nav: `#/reports/${encodeURIComponent(r.id)}` }));
  items.push({ icon: 'table', label: 'CSV extract', meta: 'Download the selected result rows', act: 'csv' });
  items.push({ icon: 'sigma', label: 'Calculation specification', meta: 'Deterministic formula shown above', act: 'copy-code' });
  items.push({ icon: 'shield', label: 'Validation log', meta: `${ev.checks.length} checks recorded`, act: 'log' });
  return `<section class="proof-section">
    <div class="proof-section-head"><span class="proof-num">9</span><h3>Supporting artifacts</h3></div>
    <div class="artifact-grid">
      ${items.map((it) => `<button type="button" class="artifact-chip" ${it.nav ? `data-nav="${it.nav}"` : `data-act="${it.act}"`}>
        ${icon(it.icon, 15)}<span>${esc(it.label)}<span class="ac-meta">${esc(it.meta)}</span></span>
      </button>`).join('')}
    </div>
  </section>`;
}

export function reproductionResultHtml(result) {
  const ok = result.digestMatch && result.fingerprintMatch;
  return `<div class="reproduce-result ${ok ? 'match' : 'mismatch'}">
    <div class="reproduce-head ${ok ? '' : 'mismatch'}">
      ${icon(ok ? 'check' : 'alert', 15)}
      ${ok ? 'Reproduction completed successfully. The recalculated result matches the original result.' : result.error ? 'Reproduction failed.' : 'Reproduction mismatch — the recomputed result differs from the stored result.'}
    </div>
    <div class="reproduce-body">
      <div class="kv"><dt>Original result</dt><dd>${esc(result.original)}</dd></div>
      <div class="kv"><dt>Reproduced result</dt><dd>${esc(result.reproduced)}</dd></div>
      <div class="kv"><dt>Match status</dt><dd>${ok ? 'Match' : 'Mismatch'}</dd></div>
      <div class="kv"><dt>Timestamp</dt><dd>${fmtDateTime(result.timestamp)}</dd></div>
      <div class="kv"><dt>Fingerprint match</dt><dd>${result.fingerprintMatch ? 'Yes' : `No — evidence used v${result.versionNumber}, current version is v${result.currentVersionNumber ?? '—'}`}</dd></div>
      <div class="kv"><dt>Result digest</dt><dd>${esc(result.reproducedDigest || '—')}</dd></div>
    </div>
    ${result.error ? `<div class="callout danger" style="margin:0 14px 14px">${icon('alert', 15)}<div>${esc(result.error)}</div></div>` : ''}
    ${!result.fingerprintMatch && result.digestMatch ? '<div class="callout warn" style="margin:0 14px 14px">' + icon('info', 15) + '<div>The arithmetic reproduces exactly, but this artifact was computed on an earlier dataset version, so it cannot be used as evidence for the current data.</div></div>' : ''}
  </div>`;
}

export function reproductionSection(ev) {
  return `<section class="proof-section">
    <div class="proof-section-head"><span class="proof-num">10</span><h3>Reproduction</h3></div>
    <div id="repro-${ev.id}">${ev.lastReproduction ? reproductionResultHtml(ev.lastReproduction) : `<div class="callout">${icon('play', 15)}<div>Run the deterministic computation again from the stored selection and compare it with the original result. Nothing about the formula changes between runs.</div></div>`}</div>
    <div class="row wrap" style="margin-top:12px">
      <button class="btn btn-secondary" data-act="reproduce">${icon('refresh', 15)} Reproduce Analysis</button>
      <span class="small muted">Recompute is deterministic; expected match is exact.</span>
    </div>
  </section>`;
}

export function proofSections(ev) {
  return [verificationSection(ev), sourceSection(ev), selectionSection(ev), transformSection(ev),
    computationSection(ev), checksSection(ev), assumptionsSection(ev), artifactsSection(ev), reproductionSection(ev)].join('');
}

export function evidenceCsv(ev) {
  const rows = [['Field', 'Value'], ['Evidence ID', ev.id], ['Claim', ev.claim], ['Status', ev.status],
    ['Dataset', ev.datasetName], ['Version', `v${ev.versionNumber}`], ['Fingerprint', ev.fingerprint],
    ['Selection', ev.selection.description], ['Rows before', ev.selection.rowsBefore], ['Rows included', ev.selection.rowsAfter],
    ['Validation score', ev.score], ['Method', ev.methodology]];
  ev.computation.resultLines.forEach((l) => rows.push([l.label, l.value]));
  return toCsv(rows);
}

export function evidenceBundle(ev) {
  return JSON.stringify({
    bundle: 'proof-carrying-data-analyst/evidence@1',
    generatedAt: nowISO(),
    evidence: ev,
    dataset: (() => {
      const ds = datasetById(ev.datasetId);
      if (!ds) return null;
      const version = ds.versions.find((v) => v.id === ev.datasetVersionId);
      return { id: ds.id, name: ds.name, sourceType: ds.sourceType, version, quality: ds.quality?.score };
    })(),
    reproduction: ev.lastReproduction || null,
  }, null, 2);
}

function download(name, content, type) {
  downloadBlob(content, name, type);
  toast('Download started', 'success', name);
}

export async function runReproduction(ev, mount) {
  if (mount) {
    mount.innerHTML = `<div class="reproduce-result"><div class="reproduce-head" style="background:var(--blue-50);color:var(--blue-600)"><span class="spinner"></span> Recomputing from v${ev.versionNumber} · ${esc(shortFingerprint(ev.fingerprint))}</div></div>`;
  }
  await new Promise((r) => setTimeout(r, 700));
  const ds = datasetById(ev.datasetId);
  let result;
  if (!ds) {
    result = { original: ev.displayValue, reproduced: 'Dataset unavailable', match: false, digestMatch: false, fingerprintMatch: false, error: 'The source dataset is no longer in the workspace.', timestamp: nowISO(), versionNumber: ev.versionNumber };
  } else {
    result = reproduceEvidence(ev, ds);
  }
  ev.lastReproduction = result;
  ev.lastReproducedAt = result.timestamp;
  save();
  const ok = result.digestMatch && result.fingerprintMatch;
  if (mount) mount.innerHTML = reproductionResultHtml(result);
  toast(ok ? 'Reproduction completed successfully.' : 'Reproduction mismatch detected',
    ok ? 'success' : 'error',
    ok ? 'The recalculated result matches the original result.' : 'The recomputed result does not match the stored evidence.');
}

export function bindEvidence(root, ev) {
  root.querySelectorAll('[data-act]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const act = btn.dataset.act;
      if (act === 'reproduce') {
        btn.disabled = true;
        const mount = root.querySelector(`#repro-${ev.id}`);
        await runReproduction(ev, mount);
        btn.disabled = false;
      } else if (act === 'copy-code') {
        const ok = await copyText(ev.computation.code);
        toast(ok ? 'Calculation copied' : 'Copy failed', ok ? 'success' : 'error');
      } else if (act === 'bundle') {
        download(`${ev.id.toLowerCase()}-evidence-bundle.json`, evidenceBundle(ev), 'application/json');
      } else if (act === 'csv') {
        download(`${ev.id.toLowerCase()}-extract.csv`, evidenceCsv(ev), 'text/csv;charset=utf-8');
      } else if (act === 'log') {
        download(`${ev.id.toLowerCase()}-validation-log.txt`, ev.checks.map((c) => `[${c.status.toUpperCase()}] ${checkLabel(c)} — ${c.detail}`).join('\n'));
      } else if (act === 'add-report') {
        const insight = insightForEvidence(ev.id);
        addRefToReport({ type: 'evidence', id: ev.id, label: insight ? insight.title : ev.claim });
      } else if (act === 'flag') {
        const insight = insightForEvidence(ev.id);
        if (insight) markForReview(insight.id);
        else toast('No linked insight', 'info', 'Flag the insight or chart that uses this artifact.');
      } else if (act === 'full-proof') {
        location.hash = `#/evidence/${encodeURIComponent(ev.id)}`;
      }
    });
  });
  root.querySelectorAll('[data-nav]').forEach((btn) => {
    btn.addEventListener('click', () => { location.hash = btn.dataset.nav; });
  });
}

export function openEvidencePanel(evidenceId) {
  const ev = state.data.evidence.find((e) => e.id === evidenceId);
  if (!ev) return;
  const insight = insightForEvidence(ev.id);
  const body = `<div class="stack">
    ${evidenceHero(ev)}
    ${verificationSection(ev)}
    ${sourceSection(ev)}
    ${selectionSection(ev)}
    ${transformSection(ev)}
    ${computationSection(ev)}
    ${checksSection(ev)}
    ${assumptionsSection(ev)}
    ${artifactsSection(ev)}
    ${reproductionSection(ev)}
  </div>`;
  const footer = `<button class="btn btn-ghost" data-act="full-proof">${icon('shield', 15)} Open full proof trail</button>
    <span class="grow"></span>
    <button class="btn btn-secondary" data-act="add-report">Add to report</button>
    <button class="btn btn-secondary" data-act="bundle">${icon('download', 15)} Evidence bundle</button>
    <button class="btn btn-primary" data-act="reproduce">${icon('refresh', 15)} Reproduce Analysis</button>`;
  const panel = openDrawer({ title: insight ? insight.title : ev.claim, subtitle: `${ev.id} · ${ev.type} · v${ev.versionNumber}`, body, footer, width: 'evidence' });
  bindEvidence(panel.overlay, ev);
}

export function openInsightProof(insightId) {
  const insight = activeInsights().find((i) => i.id === insightId);
  if (!insight) return;
  if (insight.evidenceId) openEvidencePanel(insight.evidenceId);
  else toast('No evidence artifact', 'info', 'This insight has no linked proof record.');
}
