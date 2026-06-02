import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface BrigadeOutpost {
  id: string;
  brigade: string;
  name: string;
  region: string | null;
}

/**
 * Fetches outposts for the current user's brigade (or a specific brigade if provided).
 * Division admins / super admins see all brigades when no `brigade` is passed.
 */
export function useBrigadeOutposts(brigadeOverride?: string | null) {
  const { brigade: myBrigade, isDivisionAdmin } = useAuth();
  const targetBrigade = brigadeOverride ?? myBrigade ?? null;
  const [outposts, setOutposts] = useState<BrigadeOutpost[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOutposts = useCallback(async () => {
    setLoading(true);
    let query = supabase.from("brigade_outposts" as any).select("*").order("name");
    // If a specific brigade is requested, always filter to it.
    // Otherwise, division admins see all; everyone else sees their own brigade.
    if (brigadeOverride) {
      query = query.eq("brigade", brigadeOverride);
    } else if (!isDivisionAdmin && targetBrigade) {
      query = query.eq("brigade", targetBrigade);
    }
    const { data, error } = await query;
    if (!error && data) {
      setOutposts(data as any as BrigadeOutpost[]);
    } else {
      setOutposts([]);
    }
    setLoading(false);
  }, [brigadeOverride, isDivisionAdmin, targetBrigade]);

  useEffect(() => {
    fetchOutposts();
  }, [fetchOutposts]);

  return { outposts, loading, refetch: fetchOutposts, brigade: targetBrigade };
}