import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format, startOfWeek, addDays } from "date-fns";
import { he } from "date-fns/locale";
import { Sparkles, CheckCircle, Clock, AlertCircle, ChevronLeft, Calendar, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface Assignment {
  dayValue: string;
  dayLabel: string;
  date: Date;
  outpost: string | null;
  isCompleted: boolean;
  isToday: boolean;
  isPast: boolean;
}

const DAY_CONFIG = [
  { value: "monday", label: "יום ב'", dayOfWeek: 1, sourceDay: 0, sourceShift: "afternoon" },
  { value: "wednesday", label: "יום ד'", dayOfWeek: 3, sourceDay: 2, sourceShift: "afternoon" },
  { value: "saturday_night", label: "מוצ\"ש", dayOfWeek: 6, sourceDay: 6, sourceShift: "morning" },
];

export function MyCleaningParadesCard() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [soldierId, setSoldierId] = useState<string | null>(null);

  const currentWeekStart = startOfWeek(new Date(), { weekStartsOn: 0 });
  const weekStartStr = format(currentWeekStart, 'yyyy-MM-dd');

  useEffect(() => {
    if (user) {
      loadMyAssignments();
    }
  }, [user]);

  const loadMyAssignments = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Get soldier ID from profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('personal_number')
        .eq('user_id', user.id)
        .maybeSingle();

      const personalNumber = profile?.personal_number ?? user.user_metadata?.personal_number;
      
      if (!personalNumber) {
        setLoading(false);
        return;
      }

      const { data: soldier } = await supabase
        .from('soldiers')
        .select('id')
        .eq('personal_number', personalNumber)
        .maybeSingle();

      if (!soldier) {
        setLoading(false);
        return;
      }

      setSoldierId(soldier.id);

      // Get work schedule for this week
      const { data: workSchedule } = await supabase
        .from('work_schedule')
        .select('outpost, day_of_week, afternoon_soldier_id, morning_soldier_id')
        .eq('week_start_date', weekStartStr);

      // Get manual assignments
      const { data: manualAssignments } = await supabase
        .from('cleaning_manual_assignments')
        .select('outpost, day_of_week')
        .eq('soldier_id', soldier.id)
        .eq('week_start_date', weekStartStr);

      // Get completed submissions
      const { data: submissions } = await supabase
        .from('cleaning_parade_submissions')
        .select('day_of_week, outpost, is_completed')
        .eq('soldier_id', soldier.id)
        .gte('parade_date', weekStartStr);

      const today = new Date();
      const todayDayOfWeek = today.getDay();

      const myAssignments: Assignment[] = [];

      for (const dayConfig of DAY_CONFIG) {
        const date = addDays(currentWeekStart, dayConfig.dayOfWeek);
        let outpost: string | null = null;

        // Check manual assignment first
        const manual = manualAssignments?.find(m => m.day_of_week === dayConfig.value);
        if (manual) {
          outpost = manual.outpost;
        } else {
          // Check work schedule
          const scheduleEntries = workSchedule?.filter(ws => ws.day_of_week === dayConfig.sourceDay) || [];
          for (const entry of scheduleEntries) {
            const assignedSoldierId = dayConfig.sourceShift === "afternoon" 
              ? entry.afternoon_soldier_id 
              : entry.morning_soldier_id;
            if (assignedSoldierId === soldier.id) {
              outpost = entry.outpost;
              break;
            }
          }
        }

        if (outpost) {
          const submission = submissions?.find(s => 
            s.day_of_week === dayConfig.value && s.outpost === outpost
          );

          myAssignments.push({
            dayValue: dayConfig.value,
            dayLabel: dayConfig.label,
            date,
            outpost,
            isCompleted: submission?.is_completed || false,
            isToday: dayConfig.dayOfWeek === todayDayOfWeek,
            isPast: dayConfig.dayOfWeek < todayDayOfWeek,
          });
        }
      }

      setAssignments(myAssignments);
    } catch (error) {
      console.error('Error loading assignments:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="border-purple-200/60 shadow-lg bg-gradient-to-br from-white to-purple-50/30">
        <CardContent className="p-6">
          <div className="flex items-center justify-center gap-2 text-purple-500">
            <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">טוען מסדרים...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Don't show if user is not linked to a soldier or has no assignments
  if (!soldierId || assignments.length === 0) {
    return null;
  }

  const pendingCount = assignments.filter(a => !a.isCompleted && !a.isPast).length;
  const completedCount = assignments.filter(a => a.isCompleted).length;

  return (
    <Card className="border-purple-200/60 shadow-lg bg-gradient-to-br from-white to-purple-50/30 overflow-hidden">
      {/* Header */}
      <CardHeader className="pb-3 relative">
        <div className="absolute top-0 left-0 w-32 h-32 bg-purple-400/10 rounded-full blur-3xl" />
        <div className="relative flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-slate-800">המסדרים שלי</span>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-purple-200 text-purple-600">
                  {completedCount}/{assignments.length} הושלמו
                </Badge>
              </div>
            </div>
          </CardTitle>
          <Link to="/cleaning-parades">
            <Button variant="ghost" size="sm" className="gap-1 text-purple-600 hover:text-purple-700 hover:bg-purple-50">
              צפה בהכל
              <ChevronLeft className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </CardHeader>

      {/* Weekly Grid */}
      <CardContent className="p-4 pt-0">
        <div className="grid grid-cols-3 gap-2">
          {assignments.map((assignment) => (
            <Link
              key={assignment.dayValue}
              to={`/cleaning-parades?day=${assignment.dayValue}&outpost=${encodeURIComponent(assignment.outpost || '')}`}
              className={cn(
                "relative p-3 rounded-xl border transition-all duration-300",
                assignment.isCompleted 
                  ? "bg-emerald-50 border-emerald-200"
                  : assignment.isToday
                    ? "bg-purple-50 border-purple-300 shadow-md"
                    : assignment.isPast
                      ? "bg-slate-50 border-slate-200 opacity-60"
                      : "bg-white border-slate-200 hover:border-purple-200 hover:shadow-md"
              )}
            >
              {/* Status Icon */}
              <div className="absolute -top-1.5 -left-1.5">
                {assignment.isCompleted ? (
                  <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center shadow">
                    <CheckCircle className="w-4 h-4 text-white" />
                  </div>
                ) : assignment.isToday ? (
                  <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center shadow animate-pulse">
                    <Clock className="w-4 h-4 text-white" />
                  </div>
                ) : assignment.isPast ? (
                  <div className="w-6 h-6 rounded-full bg-red-400 flex items-center justify-center shadow">
                    <AlertCircle className="w-4 h-4 text-white" />
                  </div>
                ) : null}
              </div>

              {/* Day Info */}
              <div className="text-center">
                <p className={cn(
                  "text-sm font-bold",
                  assignment.isCompleted ? "text-emerald-700" : 
                  assignment.isToday ? "text-purple-700" : "text-slate-700"
                )}>
                  {assignment.dayLabel}
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {format(assignment.date, 'd/M', { locale: he })}
                </p>
              </div>

              {/* Outpost */}
              <div className={cn(
                "mt-2 px-2 py-1 rounded-lg text-center",
                assignment.isCompleted ? "bg-emerald-100" : "bg-slate-100"
              )}>
                <div className="flex items-center justify-center gap-1">
                  <MapPin className="w-3 h-3 text-slate-400" />
                  <span className="text-[10px] font-medium text-slate-600 truncate">
                    {assignment.outpost}
                  </span>
                </div>
              </div>

              {/* Action hint for today */}
              {assignment.isToday && !assignment.isCompleted && (
                <div className="mt-2 text-center">
                  <span className="text-[10px] font-bold text-purple-600 animate-pulse">
                    לחץ לביצוע ←
                  </span>
                </div>
              )}
            </Link>
          ))}
        </div>

        {/* Summary Message */}
        {pendingCount > 0 && (
          <div className="mt-4 p-3 rounded-xl bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-100">
            <p className="text-sm text-center text-purple-700 font-medium">
              יש לך {pendingCount} {pendingCount === 1 ? 'מסדר' : 'מסדרים'} ממתינים השבוע
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}