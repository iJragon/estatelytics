/**
 * Verifies expected deal scores for all 3 test cases using the same math
 * as lib/analysis/deal-engine.ts and lib/analysis/deal-score.ts.
 *
 * Run: node scripts/verify-deal-scores.mjs
 */

// ── Mortgage math ────────────────────────────────────────────────────────────

function monthlyPayment(principal, annualRate, amortYears) {
  if (annualRate === 0) return principal / (amortYears * 12);
  const r = annualRate / 12;
  const n = amortYears * 12;
  return (principal * r) / (1 - Math.pow(1 + r, -n));
}

function remainingBalance(principal, annualRate, amortYears, yearsPaid) {
  if (annualRate === 0) return principal - (principal / (amortYears * 12)) * yearsPaid * 12;
  const r = annualRate / 12;
  const n = amortYears * 12;
  const p = yearsPaid * 12;
  return principal * (Math.pow(1 + r, n) - Math.pow(1 + r, p)) / (Math.pow(1 + r, n) - 1);
}

// ── Time value ───────────────────────────────────────────────────────────────

function npv(cashFlows, discountRate) {
  return cashFlows.reduce((acc, cf, i) => acc + cf / Math.pow(1 + discountRate, i + 1), 0);
}

function irr(cashFlows) {
  let lo = -0.9, hi = 10.0;
  const npvAt = (r) => cashFlows.reduce((acc, cf, i) => acc + cf / Math.pow(1 + r, i + 1), 0);
  if (npvAt(lo) * npvAt(hi) > 0) return 0;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (npvAt(mid) > 0) lo = mid; else hi = mid;
    if (hi - lo < 1e-8) break;
  }
  return (lo + hi) / 2;
}

// ── Pro forma & metrics ──────────────────────────────────────────────────────

function buildProForma(inputs) {
  const { purchasePrice, downPayment, interestRate, amortizationYears,
    grossScheduledIncome, otherIncome, expenses, vacancyRate,
    rentGrowthRate, expenseGrowthRate, holdPeriod, taxBracket,
    landValueRate, depreciationYears, exitCapRate, closingCostRate, capexBudget } = inputs;

  const loanAmount = purchasePrice - downPayment;
  const payment = monthlyPayment(loanAmount, interestRate, amortizationYears);
  const annualDebtService = payment * 12;
  const depreciableBase = purchasePrice * (1 - landValueRate);
  const annualDepreciation = depreciableBase / depreciationYears;
  const totalExpenses = Object.values(expenses).reduce((a, b) => a + b, 0);
  const rows = [];

  for (let yr = 1; yr <= holdPeriod; yr++) {
    const gm = Math.pow(1 + rentGrowthRate, yr - 1);
    const em = Math.pow(1 + expenseGrowthRate, yr - 1);
    const gsi = grossScheduledIncome * gm;
    const vacancyLoss = gsi * vacancyRate;
    const egi = gsi - vacancyLoss;
    const otherInc = otherIncome * gm;
    const totalIncome = egi + otherInc;
    const opex = totalExpenses * em;
    const noi = totalIncome - opex;
    const startBal = yr === 1 ? loanAmount : remainingBalance(loanAmount, interestRate, amortizationYears, yr - 1);
    const endBal = remainingBalance(loanAmount, interestRate, amortizationYears, yr);
    const principalPaydown = startBal - endBal;
    const interestPayment = annualDebtService - principalPaydown;
    const cfbt = noi - annualDebtService;
    const taxableIncome = cfbt - annualDepreciation + principalPaydown;
    const taxLiability = taxableIncome * taxBracket;
    const afterTaxCF = cfbt - taxLiability;
    const propertyValue = noi / exitCapRate;
    const closingCosts = purchasePrice * closingCostRate;
    const totalCashInvested = downPayment + closingCosts + capexBudget;
    const equity = propertyValue - endBal;
    rows.push({ year: yr, gsi, vacancyLoss, egi, otherIncome: otherInc, totalIncome,
      operatingExpenses: opex, noi, debtService: annualDebtService, cashFlowBeforeTax: cfbt,
      principalPaydown, interestPayment, remainingLoanBalance: endBal, depreciation: annualDepreciation,
      taxableIncome, taxLiability, afterTaxCashFlow: afterTaxCF, propertyValue, equity,
      cashOnCash: totalCashInvested > 0 ? cfbt / totalCashInvested : 0,
    });
  }
  return rows;
}

function calculateMetrics(inputs, proForma, profile) {
  const { purchasePrice, downPayment, closingCostRate, capexBudget, interestRate,
    amortizationYears, loanTermYears, grossScheduledIncome, otherIncome, expenses,
    vacancyRate, exitCapRate, holdPeriod, sellingCostRate, taxBracket,
    landValueRate, depreciationYears } = inputs;

  const closingCosts = purchasePrice * closingCostRate;
  const loanAmount = purchasePrice - downPayment;
  const totalCashInvested = downPayment + closingCosts + capexBudget;
  const payment = monthlyPayment(loanAmount, interestRate, amortizationYears);
  const annualDebtService = payment * 12;
  const ltv = purchasePrice > 0 ? loanAmount / purchasePrice : 0;
  const yr1 = proForma[0];
  const egi = yr1.egi;
  const totalOpex = yr1.operatingExpenses;
  const noi = yr1.noi;
  const oer = egi > 0 ? totalOpex / egi : 0;
  const capRate = purchasePrice > 0 ? noi / purchasePrice : 0;
  const cfbt = yr1.cashFlowBeforeTax;
  const cashOnCash = totalCashInvested > 0 ? cfbt / totalCashInvested : 0;
  const dscr = annualDebtService > 0 ? noi / annualDebtService : 0;
  const potentialGross = grossScheduledIncome + otherIncome;
  const breakEvenOccupancy = potentialGross > 0 ? (annualDebtService + totalOpex) / potentialGross : 0;
  const annualDepreciation = (purchasePrice * (1 - landValueRate)) / depreciationYears;
  const exitYear = proForma[holdPeriod - 1];
  const projectedSalePrice = exitYear.noi / exitCapRate;
  const sellingCosts = projectedSalePrice * sellingCostRate;
  const remainingLoanBal = remainingBalance(loanAmount, interestRate, amortizationYears, Math.min(holdPeriod, loanTermYears));
  const reversion = projectedSalePrice - sellingCosts - remainingLoanBal;
  const discountRate = profile.targetIRR;
  const equityCashFlows = [
    -totalCashInvested,
    ...proForma.slice(0, holdPeriod - 1).map(y => y.afterTaxCashFlow),
    (proForma[holdPeriod - 1]?.afterTaxCashFlow ?? 0) + reversion,
  ];
  const dealNPV = npv(equityCashFlows.slice(1), discountRate) - totalCashInvested;
  const dealIRR = irr(equityCashFlows);
  const profitabilityIndex = totalCashInvested > 0 ? (dealNPV + totalCashInvested) / totalCashInvested : 0;
  const totalCashFlow = proForma.reduce((a, y) => a + y.cashFlowBeforeTax, 0);
  const totalAppreciation = projectedSalePrice - purchasePrice;
  const totalAmortization = loanAmount - remainingLoanBal;
  const totalTaxBenefit = proForma.reduce((a, y) => a + Math.max(0, -y.taxableIncome) * taxBracket, 0);
  const overallReturn = totalCashInvested > 0
    ? (totalCashFlow + totalAppreciation + totalAmortization + totalTaxBenefit) / totalCashInvested : 0;

  return { noi, oer, capRate, ltv, cashOnCash, dscr, breakEvenOccupancy,
    irr: dealIRR, npv: dealNPV, profitabilityIndex, totalCashInvested,
    totalCashFlow, totalAppreciation, totalAmortization, overallReturn,
    annualDebtService, cfbt, annualDepreciation };
}

// ── Scoring (mirrors deal-score.ts exactly) ──────────────────────────────────

function clamp(val, lo, hi) { return Math.max(lo, Math.min(hi, val)); }
function scoreLinear(value, bad, good) {
  if (bad === good) return value >= good ? 25 : 0;
  return clamp(((value - bad) / (good - bad)) * 25, 0, 25);
}

function scoreDeal(m, profile) {
  if (m.totalCashInvested === 0) return { total: 0, verdict: 'strong-avoid' };

  const cocScore = scoreLinear(m.cashOnCash, 0, profile.targetCashOnCash);
  const dscrScore = scoreLinear(m.dscr, 1.0, 1.35);
  const cf = clamp(cocScore * 0.6 + dscrScore * 0.4, 0, 25);

  const irrScore = scoreLinear(m.irr, 0.05, profile.targetIRR);
  const npvScore = m.npv > 0 ? scoreLinear(m.npv / Math.max(m.totalCashInvested, 1), 0, 0.4) : 0;
  const ret = clamp(irrScore * 0.6 + npvScore * 0.4, 0, 25);

  const beoScore = scoreLinear(1 - m.breakEvenOccupancy, 0, 0.35);
  const ltvScore = scoreLinear(1 - m.ltv, 0, 0.35);
  const safety = clamp(dscrScore * 0.5 + beoScore * 0.3 + ltvScore * 0.2, 0, 25);

  const appreciationScore = scoreLinear(m.totalAppreciation / Math.max(m.totalCashInvested, 1), 0, 1.5);
  const overallScore = scoreLinear(m.overallReturn, 0, 2.0);
  const piScore = scoreLinear(m.profitabilityIndex, 1.0, 1.8);
  const growth = clamp(appreciationScore * 0.4 + overallScore * 0.4 + piScore * 0.2, 0, 25);

  const total = Math.round(cf + ret + safety + growth);
  const verdict = total >= 80 ? 'strong-buy' : total >= 65 ? 'buy'
    : total >= 50 ? 'conditional' : total >= 35 ? 'avoid' : 'strong-avoid';

  return {
    cashFlowScore: Math.round(cf),
    returnScore: Math.round(ret),
    safetyScore: Math.round(safety),
    growthScore: Math.round(growth),
    total,
    verdict,
    _debug: {
      cocScore: cocScore.toFixed(1), dscrScore: dscrScore.toFixed(1),
      irrScore: irrScore.toFixed(1), npvScore: npvScore.toFixed(1),
      beoScore: beoScore.toFixed(1), ltvScore: ltvScore.toFixed(1),
      appreciationScore: appreciationScore.toFixed(1),
      overallScore: overallScore.toFixed(1), piScore: piScore.toFixed(1),
    },
  };
}

// ── Default profile ──────────────────────────────────────────────────────────

const DEFAULT_PROFILE = {
  taxBracket: 0.24,
  targetCashOnCash: 0.08,
  targetIRR: 0.12,
  riskTolerance: 'moderate',
  holdPeriod: 10,
};

// ── Deal definitions ─────────────────────────────────────────────────────────

const DEALS = [
  {
    name: 'Oakwood Apartments (Strong Buy target)',
    inputs: {
      propertyType: 'residential',
      purchasePrice: 5_200_000,
      downPayment: 1_300_000,       // 25%
      closingCostRate: 0.03,
      capexBudget: 0,
      interestRate: 0.0675,
      amortizationYears: 30,
      loanTermYears: 30,
      grossScheduledIncome: 604_800,
      otherIncome: 28_800,
      vacancyRate: 0.038,
      expenses: {
        propertyTaxes:  44_400,
        insurance:      19_200,
        utilities:      13_200,
        maintenance:    26_400,
        managementFee:  30_531,  // 5% of EGI
        landscaping:     9_600,
        janitorial:          0,
        marketing:           0,
        administrative:  4_800,
        payroll:        42_000,
        reserves:       14_400,
        miscellaneous:   6_000,
      },
      rentGrowthRate:    0.03,
      expenseGrowthRate: 0.02,
      exitCapRate:       0.065,
      holdPeriod:        10,
      sellingCostRate:   0.06,
      taxBracket:        0.24,
      landValueRate:     0.20,
      depreciationYears: 27.5,
    },
  },
  {
    name: 'Birchwood Commons (Conditional target) — NEW data, $850K purchase',
    inputs: {
      propertyType: 'residential',
      purchasePrice: 850_000,
      downPayment: 212_500,         // 25%
      closingCostRate: 0.03,
      capexBudget: 0,
      interestRate: 0.0725,
      amortizationYears: 30,
      loanTermYears: 30,
      grossScheduledIncome: 208_800,
      otherIncome: 7_200,
      vacancyRate: 0.12,             // 10.8% physical + concessions/bad debt buffer
      expenses: {
        propertyTaxes:  24_000,
        insurance:      11_400,
        utilities:      13_200,
        maintenance:    18_000,
        managementFee:  14_628,  // 8% of EGI (per script)
        landscaping:     4_800,
        janitorial:          0,
        marketing:           0,
        administrative:  7_800,  // admin $3,600 + legal $4,200
        payroll:        10_800,
        reserves:        7_200,
        miscellaneous:   3_600,
      },
      rentGrowthRate:    0.02,
      expenseGrowthRate: 0.03,
      exitCapRate:       0.09,
      holdPeriod:         5,
      sellingCostRate:   0.06,
      taxBracket:        0.24,
      landValueRate:     0.20,
      depreciationYears: 27.5,
    },
  },
  {
    name: 'Westgate Commercial (Avoid target)',
    inputs: {
      propertyType: 'commercial',
      purchasePrice: 2_000_000,   // reasonable for the NOI profile
      downPayment: 600_000,       // 30%
      closingCostRate: 0.03,
      capexBudget: 0,
      interestRate: 0.0750,
      amortizationYears: 25,
      loanTermYears: 10,
      grossScheduledIncome: 264_000,
      otherIncome: 4_800,
      vacancyRate: 0.258,
      expenses: {
        propertyTaxes:  52_800,
        insurance:      28_800,
        utilities:      48_000,
        maintenance:    52_000,
        managementFee:  17_400, // ~9% of EGI (~$193K)
        landscaping:    14_400,
        janitorial:     19_200,
        marketing:           0,
        administrative: 10_800,
        payroll:             0,
        reserves:       24_000,
        miscellaneous:  39_600, // legal $18K + misc $21.6K
      },
      rentGrowthRate:    0.01,
      expenseGrowthRate: 0.04,
      exitCapRate:       0.10,
      holdPeriod:         5,
      sellingCostRate:   0.06,
      taxBracket:        0.24,
      landValueRate:     0.30,   // commercial: higher land %
      depreciationYears: 39,
    },
  },
];

// ── Run ──────────────────────────────────────────────────────────────────────

console.log('='.repeat(70));
console.log('DEAL SCORE VERIFICATION  (default investor profile: 8% CoC / 12% IRR)');
console.log('='.repeat(70));

for (const deal of DEALS) {
  const pf = buildProForma(deal.inputs);
  const m = calculateMetrics(deal.inputs, pf, DEFAULT_PROFILE);
  const score = scoreDeal(m, DEFAULT_PROFILE);

  const totalOpex = Object.values(deal.inputs.expenses).reduce((a, b) => a + b, 0);

  console.log('\n' + '─'.repeat(70));
  console.log(`DEAL: ${deal.name}`);
  console.log('─'.repeat(70));
  console.log(`  NOI (Year 1):        $${Math.round(m.noi).toLocaleString()}`);
  console.log(`  OER (Year 1):        ${(m.oer * 100).toFixed(1)}%`);
  console.log(`  Cap Rate:            ${(m.capRate * 100).toFixed(2)}%`);
  console.log(`  Annual Debt Service: $${Math.round(m.annualDebtService).toLocaleString()}`);
  console.log(`  DSCR:                ${m.dscr.toFixed(3)}`);
  console.log(`  CoC (Year 1):        ${(m.cashOnCash * 100).toFixed(2)}%`);
  console.log(`  CFBT (Year 1):       $${Math.round(m.cfbt).toLocaleString()}`);
  console.log(`  LTV:                 ${(m.ltv * 100).toFixed(1)}%`);
  console.log(`  BEO:                 ${(m.breakEvenOccupancy * 100).toFixed(1)}%`);
  console.log(`  IRR:                 ${(m.irr * 100).toFixed(2)}%`);
  console.log(`  NPV:                 $${Math.round(m.npv).toLocaleString()}`);
  console.log(`  Profitability Index: ${m.profitabilityIndex.toFixed(3)}`);
  console.log(`  Total Cash Invested: $${Math.round(m.totalCashInvested).toLocaleString()}`);
  console.log('');
  console.log(`  ► SCORE:  ${score.total}/100  (${score.verdict.toUpperCase()})`);
  console.log(`    cashFlow=${score.cashFlowScore}  return=${score.returnScore}  safety=${score.safetyScore}  growth=${score.growthScore}`);
  console.log(`    debug → CoC:${score._debug.cocScore} DSCR:${score._debug.dscrScore} IRR:${score._debug.irrScore} NPV:${score._debug.npvScore} BEO:${score._debug.beoScore} LTV:${score._debug.ltvScore} Appr:${score._debug.appreciationScore} Overall:${score._debug.overallScore} PI:${score._debug.piScore}`);
}

console.log('\n' + '='.repeat(70));
console.log('NOTE: If the app shows different scores, the inputs entered in the');
console.log('      app likely differ from the values above. Check the deal\'s');
console.log('      Income and Expenses tabs to compare.');
console.log('='.repeat(70));
