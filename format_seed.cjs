const fs = require('fs');

const seedRaw = fs.readFileSync('./seed.json', 'utf8');
// The user json has {"ok":true,"data": {...}}
let parsed;
try {
  parsed = JSON.parse(seedRaw);
} catch (e) {
  console.error("Error parsing seed.json", e);
  process.exit(1);
}

// Extract data portion if it exists, otherwise use raw
let data = parsed.data ? parsed.data : parsed;
const pretty = JSON.stringify(data, null, 2);

const file = fs.readFileSync('./src/store/kpiStore.jsx', 'utf8');
const start = file.indexOf('export const SEED =');
const end = file.indexOf('export const SOLUTION_LINKS');

if (start !== -1 && end !== -1) {
  const newFile = file.substring(0, start) + 'export const SEED = ' + pretty + ';\n\n' + file.substring(end);
  fs.writeFileSync('./src/store/kpiStore.jsx', newFile);
  console.log("Success");
} else {
  console.error("Could not find start or end markers");
}
