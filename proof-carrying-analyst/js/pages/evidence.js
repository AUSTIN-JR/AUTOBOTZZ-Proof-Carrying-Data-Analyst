/* Evidence Vault: audit list and the full proof trail. */
import {
  state, activeEvidence, datasetById, insightForEvidence, evidenceById, save, addNotification, logActivity,
} from '../store.js';
import { pageHeader, statusBadge, icon, emptyState, toast, copyChip } from '../ui.js';
import {
  esc, fmtInt, fmtDate, fmtDateTime, fmtPct, shortFingerprint, downloadBlob, toCsv, slugify,
} from '../util.js';
import {
  evidenceHero, proofSections, bindEvidence, reproductionResultHtml, evidenceCsv, evidenceBundle,
} from '../evidencePanel.js';
import { addRefToReport, markForReview } from '../actions.js';

const vault = { q: '', type: 'all', status: 'all', dataset: 'all', owner: 'all' };

export function render(root, params) {
  if (params.id) {
    renderDetail(root, params.id);
    return;
  }
  const all = state.data.evidence;
  const types = Array.from(new Set(all.map((e) => e.type)));
  const datasets = state.data.datasets.filter((d) => !d.archived);
  const owners = Array.from(new Set(all.map((e) => e.owner)));
  const statuses = ['Verified', 'Reproducible', 'Needs Review', 'Failed Validation', 'Superseded'];
  const datasetParam = params.query.get('dataset');
  if (datasetParam) vault.dataset = datasetParam;

  const list = all.filter((e) => {
    if (vault.q && !`${e.id} ${e.claim} ${e.datasetName} ${e.owner}`.toLowerCase().includes(vault.q.toLowerCase())) return false;
    if (vault.type !== 'all' && e.type !== vault.type) return false;
    if (vault.status !== 'all' && (e.superseded ? 'Superseded' : e.status) !== vault.status) return false;
    if (vault.dataset !== 'all' && e.datasetId !== vault.dataset) return false;
    if (vault.owner !== 'all' && e.owner !== vault.owner) return false;
    return true;
  });

  root.innerHTML = `<div class="stack">
    ${pageHeader({
    eyebrow: 'Evidence Vault',
    title: 'Every claim, with its proof',
    description: 'This is the audit surface of the workspace: the claim, the version it was computed on, the selection, the transformation log, the formula and the validation result. Nothing here is narrative-only.',
    actions: `<button class="btn btn-secondary" id="vaultExport">${icon('download', 15)} Export index (CSV)</button>
        <button class="btn btn-secondary" id="vaultBundle">${icon('shield', 15)} Download all bundles</button>`,
  })}

    <div class="stat-grid">
      ${vaultStat('Verified', all.filter((e) => !e.superseded && e.status === 'Verified').length, 'shield', 'green')}
      ${vaultStat('Reproducible', all.filter((e) => !e.superseded && e.status === 'Reproducible').length, 'refresh', 'teal')}
      ${vaultStat('Needs review', all.filter((e) => !e.superseded && e.status === 'Needs Review').length, 'clock', 'amber')}
      ${vaultStat('Failed validation', all.filter((e) => !e.superseded && e.status === 'Failed Validation').length, 'x', 'red')}
      ${vaultStat('Superseded', all.filter((e) => e.superseded).length, 'history', 'blue')}
    </div>

    <div class="card">
      <div class="table-toolbar">
        <div class="search-field grow">${icon('search', 14)}<input class="input" id="evSearch" type="search" placeholder="Search claims, evidence IDs, owners" value="${esc(vault.q)}" aria-label="Search evidence" /></div>
        <select class="select" id="evType" aria-label="Filter by type">
          <option value="all">All types</option>
          ${types.map((t) => `<option value="${esc(t)}" ${vault.type === t ? 'selected' : ''}>${esc(t)}</option>`).join('')}
        </select>
        <select class="select" id="evStatus" aria-label="Filter by status">
          <option value="all">All statuses</option>
          ${statuses.map((s) => `<option value="${esc(s)}" ${vault.status === s ? 'selected' : ''}>${esc(s)}</option>`).join('')}
        </select>
        <select class="select" id="evDataset" aria-label="Filter by dataset">
          <option value="all">All datasets</option>
          ${datasets.map((d) => `<option value="${esc(d.id)}" ${vault.dataset === d.id ? 'selected' : ''}>${esc(d.name)}</option>`).join('')}
        </select>
        <select class="select" id="evOwner" aria-label="Filter by owner">
          <option value="all">All owners</option>
          ${owners.map((o) => `<option value="${esc(o)}" ${vault.owner === o ? 'selected' : ''}>${esc(o)}</option>`).join('')}
        </select>
        <span class="small muted">${list.length} of ${all.length}</span>
        ${vault.q || vault.type !== 'all' || vault.status !== 'all' || vault.dataset !== 'all' || vault.owner !== 'all' ? '<button class="btn btn-ghost btn-sm" id="evClear">Clear</button>' : ''}
      </div>
      ${list.length === 0
    ? emptyState({ iconName: 'search', title: 'No evidence matches this search', message: 'Try a different claim, evidence ID, dataset or status. Evidence is never deleted when a finding is rejected — it is retained with a failing status.', action: '<button class="btn btn-secondary" id="evClearEmpty">Clear filters</button>' })
    : `<div class="table-wrap"><table class="data">
          <thead><tr><th>Evidence ID</th><th>Claim</th><th>Type</th><th>Dataset version</th><th>Status</th><th>Confidence</th><th>Created</th><th>Owner</th><th></th></tr></thead>
          <tbody>${list.map((e) => `<tr>
            <td class="mono small"><a href="#/evidence/${e.id}">${esc(e.id)}</a></td>
            <td class="small" style="max-width:420px"><span class="cell-strong">${esc(e.claim.length > 120 ? e.claim.slice(0, 120) + '…' : e.claim)}</span></td>
            <td><span class="chip">${esc(e.type)}</span></td>
            <td class="small">${esc(e.datasetName)}<div class="tiny muted">v${e.versionNumber} · ${esc(shortFingerprint(e.fingerprint))}</div></td>
            <td>${statusBadge(e.superseded ? 'Superseded' : e.status)}</td>
            <td class="small">${esc(e.confidence)}<div class="tiny muted">${e.score}/100</div></td>
            <td class="small">${fmtDate(e.createdAt)}</td>
            <td class="small">${esc(e.owner)}</td>
            <td class="num"><div class="row-actions">
              <a class="icon-btn" title="Open proof" href="#/evidence/${e.id}" aria-label="Open ${esc(e.id)}">${icon('external', 15)}</a>
              <button class="icon-btn" title="Reproduce" data-repro="${esc(e.id)}" aria-label="Reproduce ${esc(e.id)}">${icon('refresh', 15)}</button>
            </div></td>
          </tr>`).join('')}</tbody>
        </table></div>`}
    </div>
  </div>`;

  document.getElementById('evSearch')?.addEventListener('input', (e) => { vault.q = e.target.value; render(root, { id: null, query: new URLSearchParams(vault.dataset !== 'all' ? `dataset=${vault.dataset}` : '') }); document.getElementById('evSearch').focus(); });
  document.getElementById('evType')?.addEventListener('change', (e) => { vault.type = e.target.value; render(root, { id: null, query: new URLSearchParams() }); });
  document.getElementById('evStatus')?.addEventListener('change', (e) => { vault.status = e.target.value; render(root, { id: null, query: new URLSearchParams() }); });
  document.getElementById('evDataset')?.addEventListener('change', (e) => { vault.dataset = e.target.value; render(root, { id: null, query: new URLSearchParams() }); });
  document.getElementById('evOwner')?.addEventListener('change', (e) => { vault.owner = e.target.value; render(root, { id: null, query: new URLSearchParams() }); });
  document.getElementById('evClear')?.addEventListener('click', () => { Object.assign(vault, { q: '', type: 'all', status: 'all', dataset: 'all', owner: 'all' }); render(root, { id: null, query: new URLSearchParams() }); });
  document.getElementById('evClearEmpty')?.addEventListener('click', () => { Object.assign(vault, { q: '', type: 'all', status: 'all', dataset: 'all', owner: 'all' }); render(root, { id: null, query: new URLSearchParams() }); });

  document.getElementById('vaultExport')?.addEventListener('click', () => {
    const rows = [['Evidence ID', 'Claim', 'Type', 'Dataset', 'Version', 'Fingerprint', 'Status', 'Score', 'Confidence', 'Created', 'Owner']];
    list.forEach((e) => rows.push([e.id, e.claim, e.type, e.datasetName, `v${e.versionNumber}`, e.fingerprint, e.superseded ? 'Superseded' : e.status, e.score, e.confidence, e.createdAt, e.owner]));
    downloadBlob(toCsv(rows), 'evidence-vault-index.csv', 'text/csv;charset=utf-8');
    toast('Evidence index exported', 'success', `${list.length} artifacts written to CSV.`);
  });
  document.getElementById('vaultBundle')?.addEventListener('click', () => {
    const bundles = list.map((e) => JSON.parse(evidenceBundle(e)));
    downloadBlob(JSON.stringify({ bundle: 'proof-carrying-data-analyst/vault@1', exportedAt: new Date().toISOString(), artifacts: bundles }, null, 2), 'evidence-vault-bundles.json', 'application/json');
    toast('Evidence bundles downloaded', 'success', `${list.length} bundles exported as JSON.`);
  });
  document.querySelectorAll('[data-repro]').forEach((btn) => btn.addEventListener('click', async () => {
    const { openEvidencePanel } = await import('../evidencePanel.js');
    openEvidencePanel(btn.dataset.repro);
  }));
}

function vaultStat(label, value, iconName, tone) {
  return `<article class="stat-card">
    <div class="stat-top"><span class="stat-label">${esc(label)}</span><span class="stat-icon ${tone}">${icon(iconName, 14)}</span></div>
    <div class="stat-value">${value}</div>
  </article>`;
}

function renderDetail(root, id) {
  const ev = evidenceById(id);
  if (!ev) {
    root.innerHTML = `<div class="card">${emptyState({ iconName: 'shield', title: 'Evidence not found', message: 'This artifact may have been excluded from the workspace.', action: '<a class="btn btn-primary" href="#/evidence">Back to Evidence Vault</a>' })}</div>`;
    return;
  }
  const insight = insightForEvidence(ev.id);
  const ds = datasetById(ev.datasetId);
  root.innerHTML = `<div class="stack">
    <a class="link-btn" href="#/evidence">${icon('chevron-left', 13)} Evidence Vault</a>
    ${evidenceHero(ev)}
    <div class="proof-grid">
      <div class="card">
        ${proofSections(ev)}
      </div>
      <aside class="stack">
        <div class="card">
          <div class="card-head"><h2>Actions</h2><span class="badge badge-slate">10</span></div>
          <div class="card-body stack-sm">
            <button class="btn btn-primary btn-block" data-act="reproduce">${icon('refresh', 15)} Reproduce Analysis</button>
            <button class="btn btn-secondary btn-block" data-act="bundle">${icon('download', 15)} Download Evidence Bundle</button>
            <button class="btn btn-secondary btn-block" data-act="csv">${icon('table', 15)} Download CSV Extract</button>
            <button class="btn btn-secondary btn-block" data-act="copy-code">${icon('copy', 15)} Copy Calculation</button>
            <button class="btn btn-secondary btn-block" data-act="add-report">${icon('plus', 15)} Add to Report</button>
            ${insight ? `<button class="btn btn-ghost btn-block" data-act="flag">${icon('flag', 15)} Flag for Review</button>` : ''}
          </div>
        </div>

        ${insight ? `<div class="card">
          <div class="card-head"><h2>Linked insight</h2></div>
          <div class="card-body stack-sm">
            <a href="#/insights?insight=${encodeURIComponent(insight.id)}" style="font-weight:600;font-size:13px;color:var(--ink)">${esc(insight.title)}</a>
            <div class="row wrap" style="gap:6px">${statusBadge(insight.status)}<span class="chip">${esc(insight.category)}</span><span class="chip">${insight.confidence}% confidence</span></div>
            <p class="small muted" style="line-height:1.6">${esc(insight.interpretation)}</p>
          </div>
        </div>` : ''}

        <div class="card">
          <div class="card-head"><h2>Dataset</h2></div>
          <div class="card-body stack-sm">
            <a href="#/datasets/${ev.datasetId}" style="font-weight:600;font-size:13px;color:var(--ink)">${esc(ev.datasetName)}</a>
            <div class="kv"><dt>Version</dt><dd>v${ev.versionNumber}${ev.superseded ? ' (superseded)' : ''}</dd></div>
            <div class="kv"><dt>Fingerprint</dt><dd>${copyChip(ev.fingerprint, shortFingerprint(ev.fingerprint))}</dd></div>
            <div class="kv"><dt>Quality score</dt><dd>${ds ? `${ds.quality.score}/100` : '—'}</dd></div>
            <div class="kv"><dt>Records in scope</dt><dd>${fmtInt(ev.selection.rowsAfter)} of ${fmtInt(ev.selection.rowsBefore)}</dd></div>
          </div>
        </div>

        <div class="card">
          <div class="card-head"><h2>Reproduction history</h2></div>
          <div class="card-body">
            ${ev.lastReproduction
    ? `<div class="stack-sm">
                <div class="row-between"><span class="small muted">Last run</span><strong class="small">${fmtDateTime(ev.lastReproduction.timestamp)}</strong></div>
                <div class="row-between"><span class="small muted">Result</span>${statusBadge(ev.lastReproduction.digestMatch && ev.lastReproduction.fingerprintMatch ? 'Verified' : 'Failed Validation')}</div>
                <p class="tiny muted">${ev.lastReproduction.digestMatch ? 'Recalculated value matches the stored digest.' : 'Recalculated value differs from the stored digest.'}</p>
              </div>`
    : `<p class="small muted">This artifact has not been re-run in this session. Use “Reproduce Analysis” to recompute and compare.</p>`}
          </div>
        </div>
      </aside>
    </div>
  </div>`;
  bindEvidence(root, ev);
  // The full page needs its Actions column to trigger the same reproduce mount.
  root.querySelectorAll('.card [data-act="reproduce"]').forEach((btn) => {
    if (btn.dataset.bound) return;
    btn.dataset.bound = '1';
  });
}
