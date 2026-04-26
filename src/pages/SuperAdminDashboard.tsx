import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Car, Shield, AlertTriangle, FileSearch, Gavel, UserCheck, ClipboardCheck } from "lucide-react";

const SuperAdminDashboard = () => {
  const { isSuperAdmin, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isSuperAdmin) {
      navigate("/", { replace: true });
    }
  }, [loading, isSuperAdmin, navigate]);

  // Fetch summary stats
  const { data: soldiersCount } = useQuery({
    queryKey: ["super-admin-soldiers-count"],
    queryFn: async () => {
      const { count } = await supabase.from("soldiers").select("*", { count: "exact", head: true });
      return count || 0;
    },
  });

  const { data: profilesCount } = useQuery({
    queryKey: ["super-admin-profiles-count"],
    queryFn: async () => {
      const { count } = await supabase.from("profiles").select("*", { count: "exact", head: true });
      return count || 0;
    },
  });

  const { data: accidentsCount } = useQuery({
    queryKey: ["super-admin-open-accidents"],
    queryFn: async () => {
      const { count } = await supabase.from("accidents").select("*", { count: "exact", head: true }).eq("status", "open");
      return count || 0;
    },
  });

  const { data: inspectionsCount } = useQuery({
    queryKey: ["super-admin-inspections-month"],
    queryFn: async () => {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const { count } = await supabase.from("inspections").select("*", { count: "exact", head: true }).gte("inspection_date", startOfMonth.toISOString());
      return count || 0;
    },
  });

  const { data: punishmentsCount } = useQuery({
    queryKey: ["super-admin-punishments-month"],
    queryFn: async () => {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const { count } = await supabase.from("punishments").select("*", { count: "exact", head: true }).gte("punishment_date", startOfMonth.toISOString());
      return count || 0;
    },
  });

  const { data: hagmarUsersCount } = useQuery({
    queryKey: ["super-admin-hagmar-users"],
    queryFn: async () => {
      const { count } = await supabase.from("profiles").select("*", { count: "exact", head: true }).eq("department", "hagmar");
      return count || 0;
    },
  });

  const stats = [
    { label: "נהגים רשומים", value: soldiersCount ?? "—", icon: Car, gradient: "from-primary to-teal", description: "מחלקת נהגים" },
    { label: "משתמשים רשומים", value: profilesCount ?? "—", icon: Users, gradient: "from-blue-500 to-blue-600", description: "כלל המערכת" },
    { label: "משתמשי הגמ\"ר", value: hagmarUsersCount ?? "—", icon: Shield, gradient: "from-amber-500 to-orange-500", description: "מחלקת הגמ\"ר" },
    { label: "תאונות פתוחות", value: accidentsCount ?? "—", icon: AlertTriangle, gradient: "from-red-500 to-red-600", description: "דורשות טיפול" },
    { label: "ביקורות החודש", value: inspectionsCount ?? "—", icon: FileSearch, gradient: "from-indigo-500 to-indigo-600", description: "חודש נוכחי" },
    { label: "עונשים החודש", value: punishmentsCount ?? "—", icon: Gavel, gradient: "from-rose-500 to-rose-600", description: "חודש נוכחי" },
  ];

  if (loading) {
    return (
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-4 pb-24 space-y-6" dir="rtl">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-black text-foreground">דשבורד מנהל ראשי</h1>
          <p className="text-sm text-muted-foreground">סקירה כוללת של כלל המחלקות</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label} className="bg-card border-border/50 overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-lg`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  <div className="text-3xl font-black text-foreground">{stat.value}</div>
                  <div className="text-sm font-bold text-foreground/80 mt-1">{stat.label}</div>
                  <div className="text-xs text-muted-foreground">{stat.description}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Quick Navigation */}
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-bold text-foreground">גישה מהירה למחלקות</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <button
              onClick={() => navigate("/planag")}
              className="flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/30 hover:border-primary/60 transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-teal flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <Car className="w-6 h-6 text-white" />
              </div>
              <div className="text-right">
                <div className="font-bold text-foreground text-sm">פלנ"ג</div>
                <div className="text-xs text-muted-foreground">מחלקת נהגים</div>
              </div>
            </button>

            <button
              onClick={() => navigate("/hagmar")}
              className="flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 to-amber-500/5 border border-amber-500/30 hover:border-amber-500/60 transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div className="text-right">
                <div className="font-bold text-foreground text-sm">הגמ"ר</div>
                <div className="text-xs text-muted-foreground">הגנת המרחב</div>
              </div>
            </button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default SuperAdminDashboard;