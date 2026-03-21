'use client';

import type { PortfolioKeyMetric } from '@/lib/models/portfolio';
import { pctChange } from '@/lib/utils/format';

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

function calcCagr(first: number | null, last: number | null, nPeriods: number): number | null {
  if (first === null || last === null || first === 0 || nPeriods <= 1) return null;
  if (first < 0 || last < 0) return null;
  return (Math.pow(last / first, 1 / nPeriods) - 1) * 100;
}

// Keys where a higher value is bad
const HIGHER_IS_BAD = new Set(['oer', 'vacancy_rate', 'payroll_pct', 'vacancy_loss', 'total_opex']);

export default function KeyMetricsTab({ metrics, periods }: KeyMetricsTabProps) {
  if (periods.length === 0) {
    return <p className="text-sm" style={{ color: 'var(--muted)' }}>No statements available.</p>;
  }

  const showCagr = periods.length >= 3;
  const nPeriods = periods.length - 1;

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
              <th key={i} className="text-right pb-2 font-medium px-3" style={{ color: 'var(--muted)', minWidth: 110 }}>
                {p}
              </th>
            ))}
            {periods.length >= 2 && (
              <th className="text-right pb-2 font-medium px-3" style={{ color: 'var(--muted)', minWidth: 72 }}>
                Change
              </th>
            )}
            {showCagr && (
              <th className="text-right pb-2 font-medium px-3" style={{ color: 'var(--muted)', minWidth: 72 }}>
                CAGR
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {metrics.map(metric => {
            const first = metric.values[0] ?? null;
            const last = metric.values[metric.values.length - 1] ?? null;
            const chg = periods.length >= 2 ? pctChange(first, last) : null;
            const cagr = showCagr ? calcCagr(first, last, nPeriods) : null;
            const higherIsBad = HIGHER_IS_BAD.has(metric.key);

            let chgColor = 'var(--muted)';
            if (chg !== null) {
              const isPositive = chg > 0;
              const isGood = higherIsBad ? !isPositive : isPositive;
              chgColor = isGood ? 'var(--success)' : Math.abs(chg) > 10 ? 'var(--danger)' : 'var(--warning)';
            }

            let cagrColor = 'var(--muted)';
            if (cagr !== null) {
              const isPositive = cagr > 0;
              const isGood = higherIsBad ? !isPositive : isPositive;
              cagrColor = isGood ? 'var(--success)' : Math.abs(cagr) > 10 ? 'var(--danger)' : 'var(--warning)';
            }

            return (
              <tr key={metric.key} className="border-b" style={{ borderColor: 'var(--border)' }}>
                <td className="py-2 font-medium pr-4" style={{ color: 'var(--text)' }}>
                  {metric.label}
                </td>
                {metric.values.map((val, i) => {
                  const prevVal = i > 0 ? (metric.values[i - 1] ?? null) : null;
                  const chgVsPrior = i > 0 ? pctChange(prevVal, val) : null;
                  let arrowColor = 'var(--muted)';
                  let arrow = '';
                  if (chgVsPrior !== null) {
                    const isPositive = chgVsPrior > 0;
                    const isGood = higherIsBad ? !isPositive : isPositive;
                    arrow = isPositive ? '▲' : '▼';
                    arrowColor = isGood ? 'var(--success)' : 'var(--danger)';
                  }

                  return (
                    <td key={i} className="py-2 text-right px-3 font-mono" style={{ color: 'var(--text)' }}>
                      {formatValue(val, metric.unit)}
                      {arrow && (
                        <span className="ml-1 text-[10px]" style={{ color: arrowColor }}>{arrow}</span>
                      )}
                    </td>
                  );
                })}
                {periods.length >= 2 && (
                  <td className="py-2 text-right px-3 font-mono font-semibold" style={{ color: chgColor }}>
                    {chg !== null ? `${chg >= 0 ? '+' : ''}${chg.toFixed(1)}%` : '-'}
                  </td>
                )}
                {showCagr && (
                  <td className="py-2 text-right px-3 font-mono font-semibold" style={{ color: cagrColor }}>
                    {cagr !== null ? `${cagr >= 0 ? '+' : ''}${cagr.toFixed(1)}%` : '-'}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="text-xs mt-3" style={{ color: 'var(--muted)' }}>
        Change: first to last period. {showCagr ? 'CAGR: compound annual growth rate. ' : ''}▲/▼ arrows show direction vs prior period; green = improvement, red = deterioration.
      </p>
    </div>
  );
}
