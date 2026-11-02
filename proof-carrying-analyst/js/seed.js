/* Deterministic demo workspace: Acme Retail Analytics — FY2025 Retail Performance. */
import {
  mulberry32, fingerprint, fnv1a, sum, mean, parseDate, fmtCompactMoney, fmtMoney, fmtInt, fmtPct,
  fmtSigned, monthShort, daysAgoISO, nowISO, uid,
} from './util.js';
import { profileDataset } from './profile.js';
import { buildEvidence, computeCalc, deriveStatus, scoreChecks } from './calc.js';

const REGION_COUNTRIES = {
  North: ['United States', 'Canada'],
  South: ['United States', 'Mexico', 'Brazil'],
  East: ['United Kingdom', 'Germany', 'France'],
  West: ['United States', 'India', 'Australia'],
};
const REGION_BIAS = { North: 0.075, South: 0.012, East: -0.01, West: 0.004 };

const CATEGORIES = [
  { name: 'Electronics', bias: -0.03, products: [['Studio Monitor', 640], ['Wireless Headset', 210], ['Tablet Pro', 780]] },
  { name: 'Apparel', bias: 0.01, products: [['Merino Jacket', 145], ['Running Shoes', 120], ['Everyday Tee', 45]] },
  { name: 'Home & Living', bias: 0.02, products: [['Pour-Over Set', 95], ['Linen Bedding', 180], ['Desk Lamp', 120]] },
  { name: 'Grocery', bias: 0.05, products: [['Coffee Subscription', 65], ['Pantry Box', 85], ['Snack Crate', 40]] },
  { name: 'Sports', bias: 0.015, products: [['Trail Backpack', 190], ['Yoga Kit', 110], ['Cycling Helmet', 160]] },
];
const SEGMENTS = ['Enterprise', 'Mid-Market', 'SMB', 'Consumer'];
const CHANNELS = ['Online', 'Retail Store', 'Partner', 'Direct Sales'];
const CHANNEL_TICKET_BASE = { Partner: 2.4, Online: 1.7, 'Retail Store': 1.15, 'Direct Sales': 0.7 };
const REPS = [
  ['Priya Nair', 'North'], ['Daniel Okafor', 'North'], ['Sofia Alvarez', 'South'], ['Marcus Webb', 'South'],
  ['Hannah Cole', 'East'], ['Jonas Berg', 'East'], ['Wei Chen', 'West'], ['Amara Singh', 'West'],
  ['Liam Doyle', 'North'], ['Nadia Haddad', 'West'],
];
const MONTH_WEIGHTS = [0.86, 0.82, 0.93, 0.9, 0.95, 1.0, 0.97, 1.03, 1.09, 1.18, 1.247, 1.343];

const MAIN_COLUMNS = [
  { key: 'txn_id', label: 'Transaction ID', type: 'text', isKey: true },
  { key: 'date', label: 'Date', type: 'date', critical: true },
  { key: 'region', label: 'Region', type: 'categorical', critical: true },
  { key: 'country', label: 'Country', type: 'categorical' },
  { key: 'category', label: 'Product Category', type: 'categorical', critical: true },
  { key: 'product', label: 'Product', type: 'categorical' },
  { key: 'segment', label: 'Customer Segment', type: 'categorical', critical: true },
  { key: 'channel', label: 'Channel', type: 'categorical' },
  { key: 'revenue', label: 'Revenue', type: 'numeric', critical: true, unit: 'USD' },
  { key: 'cost', label: 'Cost', type: 'numeric', unit: 'USD' },
  { key: 'profit', label: 'Profit', type: 'numeric', unit: 'USD' },
  { key: 'units', label: 'Units Sold', type: 'numeric' },
  { key: 'discount', label: 'Discount', type: 'numeric', unit: 'ratio' },
  { key: 'tickets', label: 'Support Tickets', type: 'numeric' },
  { key: 'csat', label: 'Customer Satisfaction Score', type: 'numeric' },
  { key: 'churn', label: 'Churn Risk', type: 'categorical' },
  { key: 'rep', label: 'Sales Representative', type: 'categorical' },
];

function pick(rand, arr) { return arr[Math.floor(rand() * arr.length)]; }
function between(rand, a, b) { return a + rand() * (b - a); }
function round2(n) { return Math.round(n * 100) / 100; }

/* ------------------------------------------------------------------ */
/* FY2025 Retail Performance — 18,642 records                          */
/* ------------------------------------------------------------------ */

export function generateRetailRows(seedValue, rowCount) {
  const rand = mulberry32(seedValue);
  const totalWeight = sum(MONTH_WEIGHTS);
  const counts = MONTH_WEIGHTS.map((w) => Math.floor((rowCount * w) / totalWeight));
  let assigned = sum(counts);
  let i = 11;
  while (assigned < rowCount) { counts[i % 12]++; assigned++; i++; }
  while (assigned > rowCount) { counts[i % 12]--; assigned--; i++; }

  const rows = [];
  let txn = 100000;
  for (let m = 0; m < 12; m++) {
    for (let k = 0; k < counts[m]; k++) {
      txn += 1;
      const day = 1 + Math.floor(rand() * 27);
      const date = new Date(Date.UTC(2025, m, day));
      const region = pick(rand, Object.keys(REGION_COUNTRIES));
      const country = pick(rand, REGION_COUNTRIES[region]);
      const cat = pick(rand, CATEGORIES);
      const [product, price] = pick(rand, cat.products);
      const segment = pick(rand, SEGMENTS);
      const channel = pick(rand, CHANNELS);
      const rep = (REPS.find(([, r]) => r === region) || REPS[0])[0];

      const discount = rand() < 0.34 ? 0 : Math.pow(rand(), 2) * 0.35;
      const units = Math.max(1, Math.round(1 + rand() * 2.2 + discount * 6));
      const gross = price * units;
      const revenue = gross * (1 - discount);
      const costRatio = 0.6 + rand() * 0.1 + REGION_BIAS[region] + cat.bias;
      const cost = gross * costRatio;
      const profit = revenue - cost;

      const ticketBase = CHANNEL_TICKET_BASE[channel];
      const tickets = Math.min(14, Math.floor(-Math.log(Math.max(1e-6, 1 - rand())) * (ticketBase + 1)));
      let churnP = 0.03 + 0.085 * tickets + (segment === 'SMB' ? 0.04 : 0) + rand() * 0.12;
      const churn = churnP > 0.62 ? 'High' : churnP > 0.3 ? 'Medium' : 'Low';
      let csat = 4.72 - 0.105 * tickets + rand() * 0.5 - 0.18;
      if (segment === 'Enterprise' && region === 'South') csat -= 0.62;
      if (region === 'North') csat -= 0.1;
      csat = Math.max(1, Math.min(5, csat));

      // date format drift
      const dateValue = rand() < 0.022
        ? `${String(m + 1).padStart(2, '0')}/${String(day).padStart(2, '0')}/2025`
        : date.toISOString().slice(0, 10);

      const row = [
        `TXN-${txn}`,
        dateValue,
        rand() < 0.014 ? region.toLowerCase() : region,
        country,
        cat.name,
        product,
        segment,
        channel,
        round2(revenue),
        round2(cost),
        round2(profit),
        units,
        round2(discount),
        tickets,
        Math.round(csat * 10) / 10,
        churn,
        rep,
      ];

      // Missing values (documented quality issues)
      if (rand() < 0.083) row[8] = null;
      if (rand() < 0.05) row[14] = null;
      if (rand() < 0.03) row[12] = null;
      if (rand() < 0.04) row[15] = null;
      if (rand() < 0.02) row[13] = null;
      if (rand() < 0.03) row[16] = null;
      if (rand() < 0.015) row[5] = null;

      rows.push(row);
    }
  }

  rows.sort((a, b) => String(a[1]).localeCompare(String(b[1])));

  // Unusually large transactions
  for (let o = 0; o < 14; o++) {
    const idx = 200 + Math.floor(rand() * (rows.length - 400));
    const row = rows[idx];
    row[8] = round2(between(rand, 9000, 22000));
    row[10] = round2(row[8] - row[9]);
  }

  // Invalid values that range-sensitive calculations must exclude
  for (let inv = 0; inv < 460; inv++) {
    const idx = 100 + Math.floor(rand() * (rows.length - 200));
    const row = rows[idx];
    const kind = inv % 4;
    if (kind === 0) row[14] = 0;          // CSAT out of range
    else if (kind === 1) row[12] = -0.05; // negative discount
    else if (kind === 2) row[14] = 6.5;   // CSAT above scale
    else row[11] = 0;                     // non-positive units
  }

  // Duplicate transaction IDs from a re-run export
  for (let d = 0; d < 12; d++) {
    const src = 50 + Math.floor(rand() * 300);
    const dst = rows.length - 40 - d;
    rows[dst] = rows[src].slice();
  }

  return rows;
}

export function generateTicketRows(seedValue, rowCount) {
  const rand = mulberry32(seedValue);
  const rows = [];
  const priorities = ['Low', 'Medium', 'High', 'Urgent'];
  for (let i = 0; i < rowCount; i++) {
    const region = pick(rand, Object.keys(REGION_COUNTRIES));
    const d = new Date(Date.UTC(2025, 9 + Math.floor(rand() * 3), 1 + Math.floor(rand() * 27)));
    const priority = pick(rand, priorities);
    const prWeight = { Low: 1, Medium: 2.2, High: 5.5, Urgent: 12 }[priority];
    const hours = Math.round(between(rand, 0.3, prWeight * 6) * 10) / 10;
    const csat = Math.round(Math.max(1, Math.min(5, 5.1 - hours * 0.035 - (priority === 'Urgent' ? 0.6 : 0) + rand() * 0.6)) * 10) / 10;
    const rep = (REPS.find(([, r]) => r === region) || REPS[0])[0];
    rows.push([
      `TKT-${20000 + i}`, d.toISOString().slice(0, 10), region, pick(rand, CHANNELS), priority,
      hours, rand() < 0.06 ? null : csat, rep,
    ]);
  }
  return rows;
}

export function generateSurveyRows(seedValue, rowCount) {
  const rand = mulberry32(seedValue);
  const rows = [];
  const comments = [
    'Renewal decision depends on support responsiveness.',
    'Pricing feels high relative to peers.',
    'Onboarding was fast and clear.',
    'Product quality is strong; reporting needs work.',
    'Support resolved our issue in one day.',
    'Would like better discount flexibility.',
  ];
  for (let i = 0; i < rowCount; i++) {
    const region = pick(rand, Object.keys(REGION_COUNTRIES));
    const segment = pick(rand, SEGMENTS);
    const d = new Date(Date.UTC(2025, 6 + Math.floor(rand() * 5), 1 + Math.floor(rand() * 27)));
    const nps = Math.round(between(rand, 1, 10));
    const csat = Math.round(Math.max(1, Math.min(5, 3.4 + nps * 0.15 + (segment === 'Enterprise' ? -0.4 : 0) + rand() * 0.4)) * 10) / 10;
    rows.push([
      `SUR-${(1000 + i)}`, d.toISOString().slice(0, 10), segment, region, nps,
      Math.round(between(rand, 2, 84)), csat, rand() < 0.42 ? null : pick(rand, comments),
    ]);
  }
  return rows;
}

/* ------------------------------------------------------------------ */
/* Workspace assembly                                                 */
/* ------------------------------------------------------------------ */

const COLUMNS_TICKETS = [
  { key: 'ticket_id', label: 'Ticket ID', type: 'text', isKey: true },
  { key: 'opened_date', label: 'Opened Date', type: 'date', critical: true },
  { key: 'region', label: 'Region', type: 'categorical', critical: true },
  { key: 'channel', label: 'Channel', type: 'categorical' },
  { key: 'priority', label: 'Priority', type: 'categorical' },
  { key: 'resolution_hours', label: 'Resolution Hours', type: 'numeric' },
  { key: 'csat', label: 'CSAT', type: 'numeric' },
  { key: 'rep', label: 'Assigned Rep', type: 'categorical' },
];
const COLUMNS_SURVEY = [
  { key: 'response_id', label: 'Response ID', type: 'text', isKey: true },
  { key: 'submitted_date', label: 'Submitted Date', type: 'date', critical: true },
  { key: 'segment', label: 'Customer Segment', type: 'categorical', critical: true },
  { key: 'region', label: 'Region', type: 'categorical' },
  { key: 'nps', label: 'NPS Score', type: 'numeric' },
  { key: 'tenure_months', label: 'Tenure (Months)', type: 'numeric' },
  { key: 'csat', label: 'CSAT', type: 'numeric' },
  { key: 'comment', label: 'Comment', type: 'text' },
];

function makeDataset({ id, name, file, sourceType, columns, rows, uploadDate, uploadedBy, description, versionSpecs, datasetIndex, seedSpec }) {
  const profile = profileDataset({ columns, rows, uploadDate });
  const versions = versionSpecs.map((v, i) => ({
    id: `${id}_v${v.version}`,
    version: v.version,
    fingerprint: fingerprint(fnv1a(`${name}|${v.version}|${v.rowCount}`)),
    importedAt: v.importedAt,
    rowCount: v.rowCount,
    columnCount: columns.length,
    changedRows: v.changedRows,
    changedColumns: v.changedColumns || 0,
    createdBy: uploadedBy,
    schema: columns.map((c) => ({ key: c.key, label: c.label, type: c.type })),
    qualitySummary: i === versionSpecs.length - 1
      ? { score: profile.score, issues: profile.issues.length }
      : { score: v.qualityScore, issues: v.issueCount || 1 },
    sourceFile: { name: file, size: v.fileSize, type: sourceType, rowCount: v.rowCount },
  }));
  const currentVersionId = versions[versions.length - 1].id;
  return {
    id,
    name,
    fileName: file,
    sourceType,
    uploadedBy,
    uploadDate,
    description,
    status: 'Analyzed',
    analysisStatus: 'Analyzed',
    rowCount: rows.length,
    columnCount: columns.length,
    fileSize: versionSpecs[versionSpecs.length - 1].fileSize,
    columns,
    rows,
    versions,
    currentVersionId,
    quality: profile,
    lastModified: versions[versions.length - 1].importedAt,
    lastAnalyzedAt: daysAgoISO(0.1 + datasetIndex * 1.4),
    archived: false,
    seedSpec: seedSpec || null,
  };
}

export function buildWorkspace() {
  const now = new Date();
  const users = [
    { id: 'u_alex', name: 'Alex Morgan', email: 'alex.morgan@acmeretail.com', role: 'Admin', initials: 'AM', color: 'violet', title: 'Head of Analytics' },
    { id: 'u_priya', name: 'Priya Nair', email: 'priya.nair@acmeretail.com', role: 'Analyst', initials: 'PN', color: 'teal', title: 'Senior Analyst' },
    { id: 'u_marcus', name: 'Marcus Webb', email: 'marcus.webb@acmeretail.com', role: 'Reviewer', initials: 'MW', color: 'blue', title: 'Financial Controller' },
    { id: 'u_hannah', name: 'Hannah Cole', email: 'hannah.cole@acmeretail.com', role: 'Viewer', initials: 'HC', color: 'amber', title: 'Regional Director' },
  ];

  const retailRows = generateRetailRows(20250101, 18642);
  const ticketRows = generateTicketRows(77001, 640);
  const surveyRows = generateSurveyRows(55007, 240);

  const datasets = [
    makeDataset({
      id: 'ds_retail',
      name: 'FY2025 Retail Performance',
      file: 'fy2025_retail_performance.csv',
      sourceType: 'CSV',
      columns: MAIN_COLUMNS,
      rows: retailRows,
      uploadDate: daysAgoISO(6),
      uploadedBy: 'u_priya',
      description: 'Transaction-level retail performance for FY2025 across four regions, five product categories and four customer segments. Source: Commerce warehouse export.',
      datasetIndex: 0,
      seedSpec: { kind: 'retail', seed: 20250101, rowCount: 18642 },
      versionSpecs: [
        { version: 1, rowCount: 14206, importedAt: daysAgoISO(48), changedRows: 0, changedColumns: 0, fileSize: '1.8 MB', qualityScore: 81, issueCount: 6 },
        { version: 2, rowCount: 17480, importedAt: daysAgoISO(19), changedRows: 3274, changedColumns: 1, fileSize: '2.2 MB', qualityScore: 84, issueCount: 5 },
        { version: 3, rowCount: 18642, importedAt: daysAgoISO(6), changedRows: 1162, changedColumns: 0, fileSize: '2.4 MB', qualityScore: 86, issueCount: 5 },
      ],
    }),
    makeDataset({
      id: 'ds_tickets',
      name: 'Q4 Support Ticket Log',
      file: 'q4_support_tickets.xlsx',
      sourceType: 'XLSX',
      columns: COLUMNS_TICKETS,
      rows: ticketRows,
      uploadDate: daysAgoISO(12),
      uploadedBy: 'u_priya',
      description: 'Support tickets opened in Q4 2025 with resolution time, priority and post-resolution CSAT. Source: Zendesk export.',
      datasetIndex: 1,
      seedSpec: { kind: 'tickets', seed: 77001, rowCount: 640 },
      versionSpecs: [
        { version: 1, rowCount: 512, importedAt: daysAgoISO(56), changedRows: 0, changedColumns: 0, fileSize: '96 KB', qualityScore: 88, issueCount: 3 },
        { version: 2, rowCount: 640, importedAt: daysAgoISO(12), changedRows: 128, changedColumns: 0, fileSize: '118 KB', qualityScore: 91, issueCount: 3 },
      ],
    }),
    makeDataset({
      id: 'ds_survey',
      name: 'Customer Segment Survey 2025',
      file: 'customer_segment_survey.csv',
      sourceType: 'CSV',
      columns: COLUMNS_SURVEY,
      rows: surveyRows,
      uploadDate: daysAgoISO(31),
      uploadedBy: 'u_marcus',
      description: 'Post-purchase survey responses with NPS, CSAT and tenure, collected between July and November 2025.',
      datasetIndex: 2,
      seedSpec: { kind: 'survey', seed: 55007, rowCount: 240 },
      versionSpecs: [
        { version: 1, rowCount: 240, importedAt: daysAgoISO(31), changedRows: 0, changedColumns: 0, fileSize: '42 KB', qualityScore: 92, issueCount: 2 },
      ],
    }),
  ];

  const retail = datasets[0];
  const currentVersion = retail.versions.find((v) => v.id === retail.currentVersionId);

  const evidence = [];
  const insights = [];
  const analyses = [];
  const visualizations = [];
  let evSeq = 1;
  let insSeq = 1;

  function nextEvId() { return `EV-2025-${String(evSeq++).padStart(3, '0')}`; }

  function addEvidence({ claim, calcKind, params = {}, filters = [], type = 'Analysis', required, confidence, artifacts, createdAt, versionOverride, forceStatus, superseded, checkOverrides, owner }) {
    const id = nextEvId();
    const version = versionOverride || currentVersion;
    const ev = buildEvidence(retail, version, {
      id, calcKind, params, filters, claim: 'Pending claim attachment', type, required, artifacts,
      createdAt: createdAt || daysAgoISO(0.2), owner: owner || 'Alex Morgan',
    });
    ev._overrides = checkOverrides || null;
    ev._forceStatus = forceStatus || null;
    ev._confidence = confidence || null;
    ev._requestedClaim = typeof claim === 'function' ? claim : null;
    evidence.push(ev);
    return ev;
  }

  const CAUSAL_WORDS = /\b(proves|proven|causes|caused|because of|due to|leads to|results in)\b/i;

  function refreshEvidence(ev) {
    if (ev._requestedClaim) ev.claim = ev._requestedClaim(ev);
    if (ev._overrides) {
      ev.checks = ev.checks.map((c) => (ev._overrides[c.key] ? { ...c, ...ev._overrides[c.key] } : c));
    }
    ev.checks = ev.checks.map((c) => {
      if (c.key === 'linked') {
        return ev.claim ? { ...c, status: 'pass', detail: 'Claim is linked to this artifact' } : { ...c, status: 'warn', detail: 'No claim attached' };
      }
      if (c.key === 'causal') {
        return CAUSAL_WORDS.test(ev.claim || '')
          ? { ...c, status: 'warn', detail: 'Claim language implies causation' }
          : { ...c, status: 'pass', detail: 'Claim uses association language only' };
      }
      return c;
    });
    const { categories, score } = scoreChecks(ev.checks);
    ev.categories = categories;
    ev.score = score;
    if (ev.superseded) ev.status = 'Superseded';
    else if (ev._forceStatus) ev.status = ev._forceStatus;
    else ev.status = deriveStatus(ev.checks, score);
    ev.confidence = ev._confidence || (score >= 95 ? 'High' : score >= 85 ? 'Medium' : 'Low');
    delete ev._overrides;
    delete ev._forceStatus;
    delete ev._confidence;
    delete ev._requestedClaim;
    return ev;
  }

  function addInsight({ ev, title, description, category, importance, status, interpretation, doesNotProve, recommendedAction, supportingMetric, impact, analysisId, visualizationId, confidence, archived, generatedAt }) {
    const insight = {
      id: `INS-${String(insSeq++).padStart(3, '0')}`,
      title,
      description,
      category,
      confidence: confidence ?? Math.min(98, ev.score),
      importance,
      status,
      archived: !!archived,
      datasetId: ev.datasetId,
      datasetName: ev.datasetName,
      evidenceId: ev.id,
      analysisId: analysisId || null,
      visualizationId: visualizationId || null,
      caveats: ev.caveats,
      generatedAt: generatedAt || ev.createdAt,
      evidenceCoverage: ev.status === 'Failed Validation' ? 62 : 100,
      supportingMetric,
      impact,
      interpretation,
      doesNotProve,
      recommendedAction,
      owner: ev.owner,
    };
    insights.push(insight);
    return insight;
  }

  function addAnalysis({ id, title, type, metric, dimension, aggregation, filters, transformations, settings, evidenceId, createdBy, createdAt, status = 'Completed', summary, validation }) {
    const run = {
      id: id || `RUN-${String(analyses.length + 1).padStart(3, '0')}`,
      datasetId: retail.id,
      datasetVersionId: currentVersion.id,
      versionNumber: currentVersion.version,
      title, type, metric, dimension, aggregation,
      filters: filters || [],
      transformations: transformations || [],
      settings: settings || { confidenceLevel: 95, minSample: 30, excludeOutliers: false },
      status,
      createdBy: createdBy || 'Alex Morgan',
      createdAt: createdAt || daysAgoISO(1),
      selectedFields: [metric, dimension].filter(Boolean),
      statisticalMethods: type === 'correlation' ? 'Pearson correlation with two-sided significance test' : 'Deterministic aggregation',
      outputSummary: summary || null,
      validationResult: validation || 'Passed',
      evidenceId: evidenceId || null,
    };
    analyses.push(run);
    return run;
  }

  /* ---------------- Core evidence + insights ---------------- */

  const growthFilters = [
    { field: 'date', op: 'between', value: '2025-07-01', value2: '2025-12-31' },
  ];
  const growthEv = addEvidence({
    claim: '',
    calcKind: 'growth_quarter',
    filters: growthFilters,
    type: 'Insight',
    confidence: 'High',
    createdAt: daysAgoISO(0.35),
    artifacts: [],
  });
  const growthSeries = growthEv.calculationSeries || [];
  const q3 = growthSeries.find((s) => s.label === 'Q3 2025');
  const q4 = growthSeries.find((s) => s.label === 'Q4 2025');
  const growth = growthEv.value;
  growthEv.claim = `Revenue increased ${Math.abs(growth).toFixed(1)}% quarter-over-quarter from Q3 to Q4 2025.`;

  const growthRun = addAnalysis({
    id: 'RUN-001',
    title: 'Revenue by month with quarter-over-quarter growth',
    type: 'trend', metric: 'revenue', dimension: 'date', aggregation: 'sum',
    filters: growthFilters,
    transformations: [{ type: 'date_bucket', params: { granularity: 'month' } }, { type: 'remove_duplicates' }],
    evidenceId: growthEv.id, createdAt: daysAgoISO(0.4),
    summary: `Q3 ${fmtCompactMoney(q3.value)} → Q4 ${fmtCompactMoney(q4.value)} (${fmtSigned(growth, 1)})`,
  });
  const growthInsight = addInsight({
    ev: growthEv,
    title: `Revenue grew ${Math.abs(growth).toFixed(1)}% from Q3 to Q4`,
    description: `Q4 revenue reached ${fmtCompactMoney(q4.value)}, ${fmtCompactMoney(q4.value - q3.value)} above Q3. The change is computed from ${fmtInt(growthEv.sampleSize)} non-duplicate transactions with a non-null Revenue value.`,
    category: 'Trend', importance: 'High', status: 'Verified',
    interpretation: 'The fourth quarter closed materially stronger than the third. Because the increase spans every region, it appears consistent with a seasonal Q4 uplift rather than a single large account.',
    doesNotProve: ['That the increase was caused by a specific campaign, price change or promotion.', 'That the growth is repeatable in Q1 2026.'],
    recommendedAction: 'Use Q4 as the planning baseline, but separate the seasonal uplift from underlying growth before setting 2026 targets.',
    supportingMetric: `Q4 ${fmtCompactMoney(q4.value)} · ${fmtSigned(growth, 1)}`,
    impact: { label: 'Incremental Q4 revenue', value: fmtCompactMoney(q4.value - q3.value), tone: 'positive' },
    analysisId: growthRun.id,
  });

  const regionMargin = computeCalc(retail, 'region_margin', { region: 'North' }).out;
  const northEv = addEvidence({
    claim: '', calcKind: 'region_margin', params: { region: 'North' }, type: 'Insight',
    confidence: 'High', createdAt: daysAgoISO(0.5),
  });
  northEv.claim = `The North region’s profit margin is ${Math.abs(northEv.value).toFixed(1)} percentage points ${northEv.value < 0 ? 'below' : 'above'} the company average.`;
  const northRun = addAnalysis({
    id: 'RUN-002', title: 'Profit margin by region and product category', type: 'segmentation',
    metric: 'profit', dimension: 'region', aggregation: 'sum', createdAt: daysAgoISO(0.55),
    transformations: [{ type: 'create_calculated_field', params: { name: 'Profit Margin', expression: 'Profit / Revenue' } }],
    evidenceId: northEv.id, summary: `North margin ${northEv.display} vs company average`,
  });
  const northInsight = addInsight({
    ev: northEv,
    title: `North region margin trails the company average by ${Math.abs(northEv.value).toFixed(1)} pp`,
    description: `North posts a ${(regionMargin.series.find((s) => s.label === 'North') || {}).value}% profit margin against the company-wide benchmark. The gap is computed from ${fmtInt(northEv.sampleSize)} transactions.`,
    category: 'Segment', importance: 'High', status: 'Verified',
    interpretation: 'The North region converts revenue to profit less efficiently than the rest of the business. The gap is consistent with a heavier discount posture and higher cost-to-serve in that region.',
    doesNotProve: ['Which cost line drives the gap.', 'That the region is unprofitable — margin is below average, not negative.'],
    recommendedAction: 'Review North-region discount approvals and freight costs before the FY2026 plan is locked.',
    supportingMetric: northEv.display,
    impact: { label: 'Margin gap vs company', value: fmtSigned(northEv.value, 1, ' pp'), tone: 'negative' },
    analysisId: northRun.id,
  });

  const corrEv = addEvidence({
    claim: '', calcKind: 'corr_tickets_churn', type: 'Insight', confidence: 'High',
    createdAt: daysAgoISO(0.8),
  });
  const corrR = corrEv.value.r;
  const strength = Math.abs(corrR) >= 0.6 ? 'strong' : Math.abs(corrR) >= 0.35 ? 'moderate' : 'weak';
  corrEv.claim = `Support-ticket volume has a ${strength} positive association with churn risk (Pearson r = ${corrR.toFixed(2)}).`;
  const corrRun = addAnalysis({
    id: 'RUN-003', title: 'Correlation between support tickets and churn risk', type: 'correlation',
    metric: 'tickets', dimension: 'churn', aggregation: 'count', createdAt: daysAgoISO(0.85),
    evidenceId: corrEv.id, summary: `r = ${corrR.toFixed(3)} · n = ${fmtInt(corrEv.sampleSize)}`,
  });
  const corrInsight = addInsight({
    ev: corrEv,
    title: 'Support-ticket volume has a strong positive association with churn risk',
    description: `Across ${fmtInt(corrEv.sampleSize)} transactions with both fields present, ticket volume and churn risk move together (r = ${corrR.toFixed(2)}).`,
    category: 'Correlation', importance: 'High', status: 'Verified',
    interpretation: 'Accounts that raise more tickets are more likely to be flagged as elevated churn risk. This is consistent with support friction contributing to attrition, but the data cannot separate that from the reverse.',
    doesNotProve: ['That support tickets cause churn.', 'That reducing ticket volume would reduce churn without addressing the underlying issue.'],
    recommendedAction: 'Treat ticket volume as a risk signal in account reviews; validate causality with a controlled intervention before publishing a causal claim.',
    supportingMetric: `r = ${corrR.toFixed(3)} · n = ${fmtInt(corrEv.sampleSize)}`,
    impact: { label: 'Association strength', value: `r = ${corrR.toFixed(2)}`, tone: 'warning' },
    analysisId: corrRun.id,
  });

  const outlierEv = addEvidence({
    claim: '', calcKind: 'outliers_revenue', type: 'Insight', confidence: 'High',
    createdAt: daysAgoISO(1.1),
  });
  outlierEv.claim = `${outlierEv.value} unusually large transactions may be influencing reported revenue (${fmtPct(outlierEv.extra.share)} of total).`;
  const outlierInsight = addInsight({
    ev: outlierEv,
    title: `${outlierEv.value} unusually large transactions may be influencing reported revenue`,
    description: `A Tukey upper fence of ${fmtMoney(outlierEv.extra.hi)} flags ${outlierEv.value} transactions carrying ${fmtCompactMoney(outlierEv.extra.outlierSum)} — ${fmtPct(outlierEv.extra.share)} of revenue.`,
    category: 'Anomaly', importance: 'Medium', status: 'Warning',
    interpretation: 'Reported revenue is concentrated in a small number of large deals. Headline totals are technically correct but sensitive to whether those deals are representative.',
    doesNotProve: ['That the flagged transactions are errors.', 'That removing them would give the “true” revenue figure.'],
    recommendedAction: 'Confirm the large transactions with the account team and disclose the concentration in the board pack.',
    supportingMetric: `${outlierEv.value} rows · ${fmtPct(outlierEv.extra.share)} of revenue`,
    impact: { label: 'Revenue in flagged rows', value: fmtCompactMoney(outlierEv.extra.outlierSum), tone: 'warning' },
  });

  const discountEv = addEvidence({
    claim: '', calcKind: 'discount_impact', type: 'Insight', confidence: 'Medium',
    createdAt: daysAgoISO(1.4),
    checkOverrides: {
      assumptions: { status: 'warn', detail: 'Discount cohorts are observational; causal interpretation is not supported' },
    },
  });
  discountEv.claim = `Discounts above 20% are associated with ${discountEv.value.unitsLift.toFixed(0)}% higher unit sales but a ${Math.abs(discountEv.value.marginDelta).toFixed(1)} pp lower profit margin.`;
  const discountInsight = addInsight({
    ev: discountEv,
    title: 'Discounts above 20% correlate with higher unit sales but lower margin',
    description: `Transactions with a discount above 20% sell ${discountEv.value.unitsLift.toFixed(0)}% more units on average, while margin runs ${Math.abs(discountEv.value.marginDelta).toFixed(1)} pp lower than the ≤20% cohort.`,
    category: 'Correlation', importance: 'Medium', status: 'Needs Review',
    interpretation: 'Discounting appears consistent with volume gains that do not pay for themselves at the margin. The cohort split is a business rule, not a randomised test.',
    doesNotProve: ['That the discount caused the extra units.', 'What would happen at a different discount threshold.'],
    recommendedAction: 'Run a controlled discount test in one region before changing discount guardrails.',
    supportingMetric: `${fmtSigned(discountEv.value.unitsLift, 0, '%')} units · ${fmtSigned(discountEv.value.marginDelta, 1, ' pp')} margin`,
    impact: { label: 'Margin difference', value: fmtSigned(discountEv.value.marginDelta, 1, ' pp'), tone: 'warning' },
  });

  const segmentCards = [
    { segment: 'Enterprise', region: 'South', importance: 'High' },
    { segment: 'Mid-Market', region: null, importance: 'Medium' },
    { segment: 'SMB', region: null, importance: 'Medium' },
  ];
  const segmentInsights = segmentCards.map((cfg, i) => {
    const ev = addEvidence({
      claim: '', calcKind: 'segment_csat', params: { segment: cfg.segment, region: cfg.region },
      type: 'Insight', confidence: 'High', createdAt: daysAgoISO(1.6 + i * 0.2),
    });
    const scope = cfg.region ? `${cfg.segment} customers in the ${cfg.region} region` : `${cfg.segment} customers`;
    ev.claim = `${scope} report a mean satisfaction score of ${ev.display.split(' ')[0]}, ${ev.value < 0 ? 'below' : 'above'} the overall average by ${Math.abs(ev.value).toFixed(2)} points.`;
    const run = addAnalysis({
      title: `Customer-segment comparison for revenue and satisfaction — ${cfg.segment}`,
      type: 'segmentation', metric: 'csat', dimension: 'segment', aggregation: 'avg',
      createdAt: daysAgoISO(1.7 + i * 0.2), evidenceId: ev.id,
      summary: `${cfg.segment}${cfg.region ? ' · ' + cfg.region : ''} ${ev.display}`,
    });
    return addInsight({
      ev,
      title: cfg.region
        ? `Satisfaction is lowest among ${cfg.segment} customers in the ${cfg.region} region`
        : `${cfg.segment} satisfaction is ${ev.value < 0 ? 'below' : 'above'} the company average`,
      description: `Mean CSAT for ${scope} is ${ev.display.split(' ')[0]} across ${fmtInt(ev.sampleSize)} valid responses.`,
      category: 'Segment', importance: cfg.importance, status: 'Verified',
      interpretation: cfg.region
        ? 'This segment-region cell combines the largest accounts with the region that carries the highest support load, which is consistent with the lower score.'
        : 'Satisfaction differs by segment, which is consistent with different service expectations and product mixes.',
      doesNotProve: ['That segment membership causes the satisfaction difference.', 'That improving support for one segment will lift the company average proportionally.'],
      recommendedAction: cfg.region ? 'Include this cell in the Q1 account review and investigate the ticket themes behind it.' : 'Track this segment separately in the quarterly satisfaction review.',
      supportingMetric: `Mean CSAT ${ev.display.split(' ')[0]} · n = ${fmtInt(ev.sampleSize)}`,
      impact: { label: 'CSAT vs overall', value: ev.display.split('(')[1]?.replace(')', '') || fmtSigned(ev.value, 2, ' pts'), tone: ev.value < 0 ? 'warning' : 'positive' },
      analysisId: run.id,
    });
  });

  const categoryInsights = CATEGORIES.map((cat, i) => {
    const ev = addEvidence({
      claim: '', calcKind: 'category_growth', params: { category: cat.name },
      type: 'Insight', confidence: 'High', createdAt: daysAgoISO(2 + i * 0.15),
    });
    ev.claim = `${cat.name} revenue ${ev.value >= 0 ? 'grew' : 'declined'} ${Math.abs(ev.value).toFixed(1)}% from Q3 to Q4 2025.`;
    return addInsight({
      ev,
      title: `${cat.name} revenue ${ev.value >= 0 ? 'grew' : 'declined'} ${Math.abs(ev.value).toFixed(1)}% in Q4`,
      description: `Q4 ${cat.name.toLowerCase()} revenue ${ev.value >= 0 ? 'increased' : 'decreased'} to ${fmtCompactMoney(ev.calculationSeries[1].value)} from ${fmtCompactMoney(ev.calculationSeries[0].value)} in Q3.`,
      category: 'Trend', importance: i < 2 ? 'High' : 'Medium', status: 'Verified',
      interpretation: `${cat.name} is ${ev.value >= 0 ? 'tracking with' : 'lagging'} the overall Q4 uplift, which is consistent with ${ev.value >= 0 ? 'seasonal demand' : 'a category-specific slowdown'}.`,
      doesNotProve: ['Why the category moved.', 'That the trend will continue into Q1 2026.'],
      recommendedAction: ev.value >= 0 ? 'Maintain inventory cover for this category through December.' : 'Review category pricing and assortment before the Q1 plan.',
      supportingMetric: `${fmtSigned(ev.value, 1)} vs Q3`,
      impact: { label: 'Q4 revenue', value: fmtCompactMoney(ev.calculationSeries[1].value), tone: ev.value >= 0 ? 'positive' : 'negative' },
    });
  });

  const southEv = addEvidence({ claim: '', calcKind: 'region_margin', params: { region: 'South' }, type: 'Insight', confidence: 'High', createdAt: daysAgoISO(2.4) });
  southEv.claim = `The South region’s profit margin is ${Math.abs(southEv.value).toFixed(1)} percentage points ${southEv.value < 0 ? 'below' : 'above'} the company average.`;
  addInsight({
    ev: southEv,
    title: `South region runs ${Math.abs(southEv.value).toFixed(1)} pp ${southEv.value < 0 ? 'below' : 'above'} company margin`,
    description: `South converts ${fmtPct(computeCalc(retail, 'region_margin', { region: 'South' }).out.series.find((s) => s.label === 'South').value)} of revenue into profit.`,
    category: 'Segment', importance: 'Medium', status: 'Verified',
    interpretation: 'South is close to the company benchmark, so the regional margin story is concentrated in North rather than spread across regions.',
    doesNotProve: ['That South has no margin risk at the account level.'],
    recommendedAction: 'Use South as the comparison benchmark when reviewing North’s discount posture.',
    supportingMetric: southEv.display,
    impact: { label: 'Margin gap vs company', value: fmtSigned(southEv.value, 1, ' pp'), tone: southEv.value < 0 ? 'warning' : 'positive' },
  });

  const eastEv = addEvidence({ claim: '', calcKind: 'region_margin', params: { region: 'East' }, type: 'Insight', confidence: 'High', createdAt: daysAgoISO(2.6) });
  eastEv.claim = `The East region’s profit margin is ${Math.abs(eastEv.value).toFixed(1)} percentage points ${eastEv.value < 0 ? 'below' : 'above'} the company average.`;
  addInsight({
    ev: eastEv,
    title: `East region margin is ${Math.abs(eastEv.value).toFixed(1)} pp ${eastEv.value < 0 ? 'below' : 'above'} the company average`,
    description: `East margin is computed on ${fmtInt(eastEv.sampleSize)} transactions after duplicate and null removal.`,
    category: 'Segment', importance: 'Low', status: 'Verified',
    interpretation: 'East performs at or slightly above the company benchmark, which is consistent with a healthier discount mix.',
    doesNotProve: ['That East’s mix is optimal.'],
    recommendedAction: 'No action required; keep monitoring in the monthly review.',
    supportingMetric: eastEv.display,
    impact: { label: 'Margin gap vs company', value: fmtSigned(eastEv.value, 1, ' pp'), tone: 'positive' },
  });

  const channelEv = addEvidence({ claim: '', calcKind: 'channel_share', params: { channel: 'Online' }, type: 'Insight', confidence: 'High', createdAt: daysAgoISO(2.8) });
  channelEv.claim = `Online sales account for ${channelEv.display.split(' ')[0]} of total FY2025 revenue.`;
  addInsight({
    ev: channelEv,
    title: `Online accounts for ${channelEv.display.split(' ')[0]} of revenue`,
    description: `Online revenue reached ${fmtCompactMoney(channelEv.series.find((s) => s.label === 'Online').value)} of ${fmtCompactMoney(sum(channelEv.series, (s) => s.value))} total.`,
    category: 'Segment', importance: 'Medium', status: 'Verified',
    interpretation: 'Online is the largest single channel by revenue, so channel-level quality issues propagate directly into headline totals.',
    doesNotProve: ['That online is the most profitable channel.'],
    recommendedAction: 'Pair this share with the channel margin analysis before shifting budget.',
    supportingMetric: channelEv.display,
    impact: { label: 'Online revenue', value: fmtCompactMoney(channelEv.series.find((s) => s.label === 'Online').value), tone: 'positive' },
  });

  const forecastEv = addEvidence({
    claim: '', calcKind: 'forecast_revenue', type: 'Insight', confidence: 'Low', createdAt: daysAgoISO(0.25),
    checkOverrides: { assumptions: { status: 'warn', detail: 'Linear extrapolation ignores Q4 seasonality; assumptions cannot be validated on 12 monthly points' } },
  });
  const forecastNext = forecastEv.extra.forecast[0];
  forecastEv.claim = `January 2026 revenue is projected at ${fmtCompactMoney(forecastNext.value)} based on a linear trend fitted to 2025 monthly totals (directional estimate).`;
  const forecastInsight = addInsight({
    ev: forecastEv,
    title: `January 2026 revenue projected near ${fmtCompactMoney(forecastNext.value)}`,
    description: `A least-squares trend fitted to twelve monthly totals projects ${fmtCompactMoney(forecastNext.value)} for January 2026, with February and March at ${fmtCompactMoney(forecastEv.extra.forecast[1].value)} and ${fmtCompactMoney(forecastEv.extra.forecast[2].value)}.`,
    category: 'Forecast', importance: 'Medium', status: 'Needs Review',
    interpretation: 'The trend points upward, but a linear fit on a seasonal year overstates Q1 because the Q4 peak pulls the slope up.',
    doesNotProve: ['That January revenue will land near the projection.', 'Any causal driver of the trend.'],
    recommendedAction: 'Do not use this projection for commitments. Re-run with a seasonal model once two years of history exist.',
    supportingMetric: `${fmtCompactMoney(forecastNext.value)} next month`,
    impact: { label: 'Projected January', value: fmtCompactMoney(forecastNext.value), tone: 'warning' },
  });

  const smallSampleFilters = [
    { field: 'date', op: 'between', value: '2025-01-01', value2: '2025-12-31' },
    { field: 'region', op: 'eq', value: 'North' },
    { field: 'segment', op: 'eq', value: 'Enterprise' },
    { field: 'category', op: 'eq', value: 'Grocery' },
    { field: 'channel', op: 'eq', value: 'Retail Store' },
    { field: 'product', op: 'eq', value: 'Pantry Box' },
  ];
  const smallEv = addEvidence({
    claim: '', calcKind: 'small_sample', params: { segment: 'Enterprise', region: 'North' }, filters: smallSampleFilters,
    type: 'Insight', confidence: 'Low', createdAt: daysAgoISO(3.2), required: ['csat', 'segment', 'region'],
  });
  smallEv.claim = `Enterprise customers in the North region buying Pantry Box in Retail Stores show ${smallEv.value} responses — too small a sample to support a satisfaction claim.`;
  const smallInsight = addInsight({
    ev: smallEv,
    title: 'Small-sample segment: satisfaction signal is too weak to use',
    description: `Only ${smallEv.value} usable CSAT responses exist for this segment-region-channel cell, well below the 30-response threshold.`,
    category: 'Segment', importance: 'Low', status: 'Rejected',
    interpretation: 'The cell is too thin to interpret. Any conclusion drawn from it would be dominated by one or two responses.',
    doesNotProve: ['Anything about satisfaction for this segment.', 'That the segment is satisfied or dissatisfied.'],
    recommendedAction: 'Excluded from reports until the sample grows. Broaden the cell to region-level before re-running.',
    supportingMetric: `n = ${smallEv.value} · threshold 30`,
    impact: { label: 'Sample size', value: `${smallEv.value} responses`, tone: 'negative' },
  });

  /* ---------------- Data-quality evidence + insights ---------------- */

  const missingEv = addEvidence({ claim: '', calcKind: 'quality_missing', params: { field: 'revenue' }, type: 'Data Quality', confidence: 'High', createdAt: daysAgoISO(3.5), required: [] });
  const missingCount = Math.round((missingEv.value / 100) * missingEv.sampleSize);
  missingEv.claim = `${missingEv.display} of Revenue values are missing; revenue totals exclude ${fmtInt(missingCount)} affected records.`;
  const missingInsight = addInsight({
    ev: missingEv,
    title: `Validation warning: ${missingEv.display} of Revenue values are missing`,
    description: `${fmtInt(missingCount)} records have no Revenue value. Every revenue aggregate excludes them and records the exclusion in its transformation log.`,
    category: 'Data Quality', importance: 'High', status: 'Warning',
    interpretation: 'Revenue totals are complete for captured transactions but do not include the missing rows, so totals are a lower bound.',
    doesNotProve: ['Whether the missing rows had zero revenue or simply were not captured.', 'The magnitude of any understatement.'],
    recommendedAction: 'Confirm the export logic with the commerce data owner before the next board pack.',
    supportingMetric: missingEv.display,
    impact: { label: 'Missing Revenue values', value: missingEv.display, tone: 'warning' },
  });

  const dupEv = addEvidence({ claim: '', calcKind: 'quality_duplicates', type: 'Data Quality', confidence: 'High', createdAt: daysAgoISO(3.6), required: [] });
  dupEv.claim = `${dupEv.value} duplicate transaction records were identified and excluded from every calculation.`;
  const dupInsight = addInsight({
    ev: dupEv,
    title: `${dupEv.value} duplicate transaction rows were excluded`,
    description: `Row-level dedupe on Transaction ID found ${dupEv.value} repeated records in the v3 import. They are excluded before aggregation and listed in the transformation log.`,
    category: 'Data Quality', importance: 'Medium', status: 'Warning',
    interpretation: 'Duplicates would have inflated revenue and row counts if left in. The exclusion is applied consistently across all analyses.',
    doesNotProve: ['That no near-duplicate orders exist under different transaction IDs.'],
    recommendedAction: 'Ask the warehouse team to make the export idempotent.',
    supportingMetric: `${dupEv.value} duplicate rows`,
    impact: { label: 'Rows excluded', value: fmtInt(dupEv.value), tone: 'warning' },
  });

  const dateEv = addEvidence({ claim: '', calcKind: 'quality_date_formats', type: 'Data Quality', confidence: 'High', createdAt: daysAgoISO(3.7), required: [] });
  dateEv.claim = `${dateEv.value} date values used a non-ISO format and were normalized during import.`;
  addInsight({
    ev: dateEv,
    title: `${fmtInt(dateEv.value)} dates required format normalization`,
    description: `Values in MM/DD/YYYY form were parsed as month-first and normalized to ISO 8601. The conversion is recorded in the lineage log for affected artifacts.`,
    category: 'Data Quality', importance: 'Low', status: 'Warning',
    interpretation: 'The normalization is safe for the sampled values but could be ambiguous for days below 13 in other exports.',
    doesNotProve: ['That all ambiguous dates were interpreted correctly.'],
    recommendedAction: 'Standardize the export to ISO 8601 at the source.',
    supportingMetric: `${fmtInt(dateEv.value)} non-ISO dates`,
    impact: { label: 'Values normalized', value: fmtInt(dateEv.value), tone: 'warning' },
  });

  /* ---------------- Archived (earlier-version) insights ---------------- */

  const archivedConfigs = [
    { ins: growthInsight, label: 'Revenue growth — v2 revision' },
    { ins: northInsight, label: 'North margin — v2 revision' },
    { ins: corrInsight, label: 'Ticket/churn association — v2 revision' },
    { ins: outlierInsight, label: 'Outlier audit — v2 revision' },
    { ins: discountInsight, label: 'Discount impact — v2 revision' },
    { ins: segmentInsights[0], label: 'Enterprise South CSAT — v2 revision' },
  ];
  archivedConfigs.forEach((cfg, i) => {
    const original = evidence.find((e) => e.id === cfg.ins.evidenceId);
    const archivedEv = {
      ...JSON.parse(JSON.stringify(original)),
      id: `EV-2025-A${String(i + 1).padStart(2, '0')}`,
      datasetVersionId: retail.versions[1].id,
      versionNumber: retail.versions[1].version,
      fingerprint: retail.versions[1].fingerprint,
      createdAt: daysAgoISO(18 + i),
      superseded: true,
      status: 'Superseded',
      owner: 'Priya Nair',
      checks: original.checks.map((c) => (c.key === 'fingerprint'
        ? { ...c, status: 'warn', detail: `Computed on v2 (${retail.versions[1].fingerprint.slice(0, 22)}…); superseded by v3 re-import` }
        : c)),
    };
    evidence.push(archivedEv);
    insights.push({
      ...JSON.parse(JSON.stringify(cfg.ins)),
      id: `INS-${String(insSeq++).padStart(3, '0')}`,
      title: `${cfg.ins.title} — v2 revision`,
      status: 'Rejected',
      archived: true,
      evidenceId: archivedEv.id,
      generatedAt: daysAgoISO(19 + i),
      confidence: Math.max(60, cfg.ins.confidence - 8),
      evidenceCoverage: 74,
    });
  });

  /* ---------------- Visualizations ---------------- */

  const vizDefs = [
    {
      title: 'Monthly revenue trend', type: 'line', calcKind: 'series_monthly_revenue',
      description: 'Total revenue by calendar month with the Q4 seasonal uplift highlighted.',
      dimension: 'date', metric: 'revenue', aggregation: 'sum', filters: [],
      claim: 'Monthly revenue rose from a January low into a December peak, with Q4 above Q3.',
    },
    {
      title: 'Revenue by region', type: 'bar', calcKind: 'series_region_revenue',
      description: 'Total FY2025 revenue by region, ordered by contribution.',
      dimension: 'region', metric: 'revenue', aggregation: 'sum', filters: [],
      claim: 'Regional revenue contribution is concentrated in the two largest regions.',
    },
    {
      title: 'Profit margin by category and region', type: 'stackedBar', calcKind: 'series_category_margin',
      description: 'Profit margin per product category, split by region to expose regional margin drag.',
      dimension: 'category', metric: 'profit', aggregation: 'margin', secondary: 'region', filters: [],
      claim: 'Category margins vary materially by region; North trails in every category.',
    },
    {
      title: 'Support tickets vs churn risk', type: 'scatter', calcKind: 'scatter_tickets_churn',
      description: 'Each point is a transaction; churn risk is encoded as an ordinal score.',
      dimension: 'tickets', metric: 'tickets', aggregation: 'count', filters: [], secondary: 'churn',
      claim: 'Higher support-ticket volume is associated with higher churn risk.',
    },
    {
      title: 'Revenue distribution', type: 'histogram', calcKind: 'series_revenue_hist',
      description: 'Distribution of transaction revenue across twelve equal-width bins.',
      dimension: 'revenue', metric: 'revenue', aggregation: 'count', filters: [],
      claim: 'Transaction revenue is right-skewed with a long tail of large deals.',
    },
    {
      title: 'Regional revenue contribution', type: 'donut', calcKind: 'series_region_share',
      description: 'Each region’s share of total FY2025 revenue.',
      dimension: 'region', metric: 'revenue', aggregation: 'sum', filters: [],
      claim: 'Regional revenue shares are uneven, with the largest region near a third of the total.',
    },
    {
      title: 'Correlation heatmap — numeric fields', type: 'heatmap', calcKind: 'corr_matrix',
      description: 'Pairwise Pearson correlation across revenue, profit, units, discount, tickets and CSAT.',
      dimension: null, metric: null, aggregation: 'corr', filters: [],
      claim: 'Discount and profit move together negatively; tickets and CSAT move together negatively.',
    },
    {
      title: 'Customer segment comparison', type: 'groupedBar', calcKind: 'series_segment_compare',
      description: 'Revenue and average CSAT side by side for each customer segment.',
      dimension: 'segment', metric: 'revenue', aggregation: 'sum', secondaryMetric: 'csat', filters: [],
      claim: 'Segment revenue and satisfaction do not rank in the same order.',
    },
  ];

  vizDefs.forEach((def, i) => {
    const ev = addEvidence({
      claim: def.claim, calcKind: def.calcKind, type: 'Visualization', confidence: 'High',
      createdAt: daysAgoISO(0.6 + i * 0.35), required: undefined,
    });
    const viz = {
      id: `VIZ-${String(i + 1).padStart(3, '0')}`,
      title: def.title,
      description: def.description,
      type: def.type,
      datasetId: retail.id,
      datasetVersionId: currentVersion.id,
      versionNumber: currentVersion.version,
      dimension: def.dimension,
      metric: def.metric,
      aggregation: def.aggregation,
      secondary: def.secondary || null,
      secondaryMetric: def.secondaryMetric || null,
      filters: def.filters,
      chartConfig: {},
      evidenceId: ev.id,
      validationStatus: ev.status,
      updatedAt: daysAgoISO(0.5 + i * 0.4),
      createdBy: i % 2 ? 'Priya Nair' : 'Alex Morgan',
      calcKind: def.calcKind,
      params: {},
    };
    visualizations.push(viz);
    ev.artifacts = [{ type: 'Chart', label: def.title, ref: viz.id }];
  });

  /* ---------------- Reports ---------------- */

  const reportInsightIds = [
    growthInsight.id, northInsight.id, corrInsight.id,
    ...segmentInsights.map((s) => s.id),
    ...categoryInsights.map((c) => c.id),
    southEv ? insights.find((i) => i.evidenceId === southEv.id).id : null,
    discountInsight.id, forecastInsight.id,
  ].filter(Boolean).slice(0, 14);

  const reportInsightEvidence = reportInsightIds.map((id) => insights.find((i) => i.id === id)?.evidenceId).filter(Boolean);

  const report1 = {
    id: 'RPT-001',
    title: 'FY2025 Q4 Revenue and Customer Risk Review',
    audience: 'Executive leadership team',
    status: 'Published',
    createdBy: 'u_alex',
    createdAt: daysAgoISO(2.2),
    updatedAt: daysAgoISO(0.15),
    summary: `Q4 revenue closed ${Math.abs(growth).toFixed(1)}% above Q3. This review bundles the verified findings, the visual evidence behind them, and the open quality caveats that affect how far the numbers can be pushed.`,
    methodology: 'All figures are computed from the FY2025 Retail Performance dataset (v3) using deterministic aggregations. Duplicate transaction IDs and rows with a null Revenue value are excluded and logged. Every finding links to an evidence artifact with its formula, validation checks and reproduction result.',
    limitations: [
      'Comparisons are observational; no causal claims are made.',
      'Revenue totals exclude records where Revenue is missing and 12 duplicate rows.',
      'The Q4 seasonality is measured on a single year of history.',
      'Forecasts are directional and not suitable for financial commitments.',
    ],
    sections: [
      { id: 'sec-1', type: 'summary', title: 'Executive Summary', body: `Revenue reached ${fmtCompactMoney(q4.value)} in Q4 2025, ${fmtCompactMoney(q4.value - q3.value)} above Q3 (${fmtSigned(growth, 1)}). Growth was broad-based across categories, but margin quality is uneven: the North region trails the company benchmark by ${Math.abs(northEv.value).toFixed(1)} points. Support-ticket volume remains the strongest observable signal associated with churn risk (r = ${corrR.toFixed(2)}), and ${outlierEv.value} unusually large transactions carry a disproportionate share of revenue.` },
      { id: 'sec-2', type: 'metrics', title: 'Key Metrics', refs: reportInsightEvidence.slice(0, 4) },
      { id: 'sec-3', type: 'insights', title: 'Verified Findings', refs: reportInsightIds },
      { id: 'sec-4', type: 'charts', title: 'Visual Analysis', refs: ['VIZ-001', 'VIZ-002', 'VIZ-003', 'VIZ-006'] },
      {
        id: 'sec-5', type: 'risk', title: 'Customer Risk Signals',
        body: `Support-ticket volume is positively associated with churn risk (r = ${corrR.toFixed(2)}, n = ${fmtInt(corrEv.sampleSize)}). This is a correlational signal: reducing tickets may help, but the data cannot prove that ticket volume drives churn. ${segmentInsights[0].impact.value} CSAT in the Enterprise/South cell warrants a separate account review.`,
        refs: [corrInsight.id, segmentInsights[0].id, discountInsight.id],
      },
      {
        id: 'sec-6', type: 'quality', title: 'Data Quality and Limitations',
        datasetId: retail.id,
        body: `Current quality score: ${retail.quality.score}/100. ${retail.quality.issues.filter((i) => i.severity === 'warning').length} warnings remain open, including missing Revenue values and duplicate rows. Findings that depend on the affected columns are excluded from decision use or flagged.`,
      },
      { id: 'sec-7', type: 'evidence', title: 'Evidence Appendix', refs: reportInsightEvidence },
      {
        id: 'sec-8', type: 'actions', title: 'Recommended Actions',
        body: [
          'Approve a margin review for the North region covering discount approvals and cost-to-serve.',
          'Add ticket volume to the monthly account-risk review; do not present it as a cause of churn.',
          'Confirm the largest transactions with account owners before the board pack.',
          'Fix the commerce export to remove duplicate batches and standardize dates to ISO 8601.',
        ],
      },
    ],
    exportOptions: ['PDF', 'CSV', 'Evidence bundle', 'Share link'],
  };

  const report2 = {
    id: 'RPT-002',
    title: 'Q4 Regional Margin Deep Dive',
    audience: 'Regional directors',
    status: 'Draft',
    createdBy: 'u_marcus',
    createdAt: daysAgoISO(4),
    updatedAt: daysAgoISO(1.1),
    summary: 'Draft analysis of the margin gap between North and the rest of the business. Awaiting cost-to-serve data before publication.',
    methodology: 'Margin computed as SUM(Profit) / SUM(Revenue) per region from FY2025 Retail Performance v3.',
    limitations: ['Cost-to-serve is not split by region in the source system.', 'Draft — not yet reviewed.'],
    sections: [
      { id: 'sec-1', type: 'summary', title: 'Executive Summary', body: 'North margin trails the company average. This draft collects the supporting evidence and flags the cost data gap that blocks a full explanation.' },
      { id: 'sec-2', type: 'insights', title: 'Regional Findings', refs: [northInsight.id, insights.find((i) => i.evidenceId === southEv.id)?.id, insights.find((i) => i.evidenceId === eastEv.id)?.id].filter(Boolean) },
      { id: 'sec-3', type: 'charts', title: 'Margin Evidence', refs: ['VIZ-003'] },
      { id: 'sec-4', type: 'actions', title: 'Open Questions', body: ['Which cost lines drive the North gap?', 'Is the discount approval threshold different in North?'] },
    ],
    exportOptions: ['PDF', 'CSV', 'Evidence bundle'],
  };

  /* ---------------- Activity + notifications ---------------- */

  const activity = [
    { id: uid('act'), type: 'upload', title: 'Dataset uploaded', detail: 'FY2025 Retail Performance v3 imported by Priya Nair · 18,642 rows', at: daysAgoISO(6) },
    { id: uid('act'), type: 'analysis', title: 'Automated analysis completed', detail: '6 preset analyses executed · 13 evidence artifacts produced', at: daysAgoISO(5.8) },
    { id: uid('act'), type: 'validation', title: 'Insight validated', detail: `${growthInsight.id} · Revenue grew ${Math.abs(growth).toFixed(1)}% from Q3 to Q4`, at: daysAgoISO(3.1) },
    { id: uid('act'), type: 'review', title: 'Finding flagged for review', detail: `${discountInsight.id} · cohort assumptions need analyst review`, at: daysAgoISO(1.4) },
    { id: uid('act'), type: 'export', title: 'Report exported', detail: 'FY2025 Q4 Revenue and Customer Risk Review · evidence bundle (PDF + JSON)', at: daysAgoISO(0.15) },
  ];

  const notifications = [
    { id: uid('ntf'), title: '2 findings need review', detail: 'Discount impact and the revenue forecast are waiting on analyst sign-off.', at: daysAgoISO(0.4), read: false, kind: 'review' },
    { id: uid('ntf'), title: 'Dataset v3 validated', detail: 'FY2025 Retail Performance passed fingerprint and schema checks.', at: daysAgoISO(6), read: false, kind: 'check' },
    { id: uid('ntf'), title: 'Report exported', detail: 'Q4 Revenue and Customer Risk Review exported to PDF.', at: daysAgoISO(0.15), read: true, kind: 'export' },
  ];

  const workspace = {
    name: 'Acme Retail Analytics',
    plan: 'Enterprise · 12 seats',
    createdAt: daysAgoISO(120),
    previousRun: { datasets: 2, rows: 16502, insights: 19, verified: 11, review: 3, quality: 82 },
    settings: {
      minSample: 30,
      confidenceThreshold: 90,
      allowWarningsInReports: false,
      defaultOwner: 'u_alex',
      notifyOnReview: true,
      notifyOnExport: false,
      compactTables: false,
    },
  };

  evidence.forEach(refreshEvidence);
  visualizations.forEach((viz) => {
    const ev = evidence.find((e) => e.id === viz.evidenceId);
    if (ev) viz.validationStatus = ev.status;
  });
  insights.forEach((ins) => {
    const ev = evidence.find((e) => e.id === ins.evidenceId);
    if (ev && !ins.archived) ins.confidence = Math.max(55, Math.min(98, ev.score));
  });

  const data = {
    version: 1,
    seededAt: nowISO(),
    workspace,
    users,
    currentUserId: 'u_alex',
    datasets,
    analyses,
    visualizations,
    insights,
    evidence,
    reports: [report1, report2],
    activity,
    notifications,
  };

  return data;
}
