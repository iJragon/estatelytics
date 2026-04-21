import { getGroqClient, DEFAULT_MODEL } from './base';
import type { DealInputs, DealMetrics, ScoreBreakdown, ProFormaYear } from '../models/deal';
import { formatDollar } from '../utils/format';

function pct(n: number): string {
  return `${(n * 100).toFixed(2)}%`;
}

function dollar(n: number): string {
  return formatDollar(n);
}

function buildDealContext(
  inputs: DealInputs,
  metrics: DealMetrics,
  score: ScoreBreakdown,
  proForma: ProFormaYear[],
): string {
  const lines: string[] = [];

  lines.push('=== DEAL UNDERWRITING SUMMARY ===');
  lines.push(`Property Type: ${inputs.propertyType}`);
  lines.push(`Purchase Price: ${dollar(inputs.purchasePrice)}`);
  lines.push(`Down Payment: ${dollar(inputs.downPayment)} (${pct(inputs.downPayment / inputs.purchasePrice)} of price)`);
  lines.push(`Hold Period: ${inputs.holdPeriod} years`);
  lines.push('');

  lines.push('── INCOME & EXPENSES (Year 1) ──');
  lines.push(`Gross Scheduled Income: ${dollar(metrics.grossScheduledIncome)}`);
  lines.push(`Vacancy Loss (${pct(inputs.vacancyRate)}): ${dollar(metrics.vacancyLoss)}`);
  lines.push(`Effective Gross Income: ${dollar(metrics.effectiveGrossIncome)}`);
  lines.push(`Total Operating Expenses: ${dollar(metrics.totalOperatingExpenses)}`);
  lines.push(`Net Operating Income: ${dollar(metrics.noi)}`);
  lines.push(`Operating Expense Ratio: ${pct(metrics.operatingExpenseRatio)}`);
  lines.push('');

  lines.push('── VALUATION ──');
  lines.push(`Cap Rate: ${pct(metrics.capRate)}`);
  lines.push(`Gross Rent Multiplier: ${metrics.grm.toFixed(2)}x`);
  lines.push(`Loan Amount: ${dollar(metrics.loanAmount)} (LTV: ${pct(metrics.ltv)})`);
  lines.push(`Max Supportable Loan (1.25x DSCR): ${dollar(metrics.maxLoanAmount)}`);
  lines.push('');

  lines.push('── CASH FLOW ──');
  lines.push(`Annual Debt Service: ${dollar(metrics.annualDebtService)}`);
  lines.push(`Cash Flow Before Tax: ${dollar(metrics.cashFlowBeforeTax)}`);
  lines.push(`Cash-on-Cash Return: ${pct(metrics.cashOnCash)}`);
  lines.push(`DSCR: ${metrics.dscr.toFixed(2)}x`);
  lines.push(`Break-Even Occupancy: ${pct(metrics.breakEvenOccupancy)}`);
  lines.push('');

  lines.push('── TIME VALUE & RETURNS ──');
  lines.push(`IRR: ${pct(metrics.irr)}`);
  lines.push(`MIRR: ${pct(metrics.mirr)}`);
  lines.push(`NPV (at ${pct(inputs.exitCapRate)} discount): ${dollar(metrics.npv)}`);
  lines.push(`Profitability Index: ${metrics.profitabilityIndex.toFixed(2)}`);
  lines.push(`Payback Period: ${metrics.paybackPeriod} year(s)`);
  lines.push(`DCF Value: ${dollar(metrics.dcfValue)}`);
  lines.push('');

  lines.push('── EXIT ANALYSIS ──');
  lines.push(`Projected Sale Price: ${dollar(metrics.projectedSalePrice)}`);
  lines.push(`Selling Costs: ${dollar(metrics.sellingCosts)}`);
  lines.push(`Remaining Loan Balance: ${dollar(metrics.remainingLoanBalance)}`);
  lines.push(`Net Reversion (Equity from Sale): ${dollar(metrics.reversion)}`);
  lines.push(`Long-Term Capital Gain: ${dollar(metrics.longTermCapitalGain)}`);
  lines.push('');

  lines.push('── FOUR RETURNS (Total over Hold Period) ──');
  lines.push(`1. Total Cash Flow: ${dollar(metrics.totalCashFlow)}`);
  lines.push(`2. Total Appreciation: ${dollar(metrics.totalAppreciation)}`);
  lines.push(`3. Total Loan Amortization: ${dollar(metrics.totalAmortization)}`);
  lines.push(`4. Total Tax Benefit: ${dollar(metrics.totalTaxBenefit)}`);
  lines.push(`Overall Return on Investment: ${pct(metrics.overallReturn)}`);
  lines.push('');

  lines.push('── DEAL SCORE ──');
  lines.push(`Total Score: ${score.total}/100 — Verdict: ${score.verdict.toUpperCase().replace('-', ' ')}`);
  lines.push(`  Cash Flow Score: ${score.cashFlowScore}/25`);
  lines.push(`  Return Score: ${score.returnScore}/25`);
  lines.push(`  Safety Score: ${score.safetyScore}/25`);
  lines.push(`  Growth Score: ${score.growthScore}/25`);
  lines.push('');

  const lastYear = proForma[proForma.length - 1];
  if (lastYear) {
    lines.push(`── YEAR ${lastYear.year} PRO FORMA ──`);
    lines.push(`  NOI: ${dollar(lastYear.noi)}`);
    lines.push(`  Cash Flow Before Tax: ${dollar(lastYear.cashFlowBeforeTax)}`);
    lines.push(`  Property Value (implied): ${dollar(lastYear.propertyValue)}`);
    lines.push(`  Equity: ${dollar(lastYear.equity)}`);
  }

  return lines.join('\n');
}

export async function streamDealNarrative(
  inputs: DealInputs,
  metrics: DealMetrics,
  score: ScoreBreakdown,
  proForma: ProFormaYear[],
  onChunk: (chunk: string) => void,
): Promise<string> {
  const groq = getGroqClient();
  const context = buildDealContext(inputs, metrics, score, proForma);

  const systemPrompt = `You are an expert real estate underwriter and investment analyst.
You analyze pre-acquisition deal metrics and provide clear, actionable investment recommendations.
Your analysis should be honest, data-driven, and highlight both opportunities and risks.
Write in a professional but conversational tone. Avoid jargon without explanation.
Do NOT use em dashes (--) or en dashes. Use commas, colons, or periods instead.
Structure your response with clear sections and bullet points where appropriate.`;

  const userPrompt = `Based on the following deal underwriting data, provide a comprehensive investment analysis and recommendation.

${context}

Your analysis MUST include:
1. **Executive Summary** (2-3 sentences: verdict and key reason)
2. **Strengths** (bullet list of what makes this deal attractive)
3. **Risks & Concerns** (bullet list of red flags or weaknesses)
4. **Key Metrics Interpretation** (explain cap rate, DSCR, CoC, and IRR in plain language relative to this deal)
5. **Exit Strategy Assessment** (evaluate the projected sale, reversion, and IRR)
6. **Recommendation** (Go / Conditional Go / No-Go, with specific conditions or negotiation targets if applicable)

Keep the tone direct and investment-grade. Be specific about numbers.`;

  const stream = await groq.chat.completions.create({
    model: DEFAULT_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    stream: true,
    temperature: 0.4,
    max_tokens: 1200,
  });

  let full = '';
  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content ?? '';
    if (text) {
      full += text;
      onChunk(text);
    }
  }
  return full;
}
