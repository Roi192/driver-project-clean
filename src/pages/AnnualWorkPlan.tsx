import { useState, useEffect, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { format, addMonths, startOfMonth, endOfMonth, eachDayOfInterval, isToday, isSameDay, differenceInDays, parseISO, startOfWeek, endOfWeek, addWeeks, addDays } from "date-fns";
import { he } from "date-fns/locale";
import { 
  Calendar as CalendarIcon, 
  Plus, 
  ChevronRight, 
  ChevronLeft, 
  Bell, 
  Users, 
  Loader2,
  List,
  CalendarDays,
  Edit,
  Trash2,
  Clock,
  Star,
  Flag,
  Building2,
  UserCheck,
  CheckCircle,
  XCircle,
  MinusCircle,
  HelpCircle
} from "lucide-react";
import unitLogo from "@/assets/unit-logo.png";
import { ContentCycleTracker } from "@/components/admin/ContentCycleTracker";

interface WorkPlanEvent {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  end_date: string | null;
  attendees: string[];
  expected_soldiers: string[];
  status: "pending" | "in_progress" | "completed";
  color: string | null;
  category: string | null;
  created_at: string;
  series_id: string | null;
  is_series: boolean;
  series_pattern: string | null;
}

interface Holiday {
  id: string;
  title: string;
  event_date: string;
  category: string;
}

interface Soldier {
  id: string;
  full_name: string;
  personal_number: string;
  rotation_group: string | null;
  qualified_date: string | null;
  release_date: string | null;
  created_at: string;
  is_active: boolean;
}

const ROTATION_GROUPS = [
  { value: "a_sunday", label: "סבב א' (ראשון)" },
  { value: "a_monday", label: "סבב א' (שני)" },
  { value: "b_sunday", label: "סבב ב' (ראשון)" },
  { value: "b_monday", label: "סבב ב' (שני)" },
];

interface EventAttendance {
  id: string;
  event_id: string;
  soldier_id: string;
  attended: boolean;
  absence_reason: string | null;
  status: string;
  completed: boolean;
}

// סיבות היעדרות
type AbsenceReason = "קורס" | "גימלים" | "גימלים ממושכים" | "נעדר" | "נפקד" | "כלא";

// סיבות שלא משפיעות על אחוז הנוכחות (החייל לא היה יכול להגיע)
const NON_COUNTABLE_ABSENCE_REASONS: AbsenceReason[] = ["קורס", "גימלים ממושכים", "נפקד", "כלא"];

const absenceReasonOptions: { value: AbsenceReason; label: string }[] = [
  { value: "קורס", label: "קורס" },
  { value: "גימלים", label: "גימלים" },
  { value: "גימלים ממושכים", label: "גימלים ממושכים" },
  { value: "נעדר", label: "נעדר (ללא סיבה מוצדקת)" },
  { value: "נפקד", label: "נפקד" },
  { value: "כלא", label: "כלא" },
];

// 4 סטטוסים לנוכחות
type AttendanceStatus = "attended" | "absent" | "not_in_rotation" | "not_updated";

const attendanceStatusLabels: Record<AttendanceStatus, string> = {
  attended: "נכח",
  absent: "נעדר",
  not_in_rotation: "לא בסבב",
  not_updated: "לא עודכן",
};

const attendanceStatusColors: Record<AttendanceStatus, string> = {
  attended: "bg-emerald-500",
  absent: "bg-red-500",
  not_in_rotation: "bg-blue-500",
  not_updated: "bg-slate-400",
};

const attendanceStatusIcons: Record<AttendanceStatus, React.ReactNode> = {
  attended: <CheckCircle className="w-4 h-4" />,
  absent: <XCircle className="w-4 h-4" />,
  not_in_rotation: <MinusCircle className="w-4 h-4" />,
  not_updated: <HelpCircle className="w-4 h-4" />,
};

const statusColors = {
  pending: "bg-amber-500",
  in_progress: "bg-blue-500",
  completed: "bg-emerald-500",
};

const statusLabels = {
  pending: "ממתין",
  in_progress: "בתהליך",
  completed: "בוצע",
};

const categoryColors = {
  platoon: "bg-blue-500",
  brigade: "bg-purple-500",
  holiday: "bg-amber-400",
};

const categoryLabels = {
  platoon: "מופע פלוגתי",
  brigade: "מופע חטיבה",
  holiday: "חג/אזכור",
};

const getDateKey = (value: string | null | undefined) => value?.slice(0, 10) || null;

const wasSoldierInUnitOnDate = (soldier: Soldier, eventDate: string) => {
  const eventDateKey = getDateKey(eventDate);
  if (!eventDateKey) return true;

  const createdDateKey = getDateKey(soldier.created_at);
  const releaseDateKey = getDateKey(soldier.release_date);
  const qualifiedDateKey = getDateKey(soldier.qualified_date);

  if (createdDateKey && createdDateKey > eventDateKey) return false;
  if (releaseDateKey && releaseDateKey < eventDateKey) return false;
  if (qualifiedDateKey && qualifiedDateKey > eventDateKey) return false;

  return true;
};

export default function AnnualWorkPlan() {
  const { isAdmin, isPlatoonCommander, canAccessAnnualWorkPlan, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<WorkPlanEvent[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [soldiers, setSoldiers] = useState<Soldier[]>([]);
  const [attendance, setAttendance] = useState<EventAttendance[]>([]);
  const [contentCycleOverrides, setContentCycleOverrides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"month" | "week" | "list">("month");
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<WorkPlanEvent | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<WorkPlanEvent | null>(null);
  const [attendanceDialogOpen, setAttendanceDialogOpen] = useState(false);
  const [expectedSoldiersDialogOpen, setExpectedSoldiersDialogOpen] = useState(false);
  const [selectedSoldierAttendance, setSelectedSoldierAttendance] = useState<Record<string, { status: AttendanceStatus; reason: string; completed: boolean }>>({});
  const [selectedExpectedSoldiers, setSelectedExpectedSoldiers] = useState<string[]>([]);
  const [dateEventsDialogOpen, setDateEventsDialogOpen] = useState(false);
  const [attendanceRotationFilter, setAttendanceRotationFilter] = useState<string>("expected");
  const [manualAddSoldierId, setManualAddSoldierId] = useState<string>("");
  const [detailAttendanceView, setDetailAttendanceView] = useState<"attended" | "absent" | "not_in_rotation" | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    event_date: "",
    end_date: "",
    status: "completed" as "pending" | "in_progress" | "completed",
    category: "platoon",
    is_recurring: false,
    recurring_count: 6,
    content_cycle: "",
  });

  useEffect(() => {
    if (!authLoading && !canAccessAnnualWorkPlan) {
      navigate("/");
    }
  }, [canAccessAnnualWorkPlan, authLoading, navigate]);

  // Active soldiers for selecting expected soldiers (new events)
  // = the drivers that appear in the Control Table (is_active = true)
  const activeSoldiers = useMemo(
    () => soldiers.filter(s => s.is_active && wasSoldierInUnitOnDate(s, format(new Date(), "yyyy-MM-dd"))),
    [soldiers]
  );

  // Soldiers eligible for a specific event:
  // currently in the Control Table (is_active) AND were in the unit on the event date.
  const getEligibleSoldiersForEvent = (eventDate: string) => {
    return soldiers.filter(s => s.is_active && wasSoldierInUnitOnDate(s, eventDate));
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchAllAttendance = async () => {
    const allData: any[] = [];
    let offset = 0;
    const batchSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from("event_attendance")
        .select("*")
        .range(offset, offset + batchSize - 1);

      if (error) {
        console.error("Error fetching attendance batch:", error);
        break;
      }

      if (data && data.length > 0) {
        allData.push(...data);
        offset += batchSize;
        hasMore = data.length === batchSize;
      } else {
        hasMore = false;
      }
    }
    console.log("All attendance fetched, total count:", allData.length);
    return allData;
  };

  const fetchData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    
    const [eventsRes, holidaysRes, soldiersRes, overridesRes, allAttendance] = await Promise.all([
      supabase.from("work_plan_events").select("*").order("event_date", { ascending: true }),
      supabase.from("calendar_holidays").select("*"),
      supabase.from("soldiers").select("id, full_name, personal_number, rotation_group, qualified_date, release_date, created_at, is_active").order("full_name"),
      supabase.from("content_cycle_overrides").select("*"),
      fetchAllAttendance(),
    ]);

    if (!eventsRes.error) setEvents((eventsRes.data || []) as WorkPlanEvent[]);
    if (!holidaysRes.error) setHolidays(holidaysRes.data || []);
    if (!soldiersRes.error) setSoldiers(soldiersRes.data || []);
    setAttendance(allAttendance);
    if (!overridesRes.error) setContentCycleOverrides(overridesRes.data || []);

    setLoading(false);
  };

  const getUpcomingReminders = () => {
    const today = new Date();
    return events.filter(event => {
      const eventDate = new Date(event.event_date);
      const daysUntil = differenceInDays(eventDate, today);
      return daysUntil > 0 && daysUntil <= 60 && event.status !== "completed";
    }).map(event => ({
      ...event,
      daysUntil: differenceInDays(new Date(event.event_date), today)
    })).sort((a, b) => a.daysUntil - b.daysUntil);
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.event_date) {
      toast.error("יש למלא כותרת ותאריך");
      return;
    }

    // בדוק אם יש אירוע כלשהו שבועיים לפני ותעתיק חיילים מצופים
    let copiedExpectedSoldiers: string[] = [];
    if (!editingEvent) {
      const newEventDate = parseISO(formData.event_date);
      const twoWeeksAgo = addDays(newEventDate, -14);
      const twoWeeksAgoStr = format(twoWeeksAgo, "yyyy-MM-dd");
      
      console.log("Looking for event from 2 weeks ago:", twoWeeksAgoStr);
      console.log("All events:", events.map(e => ({ date: e.event_date, title: e.title, expected: e.expected_soldiers?.length || 0 })));
      
      // חפש כל אירוע שהיה בדיוק שבועיים לפני (ללא קשר לכותרת)
      const matchingEvent = events.find(event => 
        event.event_date === twoWeeksAgoStr &&
        event.expected_soldiers && 
        event.expected_soldiers.length > 0
      );
      
      console.log("Matching event found:", matchingEvent);
      
      if (matchingEvent) {
        copiedExpectedSoldiers = matchingEvent.expected_soldiers;
        toast.info(`העתקנו ${copiedExpectedSoldiers.length} חיילים מצופים מהמופע "${matchingEvent.title}" מתאריך ${format(twoWeeksAgo, "dd/MM/yyyy", { locale: he })}`);
      }
    }

    const baseEventData = {
      title: formData.title,
      description: formData.description || null,
      event_date: formData.event_date,
      end_date: formData.end_date || null,
      status: formData.status,
      category: formData.category,
      color: formData.category === "platoon" ? "blue" : formData.category === "brigade" ? "purple" : "amber",
      attendees: [],
      expected_soldiers: editingEvent?.expected_soldiers || copiedExpectedSoldiers,
      content_cycle: formData.content_cycle || null,
    };

    if (editingEvent) {
      const { error } = await supabase
        .from("work_plan_events")
        .update(baseEventData)
        .eq("id", editingEvent.id);

      if (error) {
        toast.error("שגיאה בעדכון המופע");
      } else {
        toast.success("המופע עודכן בהצלחה");
        fetchData(false);
      }
    } else {
      // אירוע בודד - כבר לא צריך את האופציה של אירועים חוזרים אוטומטית
      const { error } = await supabase
        .from("work_plan_events")
        .insert(baseEventData);

      if (error) {
        toast.error("שגיאה ביצירת המופע");
      } else {
        if (copiedExpectedSoldiers.length > 0) {
          toast.success("המופע נוצר בהצלחה עם החיילים המצופים מהמופע הקודם");
        } else {
          toast.success("המופע נוצר בהצלחה");
        }
        fetchData(false);
      }
    }

    setDialogOpen(false);
    setDateEventsDialogOpen(false);
    resetForm();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("work_plan_events").delete().eq("id", id);

    if (error) {
      toast.error("שגיאה במחיקת המופע");
    } else {
      toast.success("המופע נמחק בהצלחה");
      fetchData(false);
      setDetailDialogOpen(false);
      setDateEventsDialogOpen(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      event_date: selectedDate ? format(selectedDate, "yyyy-MM-dd") : "",
      end_date: "",
      status: "completed",
      category: "platoon",
      is_recurring: false,
      recurring_count: 6,
      content_cycle: "",
    });
    setEditingEvent(null);
  };

  const openEditDialog = (event: WorkPlanEvent) => {
    setEditingEvent(event);
    setFormData({
      title: event.title,
      description: event.description || "",
      event_date: event.event_date,
      end_date: event.end_date || "",
      status: event.status,
      category: event.category || "platoon",
      is_recurring: event.is_series || false,
      recurring_count: 6,
      content_cycle: (event as any).content_cycle || "",
    });
    setDialogOpen(true);
    setDetailDialogOpen(false);
  };

  const openAddDialogForDate = (date: Date) => {
    setSelectedDate(date);
    resetForm();
    setFormData(prev => ({ ...prev, event_date: format(date, "yyyy-MM-dd") }));
    setDialogOpen(true);
  };

  const getCategoryColor = (category: string | null) => {
    return categoryColors[category as keyof typeof categoryColors] || "bg-blue-500";
  };

  // Calendar rendering
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Week view rendering
  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 0 });
  const daysInWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // Get events for week
  const getEventsForWeek = () => {
    return events.filter(event => {
      const eventDate = parseISO(event.event_date);
      return eventDate >= weekStart && eventDate <= weekEnd;
    }).sort((a, b) => parseISO(a.event_date).getTime() - parseISO(b.event_date).getTime());
  };

  // Get sorted events for list view
  const getSortedEventsList = () => {
    return [...events].sort((a, b) => parseISO(a.event_date).getTime() - parseISO(b.event_date).getTime());
  };

  const getEventsForDate = (date: Date) => {
    return events.filter(event => isSameDay(parseISO(event.event_date), date));
  };

  const getHolidaysForDate = (date: Date) => {
    return holidays.filter(h => {
      const holidayDate = parseISO(h.event_date);
      return holidayDate.getMonth() === date.getMonth() && holidayDate.getDate() === date.getDate();
    });
  };

  const handleDayClick = (day: Date) => {
    const dayEvents = getEventsForDate(day);
    const dayHolidays = getHolidaysForDate(day);
    
    if (dayEvents.length === 0 && dayHolidays.length === 0) {
      openAddDialogForDate(day);
    } else {
      // Always open the date events dialog so user can see existing events AND add new ones
      setSelectedDate(day);
      setDateEventsDialogOpen(true);
    }
  };

  // Expected soldiers management
  const openExpectedSoldiersDialog = (event: WorkPlanEvent) => {
    setSelectedEvent(event);
    setSelectedExpectedSoldiers(event.expected_soldiers || []);
    setExpectedSoldiersDialogOpen(true);
  };

  const saveExpectedSoldiers = async () => {
    if (!selectedEvent) return;

    // אם זה חלק מסדרה, עדכן את כל האירועים בסדרה
    if (selectedEvent.is_series && selectedEvent.series_id) {
      const { error } = await supabase
        .from("work_plan_events")
        .update({ expected_soldiers: selectedExpectedSoldiers })
        .eq("series_id", selectedEvent.series_id);

      if (error) {
        toast.error("שגיאה בשמירת החיילים המצופים");
      } else {
        toast.success("רשימת החיילים המצופים נשמרה לכל האירועים בסדרה");
        fetchData(false);
        setExpectedSoldiersDialogOpen(false);
      }
    } else {
      // אירוע בודד
      const { error } = await supabase
        .from("work_plan_events")
        .update({ expected_soldiers: selectedExpectedSoldiers })
        .eq("id", selectedEvent.id);

      if (error) {
        toast.error("שגיאה בשמירת החיילים המצופים");
      } else {
        toast.success("רשימת החיילים המצופים נשמרה");
        fetchData(false);
        setExpectedSoldiersDialogOpen(false);
      }
    }
  };

  // Attendance management with 4 statuses
  const openAttendanceDialog = (event: WorkPlanEvent) => {
    setSelectedEvent(event);
    const existingAttendance: Record<string, { status: AttendanceStatus; reason: string; completed: boolean }> = {};
    
    // הגדר ברירת מחדל לפי מצופים
    const expectedSoldiers = event.expected_soldiers || [];

    // Only include drivers from the Control Table that were in the unit on the event date,
    // plus any soldier that already has a saved attendance record for this event
    // (so historical records stay visible even after a soldier was released/deleted).
    const eligibleSoldierIds = new Set(
      getEligibleSoldiersForEvent(event.event_date).map(s => s.id)
    );
    const eventAttendanceRecords = attendance.filter(a => a.event_id === event.id);
    eventAttendanceRecords.forEach(a => eligibleSoldierIds.add(a.soldier_id));

    eligibleSoldierIds.forEach(soldierId => {
      const att = eventAttendanceRecords.find(a => a.soldier_id === soldierId);
      if (att) {
        existingAttendance[soldierId] = {
          status: att.status as AttendanceStatus,
          reason: att.absence_reason || "",
          completed: att.completed || false,
        };
      } else {
        // אם החייל לא ברשימת המצופים, הוא "לא בסבב" כברירת מחדל
        existingAttendance[soldierId] = {
          status: expectedSoldiers.includes(soldierId) ? "not_updated" : "not_in_rotation",
          reason: "",
          completed: false,
        };
      }
    });
    
    setSelectedSoldierAttendance(existingAttendance);
    setAttendanceRotationFilter("expected");
    setManualAddSoldierId("");
    setAttendanceDialogOpen(true);
  };

  const saveAttendance = async () => {
    if (!selectedEvent) return;

    const expectedSoldierIds = new Set(selectedEvent.expected_soldiers || []);

    // Log all current attendance state for debugging
    const allStatuses = Object.entries(selectedSoldierAttendance).map(([id, d]) => `${id.slice(0,8)}:${d.status}`);
    console.log("All soldier statuses:", allStatuses);

    // Build records - keep only meaningful overrides/attendance rows
    const recordsMap = new Map<string, any>();
    Object.entries(selectedSoldierAttendance)
      .filter(([soldierId, data]) => {
        if (data.status === "not_updated") return false;
        if (data.status === "not_in_rotation" && !expectedSoldierIds.has(soldierId)) return false;
        return true;
      })
      .forEach(([soldierId, data]) => {
        recordsMap.set(soldierId, {
          event_id: selectedEvent.id,
          soldier_id: soldierId,
          attended: data.status === "attended" || (data.status === "absent" && data.completed),
          absence_reason: data.status === "absent" ? data.reason : null,
          status: data.status,
          completed: data.status === "absent" && data.completed,
        });
      });
    
    const records = Array.from(recordsMap.values());
    console.log("Records to save:", records.length, "out of", Object.keys(selectedSoldierAttendance).length, "total soldiers");

    if (records.length === 0) {
      toast.error("אין נתוני נוכחות לשמירה - יש לסמן סטטוס לפחות לחייל אחד");
      return;
    }

    // First delete all existing records for this event
    const { data: deletedRows, error: deleteError } = await supabase
      .from("event_attendance")
      .delete()
      .eq("event_id", selectedEvent.id)
      .select();
    
    console.log("Deleted rows:", deletedRows?.length || 0, "error:", deleteError);
    
    if (deleteError) {
      console.error("Delete error:", deleteError);
      toast.error("שגיאה במחיקת נוכחות קיימת: " + deleteError.message);
      return;
    }

    // Insert all records
    const { data: insertedData, error: insertError } = await supabase
      .from("event_attendance")
      .insert(records)
      .select();

    console.log("Insert result - inserted:", insertedData?.length, "error:", insertError);

    if (insertError) {
      console.error("Insert error:", insertError);
      toast.error("שגיאה בשמירת הנוכחות: " + insertError.message);
      return;
    }

    toast.success(`הנוכחות נשמרה בהצלחה (${insertedData?.length || 0} רשומות)`);
    await fetchData(false);
    setAttendanceDialogOpen(false);
  };

  const getRelevantEventAttendance = (eventId: string) => {
    const event = events.find(e => e.id === eventId);
    if (!event) return [];

    const expectedSoldiers = event.expected_soldiers || [];
    const attendanceRecords = attendance.filter(a => a.event_id === eventId);
    const attendanceBySoldier = new Map(attendanceRecords.map(record => [record.soldier_id, record]));
    const soldierById = new Map(soldiers.map(soldier => [soldier.id, soldier]));

    // Eligible soldiers for this event = drivers currently in the Control Table
    // (is_active = true) that were also in the unit on the event date.
    // Released soldiers from past events are still preserved through their saved
    // attendance records below (attendanceRecords).
    const historicalRosterIds = soldiers
      .filter((soldier) => soldier.is_active && wasSoldierInUnitOnDate(soldier, event.event_date))
      .map((s) => s.id);

    const soldierIds = new Set<string>([
      ...expectedSoldiers,
      ...attendanceRecords.map(record => record.soldier_id),
      ...historicalRosterIds,
    ]);

    return Array.from(soldierIds)
      .filter((soldierId) => {
        const soldier = soldierById.get(soldierId);
        // Always keep saved attendance records, even if the soldier was released
        // or deleted from the Control Table — preserves historical reports.
        if (attendanceBySoldier.has(soldierId)) return true;
        if (!soldier) return false;
        return soldier.is_active && wasSoldierInUnitOnDate(soldier, event.event_date);
      })
      .map((soldierId) => {
        const record = attendanceBySoldier.get(soldierId);

        if (record) {
          return {
            soldier_id: soldierId,
            status: record.status as AttendanceStatus,
            absence_reason: record.absence_reason,
            completed: record.completed,
          };
        }

        return {
          soldier_id: soldierId,
          status: expectedSoldiers.includes(soldierId) ? "not_updated" as AttendanceStatus : "not_in_rotation" as AttendanceStatus,
          absence_reason: null,
          completed: false,
        };
      });
  };

  const getEventAttendanceStats = (eventId: string) => {
    const eventAttendance = getRelevantEventAttendance(eventId);
    const attended = eventAttendance.filter(a => a.status === "attended" || a.completed).length;
    
    // נעדרים שמשפיעים על אחוז הנוכחות (רק גימלים ונעדר ללא סיבה)
    const countableAbsent = eventAttendance.filter(a => 
      a.status === "absent" && 
      !a.completed &&
      !NON_COUNTABLE_ABSENCE_REASONS.includes(a.absence_reason as AbsenceReason)
    ).length;
    
    // נעדרים שלא משפיעים על אחוז הנוכחות (קורס, גימלים ממושכים, נפקד, כלא)
    const nonCountableAbsent = eventAttendance.filter(a => 
      a.status === "absent" && 
      !a.completed &&
      NON_COUNTABLE_ABSENCE_REASONS.includes(a.absence_reason as AbsenceReason)
    ).length;
    
    const notInRotation = eventAttendance.filter(a => a.status === "not_in_rotation").length;
    const total = eventAttendance.filter(a => a.status !== "not_in_rotation" && a.status !== "not_updated").length;
    
    // אחוז נוכחות - רק מחושב מאלו שהיו יכולים להגיע
    const totalCountable = attended + countableAbsent;
    const attendancePercent = totalCountable > 0 ? Math.round((attended / totalCountable) * 100) : 0;
    
    return { 
      attended, 
      absent: countableAbsent, 
      nonCountableAbsent,
      notInRotation, 
      total,
      attendancePercent 
    };
  };

  // Select all expected or toggle
  const selectAllExpected = () => {
    setSelectedExpectedSoldiers(activeSoldiers.map(s => s.id));
  };

  const clearAllExpected = () => {
    setSelectedExpectedSoldiers([]);
  };

  const upcomingReminders = getUpcomingReminders();

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
      <div className="min-h-screen bg-gradient-to-br from-white via-slate-50 to-white pb-24" dir="rtl">
        {/* Header */}
        <div className="relative overflow-hidden bg-gradient-to-l from-slate-900 via-slate-800 to-slate-900 px-4 py-8">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--gold)/0.2),transparent_50%)]" />
          <div className="absolute top-4 left-4 opacity-20">
            <img src={unitLogo} alt="" className="w-20 h-20" />
          </div>
          
          <div className="relative z-10 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gold/20 border border-gold/30 mb-4">
              <CalendarIcon className="w-4 h-4 text-gold" />
              <span className="text-sm font-bold text-gold">תוכנית עבודה שנתית</span>
            </div>
            <h1 className="text-2xl font-black text-white mb-2">לוח שנה</h1>
            <p className="text-slate-400 text-sm">ניהול מופעים ואירועים</p>
          </div>
        </div>

        <div className="px-4 py-6 space-y-6">
          {/* Legend */}
          <div className="flex flex-wrap gap-2 justify-center">
            <Badge className="bg-blue-500 text-white gap-1"><Building2 className="w-3 h-3" /> פלוגתי</Badge>
            <Badge className="bg-purple-500 text-white gap-1"><Flag className="w-3 h-3" /> חטיבה</Badge>
            <Badge className="bg-amber-400 text-white gap-1"><Star className="w-3 h-3" /> חג/אזכור</Badge>
          </div>

          {/* Attendance Status Legend */}
          <Card className="border-0 bg-gradient-to-br from-slate-50 to-white">
            <CardContent className="p-4">
              <p className="text-sm font-bold text-slate-700 mb-3">מקרא סטטוסי נוכחות:</p>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(attendanceStatusLabels) as AttendanceStatus[]).map(status => (
                  <Badge key={status} className={`${attendanceStatusColors[status]} text-white gap-1`}>
                    {attendanceStatusIcons[status]}
                    {attendanceStatusLabels[status]}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Reminders Section */}
          {upcomingReminders.length > 0 && (
            <Card className="border-0 bg-gradient-to-br from-amber-50 to-orange-50 shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-amber-800">
                  <Bell className="w-5 h-5" />
                  תזכורות קרובות
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {upcomingReminders.slice(0, 3).map(event => (
                  <div
                    key={event.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-white/80 border border-amber-200 cursor-pointer"
                    onClick={() => { setSelectedEvent(event); setDetailDialogOpen(true); }}
                  >
                    <div className={`w-2 h-10 rounded-full ${getCategoryColor(event.category)}`} />
                    <div className="flex-1">
                      <p className="font-bold text-slate-800">{event.title}</p>
                      <p className="text-sm text-slate-500">
                        {format(parseISO(event.event_date), "dd/MM/yyyy", { locale: he })}
                      </p>
                    </div>
                    <Badge className="bg-amber-500 text-white">
                      {event.daysUntil} ימים
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Add Event Button */}
          <Button
            onClick={() => { resetForm(); setDialogOpen(true); }}
            className="w-full bg-gradient-to-r from-primary to-teal text-white py-6 rounded-2xl shadow-lg"
          >
            <Plus className="w-5 h-5 ml-2" />
            הוסף מופע חדש
          </Button>

          {/* View Mode Tabs */}
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "month" | "week" | "list")} className="w-full">
            <TabsList className="grid w-full grid-cols-3 rounded-2xl bg-slate-100 p-1">
              <TabsTrigger value="month" className="rounded-xl gap-2 data-[state=active]:bg-white">
                <CalendarIcon className="w-4 h-4" />
                חודש
              </TabsTrigger>
              <TabsTrigger value="week" className="rounded-xl gap-2 data-[state=active]:bg-white">
                <CalendarDays className="w-4 h-4" />
                שבוע
              </TabsTrigger>
              <TabsTrigger value="list" className="rounded-xl gap-2 data-[state=active]:bg-white">
                <List className="w-4 h-4" />
                רשימה
              </TabsTrigger>
            </TabsList>

            {/* Month View */}
            <TabsContent value="month" className="mt-4">
              <Card className="border-0 shadow-xl bg-white/90 backdrop-blur rounded-3xl overflow-hidden">
                <CardHeader className="bg-gradient-to-l from-primary/10 to-teal/10 border-b border-slate-100">
                  <div className="flex items-center justify-between">
                    <Button variant="ghost" size="icon" onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="rounded-xl">
                      <ChevronRight className="w-5 h-5" />
                    </Button>
                    <CardTitle className="text-slate-800">
                      {format(currentDate, "MMMM yyyy", { locale: he })}
                    </CardTitle>
                    <Button variant="ghost" size="icon" onClick={() => setCurrentDate(addMonths(currentDate, -1))} className="rounded-xl">
                      <ChevronLeft className="w-5 h-5" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-2">
                  {/* Day Names */}
                  <div className="grid grid-cols-7 gap-1 mb-1">
                    {["א", "ב", "ג", "ד", "ה", "ו", "ש"].map(day => (
                      <div key={day} className="text-center text-xs font-bold text-slate-500 py-1">
                        {day}
                      </div>
                    ))}
                  </div>

                  {/* Calendar Grid */}
                  <div className="grid grid-cols-7 gap-1">
                    {Array.from({ length: monthStart.getDay() }).map((_, i) => (
                      <div key={`empty-${i}`} className="aspect-square" />
                    ))}

                    {daysInMonth.map(day => {
                      const dayEvents = getEventsForDate(day);
                      const dayHolidays = getHolidaysForDate(day);
                      const isCurrentDay = isToday(day);
                      const hasContent = dayEvents.length > 0 || dayHolidays.length > 0;

                      return (
                        <div
                          key={day.toISOString()}
                          onClick={() => handleDayClick(day)}
                          className={`
                            min-h-[60px] p-1 rounded-lg cursor-pointer transition-all duration-200 border
                            ${isCurrentDay ? "bg-primary/10 border-primary" : "border-transparent hover:bg-slate-50 hover:border-slate-200"}
                            ${hasContent ? "bg-slate-50/50" : ""}
                          `}
                        >
                          <div className={`text-xs mb-0.5 ${isCurrentDay ? "font-bold text-primary" : "text-slate-600"}`}>
                            {format(day, "d")}
                          </div>
                          
                          {/* Holidays */}
                          {dayHolidays.map(h => (
                            <div key={h.id} className="text-[8px] px-1 py-0.5 rounded bg-amber-100 text-amber-800 truncate mb-0.5">
                              {h.title}
                            </div>
                          ))}
                          
                          {/* Events */}
                          {dayEvents.slice(0, 2).map(event => (
                            <div
                              key={event.id}
                              className={`text-[8px] px-1 py-0.5 rounded text-white truncate mb-0.5 ${getCategoryColor(event.category)}`}
                            >
                              {event.title}
                            </div>
                          ))}
                          
                          {dayEvents.length > 2 && (
                            <div className="text-[8px] text-slate-500">+{dayEvents.length - 2}</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Week View */}
            <TabsContent value="week" className="mt-4">
              <Card className="border-0 shadow-xl bg-white/90 backdrop-blur rounded-3xl overflow-hidden">
                <CardHeader className="bg-gradient-to-l from-primary/10 to-teal/10 border-b border-slate-100">
                  <div className="flex items-center justify-between">
                    <Button variant="ghost" size="icon" onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))} className="rounded-xl">
                      <ChevronRight className="w-5 h-5" />
                    </Button>
                    <CardTitle className="text-slate-800 text-center">
                      <span className="text-sm text-slate-500 block">שבוע</span>
                      {format(weekStart, "dd/MM", { locale: he })} - {format(weekEnd, "dd/MM/yyyy", { locale: he })}
                    </CardTitle>
                    <Button variant="ghost" size="icon" onClick={() => setCurrentWeek(addWeeks(currentWeek, -1))} className="rounded-xl">
                      <ChevronLeft className="w-5 h-5" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  {/* Week Days */}
                  <div className="space-y-2">
                    {daysInWeek.map(day => {
                      const dayEvents = getEventsForDate(day);
                      const dayHolidays = getHolidaysForDate(day);
                      const isCurrentDay = isToday(day);

                      return (
                        <div
                          key={day.toISOString()}
                          className={`p-3 rounded-2xl border transition-all ${isCurrentDay ? "bg-primary/10 border-primary" : "bg-slate-50 border-slate-200"}`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className={`text-sm font-bold ${isCurrentDay ? "text-primary" : "text-slate-700"}`}>
                                {format(day, "EEEE", { locale: he })}
                              </span>
                              <span className="text-sm text-slate-500">
                                {format(day, "dd/MM", { locale: he })}
                              </span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openAddDialogForDate(day)}
                              className="h-7 px-2 text-xs"
                            >
                              <Plus className="w-3 h-3 ml-1" />
                              הוסף
                            </Button>
                          </div>
                          
                          {dayHolidays.length === 0 && dayEvents.length === 0 && (
                            <p className="text-xs text-slate-400">אין אירועים</p>
                          )}
                          
                          {dayHolidays.map(h => (
                            <div key={h.id} className="text-xs px-2 py-1 rounded-lg bg-amber-100 text-amber-800 mb-1">
                              <Star className="w-3 h-3 inline ml-1" />
                              {h.title}
                            </div>
                          ))}
                          
                          {dayEvents.map(event => (
                            <div
                              key={event.id}
                              onClick={() => { setSelectedEvent(event); setDetailDialogOpen(true); }}
                              className={`text-xs px-2 py-1.5 rounded-lg text-white mb-1 cursor-pointer hover:opacity-80 transition-opacity ${getCategoryColor(event.category)}`}
                            >
                              {event.title}
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* List View */}
            <TabsContent value="list" className="mt-4">
              <Card className="border-0 shadow-xl bg-white/90 backdrop-blur rounded-3xl">
                <CardHeader>
                  <CardTitle className="text-slate-800">כל המופעים</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="max-h-[500px]">
                    <div className="space-y-3">
                      {events.length === 0 ? (
                        <div className="text-center py-12 text-slate-500">
                          <CalendarIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
                          <p>אין מופעים</p>
                        </div>
                      ) : (
                        getSortedEventsList().map(event => {
                          const stats = getEventAttendanceStats(event.id);
                          const eventDate = parseISO(event.event_date);
                          const isPast = eventDate < new Date();
                          
                          return (
                            <div
                              key={event.id}
                              onClick={() => { setSelectedEvent(event); setDetailDialogOpen(true); }}
                              className={`p-4 rounded-2xl border cursor-pointer transition-all ${isPast ? "bg-slate-100/50 border-slate-200" : "bg-slate-50 hover:bg-slate-100 border-slate-200"}`}
                            >
                              <div className="flex items-start gap-3">
                                <div className={`w-1.5 h-full min-h-[60px] rounded-full ${getCategoryColor(event.category)}`} />
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                                    <h4 className={`font-bold ${isPast ? "text-slate-500" : "text-slate-800"}`}>{event.title}</h4>
                                    <Badge className={`${statusColors[event.status]} text-white text-xs`}>
                                      {statusLabels[event.status]}
                                    </Badge>
                                    <Badge variant="outline" className="text-xs">
                                      {categoryLabels[event.category as keyof typeof categoryLabels] || "פלוגתי"}
                                    </Badge>
                                  </div>
                                  <div className="flex items-center gap-2 text-sm text-slate-500">
                                    <Clock className="w-3 h-3" />
                                    {format(eventDate, "dd/MM/yyyy", { locale: he })}
                                    {isPast && <Badge variant="outline" className="text-xs">עבר</Badge>}
                                  </div>
                                  {stats.total > 0 && (
                                    <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
                                      <span className="flex items-center gap-1">
                                        <CheckCircle className="w-3 h-3 text-emerald-500" />
                                        {stats.attended}
                                      </span>
                                      <span className="flex items-center gap-1">
                                        <XCircle className="w-3 h-3 text-red-500" />
                                        {stats.absent}
                                      </span>
                                      <span className="flex items-center gap-1">
                                        <MinusCircle className="w-3 h-3 text-blue-500" />
                                        {stats.notInRotation}
                                      </span>
                                    </div>
                                  )}
                                  {(event.expected_soldiers?.length || 0) > 0 && (
                                    <div className="flex items-center gap-1 text-sm text-blue-600 mt-1">
                                      <Users className="w-3 h-3" />
                                      {event.expected_soldiers.length} מצופים
                                    </div>
                                  )}
                                  {event.is_series && (
                                    <Badge variant="outline" className="text-xs text-purple-600 border-purple-300 mt-1">
                                      🔄 חוזר כל שבועיים
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Content Cycle Tracker */}
          <ContentCycleTracker
            events={events as any}
            attendance={attendance}
            soldiers={soldiers}
            overrides={contentCycleOverrides}
            onOverrideChange={fetchData}
          />
        </div>

        {/* Add/Edit Event Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" dir="rtl">
            <DialogHeader>
              <DialogTitle>{editingEvent ? "עריכת מופע" : "הוספת מופע חדש"}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label>כותרת *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="שם המופע"
                />
              </div>

              <div>
                <Label>תיאור</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="תיאור המופע"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>תאריך התחלה *</Label>
                  <Input
                    type="date"
                    value={formData.event_date}
                    onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label>תאריך סיום</Label>
                  <Input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>קטגוריה</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(v) => setFormData({ ...formData, category: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="platoon">מופע פלוגתי</SelectItem>
                      <SelectItem value="brigade">מופע חטיבה</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>סטטוס</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(v) => setFormData({ ...formData, status: v as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">ממתין</SelectItem>
                      <SelectItem value="in_progress">בתהליך</SelectItem>
                      <SelectItem value="completed">בוצע</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* מחזור תוכן דו-שבועי */}
              <div>
                <Label>מחזור תוכן (דו-שבועי)</Label>
                <Input
                  value={formData.content_cycle}
                  onChange={(e) => setFormData({ ...formData, content_cycle: e.target.value })}
                  placeholder="לדוגמא: נהיגת שטח - מחזור 1"
                />
                <p className="text-xs text-slate-500 mt-1">אירועים עם אותו מחזור תוכן יקובצו יחד למעקב</p>
              </div>

              {!editingEvent && (
                <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 space-y-3">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="is_recurring"
                      checked={formData.is_recurring}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_recurring: !!checked })}
                    />
                    <Label htmlFor="is_recurring" className="cursor-pointer">
                      <span className="font-bold text-blue-800">אירוע חוזר כל שבועיים</span>
                      <p className="text-xs text-blue-600">ייצור סדרת אירועים אוטומטית בהפרש של שבועיים</p>
                    </Label>
                  </div>

                  {formData.is_recurring && (
                    <div>
                      <Label className="text-blue-700">כמה אירועים ליצור?</Label>
                      <Select
                        value={formData.recurring_count.toString()}
                        onValueChange={(v) => setFormData({ ...formData, recurring_count: parseInt(v) })}
                      >
                        <SelectTrigger className="bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="4">4 אירועים (חודשיים)</SelectItem>
                          <SelectItem value="6">6 אירועים (3 חודשים)</SelectItem>
                          <SelectItem value="8">8 אירועים (4 חודשים)</SelectItem>
                          <SelectItem value="12">12 אירועים (חצי שנה)</SelectItem>
                          <SelectItem value="24">24 אירועים (שנה)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )}
            </div>

            <DialogFooter className="mt-6">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>ביטול</Button>
              <Button onClick={handleSubmit} className="bg-primary">
                {editingEvent ? "עדכן" : "הוסף"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Event Detail Dialog */}
        <Dialog open={detailDialogOpen} onOpenChange={(open) => { setDetailDialogOpen(open); if (!open) setDetailAttendanceView(null); }}>
          <DialogContent className="max-w-md" dir="rtl">
            {selectedEvent && (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-12 rounded-full ${getCategoryColor(selectedEvent.category)}`} />
                    <div>
                      <DialogTitle>{selectedEvent.title}</DialogTitle>
                      <div className="flex gap-2 mt-1 flex-wrap">
                        <Badge className={`${statusColors[selectedEvent.status]} text-white`}>
                          {statusLabels[selectedEvent.status]}
                        </Badge>
                        <Badge variant="outline">
                          {categoryLabels[selectedEvent.category as keyof typeof categoryLabels] || "פלוגתי"}
                        </Badge>
                        {selectedEvent.is_series && (
                          <Badge variant="outline" className="text-purple-600 border-purple-300">
                            🔄 חוזר כל שבועיים
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </DialogHeader>

                <div className="space-y-4 mt-4">
                  {selectedEvent.description && (
                    <p className="text-slate-600">{selectedEvent.description}</p>
                  )}

                  <div className="flex items-center gap-2 text-slate-600">
                    <CalendarIcon className="w-4 h-4" />
                    <span>{format(parseISO(selectedEvent.event_date), "dd/MM/yyyy", { locale: he })}</span>
                    {selectedEvent.end_date && (
                      <span>- {format(parseISO(selectedEvent.end_date), "dd/MM/yyyy", { locale: he })}</span>
                    )}
                  </div>

                  {/* Expected Soldiers Info */}
                  {(selectedEvent.expected_soldiers?.length || 0) > 0 && (
                    <div className="p-3 bg-blue-50 rounded-xl">
                      <div className="flex items-center gap-2 text-blue-700">
                        <Users className="w-4 h-4" />
                        <span className="font-medium">{selectedEvent.expected_soldiers.length} חיילים מצופים</span>
                      </div>
                    </div>
                  )}

                  {/* Attendance Stats - Clickable to show soldier lists */}
                  {(() => {
                    const stats = getEventAttendanceStats(selectedEvent.id);
                    const eventAttendance = getRelevantEventAttendance(selectedEvent.id);
                    if (stats.total > 0) {
                      const attendedSoldiers = eventAttendance.filter(a => a.status === "attended" || a.completed);
                      const absentSoldiers = eventAttendance.filter(a => a.status === "absent" && !a.completed);
                      const notInRotationSoldiers = eventAttendance.filter(a => a.status === "not_in_rotation");

                      return (
                        <div className="p-3 bg-slate-50 rounded-xl space-y-2">
                          <p className="font-medium text-slate-700">סיכום נוכחות:</p>
                          <div className="grid grid-cols-3 gap-2">
                            <div className="text-center p-2 rounded-lg bg-emerald-100 cursor-pointer hover:bg-emerald-200 transition-colors" onClick={() => setDetailAttendanceView(prev => prev === "attended" ? null : "attended")}>
                              <p className="text-lg font-bold text-emerald-700">{stats.attended}</p>
                              <p className="text-xs text-emerald-600">נכחו</p>
                            </div>
                            <div className="text-center p-2 rounded-lg bg-red-100 cursor-pointer hover:bg-red-200 transition-colors" onClick={() => setDetailAttendanceView(prev => prev === "absent" ? null : "absent")}>
                              <p className="text-lg font-bold text-red-700">{stats.absent}</p>
                              <p className="text-xs text-red-600">נעדרו</p>
                            </div>
                            <div className="text-center p-2 rounded-lg bg-blue-100 cursor-pointer hover:bg-blue-200 transition-colors" onClick={() => setDetailAttendanceView(prev => prev === "not_in_rotation" ? null : "not_in_rotation")}>
                              <p className="text-lg font-bold text-blue-700">{stats.notInRotation}</p>
                              <p className="text-xs text-blue-600">לא בסבב</p>
                            </div>
                          </div>

                          {/* Expandable soldier lists */}
                          {detailAttendanceView === "attended" && attendedSoldiers.length > 0 && (
                            <div className="mt-2 p-2 bg-emerald-50 rounded-lg border border-emerald-200">
                              <p className="text-xs font-bold text-emerald-700 mb-1.5">נכחו ({attendedSoldiers.length}):</p>
                              <div className="space-y-1 max-h-40 overflow-y-auto">
                                {attendedSoldiers.map(a => {
                                  const s = soldiers.find(sol => sol.id === a.soldier_id);
                                  return s ? (
                                    <div key={s.id} className="flex items-center gap-2 py-1 px-2 rounded bg-white text-sm">
                                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                      <span className="text-slate-800">{s.full_name}</span>
                                      {a.completed && <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-600 border-blue-200">השלמה</Badge>}
                                    </div>
                                  ) : null;
                                })}
                              </div>
                            </div>
                          )}

                          {detailAttendanceView === "absent" && absentSoldiers.length > 0 && (
                            <div className="mt-2 p-2 bg-red-50 rounded-lg border border-red-200">
                              <p className="text-xs font-bold text-red-700 mb-1.5">נעדרו ({absentSoldiers.length}):</p>
                              <div className="space-y-1 max-h-40 overflow-y-auto">
                                {absentSoldiers.map(a => {
                                  const s = soldiers.find(sol => sol.id === a.soldier_id);
                                  return s ? (
                                    <div key={s.id} className="flex items-center justify-between py-1 px-2 rounded bg-white text-sm">
                                      <div className="flex items-center gap-2">
                                        <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                                        <span className="text-slate-800">{s.full_name}</span>
                                      </div>
                                      {a.absence_reason && <span className="text-xs text-amber-600">{a.absence_reason}</span>}
                                    </div>
                                  ) : null;
                                })}
                              </div>
                            </div>
                          )}

                          {detailAttendanceView === "not_in_rotation" && notInRotationSoldiers.length > 0 && (
                            <div className="mt-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
                              <p className="text-xs font-bold text-blue-700 mb-1.5">לא בסבב ({notInRotationSoldiers.length}):</p>
                              <div className="space-y-1 max-h-40 overflow-y-auto">
                                {notInRotationSoldiers.map(a => {
                                  const s = soldiers.find(sol => sol.id === a.soldier_id);
                                  return s ? (
                                    <div key={s.id} className="flex items-center gap-2 py-1 px-2 rounded bg-white text-sm">
                                      <MinusCircle className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                      <span className="text-slate-800">{s.full_name}</span>
                                    </div>
                                  ) : null;
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>

                <DialogFooter className="mt-6 flex flex-wrap gap-2">
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(selectedEvent.id)}>
                    <Trash2 className="w-4 h-4 ml-1" />
                    מחק
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => openExpectedSoldiersDialog(selectedEvent)}>
                    <Users className="w-4 h-4 ml-1" />
                    מצופים
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => openAttendanceDialog(selectedEvent)}>
                    <UserCheck className="w-4 h-4 ml-1" />
                    נוכחות
                  </Button>
                  <Button size="sm" onClick={() => openEditDialog(selectedEvent)}>
                    <Edit className="w-4 h-4 ml-1" />
                    ערוך
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Date Events Dialog */}
        <Dialog open={dateEventsDialogOpen} onOpenChange={setDateEventsDialogOpen}>
          <DialogContent className="max-w-md" dir="rtl">
            <DialogHeader>
              <DialogTitle>
                {selectedDate && format(selectedDate, "dd/MM/yyyy", { locale: he })}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3">
              {selectedDate && (
                <>
                  {/* Holidays */}
                  {getHolidaysForDate(selectedDate).map(h => (
                    <div key={h.id} className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                      <div className="flex items-center gap-2">
                        <Star className="w-4 h-4 text-amber-600" />
                        <span className="font-medium text-amber-800">{h.title}</span>
                        <Badge variant="outline" className="text-amber-600 border-amber-300">
                          {h.category === "holiday" ? "חג" : "אזכור"}
                        </Badge>
                      </div>
                    </div>
                  ))}

                  {/* Events */}
                  {getEventsForDate(selectedDate).map(event => (
                    <div
                      key={event.id}
                      onClick={() => { setSelectedEvent(event); setDetailDialogOpen(true); setDateEventsDialogOpen(false); }}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100"
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-8 rounded-full ${getCategoryColor(event.category)}`} />
                        <div className="flex-1">
                          <p className="font-medium text-slate-800">{event.title}</p>
                          <Badge className={`${statusColors[event.status]} text-white text-xs`}>
                            {statusLabels[event.status]}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>

            <DialogFooter>
              <Button onClick={() => selectedDate && openAddDialogForDate(selectedDate)} className="w-full">
                <Plus className="w-4 h-4 ml-1" />
                הוסף מופע ליום זה
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Expected Soldiers Dialog */}
        <Dialog open={expectedSoldiersDialogOpen} onOpenChange={setExpectedSoldiersDialogOpen}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-hidden flex flex-col min-h-0" dir="rtl">
            <DialogHeader>
              <DialogTitle>חיילים מצופים למופע: {selectedEvent?.title}</DialogTitle>
            </DialogHeader>

            <p className="text-sm text-slate-600">
              בחר את החיילים שאמורים להגיע למופע זה. מי שלא ברשימה יסומן אוטומטית כ"לא בסבב".
            </p>

            {selectedEvent?.is_series && (
              <div className="p-3 rounded-xl bg-purple-50 border border-purple-200">
                <p className="text-sm text-purple-700 font-medium">
                  🔄 אירוע זה חלק מסדרה חוזרת כל שבועיים
                </p>
                <p className="text-xs text-purple-600">
                  השינויים יחולו על כל האירועים בסדרה
                </p>
              </div>
            )}

            <div className="flex flex-wrap gap-2 my-2">
              <Button variant="outline" size="sm" onClick={selectAllExpected}>בחר הכל</Button>
              <Button variant="outline" size="sm" onClick={clearAllExpected}>נקה הכל</Button>
            </div>

            {/* Quick rotation group select */}
            <div className="p-3 rounded-xl bg-violet-50 border border-violet-200">
              <p className="text-xs font-bold text-violet-700 mb-2">בחר לפי סבב:</p>
              <div className="flex flex-wrap gap-2">
                {ROTATION_GROUPS.map(group => {
                  const groupSoldiers = activeSoldiers.filter(s => s.rotation_group === group.value);
                  const allSelected = groupSoldiers.length > 0 && groupSoldiers.every(s => selectedExpectedSoldiers.includes(s.id));
                  return (
                    <Button
                      key={group.value}
                      variant={allSelected ? "default" : "outline"}
                      size="sm"
                      className={`text-xs ${allSelected ? "bg-violet-600 hover:bg-violet-700" : ""}`}
                      onClick={() => {
                        if (allSelected) {
                          // Remove this group's soldiers
                          setSelectedExpectedSoldiers(prev => prev.filter(id => !groupSoldiers.some(s => s.id === id)));
                        } else {
                          // Add this group's soldiers
                          const newIds = groupSoldiers.map(s => s.id).filter(id => !selectedExpectedSoldiers.includes(id));
                          setSelectedExpectedSoldiers(prev => [...prev, ...newIds]);
                        }
                      }}
                    >
                      {group.label} ({groupSoldiers.length})
                    </Button>
                  );
                })}
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto max-h-[60vh] pr-1 overscroll-contain">
              <div className="space-y-2 p-1">
                {activeSoldiers.map(soldier => (
                  <div
                    key={soldier.id}
                    className={`p-3 rounded-xl border transition-all cursor-pointer ${
                      selectedExpectedSoldiers.includes(soldier.id)
                        ? "bg-primary/10 border-primary"
                        : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                    }`}
                    onClick={() => {
                      if (selectedExpectedSoldiers.includes(soldier.id)) {
                        setSelectedExpectedSoldiers(prev => prev.filter(id => id !== soldier.id));
                      } else {
                        setSelectedExpectedSoldiers(prev => [...prev, soldier.id]);
                      }
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox checked={selectedExpectedSoldiers.includes(soldier.id)} />
                      <div className="flex-1">
                        <p className="font-medium text-slate-800">{soldier.full_name}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-slate-500">{soldier.personal_number}</p>
                          {(soldier as any).rotation_group && (
                            <Badge className="bg-violet-100 text-violet-700 text-[10px] px-1.5 py-0">
                              {ROTATION_GROUPS.find(r => r.value === (soldier as any).rotation_group)?.label || (soldier as any).rotation_group}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setExpectedSoldiersDialogOpen(false)}>ביטול</Button>
              <Button onClick={saveExpectedSoldiers} className="bg-primary">
                שמור ({selectedExpectedSoldiers.length} נבחרו)
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Attendance Dialog with Rotation Filter */}
        <Dialog open={attendanceDialogOpen} onOpenChange={setAttendanceDialogOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col min-h-0" dir="rtl">
            <DialogHeader>
              <DialogTitle>נוכחות במופע: {selectedEvent?.title}</DialogTitle>
            </DialogHeader>

            <div className="flex flex-wrap gap-2 mb-2">
              {(Object.keys(attendanceStatusLabels) as AttendanceStatus[]).map(status => (
                <Badge key={status} className={`${attendanceStatusColors[status]} text-white gap-1 text-xs`}>
                  {attendanceStatusIcons[status]}
                  {attendanceStatusLabels[status]}
                </Badge>
              ))}
            </div>

            {/* Rotation Filter */}
            <div className="p-3 rounded-xl bg-violet-50 border border-violet-200 space-y-2">
              <p className="text-xs font-bold text-violet-700">סנן לפי סבב:</p>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setAttendanceRotationFilter("expected")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    attendanceRotationFilter === "expected" ? "bg-violet-600 text-white" : "bg-white text-violet-700 border border-violet-200"
                  }`}
                >
                  מצופים ({selectedEvent?.expected_soldiers?.length || 0})
                </button>
                {ROTATION_GROUPS.map(group => {
                  const count = soldiers.filter(s => s.is_active && s.rotation_group === group.value && (!selectedEvent || wasSoldierInUnitOnDate(s, selectedEvent.event_date))).length;
                  return (
                    <button
                      key={group.value}
                      onClick={() => setAttendanceRotationFilter(group.value)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        attendanceRotationFilter === group.value ? "bg-violet-600 text-white" : "bg-white text-violet-700 border border-violet-200"
                      }`}
                    >
                      {group.label} ({count})
                    </button>
                  );
                })}
                <button
                  onClick={() => setAttendanceRotationFilter("all")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    attendanceRotationFilter === "all" ? "bg-violet-600 text-white" : "bg-white text-violet-700 border border-violet-200"
                  }`}
                >
                  הכל ({soldiers.filter(s => s.is_active && (!selectedEvent || wasSoldierInUnitOnDate(s, selectedEvent.event_date))).length})
                </button>
              </div>
            </div>

            {/* Manual Add Soldier */}
            <div className="flex gap-2">
              <Select value={manualAddSoldierId} onValueChange={setManualAddSoldierId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="הוסף חייל ידנית..." />
                </SelectTrigger>
                <SelectContent>
                  {soldiers
                    .filter(s => {
                      // Only currently-active drivers (Control Table) that were in the unit on the event date
                      const expectedSoldiers = selectedEvent?.expected_soldiers || [];
                      const alreadyAdded = selectedSoldierAttendance[s.id]?.status === "attended" || selectedSoldierAttendance[s.id]?.status === "absent";
                      const relevantForEvent = !selectedEvent || wasSoldierInUnitOnDate(s, selectedEvent.event_date);
                      return s.is_active && relevantForEvent && !expectedSoldiers.includes(s.id) && !alreadyAdded;
                    })
                    .map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.full_name} ({ROTATION_GROUPS.find(r => r.value === s.rotation_group)?.label || "ללא סבב"})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                variant="outline"
                disabled={!manualAddSoldierId}
                onClick={() => {
                  if (manualAddSoldierId) {
                    setSelectedSoldierAttendance(prev => ({
                      ...prev,
                      [manualAddSoldierId]: { status: "attended", reason: "", completed: false }
                    }));
                    // Switch to "all" filter so the added soldier is visible
                    setAttendanceRotationFilter("all");
                    setManualAddSoldierId("");
                    toast.success("חייל נוסף לרשימת הנוכחות");
                  }
                }}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto max-h-[50vh] pr-1 overscroll-contain">
              <div className="space-y-3 p-1">
                {soldiers
                  .filter(soldier => {
                    if (!selectedEvent) return false;
                    const expectedSoldiers = selectedEvent.expected_soldiers || [];
                    const soldierState = selectedSoldierAttendance[soldier.id];
                    const hasAttendanceRecord =
                      soldierState?.status === "attended" || soldierState?.status === "absent";
                    // Only show drivers from the Control Table that were in the unit
                    // on the event date — OR any soldier that already has a saved
                    // attendance record (preserves history for released/deleted soldiers).
                    const isEligible =
                      soldier.is_active && wasSoldierInUnitOnDate(soldier, selectedEvent.event_date);
                    if (!isEligible && !hasAttendanceRecord) return false;

                    if (attendanceRotationFilter === "expected") {
                      return expectedSoldiers.includes(soldier.id) || hasAttendanceRecord;
                    }
                    if (attendanceRotationFilter === "all") return true;
                    return soldier.rotation_group === attendanceRotationFilter || hasAttendanceRecord;
                  })
                  .map(soldier => {
                  const soldierData = selectedSoldierAttendance[soldier.id] || { status: "not_updated" as AttendanceStatus, reason: "", completed: false };
                  const isExpected = selectedEvent?.expected_soldiers?.includes(soldier.id);
                  const rotationLabel = ROTATION_GROUPS.find(r => r.value === soldier.rotation_group)?.label;

                  return (
                    <div
                      key={soldier.id}
                      className={`p-3 rounded-xl border transition-all ${
                        isExpected ? "bg-white border-slate-300" : "bg-slate-50 border-slate-200"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {isExpected && <Badge className="bg-blue-100 text-blue-700 text-xs">מצופה</Badge>}
                          {rotationLabel && <Badge className="bg-violet-100 text-violet-700 text-[10px] px-1.5 py-0">{rotationLabel}</Badge>}
                          <div>
                            <p className="font-medium text-slate-800">{soldier.full_name}</p>
                            <p className="text-xs text-slate-500">{soldier.personal_number}</p>
                          </div>
                        </div>
                        <Badge className={`${attendanceStatusColors[soldierData.status]} text-white gap-1`}>
                          {attendanceStatusIcons[soldierData.status]}
                          {attendanceStatusLabels[soldierData.status]}
                        </Badge>
                      </div>

                      {/* Status Selection */}
                      <div className="grid grid-cols-4 gap-1">
                        {(["attended", "absent", "not_in_rotation", "not_updated"] as AttendanceStatus[]).map(status => (
                          <button
                            key={status}
                            onClick={() => {
                              setSelectedSoldierAttendance(prev => ({
                                ...prev,
                                [soldier.id]: {
                                  ...prev[soldier.id],
                                  status,
                                  reason: status === "attended" || status === "not_in_rotation" ? "" : prev[soldier.id]?.reason || "",
                                  completed: status === "absent" ? prev[soldier.id]?.completed || false : false
                                }
                              }));
                            }}
                            className={`p-1.5 rounded-lg text-xs transition-all ${
                              soldierData.status === status
                                ? `${attendanceStatusColors[status]} text-white`
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            }`}
                          >
                            {attendanceStatusLabels[status]}
                          </button>
                        ))}
                      </div>

                      {/* Absence Reason & Completion */}
                      {soldierData.status === "absent" && (
                        <div className="mt-2 space-y-2">
                          <Select
                            value={soldierData.reason}
                            onValueChange={(v) => {
                              setSelectedSoldierAttendance(prev => ({
                                ...prev,
                                [soldier.id]: { ...prev[soldier.id], reason: v }
                              }));
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="בחר סיבת היעדרות..." />
                            </SelectTrigger>
                            <SelectContent>
                              {absenceReasonOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          <div className="flex items-center gap-3 p-2 rounded-xl bg-emerald-50 border border-emerald-200">
                            <Checkbox
                              id={`completed-${soldier.id}`}
                              checked={soldierData.completed}
                              onCheckedChange={(checked) => {
                                setSelectedSoldierAttendance(prev => ({
                                  ...prev,
                                  [soldier.id]: { ...prev[soldier.id], completed: !!checked }
                                }));
                              }}
                            />
                            <Label htmlFor={`completed-${soldier.id}`} className="cursor-pointer text-sm">
                              <span className="font-bold text-emerald-700">השלים את המופע</span>
                              <p className="text-xs text-emerald-600">החייל ביצע השלמה ויחשב כנכח</p>
                            </Label>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setAttendanceDialogOpen(false)}>ביטול</Button>
              <Button onClick={saveAttendance} className="bg-primary">שמור נוכחות</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}