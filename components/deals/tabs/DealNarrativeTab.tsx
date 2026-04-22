'use client';

interface Props {
  narrative: string;
  isStreaming?: boolean;
}

// Lightweight markdown renderer — handles the subset the AI actually produces:
// ## headings, **bold**, bullet lists (- or *), blank-line paragraphs.
function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split('\n');
  const nodes: React.ReactNode[] = [];
  let key = 0;

  function inlineFormat(str: string): React.ReactNode {
    // Split on **bold** markers
    const parts = str.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} style={{ color: 'var(--text)', fontWeight: 600 }}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  }

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Blank line
    if (!trimmed) { i++; continue; }

    // H1/H2/H3 heading
    if (trimmed.startsWith('### ')) {
      nodes.push(
        <h3 key={key++} className="text-xs font-semibold uppercase tracking-widest mt-5 mb-2" style={{ color: 'var(--muted)' }}>
          {trimmed.slice(4)}
        </h3>
      );
      i++; continue;
    }
    if (trimmed.startsWith('## ')) {
      nodes.push(
        <h2 key={key++} className="text-base font-semibold mt-6 mb-2" style={{ color: 'var(--text)' }}>
          {trimmed.slice(3)}
        </h2>
      );
      i++; continue;
    }
    if (trimmed.startsWith('# ')) {
      nodes.push(
        <h2 key={key++} className="text-base font-semibold mt-6 mb-2" style={{ color: 'var(--text)' }}>
          {trimmed.slice(2)}
        </h2>
      );
      i++; continue;
    }

    // Numbered heading like "1. **Executive Summary**"
    if (/^\d+\.\s+\*\*/.test(trimmed)) {
      const label = trimmed.replace(/^\d+\.\s+/, '').replace(/\*\*/g, '');
      nodes.push(
        <h3 key={key++} className="text-sm font-semibold mt-5 mb-1.5" style={{ color: 'var(--text)' }}>
          {label}
        </h3>
      );
      i++; continue;
    }

    // Bullet list block
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const items: React.ReactNode[] = [];
      while (i < lines.length) {
        const t = lines[i].trim();
        if (!t.startsWith('- ') && !t.startsWith('* ')) break;
        items.push(
          <li key={i} className="flex gap-2 py-0.5">
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: 'var(--accent)' }} />
            <span>{inlineFormat(t.slice(2))}</span>
          </li>
        );
        i++;
      }
      nodes.push(
        <ul key={key++} className="space-y-0.5 mb-2" style={{ color: 'var(--text)', fontSize: '0.875rem', lineHeight: '1.6' }}>
          {items}
        </ul>
      );
      continue;
    }

    // Regular paragraph
    nodes.push(
      <p key={key++} className="text-sm leading-relaxed mb-3" style={{ color: 'var(--text)' }}>
        {inlineFormat(trimmed)}
      </p>
    );
    i++;
  }

  return nodes;
}

export default function DealNarrativeTab({ narrative, isStreaming }: Props) {
  if (!narrative && !isStreaming) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center" style={{ minHeight: 240 }}>
        <div className="w-10 h-10 rounded-full flex items-center justify-center mb-3" style={{ backgroundColor: 'rgba(59,130,246,0.1)' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--accent)' }}>
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <p className="text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>No AI Analysis Yet</p>
        <p className="text-xs" style={{ color: 'var(--muted)' }}>
          Click Analyze to generate an investment recommendation.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 220px)' }}>
      {/* Header bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(59,130,246,0.12)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--accent)' }}>
              <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 4v4l3 3" />
            </svg>
          </div>
          <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>AI Investment Analysis</span>
        </div>
        {isStreaming && (
          <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full" style={{ backgroundColor: 'rgba(59,130,246,0.1)', color: 'var(--accent)' }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: 'var(--accent)' }} />
            Generating...
          </span>
        )}
      </div>

      {/* Rendered content */}
      <div className="card" style={{ padding: '1.25rem 1.5rem' }}>
        {renderMarkdown(narrative)}
        {isStreaming && (
          <span
            className="inline-block w-0.5 h-4 ml-0.5 animate-pulse"
            style={{ backgroundColor: 'var(--accent)', verticalAlign: 'middle' }}
          />
        )}
      </div>
    </div>
  );
}
