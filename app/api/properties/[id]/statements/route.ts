import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST /api/properties/[id]/statements — add a statement to a property
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: propertyId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Verify property belongs to user
  const { data: prop } = await supabase
    .from('properties')
    .select('id')
    .eq('id', propertyId)
    .eq('user_id', user.id)
    .single();
  if (!prop) return NextResponse.json({ error: 'Property not found' }, { status: 404 });

  const { analysisId, yearLabel } = await request.json() as {
    analysisId: string;
    yearLabel?: string;
  };

  // Verify the analysis belongs to the user
  const { data: analysis } = await supabase
    .from('analyses')
    .select('id, period')
    .eq('id', analysisId)
    .eq('user_id', user.id)
    .single();
  if (!analysis) return NextResponse.json({ error: 'Analysis not found' }, { status: 404 });

  const { data, error } = await supabase
    .from('property_statements')
    .insert({
      property_id: propertyId,
      analysis_id: analysisId,
      year_label: yearLabel?.trim() || analysis.period || '',
    })
    .select('id, analysis_id, year_label, added_at')
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'This statement is already linked to this property' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ statement: data });
}
