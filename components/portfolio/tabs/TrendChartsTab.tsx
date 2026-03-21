'use client';

import type { AnalysisResult } from '@/lib/models/statement';
import PlotlyChart from '@/components/charts/PlotlyChart';
import { COLORS } from '@/components/charts/chart-builders';

interface TrendChartsTabProps {
  analyses: AnalysisResult[];
  periods: string[];
}

const LINE_WIDTH = 2.5;
const MARKER_SIZE = 6;

function barTrace(
  label: string,
  x: string[],
  y: (number | null)[],
  color: string,
): Plotly.Data {
  return {
    x,
    y,
    name: label,
    type: 'bar',
    marker: { color },
    hovertemplate: `<b>${label}</b>: %{y:$,.0f}<extra></extra>`,
  } as Plotly.Data;
}

function lineTrace(
  label: string,
  x: string[],
  y: (number | null)[],
  color: string,
): Plotly.Data {
  return {
    x,
    y,
    name: label,
    type: 'scatter',
    mode: 'lines+markers',
    line: { color, width: LINE_WIDTH },
    marker: { size: MARKER_SIZE, color },
    hovertemplate: `<b>${label}</b>: %{y:$,.0f}<extra></extra>`,
  } as Plotly.Data;
}

function pctTrace(
  label: string,
  x: string[],
  y: (number | null)[],
  color: string,
): Plotly.Data {
  return {
    x,
    y,
    name: label,
    type: 'scatter',
    mode: 'lines+markers',
    line: { color, width: LINE_WIDTH },
    marker: { size: MARKER_SIZE, color },
    hovertemplate: `<b>${label}</b>: %{y:.1f}%<extra></extra>`,
  } as Plotly.Data;
}

export default function TrendChartsTab({ analyses, periods }: TrendChartsTabProps) {
  if (analyses.length === 0) {
    return <p className="text-sm" style={{ color: 'var(--muted)' }}>No statements available.</p>;
  }

  function kf(key: string): (number | null)[] {
    return analyses.map(a => a.statement.keyFigures[key]?.annualTotal ?? null);
  }

  function kfAbs(key: string): (number | null)[] {
    return analyses.map(a => {
      const v = a.statement.keyFigures[key]?.annualTotal ?? null;
      return v !== null ? Math.abs(v) : null;
    });
  }

  function ratio(key: keyof AnalysisResult['ratios']): (number | null)[] {
    return analyses.map(a => a.ratios[key].value);
  }

  const plotStyle = { height: 300 };
  const cfg = { displayModeBar: false as const, responsive: true };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

      {/* Revenue / OpEx / NOI grouped bar chart — full width */}
      <div className="card lg:col-span-2">
        <PlotlyChart
          data={[
            barTrace('Total Revenue', periods, kf('total_revenue'), COLORS.revenue),
            barTrace('Operating Expenses', periods, kfAbs('total_operating_expenses'), COLORS.expense),
            barTrace('Net Operating Income', periods, kf('noi'), COLORS.noi),
          ]}
          layout={{
            title: { text: 'Revenue, Expenses & NOI by Period' },
            barmode: 'group',
            yaxis: { tickformat: '$,.0f' },
            hovermode: 'x unified',
          }}
          config={cfg}
          style={{ height: 320 }}
        />
      </div>

      {/* Revenue vs Operating Expenses */}
      <div className="card">
        <PlotlyChart
          data={[
            lineTrace('Total Revenue', periods, kf('total_revenue'), COLORS.revenue),
            lineTrace('Operating Expenses', periods, kfAbs('total_operating_expenses'), COLORS.expense),
          ]}
          layout={{
            title: { text: 'Revenue vs Operating Expenses' },
            yaxis: { tickformat: '$,.0f' },
            hovermode: 'x unified',
          }}
          config={cfg}
          style={plotStyle}
        />
      </div>

      {/* NOI and Net Income */}
      <div className="card">
        <PlotlyChart
          data={[
            lineTrace('Net Operating Income', periods, kf('noi'), COLORS.noi),
            lineTrace('Net Income', periods, kf('net_income'), COLORS.cashflow),
          ]}
          layout={{
            title: { text: 'Net Operating Income' },
            yaxis: { tickformat: '$,.0f' },
            hovermode: 'x unified',
          }}
          config={cfg}
          style={plotStyle}
        />
      </div>

      {/* Key Ratio Trends */}
      <div className="card">
        <PlotlyChart
          data={[
            pctTrace('Operating Expense Ratio', periods, ratio('oer'), COLORS.expense),
            pctTrace('NOI Margin', periods, ratio('noiMargin'), COLORS.noi),
            pctTrace('Vacancy Rate', periods, ratio('vacancyRate'), COLORS.warning),
            pctTrace('Payroll %', periods, ratio('payrollPct'), COLORS.payroll),
          ]}
          layout={{
            title: { text: 'Key Ratio Trends' },
            yaxis: { tickformat: '.1f', ticksuffix: '%' },
            hovermode: 'x unified',
          }}
          config={cfg}
          style={plotStyle}
        />
      </div>

      {/* Expense Breakdown */}
      <div className="card">
        <PlotlyChart
          data={[
            lineTrace('Payroll', periods, kfAbs('total_payroll'), COLORS.payroll),
            lineTrace('Utilities', periods, kfAbs('utilities'), COLORS.utilities),
            lineTrace('Management Fees', periods, kfAbs('management_fees'), COLORS.mgmt),
            lineTrace('Real Estate Taxes', periods, kfAbs('real_estate_taxes'), COLORS.taxes),
            lineTrace('Insurance', periods, kfAbs('insurance'), COLORS.insurance),
          ]}
          layout={{
            title: { text: 'Expense Breakdown' },
            yaxis: { tickformat: '$,.0f' },
            hovermode: 'x unified',
          }}
          config={cfg}
          style={plotStyle}
        />
      </div>

    </div>
  );
}
