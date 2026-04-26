import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format, startOfWeek, addDays, isSameDay, isAfter } from "date-fns";
import { he } from "date-fns/locale";
import { Link } from "react-router-dom";
import { Plane, CheckCircle2, AlertTriangle, ChevronLeft, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

export function TripBriefingCard() {
  const { user } = useAuth();
  const [hasThisWeekBriefing, setHasThisWeekBriefing] = useState(false);
  const [lastBriefingDate, setLastBriefingDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [nextBriefingDay, setNextBriefingDay] = useState<Date | null>(null);

  const today = new Date();
  const currentWeekStart = startOfWeek(today, { weekStartsOn: 0 });
  const sunday = currentWeekStart;
  const monday = addDays(currentWeekStart, 1);

  // Determine which day to show based on current day
  const dayOfWeek = today.getDay();
  const isSundayOrMonday = dayOfWeek === 0 || dayOfWeek === 1;

  useEffect(() => {
    if (user) {
      checkBriefingStatus();
    }
  }, [user]);

  const checkBriefingStatus = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const weekStartStr = format(currentWeekStart, 'yyyy-MM-dd');
      const weekEndStr = format(addDays(currentWeekStart, 6), 'yyyy-MM-dd');

      // Check if user has a trip form this week
      const { data: thisWeekForms } = await supabase
        .from('trip_forms')
        .select('form_date')
        .eq('user_id', user.id)
        .gte('form_date', weekStartStr)
        .lte('form_date', weekEndStr)
        .order('form_date', { ascending: false })
        .limit(1);

      // Get last briefing date
      const { data: lastForm } = await supabase
        .from('trip_forms')
        .select('form_date')
        .eq('user_id', user.id)
        .order('form_date', { ascending: false })
        .limit(1);

      setHasThisWeekBriefing((thisWeekForms?.length || 0) > 0);
      setLastBriefingDate(lastForm?.[0]?.form_date || null);

      // Determine next briefing day
      if (dayOfWeek === 0) {
        setNextBriefingDay(sunday);
      } else if (dayOfWeek === 1) {
        setNextBriefingDay(monday);
      } else {
        // After Monday, show next week's Sunday
        setNextBriefingDay(addDays(currentWeekStart, 7));
      }
    } catch (error) {
      console.error('Error checking briefing status:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return null;
  }

  // Don't show if briefing already completed this week
  if (hasThisWeekBriefing && !isSundayOrMonday) {
    return null;
  }

  const isUrgent = isSundayOrMonday && !hasThisWeekBriefing;

  return (
    <Card className={cn(
      "border-2 overflow-hidden transition-all",
      isUrgent 
        ? "border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50 shadow-lg" 
        : hasThisWeekBriefing
          ? "border-emerald-200 bg-gradient-to-br from-emerald-50 to-green-50"
          : "border-slate-200 bg-white"
    )}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center shadow-lg",
              isUrgent 
                ? "bg-gradient-to-br from-amber-500 to-orange-500" 
                : hasThisWeekBriefing
                  ? "bg-gradient-to-br from-emerald-500 to-green-500"
                  : "bg-gradient-to-br from-slate-400 to-slate-500"
            )}>
              {hasThisWeekBriefing ? (
                <CheckCircle2 className="w-6 h-6 text-white" />
              ) : isUrgent ? (
                <AlertTriangle className="w-6 h-6 text-white animate-pulse" />
              ) : (
                <Plane className="w-6 h-6 text-white" />
              )}
            </div>
            <div>
              <p className="font-bold text-slate-800">תדריך יציאה</p>
              <p className="text-xs text-slate-500">
                {hasThisWeekBriefing 
                  ? "הושלם השבוע ✓" 
                  : lastBriefingDate
                    ? `אחרון: ${format(new Date(lastBriefingDate), "dd/MM", { locale: he })}`
                    : "טרם הוגש"
                }
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isUrgent && (
              <Badge className="bg-amber-500 text-white animate-pulse">
                נדרש היום!
              </Badge>
            )}
            {hasThisWeekBriefing ? (
              <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-200">
                הושלם
              </Badge>
            ) : (
              <Link to="/trip-form">
                <Button 
                  size="sm" 
                  className={cn(
                    "gap-1 font-bold",
                    isUrgent && "bg-amber-500 hover:bg-amber-600"
                  )}
                >
                  מלא עכשיו
                  <ChevronLeft className="w-4 h-4" />
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Show when next briefing is needed if not urgent */}
        {!isUrgent && !hasThisWeekBriefing && nextBriefingDay && (
          <div className="mt-3 p-2 rounded-lg bg-slate-100 flex items-center gap-2 text-sm text-slate-600">
            <Calendar className="w-4 h-4" />
            <span>
              תדריך הבא: יום {format(nextBriefingDay, "EEEE", { locale: he })} ({format(nextBriefingDay, "dd/MM")})
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}