const fs = require('fs');

let store = fs.readFileSync('src/store/kpiStore.jsx', 'utf8');
const seedStr = fs.readFileSync('seed.json', 'utf8');

// Replace SEED
store = store.replace(/export const SEED = \{[\s\S]*?\n  \]\n\};/, 'export const SEED = ' + seedStr + ';');

// Replace STAGES
store = store.replace(/export const STAGES = \[.*?\];/, `export const STAGES = [['Applications', 'apps'], ['Final Rounds', 'final'], ['Offer Given To', 'offer']];`);

// Remove onboard from addHiringRole
store = store.replace(/,\s*\{\s*id:\s*\`\$\{baseId\}_onboard\`[\s\S]*?Onboarded\`\s*\}/, '');

// Clean up migration to just delete onboard metrics if they exist
store = store.replace(/\/\/\s*Insert global offer before onboard[\s\S]*?newMetrics\.push\(m\);\n\s*\}\);\n\s*hiring\.metrics = newMetrics;/, `// Remove any existing onboard metrics during migration
      hiring.metrics.forEach(m => {
        if (!m.id.endsWith('_onboard') && m.id !== 'onboard') {
          newMetrics.push(m);
        }
      });
      hiring.metrics = newMetrics;`);

fs.writeFileSync('src/store/kpiStore.jsx', store);

let de = fs.readFileSync('src/components/DataEntry.jsx', 'utf8');
de = de.replace(/const order = \{[^\}]+\};/, `const order = { 'Applications': 0, 'Final Rounds': 1, 'Offer Given To': 2 };`);
fs.writeFileSync('src/components/DataEntry.jsx', de);

console.log('Done');
