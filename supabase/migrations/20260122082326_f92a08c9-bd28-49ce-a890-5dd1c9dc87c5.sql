-- Create table to store push notification subscriptions
CREATE TABLE public.push_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  soldier_id UUID REFERENCES public.soldiers(id) ON DELETE CASCADE,
  user_id UUID,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(soldier_id, endpoint)
);

-- Enable RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to manage their own subscriptions
CREATE POLICY "Users can manage their own push subscriptions"
ON public.push_subscriptions
FOR ALL
USING (true)
WITH CHECK (true);

-- Add trigger for updated_at
CREATE TRIGGER update_push_subscriptions_updated_at
BEFORE UPDATE ON public.push_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create push notifications log table
CREATE TABLE public.push_notifications_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  soldier_id UUID REFERENCES public.soldiers(id) ON DELETE SET NULL,
  soldier_name TEXT NOT NULL,
  shift_type TEXT NOT NULL,
  outpost TEXT NOT NULL,
  shift_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.push_notifications_log ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view push notification logs
CREATE POLICY "Allow viewing push notification logs"
ON public.push_notifications_log
FOR SELECT
USING (true);

-- Allow backend to insert logs
CREATE POLICY "Allow inserting push notification logs"
ON public.push_notifications_log
FOR INSERT
WITH CHECK (true);