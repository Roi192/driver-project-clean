import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Framework {
  id: string;
  name: string;
  type: "brigade" | "battalion" | "company" | "department" | "sector" | "outpost" | "planag" | "other";
  brigade: string;
  parent_id: string | null;
  sector: string | null;
  department: string | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

export const FRAMEWORK_TYPE_LABELS: Record<Framework["type"], string> = {
  brigade: "חטיבה",
  battalion: "גדוד",
  company: "פלוגה",
  department: "מחלקה",
  sector: "גזרה",
  outpost: "מוצב",
  planag: 'פלנ"ג',
  other: "אחר",
};

export function useFrameworks(brigadeFilter?: string) {
  const queryClient = useQueryClient();

  const { data: frameworks = [], isLoading } = useQuery({
    queryKey: ["frameworks", brigadeFilter],
    queryFn: async () => {
      let q = supabase.from("frameworks" as any).select("*").order("type").order("name");
      if (brigadeFilter) {
        q = q.eq("brigade", brigadeFilter);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as Framework[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (input: Omit<Framework, "id" | "created_at" | "is_active">) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("frameworks" as any)
        .insert({ ...input, is_active: true, created_by: user?.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["frameworks"] });
      toast.success("המסגרת נוספה בהצלחה");
    },
    onError: () => toast.error("שגיאה בהוספת המסגרת"),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...input }: Partial<Framework> & { id: string }) => {
      const { error } = await supabase
        .from("frameworks" as any)
        .update(input)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["frameworks"] });
      toast.success("המסגרת עודכנה בהצלחה");
    },
    onError: () => toast.error("שגיאה בעדכון המסגרת"),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("frameworks" as any)
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["frameworks"] });
    },
    onError: () => toast.error("שגיאה בשינוי סטטוס המסגרת"),
  });

  // Build a hierarchical tree
  const rootFrameworks = frameworks.filter((f) => !f.parent_id && f.is_active);
  const getChildren = (parentId: string) =>
    frameworks.filter((f) => f.parent_id === parentId && f.is_active);

  return {
    frameworks,
    isLoading,
    rootFrameworks,
    getChildren,
    create: createMutation.mutate,
    update: updateMutation.mutate,
    toggleActive: toggleActiveMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
  };
}
