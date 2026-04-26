
-- 1. Add address to hagmar_soldiers
ALTER TABLE hagmar_soldiers ADD COLUMN IF NOT EXISTS address text;

-- 2. Weapon authorizations table
CREATE TABLE IF NOT EXISTS hagmar_weapon_authorizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  soldier_id uuid NOT NULL REFERENCES hagmar_soldiers(id) ON DELETE CASCADE,
  authorization_date date NOT NULL,
  expiry_date date,
  authorization_file_url text,
  signed_by text,
  is_active boolean DEFAULT true,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  notes text
);
ALTER TABLE hagmar_weapon_authorizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hagmar_weapon_auth_admin" ON hagmar_weapon_authorizations FOR ALL USING (has_role(auth.uid(), 'hagmar_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'hagmar_admin'::app_role));
CREATE POLICY "hagmar_weapon_auth_ravshatz_select" ON hagmar_weapon_authorizations FOR SELECT USING (has_role(auth.uid(), 'ravshatz'::app_role) AND soldier_id IN (SELECT hs.id FROM hagmar_soldiers hs WHERE hs.settlement IN (SELECT p.settlement FROM profiles p WHERE p.user_id = auth.uid())));
CREATE POLICY "hagmar_weapon_auth_ravshatz_manage" ON hagmar_weapon_authorizations FOR INSERT WITH CHECK (has_role(auth.uid(), 'ravshatz'::app_role) AND soldier_id IN (SELECT hs.id FROM hagmar_soldiers hs WHERE hs.settlement IN (SELECT p.settlement FROM profiles p WHERE p.user_id = auth.uid())));

-- 3. Shooting ranges table
CREATE TABLE IF NOT EXISTS hagmar_shooting_ranges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement text NOT NULL,
  range_date date NOT NULL,
  exercises text[],
  summary text,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  company text,
  region text
);
ALTER TABLE hagmar_shooting_ranges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hagmar_ranges_admin" ON hagmar_shooting_ranges FOR ALL USING (has_role(auth.uid(), 'hagmar_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'hagmar_admin'::app_role));
CREATE POLICY "hagmar_ranges_ravshatz_select" ON hagmar_shooting_ranges FOR SELECT USING (has_role(auth.uid(), 'ravshatz'::app_role) AND settlement IN (SELECT p.settlement FROM profiles p WHERE p.user_id = auth.uid()));
CREATE POLICY "hagmar_ranges_ravshatz_insert" ON hagmar_shooting_ranges FOR INSERT WITH CHECK (has_role(auth.uid(), 'ravshatz'::app_role) AND settlement IN (SELECT p.settlement FROM profiles p WHERE p.user_id = auth.uid()));

-- 4. Shooting scores per soldier
CREATE TABLE IF NOT EXISTS hagmar_shooting_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  range_id uuid NOT NULL REFERENCES hagmar_shooting_ranges(id) ON DELETE CASCADE,
  soldier_id uuid NOT NULL REFERENCES hagmar_soldiers(id) ON DELETE CASCADE,
  exercise_name text,
  hits integer DEFAULT 0,
  total_shots integer DEFAULT 0,
  score numeric,
  attended boolean DEFAULT true,
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE hagmar_shooting_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hagmar_scores_admin" ON hagmar_shooting_scores FOR ALL USING (has_role(auth.uid(), 'hagmar_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'hagmar_admin'::app_role));
CREATE POLICY "hagmar_scores_ravshatz_select" ON hagmar_shooting_scores FOR SELECT USING (has_role(auth.uid(), 'ravshatz'::app_role));
CREATE POLICY "hagmar_scores_ravshatz_insert" ON hagmar_shooting_scores FOR INSERT WITH CHECK (has_role(auth.uid(), 'ravshatz'::app_role));

-- 5. Settlement drills
CREATE TABLE IF NOT EXISTS hagmar_settlement_drills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement text NOT NULL,
  drill_date date NOT NULL,
  drill_content text,
  regional_force_participated boolean DEFAULT false,
  full_activation_drill boolean DEFAULT false,
  tzahi_activated boolean DEFAULT false,
  settlement_command_activated boolean DEFAULT false,
  settlement_commander_name text,
  participants uuid[],
  summary text,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  company text,
  region text
);
ALTER TABLE hagmar_settlement_drills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hagmar_drills_admin" ON hagmar_settlement_drills FOR ALL USING (has_role(auth.uid(), 'hagmar_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'hagmar_admin'::app_role));
CREATE POLICY "hagmar_drills_ravshatz_select" ON hagmar_settlement_drills FOR SELECT USING (has_role(auth.uid(), 'ravshatz'::app_role) AND settlement IN (SELECT p.settlement FROM profiles p WHERE p.user_id = auth.uid()));
CREATE POLICY "hagmar_drills_ravshatz_insert" ON hagmar_settlement_drills FOR INSERT WITH CHECK (has_role(auth.uid(), 'ravshatz'::app_role) AND settlement IN (SELECT p.settlement FROM profiles p WHERE p.user_id = auth.uid()));

-- 6. Simulator training
CREATE TABLE IF NOT EXISTS hagmar_simulator_training (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement text,
  training_date date NOT NULL,
  training_content text,
  commander_name text,
  participants uuid[],
  summary text,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  company text,
  region text
);
ALTER TABLE hagmar_simulator_training ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hagmar_sim_admin" ON hagmar_simulator_training FOR ALL USING (has_role(auth.uid(), 'hagmar_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'hagmar_admin'::app_role));
CREATE POLICY "hagmar_sim_ravshatz_select" ON hagmar_simulator_training FOR SELECT USING (has_role(auth.uid(), 'ravshatz'::app_role));

-- 7. Professional development
CREATE TABLE IF NOT EXISTS hagmar_professional_development (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dev_type text NOT NULL,
  event_date date NOT NULL,
  content text,
  attendees uuid[],
  summary text,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE hagmar_professional_development ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hagmar_pd_admin" ON hagmar_professional_development FOR ALL USING (has_role(auth.uid(), 'hagmar_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'hagmar_admin'::app_role));
CREATE POLICY "hagmar_pd_ravshatz_select" ON hagmar_professional_development FOR SELECT USING (has_role(auth.uid(), 'ravshatz'::app_role));

-- 8. Safety investigations
CREATE TABLE IF NOT EXISTS hagmar_safety_investigations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement text,
  investigation_date date NOT NULL,
  title text NOT NULL,
  description text,
  file_url text,
  photos text[],
  findings text,
  recommendations text,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  region text,
  company text
);
ALTER TABLE hagmar_safety_investigations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hagmar_inv_admin" ON hagmar_safety_investigations FOR ALL USING (has_role(auth.uid(), 'hagmar_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'hagmar_admin'::app_role));
CREATE POLICY "hagmar_inv_ravshatz_select" ON hagmar_safety_investigations FOR SELECT USING (has_role(auth.uid(), 'ravshatz'::app_role) AND settlement IN (SELECT p.settlement FROM profiles p WHERE p.user_id = auth.uid()));

-- 9. Equipment expected (admin defines per settlement)
CREATE TABLE IF NOT EXISTS hagmar_equipment_expected (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement text NOT NULL,
  item_name text NOT NULL,
  expected_quantity integer DEFAULT 0,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(settlement, item_name)
);
ALTER TABLE hagmar_equipment_expected ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hagmar_eq_exp_admin" ON hagmar_equipment_expected FOR ALL USING (has_role(auth.uid(), 'hagmar_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'hagmar_admin'::app_role));
CREATE POLICY "hagmar_eq_exp_ravshatz_select" ON hagmar_equipment_expected FOR SELECT USING (has_role(auth.uid(), 'ravshatz'::app_role) AND settlement IN (SELECT p.settlement FROM profiles p WHERE p.user_id = auth.uid()));

-- 10. Equipment reports (ravshatz reports actual + malfunctions)
CREATE TABLE IF NOT EXISTS hagmar_equipment_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement text NOT NULL,
  item_name text NOT NULL,
  actual_quantity integer DEFAULT 0,
  is_functional boolean DEFAULT true,
  malfunction_description text,
  reported_to text,
  report_date timestamptz,
  notes text,
  item_subtype text,
  reported_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE hagmar_equipment_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hagmar_eq_rep_admin" ON hagmar_equipment_reports FOR ALL USING (has_role(auth.uid(), 'hagmar_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'hagmar_admin'::app_role));
CREATE POLICY "hagmar_eq_rep_ravshatz" ON hagmar_equipment_reports FOR ALL USING (has_role(auth.uid(), 'ravshatz'::app_role) AND settlement IN (SELECT p.settlement FROM profiles p WHERE p.user_id = auth.uid())) WITH CHECK (has_role(auth.uid(), 'ravshatz'::app_role) AND settlement IN (SELECT p.settlement FROM profiles p WHERE p.user_id = auth.uid()));

-- 11. Security components per settlement
CREATE TABLE IF NOT EXISTS hagmar_security_components (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement text NOT NULL UNIQUE,
  defensive_security_type text,
  armored_vehicle boolean DEFAULT false,
  hailkis boolean DEFAULT false,
  command_center_type text,
  armory boolean DEFAULT false,
  sensors_data jsonb DEFAULT '[]',
  cameras_data jsonb DEFAULT '[]',
  fence_type text,
  security_gaps text,
  readiness_weights jsonb DEFAULT '{}',
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  region text,
  company text
);
ALTER TABLE hagmar_security_components ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hagmar_sec_admin" ON hagmar_security_components FOR ALL USING (has_role(auth.uid(), 'hagmar_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'hagmar_admin'::app_role));
CREATE POLICY "hagmar_sec_ravshatz_select" ON hagmar_security_components FOR SELECT USING (has_role(auth.uid(), 'ravshatz'::app_role) AND settlement IN (SELECT p.settlement FROM profiles p WHERE p.user_id = auth.uid()));

-- 12. Settlement defense files
CREATE TABLE IF NOT EXISTS hagmar_defense_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement text NOT NULL,
  file_url text,
  title text NOT NULL,
  description text,
  file_type text,
  uploaded_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE hagmar_defense_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hagmar_def_admin" ON hagmar_defense_files FOR ALL USING (has_role(auth.uid(), 'hagmar_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'hagmar_admin'::app_role));
CREATE POLICY "hagmar_def_ravshatz_select" ON hagmar_defense_files FOR SELECT USING (has_role(auth.uid(), 'ravshatz'::app_role) AND settlement IN (SELECT p.settlement FROM profiles p WHERE p.user_id = auth.uid()));