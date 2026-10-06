// ─── PDF Report Export Utility for Vinayak Enterprises Master Dashboard ───────────
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { mtd, calculateScore, formatVal } from './kpiUtils';
import { weeksInMonth, groupWeeksByMonth } from './dateUtils';
import { ZERO_PLAN_IDS } from '../constants/kpiConstants';

// Layout & Margin configuration
const PAGE_MARGIN = 9; // 9mm page margins for maximum printable width (279mm printable)

// Brand colors
const BRAND_DARK = [15, 23, 42];       // #0f172a (Slate 900)
const BRAND_HEADER = [30, 41, 59];     // #1e293b (Slate 800)
const BRAND_BORDER = [203, 213, 225];   // #cbd5e1 (Slate 300)
const BRAND_ZEBRA = [248, 250, 252];   // #f8fafc (Slate 50)
const BRAND_MTD_BG = [236, 253, 245];  // #ecfdf5 (Emerald 50)
const BRAND_MTD_TEXT = [4, 120, 87];   // #047857 (Emerald 700)
const COLOR_MUTED = [100, 116, 139];   // #64748b (Slate 500)
const COLOR_GREEN = [22, 101, 52];     // #166534
const COLOR_AMBER = [180, 83, 9];      // #b45309
const COLOR_RED = [185, 28, 28];       // #b91c1c

/**
 * Draw consistent corporate report header on the current PDF page
 */
function drawPageHeader(doc, { title, subtitle, period, weekRangeStr }) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const left = PAGE_MARGIN;

  // Company Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...BRAND_DARK);
  doc.text('Vinayak Enterprises', left, 14);

  // Report Title
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 65, 85);
  doc.text(title, left, 21);

  // Subtitle / Period Badges
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLOR_MUTED);
  const metaText = `Period: ${period || 'All Months'}${weekRangeStr ? ` · Weeks: ${weekRangeStr}` : ''}`;
  doc.text(metaText, left, 26);

  // Timestamp on the right
  const dateStr = new Date().toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  doc.text(`Generated: ${dateStr}`, pageWidth - PAGE_MARGIN, 26, { align: 'right' });

  // Divider line
  doc.setDrawColor(...BRAND_BORDER);
  doc.setLineWidth(0.6);
  doc.line(left, 29, pageWidth - PAGE_MARGIN, 29);

  return 33; // Y offset where table should start
}

/**
 * Add page numbers and confidentiality footer to all pages
 */
function applyPageFooters(doc) {
  const totalPages = doc.internal.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...COLOR_MUTED);

    // Divider line
    doc.setDrawColor(...BRAND_BORDER);
    doc.setLineWidth(0.4);
    doc.line(PAGE_MARGIN, pageHeight - 11, pageWidth - PAGE_MARGIN, pageHeight - 11);

    // Left: Confidential notice
    doc.text('Confidential · Vinayak Enterprises KPI Monitoring System', PAGE_MARGIN, pageHeight - 6);

    // Right: Page number
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - PAGE_MARGIN, pageHeight - 6, { align: 'right' });
  }
}

/**
 * Format score cell styling
 */
function getScoreCellStyles(sc) {
  if (!sc || sc.color === 'gray' || sc.label === '—') {
    return { textColor: [100, 116, 139], fontStyle: 'normal' };
  }
  if (sc.color === 'green') {
    return { textColor: COLOR_GREEN, fontStyle: 'bold' };
  }
  if (sc.color === 'amber') {
    return { textColor: COLOR_AMBER, fontStyle: 'bold' };
  }
  return { textColor: COLOR_RED, fontStyle: 'bold' };
}

/**
 * Compact score label formatter so issue counts don't wrap mid-word
 */
function formatScoreLabel(sc, isCompact = false) {
  if (!sc || !sc.label) return '—';
  if (isCompact && typeof sc.label === 'string') {
    if (sc.label.endsWith(' issues')) return sc.label.replace(' issues', ' iss');
    if (sc.label.endsWith(' issue')) return sc.label.replace(' issue', ' iss');
  }
  return sc.label;
}

/**
 * Build table headers and body for a standard department's metrics
 */
function buildDepartmentTableData(department, weeks, options = {}) {
  const isCrm = department.id === 'crm';
  const isProduction = department.id === 'production';
  const scoreOpts = isProduction ? { strict: true } : {};
  const metrics = options.metricsOverride || department.metrics;
  const isCompact = (weeks.length * (isCrm ? 4 : 3) + 3) >= 15;

  // Header Row 1: KPI Metric + each Week group + MTD group
  const headRow1 = [
    { content: 'Metric / Indicator', rowSpan: 2, styles: { halign: 'left', valign: 'middle' } }
  ];

  weeks.forEach(w => {
    headRow1.push({
      content: `${w.label}\n${w.range || ''}`,
      colSpan: isCrm ? 4 : 3,
      styles: { halign: 'center', valign: 'middle' }
    });
  });

  headRow1.push({
    content: 'MTD Total',
    colSpan: 3,
    styles: { halign: 'center', valign: 'middle', fillColor: BRAND_MTD_BG, textColor: BRAND_MTD_TEXT }
  });

  // Header Row 2: Sub-columns (Plan, Act, Score, [Promised])
  const headRow2 = [];
  weeks.forEach(() => {
    headRow2.push({ content: 'Plan', styles: { halign: 'center' } });
    headRow2.push({ content: 'Act', styles: { halign: 'center' } });
    headRow2.push({ content: 'Score', styles: { halign: 'center' } });
    if (isCrm) {
      headRow2.push({ content: 'Promised', styles: { halign: 'center' } });
    }
  });

  headRow2.push({ content: 'Plan', styles: { halign: 'center', fillColor: BRAND_MTD_BG, textColor: BRAND_MTD_TEXT } });
  headRow2.push({ content: 'Act', styles: { halign: 'center', fillColor: BRAND_MTD_BG, textColor: BRAND_MTD_TEXT } });
  headRow2.push({ content: 'Score', styles: { halign: 'center', fillColor: BRAND_MTD_BG, textColor: BRAND_MTD_TEXT } });

  // Body Rows
  const body = [];
  metrics.forEach(m => {
    const row = [];
    const metricTitle = `${m.name}${m.unit ? ` (${m.unit})` : ''}${m.sub ? `\n[${m.sub}]` : ''}`;
    row.push({
      content: metricTitle,
      styles: { fontStyle: m.total ? 'bold' : 'normal', halign: 'left' }
    });

    // Weeks
    weeks.forEach(w => {
      const pVal = m.plan?.[w.id];
      const aVal = m.actual?.[w.id];
      const pFmt = formatVal(pVal, m.unit, m.id);
      const aFmt = formatVal(aVal, m.unit, m.id);
      const sc = calculateScore(pVal, aVal, m.dir, scoreOpts);
      const scLabel = formatScoreLabel(sc, isCompact);

      row.push({ content: pFmt, styles: { halign: 'center' } });
      row.push({ content: aFmt, styles: { halign: 'center' } });
      row.push({ content: scLabel, styles: { halign: 'center', ...getScoreCellStyles(sc) } });

      if (isCrm) {
        const promVal = m.promised?.[w.id];
        const promFmt = promVal !== undefined && promVal !== '' ? formatVal(promVal, m.unit, m.id) : '—';
        row.push({ content: promFmt, styles: { halign: 'center', textColor: [37, 99, 235] } });
      }
    });

    // MTD
    const mt = mtd(m, weeks);
    const mtdScore = calculateScore(mt.plan, mt.actual, m.dir, scoreOpts);
    const mtdScoreLabel = formatScoreLabel(mtdScore, isCompact);

    row.push({ content: formatVal(mt.plan, m.unit, m.id), styles: { halign: 'center', fillColor: BRAND_MTD_BG } });
    row.push({ content: formatVal(mt.actual, m.unit, m.id), styles: { halign: 'center', fillColor: BRAND_MTD_BG } });
    row.push({
      content: mtdScoreLabel,
      styles: { halign: 'center', fillColor: BRAND_MTD_BG, ...getScoreCellStyles(mtdScore) }
    });

    body.push(row);
  });

  return { head: [headRow1, headRow2], body };
}

/**
 * Render Department PDF Report
 */
function renderDepartmentReport(doc, department, weeks, period, startY = null) {
  const weekRangeStr = weeks.length ? `${weeks[0].label} (${weeks[0].range}) – ${weeks[weeks.length - 1].label} (${weeks[weeks.length - 1].range})` : '';
  const y = startY !== null ? startY : drawPageHeader(doc, {
    title: `${department.name} Department — Monthly KPI Report`,
    subtitle: 'Week-by-week plan vs actual with live MTD rollup',
    period,
    weekRangeStr,
  });

  if (department.id === 'hiring') {
    renderHiringReportTables(doc, department, weeks, y);
    return;
  }

  const isCrm = department.id === 'crm';
  const totalCols = 1 + weeks.length * (isCrm ? 4 : 3) + 3;
  const isWideTable = totalCols >= 16;
  // Compact column 0 width so data columns get ample space and never wrap numbers
  const col0Width = isWideTable ? 34 : 38;
  const tableFontSize = isWideTable ? 7.2 : 8;
  const headFontSize = isWideTable ? 6.8 : 7.5;
  const hPadding = isWideTable ? 0.6 : 0.9;

  const { head, body } = buildDepartmentTableData(department, weeks);

  autoTable(doc, {
    startY: y,
    head,
    body,
    theme: 'grid',
    styles: {
      fontSize: tableFontSize,
      cellPadding: { top: 2, bottom: 2, left: hPadding, right: hPadding },
      lineColor: BRAND_BORDER,
      lineWidth: 0.2,
      font: 'helvetica',
      valign: 'middle',
    },
    headStyles: {
      fillColor: BRAND_HEADER,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: headFontSize,
      valign: 'middle',
    },
    alternateRowStyles: {
      fillColor: BRAND_ZEBRA,
    },
    columnStyles: {
      0: { cellWidth: col0Width },
    },
    margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
  });
}

/**
 * Render Hiring Report with separate sections for Pipeline Stages, Recruiters, and Positions
 */
function renderHiringReportTables(doc, department, weeks, startY) {
  let currentY = startY;
  const topIds = ['apps', 'rono', 'final', 'offer'];
  const totalCols = 1 + weeks.length * 3 + 3;
  const isWideTable = totalCols >= 16;
  const col0Width = isWideTable ? 35 : 38;
  const hPadding = isWideTable ? 0.6 : 0.9;
  const tableFontSize = isWideTable ? 7.2 : 8;
  const headFontSize = isWideTable ? 6.8 : 7.5;

  // 1. Overall Pipeline Stages
  const topMetrics = department.metrics
    .filter(m => topIds.includes(m.id))
    .sort((a, b) => topIds.indexOf(a.id) - topIds.indexOf(b.id));

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...BRAND_DARK);
  doc.text('1. Company-wide Recruitment Pipeline Stages', PAGE_MARGIN, currentY + 4);
  currentY += 7;

  const topData = buildDepartmentTableData(department, weeks, { metricsOverride: topMetrics });
  autoTable(doc, {
    startY: currentY,
    head: topData.head,
    body: topData.body,
    theme: 'grid',
    styles: { fontSize: tableFontSize, cellPadding: { top: 2, bottom: 2, left: hPadding, right: hPadding }, lineColor: BRAND_BORDER, lineWidth: 0.2, valign: 'middle' },
    headStyles: { fillColor: BRAND_HEADER, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: headFontSize, valign: 'middle' },
    alternateRowStyles: { fillColor: BRAND_ZEBRA },
    columnStyles: { 0: { cellWidth: col0Width } },
    margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
  });

  currentY = doc.lastAutoTable.finalY + 8;

  // 2. Recruiter Performance Totals
  const recruiterMetrics = department.metrics.filter(m => m.id.startsWith('rec_'));
  if (recruiterMetrics.length > 0) {
    if (currentY > 160) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...BRAND_DARK);
    doc.text('2. Recruiter Performance Breakdown', PAGE_MARGIN, currentY);
    currentY += 4;

    const recData = buildDepartmentTableData(department, weeks, { metricsOverride: recruiterMetrics });
    autoTable(doc, {
      startY: currentY,
      head: recData.head,
      body: recData.body,
      theme: 'grid',
      styles: { fontSize: tableFontSize - 0.3, cellPadding: { top: 1.8, bottom: 1.8, left: hPadding, right: hPadding }, lineColor: BRAND_BORDER, lineWidth: 0.2, valign: 'middle' },
      headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: headFontSize - 0.2, valign: 'middle' },
      alternateRowStyles: { fillColor: BRAND_ZEBRA },
      columnStyles: { 0: { cellWidth: col0Width } },
      margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
    });

    currentY = doc.lastAutoTable.finalY + 8;
  }

  // 3. Open Positions Breakdown
  const posMetrics = department.metrics.filter(m => m.id.startsWith('pos_'));
  if (posMetrics.length > 0) {
    if (currentY > 150) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...BRAND_DARK);
    doc.text('3. Position-Wise Recruitment Progress', PAGE_MARGIN, currentY);
    currentY += 4;

    const posData = buildDepartmentTableData(department, weeks, { metricsOverride: posMetrics });
    autoTable(doc, {
      startY: currentY,
      head: posData.head,
      body: posData.body,
      theme: 'grid',
      styles: { fontSize: 6.8, cellPadding: { top: 1.6, bottom: 1.6, left: hPadding, right: hPadding }, lineColor: BRAND_BORDER, lineWidth: 0.2, valign: 'middle' },
      headStyles: { fillColor: [71, 85, 105], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 6.5, valign: 'middle' },
      alternateRowStyles: { fillColor: BRAND_ZEBRA },
      columnStyles: { 0: { cellWidth: col0Width + 4 } },
      margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
    });
  }
}

/**
 * Render Overview Report (Summary Scorecards + Full Cross-Department Table)
 */
function renderOverviewReport(doc, model, weeks, period) {
  const weekRangeStr = weeks.length ? `${weeks[0].label} (${weeks[0].range}) – ${weeks[weeks.length - 1].label} (${weeks[weeks.length - 1].range})` : '';
  const y = drawPageHeader(doc, {
    title: 'Monthly KPI Overview — Executive Dashboard',
    subtitle: 'Cross-departmental performance review and month-to-date scorecard',
    period,
    weekRangeStr,
  });

  // Department Executive Summary Scorecard Table
  const scorecardRows = model.departments.map(d => {
    const validMetrics = d.metrics.filter(m => d.id !== 'hiring' || !/·\s*Position:/i.test(m.sub || ''));
    let totalKpis = validMetrics.length;
    let metCount = 0;
    let missedCount = 0;
    let worst = null;
    let worstSc = null;

    validMetrics.forEach(m => {
      if (m.dir === 'zero' || ZERO_PLAN_IDS.has(m.id)) return;
      const mt = mtd(m, weeks);
      const isProduction = d.id === 'production';
      const sc = calculateScore(mt.plan, mt.actual, m.dir, isProduction ? { strict: true } : {});
      if (sc.color === 'green') metCount++;
      if (sc.color === 'red') missedCount++;

      if (sc.pct !== null && sc.pct !== undefined && (worstSc === null || sc.pct < worstSc.pct)) {
        worst = m;
        worstSc = sc;
      }
    });

    const worstStr = worst && worstSc ? `${worst.name} (${worstSc.label})` : 'All On Track';
    const status = missedCount === 0 ? 'Optimal' : missedCount <= 2 ? 'Needs Attention' : 'Critical Action Required';

    return [
      `${d.emoji} ${d.name}`,
      String(totalKpis),
      String(metCount),
      String(missedCount),
      worstStr,
      status,
    ];
  });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...BRAND_DARK);
  doc.text('Executive Department Summary Scorecard', PAGE_MARGIN, y + 3);

  autoTable(doc, {
    startY: y + 6,
    head: [['Department', 'Total KPIs', 'Targets Met', 'Targets Missed', 'Key Variance Focus', 'Department Status']],
    body: scorecardRows,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: { top: 2.2, bottom: 2.2, left: 1.5, right: 1.5 }, lineColor: BRAND_BORDER, lineWidth: 0.2, valign: 'middle' },
    headStyles: { fillColor: BRAND_HEADER, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8, valign: 'middle' },
    alternateRowStyles: { fillColor: BRAND_ZEBRA },
    margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
  });

  const nextY = doc.lastAutoTable.finalY + 8;

  // Cross-department combined metrics table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...BRAND_DARK);
  doc.text('Cross-Department KPI Details', PAGE_MARGIN, nextY);

  const totalCols = 1 + weeks.length * 3 + 3;
  const isWideTable = totalCols >= 16;
  const col0Width = isWideTable ? 34 : 38;
  const tableFontSize = isWideTable ? 7.2 : 7.5;
  const headFontSize = isWideTable ? 6.8 : 7;
  const hPadding = isWideTable ? 0.6 : 0.8;

  // Flatten rows from all departments
  const allRows = [];
  model.departments.forEach(dept => {
    const isProduction = dept.id === 'production';
    const scoreOpts = isProduction ? { strict: true } : {};
    const metrics = dept.metrics.filter(m => dept.id !== 'hiring' || !/·\s*Position:/i.test(m.sub || ''));

    // Department separator row
    allRows.push([
      {
        content: `${dept.emoji} ${dept.name.toUpperCase()} DEPARTMENT`,
        colSpan: 1 + weeks.length * 3 + 3,
        styles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' }
      }
    ]);

    metrics.forEach(m => {
      const row = [];
      const mTitle = `${m.name}${m.unit ? ` (${m.unit})` : ''}`;
      row.push({ content: mTitle, styles: { halign: 'left' } });

      weeks.forEach(w => {
        const pVal = m.plan?.[w.id];
        const aVal = m.actual?.[w.id];
        const sc = calculateScore(pVal, aVal, m.dir, scoreOpts);
        const scLabel = formatScoreLabel(sc, isWideTable);
        row.push({ content: formatVal(pVal, m.unit, m.id), styles: { halign: 'center' } });
        row.push({ content: formatVal(aVal, m.unit, m.id), styles: { halign: 'center' } });
        row.push({ content: scLabel, styles: { halign: 'center', ...getScoreCellStyles(sc) } });
      });

      const mt = mtd(m, weeks);
      const mtdScore = calculateScore(mt.plan, mt.actual, m.dir, scoreOpts);
      const mtdScoreLabel = formatScoreLabel(mtdScore, isWideTable);
      row.push({ content: formatVal(mt.plan, m.unit, m.id), styles: { halign: 'center', fillColor: BRAND_MTD_BG } });
      row.push({ content: formatVal(mt.actual, m.unit, m.id), styles: { halign: 'center', fillColor: BRAND_MTD_BG } });
      row.push({ content: mtdScoreLabel, styles: { halign: 'center', fillColor: BRAND_MTD_BG, ...getScoreCellStyles(mtdScore) } });

      allRows.push(row);
    });
  });

  // Table header
  const headRow1 = [{ content: 'KPI Metric', rowSpan: 2, styles: { halign: 'left', valign: 'middle' } }];
  weeks.forEach(w => {
    headRow1.push({
      content: `${w.label}\n${w.range || ''}`,
      colSpan: 3,
      styles: { halign: 'center', valign: 'middle' }
    });
  });
  headRow1.push({
    content: 'MTD Total',
    colSpan: 3,
    styles: { halign: 'center', valign: 'middle', fillColor: BRAND_MTD_BG, textColor: BRAND_MTD_TEXT }
  });

  const headRow2 = [];
  weeks.forEach(() => {
    headRow2.push({ content: 'Plan', styles: { halign: 'center' } });
    headRow2.push({ content: 'Act', styles: { halign: 'center' } });
    headRow2.push({ content: 'Score', styles: { halign: 'center' } });
  });
  headRow2.push({ content: 'Plan', styles: { halign: 'center', fillColor: BRAND_MTD_BG, textColor: BRAND_MTD_TEXT } });
  headRow2.push({ content: 'Act', styles: { halign: 'center', fillColor: BRAND_MTD_BG, textColor: BRAND_MTD_TEXT } });
  headRow2.push({ content: 'Score', styles: { halign: 'center', fillColor: BRAND_MTD_BG, textColor: BRAND_MTD_TEXT } });

  autoTable(doc, {
    startY: nextY + 3,
    head: [headRow1, headRow2],
    body: allRows,
    theme: 'grid',
    styles: { fontSize: tableFontSize, cellPadding: { top: 2, bottom: 2, left: hPadding, right: hPadding }, lineColor: BRAND_BORDER, lineWidth: 0.2, valign: 'middle' },
    headStyles: { fillColor: BRAND_HEADER, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: headFontSize, valign: 'middle' },
    alternateRowStyles: { fillColor: BRAND_ZEBRA },
    columnStyles: { 0: { cellWidth: col0Width } },
    margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
  });
}

/**
 * Main export function: downloads PDF for a specific section or all sections
 *
 * @param {Object} model - The computed dashboard model
 * @param {Object} options - { sectionId: 'overview'|'all'|'purchase'|'production'|'crm'|'hiring', period: 'June 2026' }
 */
export async function downloadReportPdf(model, { sectionId = 'overview', period = '' }) {
  if (!model) throw new Error('No dashboard model provided');

  const isAllMonths = !period || period === 'all' || period === 'All Months';

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const cleanPeriod = (period || 'All_Months').replace(/\s+/g, '_');

  if (isAllMonths) {
    // ── All Months Mode: Render each month separately on its own page(s) ──
    const monthGroups = groupWeeksByMonth(model.weeks).filter(mg => mg.weeks && mg.weeks.length > 0);
    const groupsToRender = monthGroups.length > 0
      ? monthGroups
      : [{ monthLabel: model.meta?.period || 'All Months', weeks: model.weeks }];

    if (sectionId === 'all') {
      let isFirstPage = true;
      groupsToRender.forEach(mg => {
        // Overview for this month
        if (!isFirstPage) {
          doc.addPage('a4', 'landscape');
        }
        renderOverviewReport(doc, model, mg.weeks, mg.monthLabel);
        isFirstPage = false;

        // Each department for this month
        model.departments.forEach(dept => {
          doc.addPage('a4', 'landscape');
          renderDepartmentReport(doc, dept, mg.weeks, mg.monthLabel);
        });
      });

      applyPageFooters(doc);
      const fileName = `Vinayak_Enterprises_Master_KPI_Report_All_Months.pdf`;
      doc.save(fileName);
      return fileName;
    }

    if (sectionId === 'overview') {
      let isFirstPage = true;
      groupsToRender.forEach(mg => {
        if (!isFirstPage) {
          doc.addPage('a4', 'landscape');
        }
        renderOverviewReport(doc, model, mg.weeks, mg.monthLabel);
        isFirstPage = false;
      });

      applyPageFooters(doc);
      const fileName = `Vinayak_Enterprises_Overview_KPI_Report_All_Months.pdf`;
      doc.save(fileName);
      return fileName;
    }

    // Specific Department (Purchase, Production, CRM, Hiring) across all months
    const dept = model.departments.find(d => d.id === sectionId);
    if (!dept) throw new Error(`Department ${sectionId} not found in model`);

    let isFirstPage = true;
    groupsToRender.forEach(mg => {
      if (!isFirstPage) {
        doc.addPage('a4', 'landscape');
      }
      renderDepartmentReport(doc, dept, mg.weeks, mg.monthLabel);
      isFirstPage = false;
    });

    applyPageFooters(doc);
    const cleanDeptName = dept.name.replace(/\s+/g, '_');
    const fileName = `Vinayak_Enterprises_${cleanDeptName}_KPI_Report_All_Months.pdf`;
    doc.save(fileName);
    return fileName;
  }

  // ── Single Selected Month Mode ──
  const weeks = weeksInMonth(model.weeks, period);

  if (sectionId === 'all') {
    renderOverviewReport(doc, model, weeks, period);

    model.departments.forEach(dept => {
      doc.addPage('a4', 'landscape');
      renderDepartmentReport(doc, dept, weeks, period);
    });

    applyPageFooters(doc);
    const fileName = `Vinayak_Enterprises_Master_KPI_Report_${cleanPeriod}.pdf`;
    doc.save(fileName);
    return fileName;
  }

  if (sectionId === 'overview') {
    renderOverviewReport(doc, model, weeks, period);
    applyPageFooters(doc);
    const fileName = `Vinayak_Enterprises_Overview_KPI_Report_${cleanPeriod}.pdf`;
    doc.save(fileName);
    return fileName;
  }

  const dept = model.departments.find(d => d.id === sectionId);
  if (!dept) throw new Error(`Department ${sectionId} not found in model`);

  renderDepartmentReport(doc, dept, weeks, period);
  applyPageFooters(doc);

  const cleanDeptName = dept.name.replace(/\s+/g, '_');
  const fileName = `Vinayak_Enterprises_${cleanDeptName}_KPI_Report_${cleanPeriod}.pdf`;
  doc.save(fileName);
  return fileName;
}
