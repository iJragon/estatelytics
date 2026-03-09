'use client';

const GLOSSARY: Record<string, string> = {
  'Operating Expense Ratio': 'The % of revenue consumed by operating costs. Lower is better — above 55% signals thin margins.',
  'Net Operating Income': 'Revenue minus all operating expenses, before any debt payments. The primary profitability metric for rental property.',
  'NOI Margin': 'Net Operating Income as a % of gross revenue. Healthy properties target 40%–65%.',
  'Vacancy Rate': '% of potential rent lost to empty units. Industry target is under 7%. High vacancy points to a leasing or retention problem.',
  'Debt Service Coverage Ratio': 'How many times NOI covers mortgage/loan payments. Lenders require ≥ 1.25x — below 1.0x means the property cannot pay its own debt.',
  'Gross Potential Rent': 'Maximum rent achievable if every unit were occupied at full asking price — the theoretical income ceiling.',
  'Concession Rate': 'Rent discounts given to attract or retain tenants (e.g. "first month free"), as a % of gross potential rent.',
  'Bad Debt Rate': 'Rent that was never collected and written off as a loss, as a % of revenue. Above 1% warrants attention.',
  'Payroll %': 'Staff and personnel costs as a percentage of total revenue. Typically 10%–25% for multifamily.',
  'Management Fee %': 'Property management company fees as a % of revenue — industry standard is 4%–8%.',
  'Controllable Expense %': 'The share of total expenses that management can directly reduce, like maintenance or staffing.',
  'Break-Even Occupancy': 'The minimum occupancy rate needed to cover all operating expenses — below this the property loses money.',
  'Cash Flow Margin': 'Cash remaining as a % of revenue after ALL costs including debt payments.',
  'Controllable Expenses': 'Costs that management can directly influence: payroll, repairs, marketing, and supplies.',
  'Non-Controllable Expenses': 'Fixed costs management cannot easily change: property taxes, insurance, and replacement reserves.',
  'Gross Revenue': 'Total income collected from rents and other sources after vacancies and deductions.',
  'Total Operating Expenses': 'All costs to operate the property — payroll, utilities, taxes, insurance, maintenance, and management fees.',
  'Net Income': 'Profit remaining after ALL expenses including debt service and non-operating items.',
  'Cash Flow': 'Actual cash in or out of the property after every expense. Differs from net income due to non-cash accounting items.',
};

interface TooltipProps {
  term: string;
  children: React.ReactNode;
}

export default function Tooltip({ term, children }: TooltipProps) {
  const definition = GLOSSARY[term];
  if (!definition) return <>{children}</>;

  return (
    <span className="relative group inline-flex items-center gap-1 cursor-help">
      {children}
      <span
        className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full text-[9px] font-bold flex-shrink-0 select-none"
        style={{ backgroundColor: 'var(--border)', color: 'var(--muted)' }}
      >
        ?
      </span>
      <span
        className="pointer-events-none absolute bottom-full left-0 mb-2 z-50 w-64 rounded-md p-2.5 text-xs leading-5 opacity-0 group-hover:opacity-100 transition-opacity duration-150 shadow-lg"
        style={{
          backgroundColor: 'var(--surface)',
          color: 'var(--text)',
          border: '1px solid var(--border)',
        }}
      >
        <strong>{term}</strong>
        <br />
        {definition}
      </span>
    </span>
  );
}
