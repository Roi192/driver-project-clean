
-- Drop overly permissive policies
DROP POLICY IF EXISTS "Authenticated users can view their subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Authenticated users can insert their subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Authenticated users can update their subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Authenticated users can delete their subscriptions" ON public.push_subscriptions;

-- Create owner-scoped policies
CREATE POLICY "Users can view own push subscriptions"
ON public.push_subscriptions FOR SELECT
USING (
  user_id = auth.uid()
  OR soldier_id IN (
    SELECT s.id FROM soldiers s
    JOIN profiles p ON p.personal_number = s.personal_number
    WHERE p.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert own push subscriptions"
ON public.push_subscriptions FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  OR soldier_id IN (
    SELECT s.id FROM soldiers s
    JOIN profiles p ON p.personal_number = s.personal_number
    WHERE p.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update own push subscriptions"
ON public.push_subscriptions FOR UPDATE
USING (
  user_id = auth.uid()
  OR soldier_id IN (
    SELECT s.id FROM soldiers s
    JOIN profiles p ON p.personal_number = s.personal_number
    WHERE p.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete own push subscriptions"
ON public.push_subscriptions FOR DELETE
USING (
  user_id = auth.uid()
  OR soldier_id IN (
    SELECT s.id FROM soldiers s
    JOIN profiles p ON p.personal_number = s.personal_number
    WHERE p.user_id = auth.uid()
  )
);