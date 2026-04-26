-- Fix overly permissive RLS policies for push_subscriptions
DROP POLICY IF EXISTS "Users can manage their own push subscriptions" ON public.push_subscriptions;

-- More restrictive policies for push_subscriptions
CREATE POLICY "Authenticated users can insert their subscriptions"
ON public.push_subscriptions
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can view their subscriptions"
ON public.push_subscriptions
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update their subscriptions"
ON public.push_subscriptions
FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete their subscriptions"
ON public.push_subscriptions
FOR DELETE
USING (auth.uid() IS NOT NULL);

-- Fix overly permissive RLS policy for push_notifications_log INSERT
DROP POLICY IF EXISTS "Allow inserting push notification logs" ON public.push_notifications_log;