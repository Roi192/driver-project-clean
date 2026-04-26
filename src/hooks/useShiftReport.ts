import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "./use-toast";
import { COMBAT_EQUIPMENT, PRE_MOVEMENT_CHECKS, DRIVER_TOOLS, DRILLS } from "@/lib/constants";
import { normalizeShiftPhotoPath } from "@/lib/shift-photo-storage";

interface ShiftFormData {
  dateTime: Date;
  outpost: string;
  driverName: string;
  vehicleNumber: string;
  shiftType: string;
  emergencyProcedure: boolean | undefined;
  commanderBriefing: boolean | undefined;
  workCardFilled: boolean | undefined;
  combatEquipment: string[];
  preMovementChecks: string[];
  driverTools: string[];
  drillsCompleted: string[];
  safetyVulnerabilities: string;
  vardimProcedure: string;
  photos: Record<string, string | undefined>;
  vehicleNotes: string;
}

type RequiredPhotoKey = "front" | "left" | "right" | "back" | "steering";

const REQUIRED_PHOTO_KEYS: RequiredPhotoKey[] = ["front", "left", "right", "back", "steering"];

const toStoredPhotoPath = (value: string | undefined, key: RequiredPhotoKey): string => {
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required photo: ${key}`);
  }

  const normalized = normalizeShiftPhotoPath(value);
  if (!normalized) {
    throw new Error(`Invalid photo path: ${key}`);
  }

  return normalized;
};

const mapShiftType = (shiftType: string): "morning" | "afternoon" | "evening" => {
  if (shiftType === "morning" || shiftType === "afternoon" || shiftType === "evening") {
    return shiftType;
  }

  if (shiftType.includes("בוקר")) return "morning";
  if (shiftType.includes("צהריים")) return "afternoon";
  if (shiftType.includes("ערב")) return "evening";

  return "evening";
};

export function useShiftReport() {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resolveAuthenticatedUserId = async (): Promise<string> => {
    if (user?.id) {
      return user.id;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData.session?.user?.id) {
      return sessionData.session.user.id;
    }

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (!authError && authData.user?.id) {
      return authData.user.id;
    }

    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
    if (!refreshError && refreshData.session?.user?.id) {
      return refreshData.session.user.id;
    }

    throw new Error("AUTH_REQUIRED: Missing authenticated session");
  };

  const submitReport = async (formData: ShiftFormData): Promise<boolean> => {
    if (!user) {
      toast({
        title: "שגיאה",
        description: "יש להתחבר כדי לשלוח דיווח",
        variant: "destructive",
      });
      return false;
    }

    setIsSubmitting(true);

    try {
      const authenticatedUserId = await resolveAuthenticatedUserId();

      // Validate all photos are already uploaded (string paths)
      for (const key of REQUIRED_PHOTO_KEYS) {
        const photoValue = formData.photos[key];
        if (!photoValue || photoValue.trim().length === 0) {
          throw new Error(`Missing required photo: ${key}`);
        }
      }

      const reportDate = formData.dateTime.toISOString().split("T")[0];
      const reportTime = formData.dateTime.toTimeString().split(" ")[0];

      const photoFront = toStoredPhotoPath(formData.photos.front, "front");
      const photoLeft = toStoredPhotoPath(formData.photos.left, "left");
      const photoRight = toStoredPhotoPath(formData.photos.right, "right");
      const photoBack = toStoredPhotoPath(formData.photos.back, "back");
      const photoSteering = toStoredPhotoPath(formData.photos.steering, "steering");

      const { error: insertError } = await supabase.from("shift_reports").insert({
        user_id: authenticatedUserId,
        report_date: reportDate,
        report_time: reportTime,
        outpost: formData.outpost,
        driver_name: formData.driverName,
        vehicle_number: formData.vehicleNumber,
        shift_type: mapShiftType(formData.shiftType),
        emergency_procedure_participation: formData.emergencyProcedure ?? false,
        commander_briefing_attendance: formData.commanderBriefing ?? false,
        work_card_completed: formData.workCardFilled ?? false,
        has_ceramic_vest: formData.combatEquipment.includes(COMBAT_EQUIPMENT[0]),
        has_helmet: formData.combatEquipment.includes(COMBAT_EQUIPMENT[1]),
        has_personal_weapon: formData.combatEquipment.includes(COMBAT_EQUIPMENT[2]),
        has_ammunition: formData.combatEquipment.includes(COMBAT_EQUIPMENT[3]),
        pre_movement_checks_completed: formData.preMovementChecks.length === PRE_MOVEMENT_CHECKS.length,
        pre_movement_items_checked: formData.preMovementChecks,
        driver_tools_checked: formData.driverTools.length === DRIVER_TOOLS.length,
        driver_tools_items_checked: formData.driverTools,
        descent_drill_completed: formData.drillsCompleted.includes(DRILLS[0]),
        rollover_drill_completed: formData.drillsCompleted.includes(DRILLS[1]),
        fire_drill_completed: formData.drillsCompleted.includes(DRILLS[2]),
        safety_vulnerabilities: formData.safetyVulnerabilities || null,
        vardim_procedure_explanation: formData.vardimProcedure || null,
        vehicle_notes: formData.vehicleNotes || null,
        photo_front: photoFront,
        photo_left: photoLeft,
        photo_right: photoRight,
        photo_back: photoBack,
        photo_steering_wheel: photoSteering,
        is_complete: true,
      });

      if (insertError) {
        throw insertError;
      }

      return true;
    } catch (error) {
      console.error("Submit error:", error);

      toast({
        title: "שגיאה בשליחת הדיווח",
        description: "שליחת הדיווח נכשלה. נסה שוב.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    submitReport,
    isSubmitting,
  };
}