import type { Outpost, ShiftType, DrillType } from "@/lib/constants";

export interface ShiftReport {
  id: string;
  createdAt: Date;
  
  // Page 1 - General Details
  dateTime: Date;
  outpost: Outpost;
  driverName: string;
  vehicleNumber: string;
  shiftType: ShiftType;
  
  // Page 2 - Briefings
  emergencyProcedure: boolean;
  commanderBriefing: boolean;
  workCardFilled: boolean;
  
  // Page 3 - Equipment & Readiness
  combatEquipment: string[];
  preMovementChecks: string[];
  driverTools: string[];
  
  // Page 4 - Drills
  drillsCompleted: string[];
  safetyVulnerabilities: string[];
  vardimProcedure: string;
  vardimPoints: string[];
  
  // Page 5 - Photos
  photos: {
    front?: string;
    left?: string;
    right?: string;
    back?: string;
    steering?: string;
  };
}

export interface DrillLocation {
  id: string;
  outpost: Outpost;
  drillType: DrillType;
  description: string;
  imageUrl?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface SafetyPoint {
  id: string;
  outpost: Outpost;
  type: "vardim" | "vulnerability" | "parsa";
  title: string;
  description: string;
  imageUrl?: string;
}

export interface SafetyEvent {
  id: string;
  type: "flag" | "area" | "neighbor" | "monthly";
  title: string;
  description: string;
  date: Date;
  imageUrls?: string[];
  videoUrl?: string;
  pdfUrl?: string;
}

export interface TrainingVideo {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl?: string;
}

export interface Procedure {
  id: string;
  title: string;
  content: string;
  pdfUrl?: string;
  lastUpdated: Date;
}

export interface User {
  id: string;
  name: string;
  role: "driver" | "admin";
  outpost?: Outpost;
}
