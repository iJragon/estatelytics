'use client';

import type { PortfolioKeyMetric } from '@/lib/models/portfolio';

interface KeyMetricsTabProps {
  metrics: PortfolioKeyMetric[];
  periods: string[];
}

function formatValue(value: number | null, unit: '%' | '$' | 'x'): string {
  if (value === null) return '-';
  if (unit === '%') return `${value.toFixed(1)}%`;
  if (unit === 'x') return `${value.toFixed(2)}x`;
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

function pctChange(from: number | null, to: number | null): number | null {
  if (from === null || to === null || from === 0) return null;
  return ((to - from) / Math.abs(from)) * 100;
}

// Keys where a higher value is bad
const HIGHER_IS_BAD = new Set(['oer', 'vacancy_rate', 'payroll_pct', 'vacancy_loss', 'total_opex']);

export default function KeyMetricsTab({ metrics, periods }: KeyMetricsTabProps) {
  if (periods.length === 0) {
    return <p className="text-sm" style={{ color: 'var(--muted)' }}>No statements available.</p>;
  }

  return (
    <div className="card overflow-x-auto">
      <h3 className="font-semibold text-sm mb-4" style={{ color: 'var(--text)' }}>Key Metrics Comparison</h3>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
            <th className="text-left pb-2 font-medium pr-4" style={{ color: 'var(--muted)', minWidth: 180 }}>
              Metric
            </th>
            {periods.map((p, i) => (
              <th key={i} className="text-right pb-2 font-medium px-3" style={{ color: 'var(--muted)', minWidth: 100 }}>
                {p}
              </th>
            ))}
            {periods.length >= 2 && (
              <th className="text-right pb-2 font-medium px-3" style={{ color: 'var(--muted)', minWidth: 80 }}>
                Change
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {metrics.map(metric => {
            const first = metric.values[0] ?? null;
            const last = metric.values[metric.values.length - 1] ?? null;
            const chg = periods.length >= 2 ? pctChange(first, last) : null;
            const higherIsBad = HIGHER_IS_BAD.has(metric.key);

            let chgColor = 'var(--muted)';
            if (chg !== null) {
              const isPositive = chg > 0;
              const isGood = higherIsBad ? !isPositive : isPositive;
              chgColor = isGood ? '#16a34a' : Math.abs(chg) > 10 ? '#ef4444' : '#f59e0b';
            }

            return (
              <tr key={metric.key} className="border-b" style={{ borderColor: 'var(--border)' }}>
                <td className="py-2 font-medium pr-4" style={{ color: 'var(--text)' }}>
                  {metric.label}
                </td>
                {metric.values.map((val, i) => (
                  <td key={i} className="py-2 text-right px-3 font-mono" style={{ color: 'var(--text)' }}>
                    {formatValue(val, metric.unit)}
                  </td>
                ))}
                {periods.length >= 2 && (
                  <td className="py-2 text-right px-3 font-mono font-semibold" style={{ color: chgColor }}>
                    {chg !== null ? `${chg >= 0 ? '+' : ''}${chg.toFixed(1)}%` : '-'}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="text-xs mt-3" style={{ color: 'var(--muted)' }}>
        Change column shows overall % change from first to last period. Green indicates improvement, red indicates deterioration.
      </p>
    </div>
  );
}
