/* Workspace settings: profile, validation thresholds, data management. */
import {
  state, currentUser, save, resetWorkspace, exportWorkspace, storageUsage, logActivity, activeInsights,
  activeEvidence, addNotification,
} from '../store.js';
import { pageHeader, icon, toast, confirmDialog, statusBadge, avatar } from '../ui.js';
import { esc, fmtInt, fmtPct, fmtDate, downloadBlob, nowISO } from '../util.js';

export function render(root) {
  const user = currentUser();
  const ws = state.data.workspace;
  const settings = ws.settings;
  const usageKb = (storageUsage() / 1024).toFixed(1);
  const datasets = state.data.datasets.filter((d) => !d.archived);
  const insights = activeInsights();
  const evidence = activeEvidence();
  const verified = insights.filter((i) => i.status === 'Verified').length;

  root.innerHTML = `<div class="stack">
    ${pageHeader({
    eyebrow: 'Settings',
    title: 'Workspace settings',
    description: 'Profile, validation thresholds and the local demo dataset. Everything is stored in this browser only.',
    actions: `<button class="btn btn-secondary" id="stExport">${icon('download', 15)} Export workspace</button>`,
  })}

    <div class="settings-grid">
      <div class="stack">
        <section class="card">
          <div class="card-head"><div><h2>Profile</h2><p>Shown on evidence records and report authorship.</p></div>${statusBadge(user.role)}</div>
          <div class="card-body stack">
            <div class="row" style="gap:12px">
              ${avatar(user, 'lg')}
              <div><strong style="font-size:14px">${esc(user.name)}</strong><div class="small muted">${esc(user.title || '')} · ${esc(ws.name)}</div></div>
            </div>
            <div class="form-grid">
              <div class="field"><label for="stName">Full name</label><input class="input" id="stName" value="${esc(user.name)}" /></div>
              <div class="field"><label for="stEmail">Email</label><input class="input" id="stEmail" type="email" value="${esc(user.email)}" /></div>
              <div class="field"><label for="stTitle">Job title</label><input class="input" id="stTitle" value="${esc(user.title || '')}" /></div>
              <div class="field"><label for="stRole">Role</label><select class="select" id="stRole">${['Admin', 'Analyst', 'Reviewer', 'Viewer'].map((r) => `<option ${user.role === r ? 'selected' : ''}>${r}</option>`).join('')}</select></div>
            </div>
            <div class="row"><button class="btn btn-primary btn-sm" id="saveProfile">${icon('check', 14)} Save profile</button><span class="small muted">Changes apply to new evidence records.</span></div>
          </div>
        </section>

        <section class="card">
          <div class="card-head"><div><h2>Validation thresholds</h2><p>These rules decide whether a claim can be labelled Verified.</p></div></div>
          <div class="card-body">
            <div class="setting-row">
              <div><strong>Minimum sample size</strong><p>Findings below this row count fail the sample-size check and cannot be labelled Verified.</p></div>
              <div class="setting-control"><input class="input" id="setSample" type="number" min="1" max="100000" value="${settings.minSample}" /></div>
            </div>
            <div class="setting-row">
              <div><strong>Evidence confidence threshold</strong><p>Validation scores below this threshold are shown as Reproducible rather than Verified.</p></div>
              <div class="setting-control"><input class="input" id="setConfidence" type="number" min="0" max="100" value="${settings.confidenceThreshold}" /></div>
            </div>
            <div class="setting-row">
              <div><strong>Allow warnings in reports</strong><p>When off, findings with open warnings stay visible but are marked as needing review in every report.</p></div>
              <div class="setting-control"><label class="switch"><input type="checkbox" id="setAllowWarn" ${settings.allowWarningsInReports ? 'checked' : ''} /><span></span></label></div>
            </div>
            <div class="setting-row">
              <div><strong>Notify on new review flags</strong><p>Adds a workspace notification whenever a finding is flagged for review.</p></div>
              <div class="setting-control"><label class="switch"><input type="checkbox" id="setNotifyReview" ${settings.notifyOnReview ? 'checked' : ''} /><span></span></label></div>
            </div>
            <div class="setting-row">
              <div><strong>Notify on exports</strong><p>Adds a notification when a report bundle is exported.</p></div>
              <div class="setting-control"><label class="switch"><input type="checkbox" id="setNotifyExport" ${settings.notifyOnExport ? 'checked' : ''} /><span></span></label></div>
            </div>
            <div class="row" style="margin-top:12px"><button class="btn btn-primary btn-sm" id="saveSettings">${icon('check', 14)} Save settings</button></div>
          </div>
        </section>

        <section class="card">
          <div class="card-head"><div><h2>Data and storage</h2><p>This build is a self-contained front-end. Data lives in this browser’s localStorage; nothing leaves the device.</p></div></div>
          <div class="card-body">
            <div class="setting-row">
              <div><strong>Storage used</strong><p>${usageKb} KB in localStorage · ${datasets.length} datasets · ${evidence.length} evidence artifacts</p></div>
              <div class="setting-control"><span class="badge badge-teal">Local only</span></div>
            </div>
            <div class="setting-row">
              <div><strong>Export workspace</strong><p>Download the full workspace as JSON, including datasets, evidence and reports.</p></div>
              <div class="setting-control"><button class="btn btn-secondary btn-sm" id="stExport2">${icon('download', 14)} Export</button></div>
            </div>
            <div class="setting-row">
              <div><strong>Restore demo data</strong><p>Rebuild the seeded Acme Retail Analytics workspace and discard local changes.</p></div>
              <div class="setting-control"><button class="btn btn-secondary btn-sm" id="stReset">${icon('refresh', 14)} Reset</button></div>
            </div>
            <div class="setting-row">
              <div><strong>Delete all datasets</strong><p>Demonstrates the empty-workspace states. You can reset afterwards to restore the demo.</p></div>
              <div class="setting-control"><button class="btn btn-danger btn-sm" id="stDeleteAll">${icon('trash', 14)} Delete datasets</button></div>
            </div>
          </div>
        </section>

        <section class="card">
          <div class="card-head"><div><h2>Team</h2><p>Seeded workspace members.</p></div></div>
          <div class="table-wrap"><table class="data">
            <thead><tr><th>Member</th><th>Email</th><th>Role</th><th>Joined</th></tr></thead>
            <tbody>${state.data.users.map((u) => `<tr>
              <td><div class="row" style="gap:8px">${avatar(u, 'sm')}<span class="cell-strong">${esc(u.name)}</span></div></td>
              <td class="small">${esc(u.email)}</td>
              <td>${statusBadge(u.role === 'Admin' ? 'Verified' : 'Reproducible')}<span class="small" style="margin-left:6px">${esc(u.role)}</span></td>
              <td class="small">${fmtDate(ws.createdAt)}</td>
            </tr>`).join('')}</tbody>
          </table></div>
        </section>
      </div>

      <aside class="stack">
        <div class="card">
          <div class="card-head"><h2>Workspace</h2></div>
          <div class="card-body stack-sm">
            <div class="kv"><dt>Name</dt><dd>${esc(ws.name)}</dd></div>
            <div class="kv"><dt>Plan</dt><dd>${esc(ws.plan)}</dd></div>
            <div class="kv"><dt>Created</dt><dd>${fmtDate(ws.createdAt)}</dd></div>
            <div class="divider"></div>
            <div class="row-between"><span class="small muted">Datasets</span><strong class="small">${datasets.length}</strong></div>
            <div class="row-between"><span class="small muted">Active insights</span><strong class="small">${insights.length}</strong></div>
            <div class="row-between"><span class="small muted">Verified findings</span><strong class="small">${verified}</strong></div>
            <div class="row-between"><span class="small muted">Evidence artifacts</span><strong class="small">${evidence.length}</strong></div>
            <div class="row-between"><span class="small muted">Reports</span><strong class="small">${state.data.reports.length}</strong></div>
          </div>
        </div>

        <div class="card">
          <div class="card-head"><h2>Quality model</h2></div>
          <div class="card-body stack-sm">
            <p class="small muted" style="line-height:1.65">Dataset quality is scored from the imported rows on five dimensions:</p>
            <ul style="margin:0;padding-left:16px;font-size:12px;color:var(--ink-2);line-height:1.8">
              <li><strong>Completeness</strong> — null cells across the table</li>
              <li><strong>Consistency</strong> — date-format and category-casing drift</li>
              <li><strong>Uniqueness</strong> — repeated primary keys</li>
              <li><strong>Validity</strong> — values outside documented ranges</li>
              <li><strong>Timeliness</strong> — import freshness</li>
            </ul>
            <p class="tiny muted">Weighted 25 / 20 / 15 / 25 / 15. The score never hides an issue: every deduction is listed in the dataset quality report.</p>
          </div>
        </div>

        <div class="card">
          <div class="card-head"><h2>About this build</h2></div>
          <div class="card-body stack-sm">
            <p class="small muted" style="line-height:1.65">Proof-Carrying Data Analyst · demo build. HTML, CSS and vanilla JavaScript only. Chart.js via CDN. Data seeded in the browser; no server, no accounts, no network calls beyond the chart library and web fonts.</p>
            <span class="badge badge-slate">Local-first</span>
          </div>
        </div>
      </aside>
    </div>
  </div>`;

  document.getElementById('saveProfile')?.addEventListener('click', () => {
    user.name = document.getElementById('stName').value.trim() || user.name;
    user.email = document.getElementById('stEmail').value.trim() || user.email;
    user.title = document.getElementById('stTitle').value.trim();
    user.role = document.getElementById('stRole').value;
    user.initials = user.name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();
    save();
    logActivity('review', 'Profile updated', `${user.name} · ${user.role}`);
    toast('Profile saved', 'success', 'The header and new evidence records now use this profile.');
    window.dispatchEvent(new Event('pcda:refresh'));
  });

  document.getElementById('saveSettings')?.addEventListener('click', () => {
    settings.minSample = Number(document.getElementById('setSample').value) || 30;
    settings.confidenceThreshold = Number(document.getElementById('setConfidence').value) || 90;
    settings.allowWarningsInReports = document.getElementById('setAllowWarn').checked;
    settings.notifyOnReview = document.getElementById('setNotifyReview').checked;
    settings.notifyOnExport = document.getElementById('setNotifyExport').checked;
    save();
    addNotification('Validation thresholds updated', `Minimum sample ${settings.minSample} · confidence threshold ${settings.confidenceThreshold}`, 'check');
    toast('Settings saved', 'success', 'New runs will use these thresholds.');
  });

  document.getElementById('stExport')?.addEventListener('click', doExport);
  document.getElementById('stExport2')?.addEventListener('click', doExport);
  document.getElementById('stReset')?.addEventListener('click', async () => {
    const ok = await confirmDialog({ title: 'Restore demo data?', message: 'This rebuilds the seeded workspace and discards every local change.', confirmLabel: 'Restore demo', danger: true });
    if (ok) {
      resetWorkspace();
      toast('Demo data restored', 'success', 'Seeded workspace rebuilt.');
      location.hash = '#/overview';
      window.dispatchEvent(new Event('pcda:refresh'));
    }
  });
  document.getElementById('stDeleteAll')?.addEventListener('click', async () => {
    const ok = await confirmDialog({
      title: 'Delete all datasets?',
      message: 'This removes every dataset version, analysis, chart, insight, evidence artifact and report from the local workspace. It demonstrates the empty states — reset restores the demo.',
      confirmLabel: 'Delete everything', danger: true,
    });
    if (!ok) return;
    state.data.datasets = [];
    state.data.analyses = [];
    state.data.visualizations = [];
    state.data.insights = [];
    state.data.evidence = [];
    state.data.reports = [];
    state.data.activity = [];
    state.data.workspace.activeDatasetId = null;
    save();
    toast('Workspace cleared', 'warning', 'Upload a dataset or reset the demo to continue.');
    location.hash = '#/datasets';
    window.dispatchEvent(new Event('pcda:refresh'));
  });

  function doExport() {
    downloadBlob(exportWorkspace(), 'proof-carrying-workspace.json', 'application/json');
    logActivity('export', 'Workspace exported', 'Full workspace JSON downloaded');
    if (settings.notifyOnExport) addNotification('Workspace exported', 'Full workspace JSON downloaded.', 'export');
    toast('Workspace exported', 'success', 'JSON bundle downloaded.');
  }
}
