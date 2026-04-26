import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Loader2, Trash2, Calendar, Pencil, Lock } from "lucide-react";
import type { WeeklyScheduleItem } from "@/hooks/useWeeklyMeeting";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { TimePicker } from "./TimePicker";

interface ScheduleSectionProps {
  schedule: WeeklyScheduleItem[];
  onAdd: (item: Omit<WeeklyScheduleItem, 'id' | 'weekly_opening_id'>) => Promise<any>;
  onUpdate: (id: string, updates: Partial<WeeklyScheduleItem>) => Promise<any>;
  onDelete: (id: string) => Promise<any>;
  isLoading: boolean;
  isLocked?: boolean;
}

const DAYS = [
  { value: 0, label: "ראשון", short: "א'" },
  { value: 1, label: "שני", short: "ב'" },
  { value: 2, label: "שלישי", short: "ג'" },
  { value: 3, label: "רביעי", short: "ד'" },
  { value: 4, label: "חמישי", short: "ה'" },
  { value: 5, label: "שישי", short: "ו'" },
  { value: 6, label: "שבת", short: "ש'" },
];

// Time slots for Outlook-style view
const TIME_SLOTS = [
  "06:00", "07:00", "08:00", "09:00", "10:00", "11:00", "12:00",
  "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00"
];

export function ScheduleSection({ schedule, onAdd, onUpdate, onDelete, isLoading, isLocked = false }: ScheduleSectionProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<WeeklyScheduleItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number>(0);
  
  // Form state for adding/editing task
  const [taskTitle, setTaskTitle] = useState("");
  const [taskTime, setTaskTime] = useState("");
  const [taskEndTime, setTaskEndTime] = useState("");

  const handleOpenAddDialog = (day?: number) => {
    if (isLocked) return;
    setSelectedDay(day ?? 0);
    setTaskTitle("");
    setTaskTime("");
    setTaskEndTime("");
    setIsAddDialogOpen(true);
  };

  const handleOpenEditDialog = (task: WeeklyScheduleItem) => {
    if (isLocked) return;
    setEditingTask(task);
    setSelectedDay(task.scheduled_day);
    setTaskTitle(task.title);
    setTaskTime(task.scheduled_time?.substring(0, 5) || "");
    setTaskEndTime(task.end_time?.substring(0, 5) || "");
    setIsEditDialogOpen(true);
  };

  const handleAdd = async () => {
    if (!taskTitle) return;
    setIsSubmitting(true);
    
    await onAdd({
      schedule_type: "custom",
      title: taskTitle,
      description: null,
      scheduled_day: selectedDay,
      scheduled_time: taskTime || null,
      end_time: taskEndTime || null,
      completed: false
    });
    
    // Reset form
    setTaskTitle("");
    setTaskTime("");
    setTaskEndTime("");
    setIsAddDialogOpen(false);
    setIsSubmitting(false);
  };

  const handleEdit = async () => {
    if (!editingTask || !taskTitle) return;
    setIsSubmitting(true);
    
    await onUpdate(editingTask.id, {
      title: taskTitle,
      scheduled_day: selectedDay,
      scheduled_time: taskTime || null,
      end_time: taskEndTime || null,
    });
    
    // Reset form
    setTaskTitle("");
    setTaskTime("");
    setTaskEndTime("");
    setEditingTask(null);
    setIsEditDialogOpen(false);
    setIsSubmitting(false);
  };

  // Get tasks for a specific day
  const getTasksForDay = (day: number) => {
    return schedule
      .filter(s => s.scheduled_day === day)
      .sort((a, b) => {
        if (!a.scheduled_time) return 1;
        if (!b.scheduled_time) return -1;
        return a.scheduled_time.localeCompare(b.scheduled_time);
      });
  };

  // Get task position based on time
  const getTaskPosition = (time: string | null) => {
    if (!time) return 0;
    const [hours, minutes] = time.split(":").map(Number);
    const startHour = 6; // Starting from 06:00
    return Math.max(0, (hours - startHour) * 48 + (minutes / 60) * 48); // 48px per hour
  };

  // Get task height based on duration (end_time - scheduled_time)
  const getTaskHeight = (startTime: string | null, endTime: string | null) => {
    if (!startTime) return 40; // Minimum height
    if (!endTime) return 40; // Default 1-hour if no end time
    
    const [startHours, startMins] = startTime.split(":").map(Number);
    const [endHours, endMins] = endTime.split(":").map(Number);
    
    const startTotal = startHours * 60 + startMins;
    const endTotal = endHours * 60 + endMins;
    const durationMins = endTotal - startTotal;
    
    if (durationMins <= 0) return 40; // Invalid duration
    
    // 48px per hour = 0.8px per minute
    return Math.max(40, (durationMins / 60) * 48);
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

  return (
    <Card className="bg-white border-slate-200 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg flex items-center gap-2 text-slate-800">
              <Calendar className="w-5 h-5 text-blue-600" />
              לוח זמנים שבועי
            </CardTitle>
            {isLocked && (
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                <Lock className="w-3 h-3 ml-1" />
                נעול
              </Badge>
            )}
          </div>
          {!isLocked && (
            <Button size="sm" onClick={() => handleOpenAddDialog()}>
              <Plus className="w-4 h-4 ml-1" />
              הוסף אירוע
            </Button>
          )}
        </div>
        {isLocked && (
          <p className="text-xs text-amber-600 mt-2">הלו"ז נעול לאחר שהוזן סיכום מ"פ</p>
        )}
      </CardHeader>
      <CardContent className="p-0">
        {/* Outlook-style Calendar View */}
        <ScrollArea className="w-full">
          <div className="min-w-[800px]">
            {/* Header row with days */}
            <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-slate-200 bg-slate-50">
              <div className="p-2 text-center text-xs text-slate-500 border-l border-slate-200">שעה</div>
              {DAYS.map((day) => (
                <div
                  key={day.value}
                  className="p-2 text-center border-l border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => handleOpenAddDialog(day.value)}
                >
                  <div className="font-bold text-sm text-slate-800">{day.short}</div>
                  <div className="text-[10px] text-slate-500">יום {day.label}</div>
                </div>
              ))}
            </div>

            {/* Time grid */}
            <div className="relative">
              {/* Time labels and grid lines */}
              {TIME_SLOTS.map((time, index) => (
                <div key={time} className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-slate-100">
                  <div className="p-2 text-xs text-slate-400 text-center border-l border-slate-200 h-12">
                    {time}
                  </div>
                  {DAYS.map((day) => (
                    <div
                      key={`${day.value}-${time}`}
                      className="border-l border-slate-100 h-12 hover:bg-blue-50/50 cursor-pointer transition-colors"
                      onClick={() => {
                        if (isLocked) return;
                        setSelectedDay(day.value);
                        setTaskTime(time);
                        setTaskEndTime("");
                        setTaskTitle("");
                        setIsAddDialogOpen(true);
                      }}
                    />
                  ))}
                </div>
              ))}

              {/* Events overlay */}
              <div className="absolute top-0 left-0 right-0 bottom-0 pointer-events-none">
                <div className="grid grid-cols-[60px_repeat(7,1fr)] h-full">
                  <div /> {/* Empty space for time column */}
                  {DAYS.map((day) => {
                    const dayTasks = getTasksForDay(day.value);
                    return (
                      <div key={day.value} className="relative border-l border-slate-100">
                        {dayTasks.map((task) => {
                          const topPosition = getTaskPosition(task.scheduled_time);
                          const taskHeight = getTaskHeight(task.scheduled_time, task.end_time);
                          return (
                            <div
                              key={task.id}
                              className={`absolute left-1 right-1 p-1.5 rounded-md text-xs pointer-events-auto cursor-pointer transition-all hover:shadow-md overflow-hidden ${
                                task.completed
                                  ? "bg-green-100 border border-green-300"
                                  : "bg-blue-100 border border-blue-300"
                              }`}
                              style={{ top: `${topPosition}px`, height: `${taskHeight}px`, minHeight: "40px" }}
                              onClick={() => !isLocked && handleOpenEditDialog(task)}
                            >
                              <div className="flex items-start gap-1 h-full">
                                <Checkbox
                                  checked={task.completed}
                                  onCheckedChange={(checked) => onUpdate(task.id, { completed: !!checked })}
                                  className="mt-0.5 h-3 w-3 flex-shrink-0"
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <div className={`flex-1 overflow-hidden ${task.completed ? "line-through opacity-60" : ""}`}>
                                  {task.scheduled_time && (
                                    <span className="font-bold text-slate-700 block text-[10px]">
                                      {task.scheduled_time.substring(0, 5)}
                                      {task.end_time && ` - ${task.end_time.substring(0, 5)}`}
                                    </span>
                                  )}
                                  <span className="text-slate-700 line-clamp-3">{task.title}</span>
                                </div>
                                <div className="flex flex-col gap-1 flex-shrink-0">
                                  {!isLocked && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-4 w-4 text-blue-500 hover:text-blue-600 hover:bg-blue-100"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenEditDialog(task);
                                      }}
                                    >
                                      <Pencil className="w-3 h-3" />
                                    </Button>
                                  )}
                                  {!isLocked && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-4 w-4 text-red-500 hover:text-red-600 hover:bg-red-100"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onDelete(task.id);
                                      }}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        {/* Quick Summary */}
        <div className="p-4 border-t border-slate-200 bg-slate-50">
          <h4 className="text-sm font-medium text-slate-700 mb-3">סיכום אירועים</h4>
          <div className="grid grid-cols-7 gap-2">
            {DAYS.map((day) => {
              const dayTasks = getTasksForDay(day.value);
              const completedCount = dayTasks.filter(t => t.completed).length;
              return (
                <div
                  key={day.value}
                  className="bg-white rounded-lg p-2 text-center border border-slate-200 cursor-pointer hover:border-primary transition-colors"
                  onClick={() => handleOpenAddDialog(day.value)}
                >
                  <div className="font-bold text-xs text-slate-700">{day.short}</div>
                  <div className="text-lg font-bold text-primary">{dayTasks.length}</div>
                  <div className="text-[10px] text-slate-500">
                    {completedCount}/{dayTasks.length} הושלמו
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>

      {/* Add Event Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle className="text-slate-800">הוספת אירוע ללוז</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-slate-700">יום</Label>
              <Select value={String(selectedDay)} onValueChange={(v) => setSelectedDay(parseInt(v))}>
                <SelectTrigger className="bg-white text-slate-800 border-slate-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {DAYS.map((day) => (
                    <SelectItem key={day.value} value={String(day.value)} className="text-slate-800">
                      יום {day.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-700">שעת התחלה</Label>
              <TimePicker
                value={taskTime}
                onChange={setTaskTime}
                placeholder="בחר שעת התחלה"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-700">שעת סיום (אופציונלי)</Label>
              <TimePicker
                value={taskEndTime}
                onChange={setTaskEndTime}
                placeholder="בחר שעת סיום"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-700">כותרת האירוע</Label>
              <Input
                placeholder="תאר את האירוע..."
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                className="bg-white text-slate-800 border-slate-300 placeholder:text-slate-400"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              ביטול
            </Button>
            <Button onClick={handleAdd} disabled={!taskTitle || isSubmitting}>
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "הוסף אירוע"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Event Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle className="text-slate-800">עריכת אירוע</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-slate-700">יום</Label>
              <Select value={String(selectedDay)} onValueChange={(v) => setSelectedDay(parseInt(v))}>
                <SelectTrigger className="bg-white text-slate-800 border-slate-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {DAYS.map((day) => (
                    <SelectItem key={day.value} value={String(day.value)} className="text-slate-800">
                      יום {day.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-700">שעת התחלה</Label>
              <TimePicker
                value={taskTime}
                onChange={setTaskTime}
                placeholder="בחר שעת התחלה"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-700">שעת סיום (אופציונלי)</Label>
              <TimePicker
                value={taskEndTime}
                onChange={setTaskEndTime}
                placeholder="בחר שעת סיום"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-700">כותרת האירוע</Label>
              <Input
                placeholder="תאר את האירוע..."
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                className="bg-white text-slate-800 border-slate-300 placeholder:text-slate-400"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              ביטול
            </Button>
            <Button onClick={handleEdit} disabled={!taskTitle || isSubmitting}>
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "שמור שינויים"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}