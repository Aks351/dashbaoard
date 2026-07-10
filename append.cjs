const fs = require('fs');
const css = `
/* Data Entry Hiring specific styles */
.rec-table {
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
  margin: 16px 24px;
}
.rec-head {
  background: var(--bg-start);
  padding: 12px 16px;
  font-weight: 700;
  color: var(--navy);
  border-bottom: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.rec-head .sub {
  font-size: 12px;
  color: var(--muted);
  font-weight: 500;
}
.pos-group {
  padding: 16px;
  border-bottom: 1px dashed var(--border);
}
.pos-group:last-child {
  border-bottom: none;
}
.pos-title {
  font-weight: 600;
  color: var(--navy);
  margin-bottom: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.pos-title .rm {
  color: var(--muted);
  cursor: pointer;
  font-size: 14px;
  padding: 4px;
}
.pos-title .rm:hover {
  color: var(--red);
}
.pos-empty {
  padding: 24px;
  text-align: center;
  color: var(--muted);
  font-size: 13px;
  background: rgba(248,250,252,0.5);
}
.de-row {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px solid rgba(226,232,240,0.5);
}
.de-row:last-child {
  border-bottom: none;
}
.de-row.head {
  padding: 4px 0 8px 0;
}
.de-cell {
  font-size: 14px;
}
.de-cell.head {
  font-size: 12px;
  font-weight: 600;
  color: var(--text2);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
`;
fs.appendFileSync('src/index.css', css);
console.log('Appended successfully');
