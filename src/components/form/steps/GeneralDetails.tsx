import { useFormContext } from "react-hook-form";
import { useState, useEffect, useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { OUTPOSTS } from "@/lib/constants";
import { Calendar, Clock, MapPin, User, Car, Sun, Moon, CloudSun, Sparkles, AlertTriangle, TrendingDown, Gauge, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const SHIFT_TYPES_ENHANCED = [
  { value: "morning", label: "משמרת בוקר", timeLabel: "6:00-14:00", icon: Sun },
  { value: "afternoon", label: "משמרת צהריים", timeLabel: "14:00-22:00", icon: CloudSun },
  { value: "evening", label: "משמרת ערב", timeLabel: "22:00-6:00", icon: Moon },
];

/**
 * Get the allowed shift type based on current hour
 * - 05:00 - 13:00 → morning only
 * - 13:00 - 21:00 → afternoon only
 * - 21:00 - 05:00 → evening only
 */
function getAllowedShift(): "morning" | "afternoon" | "evening" {
  const currentHour = new Date().getHours();
  
  // 05:00 to 13:00 → morning
  if (currentHour >= 5 && currentHour < 13) {
    return "morning";
  }
  // 13:00 to 21:00 → afternoon
  if (currentHour >= 13 && currentHour < 21) {
    return "afternoon";
  }
  // 21:00 to 05:00 → evening
  return "evening";
}

interface PreviousMonthScore {
  safety_score: number;
  kilometers: number | null;
  speed_violations: number | null;
  harsh_braking: number | null;
  harsh_turns: number | null;
  harsh_accelerations: number | null;
  illegal_overtakes: number | null;
  score_month: string;
}

export function GeneralDetails() {
  const { register, setValue, watch } = useFormContext();
  const { user } = useAuth();
  const [previousScore, setPreviousScore] = useState<PreviousMonthScore | null>(null);
  const [loadingScore, setLoadingScore] = useState(true);
  const driverName = watch("driverName");

  // Auto-fill driver name from the logged-in user's profile (read-only)
  useEffect(() => {
    const fetchDriverName = async () => {
      if (!user?.id) return;
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("user_id", user.id)
          .maybeSingle();
        if (profile?.full_name) {
          setValue("driverName", profile.full_name, { shouldDirty: true, shouldTouch: true });
        }
      } catch (error) {
        console.error("Error fetching driver name:", error);
      }
    };
    fetchDriverName();
  }, [user?.id, setValue]);
  
  const currentDate = new Date();
  const formattedDate = currentDate.toLocaleDateString('he-IL', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const formattedTime = currentDate.toLocaleTimeString('he-IL', {
    hour: '2-digit',
    minute: '2-digit',
  });

  // Get allowed shift based on current time
  const allowedShift = useMemo(() => getAllowedShift(), []);
  
  // Set the shift type automatically on mount
  useEffect(() => {
    setValue("shiftType", allowedShift);
  }, [allowedShift, setValue]);

  // Fetch previous month safety score for the logged-in user
  useEffect(() => {
    const fetchPreviousScore = async () => {
      if (!user?.id) {
        setLoadingScore(false);
        return;
      }

      try {
        // First get the user's profile to find their personal_number
        const { data: profile } = await supabase
          .from("profiles")
          .select("personal_number")
          .eq("user_id", user.id)
          .single();

        if (!profile?.personal_number) {
          setLoadingScore(false);
          return;
        }

        // Find the soldier by personal_number
        const { data: soldier } = await supabase
          .from("soldiers")
          .select("id")
          .eq("personal_number", profile.personal_number)
          .single();

        if (!soldier) {
          setLoadingScore(false);
          return;
        }

        // Get the previous month's score
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        const monthStr = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}-01`;

        const { data: scoreData } = await supabase
          .from("monthly_safety_scores")
          .select("safety_score, kilometers, speed_violations, harsh_braking, harsh_turns, harsh_accelerations, illegal_overtakes, score_month")
          .eq("soldier_id", soldier.id)
          .eq("score_month", monthStr)
          .single();

        if (scoreData) {
          setPreviousScore(scoreData);
        }
      } catch (error) {
        console.error("Error fetching previous score:", error);
      } finally {
        setLoadingScore(false);
      }
    };

    fetchPreviousScore();
  }, [user?.id]);

  const getScoreColor = (score: number) => {
    if (score >= 90) return "bg-emerald-500";
    if (score >= 75) return "bg-amber-500";
    return "bg-red-500";
  };

  const getScoreMessage = (score: number) => {
    if (score >= 90) return "מצוין! המשך כך 🌟";
    if (score >= 75) return "טוב, אבל יש מה לשפר";
    return "דורש שיפור משמעותי!";
  };

  const getImprovementAreas = (score: PreviousMonthScore) => {
    const areas: string[] = [];
    if (score.speed_violations && score.speed_violations > 0) areas.push(`חריגות מהירות (${score.speed_violations})`);
    if (score.harsh_braking && score.harsh_braking > 0) areas.push(`בלימות חדות (${score.harsh_braking})`);
    if (score.harsh_turns && score.harsh_turns > 0) areas.push(`פניות חדות (${score.harsh_turns})`);
    if (score.harsh_accelerations && score.harsh_accelerations > 0) areas.push(`האצות חדות (${score.harsh_accelerations})`);
    if (score.illegal_overtakes && score.illegal_overtakes > 0) areas.push(`עקיפות אסורות (${score.illegal_overtakes})`);
    return areas;
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-bold text-primary">שלב 1 מתוך 5</span>
        </div>
        <h2 className="text-3xl font-black mb-3 text-slate-800">פרטים כלליים</h2>
        <p className="text-slate-500">מלא את הפרטים הבסיסיים לפני תחילת המשמרת</p>
      </div>

      {/* Previous Month Safety Score - Prominent Alert */}
      {!loadingScore && previousScore && (
        <div className={`rounded-2xl p-5 border-2 shadow-lg animate-slide-up ${
          previousScore.safety_score < 75 
            ? "bg-red-50 border-red-300" 
            : previousScore.safety_score < 90 
              ? "bg-amber-50 border-amber-300"
              : "bg-emerald-50 border-emerald-300"
        }`}>
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center shadow-md ${getScoreColor(previousScore.safety_score)}`}>
              <Gauge className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-black text-lg text-slate-800">ציון הבטיחות שלך - חודש קודם</h3>
              <p className="text-sm text-slate-600">עיין בנתונים לפני יציאה למשמרת</p>
            </div>
            <div className={`text-4xl font-black px-4 py-2 rounded-xl text-white ${getScoreColor(previousScore.safety_score)}`}>
              {previousScore.safety_score}
            </div>
          </div>
          
          <div className={`p-3 rounded-xl mb-3 ${
            previousScore.safety_score < 75 
              ? "bg-red-100/80" 
              : previousScore.safety_score < 90 
                ? "bg-amber-100/80"
                : "bg-emerald-100/80"
          }`}>
            <p className={`text-center font-bold ${
              previousScore.safety_score < 75 
                ? "text-red-700" 
                : previousScore.safety_score < 90 
                  ? "text-amber-700"
                  : "text-emerald-700"
            }`}>
              {previousScore.safety_score < 75 && <AlertTriangle className="w-5 h-5 inline ml-2" />}
              {getScoreMessage(previousScore.safety_score)}
            </p>
          </div>

          {/* Detailed breakdown - always show if there are violations */}
          {(previousScore.speed_violations || previousScore.harsh_braking || previousScore.harsh_turns || previousScore.harsh_accelerations || previousScore.illegal_overtakes) ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-slate-700">
                <TrendingDown className="w-4 h-4" />
                <span className="font-bold text-sm">פירוט הציון שלך:</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {previousScore.speed_violations !== null && previousScore.speed_violations > 0 && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-red-100 rounded-xl border border-red-200">
                    <span className="text-red-600 font-bold text-lg">{previousScore.speed_violations}</span>
                    <span className="text-red-700 text-sm font-medium">חריגות מהירות</span>
                  </div>
                )}
                {previousScore.harsh_braking !== null && previousScore.harsh_braking > 0 && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-orange-100 rounded-xl border border-orange-200">
                    <span className="text-orange-600 font-bold text-lg">{previousScore.harsh_braking}</span>
                    <span className="text-orange-700 text-sm font-medium">בלימות חדות</span>
                  </div>
                )}
                {previousScore.harsh_turns !== null && previousScore.harsh_turns > 0 && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-amber-100 rounded-xl border border-amber-200">
                    <span className="text-amber-600 font-bold text-lg">{previousScore.harsh_turns}</span>
                    <span className="text-amber-700 text-sm font-medium">פניות חדות</span>
                  </div>
                )}
                {previousScore.harsh_accelerations !== null && previousScore.harsh_accelerations > 0 && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-yellow-100 rounded-xl border border-yellow-200">
                    <span className="text-yellow-600 font-bold text-lg">{previousScore.harsh_accelerations}</span>
                    <span className="text-yellow-700 text-sm font-medium">האצות חדות</span>
                  </div>
                )}
                {previousScore.illegal_overtakes !== null && previousScore.illegal_overtakes > 0 && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-purple-100 rounded-xl border border-purple-200">
                    <span className="text-purple-600 font-bold text-lg">{previousScore.illegal_overtakes}</span>
                    <span className="text-purple-700 text-sm font-medium">עקיפות אסורות</span>
                  </div>
                )}
              </div>
            </div>
          ) : previousScore.safety_score === 100 && (
            <div className="text-center py-2">
              <span className="text-emerald-600 font-bold">🎉 נהיגה מושלמת! אפס הפרות</span>
            </div>
          )}

          {/* Kilometers */}
          {previousScore.kilometers !== null && (
            <div className="mt-3 pt-3 border-t border-slate-200/50">
              <p className="text-sm text-slate-600">
                ק"מ בחודש הקודם: <span className="font-bold text-slate-800">{previousScore.kilometers}</span>
              </p>
            </div>
          )}
        </div>
      )}

      {!loadingScore && !previousScore && (
        <div className="rounded-2xl p-4 border-2 border-slate-200 bg-slate-50 text-center">
          <Gauge className="w-8 h-8 mx-auto mb-2 text-slate-400" />
          <p className="text-slate-500 text-sm">אין ציון בטיחות מהחודש הקודם</p>
        </div>
      )}

      {/* Date & Time Display */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center border border-primary/20">
              <Calendar className="w-6 h-6 text-primary" />
            </div>
            <div>
              <div className="font-bold text-lg text-slate-800">{formattedDate}</div>
              <div className="text-sm text-slate-500 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                {formattedTime}
              </div>
            </div>
          </div>
          <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
        </div>
      </div>

      {/* Outpost Selection */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent/15 to-accent/5 flex items-center justify-center border border-accent/20">
            <MapPin className="w-6 h-6 text-accent" />
          </div>
          <div className="flex-1">
            <Label className="font-bold text-slate-800 text-lg">שם המוצב *</Label>
            <p className="text-xs text-slate-500">בחר את המוצב שלך</p>
          </div>
        </div>
        <Select value={watch("outpost")} onValueChange={(value) => setValue("outpost", value, { shouldDirty: true, shouldTouch: true })}>
          <SelectTrigger className="h-14 bg-slate-50 border-slate-200 focus:border-primary text-base rounded-xl text-slate-800">
            <SelectValue placeholder="בחר מוצב" />
          </SelectTrigger>
          <SelectContent className="bg-white border-slate-200 rounded-xl shadow-xl">
            {OUTPOSTS.map((outpost) => (
              <SelectItem key={outpost} value={outpost} className="text-base py-3 rounded-lg text-slate-800">
                {outpost}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Driver Name */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/15 to-blue-500/5 flex items-center justify-center border border-blue-200">
            <User className="w-6 h-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <Label className="font-bold text-slate-800 text-lg">שם הנהג *</Label>
            <p className="text-xs text-slate-500">שם מלא</p>
          </div>
        </div>
        <Input
          {...register("driverName")}
          readOnly
          disabled
          value={driverName || ""}
          placeholder="טוען שם..."
          className="h-14 bg-slate-100 border-slate-200 text-base rounded-xl text-slate-800 placeholder:text-slate-400 cursor-not-allowed opacity-90"
        />
      </div>

      {/* Vehicle Number */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500/15 to-orange-500/5 flex items-center justify-center border border-orange-200">
            <Car className="w-6 h-6 text-orange-600" />
          </div>
          <div className="flex-1">
            <Label className="font-bold text-slate-800 text-lg">מספר רכב *</Label>
            <p className="text-xs text-slate-500">מספר הרכב הצבאי</p>
          </div>
        </div>
        <Input
          {...register("vehicleNumber")}
          placeholder="הזן את מספר הרכב"
          className="h-14 bg-slate-50 border-slate-200 focus:border-primary text-base rounded-xl text-slate-800 placeholder:text-slate-400"
        />
      </div>

      {/* Shift Type - Locked to current time */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/15 to-purple-500/5 flex items-center justify-center border border-purple-200">
            <Sun className="w-6 h-6 text-purple-600" />
          </div>
          <div className="flex-1">
            <Label className="font-bold text-slate-800 text-lg">סוג משמרת</Label>
            <p className="text-xs text-slate-500">נקבע אוטומטית לפי השעה</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {SHIFT_TYPES_ENHANCED.map((shift) => {
            const isSelected = watch("shiftType") === shift.value;
            const isAllowed = shift.value === allowedShift;
            const ShiftIcon = shift.icon;
            return (
              <button
                key={shift.value}
                type="button"
                disabled={!isAllowed}
                onClick={() => isAllowed && setValue("shiftType", shift.value)}
                className={`relative flex flex-col items-center gap-2 p-4 rounded-xl font-bold transition-all duration-300 border-2 ${
                  isSelected
                    ? "bg-primary/10 text-primary border-primary shadow-md"
                    : isAllowed
                      ? "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:border-slate-300"
                      : "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60"
                }`}
              >
                {!isAllowed && (
                  <div className="absolute top-2 left-2">
                    <Lock className="w-3 h-3 text-slate-400" />
                  </div>
                )}
                <ShiftIcon className="w-6 h-6" />
                <span className="text-sm">{shift.label.replace("משמרת ", "")}</span>
                <span className="text-xs text-slate-500">{shift.timeLabel}</span>
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-center text-slate-500">
          {allowedShift === "morning" && "ניתן להזין מ-05:00 עד 13:00"}
          {allowedShift === "afternoon" && "ניתן להזין מ-13:00 עד 21:00"}
          {allowedShift === "evening" && "ניתן להזין מ-21:00 עד 05:00"}
        </p>
      </div>
    </div>
  );
}