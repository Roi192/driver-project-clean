import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { BRIGADES, BRIGADE_CODES, BrigadeCode } from "@/lib/brigades";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Shield,
  AlertTriangle,
  Car,
  Users,
  Sparkles,
  ChevronLeft,
  TrendingUp,
  TrendingDown,
  Map as MapIcon,
  FileSpreadsheet,
  Building2,
  Gauge,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";

interface BrigadeStats {
  code: BrigadeCode;
  safetyEventsMonth: number;
  accidentsMonth: number;
  activeSoldiers: number;
  paradesWeek: number;
  unfit: number;
  militarySoon: number;
  noDefensive: number;
  score: number; // 0..100
}

const startOfMonthIso = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
};

const startOfWeekIso = () => {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day; // Sunday as week start (IL)
  return new Date(d.getFullYear(), d.getMonth(), diff).toISOString();
};

const computeScore = (s: Omit<BrigadeStats, "score" | "code">) => {
  // Higher = safer. Penalize events/accidents, reward parades & active soldiers ratio.
  let score = 100;
  score -= Math.min(40, s.safetyEventsMonth * 3);
  score -= Math.min(40, s.accidentsMonth * 6);
  // Penalize fitness gaps
  if (s.activeSoldiers > 0) {
    const unfitPct = (s.unfit / s.activeSoldiers) * 100;
    score -= Math.min(20, unfitPct * 0.5);
  }
  if (s.activeSoldiers === 0) score -= 10;
  return Math.max(0, Math.min(100, score));
};

const scoreColor = (score: number) => {
  if (score >= 75) return "text-emerald-700 bg-emerald-100 border-emerald-300";
  if (score >= 50) return "text-amber-700 bg-amber-100 border-amber-300";
  return "text-red-700 bg-red-100 border-red-300";
};

const scoreLabel = (score: number) => {
  if (score >= 75) return "תקין";
  if (score >= 50) return "סיכון בינוני";
  return "סיכון גבוה";
};

export const DivisionDashboard = () => {
  const navigate = useNavigate();
  const { setActiveBrigade } = useAuth() as any;
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<BrigadeStats[]>([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const monthIso = startOfMonthIso();
        const weekIso = startOfWeekIso();
        const today = new Date();
        const in30 = new Date(today.getTime() + 30 * 24 * 3600 * 1000).toISOString().slice(0, 10);
        const todayIso = today.toISOString().slice(0, 10);

        const results = await Promise.all(
          BRIGADE_CODES.map(async (code) => {
            const [se, ac, sol, par, milExpired, milSoon, noDef] = await Promise.all([
              supabase
                .from("safety_events")
                .select("id", { count: "exact", head: true })
                .eq("brigade", code)
                .gte("created_at", monthIso),
              supabase
                .from("accidents")
                .select("id", { count: "exact", head: true })
                .eq("brigade", code)
                .gte("accident_date", monthIso.slice(0, 10)),
              supabase
                .from("soldiers")
                .select("id", { count: "exact", head: true })
                .eq("brigade", code)
                .eq("is_active", true),
              supabase
                .from("cleaning_parades")
                .select("id", { count: "exact", head: true })
                .eq("brigade", code)
                .gte("parade_date", weekIso.slice(0, 10)),
              supabase
                .from("soldiers")
                .select("id", { count: "exact", head: true })
                .eq("brigade", code)
                .eq("is_active", true)
                .lt("military_license_expiry", todayIso),
              supabase
                .from("soldiers")
                .select("id", { count: "exact", head: true })
                .eq("brigade", code)
                .eq("is_active", true)
                .gte("military_license_expiry", todayIso)
                .lte("military_license_expiry", in30),
              supabase
                .from("soldiers")
                .select("id", { count: "exact", head: true })
                .eq("brigade", code)
                .eq("is_active", true)
                .or("defensive_driving_passed.is.null,defensive_driving_passed.eq.false"),
            ]);

            const base = {
              safetyEventsMonth: se.count || 0,
              accidentsMonth: ac.count || 0,
              activeSoldiers: sol.count || 0,
              paradesWeek: par.count || 0,
              unfit: milExpired.count || 0,
              militarySoon: milSoon.count || 0,
              noDefensive: noDef.count || 0,
            };
            return { code, ...base, score: computeScore(base) } as BrigadeStats;
          })
        );
        setStats(results);
      } catch (e: any) {
        toast.error(`שגיאה בטעינת נתוני האוגדה: ${e?.message || e}`);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const totals = stats.reduce(
    (acc, s) => ({
      events: acc.events + s.safetyEventsMonth,
      accidents: acc.accidents + s.accidentsMonth,
      soldiers: acc.soldiers + s.activeSoldiers,
      parades: acc.parades + s.paradesWeek,
      unfit: acc.unfit + s.unfit,
      militarySoon: acc.militarySoon + s.militarySoon,
      noDefensive: acc.noDefensive + s.noDefensive,
    }),
    { events: 0, accidents: 0, soldiers: 0, parades: 0, unfit: 0, militarySoon: 0, noDefensive: 0 }
  );

  const alerts = stats
    .filter((s) => s.score < 75)
    .sort((a, b) => a.score - b.score)
    .slice(0, 5);

  // Smart alerts (system-level, derived from totals + per-brigade highs)
  const smartAlerts: { text: string; tone: "red" | "amber"; onClick?: () => void }[] = [];
  if (totals.unfit > 0) smartAlerts.push({ text: `${totals.unfit} נהגים באיו"ש עם רישיון צבאי פג תוקף`, tone: "red", onClick: () => navigate("/division/fitness") });
  if (totals.militarySoon > 0) smartAlerts.push({ text: `${totals.militarySoon} נהגים שהרישיון הצבאי שלהם פג ב-30 הימים הקרובים`, tone: "amber", onClick: () => navigate("/division/fitness") });
  if (totals.noDefensive > 0) smartAlerts.push({ text: `${totals.noDefensive} נהגים באיו"ש לא עברו נהיגה מונעת`, tone: "amber", onClick: () => navigate("/division/fitness") });
  const heavyAccidents = stats.filter((s) => s.accidentsMonth >= 3);
  heavyAccidents.forEach((s) => smartAlerts.push({ text: `${BRIGADES[s.code].name}: ${s.accidentsMonth} תאונות החודש – חריגה מהממוצע`, tone: "red" }));

  const enterBrigade = async (code: BrigadeCode) => {
    try {
      await setActiveBrigade(code);
      sessionStorage.setItem("superAdminBrigadePicked", "1");
      navigate("/", { replace: true });
    } catch (e: any) {
      toast.error(`שגיאה במעבר לחטיבה: ${e?.message || e}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 pb-24" dir="rtl">
      {/* Header */}
      <div className="bg-gradient-to-l from-primary via-primary to-accent text-white px-4 pt-20 pb-8 shadow-xl">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black">מפא"ו אוגדת איו"ש</h1>
              <p className="text-sm text-white/80">תצוגה אוגדתית – מבט-על על כל החטיבות</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 -mt-6 space-y-6">
        {/* KPI bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="p-4 bg-white border-2 border-slate-200 shadow-md">
            <div className="flex items-center gap-2 text-slate-600 text-xs font-bold mb-1">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              אירועי בטיחות (חודש)
            </div>
            <div className="text-3xl font-black text-slate-900">{loading ? "—" : totals.events}</div>
          </Card>
          <Card className="p-4 bg-white border-2 border-slate-200 shadow-md">
            <div className="flex items-center gap-2 text-slate-600 text-xs font-bold mb-1">
              <Car className="w-4 h-4 text-red-600" />
              תאונות (חודש)
            </div>
            <div className="text-3xl font-black text-slate-900">{loading ? "—" : totals.accidents}</div>
          </Card>
          <Card className="p-4 bg-white border-2 border-slate-200 shadow-md">
            <div className="flex items-center gap-2 text-slate-600 text-xs font-bold mb-1">
              <Users className="w-4 h-4 text-primary" />
              חיילים פעילים
            </div>
            <div className="text-3xl font-black text-slate-900">{loading ? "—" : totals.soldiers}</div>
          </Card>
          <Card className="p-4 bg-white border-2 border-slate-200 shadow-md">
            <div className="flex items-center gap-2 text-slate-600 text-xs font-bold mb-1">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              מסדרי ניקיון (שבוע)
            </div>
            <div className="text-3xl font-black text-slate-900">{loading ? "—" : totals.parades}</div>
          </Card>
        </div>

        {/* Fitness KPI row */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-4 bg-red-50 border-2 border-red-300 shadow-md cursor-pointer hover:shadow-lg transition" onClick={() => navigate("/division/fitness")}>
            <div className="flex items-center gap-2 text-red-700 text-xs font-bold mb-1">
              <ShieldAlert className="w-4 h-4" /> רישיון צבאי פג
            </div>
            <div className="text-3xl font-black text-red-700">{loading ? "—" : totals.unfit}</div>
          </Card>
          <Card className="p-4 bg-amber-50 border-2 border-amber-300 shadow-md cursor-pointer hover:shadow-lg transition" onClick={() => navigate("/division/fitness")}>
            <div className="flex items-center gap-2 text-amber-700 text-xs font-bold mb-1">
              <Gauge className="w-4 h-4" /> פג בקרוב (30 יום)
            </div>
            <div className="text-3xl font-black text-amber-700">{loading ? "—" : totals.militarySoon}</div>
          </Card>
          <Card className="p-4 bg-slate-50 border-2 border-slate-300 shadow-md cursor-pointer hover:shadow-lg transition" onClick={() => navigate("/division/fitness")}>
            <div className="flex items-center gap-2 text-slate-700 text-xs font-bold mb-1">
              <Car className="w-4 h-4" /> ללא נהיגה מונעת
            </div>
            <div className="text-3xl font-black text-slate-800">{loading ? "—" : totals.noDefensive}</div>
          </Card>
        </div>

        {/* Smart alerts banner */}
        {!loading && smartAlerts.length > 0 && (
          <Card className="p-4 bg-gradient-to-l from-red-50 to-amber-50 border-2 border-red-300 shadow-md">
            <h2 className="text-lg font-black text-slate-900 mb-3 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              התראות חכמות אוגדתיות
            </h2>
            <div className="space-y-2">
              {smartAlerts.map((a, i) => (
                <button
                  key={i}
                  onClick={a.onClick}
                  className={`w-full text-right p-3 rounded-xl border-2 font-semibold transition hover:scale-[1.01] ${a.tone === "red" ? "bg-red-100 border-red-300 text-red-800" : "bg-amber-100 border-amber-300 text-amber-800"}`}
                >
                  {a.text}
                </button>
              ))}
            </div>
          </Card>
        )}

        {/* Quick links */}
        <div className="grid grid-cols-3 gap-3">
          <Button
            variant="outline"
            className="h-14 border-2 border-primary/30 hover:border-primary text-slate-900 font-bold"
            onClick={() => navigate("/division/map")}
          >
            <MapIcon className="w-5 h-5 ml-2" />
            מפת איו"ש
          </Button>
          <Button
            variant="outline"
            className="h-14 border-2 border-primary/30 hover:border-primary text-slate-900 font-bold"
            onClick={() => navigate("/division/report")}
          >
            <FileSpreadsheet className="w-5 h-5 ml-2" />
            דוח אוגדתי מרוכז
          </Button>
          <Button
            variant="outline"
            className="h-14 border-2 border-rose-400/40 hover:border-rose-500 text-slate-900 font-bold"
            onClick={() => navigate("/division/fitness")}
          >
            <Gauge className="w-5 h-5 ml-2" />
            כשירות נהגים
          </Button>
        </div>

        {/* Alerts */}
        {!loading && alerts.length > 0 && (
          <Card className="p-4 bg-white border-2 border-amber-300 shadow-md">
            <h2 className="text-lg font-black text-slate-900 mb-3 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              חטיבות בסיכון
            </h2>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
              {alerts.map((a) => (
                <button
                  key={a.code}
                  onClick={() => enterBrigade(a.code)}
                  className={`min-w-[200px] text-right p-3 rounded-xl border-2 ${scoreColor(a.score)} hover:scale-[1.02] transition-transform`}
                >
                  <div className="font-black text-sm">{BRIGADES[a.code].name}</div>
                  <div className="text-xs mt-1 font-semibold">{scoreLabel(a.score)} · ציון {a.score}</div>
                  <div className="text-xs mt-1">
                    {a.safetyEventsMonth} אירועים · {a.accidentsMonth} תאונות
                  </div>
                </button>
              ))}
            </div>
          </Card>
        )}

        {/* Brigade cards */}
        <div>
          <h2 className="text-xl font-black text-slate-900 mb-3 px-1">חטיבות האוגדה</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {BRIGADE_CODES.map((code) => {
              const s = stats.find((x) => x.code === code);
              const score = s?.score ?? 0;
              const hasData = !!s && (s.activeSoldiers > 0 || s.safetyEventsMonth > 0 || s.accidentsMonth > 0 || s.paradesWeek > 0);
              return (
                <Card
                  key={code}
                  className="p-4 bg-white border-2 border-slate-200 shadow-md hover:shadow-lg hover:border-primary transition-all"
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <div className="font-black text-slate-900">{BRIGADES[code].name}</div>
                        <div className="text-xs text-slate-600 font-medium">{BRIGADES[code].shortLabel}</div>
                      </div>
                    </div>
                    {hasData ? (
                      <span className={`px-2 py-1 rounded-lg text-xs font-bold border ${scoreColor(score)}`}>
                        {scoreLabel(score)}
                      </span>
                    ) : (
                      <span className="px-2 py-1 rounded-lg text-xs font-bold border border-slate-300 bg-slate-100 text-slate-600">
                        אין נתונים
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-4 gap-2 mb-3">
                    <div className="text-center p-2 rounded-lg bg-slate-50">
                      <div className="text-lg font-black text-slate-900">{loading ? "—" : s?.safetyEventsMonth ?? 0}</div>
                      <div className="text-[10px] text-slate-600 font-bold">אירועים</div>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-slate-50">
                      <div className="text-lg font-black text-slate-900">{loading ? "—" : s?.accidentsMonth ?? 0}</div>
                      <div className="text-[10px] text-slate-600 font-bold">תאונות</div>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-slate-50">
                      <div className="text-lg font-black text-slate-900">{loading ? "—" : s?.activeSoldiers ?? 0}</div>
                      <div className="text-[10px] text-slate-600 font-bold">חיילים</div>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-slate-50">
                      <div className="text-lg font-black text-slate-900">{loading ? "—" : s?.paradesWeek ?? 0}</div>
                      <div className="text-[10px] text-slate-600 font-bold">מסדרים</div>
                    </div>
                  </div>

                  <Button
                    onClick={() => enterBrigade(code)}
                    className="w-full bg-primary hover:bg-primary/90 text-white font-bold"
                  >
                    כניסה לחטיבה
                    <ChevronLeft className="w-4 h-4 mr-1" />
                  </Button>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};