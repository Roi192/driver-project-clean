-- Frameworks table: hierarchical structure for managing military units
-- brigade → battalion → company → sector → outpost

CREATE TABLE IF NOT EXISTS frameworks (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  type         text NOT NULL CHECK (type IN (
    'brigade', 'battalion', 'company', 'department',
    'sector', 'outpost', 'planag', 'other'
  )),
  brigade      text NOT NULL,
  parent_id    uuid REFERENCES frameworks(id) ON DELETE SET NULL,
  sector       text,
  department   text,
  description  text,
  is_active    boolean DEFAULT true,
  created_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS frameworks_brigade_idx ON frameworks(brigade);
CREATE INDEX IF NOT EXISTS frameworks_parent_id_idx ON frameworks(parent_id);
CREATE INDEX IF NOT EXISTS frameworks_type_idx ON frameworks(type);

ALTER TABLE frameworks ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read frameworks in their brigade
CREATE POLICY "frameworks_read" ON frameworks
  FOR SELECT USING (
    brigade = (SELECT brigade FROM profiles WHERE user_id = auth.uid() LIMIT 1)
    OR EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role IN ('super_admin', 'division_admin')
    )
  );

-- Admins can write frameworks for their brigade
CREATE POLICY "frameworks_write" ON frameworks
  FOR ALL USING (
    brigade = (SELECT brigade FROM profiles WHERE user_id = auth.uid() LIMIT 1)
    AND EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'super_admin', 'platoon_commander', 'division_admin')
    )
  );

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_frameworks_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER frameworks_updated_at
  BEFORE UPDATE ON frameworks
  FOR EACH ROW EXECUTE FUNCTION update_frameworks_updated_at();
