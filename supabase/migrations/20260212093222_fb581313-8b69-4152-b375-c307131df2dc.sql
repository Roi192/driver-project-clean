
-- Allow regular users to insert their own weapon holder record
CREATE POLICY "Users can insert own weapon holder record"
ON public.weekend_weapon_holders FOR INSERT TO authenticated
WITH CHECK (soldier_id = auth.uid());

-- Allow regular users to update their own record
CREATE POLICY "Users can update own weapon holder record"
ON public.weekend_weapon_holders FOR UPDATE TO authenticated
USING (soldier_id = auth.uid());

-- Allow regular users to delete their own record
CREATE POLICY "Users can delete own weapon holder record"
ON public.weekend_weapon_holders FOR DELETE TO authenticated
USING (soldier_id = auth.uid());