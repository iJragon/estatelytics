import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getGroqClient, DEFAULT_MODEL } from '@/lib/agents/base';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { question, answer } = await request.json() as { question: string; answer: string };

    const groq = getGroqClient();
    const response = await groq.chat.completions.create({
      model: DEFAULT_MODEL,
      stream: false,
      messages: [
        {
          role: 'system',
          content: `You help real estate investors explore a property's financial statements.
Based on the last question and answer, suggest 3 short follow-up questions the investor might want to ask next.
Return ONLY a valid JSON array of 3 strings. No markdown, no explanation, just the array.
Keep each question under 90 characters. Make them specific and actionable.`,
        },
        {
          role: 'user',
          content: `Question: "${question}"\n\nAnswer: "${answer.slice(0, 500)}"\n\nSuggest 3 follow-up questions.`,
        },
      ],
      max_tokens: 200,
      temperature: 0.7,
    });

    const content = response.choices[0]?.message?.content ?? '[]';
    const match = content.match(/\[[\s\S]*\]/);
    const suggestions: string[] = match ? JSON.parse(match[0]) : [];
    return NextResponse.json({ suggestions: suggestions.slice(0, 3) });
  } catch {
    return NextResponse.json({ suggestions: [] });
  }
}
