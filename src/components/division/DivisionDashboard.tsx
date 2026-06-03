import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { BRIGADES, BRIGADE_CODES, BrigadeCode } from "@/lib/brigades";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  AlertTriangle,
  Car,
  Users,
  ChevronLeft,
  TrendingUp,
  TrendingDown,
  Map as MapIcon,
  FileSpreadsheet,
  Building2,
  Gauge,
  ShieldAlert,
  RotateCcw,
  Mountain,
  Activity,
  Repeat,
} from "lucide-react";
import { toast } from "sonner";
import { differenceInDays, parseISO, addYears, format } from "date-fns";
import { he } from "date-fns/locale";

interface BrigadeStats {
  code: BrigadeCode;
  accidentsMonth: number;
  accidentsPrevMonth: number;
  rolloversMonth: number;
  entrenchmentsMonth: number;
  roadAccidentsMonth: number;
  activeSoldiers: number;
  unfit: number;
  militarySoon: number;
  civilianExpired: number;
  noDefensive: number;
  correctDrivingDue: number;
  fitPct: number;
  score: number; // 0..100
}

const startOfMonthIso = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
};
const startOfPrevMonthIso = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() - 1, 1).toISOString();
};

const computeScore = (s: { accidentsMonth: number; rolloversMonth: number; entrenchmentsMonth: number; fitPct: number; activeSoldiers: number }) => {
  let score = 100;
  score -= Math.min(35, s.accidentsMonth * 6);
  score -= Math.min(35, s.rolloversMonth * 10);
  score -= Math.min(20, s.entrenchmentsMonth * 5);
  score -= Math.round((100 - s.fitPct) * 0.15);
  if (s.activeSoldiers === 0) score -= 5;
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

type DrillKind =
  | "accidents-all"
  | "accidents-road"
  | "accidents-rollover"
  | "accidents-entrench"
  | "military-expired"
  | "military-soon"
  | "civilian-expired"
  | "no-defensive"
  | "correct-driving-due"
  | "repeat-offenders"
  | "top-outposts";

interface DrillRow {
  brigade: string | null;
  primary: string;
  secondary?: string;
  tertiary?: string;
  date?: string;
  badge?: string;
}

export const DivisionDashboard = () => {
  const navigate = useNavigate();
  const { setActiveBrigade } = useAuth() as any;
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<BrigadeStats[]>([]);
  const [drill, setDrill] = useState<{ kind: DrillKind; title: string; rows: DrillRow[] } | null>(null);
  const [drillLoading, setDrillLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const monthIso = startOfMonthIso();
        const prevMonthIso = startOfPrevMonthIso();
        const today = new Date();
        const in30 = new Date(today.getTime() + 30 * 24 * 3600 * 1000).toISOString().slice(0, 10);
        const todayIso = today.toISOString().slice(0, 10);

        const results = await Promise.all(
          BRIGADE_CODES.map(async (code) => {
            const [ac, acPrev, acRoad, acRoll, acEnt, sol, milExpired, milSoon, civExpired, noDef, soldiersForCD] = await Promise.all([
              supabase
                .from("accidents")
                .select("id", { count: "exact", head: true })
                .eq("brigade", code)
                .gte("accident_date", monthIso.slice(0, 10)),
              supabase
                .from("accidents")
                .select("id", { count: "exact", head: true })
                .eq("brigade", code)
                .gte("accident_date", prevMonthIso.slice(0, 10))
                .lt("accident_date", monthIso.slice(0, 10)),
              supabase
                .from("accidents")
                .select("id", { count: "exact", head: true })
                .eq("brigade", code)
                .eq("incident_type", "accident")
                .gte("accident_date", monthIso.slice(0, 10)),
              supabase
                .from("accidents")
                .select("id", { count: "exact", head: true })
                .eq("brigade", code)
                .eq("incident_type", "rollover")
                .gte("accident_date", monthIso.slice(0, 10)),
              supabase
                .from("accidents")
                .select("id", { count: "exact", head: true })
                .eq("brigade", code)
                .eq("incident_type", "stuck")
                .gte("accident_date", monthIso.slice(0, 10)),
              supabase
                .from("soldiers")
                .select("id", { count: "exact", head: true })
                .eq("brigade", code)
                .eq("is_active", true),
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
                .lt("civilian_license_expiry", todayIso),
              supabase
                .from("soldiers")
                .select("id", { count: "exact", head: true })
                .eq("brigade", code)
                .eq("is_active", true)
                .or("defensive_driving_passed.is.null,defensive_driving_passed.eq.false"),
              supabase
                .from("soldiers")
                .select("correct_driving_in_service_date, qualified_date")
                .eq("brigade", code)
                .eq("is_active", true),
            ]);

            const active = sol.count || 0;
            const unfit = milExpired.count || 0;
            const fitPct = active === 0 ? 100 : Math.round(((active - unfit) / active) * 100);
            // Correct driving due: ref date (correct OR qualified) + 1yr is in past or within 60 days
            const cdDue = (soldiersForCD.data || []).filter((s: any) => {
              const ref = s.correct_driving_in_service_date || s.qualified_date;
              if (!ref) return true;
              const days = differenceInDays(addYears(parseISO(ref), 1), new Date());
              return days <= 60;
            }).length;

            const base = {
              accidentsMonth: ac.count || 0,
              accidentsPrevMonth: acPrev.count || 0,
              roadAccidentsMonth: acRoad.count || 0,
              rolloversMonth: acRoll.count || 0,
              entrenchmentsMonth: acEnt.count || 0,
              activeSoldiers: active,
              unfit,
              militarySoon: milSoon.count || 0,
              civilianExpired: civExpired.count || 0,
              noDefensive: noDef.count || 0,
              correctDrivingDue: cdDue,
              fitPct,
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
      accidents: acc.accidents + s.accidentsMonth,
      accidentsPrev: acc.accidentsPrev + s.accidentsPrevMonth,
      road: acc.road + s.roadAccidentsMonth,
      rollovers: acc.rollovers + s.rolloversMonth,
      entrenchments: acc.entrenchments + s.entrenchmentsMonth,
      soldiers: acc.soldiers + s.activeSoldiers,
      unfit: acc.unfit + s.unfit,
      militarySoon: acc.militarySoon + s.militarySoon,
      civilianExpired: acc.civilianExpired + s.civilianExpired,
      noDefensive: acc.noDefensive + s.noDefensive,
      correctDrivingDue: acc.correctDrivingDue + s.correctDrivingDue,
      fit: acc.fit + (s.activeSoldiers - s.unfit),
    }),
    { accidents: 0, accidentsPrev: 0, road: 0, rollovers: 0, entrenchments: 0, soldiers: 0, unfit: 0, militarySoon: 0, civilianExpired: 0, noDefensive: 0, correctDrivingDue: 0, fit: 0 }
  );
  const divisionFitPct = totals.soldiers === 0 ? 0 : Math.round((totals.fit / totals.soldiers) * 100);
  const accidentsTrend = totals.accidents - totals.accidentsPrev;
  const accidentsTrendPct = totals.accidentsPrev === 0 ? (totals.accidents > 0 ? 100 : 0) : Math.round(((totals.accidents - totals.accidentsPrev) / totals.accidentsPrev) * 100);

  const alerts = stats
    .filter((s) => s.score < 75)
    .sort((a, b) => a.score - b.score)
    .slice(0, 5);

  // Smart alerts (system-level, derived from totals + per-brigade highs)
  const smartAlerts: { text: string; tone: "red" | "amber"; onClick?: () => void }[] = [];
  if (totals.unfit > 0) smartAlerts.push({ text: `${totals.unfit} נהגים באיו"ש עם רישיון צבאי פג תוקף`, tone: "red", onClick: () => navigate("/division/fitness") });
  if (totals.militarySoon > 0) smartAlerts.push({ text: `${totals.militarySoon} נהגים שהרישיון הצבאי שלהם פג ב-30 הימים הקרובים`, tone: "amber", onClick: () => navigate("/division/fitness") });
  if (totals.correctDrivingDue > 0) smartAlerts.push({ text: `${totals.correctDrivingDue} נהגים חייבים נהיגה נכונה בשירות (פג / יפוג ב-60 יום)`, tone: "amber", onClick: () => navigate("/division/fitness?filter=correctDrivingDue") });
  if (totals.noDefensive > 0) smartAlerts.push({ text: `${totals.noDefensive} נהגים באיו"ש לא עברו נהיגה מונעת`, tone: "amber", onClick: () => navigate("/division/fitness") });
  // Spike detection: brigade with +50% accidents vs prev month (min 2 in current)
  stats.forEach((s) => {
    if (s.accidentsMonth >= 2 && s.accidentsPrevMonth > 0 && s.accidentsMonth >= s.accidentsPrevMonth * 1.5) {
      smartAlerts.push({
        text: `${BRIGADES[s.code].name}: קפיצה של ${Math.round(((s.accidentsMonth - s.accidentsPrevMonth) / s.accidentsPrevMonth) * 100)}% בתאונות לעומת החודש הקודם`,
        tone: "red",
        onClick: () => openDrillAccidents("accidents-all", undefined, s.code),
      });
    }
    if (s.rolloversMonth > 0) {
      smartAlerts.push({
        text: `${BRIGADES[s.code].name}: ${s.rolloversMonth} התהפכויות החודש – טיפול מיידי`,
        tone: "red",
        onClick: () => openDrillAccidents("accidents-rollover", "rollover", s.code),
      });
    }
  });

  const enterBrigade = async (code: BrigadeCode) => {
    try {
      await setActiveBrigade(code);
      sessionStorage.setItem("superAdminBrigadePicked", "1");
      navigate("/", { replace: true });
    } catch (e: any) {
      toast.error(`שגיאה במעבר לחטיבה: ${e?.message || e}`);
    }
  };

  // === Drill-down loaders ===
  const drillTitles: Record<DrillKind, string> = {
    "accidents-all": "כל התאונות (חודש נוכחי)",
    "accidents-road": "תאונות דרכים (חודש נוכחי)",
    "accidents-rollover": "התהפכויות (חודש נוכחי)",
    "accidents-entrench": "התחפרויות (חודש נוכחי)",
    "military-expired": "רישיון צבאי פג תוקף",
    "military-soon": "רישיון צבאי פג ב-30 יום",
    "civilian-expired": "רישיון אזרחי פג תוקף",
    "no-defensive": "לא עברו נהיגה מונעת",
    "correct-driving-due": "צריכים נהיגה נכונה בשירות",
    "repeat-offenders": "חיילים עם 2+ אירועים ב-90 יום",
    "top-outposts": "מוצבים בסיכון (השבוע)",
  };

  const openDrillAccidents = async (kind: Extract<DrillKind, "accidents-all" | "accidents-road" | "accidents-rollover" | "accidents-entrench">, incidentType?: string, brigade?: BrigadeCode) => {
    setDrill({ kind, title: drillTitles[kind] + (brigade ? ` – ${BRIGADES[brigade].name}` : ""), rows: [] });
    setDrillLoading(true);
    try {
      const monthIso = startOfMonthIso().slice(0, 10);
      let q = supabase
        .from("accidents")
        .select("id, accident_date, brigade, driver_name, vehicle_number, location, incident_type, severity, soldiers(full_name, personal_number)")
        .gte("accident_date", monthIso)
        .order("accident_date", { ascending: false });
      if (incidentType) q = q.eq("incident_type", incidentType);
      if (brigade) q = q.eq("brigade", brigade);
      const { data, error } = await q;
      if (error) throw error;
      const rows: DrillRow[] = (data || []).map((r: any) => ({
        brigade: r.brigade,
        primary: r.soldiers?.full_name || r.driver_name || "—",
        secondary: [r.soldiers?.personal_number, r.vehicle_number].filter(Boolean).join(" · "),
        tertiary: r.location || "",
        date: r.accident_date ? format(parseISO(r.accident_date), "dd/MM/yyyy", { locale: he }) : "",
        badge: r.incident_type === "rollover" ? "התהפכות" : r.incident_type === "stuck" ? "התחפרות" : r.incident_type === "accident" ? "תאונת דרכים" : r.incident_type || "—",
      }));
      setDrill((d) => d && { ...d, rows });
    } catch (e: any) {
      toast.error(`שגיאה: ${e?.message || e}`);
    } finally {
      setDrillLoading(false);
    }
  };

  const openDrillSoldiers = async (kind: Extract<DrillKind, "military-expired" | "military-soon" | "civilian-expired" | "no-defensive" | "correct-driving-due">) => {
    setDrill({ kind, title: drillTitles[kind], rows: [] });
    setDrillLoading(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const in30 = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().slice(0, 10);
      let q = supabase
        .from("soldiers")
        .select("id, full_name, personal_number, outpost, brigade, military_license_expiry, civilian_license_expiry, defensive_driving_passed, correct_driving_in_service_date, qualified_date")
        .eq("is_active", true)
        .order("full_name");
      if (kind === "military-expired") q = q.lt("military_license_expiry", today);
      if (kind === "military-soon") q = q.gte("military_license_expiry", today).lte("military_license_expiry", in30);
      if (kind === "civilian-expired") q = q.lt("civilian_license_expiry", today);
      if (kind === "no-defensive") q = q.or("defensive_driving_passed.is.null,defensive_driving_passed.eq.false");
      const { data, error } = await q;
      if (error) throw error;
      let list = data || [];
      if (kind === "correct-driving-due") {
        list = list.filter((s: any) => {
          const ref = s.correct_driving_in_service_date || s.qualified_date;
          if (!ref) return true;
          return differenceInDays(addYears(parseISO(ref), 1), new Date()) <= 60;
        });
      }
      const rows: DrillRow[] = list.map((s: any) => ({
        brigade: s.brigade,
        primary: s.full_name,
        secondary: `מ.א ${s.personal_number}`,
        tertiary: s.outpost || "",
        date: kind === "military-expired" || kind === "military-soon"
          ? (s.military_license_expiry ? format(parseISO(s.military_license_expiry), "dd/MM/yyyy", { locale: he }) : "")
          : kind === "civilian-expired"
          ? (s.civilian_license_expiry ? format(parseISO(s.civilian_license_expiry), "dd/MM/yyyy", { locale: he }) : "")
          : "",
      }));
      setDrill((d) => d && { ...d, rows });
    } catch (e: any) {
      toast.error(`שגיאה: ${e?.message || e}`);
    } finally {
      setDrillLoading(false);
    }
  };

  const openDrillRepeatOffenders = async () => {
    setDrill({ kind: "repeat-offenders", title: drillTitles["repeat-offenders"], rows: [] });
    setDrillLoading(true);
    try {
      const since = new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from("accidents")
        .select("soldier_id, brigade, driver_name, soldiers(full_name, personal_number, outpost)")
        .gte("accident_date", since);
      if (error) throw error;
      const byKey = new Map<string, { count: number; brigade: string | null; name: string; secondary: string; tertiary: string }>();
      (data || []).forEach((r: any) => {
        const key = r.soldier_id || `name:${r.driver_name}`;
        if (!key) return;
        const existing = byKey.get(key);
        if (existing) existing.count++;
        else byKey.set(key, {
          count: 1,
          brigade: r.brigade,
          name: r.soldiers?.full_name || r.driver_name || "—",
          secondary: r.soldiers?.personal_number ? `מ.א ${r.soldiers.personal_number}` : "",
          tertiary: r.soldiers?.outpost || "",
        });
      });
      const rows: DrillRow[] = Array.from(byKey.values())
        .filter((v) => v.count >= 2)
        .sort((a, b) => b.count - a.count)
        .map((v) => ({ brigade: v.brigade, primary: v.name, secondary: v.secondary, tertiary: v.tertiary, badge: `${v.count} אירועים` }));
      setDrill((d) => d && { ...d, rows });
    } catch (e: any) {
      toast.error(`שגיאה: ${e?.message || e}`);
    } finally {
      setDrillLoading(false);
    }
  };

  const openDrillTopOutposts = async () => {
    setDrill({ kind: "top-outposts", title: drillTitles["top-outposts"], rows: [] });
    setDrillLoading(true);
    try {
      const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from("accidents")
        .select("brigade, location, soldiers(outpost)")
        .gte("accident_date", weekAgo);
      if (error) throw error;
      const byOutpost = new Map<string, { count: number; brigade: string | null }>();
      (data || []).forEach((r: any) => {
        const o = r.location || r.soldiers?.outpost;
        if (!o) return;
        const key = `${r.brigade}|${o}`;
        const ex = byOutpost.get(key);
        if (ex) ex.count++;
        else byOutpost.set(key, { count: 1, brigade: r.brigade });
      });
      const rows: DrillRow[] = Array.from(byOutpost.entries())
        .map(([k, v]) => ({ brigade: v.brigade, primary: k.split("|")[1], secondary: "", tertiary: "", badge: `${v.count} אירועים השבוע` }))
        .sort((a, b) => parseInt((b.badge || "0")) - parseInt((a.badge || "0")))
        .slice(0, 10);
      setDrill((d) => d && { ...d, rows });
    } catch (e: any) {
      toast.error(`שגיאה: ${e?.message || e}`);
    } finally {
      setDrillLoading(false);
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
        {/* Accidents block (clickable, with breakdown) */}
        <Card className="p-5 bg-white border-2 border-slate-200 shadow-md">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 text-slate-700 text-sm font-bold">
                <Car className="w-5 h-5 text-red-600" />
                תאונות באיו"ש (חודש נוכחי)
              </div>
              <button onClick={() => openDrillAccidents("accidents-all")} className="text-4xl font-black text-slate-900 hover:text-primary transition mt-1">
                {loading ? "—" : totals.accidents}
              </button>
              {!loading && totals.accidentsPrev > 0 && (
                <div className={`text-xs font-bold mt-1 flex items-center gap-1 ${accidentsTrend > 0 ? "text-red-700" : accidentsTrend < 0 ? "text-emerald-700" : "text-slate-600"}`}>
                  {accidentsTrend > 0 ? <TrendingUp className="w-3 h-3" /> : accidentsTrend < 0 ? <TrendingDown className="w-3 h-3" /> : null}
                  {accidentsTrend > 0 ? "+" : ""}{accidentsTrendPct}% לעומת חודש קודם ({totals.accidentsPrev})
                </div>
              )}
            </div>
            <div className="text-left">
              <div className="text-xs text-slate-500 font-bold">% כשירות אוגדתי</div>
              <div className={`text-3xl font-black ${divisionFitPct >= 85 ? "text-emerald-700" : divisionFitPct >= 70 ? "text-amber-700" : "text-red-700"}`}>{loading ? "—" : `${divisionFitPct}%`}</div>
              <div className="text-[10px] text-slate-500 font-medium">{totals.fit}/{totals.soldiers} נהגים</div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button onClick={() => openDrillAccidents("accidents-road", "accident")} className="p-3 rounded-xl bg-red-50 border-2 border-red-200 hover:border-red-400 hover:bg-red-100 transition text-right">
              <div className="flex items-center gap-1 text-xs font-bold text-red-700"><Car className="w-3 h-3" /> תאונות דרכים</div>
              <div className="text-2xl font-black text-red-800">{loading ? "—" : totals.road}</div>
            </button>
            <button onClick={() => openDrillAccidents("accidents-rollover", "rollover")} className="p-3 rounded-xl bg-rose-50 border-2 border-rose-200 hover:border-rose-400 hover:bg-rose-100 transition text-right">
              <div className="flex items-center gap-1 text-xs font-bold text-rose-700"><RotateCcw className="w-3 h-3" /> התהפכויות</div>
              <div className="text-2xl font-black text-rose-800">{loading ? "—" : totals.rollovers}</div>
            </button>
            <button onClick={() => openDrillAccidents("accidents-entrench", "stuck")} className="p-3 rounded-xl bg-amber-50 border-2 border-amber-200 hover:border-amber-400 hover:bg-amber-100 transition text-right">
              <div className="flex items-center gap-1 text-xs font-bold text-amber-700"><Mountain className="w-3 h-3" /> התחפרויות</div>
              <div className="text-2xl font-black text-amber-800">{loading ? "—" : totals.entrenchments}</div>
            </button>
          </div>
        </Card>

        {/* Active soldiers KPI */}
        <div className="grid grid-cols-2 md:grid-cols-2 gap-3">
          <Card className="p-4 bg-white border-2 border-slate-200 shadow-md">
            <div className="flex items-center gap-2 text-slate-700 text-xs font-bold mb-1">
              <Users className="w-4 h-4 text-primary" /> חיילים פעילים באיו"ש
            </div>
            <div className="text-3xl font-black text-slate-900">{loading ? "—" : totals.soldiers}</div>
          </Card>
          <Card className="p-4 bg-white border-2 border-slate-200 shadow-md cursor-pointer hover:border-primary transition" onClick={openDrillRepeatOffenders}>
            <div className="flex items-center gap-2 text-slate-700 text-xs font-bold mb-1">
              <Repeat className="w-4 h-4 text-red-600" /> נהגים עם 2+ אירועים (90 יום)
            </div>
            <div className="text-3xl font-black text-slate-900">לחץ לצפייה</div>
          </Card>
        </div>

        {/* Fitness KPI row (clickable drill-down) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="p-4 bg-red-50 border-2 border-red-300 shadow-md cursor-pointer hover:shadow-lg transition" onClick={() => openDrillSoldiers("military-expired")}>
            <div className="flex items-center gap-2 text-red-700 text-xs font-bold mb-1">
              <ShieldAlert className="w-4 h-4" /> רישיון צבאי פג
            </div>
            <div className="text-3xl font-black text-red-700">{loading ? "—" : totals.unfit}</div>
          </Card>
          <Card className="p-4 bg-amber-50 border-2 border-amber-300 shadow-md cursor-pointer hover:shadow-lg transition" onClick={() => openDrillSoldiers("military-soon")}>
            <div className="flex items-center gap-2 text-amber-700 text-xs font-bold mb-1">
              <Gauge className="w-4 h-4" /> פג בקרוב (30 יום)
            </div>
            <div className="text-3xl font-black text-amber-700">{loading ? "—" : totals.militarySoon}</div>
          </Card>
          <Card className="p-4 bg-orange-50 border-2 border-orange-300 shadow-md cursor-pointer hover:shadow-lg transition" onClick={() => openDrillSoldiers("correct-driving-due")}>
            <div className="flex items-center gap-2 text-orange-700 text-xs font-bold mb-1">
              <Activity className="w-4 h-4" /> נה"נ בשירות נדרשת
            </div>
            <div className="text-3xl font-black text-orange-700">{loading ? "—" : totals.correctDrivingDue}</div>
          </Card>
          <Card className="p-4 bg-slate-50 border-2 border-slate-300 shadow-md cursor-pointer hover:shadow-lg transition" onClick={() => openDrillSoldiers("no-defensive")}>
            <div className="flex items-center gap-2 text-slate-700 text-xs font-bold mb-1">
              <Car className="w-4 h-4" /> ללא נהיגה מונעת
            </div>
            <div className="text-3xl font-black text-slate-800">{loading ? "—" : totals.noDefensive}</div>
          </Card>
        </div>

        {/* Civilian + outposts row */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4 bg-rose-50 border-2 border-rose-300 shadow-md cursor-pointer hover:shadow-lg transition" onClick={() => openDrillSoldiers("civilian-expired")}>
            <div className="flex items-center gap-2 text-rose-700 text-xs font-bold mb-1">
              <ShieldAlert className="w-4 h-4" /> רישיון אזרחי פג
            </div>
            <div className="text-3xl font-black text-rose-700">{loading ? "—" : totals.civilianExpired}</div>
          </Card>
          <Card className="p-4 bg-white border-2 border-slate-200 shadow-md cursor-pointer hover:border-primary transition" onClick={openDrillTopOutposts}>
            <div className="flex items-center gap-2 text-slate-700 text-xs font-bold mb-1">
              <Building2 className="w-4 h-4 text-primary" /> Top מוצבים בסיכון (שבוע)
            </div>
            <div className="text-base font-black text-slate-800 mt-1">לחץ לרשימה</div>
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
                    {a.accidentsMonth} תאונות · {a.rolloversMonth} התהפכויות · כשירות {a.fitPct}%
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
              const hasData = !!s && (s.activeSoldiers > 0 || s.accidentsMonth > 0);
              const trend = s ? s.accidentsMonth - s.accidentsPrevMonth : 0;
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
                      <div className="flex flex-col items-end gap-1">
                        <span className={`px-2 py-1 rounded-lg text-xs font-bold border ${scoreColor(score)}`}>
                          {scoreLabel(score)} · {score}
                        </span>
                        {trend !== 0 && (
                          <span className={`text-[10px] font-bold flex items-center gap-0.5 ${trend > 0 ? "text-red-700" : "text-emerald-700"}`}>
                            {trend > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            {trend > 0 ? "+" : ""}{trend} מהחודש הקודם
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="px-2 py-1 rounded-lg text-xs font-bold border border-slate-300 bg-slate-100 text-slate-600">
                        אין נתונים
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-4 gap-2 mb-3">
                    <div className="text-center p-2 rounded-lg bg-red-50 border border-red-200">
                      <div className="text-lg font-black text-red-800">{loading ? "—" : s?.accidentsMonth ?? 0}</div>
                      <div className="text-[10px] text-red-700 font-bold">תאונות</div>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-rose-50 border border-rose-200">
                      <div className="text-lg font-black text-rose-800">{loading ? "—" : s?.rolloversMonth ?? 0}</div>
                      <div className="text-[10px] text-rose-700 font-bold">התהפכויות</div>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-amber-50 border border-amber-200">
                      <div className="text-lg font-black text-amber-800">{loading ? "—" : s?.entrenchmentsMonth ?? 0}</div>
                      <div className="text-[10px] text-amber-700 font-bold">התחפרויות</div>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-emerald-50 border border-emerald-200">
                      <div className="text-lg font-black text-emerald-800">{loading ? "—" : `${s?.fitPct ?? 0}%`}</div>
                      <div className="text-[10px] text-emerald-700 font-bold">כשירות</div>
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

      {/* Drill-down dialog */}
      <Dialog open={!!drill} onOpenChange={(o) => !o && setDrill(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col bg-white" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right text-slate-900 font-black">{drill?.title}</DialogTitle>
          </DialogHeader>
          <div className="my-2 flex items-center gap-2">
            <Badge variant="outline" className="text-slate-800 border-slate-400 font-bold">סה"כ: {drill?.rows.length || 0}</Badge>
            {drillLoading && <span className="text-xs text-slate-600">טוען...</span>}
          </div>
          <div className="overflow-auto flex-1 border border-slate-200 rounded-lg bg-white">
            {drill && drill.rows.length === 0 && !drillLoading ? (
              <div className="text-center text-slate-600 py-10">אין נתונים</div>
            ) : (
              <div className="divide-y divide-slate-200">
                {Object.entries(
                  (drill?.rows || []).reduce<Record<string, DrillRow[]>>((acc, r) => {
                    const key = r.brigade || "—";
                    (acc[key] = acc[key] || []).push(r);
                    return acc;
                  }, {})
                ).map(([brigadeKey, items]) => (
                  <div key={brigadeKey} className="bg-white">
                    <div className="sticky top-0 bg-slate-200 text-slate-900 font-black px-3 py-2 text-sm border-b border-slate-300">
                      {brigadeKey in BRIGADES ? BRIGADES[brigadeKey as BrigadeCode].name : brigadeKey} · {items.length}
                    </div>
                    {items.map((r, idx) => (
                      <div key={idx} className="px-3 py-2 bg-white even:bg-slate-50 hover:bg-slate-100 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-slate-900 font-bold truncate">{r.primary}</div>
                          <div className="text-xs text-slate-700 truncate">
                            {[r.secondary, r.tertiary].filter(Boolean).join(" · ")}
                          </div>
                        </div>
                        <div className="flex flex-col items-end shrink-0 gap-1">
                          {r.badge && <Badge className="bg-slate-800 text-white text-[10px]">{r.badge}</Badge>}
                          {r.date && <span className="text-xs text-slate-700 font-bold">{r.date}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};