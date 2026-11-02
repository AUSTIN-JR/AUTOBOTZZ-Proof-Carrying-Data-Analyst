/* AI Insights workspace. */
import {
  state, activeInsights, currentUser, save, logActivity, addNotification, datasetById, versionOf, insightById,
} from '../store.js';
import { pageHeader, statusBadge, icon, emptyState, openModal, toast, statusTone } from '../ui.js';
import { esc, fmtInt, fmtPct, fmtSigned, fmtCompactMoney, nowISO, uid } from '../util.js';
import { buildEvidence, scoreChecks, deriveStatus } from '../calc.js';
import { insightCardHtml, openInsightDrawer, insightForCardActions, CATEGORY_TONE, CATEGORY_ICON } from '../insightPanel.js';

const filters = { status: 'all', importance: 'all', category: 'all', q: '' };
const STATUSES = ['All', 'Verified', 'Needs Review', 'Warning', 'Rejected', 'Archived'];
const IMPORTANCE = ['All', 'High', 'Medium', 'Low'];
const CATEGORIES = ['All', 'Trend', 'Correlation', 'Anomaly', 'Segment', 'Forecast', 'Data Quality'];

export function render(root, params) {
  const all = state.data.insights;
  const active = activeInsights();
  const counts = {
    Verified: active.filter((i) => i.status === 'Verified').length,
    'Needs Review': active.filter((i) => i.status === 'Needs Review').length,
    Warning: active.filter((i) => i.status === 'Warning').length,
    Rejected: active.filter((i) => i.status === 'Rejected').length,
  };
  const list = all.filter((i) => {
    if (filters.status === 'Archived') { if (!i.archived) return false; }
    else if (filters.status !== 'all') { if (i.archived || i.status !== filters.status) return false; }
    else if (i.archived) return false;
    if (filters.importance !== 'all' && i.importance !== filters.importance) return false;
    if (filters.category !== 'all' && i.category !== filters.category) return false;
    if (filters.q && !`${i.title} ${i.description} ${i.category}`.toLowerCase().includes(filters.q.toLowerCase())) return false;
    return true;
  });

  root.innerHTML = `<div class="stack">
    ${pageHeader({
    eyebrow: 'AI insights',
    title: 'Insight workspace',
    description: 'The model explains computed results. Every insight states its confidence, caveats, what it does not prove, and links to the calculation that produced it.',
    actions: `<button class="btn btn-secondary" id="insightExport">${icon('download', 15)} Export list</button>
        <button class="btn btn-primary" id="generateInsights">${icon('sparkles', 15)} Generate Insights</button>`,
  })}

    <div class="stat-grid">
      ${miniStat('Verified', counts.Verified, 'shield', 'green', 'Passing validation and reproducible')}
      ${miniStat('Needs review', counts['Needs Review'], 'clock', 'amber', 'Warnings must be reviewed before decision use')}
      ${miniStat('Warnings', counts.Warning, 'alert', 'amber', 'Data-quality or interpretation caveats')}
      ${miniStat('Rejected', counts.Rejected, 'x', 'red', 'Failed validation — excluded from reports')}
    </div>

    <div class="card">
      <div class="table-toolbar">
        <div class="search-field grow">${icon('search', 14)}<input class="input" id="inSearch" type="search" placeholder="Search insights" value="${esc(filters.q)}" aria-label="Search insights" /></div>
        <select class="select" id="inStatus" aria-label="Filter by status">
          ${STATUSES.map((s) => `<option value="${s === 'All' ? 'all' : s}" ${filters.status === (s === 'All' ? 'all' : s) ? 'selected' : ''}>${s === 'All' ? 'All statuses' : s}</option>`).join('')}
        </select>
        <select class="select" id="inImportance" aria-label="Filter by importance">
          ${IMPORTANCE.map((s) => `<option value="${s === 'All' ? 'all' : s}" ${filters.importance === (s === 'All' ? 'all' : s) ? 'selected' : ''}>${s === 'All' ? 'All importance' : s}</option>`).join('')}
        </select>
        <select class="select" id="inCategory" aria-label="Filter by category">
          ${CATEGORIES.map((s) => `<option value="${s === 'All' ? 'all' : s}" ${filters.category === (s === 'All' ? 'all' : s) ? 'selected' : ''}>${s === 'All' ? 'All categories' : s}</option>`).join('')}
        </select>
        <span class="small muted">${list.length} insights</span>
      </div>
      <div class="card-foot" style="border-top:none;padding:10px 16px;background:var(--surface-2)">
        ${icon('info', 14)}<span class="tiny muted" style="flex:1">${all.filter((i) => i.archived).length} archived insights from earlier dataset versions are retained for audit but excluded from the active workspace.</span>
        <button class="link-btn" id="showArchived">${filters.status === 'Archived' ? 'Hide archived' : 'Show archived'}</button>
      </div>
    </div>

    ${list.length === 0
    ? `<div class="card">${emptyState({ iconName: 'sparkles', title: 'No insights match these filters', message: 'Adjust the filters, or generate a new batch of insights from the current dataset.', action: '<button class="btn btn-primary" id="emptyGenerate">Generate insights</button>' })}</div>`
    : `<div class="insight-grid">${list.map((i) => insightCardHtml(i)).join('')}</div>`}
  </div>`;

  document.getElementById('insightExport')?.addEventListener('click', () => {
    const rows = [['Insight', 'Category', 'Status', 'Confidence', 'Importance', 'Evidence', 'Generated']];
    list.forEach((i) => rows.push([i.title, i.category, i.status, i.confidence, i.importance, i.evidenceId, i.generatedAt]));
    const csv = rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'ai-insights.csv'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('Insights exported', 'success', `${list.length} rows written to CSV.`);
  });

  document.getElementById('inSearch')?.addEventListener('input', (e) => { filters.q = e.target.value; render(root, { id: null, query: new URLSearchParams() }); document.getElementById('inSearch').focus(); });
  document.getElementById('inStatus')?.addEventListener('change', (e) => { filters.status = e.target.value; render(root, { id: null, query: new URLSearchParams() }); });
  document.getElementById('inImportance')?.addEventListener('change', (e) => { filters.importance = e.target.value; render(root, { id: null, query: new URLSearchParams() }); });
  document.getElementById('inCategory')?.addEventListener('change', (e) => { filters.category = e.target.value; render(root, { id: null, query: new URLSearchParams() }); });
  document.getElementById('showArchived')?.addEventListener('click', () => { filters.status = filters.status === 'Archived' ? 'all' : 'Archived'; render(root, { id: null, query: new URLSearchParams() }); });

  document.getElementById('generateInsights')?.addEventListener('click', () => runGeneration(root));
  document.getElementById('emptyGenerate')?.addEventListener('click', () => runGeneration(root));

  root.querySelectorAll('[data-act]').forEach((btn) => btn.addEventListener('click', () => {
    insightForCardActions(btn.dataset.id, btn.dataset.act);
  }));

  const open = params.query.get('insight');
  if (open) setTimeout(() => openInsightDrawer(open), 60);
}

function miniStat(label, value, iconName, tone, hint) {
  return `<article class="stat-card">
    <div class="stat-top"><span class="stat-label">${esc(label)}</span><span class="stat-icon ${tone}">${icon(iconName, 14)}</span></div>
    <div class="stat-value">${value}</div>
    <span class="stat-delta"><span class="tiny muted">${esc(hint)}</span></span>
  </article>`;
}

/* ---------------- insight generation ---------------- */

const CANDIDATES = [
  {
    key: 'margin_west', calcKind: 'region_margin', params: { region: 'West' }, category: 'Segment',
    title: (ev) => `West region margin is ${Math.abs(ev.value).toFixed(1)} pp ${ev.value < 0 ? 'below' : 'above'} the company average`,
    description: (ev) => `West converts revenue to profit at ${ev.display}, computed across ${fmtInt(ev.sampleSize)} deduplicated transactions.`,
    interpretation: 'The West region is close to the company benchmark, so regional margin risk is concentrated elsewhere. This is descriptive, not a causal attribution.',
    doesNotProve: ['That West is efficient on every product line.', 'Any cause for the difference from the company average.'],
    action: 'Keep the region in the monthly margin review, with no immediate intervention.',
    impact: (ev) => ({ label: 'Margin gap vs company', value: fmtSigned(ev.value, 1, ' pp'), tone: ev.value < 0 ? 'warning' : 'positive' }),
    importance: 'Low',
  },
  {
    key: 'channel_partner', calcKind: 'channel_share', params: { channel: 'Partner' }, category: 'Segment',
    title: (ev) => `Partner channel carries ${ev.display.split(' ')[0]} of revenue`,
    description: (ev) => `Partner-sourced revenue is ${fmtCompactMoney(ev.series.find((s) => s.label === 'Partner')?.value || 0)}, measured on the filtered transaction set.`,
    interpretation: 'Partner is a meaningful secondary channel. Revenue share is not profitability, so it should be paired with margin data before budget shifts.',
    doesNotProve: ['That Partner is profitable relative to Online or Direct.', 'Any causal contribution of the channel to growth.'],
    action: 'Add channel margin to the next commercial review.',
    impact: (ev) => ({ label: 'Channel revenue', value: fmtCompactMoney(ev.series.find((s) => s.label === 'Partner')?.value || 0), tone: 'positive' }),
    importance: 'Medium',
  },
  {
    key: 'discount_units', calcKind: 'custom_correlation', params: { xField: 'discount', yField: 'units' }, category: 'Correlation',
    title: (ev) => `Discount depth and units sold show a ${Math.abs(ev.value.r) >= 0.35 ? 'moderate' : 'weak'} positive association (r = ${ev.value.r.toFixed(2)})`,
    description: (ev) => `Across ${fmtInt(ev.value.n)} transactions, deeper discounts are associated with more units. Correlation is not causation.`,
    interpretation: 'The association is consistent with price sensitivity, but discount levels are assigned by sales teams and may track deal size.',
    doesNotProve: ['That the discount caused the additional units.', 'That deeper discounts improve profit.'],
    action: 'Test a controlled discount change in one region before adjusting guardrails.',
    impact: (ev) => ({ label: 'Association strength', value: `r = ${ev.value.r.toFixed(2)}`, tone: 'warning' }),
    importance: 'Medium',
  },
  {
    key: 'csat_tickets', calcKind: 'custom_correlation', params: { xField: 'tickets', yField: 'csat' }, category: 'Correlation',
    title: (ev) => `Support tickets and satisfaction show a ${Math.abs(ev.value.r) >= 0.35 ? 'moderate' : 'weak'} negative association (r = ${ev.value.r.toFixed(2)})`,
    description: (ev) => `${fmtInt(ev.value.n)} paired observations link ticket volume with lower CSAT. The relationship is correlational.`,
    interpretation: 'Customers who raise more tickets report lower satisfaction. This is consistent with support friction affecting experience, but the direction is not established.',
    doesNotProve: ['That tickets reduce satisfaction.', 'That closing tickets faster would raise CSAT.'],
    action: 'Pair this with resolution-time analysis before changing support staffing.',
    impact: (ev) => ({ label: 'Association strength', value: `r = ${ev.value.r.toFixed(2)}`, tone: 'warning' }),
    importance: 'Medium',
  },
  {
    key: 'forecast_q1', calcKind: 'forecast_revenue', params: {}, category: 'Forecast',
    title: (ev) => `Directional Q1 2026 revenue projection near ${fmtCompactMoney(ev.extra.forecast[0].value)}`,
    description: (ev) => `A linear trend fitted to ${fmtInt(ev.sampleSize)} 2025 transactions projects ${fmtCompactMoney(ev.extra.forecast[0].value)} for January 2026.`,
    interpretation: 'The projection is directional. A linear fit over a seasonal year overstates Q1 because the Q4 peak pulls the slope upward.',
    doesNotProve: ['That January revenue will land near the projection.', 'Any causal driver of the trend.'],
    action: 'Do not use this in a financial commitment. Re-run with a seasonal model once two years exist.',
    impact: (ev) => ({ label: 'Projected January', value: fmtCompactMoney(ev.extra.forecast[0].value), tone: 'warning' }),
    importance: 'Low',
  },
];

function runGeneration(root) {
  const active = activeInsights();
  const available = CANDIDATES.filter((c) => !active.some((i) => i.evidenceId && state.data.evidence.find((e) => e.id === i.evidenceId)?.calcKind === c.calcKind
    && JSON.stringify(state.data.evidence.find((e) => e.id === i.evidenceId)?.params) === JSON.stringify(c.params)));
  if (!available.length) {
    toast('No new deterministic insights', 'info', 'Every registered calculation for this dataset has already been generated.');
    return;
  }
  const { close } = openModal({
    title: 'Generating insights',
    subtitle: 'The model selects from the registered calculation library — it never computes a number itself.',
    size: 'sm',
    body: `<div class="loading-panel">
      <span class="spinner spinner-lg"></span>
      <strong style="color:var(--ink)">Analyzing the current dataset version…</strong>
      <div class="loading-steps">
        ${['Reading dataset fingerprint', 'Running deterministic calculations', 'Scoring evidence coverage', 'Drafting cautious interpretations'].map((s, idx) => `<div class="loading-step ${idx === 0 ? 'done' : ''}"><span class="ls-dot">${idx === 0 ? '✓' : ''}</span>${s}</div>`).join('')}
      </div>
    </div>`,
  });
  setTimeout(() => {
    close();
    const ds = datasetById(state.data.workspace.activeDatasetId) || state.data.datasets[0];
    const version = versionOf(ds);
    const batch = available.slice(0, 3);
    let created = 0;
    batch.forEach((cand, i) => {
      try {
        const ev = buildEvidence(ds, version, {
          id: nextEvidenceId(), calcKind: cand.calcKind, params: cand.params,
          claim: 'Pending claim attachment', type: 'Insight',
        });
        ev.claim = cand.title(ev).replace(/\.$/, '') + '.';
        // refresh the claim-dependent checks and re-score
        ev.checks = ev.checks.map((c) => {
          if (c.key === 'linked') return { ...c, status: 'pass', detail: 'Claim is linked to this artifact' };
          if (c.key === 'causal') {
            return /\b(proves|proven|causes|caused|because of|due to|leads to|results in)\b/i.test(ev.claim)
              ? { ...c, status: 'warn', detail: 'Claim language implies causation' }
              : { ...c, status: 'pass', detail: 'Claim uses association language only' };
          }
          return c;
        });
        const scored = scoreChecks(ev.checks);
        ev.categories = scored.categories;
        ev.score = scored.score;
        ev.status = deriveStatus(ev.checks, ev.score);
        ev.confidence = ev.score >= 95 ? 'High' : ev.score >= 85 ? 'Medium' : 'Low';
        state.data.evidence.unshift(ev);
        const insight = {
          id: nextInsightId(),
          title: cand.title(ev),
          description: cand.description(ev),
          category: cand.category,
          confidence: Math.max(55, Math.min(98, ev.score)),
          importance: cand.importance,
          status: ev.status === 'Verified' || ev.status === 'Reproducible' ? 'Verified' : ev.status === 'Failed Validation' ? 'Rejected' : ev.status,
          archived: false,
          datasetId: ds.id,
          datasetName: ds.name,
          evidenceId: ev.id,
          analysisId: null,
          visualizationId: null,
          caveats: ev.caveats,
          generatedAt: nowISO(),
          evidenceCoverage: 100,
          supportingMetric: ev.displayValue,
          impact: cand.impact(ev),
          interpretation: cand.interpretation,
          doesNotProve: cand.doesNotProve,
          recommendedAction: cand.action,
          owner: currentUser().name,
        };
        state.data.insights.unshift(insight);
        created++;
      } catch (err) {
        console.warn('Insight generation failed for', cand.key, err);
      }
    });
    if (created) {
      save();
      logActivity('analysis', 'Insights generated', `${created} new insights with linked evidence artifacts`);
      addNotification('Insights generated', `${created} new insights added to the workspace.`, 'check');
      toast(`${created} insights generated`, 'success', 'Each one links to a reproducible evidence artifact.');
      render(root, { id: null, query: new URLSearchParams() });
    } else {
      toast('Generation failed', 'error', 'The calculations could not be executed on the current version.');
    }
  }, 1800);
}

function nextInsightId() {
  const nums = state.data.insights.map((i) => Number(String(i.id).replace('INS-', ''))).filter(Number.isFinite);
  return `INS-${String((nums.length ? Math.max(...nums) : 0) + 1).padStart(3, '0')}`;
}

function nextEvidenceId() {
  const nums = state.data.evidence.map((e) => /^EV-2025-(\d+)$/.exec(e.id)).filter(Boolean).map((m) => Number(m[1]));
  return `EV-2025-${String((nums.length ? Math.max(...nums) : 0) + 1).padStart(3, '0')}`;
}
