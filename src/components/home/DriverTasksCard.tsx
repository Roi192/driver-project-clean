import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useDriverCleaningTasks, CleaningTask } from "@/hooks/useDriverCleaningTasks";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import {
  FileText,
  Sparkles,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  Calendar,
  MapPin,
  Loader2,
  ListChecks,
  Sun,
  Sunset,
  Moon,
  Folder
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ShiftFormStatus {
  hasTodayReport: boolean;
  lastReportDate: string | null;
}

const SHIFT_LABELS: Record<string, { label: string; icon: typeof Sun; color: string }> = {
  morning: { label: "בוקר", icon: Sun, color: "text-amber-500" },
  afternoon: { label: "צהריים", icon: Sunset, color: "text-orange-500" },
  evening: { label: "ערב", icon: Moon, color: "text-emerald-500" }
};

const DAY_LABELS: Record<number, string> = {
  0: "ראשון",
  1: "שני",
  2: "שלישי",
  3: "רביעי",
  4: "חמישי",
  5: "שישי",
  6: "שבת"
};

export function DriverTasksCard() {
  const { user } = useAuth();
  const [initialLoading, setInitialLoading] = useState(true);
  const [soldierId, setSoldierId] = useState<string | null>(null);
  const [soldierOutpost, setSoldierOutpost] = useState<string | null>(null);
  const [shiftFormStatus, setShiftFormStatus] = useState<ShiftFormStatus>({
    hasTodayReport: false,
    lastReportDate: null
  });

  const { tasks: cleaningTasks, loading: tasksLoading } = useDriverCleaningTasks(soldierId, soldierOutpost);

  useEffect(() => {
    if (user) {
      loadInitialData();
    }
  }, [user]);

  const loadInitialData = async () => {
    setInitialLoading(true);
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("personal_number, outpost")
        .eq("user_id", user?.id)
        .maybeSingle();

      if (!profile?.personal_number) {
        setInitialLoading(false);
        return;
      }

      const { data: soldier } = await supabase
        .from("soldiers")
        .select("id, outpost")
        .eq("personal_number", profile.personal_number)
        .maybeSingle();

      if (!soldier) {
        setInitialLoading(false);
        return;
      }

      setSoldierId(soldier.id);
      setSoldierOutpost(soldier.outpost || profile.outpost);

      await loadShiftFormStatus();
    } catch (error) {
      console.error("Error loading initial data:", error);
    } finally {
      setInitialLoading(false);
    }
  };

  const loadShiftFormStatus = async () => {
    const today = format(new Date(), "yyyy-MM-dd");
    
    const [todayReportResult, lastReportResult] = await Promise.all([
      supabase
        .from("shift_reports")
        .select("id")
        .eq("user_id", user?.id)
        .eq("report_date", today)
        .limit(1),
      supabase
        .from("shift_reports")
        .select("report_date")
        .eq("user_id", user?.id)
        .order("report_date", { ascending: false })
        .limit(1)
    ]);

    setShiftFormStatus({
      hasTodayReport: (todayReportResult.data?.length || 0) > 0,
      lastReportDate: lastReportResult.data?.[0]?.report_date || null
    });
  };

  const loading = initialLoading || tasksLoading;

  if (loading) {
    return (
      <Card className="border-slate-200/60 shadow-lg mb-6 bg-gradient-to-br from-white to-primary/5">
        <CardContent className="p-8 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const pendingTasks = cleaningTasks.filter(t => !t.isPast && !t.isCompleted);
  const todayTasks = cleaningTasks.filter(t => t.isToday && !t.isCompleted);
  const groupedTasks = groupTasksByArea(cleaningTasks);
  const needsAttention = todayTasks.length > 0 || !shiftFormStatus.hasTodayReport;

  return (
    <Card className="border-2 border-primary/20 shadow-xl mb-6 bg-gradient-to-br from-white via-white to-primary/5 overflow-hidden">
      <CardHeader className="pb-3 border-b border-slate-100">
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <Calendar className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-black">המשימות שלי השבוע</span>
          {needsAttention && (
            <Badge variant="destructive" className="mr-auto animate-pulse">
              דורש טיפול
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        <ShiftFormStatusCard status={shiftFormStatus} />

        {groupedTasks.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-3">
              <ListChecks className="w-4 h-4 text-purple-500" />
              <span className="font-bold text-sm text-slate-700">משימות ניקיון</span>
              <Badge variant="outline" className="text-xs border-primary/30">
                {pendingTasks.length} ממתינים
              </Badge>
            </div>

            {groupedTasks.map((group) => (
              <TaskGroupCard key={group.groupKey} group={group} />
            ))}
          </div>
        )}

        {cleaningTasks.length === 0 && shiftFormStatus.hasTodayReport && (
          <div className="text-center py-6 text-slate-500">
            <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-500" />
            <p className="font-bold text-lg">אין משימות ממתינות 🎉</p>
            <p className="text-sm text-slate-400">עבודה טובה!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ShiftFormStatusCard({ status }: { status: ShiftFormStatus }) {
  return (
    <div className={cn(
      "p-4 rounded-xl border-2 transition-all",
      status.hasTodayReport 
        ? "bg-emerald-50 border-emerald-200" 
        : "bg-amber-50 border-amber-300"
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center",
            status.hasTodayReport 
              ? "bg-emerald-100 text-emerald-600" 
              : "bg-amber-100 text-amber-600"
          )}>
            {status.hasTodayReport 
              ? <CheckCircle2 className="w-5 h-5" />
              : <FileText className="w-5 h-5" />
            }
          </div>
          <div>
            <p className="font-bold text-slate-800">טופס לפני משמרת</p>
            <p className="text-xs text-slate-500">
              {status.hasTodayReport 
                ? "הטופס הוגש היום ✓"
                : status.lastReportDate 
                  ? `דיווח אחרון: ${format(new Date(status.lastReportDate), "dd/MM")}`
                  : "טרם הוגש טופס"
              }
            </p>
          </div>
        </div>
        {!status.hasTodayReport && (
          <Link to="/shift-form">
            <Button size="sm" className="gap-1 font-bold">
              מלא עכשיו
              <ChevronLeft className="w-4 h-4" />
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}

interface TaskGroup {
  groupKey: string;
  outpost: string;
  paradeDay: number;
  shiftType: string;
  date: Date;
  isToday: boolean;
  isPast: boolean;
  hasCompleted: boolean;
  allCompleted: boolean;
  items: CleaningTask[];
}

function groupTasksByArea(tasks: CleaningTask[]): TaskGroup[] {
  const groupMap = new Map<string, TaskGroup>();

  for (const task of tasks) {
    const key = `${task.outpost}-${task.paradeDay}-${task.shiftType}`;
    
    if (!groupMap.has(key)) {
      groupMap.set(key, {
        groupKey: key,
        outpost: task.outpost,
        paradeDay: task.paradeDay,
        shiftType: task.shiftType,
        date: task.date,
        isToday: task.isToday,
        isPast: task.isPast,
        hasCompleted: task.isCompleted,
        allCompleted: task.isCompleted,
        items: [task]
      });
    } else {
      const group = groupMap.get(key)!;
      group.items.push(task);
      group.hasCompleted = group.hasCompleted || task.isCompleted;
      group.allCompleted = group.allCompleted && task.isCompleted;
    }
  }

  return Array.from(groupMap.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
}

function TaskGroupCard({ group }: { group: TaskGroup }) {
  const shiftConfig = SHIFT_LABELS[group.shiftType];
  const ShiftIcon = shiftConfig?.icon || Calendar;
  const dayLabel = DAY_LABELS[group.paradeDay] || String(group.paradeDay);
  const pendingCount = group.items.filter(i => !i.isCompleted).length;

  return (
    <div className={cn(
      "rounded-xl border-2 overflow-hidden transition-all",
      group.isToday
        ? "border-primary/40 bg-gradient-to-br from-white to-primary/5 shadow-lg"
        : group.isPast
          ? "border-red-200 bg-red-50/30"
          : group.allCompleted
            ? "border-emerald-200 bg-emerald-50/30"
            : "border-slate-200 bg-white"
    )}>
      <div className={cn(
        "px-4 py-3 flex items-center justify-between border-b",
        group.isToday ? "bg-primary/5 border-primary/20" : "bg-slate-50/50 border-slate-100"
      )}>
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center",
            group.isToday ? "bg-primary text-primary-foreground" :
            group.allCompleted ? "bg-emerald-100 text-emerald-600" :
            group.isPast ? "bg-red-100 text-red-600" :
            "bg-slate-100 text-slate-600"
          )}>
            {group.allCompleted 
              ? <CheckCircle2 className="w-5 h-5" />
              : group.isPast
                ? <AlertCircle className="w-5 h-5" />
                : <Folder className="w-5 h-5" />
            }
          </div>
          <div>
            <p className="font-bold text-slate-800">יום {dayLabel} - {shiftConfig?.label || group.shiftType}</p>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <MapPin className="w-3 h-3" />
              <span>{group.outpost}</span>
              <span>•</span>
              <span>יום {dayLabel}</span>
              {shiftConfig && (
                <>
                  <span>•</span>
                  <ShiftIcon className={cn("w-3 h-3", shiftConfig.color)} />
                  <span className={shiftConfig.color}>{shiftConfig.label}</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {group.isToday && (
            <Badge className="bg-primary/90 text-xs font-bold">היום</Badge>
          )}
          {group.isPast && !group.allCompleted && (
            <Badge variant="destructive" className="text-xs">פג תוקף</Badge>
          )}
          {group.allCompleted && (
            <Badge className="bg-emerald-500 text-xs">הושלם ✓</Badge>
          )}
        </div>
      </div>

      <div className="p-3 space-y-2">
        {group.items.map((item, index) => (
          <div 
            key={item.itemId}
            className={cn(
              "flex items-center gap-3 p-2 rounded-lg transition-all",
              item.isCompleted ? "bg-emerald-50 opacity-75" : "bg-slate-50"
            )}
          >
            <span className={cn(
              "w-6 h-6 flex items-center justify-center rounded text-xs font-bold shrink-0",
              item.isCompleted 
                ? "bg-emerald-100 text-emerald-600" 
                : "bg-primary/10 text-primary"
            )}>
              {item.isCompleted ? <CheckCircle2 className="w-4 h-4" /> : index + 1}
            </span>
            <span className={cn(
              "flex-1 text-sm",
              item.isCompleted ? "line-through text-slate-400" : "text-slate-700"
            )}>
              {item.itemName}
            </span>
            {item.deadlineTime && !item.isCompleted && (
              <div className="flex items-center gap-1 text-xs text-slate-400">
                <Clock className="w-3 h-3" />
                <span>{item.deadlineTime.slice(0, 5)}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {!group.isPast && !group.allCompleted && (
        <div className="px-3 pb-3">
          <Link to="/cleaning-parades">
            <Button 
              size="sm" 
              className={cn(
                "w-full gap-2 font-bold",
                group.isToday && "bg-primary hover:bg-primary/90"
              )}
              variant={group.isToday ? "default" : "outline"}
            >
              <Sparkles className="w-4 h-4" />
              {pendingCount > 0 ? `בצע ${pendingCount} משימות` : "בצע משימות"}
              <ChevronLeft className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}