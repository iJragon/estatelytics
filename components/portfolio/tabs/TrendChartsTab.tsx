'use client';

import dynamic from 'next/dynamic';
import type { AnalysisResult } from '@/lib/models/statement';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

interface TrendChartsTabProps {
  analyses: AnalysisResult[];
  periods: string[];
}

function buildLineChart(
  title: string,
  periods: string[],
  seriesData: Array<{ name: string; values: (number | null)[] }>,
  yPrefix = '$',
) {
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  const traces = seriesData.map((s, i) => ({
    x: periods,
    y: s.values,
    name: s.name,
    type: 'scatter' as const,
    mode: 'lines+markers' as const,
    line: { color: colors[i % colors.length], width: 2.5 },
    marker: { size: 6, color: colors[i % colors.length] },
    hovertemplate: `%{x}<br>${s.name}: ${yPrefix}%{y:,.0f}<extra></extra>`,
  }));

  const layout = {
    title: { text: title, font: { size: 13, color: 'var(--text)' as string } },
    paper_bgcolor: 'transparent',
    plot_bgcolor: 'transparent',
    font: { color: 'var(--text)' as string, size: 11 },
    margin: { t: 40, r: 20, b: 60, l: 70 },
    xaxis: {
      gridcolor: 'rgba(128,128,128,0.15)',
      tickfont: { size: 10 },
    },
    yaxis: {
      gridcolor: 'rgba(128,128,128,0.15)',
      tickprefix: yPrefix,
      tickformat: ',.0f',
      tickfont: { size: 10 },
    },
    legend: { orientation: 'h' as const, y: -0.2 },
    hovermode: 'x unified' as const,
  };

  return { traces, layout };
}

export default function TrendChartsTab({ analyses, periods }: TrendChartsTabProps) {
  if (analyses.length === 0) {
    return <p className="text-sm" style={{ color: 'var(--muted)' }}>No statements available.</p>;
  }

  function kfSeries(key: string, label: string) {
    return {
      name: label,
      values: analyses.map(a => a.statement.keyFigures[key]?.annualTotal ?? null),
    };
  }

  function ratioSeries(key: keyof AnalysisResult['ratios'], label: string) {
    return {
      name: label,
      values: analyses.map(a => a.ratios[key].value),
    };
  }

  const revChart = buildLineChart(
    'Revenue vs Operating Expenses',
    periods,
    [kfSeries('total_revenue', 'Total Revenue'), kfSeries('total_operating_expenses', 'Total Operating Expenses')],
  );

  const noiChart = buildLineChart(
    'Net Operating Income',
    periods,
    [kfSeries('noi', 'NOI'), kfSeries('net_income', 'Net Income')],
  );

  const ratioPctChart = buildLineChart(
    'Key Ratio Trends',
    periods,
    [
      ratioSeries('oer', 'Operating Expense Ratio'),
      ratioSeries('noiMargin', 'NOI Margin'),
      ratioSeries('vacancyRate', 'Vacancy Rate'),
      ratioSeries('payrollPct', 'Payroll %'),
    ],
    '',
  );

  const expenseChart = buildLineChart(
    'Expense Breakdown',
    periods,
    [
      kfSeries('total_payroll', 'Payroll'),
      kfSeries('utilities', 'Utilities'),
      kfSeries('management_fees', 'Management Fees'),
      kfSeries('real_estate_taxes', 'Real Estate Taxes'),
      kfSeries('insurance', 'Insurance'),
    ],
  );

  const config = { displayModeBar: false, responsive: true };
  const plotStyle = { width: '100%', height: 320 };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {[
        { id: 'rev', chart: revChart, suffix: '' },
        { id: 'noi', chart: noiChart, suffix: '' },
        { id: 'ratio', chart: ratioPctChart, suffix: '%' },
        { id: 'expense', chart: expenseChart, suffix: '' },
      ].map(({ id, chart }) => (
        <div key={id} className="card">
          <Plot
            data={chart.traces}
            layout={{
              ...chart.layout,
              yaxis: {
                ...chart.layout.yaxis,
                ticksuffix: id === 'ratio' ? '%' : '',
                tickprefix: id === 'ratio' ? '' : '$',
              },
            }}
            config={config}
            style={plotStyle}
          />
        </div>
      ))}
    </div>
  );
}
