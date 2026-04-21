-- Deals: pre-acquisition underwriting records
CREATE TABLE deals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  address         TEXT,
  status          TEXT NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','analyzed','passed','converted')),
  inputs          JSONB,           -- DealInputs (user-provided deal data)
  analysis        JSONB,           -- DealAnalysis (computed metrics + pro forma + sensitivity)
  ai_narrative    TEXT,
  ai_analyzed_at  TIMESTAMPTZ,
  property_id     UUID REFERENCES properties(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Investor profile: one per user, reused across all deals
CREATE TABLE investor_profiles (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  tax_bracket         NUMERIC NOT NULL DEFAULT 0.24,
  target_cash_on_cash NUMERIC NOT NULL DEFAULT 0.08,
  target_irr          NUMERIC NOT NULL DEFAULT 0.12,
  risk_tolerance      TEXT NOT NULL DEFAULT 'moderate'
                        CHECK (risk_tolerance IN ('conservative','moderate','aggressive')),
  hold_period         INTEGER NOT NULL DEFAULT 10,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX deals_user_id_idx ON deals(user_id);
CREATE INDEX deals_status_idx  ON deals(user_id, status);

-- RLS
ALTER TABLE deals            ENABLE ROW LEVEL SECURITY;
ALTER TABLE investor_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deals_owner" ON deals
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "profiles_owner" ON investor_profiles
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
