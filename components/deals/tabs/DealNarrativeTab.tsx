'use client';

interface Props {
  narrative: string;
  isStreaming?: boolean;
}

export default function DealNarrativeTab({ narrative, isStreaming }: Props) {
  if (!narrative && !isStreaming) {
    return (
      <div className="p-4 flex items-center justify-center" style={{ minHeight: 200 }}>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>
          Run analysis to generate an AI investment recommendation.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 220px)' }}>
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--accent)' }}>
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>AI Investment Analysis</span>
          {isStreaming && (
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(59,130,246,0.1)', color: 'var(--accent)' }}>
              Generating...
            </span>
          )}
        </div>
        <div
          className="text-sm leading-relaxed whitespace-pre-wrap"
          style={{ color: 'var(--text)' }}
        >
          {narrative}
          {isStreaming && (
            <span
              className="inline-block w-0.5 h-4 ml-0.5 animate-pulse"
              style={{ backgroundColor: 'var(--accent)', verticalAlign: 'middle' }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
