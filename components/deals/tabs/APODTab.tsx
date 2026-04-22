'use client';

import type { DealMetrics, DealInputs, ProFormaYear } from '@/lib/models/deal';

interface Props {
  metrics: DealMetrics;
  inputs: DealInputs;
  proForma: ProFormaYear[];
}

function fmtDollar(n: number): string {
  if (!isFinite(n)) return '—';
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(3)}M`;
  return `${sign}$${Math.round(abs).toLocaleString()}`;
}

function fmtPct(n: number, decimals = 1): string {
  if (!isFinite(n)) return '—';
  return `${(n * 100).toFixed(decimals)}%`;
}

function fmtX(n: number): string {
  if (!isFinite(n)) return '—';
  return `${n.toFixed(2)}x`;
}

function Row({
  label,
  value,
  pct,
  indent,
  bold,
  shade,
  borderTop,
}: {
  label: string;
  value: string;
  pct?: string;
  indent?: boolean;
  bold?: boolean;
  shade?: boolean;
  borderTop?: boolean;
}) {
  return (
    <tr
      style={{
        backgroundColor: shade ? 'var(--surface)' : undefined,
        borderTop: borderTop ? '2px solid var(--border)' : '1px solid var(--border)',
      }}
    >
      <td
        className="py-2 px-4"
        style={{
          color: indent ? 'var(--muted)' : 'var(--text)',
          fontWeight: bold ? 600 : 400,
          paddingLeft: indent ? '2.25rem' : undefined,
          fontSize: '0.8125rem',
        }}
      >
        {label}
      </td>
      {pct !== undefined ? (
        <>
          <td
            className="py-2 px-4 text-right font-mono"
            style={{ color: 'var(--muted)', fontSize: '0.75rem', width: 80 }}
          >
            {pct}
          </td>
          <td
            className="py-2 px-4 text-right font-mono"
            style={{ color: bold ? 'var(--text)' : 'var(--muted)', fontWeight: bold ? 600 : 400, width: 130, fontSize: '0.8125rem' }}
          >
            {value}
          </td>
        </>
      ) : (
        <td
          colSpan={2}
          className="py-2 px-4 text-right font-mono"
          style={{ color: bold ? 'var(--text)' : 'var(--muted)', fontWeight: bold ? 600 : 400, width: 210, fontSize: '0.8125rem' }}
        >
          {value}
        </td>
      )}
    </tr>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <tr style={{ backgroundColor: 'var(--accent)' }}>
      <td
        colSpan={3}
        className="py-1.5 px-4 text-xs font-semibold uppercase tracking-wider"
        style={{ color: '#fff', letterSpacing: '0.1em' }}
      >
        {label}
      </td>
    </tr>
  );
}

const EXPENSE_LABELS: Record<string, string> = {
  propertyTaxes:  'Property Taxes',
  insurance:      'Insurance',
  utilities:      'Utilities',
  maintenance:    'Maintenance & Repairs',
  managementFee:  'Management Fee',
  landscaping:    'Landscaping',
  janitorial:     'Janitorial',
  marketing:      'Marketing',
  administrative: 'Administrative',
  payroll:        'Payroll',
  reserves:       'Reserves',
  miscellaneous:  'Miscellaneous',
};

export default function APODTab({ metrics: m, inputs, proForma }: Props) {
  const yr1 = proForma[0];
  const vacancyLossPct = m.grossScheduledIncome > 0 ? m.vacancyLoss / m.grossScheduledIncome : 0;
  const egi = m.effectiveGrossIncome;
  const otherIncome = yr1.otherIncome;
  const totalEGI = egi + otherIncome;

  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const propertyType = inputs.propertyType.charAt(0).toUpperCase() + inputs.propertyType.slice(1);

  return (
    <div className="p-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 220px)' }}>
      {/* Report Header */}
      <div
        className="rounded-t-lg px-6 py-4 mb-0"
        style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest opacity-80 mb-1">Annual Property Operating Data</p>
            <p className="text-lg font-bold">APOD Report — Year 1</p>
            <p className="text-xs opacity-70 mt-1">{propertyType} Property · As of {today}</p>
          </div>
          <div className="text-right text-xs opacity-70">
            <p>Purchase Price</p>
            <p className="text-base font-semibold text-white">{fmtDollar(inputs.purchasePrice)}</p>
          </div>
        </div>
      </div>

      <div
        className="rounded-b-lg overflow-hidden mb-4"
        style={{ border: '1px solid var(--border)', borderTop: 'none' }}
      >
        <table className="w-full border-collapse">
          <thead>
            <tr style={{ backgroundColor: 'var(--surface)' }}>
              <th className="py-2 px-4 text-left text-xs font-medium" style={{ color: 'var(--muted)', width: '55%' }}>Line Item</th>
              <th className="py-2 px-4 text-right text-xs font-medium" style={{ color: 'var(--muted)', width: 80 }}>% of EGI</th>
              <th className="py-2 px-4 text-right text-xs font-medium" style={{ color: 'var(--muted)', width: 130 }}>Annual Amount</th>
            </tr>
          </thead>
          <tbody>
            {/* INCOME */}
            <SectionHeader label="Income" />
            <Row
              label="Gross Scheduled Income (GSI)"
              value={fmtDollar(m.grossScheduledIncome)}
              pct=""
              bold
            />
            <Row
              label="Less: Vacancy Loss"
              value={`(${fmtDollar(m.vacancyLoss)})`}
              pct={fmtPct(vacancyLossPct)}
              indent
            />
            <Row
              label="Effective Gross Income (EGI)"
              value={fmtDollar(egi)}
              pct="100.0%"
              bold
              shade
            />
            {otherIncome > 0 && (
              <Row
                label="Other Income"
                value={fmtDollar(otherIncome)}
                pct={totalEGI > 0 ? fmtPct(otherIncome / totalEGI) : ''}
                indent
              />
            )}
            <Row
              label="Total Effective Gross Income"
              value={fmtDollar(totalEGI)}
              pct=""
              bold
              shade
              borderTop
            />

            {/* OPERATING EXPENSES */}
            <SectionHeader label="Operating Expenses" />
            {(Object.keys(inputs.expenses) as Array<keyof typeof inputs.expenses>).map(key => {
              const annual = yr1 ? inputs.expenses[key] : 0; // Year 1 inputs = no growth yet
              if (annual === 0) return null;
              const pctOfEGI = totalEGI > 0 ? annual / totalEGI : 0;
              return (
                <Row
                  key={key}
                  label={EXPENSE_LABELS[key] ?? key}
                  value={fmtDollar(annual)}
                  pct={fmtPct(pctOfEGI)}
                  indent
                />
              );
            })}
            <Row
              label="Total Operating Expenses"
              value={fmtDollar(m.totalOperatingExpenses)}
              pct={totalEGI > 0 ? fmtPct(m.totalOperatingExpenses / totalEGI) : '—'}
              bold
              shade
              borderTop
            />

            {/* NOI */}
            <SectionHeader label="Net Operating Income" />
            <Row
              label="Net Operating Income (NOI)"
              value={fmtDollar(m.noi)}
              pct={totalEGI > 0 ? fmtPct(m.noi / totalEGI) : '—'}
              bold
              shade
            />

            {/* DEBT SERVICE */}
            <SectionHeader label="Financing" />
            <Row
              label="Annual Debt Service"
              value={fmtDollar(m.annualDebtService)}
              pct=""
              indent
            />
            <Row
              label="Cash Flow Before Tax (CFBT)"
              value={fmtDollar(m.cashFlowBeforeTax)}
              pct=""
              bold
              shade
              borderTop
            />
          </tbody>
        </table>
      </div>

      {/* Key Metrics Row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 mb-4">
        {[
          { label: 'Cap Rate',  value: fmtPct(m.capRate, 2) },
          { label: 'OER',       value: fmtPct(m.operatingExpenseRatio, 1) },
          { label: 'Cash-on-Cash', value: fmtPct(m.cashOnCash, 2) },
          { label: 'IRR',       value: fmtPct(m.irr, 2) },
          { label: 'DSCR',      value: fmtX(m.dscr) },
          { label: 'GRM',       value: fmtX(m.grm) },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="rounded-lg px-4 py-3 text-center"
            style={{ border: '1px solid var(--border)', backgroundColor: 'var(--surface)' }}
          >
            <p className="text-lg font-bold tabular-nums" style={{ color: 'var(--text)' }}>{value}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Investment Summary */}
      <div
        className="rounded-lg overflow-hidden"
        style={{ border: '1px solid var(--border)' }}
      >
        <div
          className="px-4 py-2"
          style={{ backgroundColor: 'var(--surface)', borderBottom: '1px solid var(--border)' }}
        >
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
            Investment Summary
          </p>
        </div>
        <table className="w-full border-collapse">
          <tbody>
            <Row label="Purchase Price"        value={fmtDollar(inputs.purchasePrice)} />
            <Row label="Down Payment"          value={fmtDollar(inputs.downPayment)} indent />
            <Row label="Loan Amount"           value={fmtDollar(m.loanAmount)} indent />
            <Row label="Closing Costs"         value={fmtDollar(m.closingCosts)} indent />
            <Row label="CapEx Budget"          value={fmtDollar(inputs.capexBudget)} indent />
            <Row label="Total Cash Invested"   value={fmtDollar(m.totalCashInvested)} bold shade borderTop />
            <Row label="Monthly Payment"       value={fmtDollar(m.monthlyPayment)} indent />
            <Row label="LTV"                   value={fmtPct(m.ltv)} indent />
            <Row label="Break-Even Occupancy"  value={fmtPct(m.breakEvenOccupancy)} indent />
            <Row label="Max Loan (1.25x DSCR)" value={fmtDollar(m.maxLoanAmount)} indent />
          </tbody>
        </table>
      </div>

      {/* Print note */}
      <p className="text-xs mt-4 text-center" style={{ color: 'var(--muted)' }}>
        APOD based on Year 1 stabilized figures · Hold period: {inputs.holdPeriod} years · Exit cap: {fmtPct(inputs.exitCapRate)}
      </p>
    </div>
  );
}
