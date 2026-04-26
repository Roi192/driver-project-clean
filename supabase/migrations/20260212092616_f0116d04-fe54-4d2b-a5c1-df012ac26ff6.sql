
-- Fix overly permissive RLS policies
DROP POLICY "Authenticated users can insert weekend weapon holders" ON public.weekend_weapon_holders;
DROP POLICY "Authenticated users can update weekend weapon holders" ON public.weekend_weapon_holders;
DROP POLICY "Authenticated users can delete weekend weapon holders" ON public.weekend_weapon_holders;

CREATE POLICY "Admins can insert weekend weapon holders"
ON public.weekend_weapon_holders FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hagmar_admin')
);

CREATE POLICY "Admins can update weekend weapon holders"
ON public.weekend_weapon_holders FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hagmar_admin')
);

CREATE POLICY "Admins can delete weekend weapon holders"
ON public.weekend_weapon_holders FOR DELETE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hagmar_admin')
);