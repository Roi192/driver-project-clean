-- Block direct writes to user_roles from authenticated clients.
--
-- All role changes MUST go through Edge Functions (service role),
-- which bypass RLS automatically. This closes the privilege-escalation
-- window where an admin with a valid JWT could directly UPDATE user_roles
-- without going through the permission matrix in update-user-admin.
--
-- Unaffected paths:
--   handle_new_user trigger → SECURITY DEFINER → bypasses RLS
--   update-user-admin Edge Function → SERVICE ROLE → bypasses RLS
--   delete-user Edge Function → SERVICE ROLE → bypasses RLS
--
-- Remaining READ policies (SELECT only) are preserved:
--   "Users can view own role"          — users can read their own row
--   "Admins can view all roles"        — admin/brigade_admin SELECT
--   "user_roles_brigade_scope_restrict" — RESTRICTIVE brigade scoping

DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
