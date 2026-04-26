import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { FileText, Save, Loader2, TrendingUp, AlertTriangle, Shield, Gavel, CheckCircle2, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import type { WeeklyClosing, WeeklyScheduleItem, WeeklySafetyActivity, WeeklyFitnessIssue } from "@/hooks/useWeeklyMeeting";

interface ClosingSectionProps {
  closing: WeeklyClosing | null;
  weeklyOpeningId: string | undefined;
  schedule: WeeklyScheduleItem[];
  safetyActivities: WeeklySafetyActivity[];
  fitnessIssues: WeeklyFitnessIssue[];
  onSave: (closingData: Omit<WeeklyClosing, 'id' | 'weekly_opening_id' | 'created_at'>) => Promise<any>;
  isLoading: boolean;
}

export function ClosingSection({ 
  closing, 
  weeklyOpeningId, 
  schedule, 
  safetyActivities, 
  fitnessIssues, 
  onSave, 
  isLoading 
}: ClosingSectionProps) {
  const [planningVsExecution, setPlanningVsExecution] = useState("");
  const [unresolvedDeviations, setUnresolvedDeviations] = useState("");
  const [safetyEvents, setSafetyEvents] = useState("");
  const [disciplineEvents, setDisciplineEvents] = useState("");
  const [commanderNotes, setCommanderNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (closing) {
      setPlanningVsExecution(closing.planning_vs_execution || "");
      setUnresolvedDeviations(closing.unresolved_deviations || "");
      setSafetyEvents(closing.safety_events_summary || "");
      setDisciplineEvents(closing.discipline_events_summary || "");
      setCommanderNotes(closing.commander_notes || "");
    }
  }, [closing]);

  const handleSave = async () => {
    if (!weeklyOpeningId) {
      toast.error("יש לבחור גזרה לפני השמירה");
      return;
    }
    
    setIsSaving(true);
    const { error } = await onSave({
      planning_vs_execution: planningVsExecution || null,
      unresolved_deviations: unresolvedDeviations || null,
      safety_events_summary: safetyEvents || null,
      discipline_events_summary: disciplineEvents || null,
      commander_notes: commanderNotes || null
    });
    
    if (error) {
      toast.error("שגיאה בשמירת הסיכום");
    } else {
      toast.success("סיכום השבוע נשמר בהצלחה");
    }
    setIsSaving(false);
  };

  if (isLoading) {
    return (
      <Card className="bg-white border-slate-200 shadow-sm">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  // Calculate stats from opening
  const completedTasks = schedule.filter(s => s.completed).length;
  const totalTasks = schedule.length;
  const completedSafety = safetyActivities.filter(a => a.completed).length;
  const totalSafety = safetyActivities.length;
  const resolvedFitness = fitnessIssues.filter(f => f.resolved).length;
  const totalFitness = fitnessIssues.length;

  return (
    <div className="space-y-4">
      {/* Status Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card className={`bg-white border shadow-sm ${totalTasks > 0 && completedTasks === totalTasks ? "border-green-300" : "border-amber-300"}`}>
          <CardContent className="p-4 text-center">
            <Clock className="w-6 h-6 mx-auto mb-1 text-primary" />
            <div className="text-xl font-bold text-slate-800">{completedTasks}/{totalTasks}</div>
            <div className="text-xs text-slate-600">משימות לוז</div>
          </CardContent>
        </Card>
        <Card className={`bg-white border shadow-sm ${totalSafety > 0 && completedSafety === totalSafety ? "border-green-300" : "border-amber-300"}`}>
          <CardContent className="p-4 text-center">
            <Shield className="w-6 h-6 mx-auto mb-1 text-green-600" />
            <div className="text-xl font-bold text-slate-800">{completedSafety}/{totalSafety}</div>
            <div className="text-xs text-slate-600">פעולות בטיחות</div>
          </CardContent>
        </Card>
        <Card className={`bg-white border shadow-sm ${totalFitness > 0 && resolvedFitness === totalFitness ? "border-green-300" : "border-amber-300"}`}>
          <CardContent className="p-4 text-center">
            <AlertTriangle className="w-6 h-6 mx-auto mb-1 text-amber-600" />
            <div className="text-xl font-bold text-slate-800">{resolvedFitness}/{totalFitness}</div>
            <div className="text-xs text-slate-600">פערי כשירות</div>
          </CardContent>
        </Card>
      </div>

      {/* Unfinished items list */}
      {(schedule.filter(s => !s.completed).length > 0 || 
        safetyActivities.filter(a => !a.completed).length > 0 || 
        fitnessIssues.filter(f => !f.resolved).length > 0) && (
        <Card className="border-amber-200 bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-amber-700">
              <XCircle className="w-5 h-5" />
              פריטים שלא הושלמו
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Incomplete tasks */}
            {schedule.filter(s => !s.completed).length > 0 && (
              <div>
                <p className="text-sm font-medium text-amber-700 mb-1">משימות לוז:</p>
                <div className="flex flex-wrap gap-1">
                  {schedule.filter(s => !s.completed).map(task => (
                    <Badge key={task.id} variant="outline" className="bg-white text-amber-700 border-amber-300">
                      {task.title}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Incomplete safety */}
            {safetyActivities.filter(a => !a.completed).length > 0 && (
              <div>
                <p className="text-sm font-medium text-amber-700 mb-1">פעולות בטיחות:</p>
                <div className="flex flex-wrap gap-1">
                  {safetyActivities.filter(a => !a.completed).map(activity => (
                    <Badge key={activity.id} variant="outline" className="bg-white text-amber-700 border-amber-300">
                      {activity.title}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Unresolved fitness */}
            {fitnessIssues.filter(f => !f.resolved).length > 0 && (
              <div>
                <p className="text-sm font-medium text-amber-700 mb-1">פערי כשירות פתוחים:</p>
                <div className="flex flex-wrap gap-1">
                  {fitnessIssues.filter(f => !f.resolved).map(issue => (
                    <Badge key={issue.id} variant="outline" className="bg-white text-amber-700 border-amber-300">
                      {issue.soldier?.full_name} - {issue.issue_type}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Completed items */}
      {(schedule.filter(s => s.completed).length > 0 || 
        safetyActivities.filter(a => a.completed).length > 0 || 
        fitnessIssues.filter(f => f.resolved).length > 0) && (
        <Card className="border-green-200 bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-green-700">
              <CheckCircle2 className="w-5 h-5" />
              פריטים שהושלמו
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {schedule.filter(s => s.completed).length > 0 && (
              <div>
                <p className="text-sm font-medium text-green-700 mb-1">משימות לוז:</p>
                <div className="flex flex-wrap gap-1">
                  {schedule.filter(s => s.completed).map(task => (
                    <Badge key={task.id} variant="outline" className="bg-white text-green-700 border-green-300">
                      ✓ {task.title}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {safetyActivities.filter(a => a.completed).length > 0 && (
              <div>
                <p className="text-sm font-medium text-green-700 mb-1">פעולות בטיחות:</p>
                <div className="flex flex-wrap gap-1">
                  {safetyActivities.filter(a => a.completed).map(activity => (
                    <Badge key={activity.id} variant="outline" className="bg-white text-green-700 border-green-300">
                      ✓ {activity.title}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {fitnessIssues.filter(f => f.resolved).length > 0 && (
              <div>
                <p className="text-sm font-medium text-green-700 mb-1">פערי כשירות שטופלו:</p>
                <div className="flex flex-wrap gap-1">
                  {fitnessIssues.filter(f => f.resolved).map(issue => (
                    <Badge key={issue.id} variant="outline" className="bg-white text-green-700 border-green-300">
                      ✓ {issue.soldier?.full_name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Notes section */}
      <Card className="bg-white border-slate-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2 text-slate-800">
            <FileText className="w-5 h-5 text-blue-600" />
            סיכום שבוע (סכמ"ש)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Planning vs Execution */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <label className="font-medium text-slate-800">תכנון מול ביצוע</label>
            </div>
            <Textarea
              placeholder="האם הלוז התקיים כמתוכנן? מה בוצע ומה לא?"
              value={planningVsExecution}
              onChange={(e) => setPlanningVsExecution(e.target.value)}
              rows={3}
              className="resize-none bg-white text-slate-800 border-slate-300 placeholder:text-slate-400"
            />
          </div>

          {/* Unresolved Deviations */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-600" />
              <label className="font-medium text-slate-800">חריגות שלא נסגרו</label>
            </div>
            <Textarea
              placeholder="אילו חריגות נותרו פתוחות ולמה?"
              value={unresolvedDeviations}
              onChange={(e) => setUnresolvedDeviations(e.target.value)}
              rows={3}
              className="resize-none bg-white text-slate-800 border-slate-300 placeholder:text-slate-400"
            />
          </div>

          {/* Safety Events */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-red-600" />
              <label className="font-medium text-slate-800">אירועי בטיחות</label>
            </div>
            <Textarea
              placeholder="האם היו אירועי בטיחות במהלך השבוע? פרט..."
              value={safetyEvents}
              onChange={(e) => setSafetyEvents(e.target.value)}
              rows={3}
              className="resize-none bg-white text-slate-800 border-slate-300 placeholder:text-slate-400"
            />
          </div>

          {/* Discipline Events */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Gavel className="w-4 h-4 text-purple-600" />
              <label className="font-medium text-slate-800">אירועי משמעת</label>
            </div>
            <Textarea
              placeholder="האם היו אירועי משמעת במהלך השבוע? פרט..."
              value={disciplineEvents}
              onChange={(e) => setDisciplineEvents(e.target.value)}
              rows={3}
              className="resize-none bg-white text-slate-800 border-slate-300 placeholder:text-slate-400"
            />
          </div>

          {/* Commander Notes */}
          <div className="space-y-2">
            <label className="font-medium text-slate-800">הערות מ"מ</label>
            <Textarea
              placeholder="הערות נוספות לסיכום השבוע..."
              value={commanderNotes}
              onChange={(e) => setCommanderNotes(e.target.value)}
              rows={3}
              className="resize-none bg-white text-slate-800 border-slate-300 placeholder:text-slate-400"
            />
          </div>

          <Button onClick={handleSave} disabled={isSaving || !weeklyOpeningId} className="w-full">
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                שומר...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 ml-2" />
                שמור סיכום שבוע
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}