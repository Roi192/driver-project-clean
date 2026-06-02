import { useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";
import {
  GraduationCap, UserMinus, UserPlus, Car, ClipboardCheck, Gavel,
  Activity, Calendar, BarChart3, AlertTriangle, Heart, FileSignature, TrendingUp,
  Gauge, Route, ShieldCheck, Users, Target, Pencil, Trash2, Plus
} from "lucide-react";
import { MONTHS_HEB } from "@/lib/constants";

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => currentYear - i);

type DetailKind = "accident" | "released" | "intake" | "plain";

interface DetailItem {
  title: string;
  subtitle?: string;
  kind?: DetailKind;
  id?: string;
  raw?: any;
  _manual?: boolean;
  _overrideId?: string;
  _reason?: string;
}

interface YearStats {
  coursesTotal: number;
  coursesByCategory: Record<string, number>;
  coursesByName: Record<string, number>;
  releasedTotal: number;
  releasedNafshi: number;
  releasedByReason: Record<string, number>;
  intakeTotal: number;
  netManpower: number;
  activeSoldiersCount: number;
  accidentsBts: number;
  accidentsGdud: number;
  accidentsTotal: number;
  accidentsJudged: number;
  inspectionsTotal: number;
  inspectionsAvg: number;
  inspectionSectionAvg: Record<string, number>;
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
  totalKm: number;
  speedViolations: number;
  lowSafetyScores: number;
  excellentSafetyScores: number;
  details: Record<string, DetailItem[]>;
  insights: DetailItem[];
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

const safeFetchAll = async <T = any,>(query: any): Promise<T[]> => {
  try { return await fetchAll<T>(query); } catch (e) { console.error(e); return []; }
};

const fmtDate = (d?: string | null) => {
  if (!d) return "";
  try { return new Date(d).toLocaleDateString("he-IL"); } catch { return d; }
};
const getDateKey = (value?: string | null) => value?.slice(0, 10) || null;
const getMonthLabel = (m: number) => MONTHS_HEB.find((x: any) => x.value === m)?.label || String(m);
const avg = (values: number[]) => values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;

const RELEASE_REASONS = [
  { value: "regular", label: "שחרור רגיל" },
  { value: "נפשי", label: "שחרור על נפשי" },
  { value: "שינוי מקצוע", label: "שינוי מקצוע" },
  { value: "פסילת מקצוע", label: "פסילת מקצוע" },
  { value: "רפואי", label: "רפואי" },
  { value: "משמעתי", label: "משמעתי" },
  { value: "העברה ליחידה אחרת", label: "העברה ליחידה אחרת" },
  { value: "הוסר מטבלת השליטה", label: "הוסר מטבלת השליטה" },
  { value: "אחר", label: "אחר" },
];

export default function YearlySummary() {
  const { isAdmin, isSuperAdmin, loading: authLoading, brigade, isDivisionAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [year, setYear] = useState<number>(currentYear);
  const [detailKey, setDetailKey] = useState<string | null>(null);
  const [editAccident, setEditAccident] = useState<any | null>(null);
  const [editReleased, setEditReleased] = useState<any | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ kind: DetailKind; id: string; title: string; manualOverrideId?: string } | null>(null);
  const [addOpen, setAddOpen] = useState<null | "released" | "intake" | "accidentsBts" | "accidentsGdud">(null);
  const [releasedReasonFilter, setReleasedReasonFilter] = useState<string | null>(null);

  const start = `${year}-01-01`;
  const end = `${year}-12-31`;
  const startTs = `${start}T00:00:00.000Z`;
  const endTs = `${end}T23:59:59.999Z`;
  const scopeQuery = (query: any) => (!isDivisionAdmin && brigade ? query.eq("brigade", brigade) : query);

  const { data: stats, isLoading, error, refetch } = useQuery<YearStats>({
    queryKey: ["yearly-summary", year, brigade, isDivisionAdmin],
    queryFn: async () => {
      const [
        soldierCourses, courses, soldiers, sectorEvents, inspections,
        punishments, workEvents, cleaning, interviews, reports,
        monthlyScores, signatures, deletedArchive, overrides
      ] = await Promise.all([
        fetchAll(scopeQuery(supabase.from("soldier_courses").select("id, soldier_id, course_id, status, start_date, end_date").gte("start_date", start).lte("start_date", end))),
        fetchAll(scopeQuery(supabase.from("courses").select("id, name, category"))),
        fetchAll(scopeQuery(supabase.from("soldiers").select("id, full_name, personal_number, release_date, release_reason, outpost, created_at, is_active, current_safety_score, control_removed_at, qualified_date"))),
        fetchAll(scopeQuery(supabase.from("safety_content").select("id, category, title, description, soldier_id, driver_type, driver_name, vehicle_number, event_date, event_type, severity, region, outpost").eq("category", "sector_events"))),
        fetchAll(scopeQuery(supabase.from("inspections").select("id, soldier_id, total_score, inspection_date, vehicle_score, procedures_score, safety_score, routes_familiarity_score, simulations_score").gte("inspection_date", start).lte("inspection_date", end))),
        fetchAll(scopeQuery(supabase.from("punishments").select("id, soldier_id, punishment_date, offense, punishment, judge").gte("punishment_date", start).lte("punishment_date", end))),
        fetchAll(scopeQuery(supabase.from("work_plan_events").select("id, category, title, event_date, status, content_cycle").gte("event_date", start).lte("event_date", end))),
        safeFetchAll(scopeQuery(supabase.from("cleaning_parades" as any).select("id, parade_date, outpost, responsible_driver, created_at").gte("parade_date", start).lte("parade_date", end))),
        safeFetchAll(scopeQuery(supabase.from("driver_interviews" as any).select("id, interview_date, created_at, soldier_id, driver_name").gte("interview_date", start).lte("interview_date", end))),
        safeFetchAll(scopeQuery(supabase.from("shift_reports" as any).select("id, report_date, created_at, outpost, driver_name, shift_type").gte("report_date", start).lte("report_date", end))),
        safeFetchAll(scopeQuery(supabase.from("monthly_safety_scores" as any).select("id, soldier_id, safety_score, score_month, kilometers, speed_violations, harsh_braking, harsh_turns, harsh_accelerations, illegal_overtakes").gte("score_month", start).lte("score_month", end))),
        safeFetchAll(scopeQuery(supabase.from("procedure_signatures" as any).select("user_id, procedure_type, full_name, created_at").gte("created_at", startTs).lte("created_at", endTs))),
        safeFetchAll(scopeQuery(supabase.from("deleted_soldiers_archive" as any).select("id, original_soldier_id, full_name, personal_number, outpost, release_reason, release_date, control_removed_at, soldier_created_at, deleted_at"))),
        safeFetchAll(scopeQuery(supabase.from("yearly_summary_overrides" as any).select("id, year, kind, action, original_id, payload").eq("year", year))),
      ]);

      const hiddenByKind = new Map<string, Set<string>>();
      const manualByKind = new Map<string, any[]>();
      (overrides as any[]).forEach((o: any) => {
        if (o.action === "hide") {
          const set = hiddenByKind.get(o.kind) || new Set<string>();
          set.add(String(o.original_id));
          hiddenByKind.set(o.kind, set);
        } else if (o.action === "manual") {
          const arr = manualByKind.get(o.kind) || [];
          arr.push({ ...o.payload, _manual: true, _overrideId: o.id });
          manualByKind.set(o.kind, arr);
        }
      });
      const isHidden = (kind: string, id?: string | null) => !!(id && hiddenByKind.get(kind)?.has(String(id)));
      const manualOf = (kind: string) => manualByKind.get(kind) || [];

      // Filter sector events by year (event_date may be null — fall back to created_at later, but safer to filter here)
      const accidents = sectorEvents.filter((s: any) => {
        const d = getDateKey(s.event_date);
        return d && d >= start && d <= end;
      });

      const soldierById = new Map((soldiers as any[]).map((s: any) => [s.id, s]));
      const courseById = new Map((courses as any[]).map((c: any) => [c.id, c]));
      const soldierName = (id?: string | null, fallback = "ללא שם") => {
        const s = id ? soldierById.get(id) : null;
        return s?.full_name || fallback;
      };
      const soldierSubtitle = (id?: string | null) => {
        const s = id ? soldierById.get(id) : null;
        return [s?.personal_number, s?.outpost].filter(Boolean).join(" · ");
      };

      const coursesByCategory: Record<string, number> = {};
      const coursesByName: Record<string, number> = {};
      soldierCourses.forEach((sc: any) => {
        const c = courseById.get(sc.course_id);
        const cat = c?.category || "אחר";
        const name = c?.name || "קורס ללא שם";
        coursesByCategory[cat] = (coursesByCategory[cat] || 0) + 1;
        coursesByName[name] = (coursesByName[name] || 0) + 1;
      });

      // Only include soldiers that ALREADY released/removed (not future-dated)
      const todayKey = new Date().toISOString().slice(0, 10);
      const releasesFromActive = soldiers.filter((s: any) => {
        const rd = getDateKey(s.release_date);
        const rmv = getDateKey(s.control_removed_at);
        const rdInRange = rd && rd >= start && rd <= end && rd <= todayKey;
        const rmvInRange = rmv && rmv >= start && rmv <= end && rmv <= todayKey;
        return rdInRange || rmvInRange;
      });
      // Include permanently-deleted soldiers from archive — use deleted_at if no release/removal date
      const archivedReleases = (deletedArchive as any[]).filter((a: any) => {
        const rd = getDateKey(a.release_date);
        const rmv = getDateKey(a.control_removed_at);
        const del = getDateKey(a.deleted_at);
        const effective = rd || rmv || del;
        return effective && effective >= start && effective <= end && effective <= todayKey;
      }).map((a: any) => ({
        id: a.id,
        full_name: a.full_name,
        personal_number: a.personal_number,
        outpost: a.outpost,
        release_reason: a.release_reason || "נמחק מהמערכת",
        release_date: a.release_date || a.control_removed_at || a.deleted_at,
        control_removed_at: a.control_removed_at || a.deleted_at,
        created_at: a.soldier_created_at,
        _archived: true,
        _archiveId: a.id,
      }));
      const releasesAll = [...releasesFromActive, ...archivedReleases];
      const releases = releasesAll.filter((r: any) => !isHidden("released", r.id));
      const releasesManual = manualOf("released");
      const releasesCombined = [...releases, ...releasesManual];
      const intakeAll = soldiers.filter((s: any) => getDateKey(s.created_at) >= start && getDateKey(s.created_at) <= end);
      const intake = intakeAll.filter((s: any) => !isHidden("intake", s.id));
      const intakeManual = manualOf("intake");
      const intakeCombined = [...intake, ...intakeManual];
      const activeSoldiersCount = soldiers.filter((s: any) => s.is_active).length;
      const netManpower = intakeCombined.length - releasesCombined.length;

      // Classify accidents — align with mעקב תאונות (only security + combat, ignore null)
      const isBts = (a: any) => String(a.driver_type || "").toLowerCase() === "security";
      const isGdudCombat = (a: any) => String(a.driver_type || "").toLowerCase() === "combat";
      const accidentsBtsList = [
        ...accidents.filter((a: any) => isBts(a) && !isHidden("accidentsBts", a.id)),
        ...manualOf("accidentsBts"),
      ];
      const accidentsGdudList = [
        ...accidents.filter((a: any) => isGdudCombat(a) && !isHidden("accidentsGdud", a.id)),
        ...manualOf("accidentsGdud"),
      ];
      const accidentsCounted = [...accidentsBtsList, ...accidentsGdudList];
      const accidentsJudged = 0;

      const insScores = inspections.map((i: any) => Number(i.total_score)).filter((s: any) => Number.isFinite(s));
      const inspectionsAvg = avg(insScores);
      const inspectionSectionAvg = {
        "רכב": avg(inspections.map((i: any) => Number(i.vehicle_score)).filter(Number.isFinite)),
        "נהלים": avg(inspections.map((i: any) => Number(i.procedures_score)).filter(Number.isFinite)),
        "בטיחות": avg(inspections.map((i: any) => Number(i.safety_score)).filter(Number.isFinite)),
        "צירים": avg(inspections.map((i: any) => Number(i.routes_familiarity_score)).filter(Number.isFinite)),
        "סימולציות": avg(inspections.map((i: any) => Number(i.simulations_score)).filter(Number.isFinite)),
      };

      const workEventsByCategory: Record<string, number> = {};
      let trainingDays = 0;
      let fitnessDays = 0;
      workEvents.forEach((e: any) => {
        const cat = e.category || "אחר";
        workEventsByCategory[cat] = (workEventsByCategory[cat] || 0) + 1;
        const t = `${e.title || ""} ${e.content_cycle || ""}`.toLowerCase();
        if (t.includes("השתלמות") || t.includes("הדרכ") || t.includes("אימון")) trainingDays++;
        if (t.includes("כשירות")) fitnessDays++;
      });

      const currentSafetyScores = soldiers.map((s: any) => Number(s.current_safety_score)).filter((s: any) => Number.isFinite(s) && s > 0);
      const avgSafetyScore = avg(currentSafetyScores);

      const buckets: Record<number, number[]> = {};
      monthlyScores.forEach((s: any) => {
        const score = Number(s.safety_score);
        if (!Number.isFinite(score)) return;
        const m = parseInt(String(s.score_month).slice(5, 7));
        if (!buckets[m]) buckets[m] = [];
        buckets[m].push(score);
      });
      const monthlySafetyAvg = Array.from({ length: 12 }, (_, i) => {
        const month = i + 1;
        const arr = buckets[month] || [];
        return { month, label: getMonthLabel(month), avg: avg(arr), count: arr.length };
      });
      const allYtdScores = monthlyScores.map((s: any) => Number(s.safety_score)).filter(Number.isFinite);
      const avgSafetyScoreYTD = avg(allYtdScores);
      const totalKm = Math.round(monthlyScores.reduce((sum: number, s: any) => sum + Number(s.kilometers || 0), 0));
      const speedViolations = monthlyScores.reduce((sum: number, s: any) => sum + Number(s.speed_violations || 0), 0);
      const lowSafetyScores = monthlyScores.filter((s: any) => Number(s.safety_score) < 75).length;
      const excellentSafetyScores = monthlyScores.filter((s: any) => Number(s.safety_score) >= 90).length;

      const procedureTypes = [
        { type: "routine", label: "נהלי שגרה" },
        { type: "shift", label: "נהלים במהלך משמרת" },
        { type: "aluf70", label: "נוהל אלוף 70" },
      ];
      const procedureCompletion = procedureTypes.map(({ type, label }) => {
        const signedUsers = new Set(signatures.filter((s: any) => s.procedure_type === type).map((s: any) => s.user_id));
        const signed = signedUsers.size;
        const total = activeSoldiersCount || 0;
        const percent = total ? Math.round((signed / total) * 100) : 0;
        return { type, label, percent, signed, total };
      });
      const procedureOverallPercent = procedureCompletion.length
        ? Math.round(procedureCompletion.reduce((sum, p) => sum + p.percent, 0) / procedureCompletion.length)
        : 0;

      const releasedNafshi = releasesCombined.filter((r: any) => (r.release_reason || "").includes("נפשי")).length;
      const releasedByReason: Record<string, number> = {};
      releasesCombined.forEach((r: any) => {
        const reason = r.release_reason || "שחרור רגיל";
        releasedByReason[reason] = (releasedByReason[reason] || 0) + 1;
      });

      const accidentToItem = (a: any): DetailItem => {
        const name = soldierName(a.soldier_id, a.driver_name || "ללא שם נהג");
        const dt = a.driver_type === "security" ? 'בט"ש' : a.driver_type === "combat" ? "גדוד" : (a.driver_type || "סוג לא הוזן");
        return {
          title: `${name} — ${a.title || "תאונה"}`,
          subtitle: `${fmtDate(a.event_date)} · ${dt} · ${a.outpost || "ללא מיקום"} · ${a.severity || ""}`,
          kind: "accident",
          id: a.id,
          raw: a,
          _manual: a._manual,
          _overrideId: a._overrideId,
        };
      };
      const scoreToItem = (s: any): DetailItem => ({
        title: soldierName(s.soldier_id),
        subtitle: `${getMonthLabel(parseInt(String(s.score_month).slice(5, 7)))} · ציון ${s.safety_score} · ${Number(s.kilometers || 0).toLocaleString("he-IL")} ק״מ · ${s.speed_violations || 0} חריגות`,
      });

      const releasedToItem = (r: any): DetailItem => ({
        title: r.full_name,
        subtitle: `${r.personal_number || ""} · ${r.outpost || ""} · ${r.release_reason || "שחרור רגיל"} · ${fmtDate(r.release_date || r.control_removed_at)}`,
        kind: "released",
        id: r.id,
        raw: r,
        _manual: r._manual,
        _overrideId: r._overrideId,
        _reason: r.release_reason || "שחרור רגיל",
      });

      const insights: DetailItem[] = [
        { title: netManpower >= 0 ? "מגמת כוח אדם חיובית/יציבה" : "ירידה בכוח אדם", subtitle: `נקלטו ${intakeCombined.length}, השתחררו/הוסרו ${releasesCombined.length}, נטו ${netManpower}` },
        { title: lowSafetyScores > 0 ? "יש ציוני בטיחות שמצריכים טיפול" : "אין ציוני בטיחות חריגים מתחת 75", subtitle: `${lowSafetyScores} ציונים מתחת 75, ${excellentSafetyScores} ציונים 90+` },
        { title: procedureOverallPercent >= 90 ? "חתימות נהלים במצב טוב" : "כדאי להשלים חתימות נהלים", subtitle: `השלמה ממוצעת ${procedureOverallPercent}% מתוך ${activeSoldiersCount} חיילים פעילים` },
        { title: accidentsCounted.length > 0 ? "תאונות לתחקור בסיכום תקופה" : "לא דווחו תאונות בתקופה", subtitle: `בט״ש ${accidentsBtsList.length}, גדוד ${accidentsGdudList.length}` },
      ];

      const details: Record<string, DetailItem[]> = {
        courses: soldierCourses.map((sc: any) => {
          const c = courseById.get(sc.course_id);
          return { title: soldierName(sc.soldier_id), subtitle: `${c?.name || "קורס ללא שם"} · ${sc.status || ""} · ${fmtDate(sc.start_date)}` };
        }),
        intake: intakeCombined.map((s: any) => ({ title: s.full_name, subtitle: `${s.personal_number || ""} · ${s.outpost || ""} · נקלט ${fmtDate(s.created_at)}`, kind: "intake" as DetailKind, id: s.id, raw: s, _manual: s._manual, _overrideId: s._overrideId })),
        released: releasesCombined.map(releasedToItem),
        releasedNafshi: releasesCombined.filter((r: any) => (r.release_reason || "").includes("נפשי")).map(releasedToItem),
        accidentsBts: accidentsBtsList.map(accidentToItem),
        accidentsGdud: accidentsGdudList.map(accidentToItem),
        accidentsTotal: accidentsCounted.map(accidentToItem),
        inspections: inspections.map((i: any) => ({ title: soldierName(i.soldier_id, "ביקורת"), subtitle: `${fmtDate(i.inspection_date)} · ציון ${i.total_score ?? "—"} · ${soldierSubtitle(i.soldier_id)}` })),
        punishments: punishments.map((p: any) => ({ title: soldierName(p.soldier_id), subtitle: `${fmtDate(p.punishment_date)} · ${p.offense || ""} · ${p.punishment || ""} · ${p.judge || ""}` })),
        workEvents: workEvents.map((e: any) => ({ title: e.title || "—", subtitle: `${fmtDate(e.event_date)} · ${e.category || ""} · ${e.status || ""}` })),
        training: workEvents.filter((e: any) => `${e.title || ""} ${e.content_cycle || ""}`.includes("השתל") || `${e.title || ""}`.includes("הדרכ") || `${e.title || ""}`.includes("אימון")).map((e: any) => ({ title: e.title, subtitle: fmtDate(e.event_date) })),
        fitness: workEvents.filter((e: any) => `${e.title || ""} ${e.content_cycle || ""}`.includes("כשירות")).map((e: any) => ({ title: e.title, subtitle: fmtDate(e.event_date) })),
        cleaning: cleaning.map((c: any) => ({ title: c.responsible_driver || "מסדר ניקיון", subtitle: `${fmtDate(c.parade_date || c.created_at)} · ${c.outpost || ""}` })),
        interviews: interviews.map((i: any) => ({ title: soldierName(i.soldier_id, i.driver_name || "ראיון"), subtitle: fmtDate(i.interview_date || i.created_at) })),
        reports: reports.map((r: any) => ({ title: r.driver_name || "דיווח משמרת", subtitle: `${fmtDate(r.report_date || r.created_at)} · ${r.outpost || ""} · ${r.shift_type || ""}` })),
        lowSafety: monthlyScores.filter((s: any) => Number(s.safety_score) < 75).map(scoreToItem),
        excellentSafety: monthlyScores.filter((s: any) => Number(s.safety_score) >= 90).map(scoreToItem),
        speedViolations: monthlyScores.filter((s: any) => Number(s.speed_violations || 0) > 0).map(scoreToItem),
      };

      return {
        coursesTotal: soldierCourses.length, coursesByCategory, coursesByName,
        releasedTotal: releasesCombined.length, releasedNafshi, releasedByReason,
        intakeTotal: intakeCombined.length, netManpower, activeSoldiersCount,
        accidentsBts: accidentsBtsList.length, accidentsGdud: accidentsGdudList.length,
        accidentsTotal: accidentsBtsList.length + accidentsGdudList.length, accidentsJudged,
        inspectionsTotal: inspections.length, inspectionsAvg, inspectionSectionAvg,
        punishmentsTotal: punishments.length, trainingDays, fitnessDays,
        workEventsTotal: workEvents.length, workEventsByCategory,
        cleaningParades: cleaning.length, driverInterviews: interviews.length, shiftReports: reports.length,
        avgSafetyScore, avgSafetyScoreYTD, monthlySafetyAvg,
        procedureCompletion, procedureOverallPercent,
        totalKm, speedViolations, lowSafetyScores, excellentSafetyScores,
        details, insights,
      };
    },
    enabled: isAdmin || isSuperAdmin,
  });

  const cards: { key: string | null; label: string; value: any; icon: any; color: string }[] = stats ? [
    { key: "courses", label: "סך קורסים שבוצעו", value: stats.coursesTotal, icon: GraduationCap, color: "from-violet-500 to-purple-600" },
    { key: "intake", label: "נהגים נקלטו", value: stats.intakeTotal, icon: UserPlus, color: "from-emerald-500 to-green-600" },
    { key: "released", label: "סך הכל משתחררים", value: stats.releasedTotal, icon: UserMinus, color: "from-slate-500 to-slate-700" },
    { key: null, label: "נטו כוח אדם", value: stats.netManpower > 0 ? `+${stats.netManpower}` : stats.netManpower, icon: Users, color: "from-teal-500 to-emerald-600" },
    { key: "releasedNafshi", label: "שחרור על נפשי", value: stats.releasedNafshi, icon: Heart, color: "from-fuchsia-500 to-pink-600" },
    { key: "accidentsBts", label: 'תאונות בט"ש', value: stats.accidentsBts, icon: Car, color: "from-orange-500 to-red-500" },
    { key: "accidentsGdud", label: "תאונות גדוד", value: stats.accidentsGdud, icon: Car, color: "from-red-500 to-rose-700" },
    { key: "accidentsTotal", label: "סך תאונות", value: stats.accidentsTotal, icon: AlertTriangle, color: "from-red-600 to-red-800" },
    { key: "inspections", label: "ביקורות שבוצעו", value: stats.inspectionsTotal, icon: ClipboardCheck, color: "from-blue-500 to-indigo-600" },
    { key: null, label: "ממוצע ציון ביקורת", value: stats.inspectionsAvg.toFixed(1), icon: BarChart3, color: "from-cyan-500 to-blue-600" },
    { key: "punishments", label: "עונשים", value: stats.punishmentsTotal, icon: Gavel, color: "from-rose-500 to-pink-600" },
    { key: "fitness", label: "ימי כשירות", value: stats.fitnessDays, icon: ShieldCheck, color: "from-pink-500 to-rose-600" },
    { key: "training", label: "ימי השתלמות / הדרכה", value: stats.trainingDays, icon: Activity, color: "from-amber-500 to-orange-600" },
    { key: "workEvents", label: "סך מופעים בתוכנית", value: stats.workEventsTotal, icon: Calendar, color: "from-teal-500 to-emerald-600" },
    { key: "cleaning", label: "מסדרי ניקיון", value: stats.cleaningParades, icon: ClipboardCheck, color: "from-purple-500 to-fuchsia-600" },
    { key: "interviews", label: "ראיונות נהגים", value: stats.driverInterviews, icon: ClipboardCheck, color: "from-indigo-500 to-violet-600" },
    { key: "reports", label: "דיווחי משמרת", value: stats.shiftReports, icon: ClipboardCheck, color: "from-sky-500 to-blue-600" },
    { key: null, label: "ממוצע ציון בטיחות נוכחי", value: stats.avgSafetyScore.toFixed(1), icon: BarChart3, color: "from-green-500 to-emerald-600" },
    { key: null, label: "ממוצע בטיחות מתחילת שנה", value: stats.avgSafetyScoreYTD.toFixed(1), icon: TrendingUp, color: "from-emerald-500 to-teal-600" },
    { key: null, label: "אחוז השלמת חתימות נהלים", value: `${stats.procedureOverallPercent}%`, icon: FileSignature, color: "from-indigo-500 to-blue-600" },
    { key: null, label: "סה״כ ק״מ מדווח", value: stats.totalKm.toLocaleString("he-IL"), icon: Route, color: "from-lime-500 to-emerald-600" },
    { key: "speedViolations", label: "חריגות מהירות", value: stats.speedViolations, icon: Gauge, color: "from-amber-600 to-red-600" },
    { key: "lowSafety", label: "ציונים מתחת 75", value: stats.lowSafetyScores, icon: Target, color: "from-red-500 to-red-700" },
    { key: "excellentSafety", label: "ציונים 90+", value: stats.excellentSafetyScores, icon: TrendingUp, color: "from-emerald-500 to-green-700" },
  ] : [];

  const detailLabel = useMemo(() => cards.find((c) => c.key === detailKey)?.label || "פירוט", [cards, detailKey]);
  const baseDetailItems: DetailItem[] = (stats && detailKey) ? (stats.details[detailKey] || []) : [];
  const detailItems: DetailItem[] = (detailKey === "released" && releasedReasonFilter)
    ? baseDetailItems.filter((it) => (it._reason || "שחרור רגיל") === releasedReasonFilter)
    : baseDetailItems;
  const canAdd = detailKey && ["released", "intake", "accidentsBts", "accidentsGdud"].includes(detailKey);
  const releasedReasonCounts = useMemo(() => {
    if (detailKey !== "released") return [] as { reason: string; count: number }[];
    const m = new Map<string, number>();
    baseDetailItems.forEach((it) => {
      const r = it._reason || "שחרור רגיל";
      m.set(r, (m.get(r) || 0) + 1);
    });
    return Array.from(m.entries()).map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count);
  }, [detailKey, baseDetailItems]);

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      // If it's a manual entry, just delete the override row
      if (confirmDelete.manualOverrideId) {
        const { error } = await supabase.from("yearly_summary_overrides" as any).delete().eq("id", confirmDelete.manualOverrideId);
        if (error) throw error;
      } else {
        // Hide from list only — never touch source data
        let kind = "";
        if (confirmDelete.kind === "released") kind = "released";
        else if (confirmDelete.kind === "intake") kind = "intake";
        else if (confirmDelete.kind === "accident") {
          // figure out bts vs gdud from current detailKey
          kind = detailKey === "accidentsBts" ? "accidentsBts" : detailKey === "accidentsGdud" ? "accidentsGdud" : "accidentsBts";
        }
        const { error } = await supabase.from("yearly_summary_overrides" as any).insert({
          year, kind, action: "hide", original_id: confirmDelete.id, brigade: brigade || "binyamin",
        });
        if (error) throw error;
      }
      toast.success("הוסר מהרשימה");
      setConfirmDelete(null);
      await refetch();
    } catch (e: any) {
      toast.error(`שגיאה במחיקה: ${e?.message || e}`);
    }
  };

  if (authLoading) return null;
  if (!isAdmin && !isSuperAdmin) return <Navigate to="/" replace />;

  return (
    <AppLayout>
      <div dir="rtl" className="p-4 pb-24 space-y-6 bg-background min-h-screen">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-black text-slate-800">סיכום עד כאן</h1>
          <p className="text-sm text-slate-700">סקירה שנתית מרוכזת לסיכומי תקופה ושנה</p>
          <p className="text-xs text-slate-600">לחץ על כרטיסיה לפירוט מלא</p>
        </div>

        <div className="flex justify-center">
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-48 bg-card text-slate-800 font-bold border-border"><SelectValue /></SelectTrigger>
            <SelectContent>
              {YEARS.map((y) => (<SelectItem key={y} value={String(y)}>שנת {y}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="text-center text-slate-700 py-12">טוען נתונים...</div>
        ) : error ? (
          <Card className="bg-red-50 border-red-200"><CardContent className="p-4 text-right"><div className="font-black text-red-700 mb-2">שגיאה בטעינת הסיכום</div><div className="text-sm text-red-700 whitespace-pre-wrap">{(error as any)?.message || String(error)}</div></CardContent></Card>
        ) : stats ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              {cards.map((c) => {
                const Icon = c.icon;
                const clickable = !!c.key;
                return (
                  <Card key={c.label} className={`bg-card border-border/50 overflow-hidden ${clickable ? "cursor-pointer active:scale-95 transition-transform" : ""}`} onClick={() => clickable && setDetailKey(c.key)}>
                    <CardContent className="p-4">
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${c.color} flex items-center justify-center shadow-lg mb-3`}><Icon className="w-5 h-5 text-white" /></div>
                      <div className="text-3xl font-black text-slate-800 break-words">{c.value}</div>
                      <div className="text-sm font-bold text-slate-700 mt-1 leading-tight">{c.label}</div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <Card className="bg-card border-border/50">
              <CardHeader><CardTitle className="text-lg font-bold text-slate-800">נקודות לסיכום תקופה</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {stats.insights.map((insight, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-white border-2 border-slate-300 shadow-sm">
                    <div className="text-sm font-bold text-slate-800">{insight.title}</div>
                    <div className="text-xs text-slate-600 mt-1">{insight.subtitle}</div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {Object.keys(stats.releasedByReason).length > 0 && (
              <Card className="bg-card border-border/50">
                <CardHeader><CardTitle className="text-lg font-bold text-slate-800">פירוט שחרורים לפי סיבה</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {Object.entries(stats.releasedByReason).sort((a, b) => (b[1] as number) - (a[1] as number)).map(([reason, count]) => (
                    <div key={reason} className="flex items-center justify-between p-3 rounded-xl bg-white border-2 border-slate-300 shadow-sm">
                      <span className="text-sm font-bold text-slate-800">{reason}</span>
                      <span className="text-lg font-black text-primary">{count as number}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {Object.keys(stats.coursesByName).length > 0 && (
              <Card className="bg-card border-border/50">
                <CardHeader><CardTitle className="text-lg font-bold text-slate-800">פירוט קורסים לפי סוג</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {Object.entries(stats.coursesByName).sort((a, b) => (b[1] as number) - (a[1] as number)).map(([name, count]) => (
                    <div key={name} className="flex items-center justify-between p-3 rounded-xl bg-white border-2 border-slate-300 shadow-sm">
                      <span className="text-sm font-bold text-slate-800">{name}</span>
                      <span className="text-lg font-black text-primary">{count as number}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {stats.inspectionsTotal > 0 && (
              <Card className="bg-card border-border/50">
                <CardHeader><CardTitle className="text-lg font-bold text-slate-800">ממוצעי ביקורות לפי תחום</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {Object.entries(stats.inspectionSectionAvg).map(([section, value]) => (
                    <div key={section} className="flex items-center justify-between p-3 rounded-xl bg-white border-2 border-slate-300 shadow-sm">
                      <span className="text-sm font-bold text-slate-800">{section}</span>
                      <span className="text-lg font-black text-primary">{value ? value.toFixed(1) : "—"}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {Object.keys(stats.workEventsByCategory).length > 0 && (
              <Card className="bg-card border-border/50">
                <CardHeader><CardTitle className="text-lg font-bold text-slate-800">מופעים בתוכנית עבודה לפי קטגוריה</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {Object.entries(stats.workEventsByCategory).sort((a, b) => (b[1] as number) - (a[1] as number)).map(([cat, count]) => (
                    <div key={cat} className="flex items-center justify-between p-3 rounded-xl bg-white border-2 border-slate-300 shadow-sm">
                      <span className="text-sm font-bold text-slate-800">{cat}</span>
                      <span className="text-lg font-black text-primary">{count as number}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {stats.monthlySafetyAvg.some((m) => m.count > 0) && (
              <Card className="bg-card border-border/50">
                <CardHeader><CardTitle className="text-lg font-bold text-slate-800">ממוצע ציוני בטיחות לפי חודש</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {stats.monthlySafetyAvg.map((m) => (
                    <div key={m.month} className="flex items-center justify-between p-3 rounded-xl bg-white border-2 border-slate-300 shadow-sm">
                      <span className="text-sm font-bold text-slate-800">{m.label}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-600">{m.count} ציונים</span>
                        <span className="text-lg font-black text-primary">{m.count > 0 ? m.avg.toFixed(1) : "—"}</span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {stats.procedureCompletion.length > 0 && (
              <Card className="bg-card border-border/50">
                <CardHeader><CardTitle className="text-lg font-bold text-slate-800">השלמת חתימות נהלים</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {stats.procedureCompletion.map((p) => (
                    <div key={p.type} className="flex items-center justify-between p-3 rounded-xl bg-white border-2 border-slate-300 shadow-sm">
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
        ) : (
          <div className="text-center text-slate-700 py-12">אין נתונים להצגה</div>
        )}

        {/* Detail dialog */}
        <Dialog open={!!detailKey} onOpenChange={(o) => { if (!o) { setDetailKey(null); setReleasedReasonFilter(null); } }}>
          <DialogContent dir="rtl" className="max-h-[85vh] overflow-y-auto bg-white">
            <DialogHeader>
              <div className="flex items-center justify-between gap-2">
                <DialogTitle className="text-slate-800 font-black">{detailLabel} ({detailItems.length})</DialogTitle>
                {canAdd && (
                  <Button size="sm" onClick={() => setAddOpen(detailKey as any)} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                    <Plus className="w-4 h-4" /> הוספה
                  </Button>
                )}
              </div>
            </DialogHeader>
            {detailKey === "released" && releasedReasonCounts.length > 0 && (
              <div className="space-y-2 mb-2">
                <div className="text-xs font-bold text-slate-700">פילוח לפי סיבת שחרור (לחץ לסינון)</div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setReleasedReasonFilter(null)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 ${!releasedReasonFilter ? "bg-primary text-primary-foreground border-primary" : "bg-white text-slate-800 border-slate-300"}`}
                  >הכל ({baseDetailItems.length})</button>
                  {releasedReasonCounts.map((r) => (
                    <button
                      key={r.reason}
                      onClick={() => setReleasedReasonFilter(r.reason === releasedReasonFilter ? null : r.reason)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 ${releasedReasonFilter === r.reason ? "bg-primary text-primary-foreground border-primary" : "bg-white text-slate-800 border-slate-300"}`}
                    >{r.reason} ({r.count})</button>
                  ))}
                </div>
              </div>
            )}
            <div className="space-y-2">
              {detailItems.length === 0 ? (
                <div className="text-center text-slate-600 py-8">אין נתונים להצגה</div>
              ) : (
                detailItems.map((it, idx) => (
                  <div key={it.id || idx} className="p-3 rounded-xl bg-white border-2 border-slate-300 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-extrabold text-slate-900 break-words">{it.title}</div>
                        {it.subtitle && <div className="text-xs font-semibold text-slate-700 mt-1 break-words">{it.subtitle}</div>}
                      </div>
                      {(it.kind === "accident" || it.kind === "released" || it.kind === "intake") && (
                        <div className="flex flex-col gap-1 shrink-0">
                          {(it.kind === "accident" || it.kind === "released") && !it._manual && (
                            <Button size="sm" variant="outline" className="h-8 px-2 text-xs" onClick={() => {
                              if (it.kind === "accident") setEditAccident(it.raw);
                              else setEditReleased(it.raw);
                            }}><Pencil className="w-3 h-3" /></Button>
                          )}
                          <Button size="sm" variant="outline" className="h-8 px-2 text-xs text-red-600 border-red-300" onClick={() => setConfirmDelete({ kind: it.kind!, id: it.id!, title: it.title, manualOverrideId: it._overrideId })}><Trash2 className="w-3 h-3" /></Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Manual add dialog */}
        {addOpen && (
          <ManualAddDialog
            kind={addOpen}
            year={year}
            brigade={brigade || "binyamin"}
            onClose={() => setAddOpen(null)}
            onSaved={async () => { setAddOpen(null); await refetch(); }}
          />
        )}

        {/* Edit accident */}
        {editAccident && (
          <EditAccidentDialog
            accident={editAccident}
            onClose={() => setEditAccident(null)}
            onSaved={async () => { setEditAccident(null); await refetch(); }}
          />
        )}

        {/* Edit released soldier */}
        {editReleased && (
          <EditReleasedDialog
            soldier={editReleased}
            onClose={() => setEditReleased(null)}
            onSaved={async () => { setEditReleased(null); await refetch(); }}
          />
        )}

        {/* Confirm delete */}
        <Dialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
          <DialogContent dir="rtl" className="bg-white">
            <DialogHeader><DialogTitle className="text-slate-800 font-black">הסרה מהרשימה</DialogTitle></DialogHeader>
            <div className="text-sm text-slate-700">האם להסיר את "{confirmDelete?.title}" מרשימת הסיכום? הנתון המקורי במערכת לא יושפע.</div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setConfirmDelete(null)}>ביטול</Button>
              <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={handleDelete}>הסר</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}

function EditAccidentDialog({ accident, onClose, onSaved }: { accident: any; onClose: () => void; onSaved: () => void; }) {
  const [form, setForm] = useState({
    title: accident.title || "",
    description: accident.description || "",
    event_date: getDateKey(accident.event_date) || "",
    driver_type: accident.driver_type || "combat",
    driver_name: accident.driver_name || "",
    severity: accident.severity || "minor",
    outpost: accident.outpost || "",
    vehicle_number: accident.vehicle_number || "",
  });
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from("safety_content").update({
        title: form.title,
        description: form.description || null,
        event_date: form.event_date || null,
        driver_type: form.driver_type,
        driver_name: form.driver_name || null,
        severity: form.severity,
        outpost: form.outpost || null,
        vehicle_number: form.vehicle_number || null,
      }).eq("id", accident.id);
      if (error) throw error;
      toast.success("האירוע עודכן");
      onSaved();
    } catch (e: any) {
      toast.error(`שגיאה בעדכון: ${e?.message || e}`);
    } finally { setSaving(false); }
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent dir="rtl" className="bg-white max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="text-slate-800 font-black">עריכת תאונה</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label className="text-slate-800 font-bold">כותרת</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div><Label className="text-slate-800 font-bold">תאריך</Label><Input type="date" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} /></div>
          <div>
            <Label className="text-slate-800 font-bold">סוג נהג</Label>
            <Select value={form.driver_type} onValueChange={(v) => setForm({ ...form, driver_type: v })}>
              <SelectTrigger className="bg-white text-slate-800"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="security">בט"ש</SelectItem>
                <SelectItem value="combat">גדוד</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label className="text-slate-800 font-bold">שם נהג</Label><Input value={form.driver_name} onChange={(e) => setForm({ ...form, driver_name: e.target.value })} placeholder="שם הנהג שעשה את התאונה" /></div>
          <div><Label className="text-slate-800 font-bold">מיקום / מוצב</Label><Input value={form.outpost} onChange={(e) => setForm({ ...form, outpost: e.target.value })} /></div>
          <div><Label className="text-slate-800 font-bold">מספר רכב</Label><Input value={form.vehicle_number} onChange={(e) => setForm({ ...form, vehicle_number: e.target.value })} /></div>
          <div>
            <Label className="text-slate-800 font-bold">חומרה</Label>
            <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v })}>
              <SelectTrigger className="bg-white text-slate-800"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="minor">קלה</SelectItem>
                <SelectItem value="moderate">בינונית</SelectItem>
                <SelectItem value="severe">חמורה</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label className="text-slate-800 font-bold">תיאור</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>ביטול</Button>
          <Button onClick={save} disabled={saving}>{saving ? "שומר..." : "שמור"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditReleasedDialog({ soldier, onClose, onSaved }: { soldier: any; onClose: () => void; onSaved: () => void; }) {
  const initialReason = soldier.release_reason || "";
  const matched = RELEASE_REASONS.find((r) => r.value === initialReason);
  const [reasonValue, setReasonValue] = useState<string>(matched?.value || (initialReason ? "אחר" : "regular"));
  const [customReason, setCustomReason] = useState<string>(matched ? "" : initialReason);
  const [releaseDate, setReleaseDate] = useState<string>(getDateKey(soldier.release_date) || "");
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    try {
      const finalReason = reasonValue === "regular" ? null : (reasonValue === "אחר" ? (customReason || "אחר") : reasonValue);
      const { error } = await supabase.from("soldiers").update({
        release_reason: finalReason,
        release_date: releaseDate || null,
      }).eq("id", soldier.id);
      if (error) throw error;
      toast.success("עודכן בהצלחה");
      onSaved();
    } catch (e: any) {
      toast.error(`שגיאה בעדכון: ${e?.message || e}`);
    } finally { setSaving(false); }
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent dir="rtl" className="bg-white max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="text-slate-800 font-black">עריכת שחרור — {soldier.full_name}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label className="text-slate-800 font-bold">תאריך שחרור</Label><Input type="date" value={releaseDate} onChange={(e) => setReleaseDate(e.target.value)} /></div>
          <div>
            <Label className="text-slate-800 font-bold">סיבת שחרור</Label>
            <Select value={reasonValue} onValueChange={setReasonValue}>
              <SelectTrigger className="bg-white text-slate-800"><SelectValue /></SelectTrigger>
              <SelectContent>
                {RELEASE_REASONS.map((r) => (<SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          {reasonValue === "אחר" && (
            <div><Label className="text-slate-800 font-bold">פירוט סיבה</Label><Input value={customReason} onChange={(e) => setCustomReason(e.target.value)} /></div>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>ביטול</Button>
          <Button onClick={save} disabled={saving}>{saving ? "שומר..." : "שמור"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ManualAddDialog({ kind, year, brigade, onClose, onSaved }: { kind: "released" | "intake" | "accidentsBts" | "accidentsGdud"; year: number; brigade: string; onClose: () => void; onSaved: () => void; }) {
  const isReleased = kind === "released";
  const isIntake = kind === "intake";
  const isAccident = kind === "accidentsBts" || kind === "accidentsGdud";
  const [saving, setSaving] = useState(false);

  // Released
  const [fullName, setFullName] = useState("");
  const [personalNumber, setPersonalNumber] = useState("");
  const [outpost, setOutpost] = useState("");
  const [reasonValue, setReasonValue] = useState("regular");
  const [customReason, setCustomReason] = useState("");
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));

  // Accident
  const [title, setTitle] = useState("");
  const [driverName, setDriverName] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [severity, setSeverity] = useState("minor");
  const [description, setDescription] = useState("");

  const titleHeader = isReleased ? "הוספת משתחרר/הוסר ידנית"
    : isIntake ? "הוספת נהג שנקלט ידנית"
    : kind === "accidentsBts" ? 'הוספת תאונת בט"ש ידנית' : "הוספת תאונת גדוד ידנית";

  const save = async () => {
    setSaving(true);
    try {
      let payload: any = {};
      if (isReleased) {
        const finalReason = reasonValue === "regular" ? "שחרור רגיל" : (reasonValue === "אחר" ? (customReason || "אחר") : reasonValue);
        payload = {
          full_name: fullName || "ללא שם",
          personal_number: personalNumber,
          outpost,
          release_reason: finalReason,
          release_date: date,
        };
      } else if (isIntake) {
        payload = {
          full_name: fullName || "ללא שם",
          personal_number: personalNumber,
          outpost,
          created_at: date,
        };
      } else {
        payload = {
          title: title || "תאונה",
          driver_name: driverName,
          driver_type: kind === "accidentsBts" ? "security" : "combat",
          event_date: date,
          severity,
          outpost,
          vehicle_number: vehicleNumber,
          description,
        };
      }
      const { error } = await supabase.from("yearly_summary_overrides" as any).insert({
        year, kind, action: "manual", payload, brigade,
      });
      if (error) throw error;
      toast.success("נוסף בהצלחה");
      onSaved();
    } catch (e: any) {
      toast.error(`שגיאה בהוספה: ${e?.message || e}`);
    } finally { setSaving(false); }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent dir="rtl" className="bg-white max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="text-slate-800 font-black">{titleHeader}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {(isReleased || isIntake) && (
            <>
              <div><Label className="text-slate-800 font-bold">שם מלא</Label><Input value={fullName} onChange={(e) => setFullName(e.target.value)} /></div>
              <div><Label className="text-slate-800 font-bold">מספר אישי</Label><Input value={personalNumber} onChange={(e) => setPersonalNumber(e.target.value)} /></div>
              <div><Label className="text-slate-800 font-bold">מוצב</Label><Input value={outpost} onChange={(e) => setOutpost(e.target.value)} /></div>
              <div><Label className="text-slate-800 font-bold">{isReleased ? "תאריך שחרור" : "תאריך קליטה"}</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
              {isReleased && (
                <>
                  <div>
                    <Label className="text-slate-800 font-bold">סיבת שחרור</Label>
                    <Select value={reasonValue} onValueChange={setReasonValue}>
                      <SelectTrigger className="bg-white text-slate-800"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {RELEASE_REASONS.map((r) => (<SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  {reasonValue === "אחר" && (
                    <div><Label className="text-slate-800 font-bold">פירוט סיבה</Label><Input value={customReason} onChange={(e) => setCustomReason(e.target.value)} /></div>
                  )}
                </>
              )}
            </>
          )}
          {isAccident && (
            <>
              <div><Label className="text-slate-800 font-bold">כותרת</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
              <div><Label className="text-slate-800 font-bold">תאריך</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
              <div><Label className="text-slate-800 font-bold">שם נהג</Label><Input value={driverName} onChange={(e) => setDriverName(e.target.value)} /></div>
              <div><Label className="text-slate-800 font-bold">מיקום / מוצב</Label><Input value={outpost} onChange={(e) => setOutpost(e.target.value)} /></div>
              <div><Label className="text-slate-800 font-bold">מספר רכב</Label><Input value={vehicleNumber} onChange={(e) => setVehicleNumber(e.target.value)} /></div>
              <div>
                <Label className="text-slate-800 font-bold">חומרה</Label>
                <Select value={severity} onValueChange={setSeverity}>
                  <SelectTrigger className="bg-white text-slate-800"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minor">קלה</SelectItem>
                    <SelectItem value="moderate">בינונית</SelectItem>
                    <SelectItem value="severe">חמורה</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label className="text-slate-800 font-bold">תיאור</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} /></div>
            </>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>ביטול</Button>
          <Button onClick={save} disabled={saving}>{saving ? "שומר..." : "שמור"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}