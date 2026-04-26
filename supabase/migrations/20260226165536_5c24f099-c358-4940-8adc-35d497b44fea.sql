
-- Threat ratings table for manual threat scoring per settlement (by HAGMAR officer)
CREATE TABLE public.hagmar_threat_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement TEXT NOT NULL,
  village_proximity INTEGER NOT NULL DEFAULT 1 CHECK (village_proximity BETWEEN 1 AND 5),
  road_proximity INTEGER NOT NULL DEFAULT 1 CHECK (road_proximity BETWEEN 1 AND 5),
  topographic_vulnerability INTEGER NOT NULL DEFAULT 1 CHECK (topographic_vulnerability BETWEEN 1 AND 5),
  regional_alert_level INTEGER NOT NULL DEFAULT 1 CHECK (regional_alert_level BETWEEN 1 AND 5),
  notes TEXT,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(settlement)
);

ALTER TABLE public.hagmar_threat_ratings ENABLE ROW LEVEL SECURITY;

-- Only hagmar_admin and super_admin can manage threat ratings
CREATE POLICY "Hagmar admins can manage threat ratings"
  ON public.hagmar_threat_ratings
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'hagmar_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'hagmar_admin'));

-- Ravshatz can view their own settlement's threat rating
CREATE POLICY "Ravshatz can view own settlement threat rating"
  ON public.hagmar_threat_ratings
  FOR SELECT
  TO authenticated
  USING (
    settlement = (SELECT settlement FROM public.profiles WHERE user_id = auth.uid())
  );

-- Monthly inspection records for settlements
CREATE TABLE public.hagmar_settlement_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement TEXT NOT NULL,
  inspection_type TEXT NOT NULL DEFAULT 'monthly',
  inspection_date DATE NOT NULL DEFAULT CURRENT_DATE,
  inspector_name TEXT,
  findings TEXT,
  score INTEGER,
  status TEXT NOT NULL DEFAULT 'completed',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.hagmar_settlement_inspections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hagmar admins can manage inspections"
  ON public.hagmar_settlement_inspections
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'hagmar_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'hagmar_admin'));

CREATE POLICY "Ravshatz can view own settlement inspections"
  ON public.hagmar_settlement_inspections
  FOR SELECT
  TO authenticated
  USING (
    settlement = (SELECT settlement FROM public.profiles WHERE user_id = auth.uid())
  );

-- Ravshatz can insert inspections for own settlement
CREATE POLICY "Ravshatz can insert own settlement inspections"
  ON public.hagmar_settlement_inspections
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'ravshatz') AND
    settlement = (SELECT settlement FROM public.profiles WHERE user_id = auth.uid())
  );