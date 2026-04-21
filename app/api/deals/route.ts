import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { DealInputs } from '@/lib/models/deal';

// GET /api/deals - list all deals for the current user
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('deals')
    .select('id, name, address, status, analysis, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const deals = (data ?? []).map((d: {
    id: string;
    name: string;
    address?: string;
    status: string;
    analysis: { score?: { total?: number } } | null;
    created_at: string;
  }) => ({
    id: d.id,
    name: d.name,
    address: d.address,
    status: d.status,
    dealScore: d.analysis?.score?.total ?? null,
    createdAt: d.created_at,
  }));

  return NextResponse.json({ deals });
}

// POST /api/deals - create a new deal (draft)
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json() as { name: string; address?: string; inputs?: DealInputs };
  const { name, address, inputs } = body;

  if (!name?.trim()) return NextResponse.json({ error: 'Deal name is required' }, { status: 400 });

  const { data, error } = await supabase
    .from('deals')
    .insert({
      user_id: user.id,
      name: name.trim(),
      address: address?.trim() || null,
      inputs: inputs ?? null,
      status: 'draft',
    })
    .select('id, name, address, status, created_at')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    deal: {
      id: data.id,
      name: data.name,
      address: data.address,
      status: data.status,
      dealScore: null,
      createdAt: data.created_at,
    },
  });
}
