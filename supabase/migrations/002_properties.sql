-- Properties table: one per named property (e.g., "Oak Park Apartments")
CREATE TABLE IF NOT EXISTS public.properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  portfolio_summary TEXT,
  portfolio_analyzed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their own properties"
  ON public.properties
  FOR ALL
  USING (auth.uid() = user_id);

CREATE INDEX properties_user_id_idx ON public.properties(user_id);

-- Join table linking properties to individual statement analyses
CREATE TABLE IF NOT EXISTS public.property_statements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  analysis_id UUID NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
  year_label TEXT, -- user-supplied label e.g. "2023" or "Jan-Sep 2024"
  added_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(property_id, analysis_id)
);

ALTER TABLE public.property_statements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access property_statements of their own properties"
  ON public.property_statements
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.properties
      WHERE properties.id = property_statements.property_id
        AND properties.user_id = auth.uid()
    )
  );

CREATE INDEX property_statements_property_id_idx ON public.property_statements(property_id);
