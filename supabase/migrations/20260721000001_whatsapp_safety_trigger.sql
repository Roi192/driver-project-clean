-- Enable pg_net for outbound HTTP from triggers
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Persist WhatsApp Baileys session so the bot survives Render.com restarts
CREATE TABLE IF NOT EXISTS public.whatsapp_session (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.whatsapp_session ENABLE ROW LEVEL SECURITY;
-- No public policies: only service_role (used by the Baileys service) can read/write

-- Trigger function: call Edge Function whenever a new safety event is inserted
CREATE OR REPLACE FUNCTION public.notify_safety_whatsapp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM net.http_post(
    url     := 'https://pjmkseotrbwinfzyzoaj.supabase.co/functions/v1/send-safety-whatsapp',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqbWtzZW90cmJ3aW5menl6b2FqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyODYzMjgsImV4cCI6MjA4MDg2MjMyOH0.QiT9RStwNE7LfgDQjM0IL5dW4DBJf0dKvFdV-mfPYxQ'
    ),
    body    := to_jsonb(NEW),
    timeout_milliseconds := 8000
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER safety_content_whatsapp_trigger
  AFTER INSERT ON public.safety_content
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_safety_whatsapp();
