import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Hook that returns the current user's settlement restriction for Ravshatz users.
 * - Ravshatz users are restricted to their own settlement.
 * - HAGMAR Admins and Super Admins see all settlements.
 * - Returns { userSettlement, isRestricted, loading }
 */
export function useHagmarSettlement() {
  const { user, isRavshatz, isHagmarAdmin, isSuperAdmin } = useAuth();
  const [userSettlement, setUserSettlement] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const isRestricted = isRavshatz && !isHagmarAdmin && !isSuperAdmin;

  useEffect(() => {
    const fetch = async () => {
      if (!user || !isRestricted) {
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("settlement")
        .eq("user_id", user.id)
        .maybeSingle();
      setUserSettlement(data?.settlement || null);
      setLoading(false);
    };
    fetch();
  }, [user, isRestricted]);

  return { userSettlement, isRestricted, loading };
}