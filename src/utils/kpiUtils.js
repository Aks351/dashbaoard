// ─── Pure utility functions for KPI calculations ─────────────────────────────
// No React, no side-effects. Safe to import anywhere and easy to unit-test.
import { MONTHLY_OVERRIDE_IDS, ZERO_PLAN_IDS } from '../constants/kpiConstants';

// ─── Time / number parsing ────────────────────────────────────────────────────


/**
 * Parse a value that may be a decimal number OR an "HH:MM:SS" / "HH:MM" /
 * "HH:MM:SS.mmm" string (Google Sheets duration cells include .000 suffix).
 * Returns decimal hours (number), or null if unparseable.
 */
export function parseHMS(v) {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'string') {
    // Strip optional milliseconds suffix (.000) before matching
    const stripped = v.trim().replace(/\.\d+$/, '');
    if (/^\d+:\d{2}(:\d{2})?$/.test(stripped)) {
      const parts = stripped.split(':').map(Number);
      return parts[0] + parts[1] / 60 + (parts[2] || 0) / 3600;
    }
  }
  const n = Number(v);
  if (isNaN(n)) return null;

  // Interpret decimal values as HH.MM (e.g. 50.26 -> 50 hours, 26 mins)
  const h = Math.floor(n);
  const m = Math.round((n - h) * 100);
  return h + (m / 60);
}

/**
 * Safe numeric coercion — understands HH:MM:SS / HH:MM:SS.mmm strings.
 * Returns null for blank / unparseable values.
 */
export function num(v) {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'string') {
    const stripped = v.trim().replace(/\.\d+$/, '');
    if (/^\d+:\d{2}(:\d{2})?$/.test(stripped)) return parseHMS(v);
  }
  const n = Number(v);
  return isNaN(n) ? null : n;
}

// ─── Display formatters ───────────────────────────────────────────────────────

/** Format a plain number for display (up to 2 significant decimals, unless specified). */
export function formatNum(v, decimals = 2) {
  if (v === null || v === undefined || v === '') return '—';
  const n = Number(v);
  if (isNaN(n)) return String(v);
  return Number(n.toFixed(decimals)).toString();
}

/**
 * Display a time value as HH:MM.
 * Accepts decimal hours (23.54) OR "HH:MM:SS" / "HH:MM" strings ("16:04:00").
 */
export function formatTime(v) {
  if (v === null || v === undefined || v === '') return '—';
  const dec = parseHMS(v);
  if (dec === null) return String(v);
  const h = Math.floor(dec);
  const m = Math.round((dec - h) * 60);
  return `${h}:${String(m).padStart(2, '0')}`;
}

/** Smart formatter — uses HH:MM for 'hrs' unit, plain number otherwise. */
export function formatVal(v, unit, metricId = null) {
  if (unit === 'hrs') return formatTime(v);
  if (metricId && ZERO_PLAN_IDS.has(metricId)) return formatNum(v, 0);
  if (metricId === 'fg') return formatNum(v, 0);
  return formatNum(v, 2);
}

// ─── Scoring ──────────────────────────────────────────────────────────────────

/**
 * Calculate a score colour + label for a plan/actual pair.
 *
 * @param {*}      plan    - Target value (number or HH:MM:SS string)
 * @param {*}      actual  - Recorded value (number or HH:MM:SS string)
 * @param {string} dir     - 'higher' | 'lower' | 'zero'
 * @param {object} options - { strict: true } uses tighter green threshold (Production)
 * @returns {{ label: string, color: 'green'|'amber'|'red'|'gray', pct: number|null }}
 */
export function calculateScore(plan, actual, dir = 'higher', options = {}) {
  if (actual === '' || actual == null)
    return { label: '—', color: 'gray', pct: null };

  const a = typeof actual === 'string' && /^\d+:\d{2}/.test(actual.trim()) ? parseHMS(actual) : Number(actual);

  if (dir === 'zero') {
    if (a === 0) return { pct: 0, color: 'green', label: '0 ✓' };
    return { pct: null, color: a <= 1 ? 'amber' : 'red', label: a + (a === 1 ? ' issue' : ' issues') };
  }

  if (plan === '' || plan == null)
    return { label: '—', color: 'gray', pct: null };

  // Support HH:MM:SS strings
  const p = typeof plan === 'string' && /^\d+:\d{2}/.test(plan.trim()) ? parseHMS(plan) : Number(plan);

  if (p === 0) return a > 0 ? { label: '+∞%', color: 'green', pct: 9999 } : { label: '0%', color: 'gray', pct: 0 };

  let pct = Math.round((a / p) * 100);
  if (dir === 'lower') pct = a === 0 ? 100 : Math.round((p / a) * 100);

  const variance = pct - 100;
  const prefix = variance > 0 ? '+' : '';

  // Strict mode (Production only): green requires ≥ 100% of plan, everything else is red
  if (options.strict) {
    if (variance > -1) return { label: `${prefix}${variance}%`, color: 'green', pct };
    return { label: `${prefix}${variance}%`, color: 'red', pct };
  }

  // Default thresholds
  if (variance >= -20) return { label: `${prefix}${variance}%`, color: 'green', pct };
  if (variance >= -30) return { label: `${prefix}${variance}%`, color: 'amber', pct };
  return { label: `${prefix}${variance}%`, color: 'red', pct };
}

// ─── Aggregation ──────────────────────────────────────────────────────────────

/**
 * Month-to-date aggregate for a metric across the given weeks.
 *
 *  • MONTHLY_OVERRIDE_IDS → read from the 'monthly' sheet data directly
 *  • ZERO_PLAN metrics → plan = null, actual = sum of all weekly actuals
 *  • everything else   → plan = sum of all weekly plans, actual = sum of all weekly actuals
 *
 * @returns {{ plan: number|null, actual: number|null }}
 */
export function mtd(metric, weeks) {
  // 1. Use backend-supplied values from the monthly sheet if they exist for this metric AND it is in the whitelist
  if (metric.is_monthly_override && MONTHLY_OVERRIDE_IDS.has(metric.id)) {
    return {
      plan:   metric.mtd_plan   !== undefined && metric.mtd_plan   !== "" ? num(metric.mtd_plan)   : null,
      actual: metric.mtd_actual !== undefined && metric.mtd_actual !== "" ? num(metric.mtd_actual) : null,
    };
  }

  // 2. REGULAR METRICS (and Averages)
  let plan = 0, act = 0, planCount = 0, actCount = 0;

  weeks.forEach(w => {
    const p = num(metric.plan[w.id]);
    if (p !== null) { plan += p; planCount++; }
    
    const a = num(metric.actual[w.id]);
    if (a !== null) { act += a; actCount++; }
  });

  const isAverage = metric.id === 'avg_closing_days' || metric.id === 'oilmt' || metric.id === 'oilpermt' || metric.id === 'gasmt';

  return {
    plan:   planCount > 0 ? (isAverage ? plan / planCount : plan) : null,
    actual: actCount  > 0 ? (isAverage ? act / actCount : act)  : null,
  };
}
