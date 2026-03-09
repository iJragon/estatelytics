'use client';

import { useState } from 'react';
import type { AnalysisResult, Anomaly } from '@/lib/models/statement';

interface AnomaliesTabProps {
  analysis: AnalysisResult;
  anomalyExplanations: Record<number, string>;
  resolvedAnomalies: Set<number>;
  onExplain: (index: number) => void;
  onResolve: (index: number) => void;
  onUnresolve: (index: number) => void;
}

type Filter = 'all' | 'high' | 'medium' | 'low' | 'resolved';

const SEVERITY_COLORS: Record<string, string> = {
  high: 'badge-bad',
  medium: 'badge-warning',
  low: 'badge-unknown',
};

const TYPE_LABELS: Record<string, string> = {
  missing_data: 'Missing Data',
  sign_change: 'Sign Change',
  outlier: 'Statistical Outlier',
  cashflow_vs_netincome: 'Cash Flow vs Net Income',
  negative_noi: 'Negative Net Operating Income',
  structural: 'Structural / Performance',
};

function renderExplanation(text: string) {
  return <p className="text-sm leading-6" style={{ color: 'var(--text)' }}>{text}</p>;
}

function AnomalyCard({
  anomaly,
  origIdx,
  explanation,
  isExplaining,
  resolved,
  onExplain,
  onResolve,
  onUnresolve,
}: {
  anomaly: Anomaly;
  origIdx: number;
  explanation: string | undefined;
  isExplaining: boolean;
  resolved: boolean;
  onExplain: (i: number) => void;
  onResolve: (i: number) => void;
  onUnresolve: (i: number) => void;
}) {
  return (
    <div
      className="card"
      style={{ opacity: resolved ? 0.65 : 1 }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={SEVERITY_COLORS[anomaly.severity]}>{anomaly.severity}</span>
            <span
              className="text-xs px-2 py-0.5 rounded"
              style={{ backgroundColor: 'var(--border)', color: 'var(--muted)' }}
            >
              {TYPE_LABELS[anomaly.type] ?? anomaly.type}
            </span>
            <span className="text-xs font-mono" style={{ color: 'var(--muted)' }}>
              {anomaly.cellRef}
            </span>
            {resolved && (
              <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: 'rgba(34,197,94,0.15)', color: '#16a34a' }}>
                resolved
              </span>
            )}
          </div>
          <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{anomaly.label}</p>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>{anomaly.description}</p>
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
            <div>
              <span style={{ color: 'var(--muted)' }}>Detected: </span>
              <span style={{ color: 'var(--text)' }}>{anomaly.detected}</span>
            </div>
            <div>
              <span style={{ color: 'var(--muted)' }}>Expected: </span>
              <span style={{ color: 'var(--text)' }}>{anomaly.expected}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1.5 shrink-0">
          {!resolved && (
            <button
              onClick={() => onExplain(origIdx)}
              disabled={isExplaining}
              className="px-3 py-1.5 text-xs rounded-md border transition-colors whitespace-nowrap"
              style={{
                borderColor: 'var(--accent)',
                color: 'var(--accent)',
                opacity: isExplaining ? 0.6 : 1,
              }}
            >
              {isExplaining ? 'Explaining...' : 'Explain with AI'}
            </button>
          )}
          {resolved ? (
            <button
              onClick={() => onUnresolve(origIdx)}
              className="px-3 py-1.5 text-xs rounded-md border transition-colors hover:opacity-70"
              style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
            >
              Unresolve
            </button>
          ) : (
            <button
              onClick={() => onResolve(origIdx)}
              className="px-3 py-1.5 text-xs rounded-md border transition-colors hover:opacity-70"
              style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
            >
              Resolve
            </button>
          )}
        </div>
      </div>

      {explanation !== undefined && !resolved && (
        <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
          <p className="text-xs font-semibold mb-1" style={{ color: 'var(--accent)' }}>AI Explanation</p>
          {explanation ? renderExplanation(explanation) : (
            <div className="flex gap-1">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-2 rounded animate-pulse flex-1" style={{ backgroundColor: 'var(--border)' }} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AnomaliesTab({
  analysis,
  anomalyExplanations,
  resolvedAnomalies,
  onExplain,
  onResolve,
  onUnresolve,
}: AnomaliesTabProps) {
  const [filter, setFilter] = useState<Filter>('all');
  const [explaining, setExplaining] = useState<Record<number, boolean>>({});

  const { anomalies } = analysis;

  const active = anomalies.filter((_, i) => !resolvedAnomalies.has(i));
  const resolved = anomalies.filter((_, i) => resolvedAnomalies.has(i));

  const counts = {
    all: active.length,
    high: active.filter(a => a.severity === 'high').length,
    medium: active.filter(a => a.severity === 'medium').length,
    low: active.filter(a => a.severity === 'low').length,
    resolved: resolved.length,
  };

  const displayed = filter === 'resolved'
    ? resolved
    : active.filter(a => filter === 'all' || a.severity === filter);

  async function handleExplain(origIdx: number) {
    setExplaining(prev => ({ ...prev, [origIdx]: true }));
    await onExplain(origIdx);
    setExplaining(prev => ({ ...prev, [origIdx]: false }));
  }

  const filters: { key: Filter; label: string }[] = [
    { key: 'all', label: `All (${counts.all})` },
    { key: 'high', label: `High (${counts.high})` },
    { key: 'medium', label: `Medium (${counts.medium})` },
    { key: 'low', label: `Low (${counts.low})` },
    { key: 'resolved', label: `Resolved (${counts.resolved})` },
  ];

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {filters.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className="px-3 py-1 text-xs rounded-full border transition-colors"
            style={{
              borderColor: filter === key
                ? key === 'resolved' ? '#16a34a' : 'var(--accent)'
                : 'var(--border)',
              backgroundColor: filter === key
                ? key === 'resolved' ? '#16a34a' : 'var(--accent)'
                : 'transparent',
              color: filter === key ? 'white' : 'var(--muted)',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {displayed.length === 0 ? (
        <div className="card text-center py-8">
          <p style={{ color: 'var(--muted)' }}>
            {filter === 'resolved'
              ? 'No resolved anomalies. Use the Resolve button on any anomaly to move it here.'
              : `No ${filter !== 'all' ? filter + ' severity ' : ''}anomalies detected.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map(anomaly => {
            const origIdx = anomalies.indexOf(anomaly);
            return (
              <AnomalyCard
                key={`${anomaly.cellRef}-${origIdx}`}
                anomaly={anomaly}
                origIdx={origIdx}
                explanation={anomalyExplanations[origIdx]}
                isExplaining={!!explaining[origIdx]}
                resolved={filter === 'resolved'}
                onExplain={handleExplain}
                onResolve={onResolve}
                onUnresolve={onUnresolve}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
