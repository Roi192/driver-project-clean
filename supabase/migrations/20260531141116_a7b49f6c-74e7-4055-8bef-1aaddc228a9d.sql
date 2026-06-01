
-- Soldier Warnings
CREATE TABLE public.soldier_warnings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  soldier_id UUID NOT NULL,
  category TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'minor',
  event_date DATE NOT NULL DEFAULT CURRENT_DATE,
  action_taken TEXT,
  description TEXT,
  attachment_path TEXT,
  signature_data TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.soldier_warnings TO authenticated;
GRANT ALL ON public.soldier_warnings TO service_role;

ALTER TABLE public.soldier_warnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and commanders can view warnings" ON public.soldier_warnings FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'platoon_commander'));
CREATE POLICY "Admins and commanders can insert warnings" ON public.soldier_warnings FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'platoon_commander'));
CREATE POLICY "Admins and commanders can update warnings" ON public.soldier_warnings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'platoon_commander'));
CREATE POLICY "Admins and commanders can delete warnings" ON public.soldier_warnings FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'platoon_commander'));

CREATE TRIGGER trg_soldier_warnings_updated
  BEFORE UPDATE ON public.soldier_warnings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_soldier_warnings_soldier ON public.soldier_warnings(soldier_id);
CREATE INDEX idx_soldier_warnings_category ON public.soldier_warnings(category);

-- Tasks
CREATE TABLE public.company_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  task_type TEXT NOT NULL DEFAULT 'one_time',
  recurrence TEXT,
  target_audience TEXT NOT NULL DEFAULT 'all',
  department TEXT,
  due_date DATE,
  parent_task_id UUID REFERENCES public.company_tasks(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_tasks TO authenticated;
GRANT ALL ON public.company_tasks TO service_role;

ALTER TABLE public.company_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and commanders can view tasks" ON public.company_tasks FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'platoon_commander'));
CREATE POLICY "Admins and commanders can insert tasks" ON public.company_tasks FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'platoon_commander'));
CREATE POLICY "Admins and commanders can update tasks" ON public.company_tasks FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'platoon_commander'));
CREATE POLICY "Admins and commanders can delete tasks" ON public.company_tasks FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'platoon_commander'));

CREATE TRIGGER trg_company_tasks_updated
  BEFORE UPDATE ON public.company_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Task Completions
CREATE TABLE public.task_completions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.company_tasks(id) ON DELETE CASCADE,
  soldier_id UUID NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (task_id, soldier_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_completions TO authenticated;
GRANT ALL ON public.task_completions TO service_role;

ALTER TABLE public.task_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and commanders can view completions" ON public.task_completions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'platoon_commander'));
CREATE POLICY "Admins and commanders can insert completions" ON public.task_completions FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'platoon_commander'));
CREATE POLICY "Admins and commanders can update completions" ON public.task_completions FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'platoon_commander'));
CREATE POLICY "Admins and commanders can delete completions" ON public.task_completions FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'platoon_commander'));

CREATE INDEX idx_task_completions_task ON public.task_completions(task_id);

-- Custom audience assignments
CREATE TABLE public.task_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.company_tasks(id) ON DELETE CASCADE,
  soldier_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (task_id, soldier_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_assignments TO authenticated;
GRANT ALL ON public.task_assignments TO service_role;

ALTER TABLE public.task_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and commanders can view assignments" ON public.task_assignments FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'platoon_commander'));
CREATE POLICY "Admins and commanders can insert assignments" ON public.task_assignments FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'platoon_commander'));
CREATE POLICY "Admins and commanders can delete assignments" ON public.task_assignments FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'platoon_commander'));