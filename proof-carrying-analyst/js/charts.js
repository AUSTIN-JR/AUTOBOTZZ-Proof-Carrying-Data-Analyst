/* Chart.js theming and chart builders (line, bar, stacked, scatter, histogram, donut, heatmap). */
import { esc, fmtCompact, fmtCompactMoney, fmtMoney } from './util.js';

export const PALETTE = ['#3b82f6', '#14b8a6', '#8b5cf6', '#f59e0b', '#ef4444', '#0ea5e9', '#64748b', '#ec4899'];

const instances = new Map();

export function chartsAvailable() {
  return typeof window !== 'undefined' && typeof window.Chart !== 'undefined';
}

export function destroyAllCharts() {
  instances.forEach((chart) => {
    try { chart.destroy(); } catch { /* already destroyed */ }
  });
  instances.clear();
}

export function getChart(id) {
  return instances.get(id) || null;
}

const q4BandPlugin = {
  id: 'q4Band',
  beforeDatasetsDraw(chart, _args, opts) {
    if (!opts || opts.enabled === false) return;
    const { ctx, chartArea, scales } = chart;
    if (!chartArea || !scales.x) return;
    const start = scales.x.getPixelForValue(opts.fromIndex);
    const end = scales.x.getPixelForValue(opts.toIndex + 0.5);
    ctx.save();
    ctx.fillStyle = 'rgba(59,130,246,.07)';
    ctx.fillRect(start, chartArea.top, end - start, chartArea.bottom - chartArea.top);
    ctx.strokeStyle = 'rgba(59,130,246,.25)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(start, chartArea.top);
    ctx.lineTo(start, chartArea.bottom);
    ctx.stroke();
    ctx.setLineDash([]);
    if (opts.label) {
      ctx.fillStyle = '#1d4ed8';
      ctx.font = '600 11px Inter, system-ui, sans-serif';
      const textWidth = ctx.measureText(opts.label).width;
      const lx = Math.min(end - textWidth - 12, chartArea.right - textWidth - 12);
      ctx.fillText(opts.label, Math.max(chartArea.left + 8, lx), chartArea.top + 16);
    }
    ctx.restore();
  },
};

const valueLabelPlugin = {
  id: 'valueLabels',
  afterDatasetsDraw(chart, _args, opts) {
    if (!opts || !opts.enabled) return;
    const { ctx } = chart;
    chart.data.datasets.forEach((ds, di) => {
      const meta = chart.getDatasetMeta(di);
      if (meta.hidden) return;
      meta.data.forEach((el, i) => {
        const v = ds.data[i];
        if (v === null || v === undefined) return;
        ctx.save();
        ctx.fillStyle = '#334155';
        ctx.font = '600 10px Inter, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(opts.format ? opts.format(v) : String(v), el.x, el.y - 8);
        ctx.restore();
      });
    });
  },
};

let registered = false;
function ensureRegistered() {
  if (registered || !chartsAvailable()) return;
  window.Chart.register(q4BandPlugin, valueLabelPlugin);
  window.Chart.defaults.font.family = "'Inter', 'Segoe UI', system-ui, sans-serif";
  window.Chart.defaults.font.size = 11.5;
  window.Chart.defaults.color = '#64748b';
  registered = true;
}

const baseOptions = (spec) => ({
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 420 },
  interaction: { mode: spec.type === 'scatter' ? 'nearest' : 'index', intersect: false },
  layout: { padding: { top: spec.q4Band ? 26 : 8, right: 8, bottom: 0, left: 0 } },
  plugins: {
    legend: {
      display: spec.showLegend !== false && (spec.series || []).length > 1,
      position: 'bottom',
      labels: { usePointStyle: true, boxWidth: 7, boxHeight: 7, padding: 16, font: { size: 11.5 } },
    },
    tooltip: {
      backgroundColor: '#0f172a',
      titleColor: '#e2e8f0',
      bodyColor: '#cbd5e1',
      borderColor: 'rgba(148,163,184,.25)',
      borderWidth: 1,
      padding: 10,
      cornerRadius: 8,
      displayColors: true,
      boxWidth: 8,
      boxHeight: 8,
      usePointStyle: true,
      callbacks: {
        label: (ctx) => {
          const v = ctx.parsed.y ?? ctx.parsed.x ?? ctx.parsed;
          const formatted = spec.yFormat === 'money' ? fmtMoney(v) : spec.yFormat === 'compactMoney' ? fmtCompactMoney(v) : spec.yFormat === 'percent' ? `${Number(v).toFixed(1)}%` : fmtCompact(v);
          return ` ${ctx.dataset.label || ''}: ${formatted}`;
        },
      },
    },
    q4Band: spec.q4Band ? { ...spec.q4Band } : false,
    valueLabels: spec.valueLabels ? { ...spec.valueLabels } : false,
  },
  scales: spec.type === 'donut' ? {} : {
    x: {
      grid: { display: false },
      border: { color: 'rgba(15,23,42,.08)' },
      ticks: { maxRotation: 0, autoSkip: true, font: { size: 11 } },
      stacked: !!spec.stacked,
    },
    y: {
      beginAtZero: spec.beginAtZero !== false,
      grid: { color: 'rgba(15,23,42,.06)', drawTicks: false },
      border: { display: false },
      stacked: !!spec.stacked,
      ticks: {
        padding: 6,
        font: { size: 11 },
        callback: (value) => (spec.yFormat === 'money' || spec.yFormat === 'compactMoney' ? fmtCompact(value) : spec.yFormat === 'percent' ? `${value}%` : fmtCompact(value)),
      },
    },
    ...(spec.y2 ? {
      y2: {
        position: 'right',
        beginAtZero: true,
        grid: { display: false },
        border: { display: false },
        ticks: { padding: 6, font: { size: 11 } },
      },
    } : {}),
  },
});

function makeDatasets(spec) {
  return (spec.series || []).map((s, i) => {
    const color = s.color || PALETTE[i % PALETTE.length];
    if (spec.type === 'scatter') {
      return {
        label: s.label,
        data: s.data,
        backgroundColor: s.color || 'rgba(59,130,246,.42)',
        borderColor: s.color || 'rgba(37,99,235,.9)',
        pointRadius: s.radius || 2.6,
        pointHoverRadius: 5,
      };
    }
    if (spec.type === 'donut') {
      return {
        label: s.label,
        data: s.data,
        backgroundColor: s.colors || PALETTE,
        borderColor: '#ffffff',
        borderWidth: 2,
        hoverOffset: 6,
      };
    }
    if (spec.type === 'line') {
      return {
        label: s.label,
        data: s.data,
        borderColor: color,
        backgroundColor: s.fill === false ? 'transparent' : hexA(color, 0.12),
        fill: s.fill !== false,
        tension: 0.32,
        borderWidth: 2.2,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointBackgroundColor: color,
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        yAxisID: s.axis || 'y',
        borderDash: s.dashed ? [6, 4] : [],
      };
    }
    return {
      label: s.label,
      data: s.data,
      backgroundColor: s.colors || color,
      borderRadius: spec.type === 'histogram' ? 4 : 6,
      borderSkipped: false,
      maxBarThickness: spec.type === 'histogram' ? 42 : 44,
      yAxisID: s.axis || 'y',
      stack: s.stack || undefined,
    };
  });
}

function hexA(hex, alpha) {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/** Renders a chart into a canvas element by id. Returns the Chart instance. */
export function renderChart(canvasId, spec) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;
  if (!chartsAvailable()) {
    canvas.parentElement.innerHTML = '<div class="chart-fallback">Chart library unavailable — showing data table instead.</div>';
    return null;
  }
  ensureRegistered();
  const existing = instances.get(canvasId);
  if (existing) { try { existing.destroy(); } catch { /* noop */ } }
  const typeMap = {
    line: 'line', bar: 'bar', stackedBar: 'bar', groupedBar: 'bar', histogram: 'bar', scatter: 'scatter', donut: 'doughnut',
  };
  const chart = new window.Chart(canvas.getContext('2d'), {
    type: typeMap[spec.type] || 'bar',
    data: { labels: spec.labels, datasets: makeDatasets(spec) },
    options: {
      ...baseOptions(spec),
      onClick: spec.onPointClick ? (_evt, elements) => {
        if (!elements.length) return;
        spec.onPointClick(elements[0].index, elements[0].datasetIndex);
      } : undefined,
      plugins: {
        ...baseOptions(spec).plugins,
        legend: {
          ...baseOptions(spec).plugins.legend,
          onClick: (e, item, legend) => {
            if (spec.onLegendClick) spec.onLegendClick(item.text);
            window.Chart.defaults.plugins.legend.onClick.call(legend, e, item, legend);
          },
        },
      },
      scales: spec.type === 'donut' ? {} : baseOptions(spec).scales,
    },
  });
  instances.set(canvasId, chart);
  return chart;
}

export function downloadChartPng(canvasId, filename) {
  const chart = instances.get(canvasId);
  if (!chart) return false;
  const a = document.createElement('a');
  a.href = chart.toBase64Image('image/png', 1);
  a.download = filename.endsWith('.png') ? filename : `${filename}.png`;
  a.click();
  return true;
}

/* ---------------- Heatmap (HTML/CSS grid) ---------------- */

export function heatmapHtml(matrix, fields, options = {}) {
  const labelFor = (key) => options.labels?.[key] || key;
  const color = (v) => {
    if (v === null || v === undefined) return 'rgba(148,163,184,.12)';
    const abs = Math.min(1, Math.abs(v));
    if (v >= 0) return `rgba(20,184,166,${0.08 + abs * 0.72})`;
    return `rgba(239,68,68,${0.08 + abs * 0.72})`;
  };
  const header = fields.map((f) => `<th scope="col" title="${esc(f)}">${esc(labelFor(f))}</th>`).join('');
  const body = fields.map((rowKey, i) => `<tr>
    <th scope="row">${esc(labelFor(rowKey))}</th>
    ${fields.map((colKey, j) => {
    const v = matrix[i] ? matrix[i][j] : null;
    const text = v === null || v === undefined ? '—' : v.toFixed(2);
    const strong = Math.abs(v) > 0.45 ? ' cell-strong' : '';
    return `<td class="heat-cell${strong}" style="background:${color(v)}" title="${esc(labelFor(rowKey))} × ${esc(labelFor(colKey))}: ${text}">${text}</td>`;
  }).join('')}
  </tr>`).join('');
  return `<div class="heatmap-wrap"><table class="heatmap"><thead><tr><th scope="col" class="heat-corner">Field</th>${header}</tr></thead><tbody>${body}</tbody></table></div>
    <div class="heat-legend"><span>−1</span><span class="heat-scale"></span><span>+1</span><em>Pearson correlation</em></div>`;
}

/* ---------------- Sparkline (inline SVG) ---------------- */

export function sparkline(values, color = '#3b82f6', width = 96, height = 30) {
  if (!values || values.length < 2) return '';
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * (width - 2) + 1;
    const y = height - 2 - ((v - min) / range) * (height - 4);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return `<svg class="sparkline" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" aria-hidden="true">
    <polyline points="${points}" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}
