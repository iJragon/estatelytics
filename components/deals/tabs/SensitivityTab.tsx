'use client';

import type { SensitivityCell, InvestorProfile } from '@/lib/models/deal';

interface Props {
  sensitivity: SensitivityCell[][];
  investorProfile?: InvestorProfile | null;
}

const RENT_LABELS = ['-2%', '0%', '+2%', '+3%', '+5%', '+7%'];
const VACANCY_LABELS = ['0%', '3%', '5%', '8%', '10%', '15%'];

// Semitransparent backgrounds so cells look good on both light and dark surfaces.
// Text uses CSS variables so it inherits the theme contrast.
type CellStyle = { bg: string; color: string };

const GOOD: CellStyle  = { bg: 'rgba(34,197,94,0.18)',  color: 'var(--success)' };
const WARN: CellStyle  = { bg: 'rgba(234,179,8,0.18)',  color: 'var(--warning)' };
const BAD: CellStyle   = { bg: 'rgba(239,68,68,0.18)',  color: 'var(--danger)'  };

function cocStyle(cell: SensitivityCell, cocTarget: number): CellStyle {
  if (!cell.isViable)                    return BAD;
  if (cell.cashOnCash >= cocTarget)      return GOOD;
  if (cell.cashOnCash >= cocTarget * 0.7) return WARN;
  return WARN;
}

function irrStyle(cell: SensitivityCell, irrTarget: number): CellStyle {
  const pct = cell.irr * 100;
  if (!cell.isViable)          return BAD;
  if (pct >= irrTarget * 100)  return GOOD;
  if (pct >= irrTarget * 70)   return WARN;
  return WARN;
}

function dscrStyle(cell: SensitivityCell): CellStyle {
  if (cell.dscr >= 1.25) return GOOD;
  if (cell.dscr >= 1.0)  return WARN;
  return BAD;
}

function HeatTable({
  title,
  description,
  sensitivity,
  getStyle,
  getValue,
}: {
  title: string;
  description: string;
  sensitivity: SensitivityCell[][];
  getStyle: (cell: SensitivityCell) => CellStyle;
  getValue: (cell: SensitivityCell) => string;
  investorProfile?: InvestorProfile | null;
}) {
  return (
    <div className="card">
      <h4 className="text-sm font-semibold mb-1" style={{ color: 'var(--text)' }}>{title}</h4>
      <p className="text-xs mb-4" style={{ color: 'var(--muted)' }}>{description}</p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse" style={{ minWidth: 480 }}>
          <thead>
            <tr>
              <th
                className="py-1.5 px-2 text-left font-medium"
                style={{ color: 'var(--muted)', width: 90, borderBottom: '1px solid var(--border)' }}
              >
                Vacancy / Rent
              </th>
              {RENT_LABELS.map(l => (
                <th
                  key={l}
                  className="py-1.5 px-2 text-center font-medium"
                  style={{ color: 'var(--muted)', borderBottom: '1px solid var(--border)' }}
                >
                  {l}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sensitivity.map((row, vi) => (
              <tr key={vi}>
                <td
                  className="py-1.5 px-2 font-medium"
                  style={{ color: 'var(--muted)', borderBottom: '1px solid var(--border)' }}
                >
                  {VACANCY_LABELS[vi]}
                </td>
                {row.map((cell, ri) => {
                  const { bg, color } = getStyle(cell);
                  return (
                    <td
                      key={ri}
                      className="py-1.5 px-2 text-center font-semibold"
                      style={{
                        backgroundColor: bg,
                        color,
                        borderBottom: '1px solid var(--border)',
                        borderRadius: 4,
                      }}
                      title={`CoC: ${(cell.cashOnCash * 100).toFixed(1)}% | DSCR: ${cell.dscr.toFixed(2)}x | IRR: ${(cell.irr * 100).toFixed(1)}%`}
                    >
                      {getValue(cell)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3">
        {[
          { style: GOOD, label: 'Good' },
          { style: WARN, label: 'Marginal' },
          { style: BAD,  label: 'Non-viable' },
        ].map(({ style, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: style.bg, border: `1px solid ${style.color}` }} />
            <span className="text-xs" style={{ color: 'var(--muted)' }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SensitivityTab({ sensitivity, investorProfile }: Props) {
  const cocTarget = investorProfile?.targetCashOnCash ?? 0.08;
  const irrTarget = investorProfile?.targetIRR ?? 0.12;

  return (
    <div className="p-4 space-y-6 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 220px)' }}>
      <HeatTable
        title="Cash-on-Cash Return"
        description={`Rows = vacancy rate, Columns = annual rent growth. Green ≥ ${(cocTarget * 100).toFixed(0)}% (your target), Yellow = marginal, Red = DSCR < 1.0 or negative cash flow.`}
        sensitivity={sensitivity}
        getStyle={cell => cocStyle(cell, cocTarget)}
        getValue={cell => `${(cell.cashOnCash * 100).toFixed(1)}%`}
      />
      <HeatTable
        title="IRR"
        description={`Internal Rate of Return across all scenarios. Green ≥ ${(irrTarget * 100).toFixed(0)}% (your target), Yellow = marginal, Red = non-viable.`}
        sensitivity={sensitivity}
        getStyle={cell => irrStyle(cell, irrTarget)}
        getValue={cell => `${(cell.irr * 100).toFixed(1)}%`}
      />
      <HeatTable
        title="DSCR"
        description="Debt Service Coverage Ratio. Lender minimum is typically 1.25x. Green >= 1.25x, Yellow 1.0-1.25x, Red < 1.0x."
        sensitivity={sensitivity}
        getStyle={dscrStyle}
        getValue={cell => `${cell.dscr.toFixed(2)}x`}
      />
    </div>
  );
}
