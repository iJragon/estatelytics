/**
 * Generates 3 standalone T12 operating statements for deal underwriting test cases.
 *   1. Oakwood Apartments  — Strong Buy  (great cap rate, low expenses, low vacancy)
 *   2. Birchwood Commons   — Conditional (tight margins, elevated expenses, manageable)
 *   3. Westgate Commercial — Avoid       (negative NOI, high vacancy, expenses exceed income)
 *
 * Run: node scripts/generate-underwriting-test-cases.js
 * Output: data/test-cases/
 */

const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const OUT_DIR = path.join('data', 'test-cases');
fs.mkdirSync(OUT_DIR, { recursive: true });

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function round(n) { return Math.round(n); }

function buildSheet(title, address, period, sections) {
  // sections: [{ label, rows: [{ label, monthly: [12], isHeader?, isSubtotal? }] }]
  const rows = [];

  // Header block
  rows.push([title]);
  rows.push(['T12 Operating Statement']);
  rows.push([address]);
  rows.push([`Period: ${period}`]);
  rows.push([]);
  rows.push(['', ...MONTHS, 'Annual Total']);

  for (const section of sections) {
    rows.push([]);
    rows.push([section.label.toUpperCase()]);

    for (const item of section.rows) {
      if (item.isHeader) {
        rows.push([`  ${item.label}`]);
        continue;
      }

      const monthly = item.monthly || new Array(12).fill(item.monthly_flat || 0);
      const annual = monthly.reduce((s, v) => s + v, 0);

      const prefix = item.isSubtotal ? '' : '    ';
      const fontLabel = `${prefix}${item.label}`;
      rows.push([fontLabel, ...monthly.map(round), round(annual)]);
    }
  }

  return rows;
}

function spreadEvenly(annual, variance = 0.08) {
  // Spread annual total across 12 months with slight seasonal variation
  const base = annual / 12;
  return MONTHS.map((_, i) => {
    // Small sine wave variation to look realistic
    const seasonal = Math.sin((i / 12) * Math.PI * 2) * variance * base;
    return Math.max(0, base + seasonal);
  });
}

function spreadWithSpike(annual, spikeMonth, spikeFactor, variance = 0.05) {
  const base = annual / 12;
  return MONTHS.map((_, i) => {
    if (i === spikeMonth) return base * spikeFactor;
    const seasonal = Math.sin((i / 12) * Math.PI * 2) * variance * base;
    const adjustedBase = (annual - base * spikeFactor) / 11;
    return Math.max(0, adjustedBase + seasonal);
  });
}

// ─── CASE 1: Oakwood Apartments (Strong Buy) ──────────────────────────────────
// 24 units @ $2,100/mo = $604,800 GPR
// 4% vacancy, very healthy
// OER ~29%, NOI ~$420K
// Cap rate at $5.2M purchase: ~8.1%

function generateOakwood() {
  const gpr = 604800;           // 24 units x $2,100 x 12
  const otherIncome = 28800;    // laundry $1,200/mo + parking $1,200/mo
  const vacancy = -gpr * 0.038; // 3.8% vacancy
  const egi = gpr + otherIncome + vacancy;

  const taxes = 44400;
  const insurance = 19200;
  const utilities = 13200;       // common area only
  const maintenance = 26400;
  const mgmt = egi * 0.05;       // 5% of EGI
  const landscaping = 9600;
  const administrative = 4800;
  const payroll = 42000;         // part-time maintenance + leasing
  const reserves = 14400;        // $600/unit/yr
  const misc = 6000;

  const totalExpenses = taxes + insurance + utilities + maintenance + mgmt + landscaping + administrative + payroll + reserves + misc;
  const noi = egi - totalExpenses;

  const sections = [
    {
      label: 'Revenue',
      rows: [
        { label: 'Gross Potential Rent', monthly: spreadEvenly(gpr, 0.03) },
        { label: 'Other Income (Laundry & Parking)', monthly: spreadEvenly(otherIncome, 0.05) },
        { label: 'Vacancy Loss', monthly: spreadEvenly(vacancy, 0.12) },
        { label: 'Effective Gross Income', monthly: spreadEvenly(egi, 0.03), isSubtotal: true },
      ],
    },
    {
      label: 'Operating Expenses',
      rows: [
        { label: 'Real Estate Taxes', monthly: spreadEvenly(taxes) },
        { label: 'Property Insurance', monthly: spreadEvenly(insurance) },
        { label: 'Utilities (Common Area)', monthly: spreadWithSpike(utilities, 6, 1.6) },
        { label: 'Maintenance & Repairs', monthly: spreadEvenly(maintenance, 0.18) },
        { label: 'Management Fee (5%)', monthly: spreadEvenly(mgmt) },
        { label: 'Landscaping', monthly: spreadEvenly(landscaping, 0.25) },
        { label: 'Administrative', monthly: spreadEvenly(administrative) },
        { label: 'Payroll', monthly: spreadEvenly(payroll) },
        { label: 'Replacement Reserves', monthly: spreadEvenly(reserves) },
        { label: 'Miscellaneous', monthly: spreadEvenly(misc) },
        { label: 'Total Operating Expenses', monthly: spreadEvenly(totalExpenses, 0.05), isSubtotal: true },
      ],
    },
    {
      label: 'Net Operating Income',
      rows: [
        { label: 'Net Operating Income', monthly: spreadEvenly(noi, 0.04), isSubtotal: true },
      ],
    },
  ];

  const data = buildSheet(
    'Oakwood Apartment Complex',
    '2847 Oakwood Drive, Austin, TX 78748',
    'Jan 2024 - Dec 2024',
    sections
  );

  console.log(`Oakwood NOI: $${Math.round(noi).toLocaleString()} | EGI: $${Math.round(egi).toLocaleString()} | OER: ${(totalExpenses/egi*100).toFixed(1)}%`);
  return data;
}

// ─── CASE 2: Birchwood Commons (Conditional) ─────────────────────────────────
// 12 units @ $1,450/mo = $208,800 GPR
// 11% vacancy (above average, leasing issue)
// OER ~61%, NOI ~$71K
// Tight but workable depending on price/financing

function generateBirchwood() {
  const gpr = 208800;              // 12 x $1,450 x 12
  const otherIncome = 7200;        // laundry only
  const vacancy = -gpr * 0.108;    // 10.8% vacancy
  const concessions = -6400;       // had to offer 1 month free on 4 units
  const badDebt = -4200;
  const egi = gpr + otherIncome + vacancy + concessions + badDebt;

  const taxes = 24000;
  const insurance = 11400;
  const utilities = 13200;          // tenant pays most
  const maintenance = 18000;        // some deferred maintenance but manageable
  const mgmt = egi * 0.08;          // 8% (above market, struggling manager)
  const landscaping = 4800;
  const administrative = 3600;
  const payroll = 10800;
  const reserves = 7200;
  const legal = 4200;               // a few evictions
  const misc = 3600;

  const totalExpenses = taxes + insurance + utilities + maintenance + mgmt + landscaping + administrative + payroll + reserves + legal + misc;
  const noi = egi - totalExpenses;

  const sections = [
    {
      label: 'Revenue',
      rows: [
        { label: 'Gross Potential Rent', monthly: spreadEvenly(gpr, 0.04) },
        { label: 'Laundry Income', monthly: spreadEvenly(otherIncome, 0.08) },
        { label: 'Vacancy Loss', monthly: spreadEvenly(vacancy, 0.20) },
        { label: 'Concessions', monthly: spreadEvenly(concessions, 0.40) },
        { label: 'Bad Debt', monthly: spreadEvenly(badDebt, 0.30) },
        { label: 'Effective Gross Income', monthly: spreadEvenly(egi, 0.06), isSubtotal: true },
      ],
    },
    {
      label: 'Operating Expenses',
      rows: [
        { label: 'Real Estate Taxes', monthly: spreadEvenly(taxes) },
        { label: 'Property Insurance', monthly: spreadEvenly(insurance) },
        { label: 'Utilities', monthly: spreadWithSpike(utilities, 1, 1.8, 0.10) },
        { label: 'Maintenance & Repairs', monthly: spreadEvenly(maintenance, 0.25) },
        { label: 'Management Fee (8%)', monthly: spreadEvenly(mgmt) },
        { label: 'Landscaping', monthly: spreadEvenly(landscaping, 0.20) },
        { label: 'Administrative & Office', monthly: spreadEvenly(administrative) },
        { label: 'Payroll', monthly: spreadEvenly(payroll) },
        { label: 'Legal & Eviction Costs', monthly: spreadEvenly(legal, 0.50) },
        { label: 'Replacement Reserves', monthly: spreadEvenly(reserves) },
        { label: 'Miscellaneous', monthly: spreadEvenly(misc, 0.30) },
        { label: 'Total Operating Expenses', monthly: spreadEvenly(totalExpenses, 0.07), isSubtotal: true },
      ],
    },
    {
      label: 'Net Operating Income',
      rows: [
        { label: 'Net Operating Income', monthly: spreadEvenly(noi, 0.10), isSubtotal: true },
      ],
    },
  ];

  const data = buildSheet(
    'Birchwood Commons',
    '415 Birchwood Lane, Memphis, TN 38103',
    'Jan 2024 - Dec 2024',
    sections
  );

  console.log(`Birchwood NOI: $${Math.round(noi).toLocaleString()} | EGI: $${Math.round(egi).toLocaleString()} | OER: ${(totalExpenses/egi*100).toFixed(1)}%`);
  return data;
}

// ─── CASE 3: Westgate Commercial Strip (Avoid) ────────────────────────────────
// 8 commercial units, 3 vacant
// 26% vacancy, owner-pays-all-utilities, expenses exceed income
// NOI is negative - textbook avoid

function generateWestgate() {
  const gpr = 264000;              // 8 units avg $2,750/mo if fully occupied
  const otherIncome = 4800;        // vending machine
  const vacancy = -gpr * 0.258;    // 25.8% vacancy (2+ units dark)
  const badDebt = -9600;           // one tenant behind 8 months
  const concessions = -12000;      // offered 4 months free to new tenant
  const egi = gpr + otherIncome + vacancy + badDebt + concessions;

  const taxes = 52800;             // commercial taxes are steep
  const insurance = 28800;
  const utilities = 48000;         // owner pays ALL utilities for commercial
  const maintenance = 52000;       // older building, HVAC issues, roof patches
  const mgmt = egi * 0.09;
  const landscaping = 14400;
  const janitorial = 19200;
  const administrative = 10800;
  const legal = 18000;             // lease negotiations, evictions
  const reserves = 24000;          // needs new roof soon
  const misc = 21600;

  const totalExpenses = taxes + insurance + utilities + maintenance + mgmt + landscaping + janitorial + administrative + legal + reserves + misc;
  const noi = egi - totalExpenses;

  const sections = [
    {
      label: 'Revenue',
      rows: [
        { label: 'Gross Potential Rent', monthly: spreadEvenly(gpr, 0.02) },
        { label: 'Other Income (Vending)', monthly: spreadEvenly(otherIncome, 0.10) },
        { label: 'Vacancy Loss', monthly: spreadEvenly(vacancy, 0.15) },
        { label: 'Concessions', monthly: spreadEvenly(concessions, 0.60) },
        { label: 'Bad Debt', monthly: spreadEvenly(badDebt, 0.40) },
        { label: 'Effective Gross Income', monthly: spreadEvenly(egi, 0.08), isSubtotal: true },
      ],
    },
    {
      label: 'Operating Expenses',
      rows: [
        { label: 'Real Estate Taxes', monthly: spreadEvenly(taxes) },
        { label: 'Property & Liability Insurance', monthly: spreadEvenly(insurance) },
        { label: 'Utilities (Electric, Gas, Water)', monthly: spreadWithSpike(utilities, 7, 2.1, 0.12) },
        { label: 'Maintenance & Repairs', monthly: spreadEvenly(maintenance, 0.30) },
        { label: 'Management Fee (9%)', monthly: spreadEvenly(mgmt) },
        { label: 'Landscaping', monthly: spreadEvenly(landscaping, 0.15) },
        { label: 'Janitorial Services', monthly: spreadEvenly(janitorial) },
        { label: 'Administrative & Office', monthly: spreadEvenly(administrative) },
        { label: 'Legal & Professional Fees', monthly: spreadEvenly(legal, 0.50) },
        { label: 'Replacement Reserves', monthly: spreadEvenly(reserves) },
        { label: 'Miscellaneous', monthly: spreadEvenly(misc, 0.25) },
        { label: 'Total Operating Expenses', monthly: spreadEvenly(totalExpenses, 0.06), isSubtotal: true },
      ],
    },
    {
      label: 'Net Operating Income',
      rows: [
        { label: 'Net Operating Income (Loss)', monthly: spreadEvenly(noi, 0.15), isSubtotal: true },
      ],
    },
  ];

  const data = buildSheet(
    'Westgate Commercial Strip',
    '1120 Westgate Boulevard, Detroit, MI 48201',
    'Jan 2024 - Dec 2024',
    sections
  );

  console.log(`Westgate NOI: $${Math.round(noi).toLocaleString()} | EGI: $${Math.round(egi).toLocaleString()} | OER: ${(totalExpenses/egi*100).toFixed(1)}%`);
  return data;
}

// ─── Write files ──────────────────────────────────────────────────────────────
const cases = [
  { name: 'oakwood-apartments-strong-buy.xlsx', data: generateOakwood() },
  { name: 'birchwood-commons-conditional.xlsx', data: generateBirchwood() },
  { name: 'westgate-commercial-avoid.xlsx',     data: generateWestgate() },
];

for (const { name, data } of cases) {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(data);

  // Auto-width columns
  const colWidths = data.reduce((acc, row) => {
    row.forEach((cell, i) => {
      const len = cell != null ? String(cell).length : 0;
      acc[i] = Math.max(acc[i] || 0, len);
    });
    return acc;
  }, []);
  ws['!cols'] = colWidths.map(w => ({ wch: Math.min(w + 2, 30) }));

  XLSX.utils.book_append_sheet(wb, ws, 'T12 Statement');
  const outPath = path.join(OUT_DIR, name);
  XLSX.writeFile(wb, outPath);
  console.log(`  Written: ${outPath}`);
}

console.log('\nDone. Upload these to Estatelytics to test deal underwriting.');
