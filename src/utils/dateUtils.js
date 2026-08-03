const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export function calculateNextWeekRange(lastRangeStr, year = new Date().getFullYear()) {
  if (!lastRangeStr) return '';
  const match = lastRangeStr.match(/(\d+)\s*([a-zA-Z]+)?$/);
  if (!match) return '';
  let day = parseInt(match[1], 10);
  let monthStr = match[2];
  if (!monthStr) {
    const m = lastRangeStr.match(/([a-zA-Z]+)/);
    if (m) monthStr = m[1];
    else return '';
  }
  const d = new Date(`${day} ${monthStr} ${year}`);
  if (isNaN(d.getTime())) return '';
  const nextStart = new Date(d);
  nextStart.setDate(nextStart.getDate() + 1);
  const nextEnd = new Date(d);
  nextEnd.setDate(nextEnd.getDate() + 7);
  const startM = MONTHS[nextStart.getMonth()];
  const endM   = MONTHS[nextEnd.getMonth()];
  if (startM === endM) {
    return `${nextStart.getDate()}–${nextEnd.getDate()} ${startM}`;
  } else {
    return `${nextStart.getDate()} ${startM}–${nextEnd.getDate()} ${endM}`;
  }
}

/**
 * Parse the end date of a week range string.
 * Examples: "1–7 Jul" → 7 Jul  |  "28 Jun–4 Jul" → 4 Jul
 * Returns a Date object, or null if unparseable.
 */
export function parseWeekEndMonth(range, year = new Date().getFullYear()) {
  if (!range) return null;
  // Match the last occurrence of  <day> <MonthName>  in the string
  const match = range.match(/(\d+)\s*([A-Za-z]{3,})\s*$/);
  if (!match) return null;
  const day = parseInt(match[1], 10);
  const mon = MONTHS.findIndex(m => m.toLowerCase() === match[2].toLowerCase().slice(0, 3));
  if (mon === -1) return null;
  return new Date(year, mon, day);
}

/**
 * Parse a period string like "July 2026" or "June 2026" into { month (0-indexed), year }.
 * Returns null if unparseable.
 */
export function parsePeriod(period) {
  if (!period) return null;
  const MONTH_NAMES = [
    'january','february','march','april','may','june',
    'july','august','september','october','november','december'
  ];
  // Match "Month YYYY" e.g. "July 2026"
  const match = period.trim().match(/^([a-zA-Z]+)\s+(\d{4})$/);
  if (!match) return null;
  const mon = MONTH_NAMES.indexOf(match[1].toLowerCase());
  if (mon === -1) return null;
  return { month: mon, year: parseInt(match[2], 10) };
}

/**
 * Returns the anchor date (Thursday) for a week given its end date (Sunday).
 * This aligns week-to-month mapping with ISO week logic (week belongs to the month of its Thursday).
 */
export function getWeekAnchorDate(endDate) {
  if (!endDate) return null;
  const anchor = new Date(endDate);
  anchor.setDate(anchor.getDate() - 3); // Sunday - 3 days = Thursday
  return anchor;
}

/**
 * Filter a weeks array to only those whose end date falls in the model's period.
 *
 * @param {Array}   weeks   - Full weeks array [{ id, label, range }]
 * @param {string}  period  - The model's period string e.g. "July 2026"
 * @returns {Array} weeks belonging to that period's month
 */
export function weeksInMonth(weeks, period) {
  const p = parsePeriod(period);
  if (!p) return weeks; // no valid period → use all weeks (safe fallback)

  const filtered = weeks.filter(w => {
    const end = parseWeekEndMonth(w.range, p.year);
    const anchor = getWeekAnchorDate(end);
    return anchor && anchor.getMonth() === p.month && anchor.getFullYear() === p.year;
  });
  // Fall back to all weeks if no ranges are parseable
  return filtered.length > 0 ? filtered : weeks;
}

/**
 * Derive all unique month-period strings present in a weeks array.
 * Returns an array like ["June 2026", "July 2026", "August 2026"] sorted chronologically.
 */
const FULL_MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];
export function getAvailableMonths(weeks, fallbackPeriod = '') {
  const seen = new Map(); // "Month YYYY" → { month, year }
  weeks.forEach(w => {
    const end = parseWeekEndMonth(w.range, new Date().getFullYear());
    const anchor = getWeekAnchorDate(end);
    if (!anchor) return;
    const key = `${FULL_MONTHS[anchor.getMonth()]} ${anchor.getFullYear()}`;
    if (!seen.has(key)) seen.set(key, { month: anchor.getMonth(), year: anchor.getFullYear() });
  });
  if (seen.size === 0 && fallbackPeriod) return [fallbackPeriod];
  return [...seen.entries()]
    .sort((a, b) => a[1].year - b[1].year || a[1].month - b[1].month)
    .map(([key]) => key);
}
