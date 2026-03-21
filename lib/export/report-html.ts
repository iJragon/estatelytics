import type { AnalysisResult } from '@/lib/models/statement';
import type { PropertyDetail } from '@/lib/models/portfolio';

// ── Formatters ────────────────────────────────────────────────────────────────

function fmtFull(val: number | null | undefined): string {
  if (val === null || val === undefined) return 'N/A';
  const sign = val < 0 ? '-' : '';
  return `${sign}$${Math.abs(val).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

function fmt$(val: number | null | undefined): string {
  if (val === null || val === undefined) return 'N/A';
  const abs = Math.abs(val);
  const sign = val < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000)     return `${sign}$${(abs / 1_000).toFixed(1)}K`;
  return `${sign}$${abs.toFixed(0)}`;
}

function fmtPct(val: number | null | undefined): string {
  if (val === null || val === undefined) return 'N/A';
  return `${val.toFixed(1)}%`;
}

function pctOf(val: number | null, rev: number | null): string {
  if (val === null || rev === null || rev === 0) return '';
  return `${((val / Math.abs(rev)) * 100).toFixed(1)}%`;
}

function pctChange(prev: number | null, curr: number | null): string {
  if (prev === null || curr === null || prev === 0) return '';
  const chg = ((curr - prev) / Math.abs(prev)) * 100;
  return `${chg >= 0 ? '+' : ''}${chg.toFixed(1)}%`;
}

// ── Markdown to inline HTML ───────────────────────────────────────────────────

function mdToHtml(text: string): string {
  if (!text) return '';
  return text.split('\n').map(raw => {
    const line = raw.trim();
    if (!line) return '';
    if (line.startsWith('## ') || line.startsWith('# ')) {
      const h = line.replace(/^#+\s*/, '');
      return `<h4 style="margin:1.1em 0 0.3em;font-size:9pt;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:#6b7280;font-family:Arial,sans-serif;">${h}</h4>`;
    }
    const html = line.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    return `<p style="margin:0 0 0.55em;line-height:1.7;">${html}</p>`;
  }).join('\n');
}

// ── Shared inline styles (applied to container div, not body) ─────────────────

const CONTAINER_STYLE = 'position:fixed;top:-99999px;left:0;width:860px;background:#fff;color:#1a1a1a;font-family:Georgia,"Times New Roman",serif;font-size:10pt;padding:48px 56px;';

const INNER_CSS = `
  * { box-sizing: border-box; }
  h1 { font-size:20pt; font-weight:700; margin:0 0 10px; line-height:1.2; }
  .label { font-family:Arial,sans-serif; font-size:8pt; text-transform:uppercase; letter-spacing:0.1em; color:#6b7280; margin-bottom:6px; }
  .header-block { border-bottom:2px solid #1a1a1a; padding-bottom:16px; margin-bottom:24px; }
  .header-row { display:flex; align-items:flex-start; justify-content:space-between; gap:16px; }
  .meta { display:flex; gap:20px; flex-wrap:wrap; font-family:Arial,sans-serif; font-size:8.5pt; color:#6b7280; margin-top:8px; }
  .meta strong { color:#374151; }
  .section-label { font-family:Arial,sans-serif; font-size:8pt; font-weight:700; text-transform:uppercase; letter-spacing:0.1em; color:#6b7280; margin:24px 0 10px; }
  .kpi-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin-bottom:24px; }
  .kpi-tile { border:1px solid #e5e7eb; border-radius:5px; padding:10px; text-align:center; }
  .kpi-label { font-family:Arial,sans-serif; font-size:7.5pt; text-transform:uppercase; letter-spacing:0.07em; color:#9ca3af; margin-bottom:5px; }
  .kpi-value { font-size:14pt; font-weight:700; }
  .kpi-sub { font-family:Arial,sans-serif; font-size:7pt; color:#9ca3af; margin-top:3px; }
  .good { color:#16a34a; } .warn { color:#d97706; } .bad { color:#dc2626; }
  table { width:100%; border-collapse:collapse; font-family:Arial,sans-serif; font-size:8.5pt; }
  th { font-size:7.5pt; font-weight:600; text-transform:uppercase; letter-spacing:0.05em; color:#6b7280; padding-bottom:7px; border-bottom:2px solid #1a1a1a; }
  th:not(:first-child) { text-align:right; }
  td { padding:5px 0; border-bottom:1px solid #e5e7eb; vertical-align:middle; }
  td:not(:first-child) { text-align:right; font-family:"Courier New",monospace; font-size:8.5pt; }
  .bold td { font-weight:700; color:#1a1a1a; }
  .sub td:first-child { padding-left:16px; color:#6b7280; }
  .divider td { border-top:1px solid #9ca3af; padding:0; height:1px; }
  .narrative { border-left:3px solid #e5e7eb; padding-left:16px; font-size:10pt; margin-top:4px; }
  .footer { margin-top:36px; padding-top:10px; border-top:1px solid #e5e7eb; font-family:Arial,sans-serif; font-size:7.5pt; color:#9ca3af; display:flex; justify-content:space-between; }
`;

// ── Single-analysis body HTML ─────────────────────────────────────────────────

export function buildSummaryBody(analysis: AnalysisResult, summaryText: string): string {
  const { statement, ratios } = analysis;
  const kf = statement.keyFigures;

  const gpr        = kf['gross_potential_rent']?.annualTotal ?? null;
  const vacLoss    = kf['vacancy_loss']?.annualTotal ?? null;
  const concLoss   = kf['concession_loss']?.annualTotal ?? null;
  const badDebt    = kf['bad_debt']?.annualTotal ?? null;
  const netRental  = kf['net_rental_revenue']?.annualTotal ?? null;
  const otherChg   = kf['other_tenant_charges']?.annualTotal ?? null;
  const totalRev   = kf['total_revenue']?.annualTotal ?? null;
  const ctrlExp    = kf['controllable_expenses']?.annualTotal ?? null;
  const nonCtrlExp = kf['non_controllable_expenses']?.annualTotal ?? null;
  const totalOpEx  = kf['total_operating_expenses']?.annualTotal ?? null;
  const noi        = kf['noi']?.annualTotal ?? null;
  const finExp     = kf['financial_expense']?.annualTotal ?? null;
  const netIncome  = kf['net_income']?.annualTotal ?? null;
  const cashFlow   = kf['cash_flow']?.annualTotal ?? null;

  const oer       = ratios.oer?.value ?? null;
  const dscr      = ratios.dscr?.value ?? null;
  const vacancy   = ratios.vacancyRate?.value ?? null;
  const noiMargin = ratios.noiMargin?.value ?? null;

  const reportDate = new Date(analysis.analyzedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  function row(label: string, val: number | null, indent: boolean, isDeduction: boolean, bold: boolean, divider = false): string {
    const display = isDeduction && val !== null && val > 0 ? -val : val;
    const pct = pctOf(val, totalRev);
    const rowClass = [bold ? 'bold' : '', indent ? 'sub' : ''].filter(Boolean).join(' ');
    const divRow = divider ? `<tr class="divider"><td colspan="3"></td></tr>` : '';
    return `${divRow}<tr class="${rowClass}"><td>${label}</td><td>${display !== null ? fmtFull(display) : 'N/A'}</td><td style="color:#9ca3af;">${pct}</td></tr>`;
  }

  function kpiClass(metric: string, val: number | null): string {
    if (val === null) return '';
    if (metric === 'oer')     return val < 65 ? 'good' : val < 75 ? 'warn' : 'bad';
    if (metric === 'vacancy') return val < 7  ? 'good' : val < 12 ? 'warn' : 'bad';
    if (metric === 'noi')     return val > 45 ? 'good' : val > 30 ? 'warn' : 'bad';
    if (metric === 'dscr')    return val >= 1.25 ? 'good' : val >= 1.0 ? 'warn' : 'bad';
    return '';
  }

  return `
<style>${INNER_CSS}</style>

<div class="header-block">
  <div class="label">Executive Summary</div>
  <div class="header-row">
    <h1>${statement.propertyName || 'Property Analysis'}</h1>
  </div>
  <div class="meta">
    <span><strong>Reporting Period:</strong> ${statement.period}</span>
    <span><strong>Book Type:</strong> ${statement.bookType || 'Accrual'}</span>
    <span><strong>Date Prepared:</strong> ${reportDate}</span>
    <span><strong>Source:</strong> ${analysis.fileName}</span>
  </div>
</div>

<div class="section-label">Key Performance Indicators</div>
<div class="kpi-grid">
  <div class="kpi-tile"><div class="kpi-label">NOI Margin</div><div class="kpi-value ${kpiClass('noi', noiMargin)}">${fmtPct(noiMargin)}</div><div class="kpi-sub">Target: 45%+</div></div>
  <div class="kpi-tile"><div class="kpi-label">Op. Expense Ratio</div><div class="kpi-value ${kpiClass('oer', oer)}">${fmtPct(oer)}</div><div class="kpi-sub">Target: below 55%</div></div>
  <div class="kpi-tile"><div class="kpi-label">Vacancy Rate</div><div class="kpi-value ${kpiClass('vacancy', vacancy)}">${fmtPct(vacancy)}</div><div class="kpi-sub">Target: below 7%</div></div>
  <div class="kpi-tile"><div class="kpi-label">Debt Svc Coverage</div><div class="kpi-value ${kpiClass('dscr', dscr)}">${dscr !== null ? `${dscr.toFixed(2)}x` : 'N/A'}</div><div class="kpi-sub">Lender min: 1.25x</div></div>
</div>

<div class="section-label">Statement of Operations — Annual</div>
<table>
  <thead><tr><th style="text-align:left;">Line Item</th><th>Amount</th><th style="min-width:56px;">% Rev</th></tr></thead>
  <tbody>
    ${row('Gross Potential Rent', gpr, false, false, true)}
    ${vacLoss  !== null ? row('Less: Vacancy Loss',    vacLoss,  true, true, false) : ''}
    ${concLoss !== null ? row('Less: Concession Loss', concLoss, true, true, false) : ''}
    ${badDebt  !== null ? row('Less: Bad Debt',        badDebt,  true, true, false) : ''}
    ${row('Net Rental Revenue', netRental, false, false, true, true)}
    ${otherChg !== null ? row('Other Tenant Charges', otherChg, true, false, false) : ''}
    ${row('Total Revenue', totalRev, false, false, true, true)}
    ${ctrlExp    !== null ? row('Controllable Expenses',     ctrlExp,    true, true, false, true) : '<tr class="divider"><td colspan="3"></td></tr>'}
    ${nonCtrlExp !== null ? row('Non-Controllable Expenses', nonCtrlExp, true, true, false) : ''}
    ${row('Total Operating Expenses', totalOpEx, false, true, true, true)}
    ${row('Net Operating Income', noi, false, false, true, true)}
    ${finExp    !== null ? row('Financial Expense / Debt Service', finExp, true, true, false, true) : ''}
    ${netIncome !== null ? row('Net Income', netIncome, false, false, true, true) : ''}
    ${cashFlow  !== null ? row('Cash Flow',  cashFlow,  false, false, false) : ''}
  </tbody>
</table>

${summaryText ? `
<div class="section-label" style="margin-top:28px;">AI Narrative</div>
<div class="narrative">${mdToHtml(summaryText)}</div>
` : ''}

<div class="footer">
  <span>Estatelytics &mdash; Confidential</span>
  <span>Generated ${reportDate}</span>
</div>`;
}

// ── Multi-period portfolio body HTML ──────────────────────────────────────────

export function buildPortfolioBody(
  property: PropertyDetail,
  analyses: AnalysisResult[],
  periods: string[],
  summaryText: string,
): string {
  const reportDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const periodRange = periods.length >= 2 ? `${periods[0]} to ${periods[periods.length - 1]}` : periods[0] || '';

  const latest = analyses[analyses.length - 1];
  const latestKf = latest.statement.keyFigures;
  const latestRatios = latest.ratios;

  const tableRows = [
    { label: 'Total Revenue',            key: 'total_revenue',           bold: true,  isDeduction: false },
    { label: 'Total Operating Expenses', key: 'total_operating_expenses', bold: false, isDeduction: true },
    { label: 'Net Operating Income',     key: 'noi',                      bold: true,  isDeduction: false },
    { label: 'Net Income',               key: 'net_income',               bold: false, isDeduction: false },
    { label: 'Cash Flow',                key: 'cash_flow',                bold: false, isDeduction: false },
  ].map(row => {
    const values = analyses.map(a => a.statement.keyFigures[row.key]?.annualTotal ?? null);
    if (values.every(v => v === null)) return '';
    const lastVal = values[values.length - 1];
    const prevVal = values.length >= 2 ? values[values.length - 2] : null;
    const chg = pctChange(prevVal, lastVal);
    const chgNum = prevVal !== null && lastVal !== null && prevVal !== 0 ? ((lastVal - prevVal) / Math.abs(prevVal)) * 100 : null;
    const chgColor = chgNum === null ? '#9ca3af' : chgNum >= 0 ? '#16a34a' : '#dc2626';
    const cells = values.map(v => {
      const d = row.isDeduction && v !== null && v > 0 ? -v : v;
      return `<td>${d !== null ? fmt$(d) : 'N/A'}</td>`;
    }).join('');
    const chgCell = analyses.length >= 2 ? `<td style="color:${chgColor};">${chg || 'N/A'}</td>` : '';
    return `<tr class="${row.bold ? 'bold' : ''}"><td>${row.label}</td>${cells}${chgCell}</tr>`;
  }).join('');

  const ratioRows = [
    { label: 'NOI Margin',   values: analyses.map(a => a.ratios.noiMargin?.value ?? null),   lowerIsBetter: false },
    { label: 'OER',          values: analyses.map(a => a.ratios.oer?.value ?? null),          lowerIsBetter: true },
    { label: 'Vacancy Rate', values: analyses.map(a => a.ratios.vacancyRate?.value ?? null),  lowerIsBetter: true },
  ].map(row => {
    const lastVal = row.values[row.values.length - 1];
    const prevVal = row.values.length >= 2 ? row.values[row.values.length - 2] : null;
    const chg = pctChange(prevVal, lastVal);
    const chgNum = prevVal !== null && lastVal !== null && prevVal !== 0 ? ((lastVal - prevVal) / Math.abs(prevVal)) * 100 : null;
    const chgColor = chgNum === null ? '#9ca3af' : (row.lowerIsBetter ? chgNum < 0 : chgNum > 0) ? '#16a34a' : '#dc2626';
    const cells = row.values.map(v => `<td style="color:#6b7280;">${v !== null ? `${v.toFixed(1)}%` : 'N/A'}</td>`).join('');
    const chgCell = analyses.length >= 2 ? `<td style="color:${chgColor};">${chg || 'N/A'}</td>` : '';
    return `<tr><td style="color:#6b7280;">${row.label}</td>${cells}${chgCell}</tr>`;
  }).join('');

  const oerVal = latestRatios.oer?.value ?? null;
  const vacVal = latestRatios.vacancyRate?.value ?? null;

  return `
<style>${INNER_CSS}</style>

<div class="header-block">
  <div class="label">Property Overview</div>
  <div class="header-row">
    <h1>${property.name}</h1>
  </div>
  <div class="meta">
    <span><strong>Reporting Period:</strong> ${periodRange}</span>
    <span><strong>Statements:</strong> ${analyses.length} period${analyses.length !== 1 ? 's' : ''}</span>
    <span><strong>Date Prepared:</strong> ${reportDate}</span>
  </div>
</div>

<div class="section-label">Most Recent Period — ${periods[periods.length - 1]}</div>
<div class="kpi-grid">
  <div class="kpi-tile"><div class="kpi-label">Net Operating Income</div><div class="kpi-value">${fmt$(latestKf['noi']?.annualTotal ?? null)}</div><div class="kpi-sub">Annual NOI</div></div>
  <div class="kpi-tile"><div class="kpi-label">Total Revenue</div><div class="kpi-value">${fmt$(latestKf['total_revenue']?.annualTotal ?? null)}</div><div class="kpi-sub">Annual revenue</div></div>
  <div class="kpi-tile"><div class="kpi-label">Op. Expense Ratio</div><div class="kpi-value ${oerVal !== null && oerVal < 65 ? 'good' : 'warn'}">${fmtPct(oerVal)}</div><div class="kpi-sub">Target: below 55%</div></div>
  <div class="kpi-tile"><div class="kpi-label">Vacancy Rate</div><div class="kpi-value ${vacVal !== null && vacVal < 7 ? 'good' : 'warn'}">${fmtPct(vacVal)}</div><div class="kpi-sub">Target: below 7%</div></div>
</div>

<div class="section-label">Multi-Period Financial Summary</div>
<table>
  <thead>
    <tr>
      <th style="text-align:left;">Line Item</th>
      ${periods.map(p => `<th>${p}</th>`).join('')}
      ${analyses.length >= 2 ? '<th>Chg</th>' : ''}
    </tr>
  </thead>
  <tbody>
    ${tableRows}
    ${ratioRows}
  </tbody>
</table>

${summaryText ? `
<div class="section-label" style="margin-top:28px;">Management Commentary</div>
<div class="narrative">${mdToHtml(summaryText)}</div>
` : ''}

<div class="footer">
  <span>Estatelytics &mdash; Confidential</span>
  <span>Generated ${reportDate}</span>
</div>`;
}

// ── PDF download (no print dialog) ───────────────────────────────────────────

export async function downloadPDF(bodyHTML: string, filename: string): Promise<void> {
  const [{ jsPDF }, { default: html2canvas }] = await Promise.all([
    import('jspdf'),
    import('html2canvas'),
  ]);

  // Render into an off-screen container
  const container = document.createElement('div');
  container.style.cssText = CONTAINER_STYLE;
  container.innerHTML = bodyHTML;
  document.body.appendChild(container);

  // Give the browser a tick to lay out styles
  await new Promise(r => setTimeout(r, 120));

  const canvas = await html2canvas(container, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    windowWidth: 860,
    logging: false,
  });

  document.body.removeChild(container);

  const imgData = canvas.toDataURL('image/jpeg', 0.93);
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const imgH  = (canvas.height * pageW) / canvas.width;

  let yOffset = 0;
  let remaining = imgH;

  while (remaining > 0) {
    pdf.addImage(imgData, 'JPEG', 0, yOffset, pageW, imgH);
    remaining -= pageH;
    if (remaining > 0) {
      pdf.addPage();
      yOffset -= pageH;
    }
  }

  pdf.save(filename);
}
