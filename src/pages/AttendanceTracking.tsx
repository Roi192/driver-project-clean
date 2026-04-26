import { useState, useEffect, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { format, parseISO, getYear, getMonth } from "date-fns";
import {
  Users, Loader2, FileSpreadsheet, Search, CheckCircle, XCircle,
  User, ChevronDown, ChevronUp, Home, Filter, Edit, AlertTriangle,
  Eye, Calendar, List, Layers
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import * as XLSX from "xlsx";
import unitLogo from "@/assets/unit-logo.png";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

type AttendanceStatus = "attended" | "absent" | "not_in_rotation" | "not_updated" | "not_qualified";
type AbsenceReason = "קורס" | "גימלים" | "גימלים ממושכים" | "נעדר" | "נפקד" | "כלא";

const NON_COUNTABLE_ABSENCE_REASONS: AbsenceReason[] = ["קורס", "גימלים ממושכים", "נפקד", "כלא"];

const absenceReasonOptions: { value: AbsenceReason; label: string }[] = [
  { value: "קורס", label: "קורס" },
  { value: "גימלים", label: "גימלים" },
  { value: "גימלים ממושכים", label: "גימלים ממושכים" },
  { value: "נעדר", label: "נעדר (ללא סיבה מוצדקת)" },
  { value: "נפקד", label: "נפקד" },
  { value: "כלא", label: "כלא" },
];

const attendanceStatusLabels: Record<AttendanceStatus, string> = {
  attended: "נכח",
  absent: "נעדר",
  not_in_rotation: "לא בסבב",
  not_updated: "לא עודכן",
  not_qualified: "לא מוכשר",
};

const hebrewMonths = [
  "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
  "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"
];

interface Soldier {
  id: string;
  full_name: string;
  personal_number: string;
  created_at: string;
  qualified_date: string | null;
  rotation_group: string | null;
  release_date: string | null;
  is_active: boolean;
}

interface WorkPlanEvent {
  id: string;
  title: string;
  event_date: string;
  status: string;
  category: string | null;
  expected_soldiers: string[] | null;
  content_cycle: string | null;
}

interface EventAttendance {
  id: string;
  event_id: string;
  soldier_id: string;
  attended: boolean;
  absence_reason: string | null;
  status: string;
  completed: boolean;
  created_at: string;
}

interface ContentCycleOverride {
  id: string;
  soldier_id: string;
  content_cycle: string;
  override_type: string;
  completion_date: string | null;
  absence_reason: string | null;
}

interface SoldierCourse {
  id: string;
  soldier_id: string;
  start_date: string;
  end_date: string;
  status: string;
  courses?: { name: string };
}

export default function AttendanceTracking() {
  const { isAdmin, isPlatoonCommander, canAccessAttendance, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const hasAccess = canAccessAttendance;
  const [soldiers, setSoldiers] = useState<Soldier[]>([]);
  const [events, setEvents] = useState<WorkPlanEvent[]>([]);
  const [attendance, setAttendance] = useState<EventAttendance[]>([]);
  const [overrides, setOverrides] = useState<ContentCycleOverride[]>([]);
  const [soldierCourses, setSoldierCourses] = useState<SoldierCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSoldier, setSelectedSoldier] = useState<Soldier | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  const [yearFilter, setYearFilter] = useState<string>(new Date().getFullYear().toString());
  const [monthFilter, setMonthFilter] = useState<string>("all");

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<{ soldier: Soldier; event: WorkPlanEvent; status: AttendanceStatus; reason: string | null; completed: boolean } | null>(null);
  const [editStatus, setEditStatus] = useState<AttendanceStatus>("attended");
  const [editReason, setEditReason] = useState<AbsenceReason | "">("");
  const [editCompleted, setEditCompleted] = useState(false);

  const [commanderMode, setCommanderMode] = useState(false);
  const [viewMode, setViewMode] = useState<"soldiers" | "months">("soldiers");

  // Months view state
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);
  const [expandedCycle, setExpandedCycle] = useState<string | null>(null);
  const [expandedCycleEvent, setExpandedCycleEvent] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !hasAccess) navigate("/");
  }, [hasAccess, authLoading, navigate]);

  useEffect(() => { fetchData(); }, []);

  const fetchAllAttendance = async () => {
    const allRows: EventAttendance[] = [];
    let offset = 0;
    const batchSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from("event_attendance")
        .select("*")
        .range(offset, offset + batchSize - 1);

      if (error) {
        console.error("Failed to fetch attendance batch:", error);
        return allRows;
      }

      const batch = (data || []) as EventAttendance[];
      allRows.push(...batch);
      hasMore = batch.length === batchSize;
      offset += batchSize;
    }

    return allRows;
  };

  const fetchData = async () => {
    setLoading(true);
    const [soldiersRes, eventsRes, attendanceRows, overridesRes, coursesRes] = await Promise.all([
      // Fetch ALL soldiers (including released/inactive) so we can preserve historical
      // attendance records for soldiers who have since been removed from active service.
      supabase.from("soldiers").select("*").order("full_name"),
      supabase.from("work_plan_events").select("*").neq("category", "holiday").order("event_date", { ascending: false }),
      fetchAllAttendance(),
      supabase.from("content_cycle_overrides").select("*"),
      supabase.from("soldier_courses").select("id, soldier_id, start_date, end_date, status, courses(name)").eq("status", "in_progress"),
    ]);

    if (!soldiersRes.error) setSoldiers(soldiersRes.data || []);
    if (!eventsRes.error) setEvents((eventsRes.data || []) as WorkPlanEvent[]);
    setAttendance(attendanceRows || []);
    if (!overridesRes.error) setOverrides((overridesRes.data || []) as ContentCycleOverride[]);
    if (!coursesRes.error) setSoldierCourses((coursesRes.data || []) as SoldierCourse[]);
    setLoading(false);
  };

  const isSoldierInCourse = (soldierId: string, eventDate: string) => {
    const eventDateParsed = parseISO(eventDate);
    const course = soldierCourses.find(sc => {
      if (sc.soldier_id !== soldierId) return false;
      return eventDateParsed >= parseISO(sc.start_date) && eventDateParsed <= parseISO(sc.end_date);
    });
    return { inCourse: !!course, courseName: course?.courses?.name || null };
  };

  const wasSoldierQualifiedAtDate = (soldier: Soldier, eventDate: string): boolean => {
    const qualifiedDate = soldier.qualified_date ? parseISO(soldier.qualified_date) : parseISO(soldier.created_at);
    return qualifiedDate <= parseISO(eventDate);
  };

  // Returns true if the soldier was released BEFORE the event date — meaning they
  // could not have attended. Released soldiers should be excluded from event rosters
  // unless they have an explicit historical attendance record.
  const wasSoldierReleasedBeforeDate = (soldier: Soldier, eventDate: string): boolean => {
    if (!soldier.release_date) return false;
    return parseISO(soldier.release_date) < parseISO(eventDate);
  };

  // True if soldier should be considered relevant for an event:
  // - has an actual attendance record (preserve history), OR
  // - was qualified before the event AND not released before the event.
  const isSoldierRelevantForEvent = (soldier: Soldier, event: WorkPlanEvent): boolean => {
    if (getAttendanceRecord(event.id, soldier.id)) return true;
    if (!wasSoldierQualifiedAtDate(soldier, event.event_date)) return false;
    if (wasSoldierReleasedBeforeDate(soldier, event.event_date)) return false;
    return true;
  };

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    events.forEach(e => years.add(getYear(parseISO(e.event_date))));
    return Array.from(years).sort((a, b) => b - a);
  }, [events]);

  const attendanceLookup = useMemo(() => {
    const map = new Map<string, EventAttendance>();
    attendance.forEach((record) => {
      map.set(`${record.event_id}:${record.soldier_id}`, record);
    });
    return map;
  }, [attendance]);

  const attendanceByEvent = useMemo(() => {
    const map = new Map<string, EventAttendance[]>();
    attendance.forEach((record) => {
      const existing = map.get(record.event_id);
      if (existing) {
        existing.push(record);
        return;
      }
      map.set(record.event_id, [record]);
    });
    return map;
  }, [attendance]);

  const getAttendanceRecord = (eventId: string, soldierId: string) => {
    return attendanceLookup.get(`${eventId}:${soldierId}`);
  };

  const getRelevantSoldierIdsForEvent = (event: WorkPlanEvent) => {
    const directAttendance = attendanceByEvent.get(event.id) || [];
    const ids = new Set<string>();

    // Always include soldiers with a real attendance record — keeps history intact
    // even after a soldier is released or removed from the active roster.
    directAttendance.forEach((record) => ids.add(record.soldier_id));

    // Include expected soldiers only if they were relevant on the event date
    // (qualified before, not released before).
    (event.expected_soldiers || []).forEach((soldierId) => {
      const soldier = soldiers.find((s) => s.id === soldierId);
      if (!soldier) return;
      if (wasSoldierReleasedBeforeDate(soldier, event.event_date)) return;
      if (!wasSoldierQualifiedAtDate(soldier, event.event_date)) return;
      ids.add(soldierId);
    });

    return ids;
  };

  // Get soldier status for a specific event - checks attendance DB + overrides + courses
  const getSoldierEventStatus = (soldier: Soldier, event: WorkPlanEvent): { status: AttendanceStatus; reason: string | null; completed: boolean } => {
    const att = getAttendanceRecord(event.id, soldier.id);
    if (att) {
      return { status: att.status as AttendanceStatus, reason: att.absence_reason, completed: att.completed };
    }

    if (!wasSoldierQualifiedAtDate(soldier, event.event_date)) {
      return { status: "not_qualified", reason: null, completed: false };
    }

    const { inCourse } = isSoldierInCourse(soldier.id, event.event_date);
    if (inCourse) return { status: "absent", reason: "קורס", completed: false };

    const cycleName = event.content_cycle || event.title;
    const override = overrides.find(o => o.soldier_id === soldier.id && o.content_cycle === cycleName);
    if (override?.override_type === "completed") {
      return { status: "attended", reason: null, completed: true };
    }
    if (override?.override_type === "absent") {
      return { status: "absent", reason: override.absence_reason, completed: false };
    }

    const isExpected = (event.expected_soldiers || []).includes(soldier.id);
    return { status: isExpected ? "not_updated" : "not_in_rotation", reason: null, completed: false };
  };

  // Filtered events based on year/month
  const filteredEvents = useMemo(() => {
    let filtered = events.filter(e => {
      const y = getYear(parseISO(e.event_date));
      return y.toString() === yearFilter && e.status === "completed";
    });
    if (monthFilter !== "all") {
      filtered = filtered.filter(e => getMonth(parseISO(e.event_date)) === parseInt(monthFilter));
    }
    return filtered;
  }, [events, yearFilter, monthFilter]);

  // === SOLDIERS TAB ===
  const getSoldierStats = (soldierId: string) => {
    const soldier = soldiers.find(s => s.id === soldierId);
    if (!soldier) return { attended: 0, absent: 0, notInRotation: 0, total: 0, percentage: 100, hasData: false };

    let attended = 0, absent = 0, notInRotation = 0;

    filteredEvents.forEach(event => {
      // Skip events that occurred AFTER the soldier was released — they couldn't
      // have attended. We still keep events where there's an explicit attendance
      // record (handled below by the attRecord branch).
      const attRecord = getAttendanceRecord(event.id, soldierId);
      if (!attRecord && wasSoldierReleasedBeforeDate(soldier, event.event_date)) {
        return;
      }
      // Skip events BEFORE the soldier was qualified (unless explicit record exists).
      if (!attRecord && !wasSoldierQualifiedAtDate(soldier, event.event_date)) {
        return;
      }

      const { status, completed, reason } = getSoldierEventStatus(soldier, event);
      const isExpected = (event.expected_soldiers || []).includes(soldierId);

      if (isExpected || attRecord) {
        if (completed || status === "attended") attended++;
        else if (status === "absent") {
          const isNonCountable = reason && NON_COUNTABLE_ABSENCE_REASONS.includes(reason as AbsenceReason);
          if (!isNonCountable) absent++;
        } else if (status === "not_in_rotation") {
          notInRotation++;
        }
      } else if (status === "not_in_rotation") {
        notInRotation++;
      }
    });

    const relevantTotal = attended + absent;
    return {
      attended, absent, notInRotation, total: relevantTotal,
      percentage: relevantTotal > 0 ? Math.round((attended / relevantTotal) * 100) : 100,
      hasData: relevantTotal > 0,
    };
  };

  // Monthly breakdown for a soldier
  const getSoldierMonthlyRecords = (soldierId: string) => {
    const soldier = soldiers.find(s => s.id === soldierId);
    if (!soldier) return [];

    const monthlyMap = new Map<string, { month: number; year: number; events: { event: WorkPlanEvent; status: AttendanceStatus; reason: string | null; completed: boolean; isExpected: boolean }[]; attended: number; absent: number; notInRotation: number }>();

    filteredEvents.forEach(event => {
      const hasDirectAttendanceEarly = !!getAttendanceRecord(event.id, soldierId);
      // Hide events after release / before qualification, unless an explicit record exists.
      if (!hasDirectAttendanceEarly && wasSoldierReleasedBeforeDate(soldier, event.event_date)) return;
      if (!hasDirectAttendanceEarly && !wasSoldierQualifiedAtDate(soldier, event.event_date)) return;

      const date = parseISO(event.event_date);
      const month = getMonth(date);
      const year = getYear(date);
      const key = `${year}-${month}`;

      const { status, reason, completed } = getSoldierEventStatus(soldier, event);
      const hasDirectAttendance = !!getAttendanceRecord(event.id, soldierId);
      if (status === "not_in_rotation" && !hasDirectAttendance) return;

      if (!monthlyMap.has(key)) monthlyMap.set(key, { month, year, events: [], attended: 0, absent: 0, notInRotation: 0 });
      const record = monthlyMap.get(key)!;
      const isExpected = (event.expected_soldiers || []).includes(soldierId);
      record.events.push({ event, status: completed ? "attended" : status, reason, completed, isExpected });
      if (completed || status === "attended") record.attended++;
      else if (status === "absent") record.absent++;
      else if (status === "not_in_rotation") record.notInRotation++;
    });

    return Array.from(monthlyMap.values()).sort((a, b) => a.year !== b.year ? b.year - a.year : b.month - a.month);
  };

  // === MONTHS TAB - grouped by content cycle ===
  const monthsCycleData = useMemo(() => {
    // Group events by month, then within each month by content_cycle (or title)
    const monthMap = new Map<string, {
      month: number;
      year: number;
      cycles: Map<string, {
        cycleName: string;
        events: WorkPlanEvent[];
        soldierStatuses: Map<string, { status: AttendanceStatus; reason: string | null; completed: boolean }>;
      }>;
    }>();

    filteredEvents.forEach(event => {
      const date = parseISO(event.event_date);
      const month = getMonth(date);
      const year = getYear(date);
      const monthKey = `${year}-${month}`;
      const cycleName = event.content_cycle || event.title;

      if (!monthMap.has(monthKey)) monthMap.set(monthKey, { month, year, cycles: new Map() });
      const monthData = monthMap.get(monthKey)!;

      if (!monthData.cycles.has(cycleName)) {
        monthData.cycles.set(cycleName, { cycleName, events: [], soldierStatuses: new Map() });
      }
      const cycle = monthData.cycles.get(cycleName)!;
      cycle.events.push(event);

      const relevantSoldierIds = getRelevantSoldierIdsForEvent(event);

      relevantSoldierIds.forEach(soldierId => {
        const soldier = soldiers.find(s => s.id === soldierId);
        if (!soldier) return;
        const { status, reason, completed } = getSoldierEventStatus(soldier, event);
        if (status === "not_in_rotation" || status === "not_qualified") return;

        const existing = cycle.soldierStatuses.get(soldierId);
        if (!existing) {
          cycle.soldierStatuses.set(soldierId, { status, reason, completed });
          return;
        }

        if (completed || status === "attended") {
          cycle.soldierStatuses.set(soldierId, { status: completed ? "attended" : status, reason, completed });
        }
      });
    });

    return Array.from(monthMap.values())
      .sort((a, b) => a.year !== b.year ? b.year - a.year : b.month - a.month)
      .map(m => ({
        ...m,
        cycles: Array.from(m.cycles.values()).map((cycle) => ({
          ...cycle,
          events: [...cycle.events].sort((a, b) => a.event_date.localeCompare(b.event_date)),
        })),
      }));
  }, [filteredEvents, soldiers, attendance, overrides, soldierCourses]);

  // === OVERALL STATS ===
  const overallStats = useMemo(() => {
    let totalAttended = 0, totalAbsent = 0, issues = 0;
    soldiers.forEach(soldier => {
      const stats = getSoldierStats(soldier.id);
      totalAttended += stats.attended;
      totalAbsent += stats.absent;
      if (stats.percentage < 80 && stats.total > 0) issues++;
    });
    const total = totalAttended + totalAbsent;
    const percentage = total > 0 ? Math.round((totalAttended / total) * 100) : 100;
    const status = percentage >= 80 ? "ok" : percentage >= 60 ? "warning" : "critical";
    return { totalAttended, totalAbsent, issues, percentage, status };
  }, [soldiers, filteredEvents, attendance, overrides]);

  // Show active soldiers + released soldiers who still have at least one
  // historical attendance record (so commanders can audit past months).
  const soldierIdsWithHistory = useMemo(() => {
    const ids = new Set<string>();
    attendance.forEach((record) => ids.add(record.soldier_id));
    return ids;
  }, [attendance]);

  const filteredSoldiers = soldiers.filter((s) => {
    const matchesSearch = s.full_name.includes(searchTerm) || s.personal_number.includes(searchTerm);
    if (!matchesSearch) return false;
    if (s.is_active) return true;
    return soldierIdsWithHistory.has(s.id);
  });

  // Edit attendance
  const openEditDialog = (soldier: Soldier, event: WorkPlanEvent, status: AttendanceStatus, reason: string | null, completed: boolean) => {
    setEditingEvent({ soldier, event, status, reason, completed });
    setEditStatus(completed ? "absent" : status);
    setEditReason((reason as AbsenceReason) || "");
    setEditCompleted(completed);
    setEditDialogOpen(true);
  };

  const saveEditedAttendance = async () => {
    if (!editingEvent) return;
    await supabase.from("event_attendance").delete()
      .eq("event_id", editingEvent.event.id)
      .eq("soldier_id", editingEvent.soldier.id);

    if (editStatus !== "not_updated" && editStatus !== "not_qualified") {
      const isAbsent = editStatus === "absent";
      const { error } = await supabase.from("event_attendance").insert({
        event_id: editingEvent.event.id,
        soldier_id: editingEvent.soldier.id,
        attended: editStatus === "attended" || (isAbsent && editCompleted),
        absence_reason: isAbsent ? editReason : null,
        status: editStatus,
        completed: isAbsent && editCompleted,
      });
      if (error) { toast.error("שגיאה בעדכון"); return; }
    }
    toast.success("הנוכחות עודכנה");
    fetchData();
    setEditDialogOpen(false);
  };

  const exportToExcel = () => {
    const data: any[] = [];
    soldiers.forEach(soldier => {
      const records = getSoldierMonthlyRecords(soldier.id);
      records.forEach(record => {
        record.events.forEach(er => {
          data.push({
            "מספר אישי": soldier.personal_number,
            "שם מלא": soldier.full_name,
            "חודש": `${hebrewMonths[record.month]} ${record.year}`,
            "מופע": er.event.title,
            "תאריך": format(parseISO(er.event.event_date), "dd/MM/yyyy"),
            "סטטוס": er.completed ? "נכח בהשלמה" : attendanceStatusLabels[er.status],
            "סיבת היעדרות": er.reason || "-",
          });
        });
      });
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "מעקב נוכחות");
    XLSX.writeFile(wb, `מעקב_נוכחות_${format(new Date(), "dd-MM-yyyy")}.xlsx`);
    toast.success("הקובץ יוצא בהצלחה");
  };

  if (authLoading || loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white pb-24" dir="rtl">
        {/* Header */}
        <div className="relative overflow-hidden bg-gradient-to-l from-slate-900 via-slate-800 to-slate-900 px-4 py-6">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--gold)/0.15),transparent_50%)]" />
          <div className="absolute top-3 left-3 opacity-15">
            <img src={unitLogo} alt="" className="w-16 h-16" />
          </div>
          <div className="relative z-10 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/30 mb-3">
              <Users className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-xs font-bold text-purple-400">מעקב נוכחות</span>
            </div>
            <h1 className="text-xl font-black text-white mb-1">שליטה ובקרה - נוכחות</h1>
            <p className="text-slate-400 text-xs">{filteredEvents.length} מופעים | {soldiers.length} חיילים</p>
          </div>
        </div>

        <div className="px-4 py-4 space-y-4">
          {/* Overview Card */}
          <Card className="border-0 shadow-lg bg-white overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-800 text-sm">סקירה כללית</h3>
                <Badge className={`text-xs ${
                  overallStats.status === "ok" ? "bg-emerald-100 text-emerald-700" :
                  overallStats.status === "warning" ? "bg-amber-100 text-amber-700" :
                  "bg-red-100 text-red-700"
                }`}>
                  {overallStats.status === "ok" ? "תקין" : overallStats.status === "warning" ? "דורש תשומת לב" : "דורש טיפול"}
                </Badge>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 rounded-xl bg-slate-50">
                  <p className="text-2xl font-black text-slate-800">{overallStats.percentage}%</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">נוכחות</p>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50">
                  <p className="text-2xl font-black text-emerald-600">{overallStats.totalAttended}</p>
                  <p className="text-[10px] text-emerald-700 mt-0.5">נכחו</p>
                </div>
                <div className="p-3 rounded-xl bg-red-50">
                  <p className="text-2xl font-black text-red-600">{overallStats.totalAbsent}</p>
                  <p className="text-[10px] text-red-700 mt-0.5">נעדרו</p>
                </div>
              </div>
              {overallStats.issues > 0 && (
                <div className="mt-3 p-2 rounded-lg bg-amber-50 border border-amber-200 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span className="text-xs text-amber-700">{overallStats.issues} חיילים מתחת ל-80%</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Commander Mode */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-100 border border-slate-200">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-slate-600" />
              <span className="text-sm font-medium text-slate-700">{commanderMode ? "מצב חריגים" : "מצב סקירה"}</span>
            </div>
            <Switch checked={commanderMode} onCheckedChange={setCommanderMode} className="data-[state=checked]:bg-red-500" />
          </div>

          {/* Filters */}
          <Card className="border-0 shadow-md bg-white rounded-xl">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <Filter className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-xs font-medium text-slate-600">סינון</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Select value={yearFilter} onValueChange={setYearFilter}>
                  <SelectTrigger className="h-9 rounded-lg text-xs bg-white border-slate-200 text-slate-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-slate-200 shadow-lg z-50">
                    {availableYears.map(year => (
                      <SelectItem key={year} value={year.toString()} className="text-slate-700">{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={monthFilter} onValueChange={setMonthFilter}>
                  <SelectTrigger className="h-9 rounded-lg text-xs bg-white border-slate-200 text-slate-700">
                    <SelectValue placeholder="חודש" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-slate-200 shadow-lg z-50">
                    <SelectItem value="all" className="text-slate-700">כל החודשים</SelectItem>
                    {hebrewMonths.map((month, idx) => (
                      <SelectItem key={idx} value={idx.toString()} className="text-slate-700">{month}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Tabs */}
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "soldiers" | "months")} className="w-full">
            <TabsList className="grid w-full grid-cols-2 h-10 bg-slate-200 rounded-xl">
              <TabsTrigger value="soldiers" className="flex items-center gap-2 text-sm text-slate-700 data-[state=active]:bg-white data-[state=active]:text-slate-900 rounded-lg">
                <List className="w-4 h-4" />
                חיילים
              </TabsTrigger>
              <TabsTrigger value="months" className="flex items-center gap-2 text-sm text-slate-700 data-[state=active]:bg-white data-[state=active]:text-slate-900 rounded-lg">
                <Calendar className="w-4 h-4" />
                חודשים
              </TabsTrigger>
            </TabsList>

            {/* === SOLDIERS VIEW === */}
            <TabsContent value="soldiers" className="mt-4 space-y-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input placeholder="חיפוש חייל..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pr-9 h-10 rounded-xl border text-sm" />
                </div>
                <Button onClick={exportToExcel} variant="outline" size="icon" className="h-10 w-10 rounded-xl">
                  <FileSpreadsheet className="w-4 h-4" />
                </Button>
              </div>

              <Card className="border-0 shadow-lg bg-white rounded-xl overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 hover:bg-slate-50">
                      <TableHead className="text-right font-bold text-slate-700 text-xs">שם מלא</TableHead>
                      <TableHead className="text-right font-bold text-slate-700 text-xs">נוכחות</TableHead>
                      <TableHead className="text-right font-bold text-slate-700 text-xs">סטטוס</TableHead>
                      <TableHead className="text-right font-bold text-slate-700 text-xs w-8"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSoldiers.map(soldier => {
                      const stats = getSoldierStats(soldier.id);
                      if (commanderMode && stats.percentage >= 80) return null;
                      return (
                        <TableRow key={soldier.id} className="cursor-pointer hover:bg-slate-50" onClick={() => { setSelectedSoldier(soldier); setDetailDialogOpen(true); }}>
                          <TableCell className="font-medium text-slate-800 text-sm">{soldier.full_name}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress value={stats.percentage} className={`w-14 h-2 ${stats.percentage >= 80 ? '[&>div]:bg-emerald-500' : stats.percentage >= 50 ? '[&>div]:bg-amber-500' : '[&>div]:bg-red-500'}`} />
                              <span className="text-xs text-slate-600">{stats.percentage}%</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5 text-xs">
                              <span className="text-emerald-600">{stats.attended}</span>
                              <span className="text-slate-300">/</span>
                              <span className="text-red-500">{stats.absent}</span>
                            </div>
                          </TableCell>
                          <TableCell><ChevronDown className="w-4 h-4 text-slate-400" /></TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Card>
            </TabsContent>

            {/* === MONTHS / CONTENT CYCLES VIEW === */}
            <TabsContent value="months" className="mt-4 space-y-4">
              {monthsCycleData.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                  <p className="text-slate-500 text-sm">אין מופעים בסינון שנבחר</p>
                </div>
              ) : (
                monthsCycleData.map(monthData => (
                  <Card key={`${monthData.year}-${monthData.month}`} className="border-0 shadow-lg bg-white rounded-xl overflow-hidden">
                    {(() => {
                      const monthKey = `${monthData.year}-${monthData.month}`;
                      const isMonthExpanded = expandedMonth === monthKey;
                      const monthEventSummaries = monthData.cycles.flatMap((cycle) =>
                        cycle.events.map((event) => getEventSummaryForMonthView(getEventAttendanceForMonthView(event))),
                      );
                      const monthAttended = monthEventSummaries.reduce((sum, item) => sum + item.attended, 0);
                      const monthTotal = monthEventSummaries.reduce((sum, item) => sum + item.total, 0);
                      const monthPercent = monthTotal > 0 ? Math.round((monthAttended / monthTotal) * 100) : 100;

                      return (
                        <>
                          <CardHeader
                            className="pb-3 bg-gradient-to-l from-slate-100 to-slate-50 cursor-pointer"
                            onClick={() => {
                              setExpandedMonth(isMonthExpanded ? null : monthKey);
                              if (isMonthExpanded) {
                                setExpandedCycle(null);
                                setExpandedCycleEvent(null);
                              }
                            }}
                          >
                            <CardTitle className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-slate-600" />
                                <div>
                                  <span className="block text-sm font-bold text-slate-800">{hebrewMonths[monthData.month]} {monthData.year}</span>
                                  <span className="text-[11px] font-medium text-slate-500">{monthData.cycles.length} מחזורים</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge className={`text-xs ${
                                  monthPercent >= 80 ? "bg-emerald-100 text-emerald-700" :
                                  monthPercent >= 50 ? "bg-amber-100 text-amber-700" :
                                  "bg-red-100 text-red-700"
                                }`}>
                                  {monthPercent}%
                                </Badge>
                                <span className="text-xs text-slate-500">{monthAttended}/{monthTotal}</span>
                                {isMonthExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                              </div>
                            </CardTitle>
                          </CardHeader>

                          {isMonthExpanded && (
                            <CardContent className="p-3 space-y-2">
                              {monthData.cycles.map(cycle => {
                        const statusEntries = Array.from(cycle.soldierStatuses.entries());
                        const attendedCount = statusEntries.filter(([, s]) => s.completed || s.status === "attended").length;
                        const absentEntries = statusEntries.filter(([, s]) => s.status === "absent" && !s.completed);
                        const total = statusEntries.length;
                        const percentage = total > 0 ? Math.round((attendedCount / total) * 100) : 100;
                        const isExpanded = expandedCycle === `${monthData.year}-${monthData.month}-${cycle.cycleName}`;
                        const cycleKey = `${monthData.year}-${monthData.month}-${cycle.cycleName}`;

                        if (commanderMode && absentEntries.length === 0) return null;

                        return (
                          <div key={cycleKey} className="border border-slate-200 rounded-lg overflow-hidden">
                            <div
                              className="flex items-center justify-between p-3 cursor-pointer hover:bg-slate-50 transition-colors"
                              onClick={() => {
                                setExpandedCycle(isExpanded ? null : cycleKey);
                                if (isExpanded) setExpandedCycleEvent(null);
                              }}
                            >
                              <div className="flex items-center gap-2">
                                <Layers className="w-4 h-4 text-slate-500" />
                                <span className="font-medium text-sm text-slate-800">{cycle.cycleName}</span>
                                <Badge variant="outline" className="text-[10px] text-slate-500">{cycle.events.length} מופעים</Badge>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge className={`text-xs ${
                                  percentage >= 80 ? "bg-emerald-100 text-emerald-700" :
                                  percentage >= 50 ? "bg-amber-100 text-amber-700" :
                                  "bg-red-100 text-red-700"
                                }`}>
                                  {attendedCount}/{total}
                                </Badge>
                                <Progress value={percentage} className={`w-14 h-2 ${percentage >= 80 ? '[&>div]:bg-emerald-500' : percentage >= 50 ? '[&>div]:bg-amber-500' : '[&>div]:bg-red-500'}`} />
                                {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                              </div>
                            </div>

                            {isExpanded && (
                              <div className="border-t border-slate-200 p-3 bg-slate-50/50 space-y-3">
                                <div>
                                  <p className="text-xs font-bold text-slate-600 mb-2">מופעים בפירוט</p>
                                  <div className="space-y-1">
                                     {cycle.events.map(event => {
                                      const isEventExpanded = expandedCycleEvent === event.id;
                                       const eventAttList = getEventAttendanceForMonthView(event);
                                       const { attended: evAttended, total: eventTotal } = getEventSummaryForMonthView(eventAttList);

                                      return (
                                        <div key={event.id} className="border border-slate-200 rounded-lg bg-white overflow-hidden">
                                          <div
                                            className="flex items-center justify-between p-2 cursor-pointer hover:bg-slate-50"
                                            onClick={() => setExpandedCycleEvent(isEventExpanded ? null : event.id)}
                                          >
                                            <div className="flex items-center gap-2">
                                              <span className="text-xs text-slate-700">{event.title}</span>
                                              <span className="text-[10px] text-slate-400">{format(parseISO(event.event_date), "dd/MM")}</span>
                                              <Badge variant="outline" className="text-[10px] text-slate-500 border-slate-200">
                                                {cycle.cycleName}
                                              </Badge>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                               <span className="text-xs text-slate-500">{evAttended}/{eventTotal}</span>
                                              {isEventExpanded ? <ChevronUp className="w-3 h-3 text-slate-400" /> : <ChevronDown className="w-3 h-3 text-slate-400" />}
                                            </div>
                                          </div>
                                          {isEventExpanded && (
                                            <div className="border-t border-slate-100 p-2 space-y-0.5">
                                              {eventAttList.map(item => (
                                                <div key={item.soldierId} className="flex items-center justify-between py-1 px-2 text-xs">
                                                  <span className="text-slate-700">{item.soldierName}</span>
                                                  <div className="flex items-center gap-1">
                                                    {item.completed || item.status === "attended" ? (
                                                      <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">נכח</Badge>
                                                    ) : item.status === "absent" ? (
                                                      <Badge className="bg-red-100 text-red-700 text-[10px]">נעדר{item.reason ? ` - ${item.reason}` : ""}</Badge>
                                                    ) : (
                                                      <Badge className="bg-slate-100 text-slate-600 text-[10px]">{attendanceStatusLabels[item.status]}</Badge>
                                                    )}
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                            </CardContent>
                          )}
                        </>
                      );
                    })()}
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Soldier Detail Dialog */}
        <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] flex flex-col" dir="rtl">
            {selectedSoldier && (() => {
              const stats = getSoldierStats(selectedSoldier.id);
              const monthlyRecords = getSoldierMonthlyRecords(selectedSoldier.id);
              return (
                <>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-base">{selectedSoldier.full_name}</p>
                        <p className="text-xs font-normal text-slate-500">{selectedSoldier.personal_number}</p>
                      </div>
                    </DialogTitle>
                  </DialogHeader>

                  <div className="grid grid-cols-4 gap-2 my-4">
                    <div className="text-center p-2 rounded-lg bg-emerald-50">
                      <p className="text-lg font-bold text-emerald-600">{stats.attended}</p>
                      <p className="text-[10px] text-emerald-700">נכח</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-red-50">
                      <p className="text-lg font-bold text-red-600">{stats.absent}</p>
                      <p className="text-[10px] text-red-700">נעדר</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-blue-50">
                      <p className="text-lg font-bold text-blue-600">{stats.notInRotation}</p>
                      <p className="text-[10px] text-blue-700">סבב בית</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-slate-100">
                      <p className="text-lg font-bold text-slate-700">{stats.percentage}%</p>
                      <p className="text-[10px] text-slate-600">נוכחות</p>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
                      {monthlyRecords.map(record => {
                      const monthPct = record.attended + record.absent > 0
                        ? Math.round((record.attended / (record.attended + record.absent)) * 100) : 100;
                      return (
                        <div key={`${record.year}-${record.month}`} className="border border-slate-200 rounded-lg overflow-hidden">
                          <div className="flex items-center justify-between p-3 bg-slate-100">
                            <span className="font-medium text-sm text-slate-800">{hebrewMonths[record.month]} {record.year}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-emerald-600">{record.attended} נכח</span>
                              {record.absent > 0 && <span className="text-xs text-red-500">{record.absent} נעדר</span>}
                              {record.notInRotation > 0 && <span className="text-xs text-blue-600">{record.notInRotation} לא בסבב</span>}
                              <Progress value={monthPct} className={`w-12 h-1.5 ${monthPct >= 80 ? '[&>div]:bg-emerald-500' : '[&>div]:bg-red-500'}`} />
                            </div>
                          </div>
                          <div className="p-2 space-y-1">
                            {record.events.map(er => (
                              <div key={er.event.id} className={`flex items-center justify-between py-1.5 px-2 rounded text-sm ${
                                er.status === "absent" && !er.completed ? 'bg-red-50' : er.status === "not_in_rotation" ? 'bg-blue-50' : ''
                              }`}>
                                <div className="flex items-center gap-2">
                                  <div className={`w-1.5 h-1.5 rounded-full ${
                                    er.completed || er.status === "attended" ? 'bg-emerald-500' :
                                    er.status === "absent" ? 'bg-red-500' : er.status === "not_in_rotation" ? 'bg-blue-500' : 'bg-slate-300'
                                  }`} />
                                  <span className="text-slate-700">{er.event.title}</span>
                                  {er.reason && <span className="text-[10px] text-amber-600">({er.reason})</span>}
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-slate-400">{format(parseISO(er.event.event_date), "dd/MM")}</span>
                                  {er.completed && <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">הושלם</Badge>}
                                  {!er.completed && er.status === "not_in_rotation" && (
                                    <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">לא בסבב</Badge>
                                  )}
                                  <button
                                    onClick={(e) => { e.stopPropagation(); openEditDialog(selectedSoldier, er.event, er.status, er.reason, er.completed); }}
                                    className="p-1 hover:bg-slate-200 rounded"
                                  >
                                    <Edit className="w-3 h-3 text-slate-400" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                    {monthlyRecords.length === 0 && (
                      <div className="text-center py-6">
                        <p className="text-slate-500 text-sm">אין נתוני נוכחות בתקופה שנבחרה</p>
                      </div>
                    )}
                  </div>
                </>
              );
            })()}
          </DialogContent>
        </Dialog>

        {/* Edit Attendance Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-sm" dir="rtl">
            <DialogHeader><DialogTitle>עריכת נוכחות</DialogTitle></DialogHeader>
            {editingEvent && (
              <div className="space-y-4">
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="font-bold text-slate-800 text-sm">{editingEvent.soldier.full_name}</p>
                  <p className="text-xs text-slate-500">{editingEvent.event.title}</p>
                  <p className="text-xs text-slate-400">{format(parseISO(editingEvent.event.event_date), "dd/MM/yyyy")}</p>
                </div>
                <div>
                  <Label className="text-sm">סטטוס</Label>
                  <Select value={editStatus} onValueChange={(v) => setEditStatus(v as AttendanceStatus)}>
                    <SelectTrigger className="mt-1 bg-white text-slate-800"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-white border border-slate-200 shadow-lg z-50">
                      <SelectItem value="attended" className="text-slate-700">נכח</SelectItem>
                      <SelectItem value="absent" className="text-slate-700">נעדר</SelectItem>
                      <SelectItem value="not_in_rotation" className="text-slate-700">לא בסבב</SelectItem>
                      <SelectItem value="not_updated" className="text-slate-700">לא עודכן</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {editStatus === "absent" && (
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm">סיבת היעדרות</Label>
                      <Select value={editReason} onValueChange={(v) => setEditReason(v as AbsenceReason)}>
                        <SelectTrigger className="mt-1 bg-white text-slate-800"><SelectValue placeholder="בחר סיבה..." /></SelectTrigger>
                        <SelectContent className="bg-white border border-slate-200 shadow-lg z-50">
                          {absenceReasonOptions.map(o => (
                            <SelectItem key={o.value} value={o.value} className="text-slate-700">{o.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                      <input type="checkbox" id="completed" checked={editCompleted} onChange={(e) => setEditCompleted(e.target.checked)} className="w-4 h-4 rounded border-emerald-300" />
                      <Label htmlFor="completed" className="cursor-pointer text-sm">
                        <span className="font-medium text-emerald-700">השלים את המופע</span>
                      </Label>
                    </div>
                  </div>
                )}
              </div>
            )}
            <DialogFooter className="gap-2 mt-4">
              <Button variant="outline" size="sm" onClick={() => setEditDialogOpen(false)}>ביטול</Button>
              <Button size="sm" onClick={saveEditedAttendance}>שמור</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );

  // Helper for months view event attendance
  function getEventAttendanceForMonthView(event: WorkPlanEvent) {
    const soldierIds = getRelevantSoldierIdsForEvent(event);
    const statusOrder: Record<AttendanceStatus, number> = {
      attended: 0,
      absent: 1,
      not_in_rotation: 2,
      not_updated: 3,
      not_qualified: 4,
    };

    return Array.from(soldierIds).map(soldierId => {
      const soldier = soldiers.find(s => s.id === soldierId);
      if (!soldier) return null;
      const { status, reason, completed } = getSoldierEventStatus(soldier, event);
      return { soldierId, soldierName: soldier.full_name, status, reason, completed };
    })
      .filter((item): item is { soldierId: string; soldierName: string; status: AttendanceStatus; reason: string | null; completed: boolean } => {
        return !!item && item.status !== "not_qualified";
      })
      .sort((a, b) => {
        const byStatus = statusOrder[a.status] - statusOrder[b.status];
        if (byStatus !== 0) return byStatus;
        return a.soldierName.localeCompare(b.soldierName, "he");
      });
  }

  function getEventSummaryForMonthView(eventAttList: { soldierId: string; soldierName: string; status: AttendanceStatus; reason: string | null; completed: boolean }[]) {
    const attended = eventAttList.filter(item => item.completed || item.status === "attended").length;
    const countableAbsent = eventAttList.filter(item => {
      if (item.status !== "absent" || item.completed) return false;
      return !(item.reason && NON_COUNTABLE_ABSENCE_REASONS.includes(item.reason as AbsenceReason));
    }).length;

    return {
      attended,
      total: attended + countableAbsent,
    };
  }
}