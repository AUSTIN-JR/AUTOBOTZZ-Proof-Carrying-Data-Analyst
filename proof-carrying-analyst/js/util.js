/* Proof-Carrying Data Analyst — shared utilities (formatting, statistics, PRNG) */

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

/* ---------- deterministic randomness ---------- */

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function rand() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** A deterministic, sha256-looking fingerprint string for a dataset version. */
export function fingerprint(seed) {
  let state = seed >>> 0;
  let out = '';
  const hex = '0123456789abcdef';
  for (let i = 0; i < 64; i++) {
    state = (Math.imul(state ^ (state >>> 13), 0x5bd1e995) + i * 2654435761) >>> 0;
    out += hex[(state >>> (i % 24)) & 15];
  }
  return 'sha256:' + out;
}

export function shortFingerprint(fp) {
  if (!fp) return '—';
  const body = String(fp).replace('sha256:', '');
  return 'sha256:' + body.slice(0, 8) + '…' + body.slice(-4);
}

export function hashDigest(value) {
  const str = typeof value === 'string' ? value : JSON.stringify(value);
  return (fnv1a(str) >>> 0).toString(16).padStart(8, '0');
}

export function uid(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

export function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

export function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

/* ---------- numbers & dates ---------- */

const intFmt = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const numFmt = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });

export const fmtInt = (n) => (Number.isFinite(n) ? intFmt.format(n) : '—');
export const fmtNum = (n) => (Number.isFinite(n) ? numFmt.format(n) : '—');

export function fmtMoney(n, digits = 0) {
  if (!Number.isFinite(n)) return '—';
  return '$' + new Intl.NumberFormat('en-US', {
    minimumFractionDigits: digits, maximumFractionDigits: digits,
  }).format(n);
}

export function fmtCompactMoney(n) {
  if (!Number.isFinite(n)) return '—';
  const abs = Math.abs(n);
  if (abs >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
  if (abs >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M';
  if (abs >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
  return '$' + n.toFixed(0);
}

export function fmtCompact(n) {
  if (!Number.isFinite(n)) return '—';
  const abs = Math.abs(n);
  if (abs >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (abs >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return numFmt.format(n);
}

export function fmtPct(n, digits = 1) {
  if (!Number.isFinite(n)) return '—';
  return `${n > 0 ? '' : ''}${n.toFixed(digits)}%`;
}

export function fmtSigned(n, digits = 1, suffix = '%') {
  if (!Number.isFinite(n)) return '—';
  return `${n > 0 ? '+' : ''}${n.toFixed(digits)}${suffix}`;
}

export function fmtPp(n, digits = 1) {
  if (!Number.isFinite(n)) return '—';
  return `${n > 0 ? '+' : ''}${n.toFixed(digits)} pp`;
}

export function fmtMultiple(n) {
  if (!Number.isFinite(n)) return '—';
  return `×${n.toFixed(1)}`;
}

export const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})/;
export const US_DAY = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;

export function parseDate(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const str = String(value).trim();
  let m = str.match(ISO_DAY);
  if (m) {
    const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    return Number.isNaN(d.getTime()) ? null : d;
  }
  m = str.match(US_DAY);
  if (m) {
    const d = new Date(Date.UTC(+m[3], +m[1] - 1, +m[2]));
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const fallback = new Date(str);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

export function isIsoDate(value) {
  return typeof value === 'string' && ISO_DAY.test(value);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export const monthShort = (i) => MONTHS[i];
export const monthLong = (i) => MONTHS_LONG[i];

export function fmtDate(value) {
  const d = parseDate(value);
  if (!d) return '—';
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

export function fmtDateTime(value) {
  const d = parseDate(value);
  if (!d) return '—';
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()} · ${hh}:${mm} UTC`;
}

export function timeAgo(value) {
  const d = parseDate(value);
  if (!d) return '—';
  const diff = Date.now() - d.getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  return fmtDate(value);
}

export function quarterOf(d) {
  return Math.floor(d.getUTCMonth() / 3) + 1;
}

export function quarterLabel(d) {
  return `Q${quarterOf(d)} ${d.getUTCFullYear()}`;
}

export function monthKey(d) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function nowISO() {
  return new Date().toISOString();
}

export function daysAgoISO(days) {
  return new Date(Date.now() - days * 86400000).toISOString();
}

/* ---------- statistics ---------- */

export function sum(arr, pick = (x) => x) {
  return arr.reduce((acc, item) => {
    const v = pick(item);
    return acc + (Number.isFinite(v) ? v : 0);
  }, 0);
}

export function mean(arr, pick = (x) => x) {
  const values = arr.map(pick).filter(Number.isFinite);
  if (!values.length) return null;
  return sum(values) / values.length;
}

export function median(arr, pick = (x) => x) {
  const values = arr.map(pick).filter(Number.isFinite).sort((a, b) => a - b);
  if (!values.length) return null;
  const mid = Math.floor(values.length / 2);
  return values.length % 2 ? values[mid] : (values[mid - 1] + values[mid]) / 2;
}

export function stdDev(arr, pick = (x) => x) {
  const values = arr.map(pick).filter(Number.isFinite);
  if (values.length < 2) return null;
  const m = sum(values) / values.length;
  const variance = values.reduce((acc, v) => acc + (v - m) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

export function quantile(values, q) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] !== undefined) return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  return sorted[base];
}

export function pearson(xs, ys) {
  const pairs = [];
  for (let i = 0; i < Math.min(xs.length, ys.length); i++) {
    if (Number.isFinite(xs[i]) && Number.isFinite(ys[i])) pairs.push([xs[i], ys[i]]);
  }
  const n = pairs.length;
  if (n < 3) return { r: null, n };
  const mx = sum(pairs, (p) => p[0]) / n;
  const my = sum(pairs, (p) => p[1]) / n;
  let num = 0; let dx = 0; let dy = 0;
  for (const [x, y] of pairs) {
    num += (x - mx) * (y - my);
    dx += (x - mx) ** 2;
    dy += (y - my) ** 2;
  }
  if (dx === 0 || dy === 0) return { r: 0, n };
  return { r: num / Math.sqrt(dx * dy), n };
}

/** Two-sided p-value approximation for a Pearson correlation (t distribution). */
export function correlationPValue(r, n) {
  if (!Number.isFinite(r) || n < 4) return null;
  const t = Math.abs(r) * Math.sqrt((n - 2) / (1 - r * r || 1e-12));
  // Normal approximation to the t distribution for large n.
  const z = t;
  const p = 2 * (1 - normalCdf(z));
  return clamp(p, 0, 1);
}

export function normalCdf(z) {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp((-z * z) / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - p : p;
}

export function linearRegression(points) {
  const n = points.length;
  if (n < 2) return null;
  const sx = sum(points, (p) => p[0]);
  const sy = sum(points, (p) => p[1]);
  const sxx = sum(points, (p) => p[0] * p[0]);
  const sxy = sum(points, (p) => p[0] * p[1]);
  const denom = n * sxx - sx * sx;
  if (!denom) return null;
  const slope = (n * sxy - sx * sy) / denom;
  const intercept = (sy - slope * sx) / n;
  return { slope, intercept };
}

export function groupBy(arr, keyFn) {
  const map = new Map();
  for (const item of arr) {
    const key = keyFn(item);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  }
  return map;
}

export function unique(arr) {
  return Array.from(new Set(arr));
}

export function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function debounce(fn, wait = 200) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

/* ---------- downloads ---------- */

export function downloadBlob(content, filename, type = 'text/plain;charset=utf-8') {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function toCsv(rows) {
  return rows.map((row) => row.map((cell) => {
    const v = cell == null ? '' : String(cell);
    return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
  }).join(',')).join('\n');
}

export function slugify(str) {
  return String(str).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { ok = false; }
    ta.remove();
    return ok;
  }
}
