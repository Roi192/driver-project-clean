import { useState, useEffect, useRef } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { format, startOfMonth, subMonths } from "date-fns";
import { he } from "date-fns/locale";
import { 
  Gauge, 
  Plus, 
  Edit, 
  Trash2, 
  Loader2,
  FileSpreadsheet,
  Search,
  Upload,
  AlertTriangle,
  CheckCircle,
  Calendar,
  TrendingUp,
  User,
  Users,
  MessageCircle,
  FileText,
  ChevronLeft,
  Crown,
  Trophy,
  Star,
  Phone,
  ClipboardCheck
} from "lucide-react";
import * as XLSX from "xlsx";
import unitLogo from "@/assets/unit-logo.png";
import { MONTHS_HEB } from "@/lib/constants";

interface Soldier {
  id: string;
  personal_number: string;
  full_name: string;
  outpost?: string | null;
  is_active?: boolean;
  release_date?: string | null;
  control_removed_at?: string | null;
  qualified_date?: string | null;
  created_at?: string | null;
}

interface SafetyScore {
  id: string;
  soldier_id: string;
  score_month: string;
  safety_score: number;
  kilometers: number | null;
  speed_violations: number | null;
  harsh_braking: number | null;
  harsh_turns: number | null;
  harsh_accelerations: number | null;
  illegal_overtakes: number | null;
  notes: string | null;
  created_at: string;
}

interface SafetyFollowup {
  id: string;
  soldier_id: string;
  followup_type: 'clarification_talk' | 'test';
  followup_month: string;
  completed_at: string;
  notes: string | null;
}

interface MonthlyExcellence {
  id: string;
  soldier_id: string;
  excellence_month: string;
  safety_score: number;
  kilometers: number;
  calculated_score: number;
}

interface SoldierWithScores extends Soldier {
  lastMonthScore?: number | null;
  lastMonthKm?: number | null;
  prevMonthScore?: number | null;
  needsClarificationTalk: boolean;
  needsTest: boolean;
  hasClarificationTalkDone?: boolean;
  hasTestDone?: boolean;
}

interface ExcellenceCandidate {
  soldier: Soldier;
  safetyScore: number;
  kilometers: number;
  calculatedScore: number;
  speedViolations: number;
  accidentsCount: number;
  punishmentsCount: number;
  cleaningOnTime: boolean;
  avgInspectionScore: number | null;
  attendanceRate: number | null;
  isEligible: boolean;
  disqualifyReasons: string[];
  // Additional detailed data
  harshBraking?: number;
  harshTurns?: number;
  harshAccelerations?: number;
  illegalOvertakes?: number;
  cleaningParadesCount?: number;
  inspectionsCount?: number;
  eventsAttended?: number;
  eventsTotal?: number;
}

export default function SafetyScoresManagement() {
  const { role, canAccessSafetyScores, loading: authLoading, user } = useAuth();
  const navigate = useNavigate();
  const [soldiers, setSoldiers] = useState<Soldier[]>([]);
  const [safetyScores, setSafetyScores] = useState<SafetyScore[]>([]);
  const [allScores, setAllScores] = useState<SafetyScore[]>([]);
  const [followups, setFollowups] = useState<SafetyFollowup[]>([]);
  const [excellenceWinners, setExcellenceWinners] = useState<MonthlyExcellence[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingScore, setEditingScore] = useState<SafetyScore | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Main view mode: soldiers list or scores list or excellence
  const [viewMode, setViewMode] = useState<"soldiers" | "scores" | "excellence">("soldiers");
  const [selectedSoldierForEntry, setSelectedSoldierForEntry] = useState<Soldier | null>(null);
  
  // Alert filter mode
  const [alertFilter, setAlertFilter] = useState<"all" | "clarification" | "test">("all");
  
  // Filter mode: single month or date range
  const [isRangeMode, setIsRangeMode] = useState(false);
  
  // Single month filter
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  
  // Date range filter
  const [startYear, setStartYear] = useState(new Date().getFullYear());
  const [startMonth, setStartMonth] = useState(1);
  const [endYear, setEndYear] = useState(new Date().getFullYear());
  const [endMonth, setEndMonth] = useState(new Date().getMonth() + 1);
  const [selectedSoldierId, setSelectedSoldierId] = useState<string>("");
  
  // Form dialog year/month selection - default to previous month
  const getDefaultFormMonth = () => {
    const lastMonth = subMonths(new Date(), 1);
    return { year: lastMonth.getFullYear(), month: lastMonth.getMonth() + 1 };
  };
  const defaultFormDate = getDefaultFormMonth();
  const [formYear, setFormYear] = useState(defaultFormDate.year);
  const [formMonth, setFormMonth] = useState(defaultFormDate.month);
  
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [scoreToDelete, setScoreToDelete] = useState<SafetyScore | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importData, setImportData] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Followup dialog
  const [followupDialogOpen, setFollowupDialogOpen] = useState(false);
  const [followupSoldier, setFollowupSoldier] = useState<SoldierWithScores | null>(null);
  const [followupType, setFollowupType] = useState<'clarification_talk' | 'test'>('clarification_talk');
  const [followupNotes, setFollowupNotes] = useState("");
  
  // Excellence dialog
  const [excellenceDialogOpen, setExcellenceDialogOpen] = useState(false);
  const [excellenceCandidates, setExcellenceCandidates] = useState<ExcellenceCandidate[]>([]);
  const [excellenceMonth, setExcellenceMonth] = useState(defaultFormDate.month);
  const [excellenceYear, setExcellenceYear] = useState(defaultFormDate.year);
  const [loadingExcellence, setLoadingExcellence] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<ExcellenceCandidate | null>(null);
  const [candidateDetailOpen, setCandidateDetailOpen] = useState(false);
  const [manualExcellenceDialogOpen, setManualExcellenceDialogOpen] = useState(false);
  const [manualExcellenceData, setManualExcellenceData] = useState({
    soldier_id: "",
    excellence_month: defaultFormDate.month,
    excellence_year: defaultFormDate.year,
    safety_score: 100,
    kilometers: 0,
    notes: "",
  });

  const [formData, setFormData] = useState({
    soldier_id: "",
    safety_score: 100,
    kilometers: 0,
    speed_violations: 0,
    harsh_braking: 0,
    harsh_turns: 0,
    harsh_accelerations: 0,
    illegal_overtakes: 0,
    notes: "",
  });

  // Calculate last month and previous month dates
  const getLastTwoMonths = () => {
    const now = new Date();
    const lastMonth = subMonths(now, 1);
    const prevMonth = subMonths(now, 2);
    
    return {
      lastMonthStr: `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}-01`,
      prevMonthStr: `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}-01`,
      lastMonthLabel: MONTHS_HEB.find(m => m.value === lastMonth.getMonth() + 1)?.label + ' ' + lastMonth.getFullYear(),
      prevMonthLabel: MONTHS_HEB.find(m => m.value === prevMonth.getMonth() + 1)?.label + ' ' + prevMonth.getFullYear(),
    };
  };

  const getDateKey = (value?: string | null) => value?.slice(0, 10) || null;

  const getMonthBounds = (year: number, month: number) => {
    const start = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDate = new Date(year, month, 0);
    const end = `${year}-${String(month).padStart(2, "0")}-${String(endDate.getDate()).padStart(2, "0")}`;
    return { start, end };
  };

  const getEarliestDateKey = (...values: Array<string | null | undefined>) =>
    values.map(getDateKey).filter(Boolean).sort()[0] || null;

  const wasSoldierInUnitDuringMonth = (soldier: Soldier, year: number, month: number) => {
    const { start, end } = getMonthBounds(year, month);
    const startDateKey = getEarliestDateKey(soldier.qualified_date, soldier.created_at);
    const endDateKey = getDateKey(soldier.release_date) || getDateKey(soldier.control_removed_at);

    if (startDateKey && startDateKey > end) return false;
    if (endDateKey && endDateKey < start) return false;
    return true;
  };

  const wasSoldierInUnitDuringRange = (soldier: Soldier) => {
    const { start } = getMonthBounds(startYear, startMonth);
    const { end } = getMonthBounds(endYear, endMonth);
    const startDateKey = getEarliestDateKey(soldier.qualified_date, soldier.created_at);
    const endDateKey = getDateKey(soldier.release_date) || getDateKey(soldier.control_removed_at);

    if (startDateKey && startDateKey > end) return false;
    if (endDateKey && endDateKey < start) return false;
    return true;
  };

  useEffect(() => {
    if (authLoading) return;
    // Wait for role resolution to avoid redirecting before roles load
    if (!role) return;
    // Access: admin + platoon_commander
    if (!canAccessSafetyScores) navigate("/");
  }, [authLoading, role, canAccessSafetyScores, navigate]);

  useEffect(() => {
    fetchData();
  }, [selectedYear, selectedMonth, isRangeMode, startYear, startMonth, endYear, endMonth, selectedSoldierId, viewMode]);

  const getSelectedMonthStr = () => {
    const monthStr = String(selectedMonth).padStart(2, '0');
    return `${selectedYear}-${monthStr}`;
  };

  const getMonthLabel = () => {
    const month = MONTHS_HEB.find(m => m.value === selectedMonth);
    return `${month?.label || ''} ${selectedYear}`;
  };

  const getMonthLabelFromDate = (dateStr: string) => {
    const [year, monthNum] = dateStr.split('-');
    const month = MONTHS_HEB.find(m => m.value === parseInt(monthNum));
    return `${month?.label || ''} ${year}`;
  };

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch ALL soldiers (active + released) so historical month views still
    // resolve names of soldiers that have since been released.
    const { data: soldiersData } = await supabase
      .from("soldiers")
      .select("id, personal_number, full_name, outpost, is_active, release_date, control_removed_at, qualified_date, created_at")
      .order("full_name");
    
    if (soldiersData) setSoldiers(soldiersData);

    // Fetch all scores for alert filtering (last 2 months)
    const { lastMonthStr, prevMonthStr } = getLastTwoMonths();
    const { data: recentScoresData } = await supabase
      .from("monthly_safety_scores")
      .select("*")
      .in("score_month", [lastMonthStr, prevMonthStr]);
    
    if (recentScoresData) setAllScores(recentScoresData);
    
    // Fetch followups for last 2 months
    const { data: followupsData } = await supabase
      .from("safety_followups")
      .select("*")
      .in("followup_month", [lastMonthStr, prevMonthStr]);
    
    if (followupsData) setFollowups(followupsData as SafetyFollowup[]);
    
    // Fetch excellence winners
    const { data: excellenceData } = await supabase
      .from("monthly_excellence")
      .select("*")
      .order("excellence_month", { ascending: false });
    
    if (excellenceData) setExcellenceWinners(excellenceData as MonthlyExcellence[]);

    // Fetch scores based on mode
    if (viewMode === "scores") {
      if (isRangeMode) {
        const startMonthStr = `${startYear}-${String(startMonth).padStart(2, '0')}-01`;
        const endMonthStr = `${endYear}-${String(endMonth).padStart(2, '0')}-01`;
        
        let query = supabase
          .from("monthly_safety_scores")
          .select("*")
          .gte("score_month", startMonthStr)
          .lte("score_month", endMonthStr)
          .order("score_month", { ascending: true });
        
        if (selectedSoldierId && selectedSoldierId !== "all") {
          query = query.eq("soldier_id", selectedSoldierId);
        }
        
        const { data: scoresData } = await query;
        if (scoresData) setSafetyScores(scoresData);
      } else {
        const monthStr = getSelectedMonthStr();
        const { data: scoresData } = await supabase
          .from("monthly_safety_scores")
          .select("*")
          .eq("score_month", `${monthStr}-01`)
          .order("safety_score", { ascending: true });
        
        if (scoresData) setSafetyScores(scoresData);
      }
    } else if (viewMode === "soldiers") {
      setSafetyScores([]);
    }
    
    setLoading(false);
  };

  const getSoldierName = (soldierId: string) => {
    return soldiers.find(s => s.id === soldierId)?.full_name || "לא ידוע";
  };

  const getSoldierMeta = (soldierId: string) => soldiers.find(s => s.id === soldierId) || null;

  const activeSoldiers = soldiers.filter(s => s.is_active !== false);
  const soldiersForSelectedMonth = soldiers.filter(s => wasSoldierInUnitDuringMonth(s, selectedYear, selectedMonth));
  const soldiersForSelectedRange = soldiers.filter(wasSoldierInUnitDuringRange);
  const soldiersForFormMonth = soldiers.filter(s => wasSoldierInUnitDuringMonth(s, formYear, formMonth));
  const soldiersForRangeSelect = Array.from(
    new Map(
      [...soldiersForSelectedRange, ...safetyScores.map(score => getSoldierMeta(score.soldier_id)).filter(Boolean) as Soldier[]]
        .map(soldier => [soldier.id, soldier]),
    ).values(),
  );

  // Get soldiers with their last 2 months scores for filtering
  const getSoldiersWithScores = (): SoldierWithScores[] => {
    const { lastMonthStr, prevMonthStr } = getLastTwoMonths();
    
    return activeSoldiers.map(soldier => {
      const lastMonthScoreRecord = allScores.find(
        s => s.soldier_id === soldier.id && s.score_month === lastMonthStr
      );
      const prevMonthScoreRecord = allScores.find(
        s => s.soldier_id === soldier.id && s.score_month === prevMonthStr
      );
      
      const lastMonthScore = lastMonthScoreRecord?.safety_score ?? null;
      const lastMonthKm = lastMonthScoreRecord?.kilometers ?? null;
      const prevMonthScore = prevMonthScoreRecord?.safety_score ?? null;
      
      // Exempt soldiers with < 100 km from clarification requirement
      const needsClarificationBase = lastMonthScore !== null && lastMonthScore <= 75;
      const needsClarificationTalk = needsClarificationBase && (lastMonthKm === null || lastMonthKm >= 100);
      
      // Need test: both last month AND prev month ≤ 75 AND >= 100 km
      const needsTestBase = lastMonthScore !== null && prevMonthScore !== null && 
                        lastMonthScore <= 75 && prevMonthScore <= 75;
      const needsTest = needsTestBase && (lastMonthKm === null || lastMonthKm >= 100);
      
      // Check if followups are done
      const hasClarificationTalkDone = followups.some(
        f => f.soldier_id === soldier.id && 
             f.followup_type === 'clarification_talk' && 
             f.followup_month === lastMonthStr
      );
      const hasTestDone = followups.some(
        f => f.soldier_id === soldier.id && 
             f.followup_type === 'test' && 
             f.followup_month === lastMonthStr
      );
      
      return {
        ...soldier,
        lastMonthScore,
        lastMonthKm,
        prevMonthScore,
        needsClarificationTalk,
        needsTest,
        hasClarificationTalkDone,
        hasTestDone,
      };
    });
  };

  const handleSubmit = async () => {
    const soldierId = selectedSoldierForEntry?.id || formData.soldier_id;
    
    if (!soldierId) {
      toast.error("יש לבחור חייל");
      return;
    }

    const scoreMonthStr = `${formYear}-${String(formMonth).padStart(2, '0')}-01`;
    const scoreData = {
      soldier_id: soldierId,
      score_month: scoreMonthStr,
      safety_score: formData.safety_score,
      kilometers: formData.kilometers,
      speed_violations: formData.speed_violations,
      harsh_braking: formData.harsh_braking,
      harsh_turns: formData.harsh_turns,
      harsh_accelerations: formData.harsh_accelerations,
      illegal_overtakes: formData.illegal_overtakes,
      notes: formData.notes || null,
      created_by: user?.id,
    };

    if (editingScore) {
      const { error } = await supabase
        .from("monthly_safety_scores")
        .update(scoreData)
        .eq("id", editingScore.id);

      if (error) {
        toast.error("שגיאה בעדכון הציון");
      } else {
        toast.success("הציון עודכן בהצלחה");
        await updateSoldierSafetyStatus(soldierId);
        fetchData();
      }
    } else {
      const { error } = await supabase
        .from("monthly_safety_scores")
        .insert(scoreData);

      if (error) {
        if (error.code === "23505") {
          toast.error("כבר קיים ציון לנהג זה בחודש הנבחר");
        } else {
          toast.error("שגיאה בהוספת הציון");
        }
      } else {
        toast.success("הציון נוסף בהצלחה");
        await updateSoldierSafetyStatus(soldierId);
        fetchData();
      }
    }

    setDialogOpen(false);
    setSelectedSoldierForEntry(null);
    resetForm();
  };

  const updateSoldierSafetyStatus = async (soldierId: string) => {
    const { data: recentScores } = await supabase
      .from("monthly_safety_scores")
      .select("safety_score, score_month")
      .eq("soldier_id", soldierId)
      .order("score_month", { ascending: false })
      .limit(3);

    if (!recentScores || recentScores.length === 0) return;

    const latestScore = recentScores[0].safety_score;
    const lowScoreMonths = recentScores.filter(s => s.safety_score < 75).length;
    
    let safetyStatus = 'ok';
    if (lowScoreMonths >= 3) {
      safetyStatus = 'suspended';
    } else if (lowScoreMonths >= 2) {
      safetyStatus = 'critical';
    } else if (latestScore < 75) {
      safetyStatus = 'warning';
    }

    await supabase
      .from("soldiers")
      .update({
        current_safety_score: latestScore,
        consecutive_low_months: lowScoreMonths,
        safety_status: safetyStatus,
      })
      .eq("id", soldierId);
  };

  const handleDelete = async () => {
    if (!scoreToDelete) return;

    const { error } = await supabase
      .from("monthly_safety_scores")
      .delete()
      .eq("id", scoreToDelete.id);

    if (error) {
      toast.error("שגיאה במחיקת הציון");
    } else {
      toast.success("הציון נמחק בהצלחה");
      await updateSoldierSafetyStatus(scoreToDelete.soldier_id);
      fetchData();
    }
    setDeleteConfirmOpen(false);
    setScoreToDelete(null);
  };

  const resetForm = () => {
    setFormData({
      soldier_id: "",
      safety_score: 100,
      kilometers: 0,
      speed_violations: 0,
      harsh_braking: 0,
      harsh_turns: 0,
      harsh_accelerations: 0,
      illegal_overtakes: 0,
      notes: "",
    });
    const lastMonth = subMonths(new Date(), 1);
    setFormYear(lastMonth.getFullYear());
    setFormMonth(lastMonth.getMonth() + 1);
    setEditingScore(null);
  };

  const openEditDialog = (score: SafetyScore) => {
    setEditingScore(score);
    const [year, month] = score.score_month.split('-');
    setFormYear(parseInt(year));
    setFormMonth(parseInt(month));
    setFormData({
      soldier_id: score.soldier_id,
      safety_score: score.safety_score,
      kilometers: score.kilometers || 0,
      speed_violations: score.speed_violations || 0,
      harsh_braking: score.harsh_braking || 0,
      harsh_turns: score.harsh_turns || 0,
      harsh_accelerations: score.harsh_accelerations || 0,
      illegal_overtakes: score.illegal_overtakes || 0,
      notes: score.notes || "",
    });
    setDialogOpen(true);
  };

  const openScoreEntryForSoldier = (soldier: Soldier, year = selectedYear, month = selectedMonth) => {
    resetForm();
    setSelectedSoldierForEntry(soldier);
    setFormYear(year);
    setFormMonth(month);
    setDialogOpen(true);
  };

  const openAddScoreDialog = () => {
    resetForm();
    setFormYear(selectedYear);
    setFormMonth(selectedMonth);
    setDialogOpen(true);
  };
  
  // Followup functions
  const openFollowupDialog = (soldier: SoldierWithScores, type: 'clarification_talk' | 'test') => {
    setFollowupSoldier(soldier);
    setFollowupType(type);
    setFollowupNotes("");
    setFollowupDialogOpen(true);
  };
  
  const handleFollowupSubmit = async () => {
    if (!followupSoldier) return;
    
    const { lastMonthStr } = getLastTwoMonths();
    
    const { error } = await supabase
      .from("safety_followups")
      .insert({
        soldier_id: followupSoldier.id,
        followup_type: followupType,
        followup_month: lastMonthStr,
        notes: followupNotes || null,
        created_by: user?.id,
      });
    
    if (error) {
      toast.error("שגיאה בשמירת המעקב");
    } else {
      toast.success(followupType === 'clarification_talk' ? "שיחת בירור נרשמה" : "מבחן נרשם");
      fetchData();
    }
    
    setFollowupDialogOpen(false);
    setFollowupSoldier(null);
  };
  
  // Excellence functions
  const calculateExcellenceCandidates = async () => {
    setLoadingExcellence(true);
    
    // For excellence month X, we use data from month X-1 (the previous month)
    const dataMonth = excellenceMonth === 1 
      ? { month: 12, year: excellenceYear - 1 }
      : { month: excellenceMonth - 1, year: excellenceYear };
    
    const dataMonthStr = `${dataMonth.year}-${String(dataMonth.month).padStart(2, '0')}-01`;
    const nextMonthStr = dataMonth.month === 12
      ? `${dataMonth.year + 1}-01-01`
      : `${dataMonth.year}-${String(dataMonth.month + 1).padStart(2, '0')}-01`;
    
    const dataMonthLabel = MONTHS_HEB.find(m => m.value === dataMonth.month)?.label + ' ' + dataMonth.year;
    
    // Get all safety scores for the DATA month (previous month)
    const { data: monthScores } = await supabase
      .from("monthly_safety_scores")
      .select("*")
      .eq("score_month", dataMonthStr);
    
    if (!monthScores || monthScores.length === 0) {
      toast.error(`אין ציונים לחודש ${dataMonthLabel}`);
      setLoadingExcellence(false);
      return;
    }
    
    // Get all accidents for the data month
    const { data: accidents } = await supabase
      .from("accidents")
      .select("soldier_id")
      .gte("accident_date", dataMonthStr)
      .lt("accident_date", nextMonthStr);
    
    // Get all punishments for the data month
    const { data: punishments } = await supabase
      .from("punishments")
      .select("soldier_id")
      .gte("punishment_date", dataMonthStr)
      .lt("punishment_date", nextMonthStr);
    
    // Get cleaning parades for the data month
    const { data: cleaningParades } = await supabase
      .from("cleaning_parades")
      .select("user_id, parade_date")
      .gte("parade_date", dataMonthStr)
      .lt("parade_date", nextMonthStr);
    
    // Get inspections for the data month
    const { data: inspections } = await supabase
      .from("inspections")
      .select("soldier_id, total_score")
      .gte("inspection_date", dataMonthStr)
      .lt("inspection_date", nextMonthStr);
    
    // Get event attendance for the data month
    const { data: eventAttendance } = await supabase
      .from("event_attendance")
      .select("soldier_id, attended, event_id, work_plan_events!inner(event_date)")
      .gte("work_plan_events.event_date", dataMonthStr)
      .lt("work_plan_events.event_date", nextMonthStr);
    
    // Get previous winners to exclude
    const { data: previousWinners } = await supabase
      .from("monthly_excellence")
      .select("soldier_id");
    
    const previousWinnerIds = new Set(previousWinners?.map(w => w.soldier_id) || []);
    
    const candidates: ExcellenceCandidate[] = [];
    
    for (const score of monthScores) {
      const soldier = soldiers.find(s => s.id === score.soldier_id);
      if (!soldier) continue;
      
      const disqualifyReasons: string[] = [];
      
      // Check if already won before
      if (previousWinnerIds.has(soldier.id)) {
        disqualifyReasons.push("כבר קיבל הצטיינות בעבר");
      }
      
      // Check speed violations
      if ((score.speed_violations || 0) > 0) {
        disqualifyReasons.push(`${score.speed_violations} חריגות מהירות`);
      }
      
      // Check accidents
      const soldierAccidents = accidents?.filter(a => a.soldier_id === soldier.id).length || 0;
      if (soldierAccidents > 0) {
        disqualifyReasons.push(`${soldierAccidents} תאונות`);
      }
      
      // Check punishments
      const soldierPunishments = punishments?.filter(p => p.soldier_id === soldier.id).length || 0;
      if (soldierPunishments > 0) {
        disqualifyReasons.push(`${soldierPunishments} משפטים/שלילות`);
      }
      
      // Check if did cleaning parade (simplified check)
      const didCleaning = cleaningParades?.some(cp => cp.user_id === soldier.id) ?? true;
      
      // Get average inspection score
      const soldierInspections = inspections?.filter(i => i.soldier_id === soldier.id) || [];
      const avgInspectionScore = soldierInspections.length > 0
        ? soldierInspections.reduce((sum, i) => sum + (i.total_score || 0), 0) / soldierInspections.length
        : null;
      
      // Calculate attendance rate
      const soldierAttendance = eventAttendance?.filter(ea => ea.soldier_id === soldier.id) || [];
      const attendanceRate = soldierAttendance.length > 0
        ? (soldierAttendance.filter(ea => ea.attended === true).length / soldierAttendance.length) * 100
        : null;
      
      // Calculate excellence score
      // Formula: (safety_score * log10(km + 1)) + (avgInspection * 0.1) + (attendanceRate * 0.05)
      // Higher km with good score = better
      const km = score.kilometers || 0;
      const baseScore = score.safety_score;
      const kmBonus = km > 0 ? Math.log10(km + 1) : 0;
      const inspectionBonus = avgInspectionScore ? (avgInspectionScore * 0.1) : 0;
      const attendanceBonus = attendanceRate ? (attendanceRate * 0.05) : 0;
      const calculatedScore = (baseScore * kmBonus) + inspectionBonus + attendanceBonus;
      
      // Calculate events attended
      const soldierAttendedCount = soldierAttendance.filter(ea => ea.attended === true).length;
      const soldierTotalEvents = soldierAttendance.length;
      
      candidates.push({
        soldier,
        safetyScore: score.safety_score,
        kilometers: km,
        calculatedScore,
        speedViolations: score.speed_violations || 0,
        accidentsCount: soldierAccidents,
        punishmentsCount: soldierPunishments,
        cleaningOnTime: didCleaning,
        avgInspectionScore,
        attendanceRate,
        isEligible: disqualifyReasons.length === 0,
        disqualifyReasons,
        harshBraking: score.harsh_braking || 0,
        harshTurns: score.harsh_turns || 0,
        harshAccelerations: score.harsh_accelerations || 0,
        illegalOvertakes: score.illegal_overtakes || 0,
        cleaningParadesCount: cleaningParades?.filter(cp => cp.user_id === soldier.id).length || 0,
        inspectionsCount: soldierInspections.length,
        eventsAttended: soldierAttendedCount,
        eventsTotal: soldierTotalEvents,
      });
    }
    
    // Sort by calculated score (eligible first, then by score)
    candidates.sort((a, b) => {
      if (a.isEligible && !b.isEligible) return -1;
      if (!a.isEligible && b.isEligible) return 1;
      return b.calculatedScore - a.calculatedScore;
    });
    
    setExcellenceCandidates(candidates);
    setExcellenceDialogOpen(true);
    setLoadingExcellence(false);
  };
  
  const selectExcellenceWinner = async (candidate: ExcellenceCandidate) => {
    if (!candidate.isEligible) {
      toast.error("חייל זה לא כשיר להצטיינות");
      return;
    }
    
    try {
      const monthStr = `${excellenceYear}-${String(excellenceMonth).padStart(2, '0')}-01`;
      
      const { error } = await supabase
        .from("monthly_excellence")
        .insert({
          soldier_id: candidate.soldier.id,
          excellence_month: monthStr,
          safety_score: candidate.safetyScore,
          kilometers: candidate.kilometers,
          calculated_score: candidate.calculatedScore,
          speed_violations: candidate.speedViolations,
          accidents_count: candidate.accidentsCount,
          punishments_count: candidate.punishmentsCount,
          cleaning_parades_on_time: candidate.cleaningOnTime,
          avg_inspection_score: candidate.avgInspectionScore,
          selected_by: user?.id,
        });
      
      if (error) {
        if (error.code === "23505") {
          toast.error("כבר נבחר מצטיין לחודש זה");
        } else {
          toast.error("שגיאה בבחירת מצטיין");
        }
      } else {
        toast.success(`${candidate.soldier.full_name} נבחר כמצטיין החודש! 🏆`);
        fetchData();
        setExcellenceDialogOpen(false);
      }
    } catch (error) {
      console.error("Unexpected error selecting excellence winner:", error);
      toast.error("אירעה שגיאה בלתי צפויה");
    }
  };
  
  const openCandidateDetail = (candidate: ExcellenceCandidate) => {
    setSelectedCandidate(candidate);
    setCandidateDetailOpen(true);
  };
  
  const handleManualExcellenceSubmit = async () => {
    if (!manualExcellenceData.soldier_id) {
      toast.error("יש לבחור חייל");
      return;
    }
    
    try {
      const monthStr = `${manualExcellenceData.excellence_year}-${String(manualExcellenceData.excellence_month).padStart(2, '0')}-01`;
      
      const { error } = await supabase
        .from("monthly_excellence")
        .insert({
          soldier_id: manualExcellenceData.soldier_id,
          excellence_month: monthStr,
          safety_score: manualExcellenceData.safety_score,
          kilometers: manualExcellenceData.kilometers,
          calculated_score: 0, // External winner - no calculated score
          speed_violations: 0,
          accidents_count: 0,
          punishments_count: 0,
          cleaning_parades_on_time: true,
          avg_inspection_score: null,
          selected_by: user?.id,
        });
      
      if (error) {
        if (error.code === "23505") {
          toast.error("כבר נבחר מצטיין לחודש זה");
        } else {
          toast.error("שגיאה בהוספת מצטיין");
        }
      } else {
        toast.success("מצטיין חיצוני נוסף בהצלחה! 🏆");
        fetchData();
        setManualExcellenceDialogOpen(false);
        setManualExcellenceData({
          soldier_id: "",
          excellence_month: defaultFormDate.month,
          excellence_year: defaultFormDate.year,
          safety_score: 100,
          kilometers: 0,
          notes: "",
        });
      }
    } catch (error) {
      console.error("Unexpected error adding manual excellence:", error);
      toast.error("אירעה שגיאה בלתי צפויה");
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      
      const mappedData = jsonData.map((row: any) => ({
        personal_number: row['מספר אישי'] || row['personal_number'] || '',
        safety_score: Number(row['ציון בטיחות'] || row['safety_score'] || row['ציון'] || 0),
        kilometers: Number(row['קילומטרים'] || row['kilometers'] || row['ק"מ'] || 0),
        speed_violations: Number(row['חריגות מהירות'] || row['speed_violations'] || 0),
        harsh_braking: Number(row['בלימות חדות'] || row['harsh_braking'] || 0),
        harsh_turns: Number(row['פניות חדות'] || row['harsh_turns'] || 0),
        harsh_accelerations: Number(row['האצות חדות'] || row['harsh_accelerations'] || 0),
        illegal_overtakes: Number(row['עקיפות מסוכנות'] || row['illegal_overtakes'] || 0),
      }));

      setImportData(mappedData);
      setImportDialogOpen(true);
    };
    reader.readAsArrayBuffer(file);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImport = async () => {
    setImporting(true);
    let successCount = 0;
    let errorCount = 0;
    const monthStr = getSelectedMonthStr();

    for (const row of importData) {
      const soldier = soldiersForSelectedMonth.find(s => s.personal_number === String(row.personal_number));
      if (!soldier) {
        errorCount++;
        continue;
      }

      const { error } = await supabase
        .from("monthly_safety_scores")
        .upsert({
          soldier_id: soldier.id,
          score_month: `${monthStr}-01`,
          safety_score: row.safety_score,
          kilometers: row.kilometers,
          speed_violations: row.speed_violations,
          harsh_braking: row.harsh_braking,
          harsh_turns: row.harsh_turns,
          harsh_accelerations: row.harsh_accelerations,
          illegal_overtakes: row.illegal_overtakes,
          created_by: user?.id,
        }, { onConflict: 'soldier_id,score_month' });

      if (error) {
        errorCount++;
      } else {
        successCount++;
        await updateSoldierSafetyStatus(soldier.id);
      }
    }

    toast.success(`יובאו ${successCount} רשומות בהצלחה${errorCount > 0 ? `, ${errorCount} נכשלו` : ''}`);
    setImportDialogOpen(false);
    setImportData([]);
    setImporting(false);
    fetchData();
  };

  const downloadTemplate = () => {
    const templateData = soldiersForSelectedMonth.map(s => ({
      'מספר אישי': s.personal_number,
      'שם מלא': s.full_name,
      'ציון בטיחות': '',
      'קילומטרים': '',
      'חריגות מהירות': '',
      'בלימות חדות': '',
      'פניות חדות': '',
      'האצות חדות': '',
      'עקיפות מסוכנות': '',
    }));

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "ציוני בטיחות");
    XLSX.writeFile(wb, `תבנית_ציוני_בטיחות_${getSelectedMonthStr()}.xlsx`);
    toast.success("התבנית הורדה בהצלחה");
  };

  const exportToExcel = () => {
    const data = safetyScores.map(score => ({
      "שם מלא": getSoldierName(score.soldier_id),
      "חודש": score.score_month.slice(0, 7),
      "ציון בטיחות": score.safety_score,
      "קילומטרים": score.kilometers || 0,
      "חריגות מהירות": score.speed_violations || 0,
      "בלימות חדות": score.harsh_braking || 0,
      "פניות חדות": score.harsh_turns || 0,
      "האצות חדות": score.harsh_accelerations || 0,
      "עקיפות מסוכנות": score.illegal_overtakes || 0,
      "הערות": score.notes || "",
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "ציוני בטיחות");
    XLSX.writeFile(wb, `ציוני_בטיחות_${isRangeMode ? 'טווח' : getSelectedMonthStr()}.xlsx`);
    toast.success("הקובץ יוצא בהצלחה");
  };

  // Get filtered soldiers based on alert filter and search
  const soldiersWithScores = getSoldiersWithScores();
  
  const filteredSoldiers = soldiersWithScores.filter(soldier => {
    const matchesSearch = soldier.full_name.includes(searchTerm) || 
                          soldier.personal_number.includes(searchTerm);
    
    if (!matchesSearch) return false;
    
    if (alertFilter === "clarification") {
      return soldier.needsClarificationTalk && !soldier.hasClarificationTalkDone;
    }
    if (alertFilter === "test") {
      return soldier.needsTest && !soldier.hasTestDone;
    }
    
    return true;
  });

  const visibleScores = safetyScores.filter(score => {
    const soldier = getSoldierMeta(score.soldier_id);
    if (!soldier) return true;
    const [year, month] = score.score_month.split("-").map(Number);
    return wasSoldierInUnitDuringMonth(soldier, year, month);
  });

  const filteredScores = visibleScores.filter(score => {
    const soldierName = getSoldierName(score.soldier_id);
    return soldierName.includes(searchTerm);
  });

  const singleMonthScoreRows = !isRangeMode
    ? Array.from(
        new Map([
          ...soldiersForSelectedMonth.map(soldier => [
            soldier.id,
            { id: soldier.id, soldier, score: visibleScores.find(score => score.soldier_id === soldier.id) || null },
          ] as const),
          ...visibleScores.map(score => [
            score.soldier_id,
            { id: score.soldier_id, soldier: getSoldierMeta(score.soldier_id), score },
          ] as const),
        ]).values(),
      ).filter(row => (row.soldier?.full_name || getSoldierName(row.id)).includes(searchTerm))
    : [];

  const getScoreColor = (score: number) => {
    if (score >= 75) return "bg-emerald-500";
    if (score >= 60) return "bg-amber-500";
    return "bg-red-500";
  };

  // Stats for soldiers view
  const { lastMonthLabel, prevMonthLabel } = getLastTwoMonths();
  const clarificationCount = soldiersWithScores.filter(s => s.needsClarificationTalk && !s.hasClarificationTalkDone).length;
  const testCount = soldiersWithScores.filter(s => s.needsTest && !s.hasTestDone).length;

  // Stats for scores view
  const averageScore = visibleScores.length > 0
    ? Math.round(visibleScores.reduce((sum, s) => sum + s.safety_score, 0) / visibleScores.length)
    : 0;

  const stats = {
    total: visibleScores.length,
    good: visibleScores.filter(s => s.safety_score >= 75).length,
    warning: visibleScores.filter(s => s.safety_score >= 60 && s.safety_score < 75).length,
    critical: visibleScores.filter(s => s.safety_score < 60).length,
  };

  if (authLoading || loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-br from-white via-slate-50 to-white pb-24" dir="rtl">
        {/* Header */}
        <div className="relative overflow-hidden bg-gradient-to-l from-amber-900 via-amber-800 to-amber-900 px-4 py-8">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--gold)/0.2),transparent_50%)]" />
          <div className="absolute top-4 left-4 opacity-20">
            <img src={unitLogo} alt="" className="w-20 h-20" />
          </div>
          
          <div className="relative z-10 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gold/20 border border-gold/30 mb-4">
              <Gauge className="w-4 h-4 text-gold" />
              <span className="text-sm font-bold text-gold">ציוני בטיחות</span>
            </div>
            <h1 className="text-2xl font-black text-white mb-2">ניהול ציוני בטיחות חודשיים</h1>
            <p className="text-amber-200 text-sm">
              {viewMode === "soldiers" 
                ? `${activeSoldiers.length} חיילים פעילים`
                : viewMode === "excellence"
                  ? `${excellenceWinners.length} מצטיינים`
                  : isRangeMode 
                    ? selectedSoldierId === "all" 
                      ? `${visibleScores.length} ציונים לכל החיילים`
                      : selectedSoldierId 
                        ? `${visibleScores.length} ציונים ל${getSoldierName(selectedSoldierId)}`
                        : "בחר חייל לצפייה בציונים"
                    : `${visibleScores.length} ציונים ל${getMonthLabel()}`
              }
            </p>
          </div>
        </div>

        <div className="px-4 py-6 space-y-6">
          {/* View Mode Tabs */}
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "soldiers" | "scores" | "excellence")} className="w-full">
            <TabsList className="grid w-full grid-cols-3 rounded-2xl p-1 bg-slate-100">
              <TabsTrigger value="soldiers" className="rounded-xl data-[state=active]:bg-white text-xs">
                <Users className="w-4 h-4 ml-1" />
                חיילים
              </TabsTrigger>
              <TabsTrigger value="scores" className="rounded-xl data-[state=active]:bg-white text-xs">
                <Gauge className="w-4 h-4 ml-1" />
                ציונים
              </TabsTrigger>
              <TabsTrigger value="excellence" className="rounded-xl data-[state=active]:bg-white text-xs">
                <Trophy className="w-4 h-4 ml-1" />
                מצטיינים
              </TabsTrigger>
            </TabsList>

            {/* Soldiers List View */}
            <TabsContent value="soldiers" className="space-y-4 mt-4">
              {/* Alert Filters */}
              <Card className="border-0 shadow-lg bg-white/90 backdrop-blur rounded-2xl">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                    <span className="font-bold text-slate-700">סינון לפי התראות</span>
                  </div>
                  <p className="text-xs text-slate-500 mb-3">
                    נתונים מבוססים על: {lastMonthLabel} ו-{prevMonthLabel}
                    <br />
                    <span className="text-emerald-600">* חיילים עם פחות מ-100 ק"מ פטורים משיחת בירור</span>
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant={alertFilter === "all" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setAlertFilter("all")}
                      className="rounded-xl"
                    >
                      <Users className="w-4 h-4 ml-1" />
                      כל החיילים ({activeSoldiers.length})
                    </Button>
                    <Button
                      variant={alertFilter === "clarification" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setAlertFilter("clarification")}
                      className={`rounded-xl ${alertFilter === "clarification" ? "bg-amber-500 hover:bg-amber-600" : "border-amber-300 text-amber-700 hover:bg-amber-50"}`}
                    >
                      <MessageCircle className="w-4 h-4 ml-1" />
                      צריכים שיחת בירור ({clarificationCount})
                    </Button>
                    <Button
                      variant={alertFilter === "test" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setAlertFilter("test")}
                      className={`rounded-xl ${alertFilter === "test" ? "bg-red-500 hover:bg-red-600" : "border-red-300 text-red-700 hover:bg-red-50"}`}
                    >
                      <FileText className="w-4 h-4 ml-1" />
                      צריכים מבחן ({testCount})
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Search */}
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  placeholder="חיפוש לפי שם או מספר אישי..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10 py-6 rounded-2xl border-2"
                />
              </div>

              {/* Soldiers List */}
              <Card className="border-0 shadow-xl bg-white/90 backdrop-blur rounded-3xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-slate-800 flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    {alertFilter === "all" && "כל החיילים"}
                    {alertFilter === "clarification" && "חיילים שצריכים שיחת בירור"}
                    {alertFilter === "test" && "חיילים שצריכים מבחן"}
                    <Badge variant="secondary" className="mr-2">{filteredSoldiers.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[50vh]">
                    <div className="space-y-2">
                      {filteredSoldiers.length === 0 ? (
                        <div className="text-center py-12 text-slate-500">
                          <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                          <p>
                            {alertFilter === "all" && "אין חיילים"}
                            {alertFilter === "clarification" && "אין חיילים שצריכים שיחת בירור"}
                            {alertFilter === "test" && "אין חיילים שצריכים מבחן"}
                          </p>
                        </div>
                      ) : (
                        filteredSoldiers.map(soldier => (
                          <div
                            key={soldier.id}
                            className={`p-3 rounded-2xl border transition-all ${
                              soldier.needsTest && !soldier.hasTestDone
                                ? "bg-red-50/80 border-red-200" 
                                : soldier.needsClarificationTalk && !soldier.hasClarificationTalkDone
                                  ? "bg-amber-50/80 border-amber-200"
                                  : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                            }`}
                          >
                            {/* Header row: name and enter score button */}
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1 flex-wrap">
                                  <h4 className="font-bold text-slate-800 text-sm truncate">{soldier.full_name}</h4>
                                  <span className="text-xs text-slate-500 shrink-0">({soldier.personal_number})</span>
                                </div>
                                {soldier.outpost && (
                                  <p className="text-xs text-slate-500">{soldier.outpost}</p>
                                )}
                              </div>
                              
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => openScoreEntryForSoldier(soldier)}
                                className="rounded-xl shrink-0 h-8 px-3 bg-primary hover:bg-primary/90"
                              >
                                <Plus className="w-4 h-4 ml-1" />
                                הזן
                              </Button>
                            </div>
                            
                            {/* Scores row */}
                            <div className="flex items-center gap-2 flex-wrap text-xs">
                              {/* Last month score */}
                              <div className="flex items-center gap-1">
                                <span className="text-slate-500">{lastMonthLabel.split(' ')[0]}:</span>
                                {soldier.lastMonthScore !== null ? (
                                  <Badge className={`${getScoreColor(soldier.lastMonthScore)} text-white text-xs px-2 py-0`}>
                                    {soldier.lastMonthScore}
                                  </Badge>
                                ) : (
                                  <span className="text-slate-400">-</span>
                                )}
                              </div>
                              
                              {/* Km */}
                              {soldier.lastMonthKm !== null && (
                                <div className="flex items-center gap-1">
                                  <span className="text-slate-500">ק"מ:</span>
                                  <Badge variant="outline" className="text-xs text-slate-700 border-slate-300 px-2 py-0">
                                    {soldier.lastMonthKm}
                                  </Badge>
                                  {soldier.lastMonthKm < 100 && (
                                    <span className="text-emerald-600">(פטור)</span>
                                  )}
                                </div>
                              )}
                              
                              {/* Prev month score */}
                              <div className="flex items-center gap-1">
                                <span className="text-slate-500">{prevMonthLabel.split(' ')[0]}:</span>
                                {soldier.prevMonthScore !== null ? (
                                  <Badge className={`${getScoreColor(soldier.prevMonthScore)} text-white text-xs px-2 py-0`}>
                                    {soldier.prevMonthScore}
                                  </Badge>
                                ) : (
                                  <span className="text-slate-400">-</span>
                                )}
                              </div>
                            </div>
                            
                            {/* Alert badges and actions */}
                            {(soldier.needsTest || soldier.needsClarificationTalk) && (
                              <div className="flex gap-2 mt-2 flex-wrap">
                                {soldier.needsTest && (
                                  soldier.hasTestDone ? (
                                    <Badge className="bg-emerald-500 text-white text-xs">
                                      <CheckCircle className="w-3 h-3 ml-1" />
                                      מבחן בוצע
                                    </Badge>
                                  ) : (
                                    <Button
                                      size="sm"
                                      className="bg-red-500 hover:bg-red-600 text-white text-xs h-7"
                                      onClick={(e) => { e.stopPropagation(); openFollowupDialog(soldier, 'test'); }}
                                    >
                                      <ClipboardCheck className="w-3 h-3 ml-1" />
                                      סמן מבחן
                                    </Button>
                                  )
                                )}
                                {soldier.needsClarificationTalk && !soldier.needsTest && (
                                  soldier.hasClarificationTalkDone ? (
                                    <Badge className="bg-emerald-500 text-white text-xs">
                                      <CheckCircle className="w-3 h-3 ml-1" />
                                      שיחה בוצעה
                                    </Badge>
                                  ) : (
                                    <Button
                                      size="sm"
                                      className="bg-amber-500 hover:bg-amber-600 text-white text-xs h-7"
                                      onClick={(e) => { e.stopPropagation(); openFollowupDialog(soldier, 'clarification_talk'); }}
                                    >
                                      <Phone className="w-3 h-3 ml-1" />
                                      סמן שיחה
                                    </Button>
                                  )
                                )}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Excellence View */}
            <TabsContent value="excellence" className="space-y-4 mt-4">
              {/* Select Month for Excellence */}
              <Card className="border-0 shadow-lg bg-gradient-to-br from-amber-50 to-yellow-50 rounded-2xl">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Trophy className="w-5 h-5 text-amber-600" />
                    <span className="font-bold text-amber-800">בחירת מצטיין חודשי</span>
                  </div>
                  <p className="text-xs text-amber-700 mb-3">
                    בחר חודש וחפש את המועמדים המתאימים להצטיינות
                  </p>
                  <div className="flex items-center gap-3 flex-wrap">
                    <Select value={String(excellenceYear)} onValueChange={(v) => setExcellenceYear(Number(v))}>
                      <SelectTrigger className="w-24 rounded-xl bg-white text-slate-800">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[2024, 2025, 2026, 2027].map(year => (
                          <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={String(excellenceMonth)} onValueChange={(v) => setExcellenceMonth(Number(v))}>
                      <SelectTrigger className="w-32 rounded-xl bg-white text-slate-800">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MONTHS_HEB.map(month => (
                          <SelectItem key={month.value} value={String(month.value)}>{month.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      onClick={calculateExcellenceCandidates}
                      disabled={loadingExcellence}
                      className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white rounded-xl"
                    >
                      {loadingExcellence ? <Loader2 className="w-4 h-4 animate-spin ml-1" /> : <Search className="w-4 h-4 ml-1" />}
                      חפש מועמדים
                    </Button>
                    <Button
                      onClick={() => setManualExcellenceDialogOpen(true)}
                      variant="outline"
                      className="rounded-xl border-amber-300 text-amber-700 hover:bg-amber-50"
                    >
                      <Plus className="w-4 h-4 ml-1" />
                      הוסף מצטיין חיצוני
                    </Button>
                  </div>
                </CardContent>
              </Card>
              
              {/* Excellence Winners List */}
              <Card className="border-0 shadow-xl bg-white/90 backdrop-blur rounded-3xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-slate-800 flex items-center gap-2">
                    <Crown className="w-5 h-5 text-amber-500" />
                    מצטייני העבר
                    <Badge variant="secondary" className="mr-2">{excellenceWinners.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[40vh]">
                    <div className="space-y-2">
                      {excellenceWinners.length === 0 ? (
                        <div className="text-center py-12 text-slate-500">
                          <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
                          <p>עדיין לא נבחרו מצטיינים</p>
                        </div>
                      ) : (
                        excellenceWinners.map(winner => (
                          <div
                            key={winner.id}
                            className="p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center">
                                <Crown className="w-6 h-6 text-white" />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-bold text-slate-800">{getSoldierName(winner.soldier_id)}</h4>
                                  <Badge className="bg-amber-500 text-white text-xs">
                                    {getMonthLabelFromDate(winner.excellence_month)}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-3 mt-1 text-sm text-slate-600">
                                  <span>ציון: {winner.safety_score}</span>
                                  <span>ק"מ: {winner.kilometers}</span>
                                  <span>ניקוד: {winner.calculated_score.toFixed(1)}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Scores View (existing functionality) */}
            <TabsContent value="scores" className="space-y-4 mt-4">
              {/* Filter Mode Toggle */}
              <Card className="border-0 shadow-lg bg-white/90 backdrop-blur rounded-2xl">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-primary" />
                      <span className="font-bold text-slate-700">מצב סינון</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-sm ${!isRangeMode ? 'font-bold text-primary' : 'text-slate-600'}`}>חודש בודד</span>
                      <Switch checked={isRangeMode} onCheckedChange={setIsRangeMode} />
                      <span className={`text-sm ${isRangeMode ? 'font-bold text-primary' : 'text-slate-600'}`}>טווח תאריכים</span>
                    </div>
                  </div>

                  {!isRangeMode ? (
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex items-center gap-2">
                        <Label className="text-slate-700 font-bold">שנה:</Label>
                        <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
                          <SelectTrigger className="w-24 rounded-xl bg-white text-slate-800">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[2024, 2025, 2026, 2027].map(year => (
                              <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-slate-700 font-bold">חודש:</Label>
                        <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(Number(v))}>
                          <SelectTrigger className="w-32 rounded-xl bg-white text-slate-800">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {MONTHS_HEB.map(month => (
                              <SelectItem key={month.value} value={String(month.value)}>{month.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <Label className="text-slate-700 font-bold mb-2 block">
                          <User className="w-4 h-4 inline ml-1" />
                          בחר חייל
                        </Label>
                        <Select value={selectedSoldierId} onValueChange={setSelectedSoldierId}>
                          <SelectTrigger className="w-full rounded-xl bg-white text-slate-800">
                            <SelectValue placeholder="בחר חייל לצפייה בציונים" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">כל החיילים</SelectItem>
                            {soldiersForRangeSelect.map(soldier => (
                              <SelectItem key={soldier.id} value={soldier.id}>
                                {soldier.full_name} ({soldier.personal_number})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-slate-700 font-bold">מתאריך</Label>
                          <div className="flex gap-2">
                            <Select value={String(startYear)} onValueChange={(v) => setStartYear(Number(v))}>
                              <SelectTrigger className="rounded-xl bg-white text-slate-800">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {[2024, 2025, 2026, 2027].map(year => (
                                  <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Select value={String(startMonth)} onValueChange={(v) => setStartMonth(Number(v))}>
                              <SelectTrigger className="rounded-xl bg-white text-slate-800">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {MONTHS_HEB.map(month => (
                                  <SelectItem key={month.value} value={String(month.value)}>{month.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-slate-700 font-bold">עד תאריך</Label>
                          <div className="flex gap-2">
                            <Select value={String(endYear)} onValueChange={(v) => setEndYear(Number(v))}>
                              <SelectTrigger className="rounded-xl bg-white text-slate-800">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {[2024, 2025, 2026, 2027].map(year => (
                                  <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Select value={String(endMonth)} onValueChange={(v) => setEndMonth(Number(v))}>
                              <SelectTrigger className="rounded-xl bg-white text-slate-800">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {MONTHS_HEB.map(month => (
                                  <SelectItem key={month.value} value={String(month.value)}>{month.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Stats Cards */}
              {!isRangeMode && (
                <div className="grid grid-cols-4 gap-2">
                  <Card className="border-0 bg-slate-100 shadow">
                    <CardContent className="p-3 text-center">
                      <div className="text-2xl font-black text-slate-700">{stats.total}</div>
                      <p className="text-xs text-slate-500">סה"כ</p>
                    </CardContent>
                  </Card>
                  <Card className="border-0 bg-emerald-100 shadow">
                    <CardContent className="p-3 text-center">
                      <div className="text-2xl font-black text-emerald-600">{stats.good}</div>
                      <p className="text-xs text-emerald-700">75+</p>
                    </CardContent>
                  </Card>
                  <Card className="border-0 bg-amber-100 shadow">
                    <CardContent className="p-3 text-center">
                      <div className="text-2xl font-black text-amber-600">{stats.warning}</div>
                      <p className="text-xs text-amber-700">60-74</p>
                    </CardContent>
                  </Card>
                  <Card className="border-0 bg-red-100 shadow">
                    <CardContent className="p-3 text-center">
                      <div className="text-2xl font-black text-red-600">{stats.critical}</div>
                      <p className="text-xs text-red-700">&lt;60</p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                    <Button
                      onClick={openAddScoreDialog}
                  className="flex-1 bg-gradient-to-r from-primary to-teal text-white py-6 rounded-2xl shadow-lg"
                >
                  <Plus className="w-5 h-5 ml-2" />
                  הוסף ציון
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  className="py-6 rounded-2xl border-2"
                >
                  <Upload className="w-5 h-5" />
                </Button>
                <Button
                  onClick={downloadTemplate}
                  variant="outline"
                  className="py-6 rounded-2xl border-2"
                  title="הורד תבנית"
                >
                  <FileSpreadsheet className="w-5 h-5" />
                </Button>
                <Button
                  onClick={exportToExcel}
                  variant="outline"
                  className="py-6 rounded-2xl border-2"
                >
                  ייצוא
                </Button>
              </div>

              {/* Search */}
              {!isRangeMode && (
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input
                    placeholder="חיפוש לפי שם..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pr-10 py-6 rounded-2xl border-2"
                  />
                </div>
              )}

              {/* Scores List */}
              <Card className="border-0 shadow-xl bg-white/90 backdrop-blur rounded-3xl">
                <CardHeader>
                  <CardTitle className="text-slate-800">
                    {isRangeMode && selectedSoldierId 
                      ? selectedSoldierId === "all" ? "ציוני בטיחות - כל החיילים" : `ציוני בטיחות - ${getSoldierName(selectedSoldierId)}`
                      : `ציוני בטיחות - ${getMonthLabel()}`
                    }
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[50vh]">
                    <div className="space-y-3">
                      {isRangeMode && !selectedSoldierId ? (
                        <div className="text-center py-12 text-slate-500">
                          <User className="w-12 h-12 mx-auto mb-3 opacity-30" />
                          <p>בחר חייל לצפייה בציונים</p>
                        </div>
                      ) : isRangeMode && filteredScores.length === 0 ? (
                        <div className="text-center py-12 text-slate-500">
                          <Gauge className="w-12 h-12 mx-auto mb-3 opacity-30" />
                          <p>אין ציונים {isRangeMode ? 'בטווח הנבחר' : 'לחודש זה'}</p>
                        </div>
                      ) : isRangeMode ? (
                        filteredScores.map(score => (
                          <div
                            key={score.id}
                            className={`p-4 rounded-2xl border transition-all ${
                              score.safety_score < 75 ? "bg-red-50/50 border-red-200" : "bg-slate-50 border-slate-200"
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2 flex-wrap">
                                  {isRangeMode ? (
                                    <h4 className="font-bold text-slate-800">
                                      {selectedSoldierId === "all" ? `${getSoldierName(score.soldier_id)} · ` : ""}{getMonthLabelFromDate(score.score_month)}
                                    </h4>
                                  ) : (
                                    <h4 className="font-bold text-slate-800">{getSoldierName(score.soldier_id)}</h4>
                                  )}
                                  <Badge className={`${getScoreColor(score.safety_score)} text-white text-sm font-bold`}>
                                    {score.safety_score}
                                  </Badge>
                                  {score.safety_score < 75 && (
                                    <Badge variant="outline" className="text-red-600 border-red-300">
                                      <AlertTriangle className="w-3 h-3 ml-1" />
                                      דורש שיחה
                                    </Badge>
                                  )}
                                </div>
                                
                                <div className="grid grid-cols-3 gap-2 text-sm text-slate-500">
                                  <div>ק"מ: {score.kilometers || 0}</div>
                                  <div>מהירות: {score.speed_violations || 0}</div>
                                  <div>בלימות: {score.harsh_braking || 0}</div>
                                  <div>פניות: {score.harsh_turns || 0}</div>
                                  <div>האצות: {score.harsh_accelerations || 0}</div>
                                  <div>עקיפות: {score.illegal_overtakes || 0}</div>
                                </div>
                              </div>
                              
                              <div className="flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openEditDialog(score)}
                                  className="rounded-xl"
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => { setScoreToDelete(score); setDeleteConfirmOpen(true); }}
                                  className="rounded-xl text-red-500 hover:text-red-600 hover:bg-red-50"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : singleMonthScoreRows.length === 0 ? (
                        <div className="text-center py-12 text-slate-500">
                          <Gauge className="w-12 h-12 mx-auto mb-3 opacity-30" />
                          <p>אין חיילים רלוונטיים לחודש זה</p>
                        </div>
                      ) : (
                        singleMonthScoreRows.map(({ id, soldier, score }) => (
                          <div
                            key={id}
                            className={`p-4 rounded-2xl border transition-all ${
                              score?.safety_score && score.safety_score < 75 ? "bg-red-50/50 border-red-200" : "bg-slate-50 border-slate-200"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2 flex-wrap">
                                  <h4 className="font-bold text-slate-800">{soldier?.full_name || getSoldierName(id)}</h4>
                                  {soldier?.is_active === false && <Badge variant="outline" className="text-slate-600 border-slate-300">שוחרר/הוסר</Badge>}
                                  {score ? (
                                    <Badge className={`${getScoreColor(score.safety_score)} text-white text-sm font-bold`}>{score.safety_score}</Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-slate-500 border-slate-300">לא הוזן</Badge>
                                  )}
                                </div>
                                {score ? (
                                  <div className="grid grid-cols-3 gap-2 text-sm text-slate-500">
                                    <div>ק"מ: {score.kilometers || 0}</div>
                                    <div>מהירות: {score.speed_violations || 0}</div>
                                    <div>בלימות: {score.harsh_braking || 0}</div>
                                    <div>פניות: {score.harsh_turns || 0}</div>
                                    <div>האצות: {score.harsh_accelerations || 0}</div>
                                    <div>עקיפות: {score.illegal_overtakes || 0}</div>
                                  </div>
                                ) : (
                                  <p className="text-sm text-slate-500">החייל היה רלוונטי בחודש זה, אך עדיין אין לו ציון בטיחות.</p>
                                )}
                              </div>
                              <div className="flex gap-2 shrink-0">
                                {score ? (
                                  <Button variant="ghost" size="icon" onClick={() => openEditDialog(score)} className="rounded-xl">
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                ) : soldier ? (
                                  <Button variant="default" size="sm" onClick={() => openScoreEntryForSoldier(soldier, selectedYear, selectedMonth)} className="rounded-xl">
                                    <Plus className="w-4 h-4 ml-1" />
                                    הזן
                                  </Button>
                                ) : null}
                                {score && (
                                  <Button variant="ghost" size="icon" onClick={() => { setScoreToDelete(score); setDeleteConfirmOpen(true); }} className="rounded-xl text-red-500 hover:text-red-600 hover:bg-red-50">
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Add/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setSelectedSoldierForEntry(null); }}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" dir="rtl">
            <DialogHeader>
              <DialogTitle>
                {editingScore 
                  ? "עריכת ציון" 
                  : selectedSoldierForEntry 
                    ? `הזנת ציון עבור ${selectedSoldierForEntry.full_name}`
                    : "הוספת ציון חדש"
                }
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {/* Soldier selection - only show if not pre-selected */}
              {!selectedSoldierForEntry && (
                <div>
                  <Label>חייל *</Label>
                  <Select 
                    value={formData.soldier_id} 
                    onValueChange={(value) => setFormData({ ...formData, soldier_id: value })}
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="בחר חייל" />
                    </SelectTrigger>
                    <SelectContent>
                      {soldiersForFormMonth.map(soldier => (
                        <SelectItem key={soldier.id} value={soldier.id}>
                          {soldier.full_name} ({soldier.personal_number})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Show selected soldier info if pre-selected */}
              {selectedSoldierForEntry && (
                <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
                  <div className="flex items-center gap-2">
                    <User className="w-5 h-5 text-primary" />
                    <div>
                      <p className="font-bold text-slate-800">{selectedSoldierForEntry.full_name}</p>
                      <p className="text-sm text-slate-500">מ"א: {selectedSoldierForEntry.personal_number}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="p-3 rounded-xl bg-slate-50 border">
                <Label className="font-bold mb-2 block">חודש וציון *</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-slate-500">שנה</Label>
                    <Select value={String(formYear)} onValueChange={(v) => setFormYear(Number(v))}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[2024, 2025, 2026, 2027].map(year => (
                          <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">חודש</Label>
                    <Select value={String(formMonth)} onValueChange={(v) => setFormMonth(Number(v))}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MONTHS_HEB.map(month => (
                          <SelectItem key={month.value} value={String(month.value)}>{month.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                <Label className="text-amber-700 font-bold">ציון בטיחות * (0-100)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={formData.safety_score}
                  onChange={(e) => setFormData({ ...formData, safety_score: Number(e.target.value) })}
                  className="mt-2 bg-white text-lg font-bold text-center text-slate-800"
                />
                {formData.safety_score <= 75 && (
                  <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    ציון מתחת או שווה ל-75 דורש שיחת בירור
                  </p>
                )}
              </div>

              <div>
                <Label>קילומטרים</Label>
                <Input
                  type="number"
                  min={0}
                  value={formData.kilometers}
                  onChange={(e) => setFormData({ ...formData, kilometers: Number(e.target.value) })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">חריגות מהירות</Label>
                  <Input
                    type="number"
                    min={0}
                    value={formData.speed_violations}
                    onChange={(e) => setFormData({ ...formData, speed_violations: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label className="text-xs">בלימות חדות</Label>
                  <Input
                    type="number"
                    min={0}
                    value={formData.harsh_braking}
                    onChange={(e) => setFormData({ ...formData, harsh_braking: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label className="text-xs">פניות חדות</Label>
                  <Input
                    type="number"
                    min={0}
                    value={formData.harsh_turns}
                    onChange={(e) => setFormData({ ...formData, harsh_turns: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label className="text-xs">האצות חדות</Label>
                  <Input
                    type="number"
                    min={0}
                    value={formData.harsh_accelerations}
                    onChange={(e) => setFormData({ ...formData, harsh_accelerations: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div>
                <Label>עקיפות מסוכנות</Label>
                <Input
                  type="number"
                  min={0}
                  value={formData.illegal_overtakes}
                  onChange={(e) => setFormData({ ...formData, illegal_overtakes: Number(e.target.value) })}
                />
              </div>

              <div>
                <Label>הערות</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="הערות נוספות..."
                />
              </div>
            </div>

            <DialogFooter className="gap-2 mt-4">
              <Button variant="outline" onClick={() => { setDialogOpen(false); setSelectedSoldierForEntry(null); }}>
                ביטול
              </Button>
              <Button onClick={handleSubmit} className="bg-primary">
                {editingScore ? "עדכן" : "הוסף"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirm Dialog */}
        <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <DialogContent dir="rtl">
            <DialogHeader>
              <DialogTitle>אישור מחיקה</DialogTitle>
            </DialogHeader>
            <p className="text-slate-600">
              האם אתה בטוח שברצונך למחוק את הציון של {scoreToDelete ? getSoldierName(scoreToDelete.soldier_id) : ""}?
            </p>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
                ביטול
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                מחק
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Followup Dialog */}
        <Dialog open={followupDialogOpen} onOpenChange={setFollowupDialogOpen}>
          <DialogContent dir="rtl">
            <DialogHeader>
              <DialogTitle>
                {followupType === 'clarification_talk' ? 'רישום שיחת בירור' : 'רישום מבחן'}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              {followupSoldier && (
                <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
                  <div className="flex items-center gap-2">
                    <User className="w-5 h-5 text-primary" />
                    <div>
                      <p className="font-bold text-slate-800">{followupSoldier.full_name}</p>
                      <p className="text-sm text-slate-500">מ"א: {followupSoldier.personal_number}</p>
                    </div>
                  </div>
                </div>
              )}
              
              <div>
                <Label>הערות (אופציונלי)</Label>
                <Textarea
                  value={followupNotes}
                  onChange={(e) => setFollowupNotes(e.target.value)}
                  placeholder="פרטים נוספים על השיחה/מבחן..."
                />
              </div>
            </div>
            
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setFollowupDialogOpen(false)}>
                ביטול
              </Button>
              <Button onClick={handleFollowupSubmit} className="bg-primary">
                {followupType === 'clarification_talk' ? 'סמן שיחה בוצעה' : 'סמן מבחן בוצע'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Excellence Candidates Dialog */}
        <Dialog open={excellenceDialogOpen} onOpenChange={setExcellenceDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Trophy className="w-6 h-6 text-amber-500" />
                מצטיין {MONTHS_HEB.find(m => m.value === excellenceMonth)?.label} {excellenceYear}
              </DialogTitle>
              <p className="text-sm text-slate-500 mt-1">
                (על סמך נתוני {MONTHS_HEB.find(m => m.value === (excellenceMonth === 1 ? 12 : excellenceMonth - 1))?.label} {excellenceMonth === 1 ? excellenceYear - 1 : excellenceYear})
              </p>
            </DialogHeader>
            
            <div className="space-y-3">
              <p className="text-xs text-slate-500">לחץ על מועמד לצפייה בפרטים מלאים</p>
              {excellenceCandidates.slice(0, 5).map((candidate, index) => (
                <div
                  key={candidate.soldier.id}
                  onClick={() => openCandidateDetail(candidate)}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                    candidate.isEligible 
                      ? "bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-300 hover:shadow-lg"
                      : "bg-slate-50 border-slate-200 opacity-60 hover:opacity-80"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                        index === 0 && candidate.isEligible
                          ? "bg-gradient-to-br from-amber-400 to-yellow-500 text-white"
                          : "bg-slate-200 text-slate-600"
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-800">{candidate.soldier.full_name}</h4>
                          {index === 0 && candidate.isEligible && (
                            <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-sm text-slate-600">
                          <span>ציון: <strong>{candidate.safetyScore}</strong></span>
                          <span>ק"מ: <strong>{candidate.kilometers}</strong></span>
                          <span>ניקוד משוקלל: <strong>{candidate.calculatedScore.toFixed(1)}</strong></span>
                        </div>
                        
                        {!candidate.isEligible && (
                          <div className="mt-2">
                            {candidate.disqualifyReasons.map((reason, i) => (
                              <Badge key={i} variant="outline" className="text-red-600 border-red-300 mr-1 text-xs">
                                {reason}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {candidate.isEligible && (
                      <Button
                        onClick={(e) => { e.stopPropagation(); selectExcellenceWinner(candidate); }}
                        className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white"
                      >
                        <Crown className="w-4 h-4 ml-1" />
                        בחר
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              
              {excellenceCandidates.length === 0 && (
                <div className="text-center py-12 text-slate-500">
                  <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>אין מועמדים כשירים להצטיינות</p>
                </div>
              )}
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setExcellenceDialogOpen(false)}>
                סגור
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Import Dialog */}
        <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" dir="rtl">
            <DialogHeader>
              <DialogTitle>ייבוא ציוני בטיחות</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <p className="text-slate-600">
                נמצאו {importData.length} רשומות. הציונים ייובאו לחודש {getMonthLabel()}.
              </p>
              
              <ScrollArea className="h-[300px] border rounded-xl p-3">
                <div className="space-y-2">
                  {importData.map((row, idx) => {
                    const soldier = soldiersForSelectedMonth.find(s => s.personal_number === String(row.personal_number));
                    return (
                      <div 
                        key={idx}
                        className={`p-3 rounded-lg flex items-center justify-between ${
                          soldier ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {soldier ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : (
                            <AlertTriangle className="w-5 h-5 text-red-600" />
                          )}
                          <div>
                            <p className="font-bold">{row.personal_number}</p>
                            <p className="text-sm text-slate-500">
                              {soldier ? soldier.full_name : 'לא נמצא במערכת'}
                            </p>
                          </div>
                        </div>
                        <Badge className={`${row.safety_score >= 75 ? 'bg-emerald-500' : 'bg-red-500'} text-white`}>
                          ציון: {row.safety_score}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
              
              <p className="text-sm text-slate-500">
                <CheckCircle className="w-4 h-4 inline ml-1 text-green-600" />
                {importData.filter(r => soldiersForSelectedMonth.some(s => s.personal_number === String(r.personal_number))).length} רשומות תקינות
                <span className="mx-2">|</span>
                <AlertTriangle className="w-4 h-4 inline ml-1 text-red-600" />
                {importData.filter(r => !soldiersForSelectedMonth.some(s => s.personal_number === String(r.personal_number))).length} לא נמצאו
              </p>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setImportDialogOpen(false)}>
                ביטול
              </Button>
              <Button onClick={handleImport} disabled={importing} className="bg-primary">
                {importing ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
                ייבא ציונים
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Candidate Detail Dialog */}
        <Dialog open={candidateDetailOpen} onOpenChange={setCandidateDetailOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                פרטי מועמד: {selectedCandidate?.soldier.full_name}
              </DialogTitle>
            </DialogHeader>
            
            {selectedCandidate && (
              <div className="space-y-4">
                {/* Safety Score Section */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200">
                  <h4 className="font-bold text-amber-800 mb-3 flex items-center gap-2">
                    <Gauge className="w-4 h-4" />
                    ציון בטיחות
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">ציון כללי:</span>
                      <Badge className={`${getScoreColor(selectedCandidate.safetyScore)} text-white`}>
                        {selectedCandidate.safetyScore}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">קילומטרים:</span>
                      <strong>{selectedCandidate.kilometers}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">חריגות מהירות:</span>
                      <strong className={selectedCandidate.speedViolations > 0 ? "text-red-600" : "text-emerald-600"}>
                        {selectedCandidate.speedViolations}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">בלימות חדות:</span>
                      <strong>{selectedCandidate.harshBraking || 0}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">פניות חדות:</span>
                      <strong>{selectedCandidate.harshTurns || 0}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">האצות חדות:</span>
                      <strong>{selectedCandidate.harshAccelerations || 0}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">עקיפות מסוכנות:</span>
                      <strong>{selectedCandidate.illegalOvertakes || 0}</strong>
                    </div>
                  </div>
                </div>
                
                {/* Events Section */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    אירועים
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">תאונות:</span>
                      <strong className={selectedCandidate.accidentsCount > 0 ? "text-red-600" : "text-emerald-600"}>
                        {selectedCandidate.accidentsCount}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">עונשים/שלילות:</span>
                      <strong className={selectedCandidate.punishmentsCount > 0 ? "text-red-600" : "text-emerald-600"}>
                        {selectedCandidate.punishmentsCount}
                      </strong>
                    </div>
                  </div>
                </div>
                
                {/* Cleaning Parades & Inspections */}
                <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200">
                  <h4 className="font-bold text-blue-800 mb-3 flex items-center gap-2">
                    <ClipboardCheck className="w-4 h-4" />
                    מסדרים וביקורות
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">מסדרי ניקיון:</span>
                      <strong>{selectedCandidate.cleaningParadesCount || 0}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">ביקורות:</span>
                      <strong>{selectedCandidate.inspectionsCount || 0}</strong>
                    </div>
                    <div className="flex justify-between col-span-2">
                      <span className="text-slate-600">ממוצע ציון ביקורות:</span>
                      <strong>{selectedCandidate.avgInspectionScore?.toFixed(0) || "אין"}</strong>
                    </div>
                  </div>
                </div>
                
                {/* Attendance Section */}
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
                  <h4 className="font-bold text-emerald-800 mb-3 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    נוכחות
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">אירועים שהשתתף:</span>
                      <strong>{selectedCandidate.eventsAttended || 0} מתוך {selectedCandidate.eventsTotal || 0}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">אחוז נוכחות:</span>
                      <strong className={
                        (selectedCandidate.attendanceRate || 0) >= 80 ? "text-emerald-600" : 
                        (selectedCandidate.attendanceRate || 0) >= 60 ? "text-amber-600" : "text-red-600"
                      }>
                        {selectedCandidate.attendanceRate?.toFixed(0) || 0}%
                      </strong>
                    </div>
                  </div>
                </div>
                
                {/* Calculated Score */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-purple-800">ניקוד משוקלל סופי:</span>
                    <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-lg px-4 py-1">
                      {selectedCandidate.calculatedScore.toFixed(2)}
                    </Badge>
                  </div>
                </div>
                
                {/* Eligibility Status */}
                {!selectedCandidate.isEligible && (
                  <div className="p-4 rounded-2xl bg-red-50 border border-red-200">
                    <h4 className="font-bold text-red-800 mb-2">סיבות פסילה:</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedCandidate.disqualifyReasons.map((reason, i) => (
                        <Badge key={i} variant="outline" className="text-red-600 border-red-300">
                          {reason}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setCandidateDetailOpen(false)}>
                סגור
              </Button>
              {selectedCandidate?.isEligible && (
                <Button 
                  onClick={() => {
                    selectExcellenceWinner(selectedCandidate);
                    setCandidateDetailOpen(false);
                  }}
                  className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white"
                >
                  <Crown className="w-4 h-4 ml-1" />
                  בחר כמצטיין
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Manual Excellence Dialog */}
        <Dialog open={manualExcellenceDialogOpen} onOpenChange={setManualExcellenceDialogOpen}>
          <DialogContent className="max-w-md" dir="rtl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-500" />
                הוספת מצטיין חיצוני
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <p className="text-sm text-slate-500">
                הוסף מצטיין חיצוני שלא קשור לחישוב האוטומטי
              </p>
              
              <div>
                <Label>חייל *</Label>
                <Select 
                  value={manualExcellenceData.soldier_id} 
                  onValueChange={(value) => setManualExcellenceData({ ...manualExcellenceData, soldier_id: value })}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="בחר חייל" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeSoldiers.map(soldier => (
                      <SelectItem key={soldier.id} value={soldier.id}>
                        {soldier.full_name} ({soldier.personal_number})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>שנה</Label>
                  <Select 
                    value={String(manualExcellenceData.excellence_year)} 
                    onValueChange={(v) => setManualExcellenceData({ ...manualExcellenceData, excellence_year: Number(v) })}
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[2024, 2025, 2026, 2027].map(year => (
                        <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>חודש</Label>
                  <Select 
                    value={String(manualExcellenceData.excellence_month)} 
                    onValueChange={(v) => setManualExcellenceData({ ...manualExcellenceData, excellence_month: Number(v) })}
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTHS_HEB.map(month => (
                        <SelectItem key={month.value} value={String(month.value)}>{month.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>ציון בטיחות (אופציונלי)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={manualExcellenceData.safety_score}
                    onChange={(e) => setManualExcellenceData({ ...manualExcellenceData, safety_score: Number(e.target.value) })}
                    className="rounded-xl"
                  />
                </div>
                <div>
                  <Label>קילומטרים (אופציונלי)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={manualExcellenceData.kilometers}
                    onChange={(e) => setManualExcellenceData({ ...manualExcellenceData, kilometers: Number(e.target.value) })}
                    className="rounded-xl"
                  />
                </div>
              </div>
            </div>
            
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setManualExcellenceDialogOpen(false)}>
                ביטול
              </Button>
              <Button 
                onClick={handleManualExcellenceSubmit}
                className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white"
              >
                <Crown className="w-4 h-4 ml-1" />
                הוסף מצטיין
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}