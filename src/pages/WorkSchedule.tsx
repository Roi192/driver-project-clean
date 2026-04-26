import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format, startOfWeek, addDays, addWeeks, subWeeks, getWeek } from "date-fns";
import { he } from "date-fns/locale";
import {
  Calendar, 
  ChevronRight, 
  ChevronLeft, 
  Save, 
  Sun, 
  Sunset, 
  Moon,
  MapPin,
  Loader2,
  Bell,
  Users,
  UserPlus
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface Soldier {
  id: string;
  personal_number: string;
  full_name: string;
  outpost: string | null;
  phone: string | null;
  is_active: boolean;
}

interface WorkScheduleEntry {
  id?: string;
  outpost: string;
  day_of_week: number;
  week_start_date: string;
  morning_soldier_id: string | null;
  afternoon_soldier_id: string | null;
  evening_soldier_id: string | null;
}

const OUTPOSTS = [
  "כוכב יעקב",
  "רמה",
  "ענתות",
  "בית אל",
  "עפרה",
  'מבו"ש',
  "עטרת",
  "חורש יערון",
  "נווה יאיר",
  "רנטיס",
  "מכבים",
  "חשמונאים"
];

const DAYS = [
  { value: 0, label: "ראשון" },
  { value: 1, label: "שני" },
  { value: 2, label: "שלישי" },
  { value: 3, label: "רביעי" },
  { value: 4, label: "חמישי" },
  { value: 5, label: "שישי" },
  { value: 6, label: "שבת" },
  { value: 7, label: "ראשון" },
  { value: 8, label: "שני" }
];

const SHIFTS = [
  { key: "morning", label: "בוקר", time: "06:00", icon: Sun, bgColor: "bg-amber-100 dark:bg-amber-900/30", headerColor: "bg-amber-200 dark:bg-amber-800/50" },
  { key: "afternoon", label: "צהריים", time: "14:00", icon: Sunset, bgColor: "bg-orange-100 dark:bg-orange-900/30", headerColor: "bg-orange-200 dark:bg-orange-800/50" },
  { key: "evening", label: "ערב", time: "22:00", icon: Moon, bgColor: "bg-green-100 dark:bg-green-900/30", headerColor: "bg-green-200 dark:bg-green-800/50" }
];

export default function WorkSchedule() {
  const navigate = useNavigate();
  const { role, loading: authLoading } = useAuth();
  const [soldiers, setSoldiers] = useState<Soldier[]>([]);
  const [schedule, setSchedule] = useState<Record<string, WorkScheduleEntry>>({});
  const [selectedOutpost, setSelectedOutpost] = useState<string>(OUTPOSTS[0]);
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date(), { weekStartsOn: 0 }));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [sendingNotification, setSendingNotification] = useState<string | null>(null);
  
  // Soldier assignment dialog
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedSoldierIds, setSelectedSoldierIds] = useState<Set<string>>(new Set());
  const [savingAssignment, setSavingAssignment] = useState(false);

  const canEdit = role === 'admin' || role === 'platoon_commander';
  const canView = canEdit || role === 'battalion_admin';

  useEffect(() => {
    if (!authLoading && !canView) {
      navigate('/');
    }
  }, [authLoading, canView, navigate]);

  useEffect(() => {
    fetchSoldiers();
  }, []);

  useEffect(() => {
    if (selectedOutpost && weekStart) {
      fetchSchedule();
    }
  }, [selectedOutpost, weekStart]);

  const fetchSoldiers = async () => {
    const { data, error } = await supabase
      .from('soldiers')
      .select('id, personal_number, full_name, outpost, phone, is_active')
      .eq('is_active', true)
      .order('full_name');
    
    if (error) {
      console.error('Error fetching soldiers:', error);
      toast.error('שגיאה בטעינת רשימת החיילים');
      return;
    }
    
    setSoldiers(data || []);
  };

  const fetchSchedule = async () => {
    setLoading(true);
    const weekStartStr = format(weekStart, 'yyyy-MM-dd');
    const nextWeekStartStr = format(addWeeks(weekStart, 1), 'yyyy-MM-dd');
    
    // Fetch both weeks (current week + first 2 days of next week)
    const { data, error } = await supabase
      .from('work_schedule')
      .select('*')
      .eq('outpost', selectedOutpost)
      .in('week_start_date', [weekStartStr, nextWeekStartStr]);
    
    if (error) {
      console.error('Error fetching schedule:', error);
      toast.error('שגיאה בטעינת סידור העבודה');
      setLoading(false);
      return;
    }
    
    const scheduleMap: Record<string, WorkScheduleEntry> = {};
    DAYS.forEach(day => {
      // Days 0-6 are current week, days 7-8 are next week (Sunday=0, Monday=1)
      const isNextWeek = day.value >= 7;
      const actualDayOfWeek = isNextWeek ? day.value - 7 : day.value;
      const targetWeekStart = isNextWeek ? nextWeekStartStr : weekStartStr;
      
      const existing = data?.find(s => 
        s.day_of_week === actualDayOfWeek && 
        s.week_start_date === targetWeekStart
      );
      const key = `${selectedOutpost}-${day.value}`;
      scheduleMap[key] = existing ? {
        ...existing,
        day_of_week: day.value // Keep display day value
      } : {
        outpost: selectedOutpost,
        day_of_week: day.value,
        week_start_date: targetWeekStart,
        morning_soldier_id: null,
        afternoon_soldier_id: null,
        evening_soldier_id: null
      };
    });
    
    setSchedule(scheduleMap);
    setHasChanges(false);
    setLoading(false);
  };

  const updateScheduleEntry = (dayOfWeek: number, shift: string, soldierId: string | null) => {
    const key = `${selectedOutpost}-${dayOfWeek}`;
    setSchedule(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        [`${shift}_soldier_id`]: soldierId === "none" ? null : soldierId
      }
    }));
    setHasChanges(true);
  };

  const saveSchedule = async () => {
    setSaving(true);
    const weekStartStr = format(weekStart, 'yyyy-MM-dd');
    const nextWeekStartStr = format(addWeeks(weekStart, 1), 'yyyy-MM-dd');
    const entries = Object.values(schedule);

    try {
      for (const entry of entries) {
        const displayDay = entry.day_of_week;
        const isNextWeek = displayDay >= 7;
        const actualDayOfWeek = isNextWeek ? displayDay - 7 : displayDay;
        const targetWeekStart = isNextWeek ? nextWeekStartStr : weekStartStr;
        
        // Check if record exists for this actual day
        const { data: existingData } = await supabase
          .from('work_schedule')
          .select('id')
          .eq('outpost', selectedOutpost)
          .eq('day_of_week', actualDayOfWeek)
          .eq('week_start_date', targetWeekStart)
          .maybeSingle();
        
        if (existingData?.id) {
          const { error } = await supabase
            .from('work_schedule')
            .update({
              morning_soldier_id: entry.morning_soldier_id,
              afternoon_soldier_id: entry.afternoon_soldier_id,
              evening_soldier_id: entry.evening_soldier_id
            })
            .eq('id', existingData.id);
          
          if (error) throw error;
        } else if (entry.morning_soldier_id || entry.afternoon_soldier_id || entry.evening_soldier_id) {
          const { error } = await supabase
            .from('work_schedule')
            .upsert({
              outpost: selectedOutpost,
              day_of_week: actualDayOfWeek,
              week_start_date: targetWeekStart,
              morning_soldier_id: entry.morning_soldier_id,
              afternoon_soldier_id: entry.afternoon_soldier_id,
              evening_soldier_id: entry.evening_soldier_id
            }, {
              onConflict: 'outpost,day_of_week,week_start_date'
            });
          
          if (error) throw error;
        }
      }
      
      toast.success('סידור העבודה נשמר בהצלחה');
      setHasChanges(false);
      fetchSchedule();
    } catch (error) {
      console.error('Error saving schedule:', error);
      toast.error('שגיאה בשמירת סידור העבודה');
    } finally {
      setSaving(false);
    }
  };

  const getSoldierById = (id: string | null) => {
    if (!id) return null;
    return soldiers.find(s => s.id === id);
  };

  // Get soldiers assigned to current outpost
  const getOutpostSoldiers = () => {
    return soldiers.filter(s => s.outpost === selectedOutpost);
  };

  const getSoldierShortName = (id: string | null) => {
    const soldier = getSoldierById(id);
    if (!soldier) return "";
    const parts = soldier.full_name.trim().split(' ');
    if (parts.length === 1) return parts[0];
    return `${parts[0]} ${parts[parts.length - 1]?.[0] || ''}'`;
  };

  const getWeekLabel = () => {
    const end = addDays(weekStart, 6);
    return `${format(weekStart, 'd.M', { locale: he })} - ${format(end, 'd.M.yyyy', { locale: he })}`;
  };

  const getWeekNumber = () => {
    return getWeek(weekStart, { weekStartsOn: 0 });
  };

  const sendTestNotification = async (soldierId: string, soldierName: string, outpost: string, shiftLabel: string) => {
    setSendingNotification(soldierId);
    try {
      const { data, error } = await supabase.functions.invoke('send-push-notification', {
        body: { 
          testMode: true,
          soldierId,
          soldierName,
          outpost,
          shiftType: shiftLabel
        }
      });

      if (error) throw error;
      
      if (data?.error) {
        toast.error(data.error);
      } else {
        toast.success(`התראה נשלחה ל${soldierName}`);
      }
    } catch (error) {
      console.error('Error sending test notification:', error);
      toast.error('שגיאה בשליחת התראה');
    } finally {
      setSendingNotification(null);
    }
  };

  // Open assign dialog and pre-select current outpost soldiers
  const openAssignDialog = () => {
    const currentOutpostSoldiers = soldiers.filter(s => s.outpost === selectedOutpost);
    setSelectedSoldierIds(new Set(currentOutpostSoldiers.map(s => s.id)));
    setAssignDialogOpen(true);
  };

  // Toggle soldier selection
  const toggleSoldierSelection = (soldierId: string) => {
    setSelectedSoldierIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(soldierId)) {
        newSet.delete(soldierId);
      } else {
        newSet.add(soldierId);
      }
      return newSet;
    });
  };

  // Save soldier assignments to outpost
  const saveOutpostAssignments = async () => {
    setSavingAssignment(true);
    try {
      // Get soldiers currently assigned to this outpost
      const currentOutpostSoldiers = soldiers.filter(s => s.outpost === selectedOutpost);
      
      // Soldiers to add to this outpost
      const soldiersToAdd = Array.from(selectedSoldierIds).filter(
        id => !currentOutpostSoldiers.find(s => s.id === id)
      );
      
      // Soldiers to remove from this outpost
      const soldiersToRemove = currentOutpostSoldiers
        .filter(s => !selectedSoldierIds.has(s.id))
        .map(s => s.id);
      
      // Update soldiers to add
      if (soldiersToAdd.length > 0) {
        const { error } = await supabase
          .from('soldiers')
          .update({ outpost: selectedOutpost })
          .in('id', soldiersToAdd);
        
        if (error) throw error;
      }
      
      // Update soldiers to remove (set outpost to null)
      if (soldiersToRemove.length > 0) {
        const { error } = await supabase
          .from('soldiers')
          .update({ outpost: null })
          .in('id', soldiersToRemove);
        
        if (error) throw error;
      }
      
      toast.success(`עודכנו ${selectedSoldierIds.size} חיילים למוצב ${selectedOutpost}`);
      setAssignDialogOpen(false);
      fetchSoldiers(); // Refresh soldiers list
    } catch (error) {
      console.error('Error saving outpost assignments:', error);
      toast.error('שגיאה בשמירת שיוך החיילים');
    } finally {
      setSavingAssignment(false);
    }
  };

  if (authLoading || loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  const outpostSoldiers = getOutpostSoldiers();

  return (
    <AppLayout>
      <div className="space-y-4 pb-24">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-teal-600 flex items-center justify-center shadow-lg">
            <Calendar className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-black text-foreground">סידור עבודה</h1>
            <p className="text-xs text-muted-foreground">ניהול משמרות שבועי</p>
          </div>
        </div>

        {/* Week Navigation - Compact */}
        <div className="flex items-center justify-between bg-white dark:bg-slate-800 rounded-lg border p-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setWeekStart(prev => addWeeks(prev, 1))}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
          
          <div className="text-center">
            <p className="font-bold text-sm text-slate-800 dark:text-slate-100">{getWeekLabel()}</p>
            <p className="text-xs text-slate-600 dark:text-slate-400">שבוע {getWeekNumber()}</p>
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setWeekStart(prev => subWeeks(prev, 1))}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
        </div>

        {/* Outpost Selection - Scrollable chips */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4" />
            <span>מוצב</span>
          </div>
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex gap-2 pb-2">
              {OUTPOSTS.map(outpost => (
                <Button
                  key={outpost}
                  variant={selectedOutpost === outpost ? "default" : "outline"}
                  size="sm"
                  className="h-8 text-xs shrink-0"
                  onClick={() => setSelectedOutpost(outpost)}
                >
                  {outpost}
                </Button>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>

        {/* Schedule Table - Excel-like compact view */}
        <Card className="border overflow-hidden">
          <CardHeader className="p-3 bg-muted/50">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                {selectedOutpost}
                <Badge variant="secondary" className="text-xs">
                  <Users className="w-3 h-3 ml-1" />
                  {outpostSoldiers.length} חיילים
                </Badge>
              </CardTitle>
              {canEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={openAssignDialog}
                >
                  <UserPlus className="w-3 h-3" />
                  בחר חיילים
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {outpostSoldiers.length === 0 ? (
              <div className="p-8 text-center">
                <Users className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground mb-3">אין חיילים משויכים למוצב זה</p>
                {canEdit && (
                  <Button onClick={openAssignDialog} size="sm" className="gap-2">
                    <UserPlus className="w-4 h-4" />
                    הוסף חיילים למוצב
                  </Button>
                )}
              </div>
            ) : (
              <ScrollArea className="w-full">
                <div className="min-w-[750px]">
                  {/* Table Header - Days */}
                  <div className="grid grid-cols-10 border-b">
                    <div className="p-2 text-center font-bold text-xs bg-muted/80 border-l">
                      משמרת
                    </div>
                    {DAYS.map(day => {
                      const dayDate = addDays(weekStart, day.value);
                      return (
                        <div key={day.value} className="p-2 text-center bg-muted/50 border-l last:border-l-0">
                          <div className="font-bold text-xs">{day.label}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {format(dayDate, 'd.M', { locale: he })}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Table Rows - Shifts */}
                  {SHIFTS.map(shift => {
                    const Icon = shift.icon;
                    return (
                      <div key={shift.key} className={`grid grid-cols-10 border-b last:border-b-0 ${shift.bgColor}`}>
                        {/* Shift Label */}
                        <div className={`p-2 flex items-center justify-center gap-1 border-l ${shift.headerColor}`}>
                          <Icon className="w-4 h-4" />
                          <span className="font-bold text-xs">{shift.label}</span>
                        </div>
                        
                        {/* Cells for each day */}
                        {DAYS.map(day => {
                          const key = `${selectedOutpost}-${day.value}`;
                          const entry = schedule[key];
                          const soldierIdKey = `${shift.key}_soldier_id` as keyof WorkScheduleEntry;
                          const selectedSoldierId = entry?.[soldierIdKey] as string | null;
                          const selectedSoldier = getSoldierById(selectedSoldierId);
                          
                          return (
                            <div key={day.value} className="p-1 border-l last:border-l-0 min-h-[50px] flex items-center justify-center">
                              {canEdit ? (
                                <Select
                                  value={selectedSoldierId || "none"}
                                  onValueChange={(value) => updateScheduleEntry(day.value, shift.key, value)}
                                >
                                  <SelectTrigger className="h-8 text-xs border-0 bg-transparent hover:bg-white/50 dark:hover:bg-black/20 focus:ring-0 focus:ring-offset-0 px-1">
                                    <SelectValue>
                                      <span className={selectedSoldierId ? "font-medium" : "text-muted-foreground"}>
                                        {selectedSoldierId ? getSoldierShortName(selectedSoldierId) : "-"}
                                      </span>
                                    </SelectValue>
                                  </SelectTrigger>
                                  <SelectContent align="center" className="max-h-[300px]">
                                    <SelectItem value="none">
                                      <span className="text-muted-foreground">ללא שיבוץ</span>
                                    </SelectItem>
                                    {outpostSoldiers.map(soldier => (
                                      <SelectItem key={soldier.id} value={soldier.id}>
                                        {soldier.full_name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <span className="text-xs font-medium text-center">
                                  {selectedSoldier ? getSoldierShortName(selectedSoldierId) : "-"}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Save Button - Fixed at bottom */}
        {canEdit && hasChanges && (
          <div className="fixed bottom-20 left-4 right-4 z-50">
            <Button
              onClick={saveSchedule}
              disabled={saving}
              className="w-full h-11 bg-gradient-to-r from-primary to-teal-600 text-primary-foreground font-bold shadow-lg"
            >
              {saving ? (
                <Loader2 className="w-5 h-5 animate-spin ml-2" />
              ) : (
                <Save className="w-5 h-5 ml-2" />
              )}
              שמור סידור עבודה
            </Button>
          </div>
        )}

        {/* Info Card */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-3">
            <div className="flex items-start gap-2">
              <Bell className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div className="text-xs text-muted-foreground">
                <p className="font-medium text-foreground mb-1">התראות אוטומטיות</p>
                <p>המערכת שולחת התראות Push לחיילים המשובצים לפני תחילת המשמרת.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Soldier Assignment Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="max-w-md max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              בחר חיילים למוצב {selectedOutpost}
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-2">
              {soldiers.map(soldier => {
                const isSelected = selectedSoldierIds.has(soldier.id);
                const currentOutpost = soldier.outpost;
                const isFromOtherOutpost = currentOutpost && currentOutpost !== selectedOutpost;
                
                return (
                  <div
                    key={soldier.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      isSelected 
                        ? 'bg-primary/10 border-primary' 
                        : 'bg-white dark:bg-slate-800 border-border hover:bg-muted/50'
                    }`}
                    onClick={() => toggleSoldierSelection(soldier.id)}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleSoldierSelection(soldier.id)}
                    />
                    <div className="flex-1">
                      <p className="font-medium text-sm text-slate-800 dark:text-slate-100">
                        {soldier.full_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        מ.א: {soldier.personal_number}
                      </p>
                    </div>
                    {isFromOtherOutpost && (
                      <Badge variant="outline" className="text-xs">
                        {currentOutpost}
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
          
          <DialogFooter className="flex-row gap-2">
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)} className="flex-1">
              ביטול
            </Button>
            <Button 
              onClick={saveOutpostAssignments} 
              disabled={savingAssignment}
              className="flex-1"
            >
              {savingAssignment ? (
                <Loader2 className="w-4 h-4 animate-spin ml-2" />
              ) : (
                <Save className="w-4 h-4 ml-2" />
              )}
              שמור ({selectedSoldierIds.size})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}