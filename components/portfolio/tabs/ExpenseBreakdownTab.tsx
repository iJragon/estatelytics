'use client';

import dynamic from 'next/dynamic';
import type { AnalysisResult } from '@/lib/models/statement';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

interface ExpenseBreakdownTabProps {
  analyses: AnalysisResult[];
  periods: string[];
}

const EXPENSE_CATEGORIES = [
  { key: 'total_payroll', label: 'Payroll', color: '#3b82f6' },
  { key: 'management_fees', label: 'Management Fees', color: '#10b981' },
  { key: 'utilities', label: 'Utilities', color: '#f59e0b' },
  { key: 'real_estate_taxes', label: 'Real Estate Taxes', color: '#ef4444' },
  { key: 'insurance', label: 'Insurance', color: '#8b5cf6' },
  { key: 'replacement_expense', label: 'Replacement Reserve', color: '#06b6d4' },
];

function formatDollar(val: number | null | undefined): string {
  if (val === null || val === undefined) return '-';
  const abs = Math.abs(val);
  if (abs >= 1_000_000) return `$${(val / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `$${(val / 1_000).toFixed(1)}K`;
  return `$${val.toFixed(0)}`;
}

export default function ExpenseBreakdownTab({ analyses, periods }: ExpenseBreakdownTabProps) {
  if (analyses.length === 0) {
    return <p className="text-sm" style={{ color: 'var(--muted)' }}>No statements available.</p>;
  }

  const traces = EXPENSE_CATEGORIES.map(cat => ({
    name: cat.label,
    x: periods,
    y: analyses.map(a => {
      const val = a.statement.keyFigures[cat.key]?.annualTotal ?? null;
      return val !== null ? Math.abs(val) : null;
    }),
    type: 'bar' as const,
    marker: { color: cat.color },
    hovertemplate: `%{x}<br>${cat.label}: $%{y:,.0f}<extra></extra>`,
  }));

  const layout = {
    barmode: 'stack' as const,
    title: { text: 'Annual Expense Breakdown', font: { size: 13, color: 'var(--text)' as string } },
    paper_bgcolor: 'transparent',
    plot_bgcolor: 'transparent',
    font: { color: 'var(--text)' as string, size: 11 },
    margin: { t: 40, r: 20, b: 60, l: 80 },
    xaxis: { gridcolor: 'rgba(128,128,128,0.15)' },
    yaxis: {
      gridcolor: 'rgba(128,128,128,0.15)',
      tickprefix: '$',
      tickformat: ',.0f',
    },
    legend: { orientation: 'h' as const, y: -0.25 },
  };

  // Also render a summary table
  const totalOpex = analyses.map(a => a.statement.keyFigures['total_operating_expenses']?.annualTotal ?? null);

  return (
    <div className="space-y-6">
      <div className="card">
        <Plot
          data={traces}
          layout={layout}
          config={{ displayModeBar: false, responsive: true }}
          style={{ width: '100%', height: 380 }}
        />
      </div>

      {/* Expense table */}
      <div className="card overflow-x-auto">
        <h3 className="font-semibold text-sm mb-4" style={{ color: 'var(--text)' }}>Expense Detail by Period</h3>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
              <th className="text-left pb-2 font-medium pr-4" style={{ color: 'var(--muted)', minWidth: 180 }}>Category</th>
              {periods.map((p, i) => (
                <th key={i} className="text-right pb-2 font-medium px-3" style={{ color: 'var(--muted)', minWidth: 100 }}>{p}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {EXPENSE_CATEGORIES.map(cat => (
              <tr key={cat.key} className="border-b" style={{ borderColor: 'var(--border)' }}>
                <td className="py-2 pr-4 font-medium" style={{ color: 'var(--text)' }}>
                  <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: cat.color }} />
                  {cat.label}
                </td>
                {analyses.map((a, i) => {
                  const val = a.statement.keyFigures[cat.key]?.annualTotal ?? null;
                  const total = totalOpex[i];
                  const pct = val !== null && total !== null && total !== 0
                    ? (Math.abs(val) / Math.abs(total) * 100).toFixed(1)
                    : null;
                  return (
                    <td key={i} className="py-2 text-right px-3 font-mono" style={{ color: 'var(--text)' }}>
                      {formatDollar(val !== null ? Math.abs(val) : null)}
                      {pct && <span className="ml-1 text-xs" style={{ color: 'var(--muted)' }}>({pct}%)</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr style={{ borderTop: '2px solid var(--border)' }}>
              <td className="py-2 pr-4 font-semibold" style={{ color: 'var(--text)' }}>Total Operating Expenses</td>
              {totalOpex.map((val, i) => (
                <td key={i} className="py-2 text-right px-3 font-mono font-semibold" style={{ color: 'var(--text)' }}>
                  {formatDollar(val !== null ? Math.abs(val) : null)}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
