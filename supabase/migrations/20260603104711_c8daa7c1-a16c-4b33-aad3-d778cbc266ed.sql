
-- ============================================================
-- Security fixes: tighten policies for exposed/misconfigured tables and storage
-- ============================================================

-- 1) push_notifications_log: remove public read, restrict to admins
DROP POLICY IF EXISTS "Allow viewing push notification logs" ON public.push_notifications_log;

CREATE POLICY "Admins can view push notifications log"
ON public.push_notifications_log
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'hagmar_admin'::app_role)
  OR has_role(auth.uid(), 'platoon_commander'::app_role)
);

-- 2) sms_notifications_log: add explicit write restrictions (admin only)
CREATE POLICY "Admins can insert sms_notifications_log"
ON public.sms_notifications_log
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
);

CREATE POLICY "Admins can update sms_notifications_log"
ON public.sms_notifications_log
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
);

CREATE POLICY "Admins can delete sms_notifications_log"
ON public.sms_notifications_log
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
);

-- 3) weekend_weapon_holders: drop broken self-service policies that compared
--    soldier_id (a soldiers.id) to auth.uid() (an auth.users.id). They never
--    matched, so they granted nothing and only confused the policy surface.
--    Admin policies remain for legitimate management.
DROP POLICY IF EXISTS "Users can delete own weapon holder record" ON public.weekend_weapon_holders;
DROP POLICY IF EXISTS "Users can insert own weapon holder record" ON public.weekend_weapon_holders;
DROP POLICY IF EXISTS "Users can update own weapon holder record" ON public.weekend_weapon_holders;

-- 4) profiles: allow platoon_commander and battalion_admin to read profiles
--    within their own brigade so joins resolve in other tables' policies.
CREATE POLICY "Commanders can view brigade profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  (
    has_role(auth.uid(), 'platoon_commander'::app_role)
    OR has_role(auth.uid(), 'battalion_admin'::app_role)
    OR has_role(auth.uid(), 'division_admin'::app_role)
  )
  AND brigade = get_user_brigade(auth.uid())
);

-- 5) Storage: cleaning-parades — restrict uploads to admins/commanders
DROP POLICY IF EXISTS "Authenticated users can upload cleaning parade photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload to cleaning-parades" ON storage.objects;

CREATE POLICY "Admins and commanders can upload cleaning parade photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'cleaning-parades'
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'platoon_commander'::app_role)
    OR has_role(auth.uid(), 'driver'::app_role)
  )
);

-- 6) Storage: content-images — remove unrestricted upload (admin-only INSERT
--    policy already exists).
DROP POLICY IF EXISTS "Authenticated users can upload to content-images" ON storage.objects;