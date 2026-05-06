import { useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

interface DetailItem {
  title: string;
  subtitle?: string;
}

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
  details: Record<string, DetailItem[]>;
}

async function fetchAll<T = any>(query: any): Promise<T[]> {
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

const fmtDate = (d?: string | null) => {
  if (!d) return "";
  try { return new Date(d).toLocaleDateString("he-IL"); } catch { return d; }
};

export default function YearlySummary() {
  const { isAdmin, isSuperAdmin, loading: authLoading } = useAuth();
  const [year, setYear] = useState<number>(currentYear);
  const [detailKey, setDetailKey] = useState<string | null>(null);

  const start = `${year}-01-01`;
  const end = `${year}-12-31`;
  const startTs = `${start}T00:00:00.000Z`;
  const endTs = `${end}T23:59:59.999Z`;

  const { data: stats, isLoading } = useQuery<YearStats>({
    queryKey: ["yearly-summary", year],
    queryFn: async () => {
      const [
        soldierCourses, releases, intake, accidents, inspections,
        punishments, workEvents, cleaning, interviews,
        reports, soldiers, monthlyScores, signatures, soldiersAll
      ] = await Promise.all([
        fetchAll(supabase.from("soldier_courses").select("status, start_date, courses(name, category), soldiers(full_name, personal_number)").gte("start_date", start).lte("start_date", end)),
        fetchAll(supabase.from("soldiers").select("id, full_name, personal_number, release_date, release_reason, outpost").gte("release_date", start).lte("release_date", end)),
        fetchAll(supabase.from("soldiers").select("id, full_name, personal_number, created_at, outpost").gte("created_at", startTs).lte("created_at", endTs)),
        fetchAll(supabase.from("accidents").select("id, driver_type, driver_name, accident_date, severity, location, description, soldiers(full_name, personal_number)").gte("accident_date", start).lte("accident_date", end)),
        fetchAll(supabase.from("inspections").select("id, total_score, inspection_date, soldiers(full_name)").gte("inspection_date", start).lte("inspection_date", end)),
        fetchAll(supabase.from("punishments").select("id, punishment_date, reason, soldiers(full_name, personal_number)").gte("punishment_date", start).lte("punishment_date", end)),
        fetchAll(supabase.from("work_plan_events").select("id, category, title, event_date").gte("event_date", start).lte("event_date", end)),
        fetchAll(supabase.from("cleaning_parades" as any).select("id, created_at, area_name, status").gte("created_at", startTs).lte("created_at", endTs)).catch(() => []),
        fetchAll(supabase.from("driver_interviews" as any).select("id, created_at, soldiers(full_name, personal_number)").gte("created_at", startTs).lte("created_at", endTs)).catch(() => []),
        fetchAll(supabase.from("shift_reports" as any).select("id, created_at").gte("created_at", startTs).lte("created_at", endTs)).catch(() => []),
        fetchAll(supabase.from("soldiers").select("current_safety_score, is_active")),
        fetchAll(supabase.from("monthly_safety_scores" as any).select("safety_score, score_month").gte("score_month", start).lte("score_month", end)).catch(() => []),
        fetchAll(supabase.from("procedure_signatures" as any).select("user_id, procedure_type, created_at").gte("created_at", startTs).lte("created_at", endTs)).catch(() => []),
        fetchAll(supabase.from("soldiers").select("id, is_active")),
      ]);

      const coursesByCategory: Record<string, number> = {};
      const coursesByName: Record<string, number> = {};
      soldierCourses.forEach((sc: any) => {
        const cat = sc.courses?.category || "אחר";
        const name = sc.courses?.name || "—";
        coursesByCategory[cat] = (coursesByCategory[cat] || 0) + 1;
        coursesByName[name] = (coursesByName[name] || 0) + 1;
      });

      // bts = security, gdud = anything else (combat/battalion)
      const accBts = accidents.filter((a: any) => a.driver_type === "security" || a.driver_type === "bts").length;
      const accGdud = accidents.filter((a: any) => a.driver_type && a.driver_type !== "security" && a.driver_type !== "bts").length;

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

      const releasedNafshi = releases.filter((r: any) => (r.release_reason || "").includes("נפשי")).length;
      const releasedByReason: Record<string, number> = {};
      releases.forEach((r: any) => {
        const reason = r.release_reason || "שחרור רגיל";
        releasedByReason[reason] = (releasedByReason[reason] || 0) + 1;
      });

      const accidentToItem = (a: any): DetailItem => ({
        title: a.soldiers?.full_name || a.driver_name || "ללא שם",
        subtitle: `${fmtDate(a.accident_date)} · ${a.location || ""} · ${a.severity || ""}`,
      });

      const details: Record<string, DetailItem[]> = {
        courses: soldierCourses.map((sc: any) => ({
          title: sc.soldiers?.full_name || "—",
          subtitle: `${sc.courses?.name || ""} · ${fmtDate(sc.start_date)}`,
        })),
        intake: intake.map((s: any) => ({
          title: s.full_name,
          subtitle: `${s.personal_number || ""} · ${s.outpost || ""} · נקלט ${fmtDate(s.created_at)}`,
        })),
        released: releases.map((r: any) => ({
          title: r.full_name,
          subtitle: `${r.personal_number || ""} · ${r.outpost || ""} · ${r.release_reason || "שחרור רגיל"} · ${fmtDate(r.release_date)}`,
        })),
        releasedNafshi: releases.filter((r: any) => (r.release_reason || "").includes("נפשי")).map((r: any) => ({
          title: r.full_name,
          subtitle: `${r.personal_number || ""} · ${fmtDate(r.release_date)}`,
        })),
        accidentsBts: accidents.filter((a: any) => a.driver_type === "security" || a.driver_type === "bts").map(accidentToItem),
        accidentsGdud: accidents.filter((a: any) => a.driver_type && a.driver_type !== "security" && a.driver_type !== "bts").map(accidentToItem),
        accidentsTotal: accidents.map(accidentToItem),
        inspections: inspections.map((i: any) => ({
          title: i.soldiers?.full_name || "ביקורת",
          subtitle: `${fmtDate(i.inspection_date)} · ציון ${i.total_score ?? "—"}`,
        })),
        punishments: punishments.map((p: any) => ({
          title: p.soldiers?.full_name || "—",
          subtitle: `${fmtDate(p.punishment_date)} · ${p.reason || ""}`,
        })),
        workEvents: workEvents.map((e: any) => ({
          title: e.title || "—",
          subtitle: `${fmtDate(e.event_date)} · ${e.category || ""}`,
        })),
        training: workEvents.filter((e: any) => {
          const t = (e.title || "").toLowerCase();
          return t.includes("השתלמות") || t.includes("הדרכ") || t.includes("אימון");
        }).map((e: any) => ({ title: e.title, subtitle: fmtDate(e.event_date) })),
        fitness: workEvents.filter((e: any) => (e.title || "").toLowerCase().includes("כשירות")).map((e: any) => ({
          title: e.title, subtitle: fmtDate(e.event_date),
        })),
        cleaning: cleaning.map((c: any) => ({
          title: c.area_name || "מסדר ניקיון",
          subtitle: `${fmtDate(c.created_at)} · ${c.status || ""}`,
        })),
        interviews: interviews.map((i: any) => ({
          title: i.soldiers?.full_name || "ראיון",
          subtitle: fmtDate(i.created_at),
        })),
        reports: reports.map((r: any) => ({
          title: "דיווח משמרת",
          subtitle: fmtDate(r.created_at),
        })),
      };

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
        details,
      };
    },
    enabled: isAdmin || isSuperAdmin,
  });

  if (authLoading) return null;
  if (!isAdmin && !isSuperAdmin) return <Navigate to="/" replace />;

  const cards: { key: string | null; label: string; value: any; icon: any; color: string }[] = stats ? [
    { key: "courses", label: "סך קורסים שבוצעו", value: stats.coursesTotal, icon: GraduationCap, color: "from-violet-500 to-purple-600" },
    { key: "intake", label: "נהגים נקלטו", value: stats.intakeTotal, icon: UserPlus, color: "from-emerald-500 to-green-600" },
    { key: "released", label: "נהגים השתחררו", value: stats.releasedTotal, icon: UserMinus, color: "from-slate-500 to-slate-700" },
    { key: "releasedNafshi", label: "שחרור על נפשי", value: stats.releasedNafshi, icon: Heart, color: "from-fuchsia-500 to-pink-600" },
    { key: "accidentsBts", label: 'תאונות בט"ש', value: stats.accidentsBts, icon: Car, color: "from-orange-500 to-red-500" },
    { key: "accidentsGdud", label: "תאונות גדוד", value: stats.accidentsGdud, icon: Car, color: "from-red-500 to-rose-700" },
    { key: "accidentsTotal", label: "סך תאונות", value: stats.accidentsTotal, icon: AlertTriangle, color: "from-red-600 to-red-800" },
    { key: "inspections", label: "ביקורות שבוצעו", value: stats.inspectionsTotal, icon: ClipboardCheck, color: "from-blue-500 to-indigo-600" },
    { key: null, label: "ממוצע ציון ביקורת", value: stats.inspectionsAvg.toFixed(1), icon: BarChart3, color: "from-cyan-500 to-blue-600" },
    { key: "punishments", label: "עונשים", value: stats.punishmentsTotal, icon: Gavel, color: "from-rose-500 to-pink-600" },
    { key: "fitness", label: "ימי כשירות", value: stats.fitnessDays, icon: Heart, color: "from-pink-500 to-rose-600" },
    { key: "training", label: "ימי השתלמות / הדרכה", value: stats.trainingDays, icon: Activity, color: "from-amber-500 to-orange-600" },
    { key: "workEvents", label: "סך מופעים בתוכנית", value: stats.workEventsTotal, icon: Calendar, color: "from-teal-500 to-emerald-600" },
    { key: "cleaning", label: "מסדרי ניקיון", value: stats.cleaningParades, icon: ClipboardCheck, color: "from-purple-500 to-fuchsia-600" },
    { key: "interviews", label: "ראיונות נהגים", value: stats.driverInterviews, icon: ClipboardCheck, color: "from-indigo-500 to-violet-600" },
    { key: "reports", label: "דיווחי משמרת", value: stats.shiftReports, icon: ClipboardCheck, color: "from-sky-500 to-blue-600" },
    { key: null, label: "ממוצע ציון בטיחות", value: stats.avgSafetyScore.toFixed(1), icon: BarChart3, color: "from-green-500 to-emerald-600" },
    { key: null, label: "ממוצע בטיחות מתחילת שנה", value: stats.avgSafetyScoreYTD.toFixed(1), icon: TrendingUp, color: "from-emerald-500 to-teal-600" },
    { key: null, label: "אחוז השלמת חתימות נהלים", value: `${stats.procedureOverallPercent}%`, icon: FileSignature, color: "from-indigo-500 to-blue-600" },
  ] : [];

  const detailLabel = useMemo(() => {
    return cards.find((c) => c.key === detailKey)?.label || "פירוט";
  }, [cards, detailKey]);

  const detailItems: DetailItem[] = (stats && detailKey) ? (stats.details[detailKey] || []) : [];

  return (
    <AppLayout>
      <div dir="rtl" className="p-4 pb-24 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-black text-slate-800">סיכום עד כאן</h1>
          <p className="text-sm text-slate-700">סקירה שנתית מרוכזת לסיכום ביצועים</p>
          <p className="text-xs text-slate-600">לחץ על כרטיסיה לפירוט מלא</p>
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
                const clickable = !!c.key;
                return (
                  <Card
                    key={c.label}
                    className={`bg-card border-border/50 overflow-hidden ${clickable ? "cursor-pointer active:scale-95 transition-transform" : ""}`}
                    onClick={() => clickable && setDetailKey(c.key)}
                  >
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
                  {Object.entries(stats.coursesByName).sort((a, b) => (b[1] as number) - (a[1] as number)).map(([name, count]) => (
                    <div key={name} className="flex items-center justify-between p-3 rounded-xl bg-muted/40">
                      <span className="text-sm font-bold text-slate-800">{name}</span>
                      <span className="text-lg font-black text-primary">{count as number}</span>
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
                  {Object.entries(stats.workEventsByCategory).sort((a, b) => (b[1] as number) - (a[1] as number)).map(([cat, count]) => (
                    <div key={cat} className="flex items-center justify-between p-3 rounded-xl bg-muted/40">
                      <span className="text-sm font-bold text-slate-800">{cat}</span>
                      <span className="text-lg font-black text-primary">{count as number}</span>
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
                  {Object.entries(stats.releasedByReason).sort((a, b) => (b[1] as number) - (a[1] as number)).map(([reason, count]) => (
                    <div key={reason} className="flex items-center justify-between p-3 rounded-xl bg-muted/40">
                      <span className="text-sm font-bold text-slate-800">{reason}</span>
                      <span className="text-lg font-black text-primary">{count as number}</span>
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

        <Dialog open={!!detailKey} onOpenChange={(o) => !o && setDetailKey(null)}>
          <DialogContent dir="rtl" className="max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-slate-800 font-black">{detailLabel} ({detailItems.length})</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              {detailItems.length === 0 ? (
                <div className="text-center text-slate-600 py-8">אין נתונים להצגה</div>
              ) : (
                detailItems.map((it, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-muted/40 border border-border/40">
                    <div className="text-sm font-bold text-slate-800">{it.title}</div>
                    {it.subtitle && <div className="text-xs text-slate-600 mt-1">{it.subtitle}</div>}
                  </div>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}