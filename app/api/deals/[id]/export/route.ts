import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { exportDealToExcel, exportDealToPDF } from '@/lib/export/deal-export';
import type { Deal } from '@/lib/models/deal';

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/deals/[id]/export?format=excel|pdf
export async function GET(req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const format = req.nextUrl.searchParams.get('format') ?? 'excel';

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('deals')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
  }
  if (!data.analysis) {
    return NextResponse.json({ error: 'Deal has no analysis yet. Run Analyze first.' }, { status: 400 });
  }

  const deal: Deal = {
    id: data.id,
    name: data.name,
    address: data.address,
    status: data.status,
    inputs: data.inputs,
    analysis: data.analysis,
    aiNarrative: data.ai_narrative,
    aiAnalyzedAt: data.ai_analyzed_at,
    propertyId: data.property_id,
    createdAt: data.created_at,
    dealScore: data.analysis?.score?.total ?? undefined,
  };

  const safeName = deal.name.replace(/[^a-z0-9_\-. ]/gi, '_').slice(0, 60);

  if (format === 'pdf') {
    const buf = await exportDealToPDF(deal);
    const uint8 = new Uint8Array(buf);
    return new NextResponse(uint8, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${safeName}.pdf"`,
        'Content-Length': String(uint8.length),
      },
    });
  }

  // Default: Excel
  const buf = exportDealToExcel(deal);
  const uint8 = new Uint8Array(buf);
  return new NextResponse(uint8, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${safeName}.xlsx"`,
      'Content-Length': String(uint8.length),
    },
  });
}
