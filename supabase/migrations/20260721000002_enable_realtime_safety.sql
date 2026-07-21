-- Enable Realtime on safety_content so the WhatsApp bot receives INSERT events
ALTER PUBLICATION supabase_realtime ADD TABLE public.safety_content;
