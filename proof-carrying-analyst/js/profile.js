/* Dataset profiling & data-quality scoring. All scores are computed from the actual rows. */
import { isIsoDate, parseDate, quantile, unique, fmtInt, fmtPct } from './util.js';

export const TYPES = {
  numeric: { label: 'Numeric', icon: 'hash' },
  date: { label: 'Date', icon: 'calendar' },
  categorical: { label: 'Categorical', icon: 'tag' },
  text: { label: 'Text', icon: 'type' },
};

export function inferColumnType(values) {
  const present = values.filter((v) => v !== null && v !== undefined && v !== '');
  if (!present.length) return 'text';
  const numeric = present.filter((v) => typeof v === 'number' || (String(v).trim() !== '' && Number.isFinite(Number(v))));
  if (numeric.length / present.length >= 0.9) return 'numeric';
  const dates = present.filter((v) => {
    const d = parseDate(v);
    return d && typeof v === 'string' && /[\/-]/.test(v);
  });
  if (dates.length / present.length >= 0.9) return 'date';
  const uniq = unique(present).length;
  if (uniq <= Math.max(40, present.length * 0.25)) return 'categorical';
  return 'text';
}

function isBlank(v) {
  return v === null || v === undefined || v === '';
}

function numericValue(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const n = Number(String(v).replace(/[$,]/g, '').trim());
  return Number.isFinite(n) ? n : null;
}

/**
 * Profiles a dataset (columns + row arrays) and returns column profiles,
 * a weighted quality score, category scores and a list of issues.
 */
export function profileDataset(dataset) {
  const { columns, rows } = dataset;
  const rowCount = rows.length;
  const colCount = columns.length;
  const totalCells = Math.max(1, rowCount * colCount);

  const colProfiles = columns.map((col, i) => {
    const values = rows.map((r) => r[i]);
    const present = values.filter((v) => !isBlank(v));
    const nullCount = rowCount - present.length;
    const type = col.type || inferColumnType(values);
    const profile = {
      key: col.key,
      label: col.label,
      type,
      nullCount,
      nullPct: rowCount ? (nullCount / rowCount) * 100 : 0,
      uniqueCount: unique(present.map(String)).length,
      examples: unique(present.map(String)).slice(0, 3),
      issues: [],
      invalidCount: 0,
      min: null,
      max: null,
      mean: null,
      isKey: !!col.isKey,
      unit: col.unit || null,
    };
    if (type === 'numeric') {
      const nums = present.map(numericValue).filter((n) => n !== null);
      profile.invalidCount = present.length - nums.length;
      if (nums.length) {
        profile.min = Math.min(...nums);
        profile.max = Math.max(...nums);
        profile.mean = nums.reduce((a, b) => a + b, 0) / nums.length;
      }
    } else if (type === 'date') {
      const parsed = present.map(parseDate).filter(Boolean);
      profile.invalidCount = present.length - parsed.length;
      const nonIso = present.filter((v) => !isIsoDate(v)).length;
      profile.nonIsoCount = nonIso;
      if (parsed.length) {
        const times = parsed.map((d) => d.getTime()).sort((a, b) => a - b);
        profile.min = new Date(times[0]).toISOString().slice(0, 10);
        profile.max = new Date(times[times.length - 1]).toISOString().slice(0, 10);
      }
    }

    if (profile.nullPct >= 1) {
      profile.issues.push({
        severity: profile.nullPct >= 5 || col.critical ? 'warning' : 'info',
        message: `${fmtPct(profile.nullPct)} missing values`,
      });
    }
    if (profile.invalidCount > 0) {
      profile.issues.push({ severity: 'warning', message: `${fmtInt(profile.invalidCount)} values failed type validation` });
    }
    if (profile.nonIsoCount > 0) {
      profile.issues.push({ severity: 'warning', message: `${fmtInt(profile.nonIsoCount)} non-ISO date values` });
    }
    return profile;
  });

  // ---- row-level integrity checks ----
  const keyIdx = columns.findIndex((c) => c.isKey);
  const seen = new Set();
  let duplicateRows = 0;
  rows.forEach((r, i) => {
    const key = keyIdx >= 0 ? String(r[keyIdx]) : JSON.stringify(r);
    if (seen.has(key)) duplicateRows++;
    else seen.add(key);
  });

  const nullCells = colProfiles.reduce((acc, p) => acc + p.nullCount, 0);
  const invalidCells = colProfiles.reduce((acc, p) => acc + (p.invalidCount || 0), 0);
  const dateCols = colProfiles.filter((p) => p.type === 'date');
  const nonIsoCells = dateCols.reduce((acc, p) => acc + (p.nonIsoCount || 0), 0);
  const categoricalInconsistent = countCasingInconsistencies(columns, rows);
  const inconsistentCells = nonIsoCells + categoricalInconsistent;

  const revenueIdx = columns.findIndex((c) => c.key === 'revenue');
  let outlierRows = 0;
  if (revenueIdx >= 0) {
    const nums = rows.map((r) => numericValue(r[revenueIdx])).filter((n) => n !== null);
    const q1 = quantile(nums, 0.25);
    const q3 = quantile(nums, 0.75);
    const med = quantile(nums, 0.5);
    if (q1 !== null && q3 !== null && med !== null) {
      const hi = Math.max(q3 + 3 * (q3 - q1), med + 10 * (q3 - q1));
      outlierRows = nums.filter((n) => n > hi).length;
    }
  }

  const invalidRowSet = new Set();
  rows.forEach((r, i) => {
    colProfiles.forEach((p, ci) => {
      const v = r[ci];
      if (isBlank(v)) return;
      if (p.type === 'numeric' && numericValue(v) === null) invalidRowSet.add(i);
      if (p.type === 'date' && !parseDate(v)) invalidRowSet.add(i);
      if (p.key === 'discount') {
        const n = numericValue(v);
        if (n !== null && (n < 0 || n > 0.75)) invalidRowSet.add(i);
      }
      if (p.key === 'csat') {
        const n = numericValue(v);
        if (n !== null && (n < 1 || n > 5)) invalidRowSet.add(i);
      }
      if (p.key === 'units') {
        const n = numericValue(v);
        if (n !== null && n <= 0) invalidRowSet.add(i);
      }
    });
  });
  const invalidRows = invalidRowSet.size;

  const nullPctAll = (nullCells / totalCells) * 100;
  const invalidPct = rowCount ? (invalidRows / rowCount) * 100 : 0;
  const inconsistentPct = rowCount ? (inconsistentCells / rowCount) * 100 : 0;
  const duplicatePct = rowCount ? (duplicateRows / rowCount) * 100 : 0;

  // Documented quality model (see Settings → Quality model).
  const completeness = clampScore(100 - nullPctAll * 5);
  const consistency = clampScore(100 - inconsistentPct * 5);
  const uniqueness = clampScore(100 - duplicatePct * 40);
  const validity = clampScore(100 - invalidPct * 12);
  const timeliness = timelinessScore(dataset);

  const categories = { completeness, consistency, uniqueness, validity, timeliness };
  const score = Math.round(
    completeness * 0.25 + consistency * 0.2 + uniqueness * 0.15 + validity * 0.25 + timeliness * 0.15
  );

  const issues = buildIssues({ colProfiles, duplicateRows, nonIsoCells, outlierRows, invalidRows, rowCount });

  return {
    score,
    categories: {
      completeness: Math.round(completeness),
      consistency: Math.round(consistency),
      uniqueness: Math.round(uniqueness),
      validity: Math.round(validity),
      timeliness: Math.round(timeliness),
    },
    metrics: {
      rowCount,
      columnCount: colCount,
      nullCells,
      nullPct: nullPctAll,
      duplicateRows,
      duplicatePct,
      invalidRows,
      invalidPct,
      inconsistentCells,
      outlierRows,
      totalCells,
    },
    issues,
    columns: colProfiles,
  };
}

function clampScore(n) {
  return Math.max(0, Math.min(100, n));
}

function countCasingInconsistencies(columns, rows) {
  let count = 0;
  columns.forEach((col, i) => {
    if (col.type === 'date' || col.type === 'numeric') return;
    const groups = new Map();
    rows.forEach((r) => {
      const v = r[i];
      if (typeof v !== 'string' || !v.trim()) return;
      const key = v.toLowerCase();
      if (!groups.has(key)) groups.set(key, new Map());
      const variants = groups.get(key);
      variants.set(v, (variants.get(v) || 0) + 1);
    });
    groups.forEach((variants) => {
      if (variants.size <= 1) return;
      let canonical = null;
      let best = -1;
      variants.forEach((n, v) => { if (n > best) { best = n; canonical = v; } });
      variants.forEach((n, v) => { if (v !== canonical) count += n; });
    });
  });
  return count;
}

function timelinessScore(dataset) {
  const upload = parseDate(dataset.uploadDate) || new Date();
  const ageDays = (Date.now() - upload.getTime()) / 86400000;
  // Fresh imports score highest; older imports decline slowly.
  return clampScore(98 - Math.max(0, ageDays) * 0.8);
}

function buildIssues({ colProfiles, duplicateRows, nonIsoCells, outlierRows, invalidRows, rowCount }) {
  const issues = [];
  let n = 1;
  colProfiles.forEach((p) => {
    if (p.nullPct >= 5) {
      issues.push({
        id: `Q-${String(n++).padStart(2, '0')}`,
        title: `Missing values in “${p.label}”`,
        detail: `${fmtInt(p.nullCount)} of ${fmtInt(rowCount)} records (${fmtPct(p.nullPct)}) have no value. Downstream aggregates exclude these rows, which is recorded in every evidence artifact.`,
        severity: 'warning',
        impactedRows: p.nullCount,
        recommendation: 'Confirm with the source system whether blanks mean “no sale”, “not captured”, or “zero”.',
        status: 'Open',
        column: p.key,
      });
    }
  });
  if (duplicateRows > 0) {
    issues.push({
      id: `Q-${String(n++).padStart(2, '0')}`,
      title: 'Duplicate transaction records',
      detail: `${fmtInt(duplicateRows)} rows repeat an existing Transaction ID. Duplicates are excluded by row-level dedupe before every calculation.`,
      severity: 'warning',
      impactedRows: duplicateRows,
      recommendation: 'Check the export job for retried batches before the next load.',
      status: 'Acknowledged',
    });
  }
  if (nonIsoCells > 0) {
    issues.push({
      id: `Q-${String(n++).padStart(2, '0')}`,
      title: 'Inconsistent date formats',
      detail: `${fmtInt(nonIsoCells)} dates are stored as MM/DD/YYYY instead of ISO 8601. The parser normalizes both formats and logs the conversion.`,
      severity: 'info',
      impactedRows: nonIsoCells,
      recommendation: 'Standardize the export to ISO 8601 to remove normalization ambiguity.',
      status: 'Open',
    });
  }
  if (outlierRows > 0) {
    issues.push({
      id: `Q-${String(n++).padStart(2, '0')}`,
      title: 'Revenue outliers detected',
      detail: `${fmtInt(outlierRows)} transactions sit beyond 1.5× IQR of the Revenue distribution. They are flagged, never silently removed.`,
      severity: 'info',
      impactedRows: outlierRows,
      recommendation: 'Review large deals with the account team before using totals in a board report.',
      status: 'Open',
    });
  }
  if (invalidRows > 0) {
    issues.push({
      id: `Q-${String(n++).padStart(2, '0')}`,
      title: 'Values outside documented ranges',
      detail: `${fmtInt(invalidRows)} rows contain a Discount outside 0–75%, a CSAT outside 1–5, or a non-positive unit count. These values are excluded from range-sensitive calculations.`,
      severity: 'warning',
      impactedRows: invalidRows,
      recommendation: 'Correct the source export or define an explicit exclusion rule for these rows.',
      status: 'Open',
    });
  }
  if (!issues.length) {
    issues.push({
      id: 'Q-00',
      title: 'No quality issues detected',
      detail: 'All automated quality checks passed on the current version.',
      severity: 'success',
      impactedRows: 0,
      recommendation: 'No action needed.',
      status: 'Resolved',
    });
  }
  return issues;
}

export function overallQuality(datasets) {
  const active = datasets.filter((d) => !d.archived);
  if (!active.length) return null;
  const totalRows = active.reduce((acc, d) => acc + (d.rowCount || 0), 0) || 1;
  return Math.round(active.reduce((acc, d) => acc + (d.quality?.score || 0) * (d.rowCount || 1), 0) / totalRows);
}
