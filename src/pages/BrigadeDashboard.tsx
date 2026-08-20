import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { getBrigade } from "@/lib/brigades";
import type { BrigadeCode } from "@/lib/brigades";
import {
  AlertTriangle, Car, FolderOpen, MapPin, Map, Users,
  Building2, ChevronLeft, Shield, Loader2,
} from "lucide-react";

const BRIGADE_CTX_KEY = "brigadeAdminContext";

interface Stats {
  safetyEvents: number;
  accidents: number;
  safetyFiles: number;
  drillLocations: number;
}

export default function BrigadeDashboard() {
  const { isBrigadeAdmin, brigade, role } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({ safetyEvents: 0, accidents: 0, safetyFiles: 0, drillLocations: 0 });
  const [loading, setLoading] = useState(true);

  const brigadeInfo = brigade ? getBrigade(brigade as BrigadeCode) : null;
  const brigadeName = brigadeInfo?.name ?? "חטיבה";

  useEffect(() => {
    if (!isBrigadeAdmin) { navigate("/"); return; }
    // Entering brigade dashboard → clear sub-context
    sessionStorage.removeItem(BRIGADE_CTX_KEY);
    sessionStorage.removeItem("maphatchDeptContext");
    if (brigade) fetchStats(brigade);
    else setLoading(false);
  }, [isBrigadeAdmin, brigade]);

  const fetchStats = async (b: string) => {
    setLoading(true);
    try {
      const results = await Promise.allSettled([
        supabase.from("safety_content").select("*", { count: "exact", head: true }).eq("brigade", b),
        supabase.from("accidents").select("*", { count: "exact", head: true }).eq("brigade", b),
        supabase.from("safety_files").select("*", { count: "exact", head: true }).eq("brigade", b),
        supabase.from("drill_locations").select("*", { count: "exact", head: true }).eq("brigade", b),
      ]);
      const get = (r: PromiseSettledResult<{ count: number | null }>) =>
        r.status === "fulfilled" ? (r.value.count ?? 0) : 0;
      setStats({
        safetyEvents: get(results[0] as PromiseSettledResult<{ count: number | null }>),
        accidents: get(results[1] as PromiseSettledResult<{ count: number | null }>),
        safetyFiles: get(results[2] as PromiseSettledResult<{ count: number | null }>),
        drillLocations: get(results[3] as PromiseSettledResult<{ count: number | null }>),
      });
    } catch {
      // stats stay at 0
    } finally {
      setLoading(false);
    }
  };

  const enterDept = (ctx: "planag" | "maphatch" | "battalion", path: string) => {
    sessionStorage.setItem(BRIGADE_CTX_KEY, ctx);
    if (ctx === "maphatch") sessionStorage.removeItem("maphatchDeptContext");
    navigate(path);
  };

  if (!isBrigadeAdmin) return null;

  const statCards = [
    { label: "אירועי בטיחות", value: stats.safetyEvents, color: "from-red-500 to-rose-600", icon: AlertTriangle, path: "/safety-events" },
    { label: "תאונות", value: stats.accidents, color: "from-orange-500 to-orange-700", icon: Car, path: "/accidents-tracking" },
    { label: "תיקי בטיחות", value: stats.safetyFiles, color: "from-amber-500 to-amber-700", icon: FolderOpen, path: "/safety-files" },
    { label: "נקודות תרגולות", value: stats.drillLocations, color: "from-emerald-500 to-teal-600", icon: MapPin, path: "/drill-locations" },
  ];

  const quickLinks = [
    { label: "הכר את הגזרה", path: "/know-the-area", icon: Map, color: "from-cyan-500 to-cyan-700" },
    { label: "ניהול משתמשי נהגים", path: "/users-management", icon: Users, color: "from-pink-500 to-pink-700" },
    { label: 'ניהול משתמשי גדוד תע"ם', path: "/battalion-users-management", icon: Users, color: "from-indigo-500 to-indigo-700" },
    { label: 'ניהול משתמשי מפח"ט', path: "/maphatch-users", icon: Users, color: "from-teal-500 to-teal-600" },
  ];

  const deptCards = [
    { label: 'פלנ"ג — מחלקת נהגים', sub: "מנהל, מ\"מים, נהגים", color: "from-blue-500 to-blue-700", ctx: "planag" as const, path: "/admin" },
    { label: 'מפח"ט', sub: "בחירת אגף", color: "from-emerald-500 to-teal-600", ctx: "maphatch" as const, path: "/maphatch-dept-selector" },
    { label: 'גדוד תע"ם', sub: "ניהול גדוד", color: "from-indigo-500 to-violet-700", ctx: "battalion" as const, path: "/battalion-users-management" },
  ];

  return (
    <AppLayout>
      <div className="p-4 max-w-2xl mx-auto pb-24" dir="rtl">
        {/* Brigade header */}
        <div className="mb-8 mt-2 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-gold via-gold-dark to-gold flex items-center justify-center shadow-xl flex-shrink-0">
            <Shield className="w-8 h-8 text-slate-900" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">{brigadeName}</h1>
            <p className="text-sm text-slate-400 font-medium">דשבורד מנהל חטיבה</p>
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          {statCards.map(({ label, value, color, icon: Icon, path }) => (
            <button
              key={label}
              onClick={() => navigate(path)}
              className="relative overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-800/60 p-4 text-right hover:border-slate-500 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              <div className={`absolute -top-4 -right-4 w-20 h-20 rounded-full bg-gradient-to-br ${color} opacity-20 blur-xl pointer-events-none`} />
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-3`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              {loading ? (
                <Loader2 className="w-6 h-6 animate-spin text-slate-400 mb-1" />
              ) : (
                <p className="text-2xl font-black text-white">{value}</p>
              )}
              <p className="text-xs text-slate-400 mt-0.5">{label}</p>
            </button>
          ))}
        </div>

        {/* Quick links */}
        <div className="mb-8">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">מודולי חטיבה</h2>
          <div className="space-y-2">
            {quickLinks.map(({ label, path, icon: Icon, color }) => (
              <button
                key={path}
                onClick={() => navigate(path)}
                className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/60 hover:border-slate-500 text-right transition-all group"
              >
                <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform`}>
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <span className="font-semibold text-slate-300 group-hover:text-white flex-1">{label}</span>
                <ChevronLeft className="w-4 h-4 text-slate-500 group-hover:-translate-x-0.5 transition-transform" />
              </button>
            ))}
          </div>
        </div>

        {/* Department switch */}
        <div>
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">כניסה למחלקה</h2>
          <div className="space-y-3">
            {deptCards.map(({ label, sub, color, ctx, path }) => (
              <button
                key={ctx}
                onClick={() => enterDept(ctx, path)}
                className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-slate-700/60 hover:border-slate-500/80 bg-slate-800/40 text-right transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] group"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                  <Building2 className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 text-right">
                  <p className="font-black text-white text-base">{label}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
                </div>
                <ChevronLeft className="w-5 h-5 text-slate-500 group-hover:text-white group-hover:-translate-x-1 transition-all" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
