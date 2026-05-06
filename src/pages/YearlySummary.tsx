import { useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import {
  GraduationCap, UserMinus, UserPlus, Car, ClipboardCheck, Gavel,
  Activity, Calendar, BarChart3, AlertTriangle, Heart, FileSignature, TrendingUp
} from "lucide-react";
import { MONTHS_HEB } from "@/lib/constants";

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => currentYear - i);

interface YearStats {
  coursesTotal: number;
  coursesByCategory: Record<string, number>;
  coursesByName: Record<string, number>;
  releasedTotal: number;
  releasedNafshi: number;
  releasedByReason: Record<string, number>;
  intakeTotal: number;
  accidentsBts: number;
  accidentsGdud: number;
  accidentsTotal: number;
  inspectionsTotal: number;
  inspectionsAvg: number;
  punishmentsTotal: number;
  trainingDays: number;
  fitnessDays: number;
  workEventsTotal: number;
  workEventsByCategory: Record<string, number>;
  cleaningParades: number;
  driverInterviews: number;
  shiftReports: number;
  avgSafetyScore: number;
  avgSafetyScoreYTD: number;
  monthlySafetyAvg: { month: number; label: string; avg: number; count: number }[];
  procedureCompletion: { type: string; label: string; percent: number; signed: number; total: number }[];
  procedureOverallPercent: number;
}

async function fetchAll<T>(query: any): Promise<T[]> {
  const all: T[] = [];
  let from = 0;
  const size = 1000;
  while (true) {
    const { data, error } = await query.range(from, from + size - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < size) break;
    from += size;
  }
  return all;
}

export default function YearlySummary() {
  const { isAdmin, isSuperAdmin, loading: authLoading } = useAuth();
  const [year, setYear] = useState<number>(currentYear);

  const start = `${year}-01-01`;
  const end = `${year}-12-31`;
  const startTs = `${start}T00:00:00.000Z`;
  const endTs = `${end}T23:59:59.999Z`;

  const { data: stats, isLoading } = useQuery<YearStats>({
    queryKey: ["yearly-summary", year],
    queryFn: async () => {
      const [
        soldierCourses, releases, intake, accidents, inspections,
        punishments, workEvents, eventAttendance, cleaning, interviews,
        reports, soldiers, monthlyScores, signatures, soldiersAll
      ] = await Promise.all([
        fetchAll<any>(supabase.from("soldier_courses").select("status, courses(name, category)").gte("start_date", start).lte("start_date", end)),
        fetchAll<any>(supabase.from("soldiers").select("id, release_date, release_reason").gte("release_date", start).lte("release_date", end)),
        fetchAll<any>(supabase.from("soldiers").select("id, created_at").gte("created_at", startTs).lte("created_at", endTs)),
        fetchAll<any>(supabase.from("accidents").select("id, driver_type, accident_date").gte("accident_date", start).lte("accident_date", end)),
        fetchAll<any>(supabase.from("inspections").select("id, total_score, inspection_date").gte("inspection_date", start).lte("inspection_date", end)),
        fetchAll<any>(supabase.from("punishments").select("id, punishment_date").gte("punishment_date", start).lte("punishment_date", end)),
        fetchAll<any>(supabase.from("work_plan_events").select("id, category, title, event_date").gte("event_date", start).lte("event_date", end)),
        Promise.resolve([] as any[]),
        fetchAll<any>(supabase.from("cleaning_parades" as any).select("id, created_at").gte("created_at", startTs).lte("created_at", endTs)).catch(() => []),
        fetchAll<any>(supabase.from("driver_interviews" as any).select("id, created_at").gte("created_at", startTs).lte("created_at", endTs)).catch(() => []),
        fetchAll<any>(supabase.from("shift_reports" as any).select("id, created_at").gte("created_at", startTs).lte("created_at", endTs)).catch(() => []),
        fetchAll<any>(supabase.from("soldiers").select("current_safety_score, is_active")),
        fetchAll<any>(supabase.from("monthly_safety_scores" as any).select("safety_score, score_month").gte("score_month", start).lte("score_month", end)).catch(() => []),
        fetchAll<any>(supabase.from("procedure_signatures" as any).select("user_id, procedure_type, created_at").gte("created_at", startTs).lte("created_at", endTs)).catch(() => []),
        fetchAll<any>(supabase.from("soldiers").select("id, is_active")),
      ]);

      const coursesByCategory: Record<string, number> = {};
      const coursesByName: Record<string, number> = {};
      soldierCourses.forEach((sc: any) => {
        const cat = sc.courses?.category || "אחר";
        const name = sc.courses?.name || "—";
        coursesByCategory[cat] = (coursesByCategory[cat] || 0) + 1;
        coursesByName[name] = (coursesByName[name] || 0) + 1;
      });

      const accBts = accidents.filter((a: any) => a.driver_type === "security" || a.driver_type === "bts").length;
      const accGdud = accidents.filter((a: any) => a.driver_type === "battalion" || a.driver_type === "gdud").length;

      const insScores = inspections.map((i: any) => i.total_score).filter((s: any) => typeof s === "number");
      const inspectionsAvg = insScores.length ? insScores.reduce((a: number, b: number) => a + b, 0) / insScores.length : 0;

      const workEventsByCategory: Record<string, number> = {};
      let trainingDays = 0;
      let fitnessDays = 0;
      workEvents.forEach((e: any) => {
        const cat = e.category || "אחר";
        workEventsByCategory[cat] = (workEventsByCategory[cat] || 0) + 1;
        const t = (e.title || "").toLowerCase();
        if (t.includes("השתלמות") || t.includes("הדרכ") || t.includes("אימון")) trainingDays++;
        if (t.includes("כשירות")) fitnessDays++;
      });

      const safetyScores = soldiers.map((s: any) => s.current_safety_score).filter((s: any) => typeof s === "number" && s > 0);
      const avgSafetyScore = safetyScores.length ? safetyScores.reduce((a: number, b: number) => a + b, 0) / safetyScores.length : 0;

      // Monthly safety averages from monthly_safety_scores
      const buckets: Record<number, number[]> = {};
      monthlyScores.forEach((s: any) => {
        if (typeof s.safety_score !== "number") return;
        const m = parseInt(String(s.score_month).slice(5, 7));
        if (!buckets[m]) buckets[m] = [];
        buckets[m].push(s.safety_score);
      });
      const monthlySafetyAvg = Array.from({ length: 12 }, (_, i) => {
        const m = i + 1;
        const arr = buckets[m] || [];
        const avg = arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
        const label = MONTHS_HEB.find((x: any) => x.value === m)?.label || String(m);
        return { month: m, label, avg, count: arr.length };
      });
      const allYtdScores = monthlyScores.map((s: any) => s.safety_score).filter((v: any) => typeof v === "number");
      const avgSafetyScoreYTD = allYtdScores.length
        ? allYtdScores.reduce((a: number, b: number) => a + b, 0) / allYtdScores.length
        : 0;

      // Procedure signatures completion %
      const activeSoldiersCount = soldiersAll.filter((s: any) => s.is_active).length;
      const procedureTypes = [
        { type: "routine", label: "נהלי שגרה" },
        { type: "shift", label: "נהלים במהלך משמרת" },
        { type: "aluf70", label: "נוהל אלוף 70" },
      ];
      const procedureCompletion = procedureTypes.map(({ type, label }) => {
        const signedUsers = new Set(
          signatures.filter((s: any) => s.procedure_type === type).map((s: any) => s.user_id)
        );
        const signed = signedUsers.size;
        const total = activeSoldiersCount || 0;
        const percent = total ? Math.round((signed / total) * 100) : 0;
        return { type, label, percent, signed, total };
      });
      const procedureOverallPercent = procedureCompletion.length
        ? Math.round(procedureCompletion.reduce((a, p) => a + p.percent, 0) / procedureCompletion.length)
        : 0;

      const releasedNafshi = releases.filter((r: any) =>
        (r.release_reason || "").includes("נפשי")
      ).length;

      const releasedByReason: Record<string, number> = {};
      releases.forEach((r: any) => {
        const reason = r.release_reason || "שחרור רגיל";
        releasedByReason[reason] = (releasedByReason[reason] || 0) + 1;
      });

      return {
        coursesTotal: soldierCourses.length,
        coursesByCategory,
        coursesByName,
        releasedTotal: releases.length,
        releasedNafshi,
        releasedByReason,
        intakeTotal: intake.length,
        accidentsBts: accBts,
        accidentsGdud: accGdud,
        accidentsTotal: accidents.length,
        inspectionsTotal: inspections.length,
        inspectionsAvg,
        punishmentsTotal: punishments.length,
        trainingDays,
        fitnessDays,
        workEventsTotal: workEvents.length,
        workEventsByCategory,
        cleaningParades: cleaning.length,
        driverInterviews: interviews.length,
        shiftReports: reports.length,
        avgSafetyScore,
        avgSafetyScoreYTD,
        monthlySafetyAvg,
        procedureCompletion,
        procedureOverallPercent,
      };
    },
    enabled: isAdmin || isSuperAdmin,
  });

  if (authLoading) return null;
  if (!isAdmin && !isSuperAdmin) return <Navigate to="/" replace />;

  const cards = stats ? [
    { label: "סך קורסים שבוצעו", value: stats.coursesTotal, icon: GraduationCap, color: "from-violet-500 to-purple-600" },
    { label: "נהגים נקלטו", value: stats.intakeTotal, icon: UserPlus, color: "from-emerald-500 to-green-600" },
    { label: "נהגים השתחררו", value: stats.releasedTotal, icon: UserMinus, color: "from-slate-500 to-slate-700" },
    { label: "שחרור על נפשי", value: stats.releasedNafshi, icon: Heart, color: "from-fuchsia-500 to-pink-600" },
    { label: 'תאונות בט"ש', value: stats.accidentsBts, icon: Car, color: "from-orange-500 to-red-500" },
    { label: "תאונות גדוד", value: stats.accidentsGdud, icon: Car, color: "from-red-500 to-rose-700" },
    { label: "סך תאונות", value: stats.accidentsTotal, icon: AlertTriangle, color: "from-red-600 to-red-800" },
    { label: "ביקורות שבוצעו", value: stats.inspectionsTotal, icon: ClipboardCheck, color: "from-blue-500 to-indigo-600" },
    { label: "ממוצע ציון ביקורת", value: stats.inspectionsAvg.toFixed(1), icon: BarChart3, color: "from-cyan-500 to-blue-600" },
    { label: "עונשים", value: stats.punishmentsTotal, icon: Gavel, color: "from-rose-500 to-pink-600" },
    { label: "ימי כשירות", value: stats.fitnessDays, icon: Heart, color: "from-pink-500 to-rose-600" },
    { label: "ימי השתלמות / הדרכה", value: stats.trainingDays, icon: Activity, color: "from-amber-500 to-orange-600" },
    { label: "סך מופעים בתוכנית", value: stats.workEventsTotal, icon: Calendar, color: "from-teal-500 to-emerald-600" },
    { label: "מסדרי ניקיון", value: stats.cleaningParades, icon: ClipboardCheck, color: "from-purple-500 to-fuchsia-600" },
    { label: "ראיונות נהגים", value: stats.driverInterviews, icon: ClipboardCheck, color: "from-indigo-500 to-violet-600" },
    { label: "דיווחי משמרת", value: stats.shiftReports, icon: ClipboardCheck, color: "from-sky-500 to-blue-600" },
    { label: "ממוצע ציון בטיחות", value: stats.avgSafetyScore.toFixed(1), icon: BarChart3, color: "from-green-500 to-emerald-600" },
    { label: "ממוצע בטיחות מתחילת שנה", value: stats.avgSafetyScoreYTD.toFixed(1), icon: TrendingUp, color: "from-emerald-500 to-teal-600" },
    { label: "אחוז השלמת חתימות נהלים", value: `${stats.procedureOverallPercent}%`, icon: FileSignature, color: "from-indigo-500 to-blue-600" },
  ] : [];

  return (
    <AppLayout>
      <div dir="rtl" className="p-4 pb-24 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-black text-slate-800">סיכום עד כאן</h1>
          <p className="text-sm text-slate-700">סקירה שנתית מרוכזת לסיכום ביצועים</p>
        </div>

        <div className="flex justify-center">
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-48 bg-card text-slate-800 font-bold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {YEARS.map((y) => (
                <SelectItem key={y} value={String(y)}>שנת {y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="text-center text-slate-700 py-12">טוען נתונים...</div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              {cards.map((c) => {
                const Icon = c.icon;
                return (
                  <Card key={c.label} className="bg-card border-border/50 overflow-hidden">
                    <CardContent className="p-4">
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${c.color} flex items-center justify-center shadow-lg mb-3`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <div className="text-3xl font-black text-slate-800">{c.value}</div>
                      <div className="text-sm font-bold text-slate-700 mt-1">{c.label}</div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {stats && Object.keys(stats.coursesByName).length > 0 && (
              <Card className="bg-card border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg font-bold text-slate-800">פירוט קורסים לפי סוג</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {Object.entries(stats.coursesByName).sort((a, b) => b[1] - a[1]).map(([name, count]) => (
                    <div key={name} className="flex items-center justify-between p-3 rounded-xl bg-muted/40">
                      <span className="text-sm font-bold text-slate-800">{name}</span>
                      <span className="text-lg font-black text-primary">{count}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {stats && Object.keys(stats.workEventsByCategory).length > 0 && (
              <Card className="bg-card border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg font-bold text-slate-800">מופעים בתוכנית עבודה לפי קטגוריה</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {Object.entries(stats.workEventsByCategory).sort((a, b) => b[1] - a[1]).map(([cat, count]) => (
                    <div key={cat} className="flex items-center justify-between p-3 rounded-xl bg-muted/40">
                      <span className="text-sm font-bold text-slate-800">{cat}</span>
                      <span className="text-lg font-black text-primary">{count}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {stats && Object.keys(stats.releasedByReason).length > 0 && (
              <Card className="bg-card border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg font-bold text-slate-800">פירוט שחרורים לפי סיבה</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {Object.entries(stats.releasedByReason).sort((a, b) => b[1] - a[1]).map(([reason, count]) => (
                    <div key={reason} className="flex items-center justify-between p-3 rounded-xl bg-muted/40">
                      <span className="text-sm font-bold text-slate-800">{reason}</span>
                      <span className="text-lg font-black text-primary">{count}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {stats && stats.monthlySafetyAvg.some((m) => m.count > 0) && (
              <Card className="bg-card border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg font-bold text-slate-800">ממוצע ציוני בטיחות לפי חודש</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {stats.monthlySafetyAvg.map((m) => (
                    <div key={m.month} className="flex items-center justify-between p-3 rounded-xl bg-muted/40">
                      <span className="text-sm font-bold text-slate-800">{m.label}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-600">{m.count} ציונים</span>
                        <span className="text-lg font-black text-primary">
                          {m.count > 0 ? m.avg.toFixed(1) : "—"}
                        </span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {stats && stats.procedureCompletion.length > 0 && (
              <Card className="bg-card border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg font-bold text-slate-800">השלמת חתימות נהלים</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {stats.procedureCompletion.map((p) => (
                    <div key={p.type} className="flex items-center justify-between p-3 rounded-xl bg-muted/40">
                      <span className="text-sm font-bold text-slate-800">{p.label}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-600">{p.signed}/{p.total}</span>
                        <span className="text-lg font-black text-primary">{p.percent}%</span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}