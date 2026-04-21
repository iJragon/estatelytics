'use client';

import type { SensitivityCell } from '@/lib/models/deal';

interface Props {
  sensitivity: SensitivityCell[][];
}

const RENT_LABELS = ['-2%', '0%', '+2%', '+3%', '+5%', '+7%'];
const VACANCY_LABELS = ['0%', '3%', '5%', '8%', '10%', '15%'];

function cellColor(cell: SensitivityCell): { bg: string; text: string } {
  if (!cell.isViable) return { bg: '#fee2e2', text: '#991b1b' };
  if (cell.cashOnCash >= 0.08) return { bg: '#dcfce7', text: '#15803d' };
  if (cell.cashOnCash >= 0.05) return { bg: '#fef9c3', text: '#854d0e' };
  return { bg: '#fef3c7', text: '#b45309' };
}

export default function SensitivityTab({ sensitivity }: Props) {
  return (
    <div className="p-4 space-y-6 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 220px)' }}>

      <div className="card">
        <h4 className="text-sm font-semibold mb-1" style={{ color: 'var(--text)' }}>Cash-on-Cash Return</h4>
        <p className="text-xs mb-4" style={{ color: 'var(--muted)' }}>
          Rows = vacancy rate · Columns = annual rent growth · Green ≥ 8% · Yellow 5–8% · Red = non-viable (DSCR &lt; 1.0 or negative cash flow)
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse" style={{ minWidth: 480 }}>
            <thead>
              <tr>
                <th className="py-1.5 px-2 text-left" style={{ color: 'var(--muted)', width: 80 }}>
                  Vacancy↓ / Rent→
                </th>
                {RENT_LABELS.map(l => (
                  <th key={l} className="py-1.5 px-2 text-center font-medium" style={{ color: 'var(--muted)' }}>{l}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sensitivity.map((row, vi) => (
                <tr key={vi}>
                  <td className="py-1.5 px-2 font-medium" style={{ color: 'var(--muted)' }}>{VACANCY_LABELS[vi]}</td>
                  {row.map((cell, ri) => {
                    const { bg, text } = cellColor(cell);
                    return (
                      <td
                        key={ri}
                        className="py-1.5 px-2 text-center font-medium rounded"
                        style={{ backgroundColor: bg, color: text }}
                        title={`DSCR: ${cell.dscr.toFixed(2)}x | IRR: ${(cell.irr * 100).toFixed(1)}%`}
                      >
                        {(cell.cashOnCash * 100).toFixed(1)}%
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h4 className="text-sm font-semibold mb-1" style={{ color: 'var(--text)' }}>IRR</h4>
        <p className="text-xs mb-4" style={{ color: 'var(--muted)' }}>
          Same grid — showing Internal Rate of Return across scenarios
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse" style={{ minWidth: 480 }}>
            <thead>
              <tr>
                <th className="py-1.5 px-2 text-left" style={{ color: 'var(--muted)', width: 80 }}>
                  Vacancy↓ / Rent→
                </th>
                {RENT_LABELS.map(l => (
                  <th key={l} className="py-1.5 px-2 text-center font-medium" style={{ color: 'var(--muted)' }}>{l}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sensitivity.map((row, vi) => (
                <tr key={vi}>
                  <td className="py-1.5 px-2 font-medium" style={{ color: 'var(--muted)' }}>{VACANCY_LABELS[vi]}</td>
                  {row.map((cell, ri) => {
                    const irrPct = cell.irr * 100;
                    const bg = !cell.isViable ? '#fee2e2' : irrPct >= 12 ? '#dcfce7' : irrPct >= 8 ? '#fef9c3' : '#fef3c7';
                    const text = !cell.isViable ? '#991b1b' : irrPct >= 12 ? '#15803d' : irrPct >= 8 ? '#854d0e' : '#b45309';
                    return (
                      <td
                        key={ri}
                        className="py-1.5 px-2 text-center font-medium rounded"
                        style={{ backgroundColor: bg, color: text }}
                      >
                        {irrPct.toFixed(1)}%
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h4 className="text-sm font-semibold mb-1" style={{ color: 'var(--text)' }}>DSCR</h4>
        <p className="text-xs mb-4" style={{ color: 'var(--muted)' }}>
          Debt Service Coverage Ratio — lender minimum is typically 1.25x
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse" style={{ minWidth: 480 }}>
            <thead>
              <tr>
                <th className="py-1.5 px-2 text-left" style={{ color: 'var(--muted)', width: 80 }}>
                  Vacancy↓ / Rent→
                </th>
                {RENT_LABELS.map(l => (
                  <th key={l} className="py-1.5 px-2 text-center font-medium" style={{ color: 'var(--muted)' }}>{l}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sensitivity.map((row, vi) => (
                <tr key={vi}>
                  <td className="py-1.5 px-2 font-medium" style={{ color: 'var(--muted)' }}>{VACANCY_LABELS[vi]}</td>
                  {row.map((cell, ri) => {
                    const bg = cell.dscr >= 1.25 ? '#dcfce7' : cell.dscr >= 1.0 ? '#fef9c3' : '#fee2e2';
                    const text = cell.dscr >= 1.25 ? '#15803d' : cell.dscr >= 1.0 ? '#854d0e' : '#991b1b';
                    return (
                      <td
                        key={ri}
                        className="py-1.5 px-2 text-center font-medium rounded"
                        style={{ backgroundColor: bg, color: text }}
                      >
                        {cell.dscr.toFixed(2)}x
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
