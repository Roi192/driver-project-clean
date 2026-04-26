import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, startOfWeek } from "date-fns";
import {
  Plus,
  Trash2,
  Edit,
  Camera,
  ListChecks,
  Sun,
  Sunset,
  Moon,
  Calendar,
  Settings,
  Save,
  UserPlus,
  X,
  User,
  Clock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TimePicker } from "@/components/weekly-meeting/TimePicker";

interface ChecklistItem {
  id: string;
  outpost: string;
  item_name: string;
  item_order: number;
  is_active: boolean;
  responsibility_area_id: string | null;
}

interface ReferencePhoto {
  id: string;
  checklist_item_id: string | null;
}

interface Soldier {
  id: string;
  full_name: string;
  personal_number: string;
}

interface WorkScheduleEntry {
  day_of_week: number;
  morning_soldier_id: string | null;
  afternoon_soldier_id: string | null;
  evening_soldier_id: string | null;
}

interface ItemAssignment {
  id?: string;
  item_id: string;
  parade_day: number;
  shift_type: string;
  source_day?: number | null;
  source_shift?: string | null;
  manual_soldier_id?: string | null;
  additional_soldier_id?: string | null;
  deadline_time?: string | null;
}

interface ParadeDay {
  id: string;
  outpost: string;
  day_of_week: number;
  is_active: boolean;
}

interface ChecklistWithGroupsProps {
  outpost: string;
  checklistItems: ChecklistItem[];
  referencePhotos: ReferencePhoto[];
  soldiers: Soldier[];
  onRefresh: () => void;
  onAddPhoto: (item: ChecklistItem) => void;
}

const SHIFT_TYPES = [
  { value: "morning", label: "בוקר", icon: Sun, color: "bg-amber-100 text-amber-700" },
  { value: "afternoon", label: "צהריים", icon: Sunset, color: "bg-orange-100 text-orange-700" },
  { value: "evening", label: "ערב", icon: Moon, color: "bg-emerald-100 text-emerald-700" }
];

const DAYS_OF_WEEK = [
  { value: 0, label: "ראשון", short: "א'" },
  { value: 1, label: "שני", short: "ב'" },
  { value: 2, label: "שלישי", short: "ג'" },
  { value: 3, label: "רביעי", short: "ד'" },
  { value: 4, label: "חמישי", short: "ה'" },
  { value: 5, label: "שישי", short: "ו'" },
  { value: 6, label: "שבת", short: "ש'" }
];

// Build schedule options for selection - including previous week's Saturday
const buildScheduleOptions = () => {
  const options: { value: string; dayLabel: string; shiftLabel: string; day: number; shift: string; isPrevWeek?: boolean }[] = [];
  
  // Add previous week's Saturday shifts first (for Sunday parade assignments)
  SHIFT_TYPES.forEach(shift => {
    options.push({
      value: `prev-6-${shift.value}`, // prev- prefix indicates previous week
      dayLabel: "שבת (שבוע קודם)",
      shiftLabel: shift.label,
      day: 6, // Saturday
      shift: shift.value,
      isPrevWeek: true
    });
  });
  
  // Add current week days
  DAYS_OF_WEEK.forEach(day => {
    SHIFT_TYPES.forEach(shift => {
      options.push({
        value: `${day.value}-${shift.value}`,
        dayLabel: day.label,
        shiftLabel: shift.label,
        day: day.value,
        shift: shift.value,
        isPrevWeek: false
      });
    });
  });
  return options;
};

const SCHEDULE_OPTIONS = buildScheduleOptions();

export function ChecklistWithGroups({ 
  outpost, 
  checklistItems, 
  referencePhotos,
  soldiers,
  onRefresh,
  onAddPhoto
}: ChecklistWithGroupsProps) {
  const [workSchedule, setWorkSchedule] = useState<WorkScheduleEntry[]>([]);
  const [prevWeekSchedule, setPrevWeekSchedule] = useState<WorkScheduleEntry[]>([]);
  const [paradeDays, setParadeDays] = useState<ParadeDay[]>([]);
  const [assignments, setAssignments] = useState<Map<string, ItemAssignment>>(new Map());
  const [pendingChanges, setPendingChanges] = useState<Map<string, Partial<ItemAssignment> | null>>(new Map());
  
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ChecklistItem | null>(null);
  const [itemForm, setItemForm] = useState({ item_name: "" });
  const [selectedParadeDays, setSelectedParadeDays] = useState<number[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [currentCell, setCurrentCell] = useState<{ itemId: string; paradeDay: number } | null>(null);
  
  // Assignment dialog state
  const [assignmentType, setAssignmentType] = useState<"schedule" | "manual">("schedule");
  const [selectedScheduleOption, setSelectedScheduleOption] = useState<string>("");
  const [selectedManualSoldier, setSelectedManualSoldier] = useState<string>("");
  const [selectedAdditionalSoldier, setSelectedAdditionalSoldier] = useState<string>("");
  const [selectedDeadlineTime, setSelectedDeadlineTime] = useState<string>("");

  useEffect(() => {
    fetchAllData();
  }, [outpost]);

  const fetchAllData = async () => {
    await Promise.all([
      fetchWorkSchedule(),
      fetchParadeDays(),
      fetchAssignments()
    ]);
  };

  const fetchWorkSchedule = async () => {
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 0 });
    const weekStartStr = format(weekStart, "yyyy-MM-dd");
    
    // Calculate previous week start
    const prevWeekStart = new Date(weekStart);
    prevWeekStart.setDate(prevWeekStart.getDate() - 7);
    const prevWeekStartStr = format(prevWeekStart, "yyyy-MM-dd");
    
    // Fetch both current and previous week schedules
    const [currentRes, prevRes] = await Promise.all([
      supabase
        .from("work_schedule")
        .select("day_of_week, morning_soldier_id, afternoon_soldier_id, evening_soldier_id")
        .eq("outpost", outpost)
        .eq("week_start_date", weekStartStr),
      supabase
        .from("work_schedule")
        .select("day_of_week, morning_soldier_id, afternoon_soldier_id, evening_soldier_id")
        .eq("outpost", outpost)
        .eq("week_start_date", prevWeekStartStr)
    ]);
    
    setWorkSchedule(currentRes.data || []);
    setPrevWeekSchedule(prevRes.data || []);
  };

  const fetchParadeDays = async () => {
    const { data } = await supabase
      .from("cleaning_parade_config")
      .select("*")
      .eq("outpost", outpost)
      .eq("is_active", true);
    setParadeDays(data || []);
    setSelectedParadeDays((data || []).map(d => d.day_of_week));
  };

  const fetchAssignments = async () => {
    const { data, error } = await (supabase as any)
      .from("cleaning_item_assignments")
      .select("*")
      .eq("outpost", outpost);
    
    if (error) {
      console.error("Error fetching assignments:", error);
      return;
    }
    
    console.log("Fetched assignments for outpost", outpost, ":", data);
    
    const assignmentMap = new Map<string, ItemAssignment>();
    ((data as any[]) || []).forEach((a: any) => {
      const key = `${a.item_id}-${a.parade_day}`;
      assignmentMap.set(key, {
        id: a.id,
        item_id: a.item_id,
        parade_day: a.parade_day,
        shift_type: a.shift_type,
        manual_soldier_id: a.manual_soldier_id,
        deadline_time: a.deadline_time
      });
    });
    setAssignments(assignmentMap);
    setPendingChanges(new Map());
  };

  const getSoldierFromSchedule = (dayOfWeek: number, shiftType: string, isPrevWeek?: boolean): Soldier | null => {
    const schedule = isPrevWeek ? prevWeekSchedule : workSchedule;
    const scheduleEntry = schedule.find(s => s.day_of_week === dayOfWeek);
    if (!scheduleEntry) return null;

    let soldierId: string | null = null;
    if (shiftType === "morning") soldierId = scheduleEntry.morning_soldier_id;
    else if (shiftType === "afternoon") soldierId = scheduleEntry.afternoon_soldier_id;
    else if (shiftType === "evening") soldierId = scheduleEntry.evening_soldier_id;

    return soldiers.find(s => s.id === soldierId) || null;
  };

  const getAssignment = (itemId: string, paradeDay: number): ItemAssignment | null => {
    const key = `${itemId}-${paradeDay}`;
    
    if (pendingChanges.has(key)) {
      const pending = pendingChanges.get(key);
      if (pending === null) return null;
      const existing = assignments.get(key);
      return { ...existing, ...pending } as ItemAssignment;
    }
    
    return assignments.get(key) || null;
  };

  const openAssignmentDialog = (itemId: string, paradeDay: number) => {
    const assignment = getAssignment(itemId, paradeDay);
    setCurrentCell({ itemId, paradeDay });
    
    if (assignment?.shift_type) {
      if (assignment.shift_type.startsWith("manual-")) {
        // Manual assignment
        const soldierId = assignment.shift_type.replace("manual-", "");
        setAssignmentType("manual");
        setSelectedManualSoldier(soldierId);
        setSelectedScheduleOption("");
        setSelectedAdditionalSoldier("");
      } else {
        // Schedule-based assignment
        setAssignmentType("schedule");
        setSelectedScheduleOption(assignment.shift_type);
        setSelectedManualSoldier("");
        setSelectedAdditionalSoldier(assignment.manual_soldier_id || "");
      }
      setSelectedDeadlineTime(assignment.deadline_time || "");
    } else {
      // No assignment
      setAssignmentType("schedule");
      setSelectedScheduleOption("");
      setSelectedManualSoldier("");
      setSelectedAdditionalSoldier("");
      setSelectedDeadlineTime("");
    }
    
    setAssignDialogOpen(true);
  };

  const handleSaveAssignment = () => {
    if (!currentCell) return;
    
    const key = `${currentCell.itemId}-${currentCell.paradeDay}`;
    const newChanges = new Map(pendingChanges);
    
    if (assignmentType === "schedule" && selectedScheduleOption) {
      // Schedule-based: store the day-shift combo as shift_type
      newChanges.set(key, {
        item_id: currentCell.itemId,
        parade_day: currentCell.paradeDay,
        shift_type: selectedScheduleOption, // e.g., "0-morning" for Sunday Morning
        manual_soldier_id: selectedAdditionalSoldier || null,
        deadline_time: selectedDeadlineTime || null
      });
    } else if (assignmentType === "manual" && selectedManualSoldier) {
      // Manual only: store soldier_id without shift_type
      newChanges.set(key, {
        item_id: currentCell.itemId,
        parade_day: currentCell.paradeDay,
        shift_type: `manual-${selectedManualSoldier}`, // Mark as manual
        manual_soldier_id: selectedManualSoldier,
        deadline_time: selectedDeadlineTime || null
      });
    } else {
      // Clear assignment
      newChanges.set(key, null);
    }
    
    setPendingChanges(newChanges);
    setAssignDialogOpen(false);
    setCurrentCell(null);
  };

  const clearAssignment = (itemId: string, paradeDay: number) => {
    const key = `${itemId}-${paradeDay}`;
    const newChanges = new Map(pendingChanges);
    newChanges.set(key, null);
    setPendingChanges(newChanges);
  };

  const saveAssignments = async () => {
    if (pendingChanges.size === 0) return;
    
    setIsSaving(true);
    try {
      const toDelete: string[] = [];
      const toInsert: { outpost: string; item_id: string; parade_day: number; shift_type: string; manual_soldier_id?: string | null; deadline_time?: string | null }[] = [];
      const toUpdate: { id: string; shift_type: string; manual_soldier_id?: string | null; deadline_time?: string | null }[] = [];
      
      pendingChanges.forEach((value, key) => {
        const existing = assignments.get(key);
        
        if (value === null) {
          if (existing?.id) {
            toDelete.push(existing.id);
          }
        } else if (existing?.id) {
          toUpdate.push({ 
            id: existing.id, 
            shift_type: value.shift_type!,
            manual_soldier_id: value.manual_soldier_id ?? null,
            deadline_time: value.deadline_time ?? null
          });
        } else {
          toInsert.push({
            outpost,
            item_id: value.item_id!,
            parade_day: value.parade_day!,
            shift_type: value.shift_type!,
            manual_soldier_id: value.manual_soldier_id ?? null,
            deadline_time: value.deadline_time ?? null
          });
        }
      });
      
      console.log("Saving assignments - Delete:", toDelete, "Insert:", toInsert, "Update:", toUpdate);
      
      let hasError = false;
      
      if (toDelete.length > 0) {
        const { error } = await (supabase as any)
          .from("cleaning_item_assignments")
          .delete()
          .in("id", toDelete);
        if (error) {
          console.error("Delete error:", error);
          hasError = true;
        }
      }
      
      for (const update of toUpdate) {
        const { error } = await (supabase as any)
          .from("cleaning_item_assignments")
          .update({ 
            shift_type: update.shift_type, 
            manual_soldier_id: update.manual_soldier_id,
            deadline_time: update.deadline_time
          })
          .eq("id", update.id);
        if (error) {
          console.error("Update error:", error);
          hasError = true;
        }
      }
      
      if (toInsert.length > 0) {
        const { data, error } = await (supabase as any)
          .from("cleaning_item_assignments")
          .insert(toInsert)
          .select();
        console.log("Insert result:", data, error);
        if (error) {
          console.error("Insert error:", error);
          hasError = true;
        }
      }
      
      if (hasError) {
        toast.error("שגיאה בשמירה - בדוק הרשאות");
      } else {
        toast.success("השיוכים נשמרו בהצלחה");
      }
      await fetchAssignments();
    } catch (error) {
      console.error("Save error:", error);
      toast.error("שגיאה בשמירה");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveItem = async () => {
    if (!itemForm.item_name.trim()) {
      toast.error("יש להזין שם פריט");
      return;
    }

    try {
      if (editingItem) {
        await supabase
          .from("cleaning_checklist_items")
          .update({ item_name: itemForm.item_name })
          .eq("id", editingItem.id);
        toast.success("הפריט עודכן");
      } else {
        await supabase.from("cleaning_checklist_items").insert({
          outpost,
          item_name: itemForm.item_name,
          item_order: checklistItems.length,
        });
        toast.success("הפריט נוסף");
      }

      setItemDialogOpen(false);
      setEditingItem(null);
      setItemForm({ item_name: "" });
      onRefresh();
    } catch (error) {
      toast.error("שגיאה בשמירה");
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm("האם למחוק את הפריט?")) return;
    await supabase.from("cleaning_checklist_items").delete().eq("id", id);
    await (supabase as any).from("cleaning_item_assignments").delete().eq("item_id", id);
    toast.success("הפריט נמחק");
    onRefresh();
    fetchAssignments();
  };

  const handleSaveParadeDays = async () => {
    try {
      await supabase
        .from("cleaning_parade_config")
        .delete()
        .eq("outpost", outpost);

      if (selectedParadeDays.length > 0) {
        await supabase
          .from("cleaning_parade_config")
          .insert(selectedParadeDays.map(day => ({
            outpost,
            day_of_week: day,
            is_active: true
          })));
      }

      toast.success("ימי המסדר נשמרו");
      setConfigDialogOpen(false);
      fetchParadeDays();
    } catch (error) {
      toast.error("שגיאה בשמירה");
    }
  };

  const getPhotoCount = (itemId: string) => {
    return referencePhotos.filter(p => p.checklist_item_id === itemId).length;
  };

  // Parse assignment to get display info
  const getAssignmentDisplay = (assignment: ItemAssignment | null) => {
    if (!assignment || !assignment.shift_type) return null;
    
    // Check if manual assignment
    if (assignment.shift_type.startsWith("manual-")) {
      const soldierId = assignment.shift_type.replace("manual-", "");
      const soldier = soldiers.find(s => s.id === soldierId);
      return {
        type: "manual" as const,
        soldier: soldier,
        additional: null,
        label: "שיבוץ ידני"
      };
    }
    
    // Schedule-based assignment: "day-shift" format
    const [dayStr, shift] = assignment.shift_type.split("-");
    const day = parseInt(dayStr);
    const dayInfo = DAYS_OF_WEEK.find(d => d.value === day);
    const shiftInfo = SHIFT_TYPES.find(s => s.value === shift);
    const soldier = getSoldierFromSchedule(day, shift);
    const additional = assignment.manual_soldier_id 
      ? soldiers.find(s => s.id === assignment.manual_soldier_id) 
      : null;
    
    return {
      type: "schedule" as const,
      day: dayInfo,
      shift: shiftInfo,
      soldier,
      additional,
      label: `${dayInfo?.short || ""} ${shiftInfo?.label || ""}`
    };
  };

  const activeParadeDays = paradeDays
    .filter(d => d.is_active)
    .sort((a, b) => a.day_of_week - b.day_of_week);

  const hasChanges = pendingChanges.size > 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="border-slate-200/60 shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <ListChecks className="w-5 h-5 text-primary" />
              טבלת הקצאת משימות
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setConfigDialogOpen(true)}>
                <Settings className="w-4 h-4 ml-1" />
                ימי מסדר
              </Button>
              <Button size="sm" onClick={() => {
                setEditingItem(null);
                setItemForm({ item_name: "" });
                setItemDialogOpen(true);
              }}>
                <Plus className="w-4 h-4 ml-1" />
                פריט
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0 pb-3">
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs text-slate-500">ימי מסדר:</span>
            {activeParadeDays.length === 0 ? (
              <Badge variant="outline" className="text-xs text-slate-400">לא הוגדרו - לחץ על "ימי מסדר"</Badge>
            ) : (
              activeParadeDays.map(day => (
                <Badge key={day.id} variant="secondary" className="text-xs">
                  {DAYS_OF_WEEK.find(d => d.value === day.day_of_week)?.label}
                </Badge>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Assignment Matrix */}
      {activeParadeDays.length > 0 && checklistItems.length > 0 && (
        <Card className="border-primary/20 shadow-lg overflow-hidden">
          <CardHeader className="pb-2 bg-gradient-to-r from-primary/5 to-transparent">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  הקצאת אחריות לפי יום מסדר
                </CardTitle>
                <p className="text-[10px] text-slate-500 mt-1">
                  לחץ על תא כדי לבחור משמרת מסידור העבודה או שיבוץ ידני
                </p>
              </div>
              {hasChanges && (
                <Button 
                  size="sm" 
                  onClick={saveAssignments}
                  disabled={isSaving}
                  className="gap-1"
                >
                  <Save className="w-4 h-4" />
                  שמור
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="w-full whitespace-nowrap">
              <div className="min-w-max">
                {/* Header Row */}
                <div className="flex border-b-2 border-slate-200 bg-slate-50">
                  <div className="w-32 shrink-0 p-2 font-bold text-xs border-l border-slate-200 sticky right-0 bg-slate-50 z-20">
                    פריט
                  </div>
                  {activeParadeDays.map(day => (
                    <div 
                      key={day.day_of_week} 
                      className="w-32 shrink-0 p-2 border-l border-slate-200 text-center"
                    >
                      <div className="font-bold text-xs">
                        {DAYS_OF_WEEK.find(d => d.value === day.day_of_week)?.label}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Item Rows */}
                {checklistItems.map((item, index) => (
                  <div 
                    key={item.id} 
                    className={cn(
                      "flex border-b border-slate-100",
                      index % 2 === 0 ? "bg-white" : "bg-slate-50/50"
                    )}
                  >
                    {/* Item Name - Sticky */}
                    <div className={cn(
                      "w-32 shrink-0 p-2 border-l border-slate-200 sticky right-0 z-10",
                      index % 2 === 0 ? "bg-white" : "bg-slate-50"
                    )}>
                      <div className="flex items-center gap-1">
                        <span className="w-4 h-4 flex items-center justify-center bg-primary/10 text-primary text-[9px] font-bold rounded shrink-0">
                          {index + 1}
                        </span>
                        <span className="text-xs font-medium truncate flex-1">{item.item_name}</span>
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-5 w-5"
                          onClick={() => onAddPhoto(item)}
                        >
                          <Camera className="w-3 h-3 text-purple-500" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-5 w-5"
                          onClick={() => {
                            setEditingItem(item);
                            setItemForm({ item_name: item.item_name });
                            setItemDialogOpen(true);
                          }}
                        >
                          <Edit className="w-3 h-3 text-slate-500" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-5 w-5"
                          onClick={() => handleDeleteItem(item.id)}
                        >
                          <Trash2 className="w-3 h-3 text-red-500" />
                        </Button>
                      </div>
                    </div>

                    {/* Assignment Cells */}
                    {activeParadeDays.map(day => {
                      const assignment = getAssignment(item.id, day.day_of_week);
                      const key = `${item.id}-${day.day_of_week}`;
                      const isPending = pendingChanges.has(key);
                      const display = getAssignmentDisplay(assignment);
                      
                      return (
                        <div 
                          key={day.day_of_week} 
                          className={cn(
                            "w-32 shrink-0 p-1.5 border-l border-slate-200 flex flex-col gap-1 cursor-pointer hover:bg-slate-100 transition-colors",
                            isPending && "bg-amber-50"
                          )}
                          onClick={() => openAssignmentDialog(item.id, day.day_of_week)}
                        >
                          {display ? (
                            <>
                              {/* Assignment Badge */}
                              <div className={cn(
                                "text-[9px] px-1.5 py-1 rounded text-center font-medium",
                                display.type === "manual" 
                                  ? "bg-blue-100 text-blue-700" 
                                  : display.shift?.color || "bg-slate-100"
                              )}>
                                {display.label}
                              </div>
                              
                              {/* Soldier Name */}
                              {display.soldier && (
                                <div className="text-[10px] text-slate-700 truncate text-center bg-slate-100 rounded px-1 py-0.5 flex items-center justify-center gap-1">
                                  <User className="w-2.5 h-2.5" />
                                  {display.soldier.full_name.split(" ")[0]}
                                </div>
                              )}
                              
                              {/* Additional Soldier */}
                              {display.additional && (
                                <div className="text-[9px] text-purple-700 truncate text-center bg-purple-100 rounded px-1 py-0.5 flex items-center justify-center gap-0.5">
                                  <UserPlus className="w-2.5 h-2.5" />
                                  {display.additional.full_name.split(" ")[0]}
                                </div>
                              )}
                              
                              {/* Execution Time */}
                              {assignment?.deadline_time && (
                                <div className="text-[9px] text-primary truncate text-center bg-primary/10 rounded px-1 py-0.5 flex items-center justify-center gap-0.5">
                                  <Clock className="w-2.5 h-2.5" />
                                  {assignment.deadline_time.substring(0, 5)}
                                </div>
                              )}
                              {/* Clear button */}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 text-[9px] text-red-500 hover:text-red-700 hover:bg-red-50"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  clearAssignment(item.id, day.day_of_week);
                                }}
                              >
                                <X className="w-3 h-3 ml-0.5" />
                                נקה
                              </Button>
                            </>
                          ) : (
                            <div className="flex items-center justify-center h-full min-h-[60px] text-slate-400">
                              <Plus className="w-4 h-4" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </CardContent>
          
          {hasChanges && (
            <div className="p-3 bg-amber-50 border-t border-amber-200 flex items-center justify-between">
              <span className="text-xs text-amber-700">יש שינויים שלא נשמרו</span>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setPendingChanges(new Map())}
                >
                  בטל
                </Button>
                <Button 
                  size="sm" 
                  onClick={saveAssignments}
                  disabled={isSaving}
                >
                  <Save className="w-4 h-4 ml-1" />
                  שמור
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Empty State */}
      {(activeParadeDays.length === 0 || checklistItems.length === 0) && (
        <Card className="border-dashed border-2 border-slate-200">
          <CardContent className="py-8 text-center text-slate-500">
            {activeParadeDays.length === 0 ? (
              <>
                <Calendar className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                <p className="font-medium">לא הוגדרו ימי מסדר</p>
                <p className="text-sm">לחץ על "ימי מסדר" כדי להגדיר</p>
              </>
            ) : (
              <>
                <ListChecks className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                <p className="font-medium">אין פריטי צ'קליסט</p>
                <p className="text-sm">לחץ על "פריט" כדי להוסיף</p>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Item Dialog */}
      <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingItem ? "עריכת פריט" : "הוספת פריט"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>שם הפריט *</Label>
              <Input
                value={itemForm.item_name}
                onChange={(e) => setItemForm({ item_name: e.target.value })}
                placeholder="לדוגמה: ריקון פחים"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setItemDialogOpen(false)}>ביטול</Button>
            <Button onClick={handleSaveItem}>שמור</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Parade Days Config Dialog */}
      <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              הגדרת ימי מסדר
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-slate-600">
              בחר באילו ימים מתקיים מסדר ניקיון.
            </p>
            <div className="space-y-2">
              {DAYS_OF_WEEK.map(day => (
                <label 
                  key={day.value} 
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 cursor-pointer border"
                >
                  <Checkbox
                    checked={selectedParadeDays.includes(day.value)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedParadeDays([...selectedParadeDays, day.value]);
                      } else {
                        setSelectedParadeDays(selectedParadeDays.filter(d => d !== day.value));
                      }
                    }}
                  />
                  <span className="font-medium">יום {day.label}</span>
                </label>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigDialogOpen(false)}>ביטול</Button>
            <Button onClick={handleSaveParadeDays}>שמור</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assignment Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              הגדרת שיבוץ
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Assignment Type Selection */}
            <div className="space-y-2">
              <Label>סוג שיבוץ</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={assignmentType === "schedule" ? "default" : "outline"}
                  size="sm"
                  className="flex-1"
                  onClick={() => setAssignmentType("schedule")}
                >
                  <Calendar className="w-4 h-4 ml-1" />
                  לפי סידור עבודה
                </Button>
                <Button
                  type="button"
                  variant={assignmentType === "manual" ? "default" : "outline"}
                  size="sm"
                  className="flex-1"
                  onClick={() => setAssignmentType("manual")}
                >
                  <User className="w-4 h-4 ml-1" />
                  שיבוץ ידני
                </Button>
              </div>
            </div>

            {assignmentType === "schedule" ? (
              <>
                {/* Schedule Option Selection */}
                <div className="space-y-2">
                  <Label>בחר יום ומשמרת מסידור העבודה</Label>
                  <Select
                    value={selectedScheduleOption}
                    onValueChange={setSelectedScheduleOption}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="בחר יום + משמרת" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {SCHEDULE_OPTIONS.map(option => {
                        const soldier = getSoldierFromSchedule(option.day, option.shift, option.isPrevWeek);
                        const ShiftIcon = SHIFT_TYPES.find(s => s.value === option.shift)?.icon || Sun;
                        return (
                          <SelectItem key={option.value} value={option.value}>
                            <div className="flex items-center gap-2">
                              <ShiftIcon className={cn(
                                "w-3 h-3",
                                option.shift === "morning" && "text-amber-500",
                                option.shift === "afternoon" && "text-orange-500",
                                option.shift === "evening" && "text-emerald-500"
                              )} />
                              <span>{option.dayLabel} - {option.shiftLabel}</span>
                              {soldier && (
                                <span className="text-xs text-slate-500">
                                  ({soldier.full_name.split(" ")[0]})
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  {selectedScheduleOption && (
                    <p className="text-xs text-slate-500">
                      מי שמשובץ במשמרת הזו בסידור העבודה יהיה אחראי על המשימה
                    </p>
                  )}
                </div>

                {/* Additional Soldier Option */}
                {selectedScheduleOption && (
                  <div className="space-y-2 border-t pt-4">
                    <Label className="flex items-center gap-2">
                      <UserPlus className="w-4 h-4 text-purple-500" />
                      הוסף חייל נוסף (אופציונלי)
                    </Label>
                    <Select
                      value={selectedAdditionalSoldier || "none"}
                      onValueChange={(val) => setSelectedAdditionalSoldier(val === "none" ? "" : val)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="בחר חייל נוסף" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">ללא</SelectItem>
                        {soldiers.map(soldier => (
                          <SelectItem key={soldier.id} value={soldier.id}>
                            {soldier.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-slate-500">
                      במידה ויש יותר מ-3 חיילים במוצב, ניתן להוסיף חייל נוסף לאחריות
                    </p>
                  </div>
                )}
              </>
            ) : (
              /* Manual Soldier Selection */
              <div className="space-y-2">
                <Label>בחר חייל</Label>
                <Select
                  value={selectedManualSoldier}
                  onValueChange={setSelectedManualSoldier}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="בחר חייל" />
                  </SelectTrigger>
                  <SelectContent>
                    {soldiers.map(soldier => (
                      <SelectItem key={soldier.id} value={soldier.id}>
                        {soldier.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500">
                  החייל הנבחר יהיה אחראי על המשימה ללא קשר לסידור העבודה
                </p>
              </div>
            )}

            {/* Execution Time - Available for both types */}
            <div className="space-y-2 border-t pt-4">
              <Label className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                שעת ביצוע המסדר (אופציונלי)
              </Label>
              <TimePicker
                value={selectedDeadlineTime}
                onChange={setSelectedDeadlineTime}
                placeholder="בחר שעת ביצוע"
              />
              <p className="text-xs text-slate-500">
                הגדר שעת ביצוע מומלצת למשימה
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>ביטול</Button>
            <Button onClick={handleSaveAssignment}>שמור</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}