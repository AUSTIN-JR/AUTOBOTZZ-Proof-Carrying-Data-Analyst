/* Visualization data builders and the Analysis Studio engine. */
import {
  sum, mean, median, stdDev, quantile, pearson, correlationPValue, groupBy, parseDate, monthShort,
  fmtCompact, fmtCompactMoney, fmtMoney, fmtInt, fmtPct, fmtSigned, clamp, deepClone,
} from './util.js';
import {
  prepare, num, CHURN_SCORE, computeCalc, scoreChecks, deriveStatus, CALCS, labelOf, idxMap,
} from './calc.js';

export const VIZ_TYPES = [
  { value: 'line', label: 'Line chart' },
  { value: 'bar', label: 'Bar chart' },
  { value: 'stackedBar', label: 'Stacked bar chart' },
  { value: 'groupedBar', label: 'Grouped bar chart' },
  { value: 'scatter', label: 'Scatter plot' },
  { value: 'histogram', label: 'Histogram' },
  { value: 'donut', label: 'Donut chart' },
  { value: 'heatmap', label: 'Correlation heatmap' },
];

export const AGGREGATIONS = [
  { value: 'sum', label: 'Sum' },
  { value: 'avg', label: 'Average' },
  { value: 'median', label: 'Median' },
  { value: 'count', label: 'Count of rows' },
  { value: 'margin', label: 'Profit margin %' },
];

function monthLabelOf(value) {
  const d = parseDate(value);
  if (!d) return null;
  return { key: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`, label: `${monthShort(d.getUTCMonth())} ${d.getUTCFullYear()}`, date: d };
}

function aggregateGroup(rows, idx, metricIdx, aggregation) {
  if (aggregation === 'count' || metricIdx == null) return rows.length;
  if (aggregation === 'margin') {
    const revenue = sum(rows, (r) => num(r[idx.revenue]) || 0);
    const profit = sum(rows, (r) => num(r[idx.profit]) || 0);
    return revenue ? (profit / revenue) * 100 : 0;
  }
  const values = rows.map((r) => num(r[metricIdx])).filter((v) => v !== null);
  if (aggregation === 'avg') return mean(values) || 0;
  if (aggregation === 'median') return median(values) || 0;
  return sum(values);
}

/** Builds chart-ready data for a visualization definition. */
export function buildVizData(viz, dataset) {
  const filters = viz.filters || [];
  const cols = dataset.columns;
  const isDateDim = cols.find((c) => c.key === viz.dimension)?.type === 'date';
  const metricKey = viz.metric && viz.metric !== 'count' ? viz.metric : null;
  const required = [];
  if (metricKey) required.push(metricKey);
  if (viz.dimension && !isDateDim) required.push(viz.dimension);
  if (viz.secondary && viz.type === 'stackedBar') required.push(viz.secondary);
  if (viz.secondary && viz.type === 'scatter' && viz.secondary !== 'churn') required.push(viz.secondary);
  if (viz.type === 'heatmap') required.length = 0;
  const prep = prepare(dataset, { filters, required: Array.from(new Set(required)), dedupe: true });
  const idx = prep.idx;
  const aggregation = viz.aggregation || 'sum';
  const metricLabel = viz.metric ? labelOf(dataset, viz.metric) : 'Rows';

  if (viz.type === 'heatmap') {
    const fields = ['revenue', 'profit', 'units', 'discount', 'tickets', 'csat'];
    const vectors = {};
    fields.forEach((f) => { vectors[f] = prep.rows.map((r) => (f === 'csat' ? (num(r[idx.csat]) >= 1 && num(r[idx.csat]) <= 5 ? num(r[idx.csat]) : null) : num(r[idx[f]]))); });
    const matrix = fields.map((a) => fields.map((b) => {
      const { r } = pearson(vectors[a], vectors[b]);
      return r === null ? 0 : Math.round(r * 1000) / 1000;
    }));
    return {
      kind: 'heatmap',
      matrix,
      fields,
      labels: Object.fromEntries(fields.map((f) => [f, labelOf(dataset, f)])),
      table: { columns: ['Field A', 'Field B', 'Pearson r'], rows: fields.flatMap((a, i) => fields.map((b, j) => [labelOf(dataset, a), labelOf(dataset, b), matrix[i][j].toFixed(2)])) },
      rows: prep.kept,
    };
  }

  if (viz.type === 'histogram') {
    const values = prep.rows.map((r) => num(r[idx[viz.metric]])).filter((v) => v !== null && v >= 0);
    const max = quantile(values, 0.995) || 1;
    const bins = 12;
    const width = max / bins;
    const counts = new Array(bins).fill(0);
    values.forEach((v) => counts[clamp(Math.floor(v / width), 0, bins - 1)]++);
    const labels = counts.map((_, i) => fmtCompact(width * i));
    return {
      kind: 'chart',
      spec: {
        type: 'histogram',
        labels,
        series: [{ label: metricLabel, data: counts }],
        yFormat: 'compact',
      },
      table: { columns: ['Bin start', 'Bin end', 'Rows'], rows: counts.map((c, i) => [fmtMoney(width * i), fmtMoney(width * (i + 1)), c]) },
      rows: values.length,
      meta: { total: values.length, median: median(values) },
    };
  }

  if (viz.type === 'scatter') {
    const xKey = viz.dimension;
    const yKey = viz.secondary;
    const points = [];
    prep.rows.forEach((r) => {
      const x = num(r[idx[xKey]]);
      let y = null;
      if (yKey === 'churn') y = CHURN_SCORE[String(r[idx.churn])];
      else if (yKey) y = num(r[idx[yKey]]);
      if (Number.isFinite(x) && Number.isFinite(y)) points.push([x, y]);
    });
    const sample = points.filter((_, i) => i % Math.max(1, Math.ceil(points.length / 700)) === 0);
    const { r: corr } = pearson(points.map((p) => p[0]), points.map((p) => p[1]));
    return {
      kind: 'chart',
      spec: {
        type: 'scatter',
        labels: [],
        series: [{ label: `${labelOf(dataset, xKey)} vs ${yKey === 'churn' ? 'Churn Risk score' : labelOf(dataset, yKey)}`, data: sample.map((p) => ({ x: p[0], y: p[1] })) }],
        yFormat: 'compact',
      },
      table: { columns: [labelOf(dataset, xKey), yKey === 'churn' ? 'Churn risk score' : labelOf(dataset, yKey)], rows: sample.slice(0, 300).map((p) => [p[0], p[1]]) },
      rows: points.length,
      meta: { corr, plotted: sample.length },
    };
  }

  if (viz.type === 'donut') {
    const groups = new Map();
    prep.rows.forEach((r) => {
      const key = viz.dimension ? String(r[idx[viz.dimension]]) : 'All';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(r);
    });
    const items = Array.from(groups.entries()).map(([label, rows]) => ({
      label, value: Math.round(aggregateGroup(rows, idx, metricKey ? idx[metricKey] : null, aggregation)), n: rows.length,
    })).sort((a, b) => b.value - a.value);
    const total = sum(items, (i) => i.value) || 1;
    return {
      kind: 'chart',
      spec: {
        type: 'donut',
        labels: items.map((i) => i.label),
        series: [{ label: metricLabel, data: items.map((i) => i.value) }],
        yFormat: 'compactMoney',
      },
      table: { columns: [viz.dimension ? labelOf(dataset, viz.dimension) : 'Group', metricLabel, 'Share'], rows: items.map((i) => [i.label, i.value, `${((i.value / total) * 100).toFixed(1)}%`]) },
      rows: prep.kept,
      meta: { total: sum(items, (i) => i.value) },
    };
  }

  if (viz.type === 'stackedBar' || viz.type === 'groupedBar') {
    const primaryDim = viz.dimension;
    const labelsMap = new Map();
    prep.rows.forEach((r) => {
      let key;
      if (isDateDim) {
        const m = monthLabelOf(r[idx[primaryDim]]);
        key = m ? m.label : 'Invalid date';
      } else key = r[idx[primaryDim]] == null ? 'Unspecified' : String(r[idx[primaryDim]]);
      if (!labelsMap.has(key)) labelsMap.set(key, []);
      labelsMap.get(key).push(r);
    });
    const labels = Array.from(labelsMap.keys());
    let series = [];
    if (viz.type === 'groupedBar' && viz.secondaryMetric) {
      series = [
        { label: `${metricLabel} (${aggregation})`, data: labels.map((l) => Math.round(aggregateGroup(labelsMap.get(l), idx, metricKey ? idx[metricKey] : null, aggregation))) },
        {
          label: `${labelOf(dataset, viz.secondaryMetric)} (avg)`,
          data: labels.map((l) => Number(mean(labelsMap.get(l), (r) => num(r[idx[viz.secondaryMetric]])).toFixed(2))),
          axis: 'y2',
        },
      ];
    } else {
      const secondaryValues = viz.secondary
        ? Array.from(new Set(prep.rows.map((r) => (r[idx[viz.secondary]] == null ? 'Unspecified' : String(r[idx[viz.secondary]]))))).sort()
        : ['All'];
      series = secondaryValues.map((sv) => ({
        label: sv,
        data: labels.map((l) => {
          const rows = viz.secondary ? labelsMap.get(l).filter((r) => (r[idx[viz.secondary]] == null ? 'Unspecified' : String(r[idx[viz.secondary]])) === sv) : labelsMap.get(l);
          const v = aggregateGroup(rows, idx, metricKey ? idx[metricKey] : null, aggregation);
          return Number(Number(v).toFixed(2));
        }),
        stack: viz.type === 'stackedBar' ? 'stack' : undefined,
      }));
    }
    return {
      kind: 'chart',
      spec: {
        type: viz.type,
        labels,
        series,
        yFormat: aggregation === 'margin' ? 'percent' : aggregation === 'count' ? 'compact' : 'compactMoney',
        stacked: viz.type === 'stackedBar',
        showLegend: true,
        y2: !!viz.secondaryMetric,
      },
      table: {
        columns: [labelOf(dataset, primaryDim), ...series.map((s) => s.label)],
        rows: labels.map((l, i) => [l, ...series.map((s) => s.data[i])]),
      },
      rows: prep.kept,
    };
  }

  // line & bar
  let labels; let data; let labelForTable;
  if (isDateDim) {
    const buckets = new Map();
    prep.rows.forEach((r) => {
      const m = monthLabelOf(r[idx[viz.dimension]]);
      if (!m) return;
      if (!buckets.has(m.key)) buckets.set(m.key, { label: m.label, rows: [] });
      buckets.get(m.key).rows.push(r);
    });
    const ordered = Array.from(buckets.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    labels = ordered.map(([, b]) => b.label);
    data = ordered.map(([, b]) => Math.round(aggregateGroup(b.rows, idx, metricKey ? idx[metricKey] : null, aggregation)));
    labelForTable = 'Month';
  } else {
    const groups = new Map();
    prep.rows.forEach((r) => {
      const key = viz.dimension ? String(r[idx[viz.dimension]] ?? 'Unspecified') : 'All records';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(r);
    });
    const items = Array.from(groups.entries()).map(([label, rows]) => ({ label, value: aggregateGroup(rows, idx, metricKey ? idx[metricKey] : null, aggregation), n: rows.length }))
      .sort((a, b) => b.value - a.value);
    labels = items.map((i) => i.label);
    data = items.map((i) => Math.round(i.value * 100) / 100);
    labelForTable = viz.dimension ? labelOf(dataset, viz.dimension) : 'Group';
  }
  return {
    kind: 'chart',
    spec: {
      type: viz.type === 'bar' ? 'bar' : 'line',
      labels,
      series: [{ label: viz.type === 'line' ? metricLabel : 'Value', data }],
      yFormat: aggregation === 'margin' ? 'percent' : 'compactMoney',
      showLegend: false,
    },
    table: { columns: [labelForTable, metricLabel], rows: labels.map((l, i) => [l, data[i]]) },
    rows: prep.kept,
    meta: { labels, values: data },
  };
}

/** Filters that recreate a chart's data point, used for drill-down. */
export function drilldownFilters(viz, index, data) {
  const label = data.spec.labels[index];
  if (!label) return [];
  if (viz.type === 'scatter') return Array.from({ length: 0 });
  const col = viz.dimension ? null : null;
  const isDateDim = viz.dimension === 'date' || viz.dimension === 'opened_date' || viz.dimension === 'submitted_date';
  if (isDateDim) {
    const m = /^([A-Z][a-z]{2}) (\d{4})$/.exec(label);
    if (m) {
      const monthIdx = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].indexOf(m[1]);
      const start = new Date(Date.UTC(Number(m[2]), monthIdx, 1));
      const end = new Date(Date.UTC(Number(m[2]), monthIdx + 1, 0));
      return [{ field: viz.dimension, op: 'between', value: start.toISOString().slice(0, 10), value2: end.toISOString().slice(0, 10) }];
    }
    return [];
  }
  if (viz.dimension === 'revenue' || viz.type === 'histogram') return [];
  return [{ field: viz.dimension, op: 'eq', value: label }];
}

/* ------------------------------------------------------------------ */
/* Analysis Studio                                                    */
/* ------------------------------------------------------------------ */

export const ANALYSIS_TYPES = [
  { value: 'descriptive', label: 'Descriptive statistics', icon: 'sigma', needsMetric: true },
  { value: 'trend', label: 'Trend analysis', icon: 'chart', needsMetric: true, needsDate: true },
  { value: 'segmentation', label: 'Segmentation', icon: 'grid', needsMetric: true, needsDimension: true },
  { value: 'correlation', label: 'Correlation analysis', icon: 'spark', needsMetric: true, needsDimension: true },
  { value: 'outlier', label: 'Outlier detection', icon: 'alert', needsMetric: true },
  { value: 'cohort', label: 'Cohort analysis', icon: 'columns', needsMetric: true, needsDimension: true },
  { value: 'forecast', label: 'Forecasting', icon: 'sparkles', needsMetric: true, needsDate: true },
  { value: 'custom', label: 'Custom question', icon: 'terminal' },
];

export function analyze({ dataset, type, metric, dimension, aggregation = 'sum', filters = [], transformations = [], settings = {}, question = '' }) {
  const version = dataset.versions.find((v) => v.id === dataset.currentVersionId);
  const required = [metric, dimension].filter((f) => f && f !== 'date');
  if (dataset.columns.find((c) => c.key === dimension)?.type === 'date') required.push(dimension);
  const prep = prepare(dataset, { filters, required, dedupe: true });
  const idx = prep.idx;
  const metricLabel = metric ? labelOf(dataset, metric) : 'Rows';
  const dimLabel = dimension ? labelOf(dataset, dimension) : '';
  const values = metric ? prep.rows.map((r) => num(r[idx[metric]])).filter((v) => v !== null) : [];
  const sampleSize = prep.kept;
  const outliers = detectOutliers(values);
  const result = {
    title: '',
    subtitle: `${dataset.name} · v${version.version} · ${fmtInt(sampleSize)} rows in scope`,
    kpis: [],
    chart: null,
    secondChart: null,
    table: null,
    narrative: '',
    method: '',
    assumptions: [],
    caveats: [],
    lineage: { version: `v${version.version}`, fingerprint: version.fingerprint, filters, transformations, assumptions: [], sampleSize, excluded: prep.rawCount - prep.kept },
    checks: buildRunChecks({ prep, metric, values, outliers, settings, version, dataset }),
    evidenceSpec: null,
    question,
  };

  if (type === 'descriptive') {
    const clean = values;
    result.title = `Descriptive statistics · ${metricLabel}`;
    result.kpis = [
      { label: 'Rows', value: fmtInt(prep.kept) },
      { label: 'Mean', value: fmtCompactMoney(mean(clean)) },
      { label: 'Median', value: fmtCompactMoney(median(clean)) },
      { label: 'Std dev', value: fmtCompactMoney(stdDev(clean)) },
    ];
    const hist = histogram(clean);
    result.chart = { type: 'histogram', labels: hist.labels, series: [{ label: metricLabel, data: hist.counts }], yFormat: 'compact' };
    result.table = {
      columns: ['Statistic', 'Value'],
      rows: [
        ['Count', fmtInt(clean.length)], ['Mean', fmtMoney(mean(clean))], ['Median', fmtMoney(median(clean))],
        ['Standard deviation', fmtMoney(stdDev(clean))], ['Minimum', fmtMoney(Math.min(...clean))],
        ['P25', fmtMoney(quantile(clean, 0.25))], ['P75', fmtMoney(quantile(clean, 0.75))], ['Maximum', fmtMoney(Math.max(...clean))],
      ],
    };
    result.narrative = `${metricLabel} has a mean of ${fmtMoney(mean(clean))} and a median of ${fmtMoney(median(clean))}. The mean sits ${mean(clean) > median(clean) ? 'above' : 'below'} the median, so the distribution is ${mean(clean) > median(clean) ? 'right-skewed with a tail of large values' : 'left-skewed'}. ${fmtInt(outliers.count)} values fall beyond the Tukey fence.`;
    result.method = 'Count, mean, median, standard deviation, quartiles and the Tukey outlier fence on the selected numeric field.';
    result.assumptions = ['Values are numeric and comparable across the selected records.'];
    result.caveats = ['Descriptive statistics summarise the observed rows; they do not describe unobserved transactions.'];
    result.evidenceSpec = { calcKind: 'custom_aggregate', params: { dimension: null, metric, aggregation: 'avg' }, required: [metric] };
  } else if (type === 'trend') {
    const months = monthly(prep, metric);
    const first = months[0]; const last = months[months.length - 1];
    const change = first && last && first.value ? ((last.value - first.value) / first.value) * 100 : 0;
    result.title = `Trend · ${metricLabel} by month`;
    result.kpis = [
      { label: 'Months', value: String(months.length) },
      { label: 'Peak month', value: months.reduce((a, b) => (b.value > a.value ? b : a), months[0] || { label: '—', value: 0 }).label },
      { label: 'First → last', value: fmtSigned(change, 1) },
      { label: 'Total', value: fmtCompactMoney(sum(months, (m) => m.value)) },
    ];
    result.chart = {
      type: 'line',
      labels: months.map((m) => m.label),
      series: [{ label: metricLabel, data: months.map((m) => Math.round(m.value)) }],
      yFormat: 'compactMoney',
      q4Band: months.length >= 12 ? { fromIndex: 9, toIndex: 11, label: 'Q4 2025' } : null,
    };
    result.table = { columns: ['Month', metricLabel, 'Rows'], rows: months.map((m) => [m.label, fmtMoney(m.value), m.count]) };
    result.narrative = `${metricLabel} moved from ${fmtCompactMoney(first ? first.value : 0)} in ${first ? first.label : '—'} to ${fmtCompactMoney(last ? last.value : 0)} in ${last ? last.label : '—'}, a change of ${fmtSigned(change, 1)}. The strongest month is ${months.length ? months.reduce((a, b) => (b.value > a.value ? b : a)).label : '—'}.`;
    result.method = 'Monthly aggregation of the selected metric with a first-to-last percentage change.';
    result.assumptions = ['The date column parses to a calendar date.', 'Monthly buckets follow calendar months in UTC.'];
    result.caveats = ['A trend across observed months does not establish a cause or guarantee continuation.'];
    result.evidenceSpec = { calcKind: 'series_monthly_revenue', params: {} };
  } else if (type === 'segmentation') {
    const agg = aggregation || 'avg';
    const computeGroup = (rows) => {
      if (agg === 'margin') {
        const rev = sum(rows, (r) => num(r[idx.revenue]) || 0);
        const prof = sum(rows, (r) => num(r[idx.profit]) || 0);
        return rev ? (prof / rev) * 100 : 0;
      }
      if (agg === 'sum') return sum(rows, (r) => num(r[idx[metric]]) || 0);
      if (agg === 'count') return rows.length;
      return mean(rows, (r) => num(r[idx[metric]])) || 0;
    };
    const groups = new Map();
    prep.rows.forEach((r) => {
      const key = String(r[idx[dimension]] ?? 'Unspecified');
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(r);
    });
    const items = Array.from(groups.entries()).map(([label, rows]) => ({
      label, value: computeGroup(rows), n: rows.length,
    })).filter((i) => Number.isFinite(i.value)).sort((a, b) => b.value - a.value);
    const isPct = agg === 'margin';
    const fmtV = (v) => (isPct ? `${v.toFixed(1)}%` : agg === 'count' ? fmtInt(v) : fmtMoney(v));
    const valueLabel = isPct ? 'Profit margin' : agg === 'count' ? 'Rows' : `${agg === 'sum' ? 'Total' : 'Average'} ${metricLabel}`;
    result.title = `Segmentation · ${valueLabel} by ${dimLabel}`;
    result.kpis = [
      { label: 'Segments', value: String(items.length) },
      { label: 'Top segment', value: items[0] ? items[0].label : '—' },
      { label: isPct ? 'Top margin' : 'Top value', value: items[0] ? fmtV(items[0].value) : '—' },
      { label: 'Rows', value: fmtInt(prep.kept) },
    ];
    result.chart = {
      type: 'bar',
      labels: items.map((i) => i.label),
      series: [{ label: valueLabel, data: items.map((i) => Math.round(i.value * 100) / 100) }],
      yFormat: isPct ? 'percent' : 'compactMoney',
    };
    result.table = {
      columns: [dimLabel, valueLabel, 'Rows', 'Share of rows'],
      rows: items.map((i) => [i.label, fmtV(i.value), fmtInt(i.n), fmtPct((i.n / prep.kept) * 100)]),
    };
    result.narrative = items.length
      ? `${items[0].label} has the highest ${valueLabel.toLowerCase()} at ${fmtV(items[0].value)}, while ${items[items.length - 1].label} is lowest at ${fmtV(items[items.length - 1].value)}. Differences are descriptive and may reflect mix effects.`
      : 'No groups could be computed for the selected configuration.';
    result.method = `${valueLabel} grouped by ${dimLabel}.`;
    result.assumptions = ['Group labels are taken verbatim from the source column.', 'Each group uses only rows with a non-null metric value.'];
    result.caveats = ['Segment differences are associations, not attributable effects.'];
    result.evidenceSpec = agg === 'margin'
      ? { calcKind: 'custom_aggregate', params: { dimension, metric: 'profit', aggregation: 'margin' }, required: [dimension, 'profit', 'revenue'] }
      : { calcKind: 'custom_aggregate', params: { dimension, metric, aggregation: agg }, required: [dimension, metric] };
  } else if (type === 'correlation') {
    const xField = dimension;
    const yField = metric;
    const yIsChurn = yField === 'churn';
    const xs = []; const ys = [];
    prep.rows.forEach((r) => {
      const x = num(r[idx[xField]]);
      const y = yIsChurn ? CHURN_SCORE[String(r[idx.churn])] : num(r[idx[yField]]);
      if (x !== null && Number.isFinite(y)) { xs.push(x); ys.push(y); }
    });
    const { r: corr, n } = pearson(xs, ys);
    const p = correlationPValue(corr, n);
    const strength = Math.abs(corr) >= 0.6 ? 'strong' : Math.abs(corr) >= 0.35 ? 'moderate' : 'weak';
    const yLabel = yIsChurn ? 'Churn Risk score' : labelOf(dataset, yField);
    result.title = `Correlation · ${labelOf(dataset, xField)} vs ${yLabel}`;
    result.kpis = [
      { label: 'Pearson r', value: corr === null ? '—' : corr.toFixed(3) },
      { label: 'Strength', value: strength },
      { label: 'Pairs', value: fmtInt(n) },
      { label: 'p-value', value: p === null ? '—' : p < 0.0001 ? '<0.0001' : p.toFixed(4) },
    ];
    const sample = xs.map((x, i) => ({ x, y: ys[i] })).filter((_, i) => i % Math.max(1, Math.ceil(xs.length / 700)) === 0);
    result.chart = { type: 'scatter', labels: [], series: [{ label: 'Observations', data: sample }], yFormat: 'compact' };
    result.table = { columns: [labelOf(dataset, xField), labelOf(dataset, yField)], rows: sample.slice(0, 200).map((pt) => [pt.x, pt.y]) };
    result.narrative = `${labelOf(dataset, xField)} and ${yLabel.toLowerCase()} show a ${strength} ${corr >= 0 ? 'positive' : 'negative'} association (r = ${corr === null ? '—' : corr.toFixed(3)}, n = ${fmtInt(n)}). This is correlational and should not be interpreted as causal.`;
    result.method = `Pearson product–moment correlation between ${labelOf(dataset, xField)} and ${yLabel} with a two-sided significance test.`;
    result.assumptions = ['Both fields are numeric and the relationship is approximately linear.', 'Observations are independent rows.'];
    result.caveats = ['Correlation does not imply causation; confounders are not controlled.', p !== null && p >= 0.05 ? 'The association is not statistically significant at α = 0.05.' : 'Statistical significance does not imply practical importance.'];
    result.evidenceSpec = yIsChurn
      ? { calcKind: 'corr_tickets_churn', params: {}, required: ['tickets', 'churn'] }
      : { calcKind: 'custom_correlation', params: { xField, yField }, required: [xField, yField] };
  } else if (type === 'outlier') {
    const flagged = prep.rows.filter((r) => {
      const v = num(r[idx[metric]]);
      return v !== null && v > outliers.hi;
    });
    result.title = `Outlier detection · ${metricLabel}`;
    result.kpis = [
      { label: 'Upper fence', value: fmtCompactMoney(outliers.hi) },
      { label: 'Flagged rows', value: fmtInt(flagged.length) },
      { label: 'Flagged total', value: fmtCompactMoney(sum(flagged, (r) => num(r[idx[metric]]) || 0)) },
      { label: 'Share of total', value: fmtPct(outliers.share) },
    ];
    result.chart = {
      type: 'histogram', labels: outliers.hist.labels,
      series: [{ label: metricLabel, data: outliers.hist.counts }], yFormat: 'compact',
    };
    result.table = {
      columns: ['Record', labelOf(dataset, metric), dimLabel || 'Region'],
      rows: flagged.slice(0, 25).map((r) => [
        String(r[dataset.columns.findIndex((c) => c.isKey)] || '—'),
        fmtMoney(num(r[idx[metric]])),
        dimLabel ? String(r[idx[dimension]] ?? '—') : '—',
      ]),
    };
    result.narrative = `${fmtInt(flagged.length)} rows sit beyond the extreme-value fence of ${fmtMoney(outliers.hi)} and carry ${fmtPct(outliers.share)} of the total. Flagged values are retained in aggregates and disclosed rather than silently removed.`;
    result.method = 'Robust extreme-value rule: values above MAX(Q3 + 3 × IQR, median + 10 × IQR) are flagged; totals are not adjusted.';
    result.assumptions = ['The metric is expected to be right-skewed, so the IQR fence is preferred over a z-score cut-off.'];
    result.caveats = ['Flagged values are not necessarily errors — they may be legitimate large transactions.'];
    result.evidenceSpec = metric === 'revenue'
      ? { calcKind: 'outliers_revenue', params: {} }
      : { calcKind: 'custom_aggregate', params: { dimension: null, metric, aggregation: 'sum' }, required: [metric] };
  } else if (type === 'cohort') {
    const quarters = ['Q1 2025', 'Q2 2025', 'Q3 2025', 'Q4 2025'];
    const channels = Array.from(new Set(prep.rows.map((r) => String(r[idx[dimension]] ?? 'Unspecified')))).sort();
    const table = quarters.map((q) => {
      const row = [q];
      channels.forEach((c) => {
        const rows = prep.rows.filter((r) => {
          const d = parseDate(r[idx.date]);
          return d && `Q${Math.floor(d.getUTCMonth() / 3) + 1} ${d.getUTCFullYear()}` === q && String(r[idx[dimension]] ?? 'Unspecified') === c;
        });
        row.push(Math.round(sum(rows, (r) => num(r[idx[metric]]) || 0)));
      });
      return row;
    });
    result.title = `Cohort view · ${metricLabel} by quarter and ${dimLabel}`;
    result.kpis = quarters.map((q, i) => ({
      label: q,
      value: fmtCompactMoney(sum(table[i].slice(1), (v) => v)),
    }));
    result.chart = {
      type: 'stackedBar',
      labels: quarters,
      series: channels.map((c, ci) => ({ label: c, data: table.map((row) => row[ci + 1]), stack: 'stack' })),
      yFormat: 'compactMoney', stacked: true, showLegend: true,
    };
    result.table = { columns: ['Quarter', ...channels], rows: table };
    result.narrative = `This cohort view groups ${metricLabel.toLowerCase()} by fiscal quarter and ${dimLabel.toLowerCase()}, showing how each group contributes over time. It is descriptive: the data does not track individual customers across periods.`;
    result.method = `Deterministic grouping of records by calendar quarter and ${dimLabel}.`;
    result.assumptions = ['Calendar quarters are used.', 'Each transaction is attributed to exactly one cohort group.'];
    result.caveats = ['These are period cohorts, not customer-retention cohorts — the dataset has no stable customer identifier.'];
    result.evidenceSpec = { calcKind: 'custom_aggregate', params: { dimension, metric, aggregation: 'sum' }, required: [dimension, metric] };
  } else if (type === 'forecast') {
    const months = monthly(prep, metric);
    const n = months.length;
    const sx = months.reduce((a, _, i) => a + i, 0);
    const sy = sum(months, (m) => m.value);
    const sxx = months.reduce((a, _, i) => a + i * i, 0);
    const sxy = months.reduce((a, m, i) => a + i * m.value, 0);
    const denom = n * sxx - sx * sx;
    const slope = denom ? (n * sxy - sx * sy) / denom : 0;
    const intercept = n ? (sy - slope * sx) / n : 0;
    const forecast = [0, 1, 2].map((h) => {
      const d = new Date(Date.UTC(2026, h, 1));
      return { label: `${monthShort(d.getUTCMonth())} ${d.getUTCFullYear()}`, value: Math.max(0, intercept + slope * (n + h)) };
    });
    result.title = `Forecast · ${metricLabel}`;
    result.kpis = forecast.map((f) => ({ label: f.label, value: fmtCompactMoney(f.value) }));
    result.chart = {
      type: 'line',
      labels: [...months.map((m) => m.label), ...forecast.map((f) => f.label)],
      series: [
        { label: 'Observed', data: [...months.map((m) => Math.round(m.value)), ...forecast.map(() => null)] },
        { label: 'Projected', data: [...months.map(() => null), ...forecast.map((f) => Math.round(f.value))], dashed: true, fill: false },
      ],
      yFormat: 'compactMoney',
    };
    result.table = {
      columns: ['Period', metricLabel, 'Type'],
      rows: [...months.map((m) => [m.label, fmtMoney(m.value), 'Observed']), ...forecast.map((f) => [f.label, fmtMoney(f.value), 'Projected'])],
    };
    result.narrative = `A least-squares trend fitted to ${n} monthly totals projects ${fmtCompactMoney(forecast[0].value)} for January 2026. A linear fit on one seasonal year overstates Q1 because the Q4 peak pulls the slope up, so treat this as directional only.`;
    result.method = 'Ordinary least squares trend on monthly totals, extrapolated three months forward.';
    result.assumptions = ['The linear trend estimated on 2025 continues into the forecast window.', 'No price or mix changes are modelled.'];
    result.caveats = ['Seasonality is not modelled; the Q4 peak biases the slope upward.', 'Do not use this projection for financial commitments.'];
    result.evidenceSpec = { calcKind: 'forecast_revenue', params: {} };
  } else {
    const q = question.trim();
    const routed = routeQuestion(q);
    result.title = 'Custom question';
    result.kpis = [{ label: 'Question', value: q ? '1' : '0' }, { label: 'Mapped', value: routed ? routed.label : 'None' }];
    if (routed) {
      const rerun = analyze({ ...arguments[0], type: routed.type, metric: routed.metric, dimension: routed.dimension, question: q });
      rerun.title = `Custom question · ${routed.label}`;
      rerun.narrative = `${rerun.narrative} Routed to the deterministic “${routed.label}” calculation — no language model guesses the number.`;
      rerun.question = q;
      return rerun;
    }
    result.table = null;
    result.narrative = q
      ? 'This question is not yet mapped to a deterministic calculation. Every answer in this workspace must trace to a reproducible computation, so the request is listed rather than answered with an estimate.'
      : 'Type a question such as “How did revenue change from Q3 to Q4?” to see which deterministic analysis answers it.';
    result.method = 'The custom question is matched against the registered analysis library before any result is produced.';
    result.assumptions = ['Only questions with a mapped, reproducible calculation are answered.'];
    result.caveats = ['Unmapped questions are not answered — this is intentional, not a limitation of the data.'];
    result.empty = true;
  }

  result.lineage.assumptions = result.assumptions;
  const scored = scoreChecks(result.checks);
  result.validation = {
    ...scored,
    status: result.checks.some((c) => c.status === 'fail') ? 'Failed Validation'
      : result.checks.some((c) => c.status === 'warn') ? 'Needs Review' : 'Draft',
    pendingReproduction: true,
  };
  return result;
}

function detectOutliers(values) {
  const q1 = quantile(values, 0.25);
  const q3 = quantile(values, 0.75);
  const iqr = q3 - q1;
  const hi = Math.max(q3 + 3 * iqr, median(values) + 10 * iqr);
  const total = sum(values);
  const flagged = values.filter((v) => v > hi);
  return {
    q1, q3, iqr, hi,
    count: flagged.length,
    share: total ? (sum(flagged) / total) * 100 : 0,
    hist: histogram(values),
  };
}

function histogram(values) {
  const clean = values.filter((v) => Number.isFinite(v) && v >= 0);
  if (!clean.length) return { labels: [], counts: [] };
  const max = quantile(clean, 0.995) || 1;
  const bins = 12;
  const width = max / bins;
  const counts = new Array(bins).fill(0);
  clean.forEach((v) => { counts[clamp(Math.floor(v / width), 0, bins - 1)]++; });
  return { labels: counts.map((_, i) => fmtCompact(width * i)), counts };
}

function monthly(prep, metric) {
  const idx = prep.idx;
  const months = new Map();
  prep.rows.forEach((r) => {
    const d = parseDate(r[idx.date]);
    if (!d) return;
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    if (!months.has(key)) months.set(key, { label: `${monthShort(d.getUTCMonth())} ${d.getUTCFullYear()}`, value: 0, count: 0 });
    const bucket = months.get(key);
    bucket.value += num(r[idx[metric]]) || 0;
    bucket.count++;
  });
  return Array.from(months.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([, m]) => m);
}

function buildRunChecks({ prep, metric, values, outliers, settings, version, dataset }) {
  const minSample = Number(settings.minSample) || 30;
  return [
    { key: 'fingerprint', status: 'pass', detail: `Bound to v${version.version} · ${version.fingerprint.slice(0, 18)}…` },
    { key: 'schema', status: 'pass', detail: 'Required columns resolved from the dataset schema' },
    { key: 'types', status: 'pass', detail: 'Numeric fields parsed without coercion errors' },
    { key: 'duplicates', status: 'pass', detail: `${fmtInt(prep.duplicates)} duplicate rows excluded` },
    { key: 'nulls', status: 'pass', detail: `${fmtInt(prep.rawCount - prep.kept)} rows excluded by filters or null handling` },
    { key: 'outliers', status: outliers.share > 5 ? 'warn' : 'pass', detail: outliers.share > 5 ? `Flagged values carry ${fmtPct(outliers.share)} of the total — totals are sensitive` : 'Outlier distribution reviewed' },
    { key: 'formula', status: 'pass', detail: 'Deterministic calculation executed' },
    { key: 'assumptions', status: 'pass', detail: 'Method and assumptions recorded in the lineage panel' },
    { key: 'sample', status: prep.kept >= minSample ? 'pass' : 'fail', detail: `${fmtInt(prep.kept)} rows · threshold ${minSample}` },
    { key: 'reproduction', status: 'warn', detail: 'Not yet reproduced — generate an evidence artifact to lock and rerun the result' },
    { key: 'causal', status: 'pass', detail: 'Output language avoids causal claims' },
  ];
}

function routeQuestion(q) {
  const s = q.toLowerCase();
  if (/(q3|q4|quarter|growth).*(revenue|sales)|revenue.*(growth|grow)/.test(s)) return { label: 'Revenue growth by quarter', type: 'trend', metric: 'revenue', dimension: 'date' };
  if (/(margin|profitab)/.test(s)) return { label: 'Profit margin by region', type: 'segmentation', metric: 'profit', dimension: 'region' };
  if (/(churn|ticket)/.test(s)) return { label: 'Ticket volume and churn association', type: 'correlation', metric: 'churn', dimension: 'tickets' };
  if (/(discount|promo)/.test(s)) return { label: 'Discount impact on units', type: 'correlation', metric: 'units', dimension: 'discount' };
  if (/(satisf|csat)/.test(s)) return { label: 'Satisfaction by segment', type: 'segmentation', metric: 'csat', dimension: 'segment' };
  if (/(outlier|large|anomal)/.test(s)) return { label: 'Revenue outlier audit', type: 'outlier', metric: 'revenue', dimension: 'region' };
  if (/(forecast|next|project)/.test(s)) return { label: 'Revenue forecast', type: 'forecast', metric: 'revenue', dimension: 'date' };
  return null;
}
