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
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const startM = months[nextStart.getMonth()];
  const endM = months[nextEnd.getMonth()];
  if (startM === endM) {
    return `${nextStart.getDate()}–${nextEnd.getDate()} ${startM}`;
  } else {
    return `${nextStart.getDate()} ${startM}–${nextEnd.getDate()} ${endM}`;
  }
}
