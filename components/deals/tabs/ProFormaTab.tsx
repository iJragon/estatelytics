'use client';

import type { ProFormaYear } from '@/lib/models/deal';

interface Props {
  proForma: ProFormaYear[];
}

function fmt(n: number, type: 'dollar' | 'pct'): string {
  if (!isFinite(n)) return '—';
  if (type === 'dollar') {
    const abs = Math.abs(n);
    const sign = n < 0 ? '-' : '';
    if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
    if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`;
    return `${sign}$${abs.toFixed(0)}`;
  }
  return `${(n * 100).toFixed(1)}%`;
}

const ROWS: Array<{ label: string; key: keyof ProFormaYear; type: 'dollar' | 'pct'; indent?: boolean; divider?: boolean }> = [
  { label: 'Gross Scheduled Income', key: 'grossScheduledIncome', type: 'dollar' },
  { label: 'Vacancy Loss',           key: 'vacancyLoss',          type: 'dollar', indent: true },
  { label: 'Effective Gross Income', key: 'effectiveGrossIncome', type: 'dollar' },
  { label: 'Other Income',           key: 'otherIncome',          type: 'dollar', indent: true },
  { label: 'Total Income',           key: 'totalIncome',          type: 'dollar', divider: true },
  { label: 'Operating Expenses',     key: 'operatingExpenses',    type: 'dollar', indent: true },
  { label: 'NOI',                    key: 'noi',                  type: 'dollar', divider: true },
  { label: 'Debt Service',           key: 'debtService',          type: 'dollar', indent: true },
  { label: 'Cash Flow Before Tax',   key: 'cashFlowBeforeTax',    type: 'dollar', divider: true },
  { label: 'Principal Paydown',      key: 'principalPaydown',     type: 'dollar', indent: true },
  { label: 'Interest Payment',       key: 'interestPayment',      type: 'dollar', indent: true },
  { label: 'Remaining Loan Bal.',    key: 'remainingLoanBalance', type: 'dollar' },
  { label: 'Depreciation',          key: 'depreciation',         type: 'dollar', indent: true },
  { label: 'Taxable Income',         key: 'taxableIncome',        type: 'dollar' },
  { label: 'Tax Liability',          key: 'taxLiability',         type: 'dollar', indent: true },
  { label: 'After-Tax Cash Flow',    key: 'afterTaxCashFlow',     type: 'dollar', divider: true },
  { label: 'Property Value',         key: 'propertyValue',        type: 'dollar' },
  { label: 'Equity',                 key: 'equity',               type: 'dollar' },
  { label: 'Cash-on-Cash',          key: 'cashOnCash',           type: 'pct' },
  { label: 'Return on Equity',       key: 'returnOnEquity',       type: 'pct' },
];

export default function ProFormaTab({ proForma }: Props) {
  return (
    <div className="p-4 overflow-auto" style={{ maxHeight: 'calc(100vh - 220px)' }}>
      <div style={{ minWidth: 900 }}>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr style={{ backgroundColor: 'var(--surface)' }}>
              <th
                className="text-left py-2 px-3 font-medium sticky left-0"
                style={{ color: 'var(--muted)', backgroundColor: 'var(--surface)', width: 200, borderBottom: '2px solid var(--border)' }}
              >
                Metric
              </th>
              {proForma.map(y => (
                <th
                  key={y.year}
                  className="text-right py-2 px-3 font-medium"
                  style={{ color: 'var(--muted)', borderBottom: '2px solid var(--border)', minWidth: 90 }}
                >
                  Yr {y.year}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map(row => (
              <tr
                key={row.key}
                style={{
                  borderTop: row.divider ? '2px solid var(--border)' : '1px solid var(--border)',
                  backgroundColor: row.divider ? 'var(--surface)' : undefined,
                }}
              >
                <td
                  className="py-2 px-3 sticky left-0"
                  style={{
                    color: row.indent ? 'var(--muted)' : 'var(--text)',
                    fontWeight: row.divider ? 600 : 400,
                    paddingLeft: row.indent ? '1.5rem' : undefined,
                    backgroundColor: row.divider ? 'var(--surface)' : 'var(--bg)',
                  }}
                >
                  {row.label}
                </td>
                {proForma.map(y => {
                  const val = y[row.key] as number;
                  const isNeg = val < 0;
                  return (
                    <td
                      key={y.year}
                      className="text-right py-2 px-3 font-mono"
                      style={{
                        color: isNeg ? 'var(--danger)' : row.divider ? 'var(--text)' : 'var(--muted)',
                        fontWeight: row.divider ? 600 : 400,
                      }}
                    >
                      {fmt(val, row.type)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
