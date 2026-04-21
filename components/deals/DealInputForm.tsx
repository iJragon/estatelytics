'use client';

import { useState, useEffect } from 'react';
import type { DealInputs, OperatingExpenseBreakdown } from '@/lib/models/deal';
import { DEFAULT_DEAL_INPUTS } from '@/lib/models/deal';

interface Props {
  initialInputs?: DealInputs;
  onSave: (inputs: DealInputs) => void;
  onCancel: () => void;
  saving?: boolean;
}

type Step = 'property' | 'financing' | 'income' | 'expenses' | 'assumptions';

const STEPS: { key: Step; label: string }[] = [
  { key: 'property',    label: 'Property' },
  { key: 'financing',   label: 'Financing' },
  { key: 'income',      label: 'Income' },
  { key: 'expenses',    label: 'Expenses' },
  { key: 'assumptions', label: 'Assumptions' },
];

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>{label}</label>
      {hint && <p className="text-xs mb-1" style={{ color: 'var(--muted)' }}>{hint}</p>}
      {children}
    </div>
  );
}

function NumberInput({
  value,
  onChange,
  prefix,
  suffix,
}: {
  value: number;
  onChange: (v: number) => void;
  prefix?: string;
  suffix?: string;
}) {
  const [raw, setRaw] = useState(value === 0 ? '' : String(value));

  // Sync when parent resets the form
  useEffect(() => {
    setRaw(value === 0 ? '' : String(value));
  }, [value]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const text = e.target.value;
    // Allow empty, digits, one decimal point, and leading minus
    if (!/^-?\d*\.?\d*$/.test(text)) return;
    setRaw(text);
    const parsed = parseFloat(text);
    onChange(isNaN(parsed) ? 0 : parsed);
  }

  function handleBlur() {
    const parsed = parseFloat(raw);
    if (isNaN(parsed)) {
      setRaw('');
      onChange(0);
    } else {
      setRaw(String(parsed));
    }
  }

  return (
    <div className="flex items-center" style={{ border: '1px solid var(--border)', borderRadius: '0.375rem', overflow: 'hidden', backgroundColor: 'var(--bg)' }}>
      {prefix && (
        <span className="px-2 py-2 text-sm" style={{ backgroundColor: 'var(--surface)', color: 'var(--muted)', borderRight: '1px solid var(--border)' }}>
          {prefix}
        </span>
      )}
      <input
        type="text"
        inputMode="decimal"
        value={raw}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder="0"
        className="flex-1 px-3 py-2 text-sm outline-none"
        style={{ backgroundColor: 'transparent', color: 'var(--text)', minWidth: 0 }}
      />
      {suffix && (
        <span className="px-2 py-2 text-sm" style={{ backgroundColor: 'var(--surface)', color: 'var(--muted)', borderLeft: '1px solid var(--border)' }}>
          {suffix}
        </span>
      )}
    </div>
  );
}

function PctInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <NumberInput
      value={parseFloat((value * 100).toFixed(4))}
      onChange={v => onChange(v / 100)}
      suffix="%"
    />
  );
}

export default function DealInputForm({ initialInputs, onSave, onCancel, saving }: Props) {
  const [step, setStep] = useState<Step>('property');
  const [inputs, setInputs] = useState<DealInputs>(initialInputs ?? DEFAULT_DEAL_INPUTS);

  function set<K extends keyof DealInputs>(key: K, value: DealInputs[K]) {
    setInputs(prev => ({ ...prev, [key]: value }));
  }

  function setExpense(key: keyof OperatingExpenseBreakdown, value: number) {
    setInputs(prev => ({ ...prev, expenses: { ...prev.expenses, [key]: value } }));
  }

  const stepIndex = STEPS.findIndex(s => s.key === step);
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === STEPS.length - 1;

  const expenseFields: Array<{ key: keyof OperatingExpenseBreakdown; label: string }> = [
    { key: 'propertyTaxes', label: 'Property Taxes' },
    { key: 'insurance',     label: 'Insurance' },
    { key: 'utilities',     label: 'Utilities' },
    { key: 'maintenance',   label: 'Maintenance & Repairs' },
    { key: 'managementFee', label: 'Management Fee' },
    { key: 'reserves',      label: 'Reserves' },
    { key: 'landscaping',   label: 'Landscaping' },
    { key: 'janitorial',    label: 'Janitorial' },
    { key: 'marketing',     label: 'Marketing' },
    { key: 'administrative',label: 'Administrative' },
    { key: 'payroll',       label: 'Payroll' },
    { key: 'miscellaneous', label: 'Miscellaneous' },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Step tabs */}
      <div className="flex border-b" style={{ borderColor: 'var(--border)' }}>
        {STEPS.map((s, i) => (
          <button
            key={s.key}
            onClick={() => setStep(s.key)}
            className="flex-1 py-2 text-xs font-medium transition-colors"
            style={{
              color: s.key === step ? 'var(--accent)' : 'var(--muted)',
              borderBottom: s.key === step ? '2px solid var(--accent)' : '2px solid transparent',
              backgroundColor: 'transparent',
            }}
          >
            <span
              className="inline-flex items-center justify-center w-4 h-4 rounded-full text-xs mr-1"
              style={{
                backgroundColor: s.key === step ? 'var(--accent)' : 'var(--border)',
                color: s.key === step ? '#fff' : 'var(--muted)',
              }}
            >
              {i + 1}
            </span>
            {s.label}
          </button>
        ))}
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {step === 'property' && (
          <>
            <Field label="Property Type">
              <div className="flex gap-2">
                {(['residential', 'commercial', 'mixed'] as const).map(pt => (
                  <button
                    key={pt}
                    onClick={() => set('propertyType', pt)}
                    className="flex-1 py-2 text-sm rounded capitalize"
                    style={{
                      backgroundColor: inputs.propertyType === pt ? 'var(--accent)' : 'var(--surface)',
                      color: inputs.propertyType === pt ? '#fff' : 'var(--text)',
                      border: `1px solid ${inputs.propertyType === pt ? 'var(--accent)' : 'var(--border)'}`,
                    }}
                  >
                    {pt}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Purchase Price">
              <NumberInput value={inputs.purchasePrice} onChange={v => set('purchasePrice', v)} prefix="$" />
            </Field>
            <Field label="Closing Cost Rate" hint="Typically 2–4% of purchase price">
              <PctInput value={inputs.closingCostRate} onChange={v => set('closingCostRate', v)} />
            </Field>
            <Field label="CapEx Budget" hint="Planned capital improvements at purchase">
              <NumberInput value={inputs.capexBudget} onChange={v => set('capexBudget', v)} prefix="$" />
            </Field>
            <Field label="Depreciation Schedule">
              <div className="flex gap-2">
                {([27.5, 39] as const).map(yr => (
                  <button
                    key={yr}
                    onClick={() => set('depreciationYears', yr)}
                    className="flex-1 py-2 text-sm rounded"
                    style={{
                      backgroundColor: inputs.depreciationYears === yr ? 'var(--accent)' : 'var(--surface)',
                      color: inputs.depreciationYears === yr ? '#fff' : 'var(--text)',
                      border: `1px solid ${inputs.depreciationYears === yr ? 'var(--accent)' : 'var(--border)'}`,
                    }}
                  >
                    {yr} yr {yr === 27.5 ? '(Residential)' : '(Commercial)'}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Land Value Rate" hint="Portion of price that is non-depreciable land">
              <PctInput value={inputs.landValueRate} onChange={v => set('landValueRate', v)} />
            </Field>
          </>
        )}

        {step === 'financing' && (
          <>
            <Field label="Down Payment" hint="Dollar amount — not percentage">
              <NumberInput value={inputs.downPayment} onChange={v => set('downPayment', v)} prefix="$" />
            </Field>
            {inputs.purchasePrice > 0 && (
              <p className="text-xs" style={{ color: 'var(--muted)' }}>
                Loan: ${((inputs.purchasePrice - inputs.downPayment) / 1000).toFixed(1)}K
                ({((1 - inputs.downPayment / inputs.purchasePrice) * 100).toFixed(1)}% LTV)
              </p>
            )}
            <Field label="Interest Rate (Annual)">
              <PctInput value={inputs.interestRate} onChange={v => set('interestRate', v)} />
            </Field>
            <Field label="Amortization Period">
              <NumberInput value={inputs.amortizationYears} onChange={v => set('amortizationYears', v)} suffix="years" />
            </Field>
            <Field label="Loan Term (Balloon)" hint="When the balloon payment is due (≤ amortization period)">
              <NumberInput value={inputs.loanTermYears} onChange={v => set('loanTermYears', v)} suffix="years" />
            </Field>
          </>
        )}

        {step === 'income' && (
          <>
            <Field label="Gross Scheduled Income" hint="Annual potential rental income at 100% occupancy">
              <NumberInput value={inputs.grossScheduledIncome} onChange={v => set('grossScheduledIncome', v)} prefix="$" />
            </Field>
            <Field label="Other Income" hint="Annual parking, laundry, storage, etc.">
              <NumberInput value={inputs.otherIncome} onChange={v => set('otherIncome', v)} prefix="$" />
            </Field>
          </>
        )}

        {step === 'expenses' && (
          <>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>
              Enter annual operating expenses. Leave at $0 for categories that don&apos;t apply.
            </p>
            {expenseFields.map(({ key, label }) => (
              <Field key={key} label={label}>
                <NumberInput
                  value={inputs.expenses[key]}
                  onChange={v => setExpense(key, v)}
                  prefix="$"
                 
                />
              </Field>
            ))}
            <div className="card" style={{ backgroundColor: 'var(--surface)' }}>
              <div className="flex justify-between text-sm font-semibold">
                <span style={{ color: 'var(--text)' }}>Total Annual Expenses</span>
                <span style={{ color: 'var(--text)' }}>
                  ${Object.values(inputs.expenses).reduce((a, b) => a + b, 0).toLocaleString()}
                </span>
              </div>
            </div>
          </>
        )}

        {step === 'assumptions' && (
          <>
            <Field label="Vacancy Rate" hint="Expected percentage of time units are empty">
              <PctInput value={inputs.vacancyRate} onChange={v => set('vacancyRate', v)} />
            </Field>
            <Field label="Annual Rent Growth">
              <PctInput value={inputs.rentGrowthRate} onChange={v => set('rentGrowthRate', v)} />
            </Field>
            <Field label="Annual Expense Growth">
              <PctInput value={inputs.expenseGrowthRate} onChange={v => set('expenseGrowthRate', v)} />
            </Field>
            <Field label="Exit Cap Rate" hint="Expected cap rate when you sell">
              <PctInput value={inputs.exitCapRate} onChange={v => set('exitCapRate', v)} />
            </Field>
            <Field label="Hold Period">
              <NumberInput value={inputs.holdPeriod} onChange={v => set('holdPeriod', v)} suffix="years" />
            </Field>
            <Field label="Selling Cost Rate" hint="Broker commissions, transfer taxes, etc.">
              <PctInput value={inputs.sellingCostRate} onChange={v => set('sellingCostRate', v)} />
            </Field>
            <Field label="Tax Bracket (Ordinary Income)">
              <PctInput value={inputs.taxBracket} onChange={v => set('taxBracket', v)} />
            </Field>
          </>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between p-4 border-t" style={{ borderColor: 'var(--border)' }}>
        <button
          onClick={isFirst ? onCancel : () => setStep(STEPS[stepIndex - 1].key)}
          className="px-4 py-2 text-sm rounded"
          style={{ border: '1px solid var(--border)', color: 'var(--text)', backgroundColor: 'var(--surface)' }}
        >
          {isFirst ? 'Cancel' : '← Back'}
        </button>

        {isLast ? (
          <button
            onClick={() => onSave(inputs)}
            disabled={saving}
            className="btn-primary px-5 py-2 text-sm"
          >
            {saving ? 'Saving...' : 'Save & Analyze'}
          </button>
        ) : (
          <button
            onClick={() => setStep(STEPS[stepIndex + 1].key)}
            className="btn-primary px-5 py-2 text-sm"
          >
            Next →
          </button>
        )}
      </div>
    </div>
  );
}
