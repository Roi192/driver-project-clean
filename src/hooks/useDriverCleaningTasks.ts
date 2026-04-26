import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfWeek, addDays, isToday, isBefore, startOfDay } from "date-fns";

// Types
export interface CleaningTask {
  itemId: string;
  itemName: string;
  outpost: string;
  shiftType: string;
  paradeDay: number;
  deadlineTime: string | null;
  date: Date;
  isToday: boolean;
  isPast: boolean;
  isCompleted: boolean;
  isManualAssignment: boolean;
}

interface ItemAssignment {
  id: string;
  item_id: string;
  parade_day: number;
  shift_type: string;
  outpost: string;
  manual_soldier_id: string | null;
}

interface ChecklistItem {
  id: string;
  item_name: string;
  outpost: string;
}

interface WorkScheduleEntry {
  outpost: string;
  day_of_week: number;
  morning_soldier_id: string | null;
  afternoon_soldier_id: string | null;
  evening_soldier_id: string | null;
}

interface ParadeDay {
  outpost: string;
  day_of_week: number;
  is_active: boolean;
}

const DAY_LABELS: Record<number, string> = {
  0: "ראשון",
  1: "שני",
  2: "שלישי",
  3: "רביעי",
  4: "חמישי",
  5: "שישי",
  6: "שבת"
};

export function useDriverCleaningTasks(soldierId: string | null, soldierOutpost: string | null) {
  const [tasks, setTasks] = useState<CleaningTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTasks = useCallback(async () => {
    if (!soldierId) {
      setTasks([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const weekStart = startOfWeek(new Date(), { weekStartsOn: 0 });
      const weekStartStr = format(weekStart, "yyyy-MM-dd");
      const today = startOfDay(new Date());

      console.log("[useDriverCleaningTasks] Loading tasks for soldier:", soldierId, "weekStart:", weekStartStr);

      // Fetch all data in parallel
      const [assignmentsResult, scheduleResult, itemsResult, paradeDaysResult, submissionsResult] = await Promise.all([
        supabase
          .from("cleaning_item_assignments")
          .select("*"),
        supabase
          .from("work_schedule")
          .select("outpost, day_of_week, morning_soldier_id, afternoon_soldier_id, evening_soldier_id")
          .eq("week_start_date", weekStartStr),
        supabase
          .from("cleaning_checklist_items")
          .select("id, item_name, outpost")
          .eq("is_active", true),
        supabase
          .from("cleaning_parade_config")
          .select("outpost, day_of_week, is_active")
          .eq("is_active", true),
        supabase
          .from("cleaning_parade_submissions")
          .select("*")
          .eq("soldier_id", soldierId)
          .gte("parade_date", weekStartStr)
      ]);

      const assignments = (assignmentsResult.data || []) as ItemAssignment[];
      const schedule = (scheduleResult.data || []) as WorkScheduleEntry[];
      const items = (itemsResult.data || []) as ChecklistItem[];
      const paradeDays = (paradeDaysResult.data || []) as ParadeDay[];
      const submissions = submissionsResult.data || [];

      console.log("[useDriverCleaningTasks] Loaded:", {
        assignments: assignments.length,
        schedule: schedule.length,
        items: items.length,
        paradeDays: paradeDays.length,
        scheduleData: schedule
      });

      const tasksForSoldier: CleaningTask[] = [];

      // For each assignment, check if soldier is responsible
      for (const assignment of assignments) {
        // Check if this is a parade day
        const paradeDay = paradeDays.find(
          p => p.outpost === assignment.outpost && p.day_of_week === assignment.parade_day
        );
        if (!paradeDay) {
          console.log("[useDriverCleaningTasks] Skipping - not a parade day:", assignment);
          continue;
        }

        // Get item details
        const item = items.find(i => i.id === assignment.item_id);
        if (!item) {
          console.log("[useDriverCleaningTasks] Skipping - item not found:", assignment.item_id);
          continue;
        }

        let isSoldierResponsible = false;
        let isManualAssignment = false;

        // Parse the shift_type to determine responsibility
        if (assignment.shift_type?.startsWith("manual-")) {
          // Manual assignment: check if soldier ID matches
          const manualSoldierId = assignment.shift_type.replace("manual-", "");
          console.log("[useDriverCleaningTasks] Checking manual assignment:", manualSoldierId, "vs", soldierId);
          if (manualSoldierId === soldierId) {
            isSoldierResponsible = true;
            isManualAssignment = true;
          }
        } else if (assignment.shift_type) {
          // Schedule-based: parse "day-shift" format (e.g., "0-morning")
          const [sourceDayStr, sourceShift] = assignment.shift_type.split("-");
          const sourceDay = parseInt(sourceDayStr);
          
          console.log("[useDriverCleaningTasks] Checking schedule-based:", {
            shiftType: assignment.shift_type,
            sourceDay,
            sourceShift,
            outpost: assignment.outpost
          });
          
          if (!isNaN(sourceDay) && sourceShift) {
            // Find who is working that shift in the schedule
            const scheduleEntry = schedule.find(
              s => s.outpost === assignment.outpost && s.day_of_week === sourceDay
            );
            
            console.log("[useDriverCleaningTasks] Schedule entry for day", sourceDay, ":", scheduleEntry);
            
            if (scheduleEntry) {
              let shiftSoldierId: string | null = null;
              if (sourceShift === "morning") shiftSoldierId = scheduleEntry.morning_soldier_id;
              else if (sourceShift === "afternoon") shiftSoldierId = scheduleEntry.afternoon_soldier_id;
              else if (sourceShift === "evening") shiftSoldierId = scheduleEntry.evening_soldier_id;
              
              console.log("[useDriverCleaningTasks] Shift soldier:", shiftSoldierId, "vs current:", soldierId);
              
              if (shiftSoldierId === soldierId) {
                isSoldierResponsible = true;
              }
            }
          }
        }

        // Also check if soldier is set as additional soldier
        if (assignment.manual_soldier_id === soldierId) {
          isSoldierResponsible = true;
          isManualAssignment = true;
        }

        console.log("[useDriverCleaningTasks] Assignment result:", {
          itemName: item.item_name,
          isSoldierResponsible,
          isManualAssignment
        });

        if (!isSoldierResponsible) continue;

        const taskDate = addDays(weekStart, assignment.parade_day);
        const isTaskToday = isToday(taskDate);
        const isPast = isBefore(taskDate, today) && !isTaskToday;
        const taskDateStr = format(taskDate, "yyyy-MM-dd");

        // Check if completed
        const submission = submissions.find((s: any) => s.parade_date === taskDateStr);
        const isCompleted = submission?.is_completed || false;

        tasksForSoldier.push({
          itemId: item.id,
          itemName: item.item_name,
          outpost: assignment.outpost,
          shiftType: assignment.shift_type,
          paradeDay: assignment.parade_day,
          deadlineTime: null,
          date: taskDate,
          isToday: isTaskToday,
          isPast,
          isCompleted,
          isManualAssignment
        });
      }

      // Sort by date, then by item name
      tasksForSoldier.sort((a, b) => {
        if (a.date.getTime() !== b.date.getTime()) {
          return a.date.getTime() - b.date.getTime();
        }
        return a.itemName.localeCompare(b.itemName);
      });

      setTasks(tasksForSoldier);
    } catch (err) {
      console.error("Error loading cleaning tasks:", err);
      setError("שגיאה בטעינת המשימות");
    } finally {
      setLoading(false);
    }
  }, [soldierId]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  return { tasks, loading, error, refresh: loadTasks, dayLabels: DAY_LABELS };
}