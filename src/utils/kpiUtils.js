// ─── Pure utility functions for KPI calculations ─────────────────────────────
// No React, no side-effects. Safe to import anywhere and easy to unit-test.

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
  if (plan === '' || actual === '' || plan == null || actual == null)
    return { label: '—', color: 'gray', pct: null };

  // Support HH:MM:SS strings
  const p = typeof plan   === 'string' && /^\d+:\d{2}/.test(plan.trim())   ? parseHMS(plan)   : Number(plan);
  const a = typeof actual === 'string' && /^\d+:\d{2}/.test(actual.trim()) ? parseHMS(actual) : Number(actual);

  if (dir === 'zero') {
    if (a === 0) return { pct: 0, color: 'green', label: '0 ✓' };
    return { pct: null, color: a <= 1 ? 'amber' : 'red', label: a + (a === 1 ? ' issue' : ' issues') };
  }

  if (p === 0) return a > 0 ? { label: '+∞%', color: 'green', pct: 9999 } : { label: '0%', color: 'gray', pct: 0 };

  let pct = Math.round((a / p) * 100);
  if (dir === 'lower') pct = a === 0 ? 100 : Math.round((p / a) * 100);

  const variance = pct - 100;
  const prefix   = variance > 0 ? '+' : '';

  // Strict mode (Production only): green requires ≥ 100% of plan, everything else is red
  if (options.strict) {
    if (variance > -1)  return { label: `${prefix}${variance}%`, color: 'green', pct };
    return { label: `${prefix}${variance}%`, color: 'red', pct };
  }

  // Default thresholds
  if (variance >= -20) return { label: `${prefix}${variance}%`, color: 'green', pct };
  if (variance >= -30) return { label: `${prefix}${variance}%`, color: 'amber', pct };
  return { label: `${prefix}${variance}%`, color: 'red', pct };
}

// ─── Aggregation ──────────────────────────────────────────────────────────────

/**
 * Calculates MTD score by taking only the negative values from weekly scores
 * and computing a simple average of those. If no negative scores exist,
 * it falls back to the standard MTD calculation.
 */
export function calculateMtdScore(metric, weeks, options = {}) {
  let negativeVariances = [];

  weeks.forEach(w => {
    const p = metric.plan[w.id];
    const a = metric.actual[w.id];
    if (p == null || p === '' || a == null || a === '') return;

    const sc = calculateScore(p, a, metric.dir, options);
    if (sc.pct !== null) {
      const variance = sc.pct - 100;
      if (variance < 0) {
        negativeVariances.push(variance);
      }
    }
  });

  if (negativeVariances.length > 0) {
    const avgVariance = Math.round(
      negativeVariances.reduce((sum, v) => sum + v, 0) / negativeVariances.length
    );
    const pct = avgVariance + 100;

    let color = 'red';
    if (options.strict) {
      color = avgVariance > -1 ? 'green' : 'red';
    } else {
      if (avgVariance >= -20) color = 'green';
      else if (avgVariance >= -30) color = 'amber';
      else color = 'red';
    }

    return { label: `${avgVariance}%`, color, pct }; // avgVariance is negative, so it will have its own - sign
  }

  // Fallback to standard MTD calculation if there are no negative weekly scores
  const mt = mtd(metric, weeks);
  return calculateScore(mt.plan, mt.actual, metric.dir, options);
}
/**
 * Month-to-date aggregate for a metric across the given weeks.
 * Average-mode metrics (oilmt, gasmt) return the mean; all others sum.
 *
 * @returns {{ plan: number|null, actual: number|null }}
 */
export function mtd(metric, weeks) {
  let plan = 0, act = 0, planCount = 0, actCount = 0;

  weeks.forEach(w => {
    const p = num(metric.plan[w.id]);   if (p !== null) { plan += p; planCount++; }
    const a = num(metric.actual[w.id]); if (a !== null) { act  += a; actCount++;  }
  });

  const isAverage = metric.id === 'oilmt' || metric.id === 'gasmt';
  return {
    plan:   planCount > 0 ? (isAverage ? plan / planCount : plan) : null,
    actual: actCount  > 0 ? (isAverage ? act  / actCount  : act)  : null,
  };
}
