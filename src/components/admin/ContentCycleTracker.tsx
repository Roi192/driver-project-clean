import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, XCircle, ChevronDown, ChevronUp, Layers, CalendarCheck, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface WorkPlanEvent {
  id: string;
  title: string;
  event_date: string;
  status: string;
  expected_soldiers: string[] | null;
  content_cycle?: string | null;
}

interface EventAttendance {
  id: string;
  event_id: string;
  soldier_id: string;
  attended: boolean;
  status: string;
  completed: boolean;
}

interface Soldier {
  id: string;
  full_name: string;
  personal_number: string;
  rotation_group: string | null;
  qualified_date: string | null;
}

interface ContentCycleOverride {
  id: string;
  soldier_id: string;
  content_cycle: string;
  override_type: string;
  completion_date: string | null;
  absence_reason: string | null;
}

interface ContentCycleTrackerProps {
  events: WorkPlanEvent[];
  attendance: EventAttendance[];
  soldiers: Soldier[];
  overrides: ContentCycleOverride[];
  onOverrideChange: () => void;
}

const ABSENCE_REASONS = [
  "גימלים",
  "מיוחדת",
  "כלא",
  "נפקד",
  "קורס",
  "אחר",
];

export function ContentCycleTracker({ events, attendance, soldiers, overrides, onOverrideChange }: ContentCycleTrackerProps) {
  const [expandedCycle, setExpandedCycle] = useState<string | null>(null);
  const [completionDialog, setCompletionDialog] = useState<{ soldier: Soldier; cycleName: string } | null>(null);
  const [absenceDialog, setAbsenceDialog] = useState<{ soldier: Soldier; cycleName: string } | null>(null);
  const [completionDate, setCompletionDate] = useState("");
  const [absenceReason, setAbsenceReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [saving, setSaving] = useState(false);

  const contentCycles = useMemo(() => {
    const cycleMap = new Map<string, WorkPlanEvent[]>();
    
    events.forEach(event => {
      const cycle = (event as any).content_cycle;
      if (cycle) {
        if (!cycleMap.has(cycle)) cycleMap.set(cycle, []);
        cycleMap.get(cycle)!.push(event);
      }
    });

    return Array.from(cycleMap.entries()).map(([cycleName, cycleEvents]) => {
      const earliestDate = cycleEvents.reduce((min, e) => e.event_date < min ? e.event_date : min, cycleEvents[0].event_date);

      const eligibleSoldiers = soldiers.filter(s => {
        if (!s.qualified_date) return true;
        return s.qualified_date <= earliestDate;
      });

      const attended: Soldier[] = [];
      const missing: Array<Soldier & { absenceReason?: string | null }> = [];
      const manuallyCompleted: Array<Soldier & { completionDate?: string | null }> = [];

      eligibleSoldiers.forEach(soldier => {
        // Check for manual override first
        const override = overrides.find(o => o.soldier_id === soldier.id && o.content_cycle === cycleName);
        
        if (override?.override_type === 'completed') {
          manuallyCompleted.push({ ...soldier, completionDate: override.completion_date });
          return;
        }

        if (override?.override_type === 'absent') {
          missing.push({ ...soldier, absenceReason: override.absence_reason });
          return;
        }

        const didAttend = cycleEvents.some(event => {
          const att = attendance.find(
            a => a.event_id === event.id && a.soldier_id === soldier.id
          );
          return att && (att.status === "attended" || att.completed);
        });
        if (didAttend) attended.push(soldier);
        else missing.push(soldier);
      });

      const total = eligibleSoldiers.length;
      const completedCount = attended.length + manuallyCompleted.length;
      const percentage = total > 0 ? Math.round((completedCount / total) * 100) : 0;

      return {
        name: cycleName,
        events: cycleEvents,
        eligibleSoldiers,
        attended,
        manuallyCompleted,
        missing,
        total,
        completedCount,
        percentage,
      };
    });
  }, [events, attendance, soldiers, overrides]);

  const handleMarkCompleted = async () => {
    if (!completionDialog || !completionDate) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("content_cycle_overrides").upsert({
        soldier_id: completionDialog.soldier.id,
        content_cycle: completionDialog.cycleName,
        override_type: "completed",
        completion_date: completionDate,
        absence_reason: null,
      }, { onConflict: "soldier_id,content_cycle" });
      if (error) throw error;
      toast.success("סומן כהושלם בהצלחה");
      onOverrideChange();
      setCompletionDialog(null);
      setCompletionDate("");
    } catch (e: any) {
      toast.error("שגיאה בשמירה: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleMarkAbsent = async () => {
    const finalReason = absenceReason === "אחר" ? customReason : absenceReason;
    if (!absenceDialog || !finalReason) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("content_cycle_overrides").upsert({
        soldier_id: absenceDialog.soldier.id,
        content_cycle: absenceDialog.cycleName,
        override_type: "absent",
        absence_reason: finalReason,
        completion_date: null,
      }, { onConflict: "soldier_id,content_cycle" });
      if (error) throw error;
      toast.success("סיבת היעדרות נשמרה");
      onOverrideChange();
      setAbsenceDialog(null);
      setAbsenceReason("");
      setCustomReason("");
    } catch (e: any) {
      toast.error("שגיאה בשמירה: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveOverride = async (soldierId: string, cycleName: string) => {
    try {
      const { error } = await supabase
        .from("content_cycle_overrides")
        .delete()
        .eq("soldier_id", soldierId)
        .eq("content_cycle", cycleName);
      if (error) throw error;
      toast.success("הסימון הוסר");
      onOverrideChange();
    } catch (e: any) {
      toast.error("שגיאה: " + e.message);
    }
  };

  if (contentCycles.length === 0) {
    return (
      <Card className="border-0 shadow-lg">
        <CardContent className="p-6 text-center">
          <Layers className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
          <p className="font-bold text-slate-800">אין מחזורי תוכן</p>
          <p className="text-sm text-slate-600 mt-1">הוסף שדה "מחזור תוכן" למופעים כדי לעקוב אחרי העברת תוכן דו-שבועית</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-3">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
          <Layers className="w-5 h-5 text-slate-700" />
          מעקב תוכן דו-שבועי
        </h3>
        
        {contentCycles.map(cycle => {
          const isExpanded = expandedCycle === cycle.name;
          
          return (
            <Card key={cycle.name} className="border-0 shadow-md overflow-hidden">
              <div 
                className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => setExpandedCycle(isExpanded ? null : cycle.name)}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-slate-800">{cycle.name}</h4>
                    <Badge variant="outline" className="text-xs">
                      {cycle.events.length} מופעים
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={`text-xs ${
                      cycle.percentage >= 80 ? "bg-emerald-100 text-emerald-700" :
                      cycle.percentage >= 50 ? "bg-amber-100 text-amber-700" :
                      "bg-red-100 text-red-700"
                    }`}>
                      {cycle.completedCount}/{cycle.total}
                    </Badge>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                  </div>
                </div>
                
                <Progress value={cycle.percentage} className="h-2" />
                <p className="text-xs text-slate-600 mt-1">{cycle.percentage}% מהחיילים עברו את התוכן</p>

                {cycle.missing.length > 0 && (
                  <p className="text-xs text-red-600 font-medium mt-2">
                    חסר להשלים: {cycle.missing.length} חיילים
                  </p>
                )}
              </div>

              {isExpanded && (
                <div className="border-t border-border p-4 space-y-4 bg-muted/30">
                  {/* Missing soldiers */}
                  {cycle.missing.length > 0 && (
                    <div>
                      <p className="text-sm font-bold text-red-700 mb-2 flex items-center gap-1.5">
                        <XCircle className="w-4 h-4" />
                        צריכים להשלים ({cycle.missing.length})
                      </p>
                      <div className="space-y-1.5">
                        {cycle.missing.map(soldier => (
                          <div key={soldier.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-white border border-border">
                            <div className="flex flex-col">
                              <span className="text-sm text-slate-800 font-medium">{soldier.full_name}</span>
                              {soldier.absenceReason && (
                                <span className="text-xs text-amber-600 flex items-center gap-1 mt-0.5">
                                  <AlertTriangle className="w-3 h-3" />
                                  {soldier.absenceReason}
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleRemoveOverride(soldier.id, cycle.name); }}
                                    className="text-red-400 hover:text-red-600 mr-1 underline text-xs"
                                  >
                                    הסר
                                  </button>
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs text-emerald-700 hover:bg-emerald-50"
                                onClick={(e) => { e.stopPropagation(); setCompletionDialog({ soldier, cycleName: cycle.name }); }}
                              >
                                <CalendarCheck className="w-3.5 h-3.5 ml-1" />
                                השלמה
                              </Button>
                              {!soldier.absenceReason && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 text-xs text-amber-700 hover:bg-amber-50"
                                  onClick={(e) => { e.stopPropagation(); setAbsenceDialog({ soldier, cycleName: cycle.name }); }}
                                >
                                  <AlertTriangle className="w-3.5 h-3.5 ml-1" />
                                  סיבה
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Manually completed soldiers */}
                  {cycle.manuallyCompleted.length > 0 && (
                    <div>
                      <p className="text-sm font-bold text-blue-700 mb-2 flex items-center gap-1.5">
                        <CalendarCheck className="w-4 h-4" />
                        הושלם ידנית ({cycle.manuallyCompleted.length})
                      </p>
                      <div className="space-y-1">
                        {cycle.manuallyCompleted.map(soldier => (
                          <div key={soldier.id} className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-white border border-border">
                            <div className="flex flex-col">
                              <span className="text-sm text-slate-800">{soldier.full_name}</span>
                              {soldier.completionDate && (
                                <span className="text-xs text-slate-500">הושלם: {soldier.completionDate}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <CheckCircle className="w-5 h-5 text-blue-500" />
                              <button
                                onClick={(e) => { e.stopPropagation(); handleRemoveOverride(soldier.id, cycle.name); }}
                                className="text-xs text-red-400 hover:text-red-600 underline"
                              >
                                הסר
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Attended soldiers */}
                  {cycle.attended.length > 0 && (
                    <div>
                      <p className="text-sm font-bold text-emerald-700 mb-2 flex items-center gap-1.5">
                        <CheckCircle className="w-4 h-4" />
                        עברו את התוכן ({cycle.attended.length})
                      </p>
                      <div className="space-y-1">
                        {cycle.attended.map(soldier => (
                          <div key={soldier.id} className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-white border border-border">
                            <span className="text-sm text-slate-800">{soldier.full_name}</span>
                            <CheckCircle className="w-5 h-5 text-emerald-500" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Completion Dialog */}
      <Dialog open={!!completionDialog} onOpenChange={() => { setCompletionDialog(null); setCompletionDate(""); }}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-slate-800">סימון השלמה</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            סימון <strong>{completionDialog?.soldier.full_name}</strong> כמי שהשלים את <strong>{completionDialog?.cycleName}</strong>
          </p>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">תאריך השלמה</label>
            <Input
              type="date"
              value={completionDate}
              onChange={(e) => setCompletionDate(e.target.value)}
              className="bg-white text-slate-800"
            />
          </div>
          <DialogFooter>
            <Button onClick={handleMarkCompleted} disabled={!completionDate || saving} className="w-full">
              {saving ? "שומר..." : "סמן כהושלם"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Absence Reason Dialog */}
      <Dialog open={!!absenceDialog} onOpenChange={() => { setAbsenceDialog(null); setAbsenceReason(""); setCustomReason(""); }}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-slate-800">סיבת היעדרות</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            למה <strong>{absenceDialog?.soldier.full_name}</strong> לא היה ב<strong>{absenceDialog?.cycleName}</strong>?
          </p>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">סיבה</label>
            <Select value={absenceReason} onValueChange={(val) => { setAbsenceReason(val); if (val !== "אחר") setCustomReason(""); }}>
              <SelectTrigger className="bg-white text-slate-800">
                <SelectValue placeholder="בחר סיבה..." />
              </SelectTrigger>
              <SelectContent>
                {ABSENCE_REASONS.map(reason => (
                  <SelectItem key={reason} value={reason}>{reason}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {absenceReason === "אחר" && (
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">פרט סיבה</label>
              <Input
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="הזן סיבה..."
                className="bg-white text-slate-800"
              />
            </div>
          )}
          <DialogFooter>
            <Button onClick={handleMarkAbsent} disabled={(!absenceReason || (absenceReason === "אחר" && !customReason)) || saving} className="w-full">
              {saving ? "שומר..." : "שמור סיבה"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}