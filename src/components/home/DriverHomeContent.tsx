import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useDriverCleaningTasks, CleaningTask } from "@/hooks/useDriverCleaningTasks";
import { useNavigate } from "react-router-dom";
import { format, startOfWeek, addDays } from "date-fns";
import { he } from "date-fns/locale";
import {
  Sparkles,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  Calendar,
  MapPin,
  Loader2,
  Sun,
  Sunset,
  Moon,
  Plane,
  FileText,
  AlertTriangle
} from "lucide-react";
import { cn } from "@/lib/utils";

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

interface ShiftFormStatus {
  hasTodayReport: boolean;
  lastReportDate: string | null;
}

interface TripFormStatus {
  hasThisWeekBriefing: boolean;
  lastBriefingDate: string | null;
}

export function DriverHomeContent() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [soldierId, setSoldierId] = useState<string | null>(null);
  const [soldierOutpost, setSoldierOutpost] = useState<string | null>(null);
  const [shiftFormStatus, setShiftFormStatus] = useState<ShiftFormStatus>({
    hasTodayReport: false,
    lastReportDate: null
  });
  const [tripFormStatus, setTripFormStatus] = useState<TripFormStatus>({
    hasThisWeekBriefing: false,
    lastBriefingDate: null
  });

  const { tasks: cleaningTasks, loading: tasksLoading } = useDriverCleaningTasks(soldierId, soldierOutpost);
  
  const today = new Date();
  const dayOfWeek = today.getDay();
  const isSundayOrMonday = dayOfWeek === 0 || dayOfWeek === 1;

  useEffect(() => {
    if (user) {
      loadAllData();
    }
  }, [user]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      // Get soldier info
      const { data: profile } = await supabase
        .from("profiles")
        .select("personal_number, outpost")
        .eq("user_id", user?.id)
        .maybeSingle();

      if (!profile?.personal_number) {
        setLoading(false);
        return;
      }

      const { data: soldier } = await supabase
        .from("soldiers")
        .select("id, outpost")
        .eq("personal_number", profile.personal_number)
        .maybeSingle();

      if (soldier) {
        setSoldierId(soldier.id);
        setSoldierOutpost(soldier.outpost || profile.outpost);
      }

      // Load shift form status
      const todayStr = format(today, "yyyy-MM-dd");
      const [todayReportResult, lastReportResult] = await Promise.all([
        supabase
          .from("shift_reports")
          .select("id")
          .eq("user_id", user?.id)
          .eq("report_date", todayStr)
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

      // Load trip form status
      const currentWeekStart = startOfWeek(today, { weekStartsOn: 0 });
      const weekStartStr = format(currentWeekStart, 'yyyy-MM-dd');
      const weekEndStr = format(addDays(currentWeekStart, 6), 'yyyy-MM-dd');

      const [thisWeekForms, lastTripForm] = await Promise.all([
        supabase
          .from('trip_forms')
          .select('form_date')
          .eq('user_id', user?.id)
          .gte('form_date', weekStartStr)
          .lte('form_date', weekEndStr)
          .limit(1),
        supabase
          .from('trip_forms')
          .select('form_date')
          .eq('user_id', user?.id)
          .order('form_date', { ascending: false })
          .limit(1)
      ]);

      setTripFormStatus({
        hasThisWeekBriefing: (thisWeekForms.data?.length || 0) > 0,
        lastBriefingDate: lastTripForm.data?.[0]?.form_date || null
      });

    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const isFullyLoading = loading || tasksLoading;

  if (isFullyLoading) {
    return (
      <div className="px-4 py-6 space-y-4">
        <Card className="border-primary/20 bg-white/80">
          <CardContent className="p-8 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Group tasks by parade day
  const groupedTasks = groupTasksByDay(cleaningTasks);
  const pendingTasks = cleaningTasks.filter(t => !t.isPast && !t.isCompleted);
  const todayTasks = cleaningTasks.filter(t => t.isToday && !t.isCompleted);

  const handleGoToParade = (paradeDay: number, outpost: string) => {
    // Navigate to cleaning parades with the specific day and outpost
    navigate(`/cleaning-parades?paradeDay=${paradeDay}&outpost=${encodeURIComponent(outpost)}`);
  };

  return (
    <div className="px-4 -mt-8 relative z-20 space-y-4 pb-6">
      
      {/* Section 1: Cleaning Parades - מסדרי ניקיון */}
      {cleaningTasks.length > 0 && (
        <Card className="border-2 border-primary/30 shadow-xl bg-gradient-to-br from-white via-white to-primary/5 overflow-hidden">
          <CardHeader className="pb-3 border-b border-primary/10 bg-primary/5">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
                  <Sparkles className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <span className="font-black text-lg text-slate-800">מסדרי ניקיון השבוע</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
                      {pendingTasks.length} ממתינים
                    </Badge>
                    {todayTasks.length > 0 && (
                      <Badge className="text-[10px] bg-primary animate-pulse">
                        {todayTasks.length} להיום!
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 space-y-3">
            {groupedTasks.map((group) => (
              <ParadeDayCard 
                key={group.groupKey} 
                group={group} 
                onGoToParade={handleGoToParade}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Empty state for cleaning tasks */}
      {cleaningTasks.length === 0 && soldierId && (
        <Card className="border-slate-200 bg-slate-50/50">
          <CardContent className="p-6 text-center">
            <Sparkles className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p className="text-slate-500 font-medium">אין מסדרי ניקיון משובצים השבוע</p>
          </CardContent>
        </Card>
      )}

      {/* Section 2: Trip Briefing - תדריך יציאה (only Sunday/Monday) */}
      {isSundayOrMonday && (
        <Card className={cn(
          "border-2 overflow-hidden transition-all",
          !tripFormStatus.hasThisWeekBriefing 
            ? "border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50 shadow-lg" 
            : "border-emerald-200 bg-gradient-to-br from-emerald-50 to-green-50"
        )}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center shadow-lg",
                  !tripFormStatus.hasThisWeekBriefing 
                    ? "bg-gradient-to-br from-amber-500 to-orange-500" 
                    : "bg-gradient-to-br from-emerald-500 to-green-500"
                )}>
                  {tripFormStatus.hasThisWeekBriefing ? (
                    <CheckCircle2 className="w-6 h-6 text-white" />
                  ) : (
                    <Plane className="w-6 h-6 text-white" />
                  )}
                </div>
                <div>
                  <p className="font-bold text-slate-800">תדריך יציאה לבית</p>
                  <p className="text-xs text-slate-500">
                    {tripFormStatus.hasThisWeekBriefing 
                      ? "הושלם השבוע ✓" 
                      : tripFormStatus.lastBriefingDate
                        ? `אחרון: ${format(new Date(tripFormStatus.lastBriefingDate), "dd/MM", { locale: he })}`
                        : "טרם הוגש"
                    }
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {!tripFormStatus.hasThisWeekBriefing && (
                  <Badge className="bg-amber-500 text-white animate-pulse">
                    נדרש!
                  </Badge>
                )}
                {tripFormStatus.hasThisWeekBriefing ? (
                  <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-200">
                    הושלם
                  </Badge>
                ) : (
                  <Button 
                    size="sm" 
                    className="gap-1 font-bold bg-amber-500 hover:bg-amber-600"
                    onClick={() => navigate('/trip-form')}
                  >
                    מלא עכשיו
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Section 3: Shift Form - טופס לפני משמרת */}
      <Card className={cn(
        "border-2 overflow-hidden transition-all",
        !shiftFormStatus.hasTodayReport 
          ? "border-primary/40 bg-gradient-to-br from-white to-primary/5 shadow-lg" 
          : "border-emerald-200 bg-gradient-to-br from-emerald-50 to-green-50"
      )}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center shadow-lg",
                !shiftFormStatus.hasTodayReport 
                  ? "bg-gradient-to-br from-primary to-accent" 
                  : "bg-gradient-to-br from-emerald-500 to-green-500"
              )}>
                {shiftFormStatus.hasTodayReport ? (
                  <CheckCircle2 className="w-6 h-6 text-white" />
                ) : (
                  <FileText className="w-6 h-6 text-white" />
                )}
              </div>
              <div>
                <p className="font-bold text-slate-800">טופס לפני משמרת</p>
                <p className="text-xs text-slate-500">
                  {shiftFormStatus.hasTodayReport 
                    ? "הוגש היום ✓" 
                    : shiftFormStatus.lastReportDate
                      ? `אחרון: ${format(new Date(shiftFormStatus.lastReportDate), "dd/MM", { locale: he })}`
                      : "טרם הוגש"
                  }
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {shiftFormStatus.hasTodayReport ? (
                <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-200">
                  הושלם
                </Badge>
              ) : (
                <Button 
                  size="sm" 
                  className="gap-1 font-bold"
                  onClick={() => navigate('/shift-form')}
                >
                  מלא עכשיו
                  <ChevronLeft className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Group tasks by parade day
interface TaskGroup {
  groupKey: string;
  outpost: string;
  paradeDay: number;
  date: Date;
  isToday: boolean;
  isPast: boolean;
  allCompleted: boolean;
  items: CleaningTask[];
}

function groupTasksByDay(tasks: CleaningTask[]): TaskGroup[] {
  const groupMap = new Map<string, TaskGroup>();

  for (const task of tasks) {
    const key = `${task.outpost}-${task.paradeDay}`;
    
    if (!groupMap.has(key)) {
      groupMap.set(key, {
        groupKey: key,
        outpost: task.outpost,
        paradeDay: task.paradeDay,
        date: task.date,
        isToday: task.isToday,
        isPast: task.isPast,
        allCompleted: task.isCompleted,
        items: [task]
      });
    } else {
      const group = groupMap.get(key)!;
      group.items.push(task);
      group.allCompleted = group.allCompleted && task.isCompleted;
    }
  }

  return Array.from(groupMap.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
}

interface ParadeDayCardProps {
  group: TaskGroup;
  onGoToParade: (paradeDay: number, outpost: string) => void;
}

function ParadeDayCard({ group, onGoToParade }: ParadeDayCardProps) {
  const dayLabel = DAY_LABELS[group.paradeDay] || String(group.paradeDay);
  const pendingCount = group.items.filter(i => !i.isCompleted).length;

  // Determine if the parade can be filled (only on the day itself or past)
  const canFillParade = group.isToday || group.isPast;

  return (
    <div 
      className={cn(
        "rounded-xl border-2 overflow-hidden transition-all",
        canFillParade ? "cursor-pointer hover:scale-[1.01]" : "",
        group.isToday
          ? "border-primary/50 bg-gradient-to-br from-white to-primary/10 shadow-lg"
          : group.isPast
            ? "border-red-200 bg-red-50/50"
            : group.allCompleted
              ? "border-emerald-200 bg-emerald-50/50"
              : "border-slate-200 bg-white"
      )}
      onClick={() => canFillParade && onGoToParade(group.paradeDay, group.outpost)}
    >
      {/* Header */}
      <div className={cn(
        "px-4 py-3 flex items-center justify-between",
        group.isToday ? "bg-primary/10" : "bg-slate-50/70"
      )}>
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-11 h-11 rounded-xl flex items-center justify-center shadow-md",
            group.isToday ? "bg-primary text-primary-foreground" :
            group.allCompleted ? "bg-emerald-500 text-white" :
            group.isPast ? "bg-red-500 text-white" :
            "bg-slate-200 text-slate-600"
          )}>
            {group.allCompleted 
              ? <CheckCircle2 className="w-5 h-5" />
              : group.isPast
                ? <AlertCircle className="w-5 h-5" />
                : <Calendar className="w-5 h-5" />
            }
          </div>
          <div>
            <p className="font-black text-slate-800">יום {dayLabel}</p>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <MapPin className="w-3 h-3" />
              <span>{group.outpost}</span>
              <span>•</span>
              <span>{format(group.date, "dd/MM", { locale: he })}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {group.isToday && !group.allCompleted && (
            <Badge className="bg-primary animate-pulse font-bold">היום!</Badge>
          )}
          {group.isPast && !group.allCompleted && (
            <Badge variant="destructive" className="font-bold">פג תוקף</Badge>
          )}
          {!group.isToday && !group.isPast && !group.allCompleted && (
            <Badge variant="outline" className="font-medium text-slate-500">
              {format(group.date, "EEEE", { locale: he })}
            </Badge>
          )}
          {group.allCompleted && (
            <Badge className="bg-emerald-500 font-bold">הושלם ✓</Badge>
          )}
        </div>
      </div>

      {/* Items List */}
      <div className="px-4 py-3 space-y-2">
        {group.items.slice(0, 3).map((item, idx) => (
          <div 
            key={item.itemId}
            className={cn(
              "flex items-center gap-2 text-sm",
              item.isCompleted ? "text-slate-400 line-through" : "text-slate-700"
            )}
          >
            <span className={cn(
              "w-5 h-5 rounded flex items-center justify-center text-xs shrink-0",
              item.isCompleted ? "bg-emerald-100 text-emerald-600" : "bg-primary/10 text-primary"
            )}>
              {item.isCompleted ? <CheckCircle2 className="w-3 h-3" /> : idx + 1}
            </span>
            <span className="truncate">{item.itemName}</span>
          </div>
        ))}
        {group.items.length > 3 && (
          <p className="text-xs text-slate-400 pr-7">
            +{group.items.length - 3} משימות נוספות
          </p>
        )}
      </div>

      {/* Action Footer - Only show for today or past (can fill) */}
      {group.isToday && !group.allCompleted && (
        <div className="px-4 pb-3">
          <Button 
            size="sm" 
            className="w-full gap-2 font-bold bg-primary hover:bg-primary/90"
          >
            <Sparkles className="w-4 h-4" />
            {pendingCount > 0 ? `בצע ${pendingCount} משימות` : "בצע מסדר"}
            <ChevronLeft className="w-4 h-4" />
          </Button>
        </div>
      )}
      
      {/* Future parade - info only */}
      {!group.isToday && !group.isPast && !group.allCompleted && (
        <div className="px-4 pb-3">
          <div className="text-center py-2 bg-slate-50 rounded-lg border border-dashed border-slate-200">
            <p className="text-xs text-slate-500">
              ניתן למלא ביום {DAY_LABELS[group.paradeDay]}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}