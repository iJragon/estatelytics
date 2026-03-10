'use client';

import { useState } from 'react';
import type { PropertyDetail, CrossYearFlag, PortfolioKeyMetric } from '@/lib/models/portfolio';
import type { AnalysisResult } from '@/lib/models/statement';
import type { HistoryEntry } from '@/app/dashboard/page';
import OverviewTab from './tabs/OverviewTab';
import KeyMetricsTab from './tabs/KeyMetricsTab';
import TrendChartsTab from './tabs/TrendChartsTab';
import ExpenseBreakdownTab from './tabs/ExpenseBreakdownTab';
import CrossYearFlagsTab from './tabs/CrossYearFlagsTab';

interface PropertyViewProps {
  property: PropertyDetail;
  analyses: AnalysisResult[];
  crossYearFlags: CrossYearFlag[];
  keyMetrics: PortfolioKeyMetric[];
  summaryText: string;
  summaryStreaming: boolean;
  history: HistoryEntry[];
  onGenerateSummary: () => void;
  onAddStatement: (analysisId: string, yearLabel: string) => Promise<void>;
  onRemoveStatement: (stmtId: string) => Promise<void>;
  onDeleteProperty: () => void;
}

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'metrics', label: 'Key Metrics' },
  { id: 'trends', label: 'Trends' },
  { id: 'expenses', label: 'Expenses' },
  { id: 'flags', label: 'Cross-Year Flags' },
];

export default function PropertyView({
  property,
  analyses,
  crossYearFlags,
  keyMetrics,
  summaryText,
  summaryStreaming,
  history,
  onGenerateSummary,
  onAddStatement,
  onRemoveStatement,
  onDeleteProperty,
}: PropertyViewProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [yearLabelInput, setYearLabelInput] = useState('');
  const [addError, setAddError] = useState('');

  const linkedIds = new Set(property.statements.map(s => s.analysisId));
  const availableHistory = history.filter(h => !linkedIds.has(h.id));

  const periods = property.statements.map(s => s.yearLabel || s.period);

  async function handleAdd() {
    if (!addingId) return;
    const entry = history.find(h => h.id === addingId);
    const label = yearLabelInput.trim() || entry?.period || '';
    setAddError('');
    try {
      await onAddStatement(addingId, label);
      setShowAddModal(false);
      setAddingId(null);
      setYearLabelInput('');
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Failed to add statement');
    }
  }

  const highFlagCount = crossYearFlags.filter(f => f.severity === 'high').length;

  return (
    <div className="flex flex-col h-full">
      {/* Property header */}
      <div
        className="px-6 py-4 border-b flex items-start justify-between gap-4"
        style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}
      >
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-lg truncate" style={{ color: 'var(--text)' }}>
            {property.name}
          </h2>
          {property.address && (
            <p className="text-sm" style={{ color: 'var(--muted)' }}>{property.address}</p>
          )}

          {/* Statement chips */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {property.statements.length === 0 ? (
              <p className="text-xs" style={{ color: 'var(--muted)' }}>No statements yet. Add one below.</p>
            ) : (
              property.statements.map(stmt => (
                <div
                  key={stmt.id}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs"
                  style={{ backgroundColor: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)', color: 'var(--accent)' }}
                >
                  <span>{stmt.yearLabel || stmt.period}</span>
                  <button
                    onClick={() => onRemoveStatement(stmt.id)}
                    className="ml-0.5 hover:opacity-70 transition-opacity"
                    title="Remove statement"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              ))
            )}
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border transition-colors hover:opacity-80"
              style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add Statement
            </button>
          </div>
        </div>

        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="flex-shrink-0 text-xs px-3 py-1.5 rounded-md border transition-colors hover:opacity-80"
          style={{ borderColor: 'rgba(239,68,68,0.3)', color: '#ef4444' }}
        >
          Delete Property
        </button>
      </div>

      {/* Tabs */}
      <div
        className="flex border-b overflow-x-auto"
        style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}
      >
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors"
            style={{
              color: activeTab === tab.id ? 'var(--accent)' : 'var(--muted)',
              borderBottom: activeTab === tab.id ? '2px solid var(--accent)' : '2px solid transparent',
            }}
          >
            {tab.label}
            {tab.id === 'flags' && highFlagCount > 0 && (
              <span
                className="ml-1 px-1.5 py-0.5 text-xs rounded-full"
                style={{ backgroundColor: '#ef4444', color: 'white' }}
              >
                {highFlagCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-6">
        {analyses.length === 0 && activeTab !== 'overview' ? (
          <div className="text-center py-12">
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              Add at least one statement to view this tab.
            </p>
          </div>
        ) : (
          <>
            {activeTab === 'overview' && (
              <OverviewTab
                property={property}
                analyses={analyses}
                summaryText={summaryText}
                summaryStreaming={summaryStreaming}
                onGenerateSummary={onGenerateSummary}
              />
            )}
            {activeTab === 'metrics' && (
              <KeyMetricsTab metrics={keyMetrics} periods={periods} />
            )}
            {activeTab === 'trends' && (
              <TrendChartsTab analyses={analyses} periods={periods} />
            )}
            {activeTab === 'expenses' && (
              <ExpenseBreakdownTab analyses={analyses} periods={periods} />
            )}
            {activeTab === 'flags' && (
              <CrossYearFlagsTab flags={crossYearFlags} />
            )}
          </>
        )}
      </div>

      {/* Add Statement Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="rounded-xl p-6 max-w-md w-full mx-4 shadow-xl" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h3 className="font-semibold text-sm mb-1" style={{ color: 'var(--text)' }}>Add Statement to Property</h3>
            <p className="text-xs mb-4" style={{ color: 'var(--muted)' }}>
              Select an analyzed statement from your history to attach to this property.
            </p>

            {availableHistory.length === 0 ? (
              <p className="text-sm py-4 text-center" style={{ color: 'var(--muted)' }}>
                No available statements. All your analyzed statements are already linked, or you have none yet.
              </p>
            ) : (
              <div className="space-y-1 max-h-60 overflow-y-auto mb-4">
                {availableHistory.map(entry => (
                  <button
                    key={entry.id}
                    onClick={() => {
                      setAddingId(entry.id);
                      setYearLabelInput(entry.period || '');
                    }}
                    className="w-full text-left p-3 rounded-lg border transition-colors hover:opacity-80"
                    style={{
                      borderColor: addingId === entry.id ? 'var(--accent)' : 'var(--border)',
                      backgroundColor: addingId === entry.id ? 'rgba(59,130,246,0.08)' : 'var(--bg)',
                    }}
                  >
                    <p className="text-xs font-medium" style={{ color: 'var(--text)' }}>
                      {entry.propertyName || entry.fileName}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--muted)' }}>
                      {entry.period} &middot; {new Date(entry.analyzedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </button>
                ))}
              </div>
            )}

            {addingId && (
              <div className="mb-4">
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>
                  Period Label (e.g. "2023", "Jan-Sep 2024")
                </label>
                <input
                  type="text"
                  value={yearLabelInput}
                  onChange={e => setYearLabelInput(e.target.value)}
                  placeholder="e.g. 2023"
                  className="input-field text-sm w-full"
                  style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
                />
              </div>
            )}

            {addError && (
              <p className="text-xs mb-3" style={{ color: '#ef4444' }}>{addError}</p>
            )}

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setShowAddModal(false); setAddingId(null); setYearLabelInput(''); setAddError(''); }}
                className="px-4 py-2 text-sm rounded-md border transition-colors hover:opacity-80"
                style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={!addingId}
                className="btn-primary px-4 py-2 text-sm"
              >
                Add Statement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Property Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h3 className="font-semibold text-sm mb-2" style={{ color: 'var(--text)' }}>Delete Property?</h3>
            <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
              This will delete <strong>{property.name}</strong> and all its statement links. The underlying analyses will not be deleted.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-sm rounded-md border transition-colors hover:opacity-80"
                style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
              >
                Cancel
              </button>
              <button
                onClick={() => { setShowDeleteConfirm(false); onDeleteProperty(); }}
                className="px-4 py-2 text-sm rounded-md transition-colors hover:opacity-80"
                style={{ backgroundColor: '#ef4444', color: 'white' }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
