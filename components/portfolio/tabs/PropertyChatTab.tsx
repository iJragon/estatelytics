'use client';

import { useState, useRef, useEffect } from 'react';
import type { AnalysisResult } from '@/lib/models/statement';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface PropertyChatTabProps {
  propertyName: string;
  analyses: AnalysisResult[];
  periods: string[];
}

function fmt$(val: number): string {
  const abs = Math.abs(val);
  const sign = val < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`;
  return `${sign}$${abs.toFixed(0)}`;
}

function buildPortfolioContext(propertyName: string, analyses: AnalysisResult[], periods: string[]): string {
  const lines: string[] = [];
  lines.push(`=== PROPERTY: ${propertyName} ===`);
  lines.push(`Periods analyzed: ${periods.join(', ')}`);
  lines.push('');

  for (let i = 0; i < analyses.length; i++) {
    const a = analyses[i];
    const label = periods[i] || a.statement.period;
    lines.push(`--- ${label} ---`);

    const kf = a.statement.keyFigures;
    const keys = [
      'gross_potential_rent', 'vacancy_loss', 'net_rental_revenue',
      'total_revenue', 'total_operating_expenses', 'noi',
      'total_payroll', 'management_fees', 'utilities',
      'real_estate_taxes', 'insurance', 'net_income', 'cash_flow',
    ];
    for (const key of keys) {
      const row = kf[key];
      if (row?.annualTotal !== undefined && row.annualTotal !== null) {
        lines.push(`  ${row.label}: ${fmt$(row.annualTotal)}`);
      }
    }

    const r = a.ratios;
    lines.push(`  OER: ${r.oer.value !== null ? r.oer.value.toFixed(1) + '%' : 'N/A'} [${r.oer.status}]`);
    lines.push(`  NOI Margin: ${r.noiMargin.value !== null ? r.noiMargin.value.toFixed(1) + '%' : 'N/A'} [${r.noiMargin.status}]`);
    lines.push(`  Vacancy Rate: ${r.vacancyRate.value !== null ? r.vacancyRate.value.toFixed(1) + '%' : 'N/A'} [${r.vacancyRate.status}]`);
    lines.push(`  Payroll %: ${r.payrollPct.value !== null ? r.payrollPct.value.toFixed(1) + '%' : 'N/A'} [${r.payrollPct.status}]`);
    lines.push('');
  }

  return lines.join('\n');
}

const SUGGESTED_QUESTIONS = [
  'What drove the biggest changes in NOI across periods?',
  'How has vacancy trended and what is the impact on revenue?',
  'Compare expense growth to revenue growth across all periods.',
  'Which period performed best and why?',
  'What are the key risks to NOI going forward?',
];

export default function PropertyChatTab({ propertyName, analyses, periods }: PropertyChatTabProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const context = buildPortfolioContext(propertyName, analyses, periods);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function send() {
    const question = input.trim();
    if (!question || loading) return;

    const userMsg: Message = { role: 'user', content: question };
    const history = messages.map(m => ({ role: m.role, content: m.content }));
    const newMessages = [...messages, userMsg];
    setMessages([...newMessages, { role: 'assistant', content: '' }]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, history, context, groundingData: context }),
      });

      if (!res.ok) throw new Error('Chat request failed');
      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response stream');

      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'assistant', content: accumulated };
          return updated;
        });
      }
    } catch {
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: 'assistant', content: 'Something went wrong. Please try again.' };
        return updated;
      });
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function useSuggested(q: string) {
    setInput(q);
    inputRef.current?.focus();
  }

  return (
    <div className="flex flex-col" style={{ height: '100%', minHeight: 0 }}>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 pb-4" style={{ minHeight: 0 }}>
        {messages.length === 0 ? (
          <div className="text-center py-10">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: 'rgba(59,130,246,0.1)' }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'var(--accent)' }}>
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <p className="text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>
              Ask about {propertyName}
            </p>
            <p className="text-xs mb-5" style={{ color: 'var(--muted)' }}>
              I have full access to {periods.length} period{periods.length !== 1 ? 's' : ''} of financial data ({periods.join(', ')}).
            </p>
            <div className="flex flex-col gap-2 items-center">
              {SUGGESTED_QUESTIONS.map(q => (
                <button
                  key={q}
                  onClick={() => useSuggested(q)}
                  className="text-xs px-4 py-2 rounded-lg border transition-opacity hover:opacity-70 max-w-sm text-left w-full"
                  style={{ borderColor: 'var(--border)', color: 'var(--muted)', backgroundColor: 'var(--surface)' }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, i) => {
            const isUser = msg.role === 'user';
            const isStreaming = loading && i === messages.length - 1 && !isUser && !msg.content;
            return (
              <div key={i} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                <div
                  className="max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed"
                  style={{
                    backgroundColor: isUser ? 'var(--accent)' : 'var(--surface)',
                    color: isUser ? 'white' : 'var(--text)',
                    border: isUser ? 'none' : '1px solid var(--border)',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {isStreaming ? (
                    <span className="inline-flex items-center gap-1.5">
                      {[0, 0.15, 0.3].map((delay, j) => (
                        <span
                          key={j}
                          className="inline-block w-1.5 h-1.5 rounded-full animate-pulse"
                          style={{ backgroundColor: 'var(--muted)', animationDelay: `${delay}s` }}
                        />
                      ))}
                    </span>
                  ) : msg.content}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={e => { e.preventDefault(); send(); }}
        className="flex gap-2 pt-3 border-t flex-shrink-0"
        style={{ borderColor: 'var(--border)' }}
      >
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={`Ask about ${propertyName}…`}
          className="flex-1 input-field text-sm"
          style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
          disabled={loading}
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="btn-primary px-4 py-2 text-sm flex-shrink-0 disabled:opacity-50"
        >
          {loading ? (
            <span className="inline-block w-4 h-4 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }} />
          ) : 'Send'}
        </button>
      </form>
    </div>
  );
}
