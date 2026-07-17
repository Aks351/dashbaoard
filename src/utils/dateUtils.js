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
 * Filter a weeks array to only those whose end date falls in the given month.
 * Defaults to the current month so call sites need no extra arguments.
 *
 * @param {Array}  weeks      - Full weeks array [{ id, label, range }]
 * @param {Date}   targetDate - Any date inside the desired month (default: today)
 * @returns {Array} weeks belonging to that month
 */
export function weeksInMonth(weeks, targetDate = new Date()) {
  const tm = targetDate.getMonth();
  const ty = targetDate.getFullYear();
  const filtered = weeks.filter(w => {
    const end = parseWeekEndMonth(w.range);
    return end && end.getMonth() === tm && end.getFullYear() === ty;
  });
  // Fall back to all weeks if none match (e.g. ranges missing / unparseable)
  return filtered.length > 0 ? filtered : weeks;
}
