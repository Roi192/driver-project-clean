-- Auto-fill brigade column from the inserting user's profile so every operational
-- record is correctly scoped to its brigade, preventing cross-brigade data leaks.

CREATE TRIGGER auto_fill_brigade_shift_reports
  BEFORE INSERT ON public.shift_reports
  FOR EACH ROW EXECUTE FUNCTION public.auto_fill_brigade();

CREATE TRIGGER auto_fill_brigade_trip_forms
  BEFORE INSERT ON public.trip_forms
  FOR EACH ROW EXECUTE FUNCTION public.auto_fill_brigade();

CREATE TRIGGER auto_fill_brigade_procedure_signatures
  BEFORE INSERT ON public.procedure_signatures
  FOR EACH ROW EXECUTE FUNCTION public.auto_fill_brigade();

CREATE TRIGGER auto_fill_brigade_cleaning_parade_submissions
  BEFORE INSERT ON public.cleaning_parade_submissions
  FOR EACH ROW EXECUTE FUNCTION public.auto_fill_brigade();

CREATE TRIGGER auto_fill_brigade_cleaning_checklist_completions
  BEFORE INSERT ON public.cleaning_checklist_completions
  FOR EACH ROW EXECUTE FUNCTION public.auto_fill_brigade();

CREATE TRIGGER auto_fill_brigade_cleaning_checklist_items
  BEFORE INSERT ON public.cleaning_checklist_items
  FOR EACH ROW EXECUTE FUNCTION public.auto_fill_brigade();

CREATE TRIGGER auto_fill_brigade_cleaning_manual_assignments
  BEFORE INSERT ON public.cleaning_manual_assignments
  FOR EACH ROW EXECUTE FUNCTION public.auto_fill_brigade();

CREATE TRIGGER auto_fill_brigade_cleaning_item_assignments
  BEFORE INSERT ON public.cleaning_item_assignments
  FOR EACH ROW EXECUTE FUNCTION public.auto_fill_brigade();

CREATE TRIGGER auto_fill_brigade_cleaning_reference_photos
  BEFORE INSERT ON public.cleaning_reference_photos
  FOR EACH ROW EXECUTE FUNCTION public.auto_fill_brigade();

CREATE TRIGGER auto_fill_brigade_cleaning_parades
  BEFORE INSERT ON public.cleaning_parades
  FOR EACH ROW EXECUTE FUNCTION public.auto_fill_brigade();

CREATE TRIGGER auto_fill_brigade_cleaning_parade_config
  BEFORE INSERT ON public.cleaning_parade_config
  FOR EACH ROW EXECUTE FUNCTION public.auto_fill_brigade();