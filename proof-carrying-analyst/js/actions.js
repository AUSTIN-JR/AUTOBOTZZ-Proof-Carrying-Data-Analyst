/* Cross-page actions: attach findings to reports, flag for review, refresh. */
import { state, save, logActivity, addNotification, insightById, reportById, visualizationById } from './store.js';
import { openModal, toast, icon } from './ui.js';
import { esc, nowISO } from './util.js';

export function refreshPage() {
  window.dispatchEvent(new Event('pcda:refresh'));
}

const SECTION_TITLES = {
  insight: 'Verified Findings',
  chart: 'Visual Analysis',
  evidence: 'Evidence Appendix',
};
const SECTION_TYPE = { insight: 'insights', chart: 'charts', evidence: 'evidence' };

export function addRefToReport({ type, id, label }) {
  const reports = state.data.reports;
  const body = `<p class="confirm-message">Choose the report that should carry this ${type}.</p>
    <div class="stack-sm" style="margin-top:12px">
      ${reports.map((r) => `<label class="checkbox" style="padding:10px 12px;border:1px solid var(--line);border-radius:9px">
        <input type="radio" name="reportPick" value="${esc(r.id)}" ${r.id === reports[0]?.id ? 'checked' : ''} />
        <span>${esc(r.title)}<em>${esc(r.audience)} · ${esc(r.status)}</em></span>
      </label>`).join('')}
    </div>`;
  const { close } = openModal({
    title: 'Add to report',
    subtitle: label ? esc(label) : '',
    body,
    size: 'sm',
    footer: `<button class="btn btn-ghost js-cancel">Cancel</button><button class="btn btn-primary js-add">Add to report</button>`,
    onMount: (root) => {
      root.querySelector('.js-cancel').addEventListener('click', close);
      root.querySelector('.js-add').addEventListener('click', () => {
        const picked = root.querySelector('input[name="reportPick"]:checked');
        const report = reportById(picked?.value);
        if (!report) return;
        const sectionType = SECTION_TYPE[type] || 'insights';
        let section = report.sections.find((s) => s.type === sectionType);
        if (!section) {
          section = { id: `sec-${Date.now()}`, type: sectionType, title: SECTION_TITLES[type] || 'Evidence', refs: [] };
          report.sections.push(section);
        }
        section.refs = section.refs || [];
        if (!section.refs.includes(id)) section.refs.push(id);
        report.updatedAt = nowISO();
        save();
        logActivity('report', 'Added to report', `${label || id} added to “${report.title}”`);
        toast('Added to report', 'success', report.title);
        close();
        refreshPage();
      });
    },
  });
}

export function markForReview(insightId, note = '') {
  const insight = insightById(insightId);
  if (!insight) return;
  insight.status = 'Needs Review';
  insight.reviewNote = note || 'Flagged by analyst for review before inclusion in a decision report.';
  save();
  addNotification('Finding flagged for review', `${insight.id} · ${insight.title}`, 'review');
  logActivity('review', 'Finding flagged for review', `${insight.id} · ${insight.title}`);
  toast('Marked for review', 'warning', 'The finding cannot be labelled Verified until the review closes.');
  refreshPage();
}

export function chartCsvFromTable(table, title) {
  const rows = [table.columns, ...table.rows];
  return rows;
}

export function openChartFromInsight(insight) {
  const viz = insight?.visualizationId ? visualizationById(insight.visualizationId) : null;
  if (viz) {
    location.hash = `#/visualizations?chart=${encodeURIComponent(viz.id)}`;
    return;
  }
  const ev = state.data.evidence.find((e) => e.id === insight.evidenceId);
  if (ev && ev.artifacts?.length) {
    const chart = ev.artifacts.find((a) => a.type === 'Chart');
    if (chart) {
      location.hash = `#/visualizations?chart=${encodeURIComponent(chart.ref)}`;
      return;
    }
  }
  toast('No linked chart', 'info', 'This finding is backed by a calculation without a saved visualization.');
}

export { icon };
