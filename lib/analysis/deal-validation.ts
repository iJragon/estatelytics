import type { DealInputs, ValidationWarning } from '../models/deal';

export function validateDealInputs(inputs: DealInputs): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];

  // ── Property step ──────────────────────────────────────────────────────────
  if (inputs.purchasePrice === 0) {
    warnings.push({
      field: 'purchasePrice',
      level: 'error',
      message: 'Purchase price is required',
      step: 'property',
    });
  }

  // ── Financing step ─────────────────────────────────────────────────────────
  if (inputs.downPayment === 0) {
    warnings.push({
      field: 'downPayment',
      level: 'error',
      message: 'Down payment is required',
      step: 'financing',
    });
  }

  if (inputs.purchasePrice > 0 && inputs.downPayment >= inputs.purchasePrice) {
    warnings.push({
      field: 'downPayment',
      level: 'error',
      message: 'Down payment cannot exceed purchase price',
      step: 'financing',
    });
  }

  if (inputs.interestRate > 0.15) {
    warnings.push({
      field: 'interestRate',
      level: 'warn',
      message: 'Interest rate above 15% — double-check',
      step: 'financing',
    });
  }

  if (inputs.interestRate > 0 && inputs.interestRate < 0.03) {
    warnings.push({
      field: 'interestRate',
      level: 'warn',
      message: 'Interest rate below 3% — double-check',
      step: 'financing',
    });
  }

  if (inputs.purchasePrice > 0 && inputs.downPayment > 0 &&
      inputs.downPayment / inputs.purchasePrice < 0.10) {
    warnings.push({
      field: 'downPayment',
      level: 'warn',
      message: 'Less than 10% down — verify financing is available',
      step: 'financing',
    });
  }

  if (inputs.loanTermYears > inputs.amortizationYears) {
    warnings.push({
      field: 'loanTermYears',
      level: 'error',
      message: 'Loan term cannot exceed amortization period',
      step: 'financing',
    });
  }

  // ── Income step ────────────────────────────────────────────────────────────
  if (inputs.grossScheduledIncome === 0) {
    warnings.push({
      field: 'grossScheduledIncome',
      level: 'error',
      message: 'Gross scheduled income is required',
      step: 'income',
    });
  }

  // ── Expenses step ──────────────────────────────────────────────────────────
  if (inputs.grossScheduledIncome > 0) {
    const totalExpenses = Object.values(inputs.expenses).reduce((a, b) => a + b, 0);
    if (totalExpenses > inputs.grossScheduledIncome * 0.8) {
      warnings.push({
        field: 'expenses',
        level: 'warn',
        message: 'Operating expenses exceed 80% of GSI — verify figures',
        step: 'expenses',
      });
    }
  }

  // ── Assumptions step ───────────────────────────────────────────────────────
  if (inputs.vacancyRate > 0.20) {
    warnings.push({
      field: 'vacancyRate',
      level: 'warn',
      message: 'Vacancy above 20% is unusually high',
      step: 'assumptions',
    });
  }

  if (inputs.vacancyRate === 0) {
    warnings.push({
      field: 'vacancyRate',
      level: 'warn',
      message: '0% vacancy is optimistic — consider at least 3-5%',
      step: 'assumptions',
    });
  }

  if (inputs.exitCapRate < 0.03) {
    warnings.push({
      field: 'exitCapRate',
      level: 'warn',
      message: 'Exit cap rate below 3% is very aggressive',
      step: 'assumptions',
    });
  }

  if (inputs.exitCapRate > 0.12) {
    warnings.push({
      field: 'exitCapRate',
      level: 'warn',
      message: 'Exit cap rate above 12% implies significant distress',
      step: 'assumptions',
    });
  }

  if (inputs.rentGrowthRate > 0.07) {
    warnings.push({
      field: 'rentGrowthRate',
      level: 'warn',
      message: 'Rent growth above 7%/yr is aggressive',
      step: 'assumptions',
    });
  }

  return warnings;
}
