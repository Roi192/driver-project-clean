import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { he } from "date-fns/locale";
import { 
  ClipboardCheck, 
  Plus, 
  Loader2,
  FileSpreadsheet,
  Search,
  User,
  Car,
  Shield,
  MapPin,
  HelpCircle,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Edit,
  Trash2,
  Eye,
  CheckCircle,
  XCircle,
  Sword
} from "lucide-react";
import { OUTPOSTS } from "@/lib/constants";
import * as XLSX from "xlsx";
import unitLogo from "@/assets/unit-logo.png";

interface Soldier {
  id: string;
  full_name: string;
  personal_number: string;
}

interface InspectionFull {
  id: string;
  inspection_date: string;
  created_at?: string;
  platoon: string;
  commander_name: string;
  soldier_id: string;
  inspector_name: string;
  combat_score: number;
  vehicle_score: number;
  procedures_score: number;
  safety_score: number;
  routes_familiarity_score: number;
  simulations_score: number;
  total_score: number;
  general_notes: string | null;
  soldiers?: Soldier;
  // Combat details
  combat_debrief_by: string | null;
  combat_driver_participated: boolean | null;
  combat_driver_in_debrief: boolean | null;
  // Vehicle details
  vehicle_tlt_oil: boolean | null;
  vehicle_tlt_water: boolean | null;
  vehicle_tlt_nuts: boolean | null;
  vehicle_tlt_pressure: boolean | null;
  vehicle_vardim_knowledge: boolean | null;
  vehicle_mission_sheet: boolean | null;
  vehicle_work_card: boolean | null;
  vehicle_clean: boolean | null;
  vehicle_equipment_secured: boolean | null;
  // Procedures details
  procedures_descent_drill: boolean | null;
  procedures_rollover_drill: boolean | null;
  procedures_fire_drill: boolean | null;
  procedures_combat_equipment: boolean | null;
  procedures_weapon_present: boolean | null;
  // Safety details
  safety_ten_commandments: boolean | null;
  safety_driver_tools_extinguisher: boolean | null;
  safety_driver_tools_jack: boolean | null;
  safety_driver_tools_wheel_key: boolean | null;
  safety_driver_tools_vest: boolean | null;
  safety_driver_tools_triangle: boolean | null;
  safety_driver_tools_license: boolean | null;
  // Routes details
  routes_notes: string | null;
  // Simulations details
  simulations_questions: Record<string, boolean> | null;
}

const SIMULATION_QUESTIONS = [
  "מה על הנהג לעשות בעת כניסת רכב לנתיב שלו?",
  "איך ומה אני עושה בטל\"ת?",
  "איפה עליי לעצור בעת תקלה חימושית ברכב? מתי אשתמש בהילוכים?",
  "מה עליי לעשות בעת תאונה?",
  "איפה אני עושה את הנקודות תרגולות?",
  "במידה ואני נמצא באירוע מבצעי האם מותר לי לעבור על חוקי התעבורה?",
  "הגעתי לצומת ויש לי ירוק האם אני נכנס ישר לצומת או עליי להסתכל שהצומת נקייה?",
  "מהי מהירות הנסיעה בכל הגזרה?",
  "במידה ואני רוצה להכנס לפילבוקס או מעיין איך אני נכנס?",
  "מה הם 2 הנקודות היחידות המותרות לפרסה בצומת בגזרה?"
];

export default function Inspections() {
  const { isAdmin, isPlatoonCommander, canAccessInspections, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [inspections, setInspections] = useState<InspectionFull[]>([]);
  const [soldiers, setSoldiers] = useState<Soldier[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentStep, setCurrentStep] = useState(0);
  
  // KPI dialogs
  const [outstandingDialogOpen, setOutstandingDialogOpen] = useState(false);
  const [improvementDialogOpen, setImprovementDialogOpen] = useState(false);
  
  // Edit/Delete/View state
  const [editingInspection, setEditingInspection] = useState<InspectionFull | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [inspectionToDelete, setInspectionToDelete] = useState<string | null>(null);
  const [viewInspection, setViewInspection] = useState<InspectionFull | null>(null);
  const [viewTab, setViewTab] = useState("overview");
  
  // Safety files for vulnerability helper
  const [vulnerabilityFiles, setVulnerabilityFiles] = useState<{title: string; content: string | null}[]>([]);

  // Live datetime for new inspections
  const [liveDateTime, setLiveDateTime] = useState(new Date());
  
  useEffect(() => {
    const timer = setInterval(() => {
      setLiveDateTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const [formData, setFormData] = useState({
    inspection_date: format(new Date(), "yyyy-MM-dd'T'HH:mm:ss"),
    platoon: "",
    commander_name: "",
    soldier_id: "",
    inspector_name: "",
    // Combat (10 pts)
    combat_debrief_by: "",
    combat_driver_participated: false,
    combat_driver_in_debrief: false,
    // Vehicle (30 pts)
    vehicle_tlt_oil: false,
    vehicle_tlt_water: false,
    vehicle_tlt_nuts: false,
    vehicle_tlt_pressure: false,
    vehicle_vardim_knowledge: false,
    vehicle_mission_sheet: false,
    vehicle_work_card: false,
    vehicle_clean: false,
    vehicle_equipment_secured: false,
    // Procedures (20 pts)
    procedures_descent_drill: false,
    procedures_rollover_drill: false,
    procedures_fire_drill: false,
    procedures_combat_equipment: false,
    procedures_weapon_present: false,
    // Safety (10 pts)
    safety_ten_commandments: false,
    safety_driver_tools_extinguisher: false,
    safety_driver_tools_jack: false,
    safety_driver_tools_wheel_key: false,
    safety_driver_tools_vest: false,
    safety_driver_tools_triangle: false,
    safety_driver_tools_license: false,
    // Routes (15 pts)
    routes_familiarity_score: 0,
    routes_notes: "",
    // Simulations (15 pts)
    simulations_answers: {} as Record<number, boolean>,
    general_notes: "",
  });

  useEffect(() => {
    if (!authLoading && !canAccessInspections) {
      navigate("/");
    }
  }, [canAccessInspections, authLoading, navigate]);

  useEffect(() => {
    fetchData();
  }, []);

  // Fetch vulnerability files when platoon changes
  useEffect(() => {
    const fetchVulnerabilities = async () => {
      if (!formData.platoon) {
        setVulnerabilityFiles([]);
        return;
      }
      
      const { data, error } = await supabase
        .from("safety_files")
        .select("title, content")
        .eq("outpost", formData.platoon)
        .eq("category", "vulnerability");
      
      if (!error && data) {
        setVulnerabilityFiles(data);
      }
    };
    
    fetchVulnerabilities();
  }, [formData.platoon]);

  const fetchData = async () => {
    setLoading(true);
    
    const [inspectionsRes, soldiersRes] = await Promise.all([
      supabase
        .from("inspections")
        .select("*, soldiers(id, full_name, personal_number)")
        .order("inspection_date", { ascending: false })
        .order("created_at", { ascending: false }),
      supabase
        .from("soldiers")
        .select("id, full_name, personal_number")
        .eq("is_active", true)
        .order("full_name")
    ]);

    if (!inspectionsRes.error) setInspections((inspectionsRes.data || []) as InspectionFull[]);
    if (!soldiersRes.error) setSoldiers(soldiersRes.data || []);

    setLoading(false);
  };

  const calculateScores = () => {
    // Combat: 10 points (3 items)
    let combatScore = 0;
    if (formData.combat_debrief_by) combatScore += 3;
    if (formData.combat_driver_participated) combatScore += 4;
    if (formData.combat_driver_in_debrief) combatScore += 3;

    // Vehicle: 30 points (9 items)
    let vehicleScore = 0;
    const vehicleItems = [
      formData.vehicle_tlt_oil, formData.vehicle_tlt_water, formData.vehicle_tlt_nuts,
      formData.vehicle_tlt_pressure, formData.vehicle_vardim_knowledge, formData.vehicle_mission_sheet,
      formData.vehicle_work_card, formData.vehicle_clean, formData.vehicle_equipment_secured
    ];
    vehicleScore = vehicleItems.filter(Boolean).length * 3.33;

    // Procedures: 20 points (4 items - 5 points each)
    let proceduresScore = 0;
    const procedureItems = [
      formData.procedures_descent_drill, formData.procedures_rollover_drill,
      formData.procedures_fire_drill, formData.procedures_combat_equipment
    ];
    proceduresScore = procedureItems.filter(Boolean).length * 5;

    // Safety: 10 points (7 items)
    let safetyScore = 0;
    const safetyItems = [
      formData.safety_ten_commandments, formData.safety_driver_tools_extinguisher,
      formData.safety_driver_tools_jack, formData.safety_driver_tools_wheel_key,
      formData.safety_driver_tools_vest, formData.safety_driver_tools_triangle,
      formData.safety_driver_tools_license
    ];
    safetyScore = safetyItems.filter(Boolean).length * (10 / 7);

    // Routes: 15 points (manual)
    const routesScore = formData.routes_familiarity_score;

    // Simulations: 15 points (2 random questions) - 7.5 points each
    const correctAnswers = Object.entries(formData.simulations_answers)
      .filter(([key, value]) => !key.startsWith('answer_') && !key.startsWith('question_') && value === true)
      .length;
    const simulationsScore = correctAnswers * 7.5; // 7.5 points per correct answer, max 15

    return {
      combat: Math.round(combatScore),
      vehicle: Math.round(vehicleScore),
      procedures: Math.round(proceduresScore),
      safety: Math.round(safetyScore),
      routes: Math.round(routesScore),
      simulations: Math.round(Math.min(simulationsScore, 15)), // Cap at 15
      total: Math.round(combatScore + vehicleScore + proceduresScore + safetyScore + routesScore + Math.min(simulationsScore, 15))
    };
  };

  const handleSubmit = async () => {
    if (!formData.soldier_id || !formData.platoon || !formData.commander_name || !formData.inspector_name) {
      toast.error("יש למלא את כל השדות הנדרשים");
      return;
    }

    const scores = calculateScores();

    const data = {
      inspection_date: editingInspection ? formData.inspection_date : format(new Date(), "yyyy-MM-dd'T'HH:mm:ss"),
      platoon: formData.platoon,
      commander_name: formData.commander_name,
      soldier_id: formData.soldier_id,
      inspector_name: formData.inspector_name,
      combat_debrief_by: formData.combat_debrief_by,
      combat_driver_participated: formData.combat_driver_participated,
      combat_driver_in_debrief: formData.combat_driver_in_debrief,
      combat_score: scores.combat,
      vehicle_tlt_oil: formData.vehicle_tlt_oil,
      vehicle_tlt_water: formData.vehicle_tlt_water,
      vehicle_tlt_nuts: formData.vehicle_tlt_nuts,
      vehicle_tlt_pressure: formData.vehicle_tlt_pressure,
      vehicle_vardim_knowledge: formData.vehicle_vardim_knowledge,
      vehicle_mission_sheet: formData.vehicle_mission_sheet,
      vehicle_work_card: formData.vehicle_work_card,
      vehicle_clean: formData.vehicle_clean,
      vehicle_equipment_secured: formData.vehicle_equipment_secured,
      vehicle_score: scores.vehicle,
      procedures_descent_drill: formData.procedures_descent_drill,
      procedures_rollover_drill: formData.procedures_rollover_drill,
      procedures_fire_drill: formData.procedures_fire_drill,
      procedures_combat_equipment: formData.procedures_combat_equipment,
      procedures_weapon_present: formData.procedures_weapon_present,
      procedures_score: scores.procedures,
      safety_ten_commandments: formData.safety_ten_commandments,
      safety_driver_tools_extinguisher: formData.safety_driver_tools_extinguisher,
      safety_driver_tools_jack: formData.safety_driver_tools_jack,
      safety_driver_tools_wheel_key: formData.safety_driver_tools_wheel_key,
      safety_driver_tools_vest: formData.safety_driver_tools_vest,
      safety_driver_tools_triangle: formData.safety_driver_tools_triangle,
      safety_driver_tools_license: formData.safety_driver_tools_license,
      safety_score: scores.safety,
      routes_familiarity_score: scores.routes,
      routes_notes: formData.routes_notes,
      // Store both questions and answers together
      simulations_questions: {
        ...formData.simulations_answers,
        // Store the actual question texts
        question_0: randomQuestions[0] || '',
        question_1: randomQuestions[1] || '',
      },
      simulations_score: scores.simulations,
      total_score: scores.total,
      general_notes: formData.general_notes,
    };

    if (editingInspection) {
      const { error } = await supabase.from("inspections").update(data).eq("id", editingInspection.id);
      if (error) {
        toast.error("שגיאה בעדכון הביקורת");
        console.error(error);
      } else {
        toast.success("הביקורת עודכנה בהצלחה");
        fetchData();
        setDialogOpen(false);
        resetForm();
      }
    } else {
      const { error } = await supabase.from("inspections").insert(data);
      if (error) {
        toast.error("שגיאה בשמירת הביקורת");
        console.error(error);
      } else {
        toast.success("הביקורת נשמרה בהצלחה");
        fetchData();
        setDialogOpen(false);
        resetForm();
      }
    }
  };

  const resetForm = () => {
    setFormData({
      inspection_date: format(new Date(), "yyyy-MM-dd'T'HH:mm:ss"),
      platoon: "",
      commander_name: "",
      soldier_id: "",
      inspector_name: "",
      combat_debrief_by: "",
      combat_driver_participated: false,
      combat_driver_in_debrief: false,
      vehicle_tlt_oil: false,
      vehicle_tlt_water: false,
      vehicle_tlt_nuts: false,
      vehicle_tlt_pressure: false,
      vehicle_vardim_knowledge: false,
      vehicle_mission_sheet: false,
      vehicle_work_card: false,
      vehicle_clean: false,
      vehicle_equipment_secured: false,
      procedures_descent_drill: false,
      procedures_rollover_drill: false,
      procedures_fire_drill: false,
      procedures_combat_equipment: false,
      procedures_weapon_present: false,
      safety_ten_commandments: false,
      safety_driver_tools_extinguisher: false,
      safety_driver_tools_jack: false,
      safety_driver_tools_wheel_key: false,
      safety_driver_tools_vest: false,
      safety_driver_tools_triangle: false,
      safety_driver_tools_license: false,
      routes_familiarity_score: 0,
      routes_notes: "",
      simulations_answers: {},
      general_notes: "",
    });
    setCurrentStep(0);
    setEditingInspection(null);
  };

  const openEditDialog = (inspection: InspectionFull) => {
    setEditingInspection(inspection);
    setFormData({
      inspection_date: inspection.inspection_date,
      platoon: inspection.platoon,
      commander_name: inspection.commander_name,
      soldier_id: inspection.soldier_id,
      inspector_name: inspection.inspector_name,
      combat_debrief_by: inspection.combat_debrief_by || "",
      combat_driver_participated: inspection.combat_driver_participated || false,
      combat_driver_in_debrief: inspection.combat_driver_in_debrief || false,
      vehicle_tlt_oil: inspection.vehicle_tlt_oil || false,
      vehicle_tlt_water: inspection.vehicle_tlt_water || false,
      vehicle_tlt_nuts: inspection.vehicle_tlt_nuts || false,
      vehicle_tlt_pressure: inspection.vehicle_tlt_pressure || false,
      vehicle_vardim_knowledge: inspection.vehicle_vardim_knowledge || false,
      vehicle_mission_sheet: inspection.vehicle_mission_sheet || false,
      vehicle_work_card: inspection.vehicle_work_card || false,
      vehicle_clean: inspection.vehicle_clean || false,
      vehicle_equipment_secured: inspection.vehicle_equipment_secured || false,
      procedures_descent_drill: inspection.procedures_descent_drill || false,
      procedures_rollover_drill: inspection.procedures_rollover_drill || false,
      procedures_fire_drill: inspection.procedures_fire_drill || false,
      procedures_combat_equipment: inspection.procedures_combat_equipment || false,
      procedures_weapon_present: inspection.procedures_weapon_present || false,
      safety_ten_commandments: inspection.safety_ten_commandments || false,
      safety_driver_tools_extinguisher: inspection.safety_driver_tools_extinguisher || false,
      safety_driver_tools_jack: inspection.safety_driver_tools_jack || false,
      safety_driver_tools_wheel_key: inspection.safety_driver_tools_wheel_key || false,
      safety_driver_tools_vest: inspection.safety_driver_tools_vest || false,
      safety_driver_tools_triangle: inspection.safety_driver_tools_triangle || false,
      safety_driver_tools_license: inspection.safety_driver_tools_license || false,
      routes_familiarity_score: inspection.routes_familiarity_score || 0,
      routes_notes: inspection.routes_notes || "",
      simulations_answers: (inspection.simulations_questions as Record<number, boolean>) || {},
      general_notes: inspection.general_notes || "",
    });
    setCurrentStep(0);
    setDialogOpen(true);
  };

  const exportToExcel = () => {
    const data = inspections.map(i => ({
      "תאריך": format(parseISO(i.inspection_date), "dd/MM/yyyy"),
      "שם החייל": i.soldiers?.full_name || "-",
      "פלוגה": i.platoon,
      "מפקד": i.commander_name,
      "מבצע הביקורת": i.inspector_name,
      "נוהל קרב": `${i.combat_score}/10`,
      "רכב": `${i.vehicle_score}/30`,
      "נהלים": `${i.procedures_score}/20`,
      "בטיחות": `${i.safety_score}/10`,
      "נתבים": `${i.routes_familiarity_score}/15`,
      "סימולציות": `${i.simulations_score}/15`,
      "ציון כולל": `${i.total_score}/100`,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "ביקורות");
    XLSX.writeFile(wb, `ביקורות_${format(new Date(), "dd-MM-yyyy")}.xlsx`);
    toast.success("הקובץ יוצא בהצלחה");
  };

  const deleteInspection = async (id: string) => {
    const { error } = await supabase.from("inspections").delete().eq("id", id);
    if (error) {
      toast.error("שגיאה במחיקת הביקורת");
    } else {
      toast.success("הביקורת נמחקה בהצלחה");
      fetchData();
    }
    setDeleteDialogOpen(false);
    setInspectionToDelete(null);
  };

  const getScoreColor = (score: number, max: number) => {
    const percentage = (score / max) * 100;
    if (percentage >= 80) return "text-emerald-600";
    if (percentage >= 60) return "text-amber-600";
    return "text-red-600";
  };

  const getInspectionPerformedAt = (inspection: Pick<InspectionFull, "created_at" | "inspection_date">) =>
    parseISO(inspection.created_at ?? inspection.inspection_date);

  // Check item renderer for view dialog
  const CheckItem = ({ label, checked }: { label: string; checked: boolean | null }) => (
    <div className="flex items-center gap-2 p-2 rounded-lg bg-white border">
      {checked ? (
        <CheckCircle className="w-4 h-4 text-emerald-500" />
      ) : (
        <XCircle className="w-4 h-4 text-red-400" />
      )}
      <span className={`text-sm ${checked ? 'text-slate-700' : 'text-slate-400'}`}>{label}</span>
    </div>
  );

  // KPI calculations
  const avgScore = inspections.length > 0 
    ? Math.round(inspections.reduce((sum, i) => sum + i.total_score, 0) / inspections.length)
    : 0;
  
  const belowAvgSoldiers = soldiers.filter(s => {
    const soldierInspections = inspections.filter(i => i.soldier_id === s.id);
    if (soldierInspections.length === 0) return false;
    const avg = soldierInspections.reduce((sum, i) => sum + i.total_score, 0) / soldierInspections.length;
    return avg < 60;
  });

  const aboveAvgSoldiers = soldiers.filter(s => {
    const soldierInspections = inspections.filter(i => i.soldier_id === s.id);
    if (soldierInspections.length === 0) return false;
    const avg = soldierInspections.reduce((sum, i) => sum + i.total_score, 0) / soldierInspections.length;
    return avg >= 80;
  });

  // Generate random questions when dialog opens (not during component mount)
  const [randomQuestions, setRandomQuestions] = useState<string[]>([]);
  
  // Update random questions when form dialog opens
  useEffect(() => {
    if (dialogOpen && !editingInspection) {
      const shuffled = [...SIMULATION_QUESTIONS].sort(() => 0.5 - Math.random());
      setRandomQuestions(shuffled.slice(0, 2));
    }
  }, [dialogOpen, editingInspection]);

  if (authLoading || loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  const steps = ["פרטים כלליים", "נוהל קרב", "רכב", "נהלים", "בטיחות", "נתבים", "מקתגים"];

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-br from-white via-slate-50 to-white pb-24" dir="rtl">
        {/* Header */}
        <div className="relative overflow-hidden bg-gradient-to-l from-slate-900 via-slate-800 to-slate-900 px-4 py-8">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--gold)/0.2),transparent_50%)]" />
          <div className="absolute top-4 left-4 opacity-20">
            <img src={unitLogo} alt="" className="w-20 h-20" />
          </div>
          
          <div className="relative z-10 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/20 border border-blue-500/30 mb-4">
              <ClipboardCheck className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-bold text-blue-400">ביקורות</span>
            </div>
            <h1 className="text-2xl font-black text-white mb-2">טפסי ביקורת</h1>
            <p className="text-slate-400 text-sm">{inspections.length} ביקורות</p>
          </div>
        </div>

        <div className="px-4 py-6 space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-3 gap-3">
            <Card className="border-0 bg-gradient-to-br from-blue-50 to-indigo-50">
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-black text-blue-600">{avgScore}</p>
                <p className="text-xs text-slate-600">ממוצע</p>
              </CardContent>
            </Card>
            <Card 
              className="border-0 bg-gradient-to-br from-emerald-50 to-teal-50 cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => setOutstandingDialogOpen(true)}
            >
              <CardContent className="p-3 text-center">
                <div className="flex items-center justify-center gap-1">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  <p className="text-2xl font-black text-emerald-600">{aboveAvgSoldiers.length}</p>
                </div>
                <p className="text-xs text-slate-600">מצטיינים</p>
                <p className="text-[10px] text-emerald-500">לחץ לצפייה</p>
              </CardContent>
            </Card>
            <Card 
              className="border-0 bg-gradient-to-br from-red-50 to-orange-50 cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => setImprovementDialogOpen(true)}
            >
              <CardContent className="p-3 text-center">
                <div className="flex items-center justify-center gap-1">
                  <TrendingDown className="w-4 h-4 text-red-600" />
                  <p className="text-2xl font-black text-red-600">{belowAvgSoldiers.length}</p>
                </div>
                <p className="text-xs text-slate-600">לשיפור</p>
                <p className="text-[10px] text-red-500">לחץ לצפייה</p>
              </CardContent>
            </Card>
          </div>

          {/* Soldiers needing improvement */}
          {belowAvgSoldiers.length > 0 && (
            <Card className="border-0 bg-gradient-to-br from-red-50 to-orange-50 shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-red-800 text-base">
                  <AlertTriangle className="w-5 h-5" />
                  חיילים הדורשים שיפור
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {belowAvgSoldiers.map(s => (
                    <Badge key={s.id} className="bg-red-500 text-white">{s.full_name}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              onClick={() => { resetForm(); setDialogOpen(true); }}
              className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white py-6 rounded-2xl shadow-lg"
            >
              <Plus className="w-5 h-5 ml-2" />
              ביקורת חדשה
            </Button>
            <Button
              onClick={exportToExcel}
              variant="outline"
              className="py-6 rounded-2xl border-2"
            >
              <FileSpreadsheet className="w-5 h-5" />
            </Button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              placeholder="חיפוש..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10 py-6 rounded-2xl border-2"
            />
          </div>

          {/* Inspections List */}
          <Card className="border-0 shadow-xl bg-white/90 backdrop-blur rounded-3xl">
            <CardHeader>
              <CardTitle className="text-slate-800">רשימת ביקורות</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[55vh] md:h-[65vh]">
                <div className="space-y-3">
                  {inspections.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">
                      <ClipboardCheck className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>אין ביקורות</p>
                    </div>
                  ) : (
                    inspections.filter(i => 
                      i.soldiers?.full_name?.includes(searchTerm) ||
                      i.platoon.includes(searchTerm)
                    ).map(inspection => (
                      <div key={inspection.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-slate-800">{inspection.soldiers?.full_name}</h4>
                            <p className="text-sm text-slate-500">
                              {format(getInspectionPerformedAt(inspection), "dd/MM/yyyy HH:mm")} | {inspection.platoon}
                            </p>
                          </div>
                          <Badge className={`${inspection.total_score >= 80 ? 'bg-emerald-500' : inspection.total_score >= 60 ? 'bg-amber-500' : 'bg-red-500'} text-white text-lg px-3 flex-shrink-0`}>
                            {inspection.total_score}
                          </Badge>
                        </div>
                        
                        <ScrollArea className="w-full" dir="rtl">
                          <div className="flex gap-2 text-xs min-w-[500px] pb-2">
                            <div className="text-center p-2 rounded-lg bg-white flex-1">
                              <span className={`font-bold ${getScoreColor(inspection.combat_score, 10)}`}>{inspection.combat_score}/10</span>
                              <p className="text-slate-500">קרב</p>
                            </div>
                            <div className="text-center p-2 rounded-lg bg-white flex-1">
                              <span className={`font-bold ${getScoreColor(inspection.vehicle_score, 30)}`}>{inspection.vehicle_score}/30</span>
                              <p className="text-slate-500">רכב</p>
                            </div>
                            <div className="text-center p-2 rounded-lg bg-white flex-1">
                              <span className={`font-bold ${getScoreColor(inspection.procedures_score, 20)}`}>{inspection.procedures_score}/20</span>
                              <p className="text-slate-500">נהלים</p>
                            </div>
                            <div className="text-center p-2 rounded-lg bg-white flex-1">
                              <span className={`font-bold ${getScoreColor(inspection.safety_score, 10)}`}>{inspection.safety_score}/10</span>
                              <p className="text-slate-500">בטיחות</p>
                            </div>
                            <div className="text-center p-2 rounded-lg bg-white flex-1">
                              <span className={`font-bold ${getScoreColor(inspection.routes_familiarity_score, 15)}`}>{inspection.routes_familiarity_score}/15</span>
                              <p className="text-slate-500">נתבים</p>
                            </div>
                            <div className="text-center p-2 rounded-lg bg-white flex-1">
                              <span className={`font-bold ${getScoreColor(inspection.simulations_score, 15)}`}>{inspection.simulations_score}/15</span>
                              <p className="text-slate-500">מקתגים</p>
                            </div>
                            {/* Action buttons inline for mobile scroll */}
                            <div className="flex items-center gap-1 pr-2 border-r border-slate-200">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-blue-500 hover:text-blue-600 hover:bg-blue-50 px-2 h-auto py-1"
                                onClick={() => { setViewInspection(inspection); setViewTab("overview"); }}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              {isAdmin && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-amber-500 hover:text-amber-600 hover:bg-amber-50 px-2 h-auto py-1"
                                  onClick={() => openEditDialog(inspection)}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                              )}
                              {isAdmin && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-500 hover:text-red-600 hover:bg-red-50 px-2 h-auto py-1"
                                  onClick={() => { setInspectionToDelete(inspection.id); setDeleteDialogOpen(true); }}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </ScrollArea>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* New/Edit Inspection Dialog */}
        <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setDialogOpen(open); }}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-white" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-slate-900">{editingInspection ? "עריכת ביקורת" : "ביקורת חדשה"}</DialogTitle>
            </DialogHeader>

            {/* Steps Progress */}
            <div className="flex gap-1 mb-4">
              {steps.map((step, idx) => (
                <div
                  key={idx}
                  className={`flex-1 h-2 rounded-full ${idx <= currentStep ? 'bg-primary' : 'bg-slate-200'}`}
                />
              ))}
            </div>
            <p className="text-sm text-slate-800 font-semibold text-center mb-4">{steps[currentStep]}</p>

            <ScrollArea className="h-[55vh]">
              {/* Step 0: General Details */}
              {currentStep === 0 && (
                <div className="space-y-4">
                  <div className="p-3 bg-slate-200 rounded-xl text-center border border-slate-300 mb-4">
                    <span className="font-bold text-slate-800">פרטים כלליים</span>
                  </div>
                  <div>
                    <Label className="text-slate-800 font-semibold">תאריך ושעה</Label>
                    <div className="p-3 bg-slate-100 border border-slate-300 rounded-lg text-center">
                      <span className="text-lg font-bold text-slate-900">
                        {editingInspection 
                          ? format(parseISO(formData.inspection_date), "dd/MM/yyyy HH:mm:ss", { locale: he })
                          : format(liveDateTime, "dd/MM/yyyy HH:mm:ss", { locale: he })
                        }
                      </span>
                    </div>
                  </div>
                  <div>
                    <Label className="text-slate-800 font-semibold">פלוגה</Label>
                    <Select value={formData.platoon} onValueChange={v => setFormData({...formData, platoon: v})}>
                      <SelectTrigger className="bg-white border-slate-300 text-slate-900"><SelectValue placeholder="בחר" /></SelectTrigger>
                      <SelectContent>
                        {OUTPOSTS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-slate-800 font-semibold">שם המפקד</Label>
                    <Input value={formData.commander_name} onChange={e => setFormData({...formData, commander_name: e.target.value})} className="bg-white border-slate-300 text-slate-900" placeholder="הזן שם מפקד" />
                  </div>
                  <div>
                    <Label className="text-slate-800 font-semibold">שם הנהג</Label>
                    <Select value={formData.soldier_id} onValueChange={v => setFormData({...formData, soldier_id: v})}>
                      <SelectTrigger className="bg-white border-slate-300 text-slate-900"><SelectValue placeholder="בחר חייל" /></SelectTrigger>
                      <SelectContent>
                        {soldiers.map(s => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-slate-800 font-semibold">שם מבצע הביקורת</Label>
                    <Input value={formData.inspector_name} onChange={e => setFormData({...formData, inspector_name: e.target.value})} className="bg-white border-slate-300 text-slate-900" placeholder="הזן שם מבצע הביקורת" />
                  </div>
                </div>
              )}

              {/* Step 1: Combat Procedure (10 pts) */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  <div className="p-3 bg-blue-200 rounded-xl text-center border border-blue-300">
                    <span className="font-bold text-blue-900">נוהל קרב - 10 נקודות</span>
                  </div>
                  <div>
                    <Label className="text-slate-800 font-semibold">ע"י מי בוצע התחקיר והתדריך</Label>
                    <Input value={formData.combat_debrief_by} onChange={e => setFormData({...formData, combat_debrief_by: e.target.value})} className="bg-white border-slate-300 text-slate-900" placeholder="הזן שם" />
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-300 bg-white">
                    <Checkbox checked={formData.combat_driver_participated} onCheckedChange={c => setFormData({...formData, combat_driver_participated: !!c})} />
                    <span className="text-slate-800">האם הנהג השתתף בנוהל קרב</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-300 bg-white">
                    <Checkbox checked={formData.combat_driver_in_debrief} onCheckedChange={c => setFormData({...formData, combat_driver_in_debrief: !!c})} />
                    <span className="text-slate-800">נוכחות הנהג בתחקיר</span>
                  </div>
                </div>
              )}

              {/* Step 2: Vehicle (30 pts) */}
              {currentStep === 2 && (
                <div className="space-y-4">
                  <div className="p-3 bg-amber-200 rounded-xl text-center border border-amber-300">
                    <span className="font-bold text-amber-900">רכב - 30 נקודות</span>
                  </div>
                  <div className="p-3 bg-slate-200 rounded-xl border border-slate-300">
                    <p className="font-bold text-slate-800 mb-2">טל"ת</p>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { key: "vehicle_tlt_oil", label: "שמן" },
                        { key: "vehicle_tlt_water", label: "מים" },
                        { key: "vehicle_tlt_nuts", label: "אומים" },
                        { key: "vehicle_tlt_pressure", label: "לחץ אוויר" },
                      ].map(item => (
                        <div key={item.key} className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-300">
                          <Checkbox checked={(formData as any)[item.key]} onCheckedChange={c => setFormData({...formData, [item.key]: !!c})} />
                          <span className="text-sm text-slate-800">{item.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    {[
                      { key: "vehicle_vardim_knowledge", label: "ידיעת נקודות ורדים" },
                      { key: "vehicle_mission_sheet", label: "דף משימה" },
                      { key: "vehicle_work_card", label: "כרטסת עבודה" },
                      { key: "vehicle_clean", label: "רכב נקי" },
                      { key: "vehicle_equipment_secured", label: "ציוד מקובע" },
                    ].map(item => (
                      <div key={item.key} className="flex items-center gap-3 p-3 rounded-xl border border-slate-300 bg-white">
                        <Checkbox checked={(formData as any)[item.key]} onCheckedChange={c => setFormData({...formData, [item.key]: !!c})} />
                        <span className="text-slate-800">{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 3: Procedures (20 pts) */}
              {currentStep === 3 && (
                <div className="space-y-4">
                  <div className="p-3 bg-emerald-200 rounded-xl text-center border border-emerald-300">
                    <span className="font-bold text-emerald-900">נהלים - 20 נקודות</span>
                  </div>
                  {[
                    { key: "procedures_descent_drill", label: "ביצוע תרגולת ירידה לשול" },
                    { key: "procedures_rollover_drill", label: "ביצוע תרגולת התהפכות" },
                    { key: "procedures_fire_drill", label: "ביצוע תרגולת שריפה" },
                    { key: "procedures_combat_equipment", label: "ציוד לחימה (ווסט קרמי, קסדה ונשק אישי)" },
                  ].map(item => (
                    <div key={item.key} className="flex items-center gap-3 p-3 rounded-xl border border-slate-300 bg-white">
                      <Checkbox checked={(formData as any)[item.key]} onCheckedChange={c => setFormData({...formData, [item.key]: !!c})} />
                      <span className="text-slate-800">{item.label}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Step 4: Safety (10 pts) */}
              {currentStep === 4 && (
                <div className="space-y-4">
                  <div className="p-3 bg-red-200 rounded-xl text-center border border-red-300">
                    <span className="font-bold text-red-900">בטיחות - 10 נקודות</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-300 bg-white">
                    <Checkbox checked={formData.safety_ten_commandments} onCheckedChange={c => setFormData({...formData, safety_ten_commandments: !!c})} />
                    <span className="text-slate-800">הכרה של עשרת הדיברות לנהג</span>
                  </div>
                  <div className="p-3 bg-slate-200 rounded-xl border border-slate-300">
                    <p className="font-bold text-slate-800 mb-2">כלי נהג</p>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { key: "safety_driver_tools_extinguisher", label: "מטף" },
                        { key: "safety_driver_tools_jack", label: "ג'ק" },
                        { key: "safety_driver_tools_wheel_key", label: "מפתח גלגל" },
                        { key: "safety_driver_tools_vest", label: "אפודה זוהרת" },
                        { key: "safety_driver_tools_triangle", label: "משולש" },
                        { key: "safety_driver_tools_license", label: "רשיון רכב" },
                      ].map(item => (
                        <div key={item.key} className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-300">
                          <Checkbox checked={(formData as any)[item.key]} onCheckedChange={c => setFormData({...formData, [item.key]: !!c})} />
                          <span className="text-sm text-slate-800">{item.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 5: Routes (15 pts) */}
              {currentStep === 5 && (
                <div className="space-y-4">
                  <div className="p-3 bg-purple-200 rounded-xl text-center border border-purple-300">
                    <span className="font-bold text-purple-900">נתבים - 15 נקודות</span>
                  </div>
                  
                  {/* Vulnerability helper */}
                  {vulnerabilityFiles.length > 0 && (
                    <div className="p-3 bg-amber-100 border border-amber-300 rounded-xl">
                      <p className="font-bold text-amber-900 text-sm mb-2">פגיעויות {formData.platoon}:</p>
                      <div className="space-y-1">
                        {vulnerabilityFiles.map((file, idx) => (
                          <p key={idx} className="text-xs text-amber-800">• {file.title}</p>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div>
                    <Label className="text-slate-800 font-semibold">תשובת החייל</Label>
                    <Textarea 
                      placeholder="הזן את תשובת החייל על נתיבים והיכרותו עם הגזרה..."
                      value={formData.routes_notes} 
                      onChange={e => setFormData({...formData, routes_notes: e.target.value})} 
                      className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-500"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-800 font-semibold">ציון (0-15 נקודות)</Label>
                    <Select 
                      value={formData.routes_familiarity_score.toString()} 
                      onValueChange={v => setFormData({...formData, routes_familiarity_score: parseInt(v)})}
                    >
                      <SelectTrigger className="bg-white border-slate-300 text-slate-900">
                        <SelectValue placeholder="בחר ציון" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 16 }, (_, i) => (
                          <SelectItem key={i} value={i.toString()}>{i} נקודות</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-slate-700 mt-1">המפקד בוחר ציון בין 0 ל-15</p>
                  </div>
                </div>
              )}

              {/* Step 6: Simulations (15 pts) */}
              {currentStep === 6 && (
                <div className="space-y-4">
                  <div className="p-3 bg-indigo-200 rounded-xl text-center border border-indigo-300">
                    <span className="font-bold text-indigo-900">מקתגים - 15 נקודות</span>
                  </div>
                  <p className="text-sm text-slate-800 font-medium">שאל את הנהג וסמן אם ענה נכון:</p>
                  {randomQuestions.map((question, idx) => (
                    <div key={idx} className="p-4 rounded-xl border border-slate-300 bg-white space-y-3">
                      <p className="text-sm font-bold text-slate-900">{question}</p>
                      <div>
                        <Label className="text-sm text-slate-800 font-semibold">תשובת החייל:</Label>
                        <Textarea 
                          placeholder="הזן את תשובת החייל..."
                          value={formData.simulations_answers[`answer_${idx}`] || ""}
                          onChange={e => setFormData({
                            ...formData,
                            simulations_answers: {...formData.simulations_answers, [`answer_${idx}`]: e.target.value}
                          })}
                          className="mt-1 bg-white border-slate-300 text-slate-900 placeholder:text-slate-500 text-sm"
                          rows={2}
                        />
                      </div>
                      <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
                        <Checkbox 
                          checked={formData.simulations_answers[idx] || false} 
                          onCheckedChange={c => setFormData({
                            ...formData, 
                            simulations_answers: {...formData.simulations_answers, [idx]: !!c}
                          })} 
                        />
                        <span className="text-sm text-emerald-700 font-bold">הנהג ענה נכון</span>
                      </div>
                    </div>
                  ))}
                  <div>
                    <Label className="text-slate-800 font-semibold">הערות כלליות</Label>
                    <Textarea value={formData.general_notes} onChange={e => setFormData({...formData, general_notes: e.target.value})} className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-500" />
                  </div>
                </div>
              )}
            </ScrollArea>

            {/* Navigation */}
            <div className="flex gap-2 mt-4">
              {currentStep > 0 && (
                <Button variant="outline" onClick={() => setCurrentStep(currentStep - 1)}>הקודם</Button>
              )}
              {currentStep < steps.length - 1 ? (
                <Button onClick={() => setCurrentStep(currentStep + 1)} className="flex-1">הבא</Button>
              ) : (
                <Button onClick={handleSubmit} className="flex-1 bg-emerald-500 hover:bg-emerald-600">
                  {editingInspection ? "עדכן ביקורת" : "שמור ביקורת"}
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Outstanding Soldiers Dialog */}
        <Dialog open={outstandingDialogOpen} onOpenChange={setOutstandingDialogOpen}>
          <DialogContent className="max-w-lg max-h-[90vh]" dir="rtl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-emerald-800">
                <TrendingUp className="w-5 h-5" />
                חיילים מצטיינים ({aboveAvgSoldiers.length})
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm text-slate-500 mb-4">חיילים עם ציון ממוצע מעל 80</p>
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-3">
                {aboveAvgSoldiers.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <ClipboardCheck className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>אין חיילים מצטיינים</p>
                  </div>
                ) : (
                  aboveAvgSoldiers.map(soldier => {
                    const soldierInspections = inspections.filter(i => i.soldier_id === soldier.id);
                    const avgSoldierScore = soldierInspections.length > 0 
                      ? Math.round(soldierInspections.reduce((sum, i) => sum + i.total_score, 0) / soldierInspections.length)
                      : 0;
                    return (
                      <div key={soldier.id} className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-bold text-slate-800">{soldier.full_name}</h4>
                            <p className="text-xs text-slate-500">{soldier.personal_number}</p>
                            <p className="text-xs text-slate-500">{soldierInspections.length} ביקורות</p>
                          </div>
                          <Badge className="bg-emerald-500 text-white text-lg">{avgSoldierScore}</Badge>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>

        {/* Improvement Soldiers Dialog */}
        <Dialog open={improvementDialogOpen} onOpenChange={setImprovementDialogOpen}>
          <DialogContent className="max-w-lg max-h-[90vh]" dir="rtl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-800">
                <TrendingDown className="w-5 h-5" />
                חיילים לשיפור ({belowAvgSoldiers.length})
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm text-slate-500 mb-4">חיילים עם ציון ממוצע מתחת ל-60</p>
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-3">
                {belowAvgSoldiers.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <ClipboardCheck className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>אין חיילים לשיפור</p>
                  </div>
                ) : (
                  belowAvgSoldiers.map(soldier => {
                    const soldierInspections = inspections.filter(i => i.soldier_id === soldier.id);
                    const avgSoldierScore = soldierInspections.length > 0 
                      ? Math.round(soldierInspections.reduce((sum, i) => sum + i.total_score, 0) / soldierInspections.length)
                      : 0;
                    return (
                      <div key={soldier.id} className="p-4 rounded-2xl bg-red-50 border border-red-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-bold text-slate-800">{soldier.full_name}</h4>
                            <p className="text-xs text-slate-500">{soldier.personal_number}</p>
                            <p className="text-xs text-slate-500">{soldierInspections.length} ביקורות</p>
                          </div>
                          <Badge className="bg-red-500 text-white text-lg">{avgSoldierScore}</Badge>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>

        {/* View Inspection Dialog - With Detailed Tabs */}
        <Dialog open={!!viewInspection} onOpenChange={(open) => !open && setViewInspection(null)}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
            {viewInspection && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <ClipboardCheck className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-base">{viewInspection.soldiers?.full_name}</p>
                      <p className="text-xs font-normal text-slate-500">
                        {format(getInspectionPerformedAt(viewInspection), "dd/MM/yyyy HH:mm", { locale: he })} | {viewInspection.platoon}
                      </p>
                    </div>
                  </DialogTitle>
                </DialogHeader>
                
                <Tabs value={viewTab} onValueChange={setViewTab} className="mt-4">
                  <TabsList className="grid grid-cols-4 h-auto">
                    <TabsTrigger value="overview" className="text-xs py-2">סקירה</TabsTrigger>
                    <TabsTrigger value="combat" className="text-xs py-2">קרב</TabsTrigger>
                    <TabsTrigger value="vehicle" className="text-xs py-2">רכב</TabsTrigger>
                    <TabsTrigger value="procedures" className="text-xs py-2">נהלים</TabsTrigger>
                  </TabsList>
                  <TabsList className="grid grid-cols-3 h-auto mt-1">
                    <TabsTrigger value="safety" className="text-xs py-2">בטיחות</TabsTrigger>
                    <TabsTrigger value="routes" className="text-xs py-2">נתבים</TabsTrigger>
                    <TabsTrigger value="simulations" className="text-xs py-2">סימולציות</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="overview" className="space-y-4 mt-4">
                    {/* Total Score */}
                    <div className="text-center p-4 rounded-xl bg-gradient-to-br from-slate-100 to-slate-50">
                      <p className={`text-4xl font-black ${viewInspection.total_score >= 80 ? 'text-emerald-600' : viewInspection.total_score >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                        {viewInspection.total_score}/100
                      </p>
                      <p className="text-sm text-slate-500 mt-1">ציון כולל</p>
                    </div>
                    
                    {/* Score Breakdown */}
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="text-center p-3 rounded-lg bg-blue-50">
                        <span className="font-bold text-blue-700">{viewInspection.combat_score}/10</span>
                        <p className="text-slate-600">נוהל קרב</p>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-amber-50">
                        <span className="font-bold text-amber-700">{viewInspection.vehicle_score}/30</span>
                        <p className="text-slate-600">רכב</p>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-emerald-50">
                        <span className="font-bold text-emerald-700">{viewInspection.procedures_score}/20</span>
                        <p className="text-slate-600">נהלים</p>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-red-50">
                        <span className="font-bold text-red-700">{viewInspection.safety_score}/10</span>
                        <p className="text-slate-600">בטיחות</p>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-purple-50">
                        <span className="font-bold text-purple-700">{viewInspection.routes_familiarity_score}/15</span>
                        <p className="text-slate-600">נתבים</p>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-indigo-50">
                        <span className="font-bold text-indigo-700">{viewInspection.simulations_score}/15</span>
                        <p className="text-slate-600">סימולציות</p>
                      </div>
                    </div>
                    
                    {/* Details */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center p-2 bg-slate-50 rounded-lg">
                        <span className="text-sm text-slate-600">מפקד:</span>
                        <span className="font-medium text-slate-800">{viewInspection.commander_name}</span>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-slate-50 rounded-lg">
                        <span className="text-sm text-slate-600">מבצע הביקורת:</span>
                        <span className="font-medium text-slate-800">{viewInspection.inspector_name}</span>
                      </div>
                    </div>
                    
                    {/* Notes */}
                    {viewInspection.general_notes && (
                      <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                        <p className="text-xs font-medium text-amber-800 mb-1">הערות:</p>
                        <p className="text-sm text-amber-900">{viewInspection.general_notes}</p>
                      </div>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="combat" className="space-y-4 mt-4">
                    <div className="p-3 bg-blue-50 rounded-xl text-center">
                      <span className="font-bold text-blue-800">נוהל קרב - {viewInspection.combat_score}/10 נקודות</span>
                    </div>
                    {viewInspection.combat_debrief_by && (
                      <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <p className="text-xs text-slate-500 mb-1">תחקיר בוצע ע"י:</p>
                        <p className="font-medium text-slate-700">{viewInspection.combat_debrief_by}</p>
                      </div>
                    )}
                    <div className="space-y-2">
                      <CheckItem label="השתתפות הנהג בנוהל קרב" checked={viewInspection.combat_driver_participated} />
                      <CheckItem label="נוכחות הנהג בתחקיר" checked={viewInspection.combat_driver_in_debrief} />
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="vehicle" className="space-y-4 mt-4">
                    <div className="p-3 bg-amber-50 rounded-xl text-center">
                      <span className="font-bold text-amber-800">רכב - {viewInspection.vehicle_score}/30 נקודות</span>
                    </div>
                    <div className="p-3 bg-slate-100 rounded-xl">
                      <p className="font-bold text-slate-700 mb-2 text-sm">טל"ת</p>
                      <div className="grid grid-cols-2 gap-2">
                        <CheckItem label="שמן" checked={viewInspection.vehicle_tlt_oil} />
                        <CheckItem label="מים" checked={viewInspection.vehicle_tlt_water} />
                        <CheckItem label="אומים" checked={viewInspection.vehicle_tlt_nuts} />
                        <CheckItem label="לחץ אוויר" checked={viewInspection.vehicle_tlt_pressure} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <CheckItem label="ידיעת נקודות ורדים" checked={viewInspection.vehicle_vardim_knowledge} />
                      <CheckItem label="דף משימה" checked={viewInspection.vehicle_mission_sheet} />
                      <CheckItem label="כרטסת עבודה" checked={viewInspection.vehicle_work_card} />
                      <CheckItem label="רכב נקי" checked={viewInspection.vehicle_clean} />
                      <CheckItem label="ציוד מקובע" checked={viewInspection.vehicle_equipment_secured} />
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="procedures" className="space-y-4 mt-4">
                    <div className="p-3 bg-emerald-50 rounded-xl text-center">
                      <span className="font-bold text-emerald-800">נהלים - {viewInspection.procedures_score}/20 נקודות</span>
                    </div>
                    <div className="space-y-2">
                      <CheckItem label="ביצוע תרגולת ירידה לשול" checked={viewInspection.procedures_descent_drill} />
                      <CheckItem label="ביצוע תרגולת התהפכות" checked={viewInspection.procedures_rollover_drill} />
                      <CheckItem label="ביצוע תרגולת שריפה" checked={viewInspection.procedures_fire_drill} />
                      <CheckItem label="ציוד לחימה (ווסט קרמי, קסדה ונשק אישי)" checked={viewInspection.procedures_combat_equipment} />
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="safety" className="space-y-4 mt-4">
                    <div className="p-3 bg-red-50 rounded-xl text-center">
                      <span className="font-bold text-red-800">בטיחות - {viewInspection.safety_score}/10 נקודות</span>
                    </div>
                    <CheckItem label="הכרה של עשרת הדיברות לנהג" checked={viewInspection.safety_ten_commandments} />
                    <div className="p-3 bg-slate-100 rounded-xl">
                      <p className="font-bold text-slate-700 mb-2 text-sm">כלי נהג</p>
                      <div className="grid grid-cols-2 gap-2">
                        <CheckItem label="מטף" checked={viewInspection.safety_driver_tools_extinguisher} />
                        <CheckItem label="ג'ק" checked={viewInspection.safety_driver_tools_jack} />
                        <CheckItem label="מפתח גלגל" checked={viewInspection.safety_driver_tools_wheel_key} />
                        <CheckItem label="אפודה זוהרת" checked={viewInspection.safety_driver_tools_vest} />
                        <CheckItem label="משולש" checked={viewInspection.safety_driver_tools_triangle} />
                        <CheckItem label="רשיון רכב" checked={viewInspection.safety_driver_tools_license} />
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="routes" className="space-y-4 mt-4">
                    <div className="p-3 bg-purple-50 rounded-xl text-center">
                      <span className="font-bold text-purple-800">נתבים - {viewInspection.routes_familiarity_score}/15 נקודות</span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <p className="text-sm text-slate-600 mb-2"><strong>ציון:</strong> {viewInspection.routes_familiarity_score}/15</p>
                    </div>
                    {viewInspection.routes_notes ? (
                      <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <p className="text-xs text-slate-600 mb-1">תשובת החייל:</p>
                        <p className="text-sm text-slate-800">{viewInspection.routes_notes}</p>
                      </div>
                    ) : (
                      <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <p className="text-sm text-slate-500">אין תשובה</p>
                      </div>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="simulations" className="space-y-4 mt-4">
                    <div className="p-3 bg-indigo-50 rounded-xl text-center">
                      <span className="font-bold text-indigo-800">מקתגים - {viewInspection.simulations_score}/15 נקודות</span>
                    </div>
                    {viewInspection.simulations_questions && Object.keys(viewInspection.simulations_questions).length > 0 ? (
                      <div className="space-y-3">
                        <p className="text-sm text-slate-600 font-medium">שאלות ותשובות החייל:</p>
                        {[0, 1].map((idx) => {
                          const simData = viewInspection.simulations_questions as Record<string, any>;
                          // Get the stored question text, or fallback to SIMULATION_QUESTIONS if it's an old record
                          const questionText = simData[`question_${idx}`] || SIMULATION_QUESTIONS[idx] || `שאלה ${idx + 1}`;
                          const answered = simData[idx] === true;
                          const soldierAnswer = simData[`answer_${idx}`];
                          
                          // Skip if no question was stored and no answer exists
                          if (!simData[`question_${idx}`] && simData[idx] === undefined) return null;
                          
                          return (
                            <div key={idx} className="p-3 rounded-lg bg-white border border-slate-200 space-y-2">
                              <div className="flex items-start gap-2">
                                {answered ? (
                                  <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                                ) : (
                                  <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                                )}
                                <div className="flex-1">
                                  <span className="text-sm font-medium text-slate-700">{questionText}</span>
                                  <p className={`text-xs ${answered ? 'text-emerald-600' : 'text-red-500'}`}>
                                    {answered ? 'תשובה נכונה' : 'תשובה שגויה'}
                                  </p>
                                </div>
                              </div>
                              {soldierAnswer && (
                                <div className="mr-7 p-2 bg-slate-50 rounded-lg border border-slate-100">
                                  <p className="text-xs text-slate-500 mb-1">תשובת החייל:</p>
                                  <p className="text-sm text-slate-700">{soldierAnswer}</p>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <p className="text-sm text-slate-500">אין נתוני מקתגים</p>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
                
                <DialogFooter className="mt-4">
                  <Button variant="outline" onClick={() => setViewInspection(null)}>סגור</Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent className="max-w-sm" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-red-600">אישור מחיקה</DialogTitle>
            </DialogHeader>
            <p className="text-slate-600">האם אתה בטוח שברצונך למחוק את הביקורת?</p>
            <p className="text-sm text-slate-500">פעולה זו אינה ניתנת לביטול.</p>
            <DialogFooter className="flex gap-2 mt-4">
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>ביטול</Button>
              <Button 
                variant="destructive" 
                onClick={() => inspectionToDelete && deleteInspection(inspectionToDelete)}
              >
                מחק
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}