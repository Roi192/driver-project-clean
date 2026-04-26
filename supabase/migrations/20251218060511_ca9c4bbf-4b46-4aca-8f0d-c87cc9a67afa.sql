-- Create work plan events table for annual Gantt chart
CREATE TABLE public.work_plan_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  event_date date NOT NULL,
  end_date date,
  attendees text[] DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  color text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create BOM (control & tracking) tasks table
CREATE TABLE public.bom_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  assigned_to text NOT NULL,
  due_date date NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.work_plan_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bom_tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for work_plan_events - Admin only
CREATE POLICY "Admins can view work plan events"
ON public.work_plan_events FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can create work plan events"
ON public.work_plan_events FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update work plan events"
ON public.work_plan_events FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete work plan events"
ON public.work_plan_events FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for bom_tasks - Admin only
CREATE POLICY "Admins can view bom tasks"
ON public.bom_tasks FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can create bom tasks"
ON public.bom_tasks FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update bom tasks"
ON public.bom_tasks FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete bom tasks"
ON public.bom_tasks FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Triggers for updated_at
CREATE TRIGGER update_work_plan_events_updated_at
BEFORE UPDATE ON public.work_plan_events
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bom_tasks_updated_at
BEFORE UPDATE ON public.bom_tasks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();