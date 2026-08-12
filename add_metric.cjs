const fs = require('fs');
let content = fs.readFileSync('seed.json', 'utf8');
if (content.charCodeAt(0) === 0xFEFF) {
  content = content.slice(1);
}
const seed = JSON.parse(content);
const prod = seed.departments.find(d => d.id === 'production');
const hrslostIdx = prod.metrics.findIndex(m => m.id === 'hrslost');
const plan = {}; const actual = {};
seed.weeks.forEach(w => {
  plan[w.id] = '';
  actual[w.id] = '';
});
prod.metrics.splice(hrslostIdx + 1, 0, {
  id: 'total_cuts',
  name: 'Total cuts',
  sub: '',
  unit: '',
  dir: 'lower',
  total: false,
  plan,
  actual,
  promised: {}
});
fs.writeFileSync('seed.json', JSON.stringify(seed, null, 4));
console.log('Done modifying seed.json');
