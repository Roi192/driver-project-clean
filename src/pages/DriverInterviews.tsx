import { useState, useEffect, useRef } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { format, parseISO, subMonths } from "date-fns";
import { he } from "date-fns/locale";
import { 
  ClipboardList, 
  Plus, 
  Loader2,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  User,
  Car,
  Shield,
  FileText,
  Check,
  Gauge,
  AlertTriangle,
  MapPin,
  Calendar,
  Truck
} from "lucide-react";
import { OUTPOSTS, REGIONS } from "@/lib/constants";
import unitLogo from "@/assets/unit-logo.png";
import { StorageImage } from "@/components/shared/StorageImage";

interface Soldier {
  id: string;
  personal_number: string;
  full_name: string;
  outpost: string | null;
  civilian_license_expiry: string | null;
  military_license_expiry: string | null;
  defensive_driving_passed: boolean | null;
  license_type: string | null;
  permits: string[] | null;
  qualified_date: string | null;
}

interface SafetyIncident {
  id: string;
  soldier_id: string | null;
  driver_name: string | null;
  event_date: string | null;
  title: string;
  description: string | null;
  severity: string | null;
  event_type: string | null;
  vehicle_number: string | null;
  driver_type: string | null;
  outpost: string | null;
  region: string | null;
  image_url: string | null;
}

interface Interview {
  id: string;
  interview_date: string;
  region: string;
  battalion: string;
  outpost: string;
  driver_name: string;
  interviewer_name: string;
  created_at: string;
  soldier_id?: string | null;
  civilian_license_expiry?: string | null;
  military_license_expiry?: string | null;
  defensive_driving_passed?: boolean | null;
  license_type?: string | null;
  permits?: string | null;
  military_accidents?: string | null;
  family_status?: string | null;
  financial_status?: string | null;
  additional_notes?: string | null;
  interviewer_summary?: string | null;
}

interface SafetyScore {
  id: string;
  soldier_id: string;
  score_month: string;
  safety_score: number;
  speed_violations: number | null;
  harsh_braking: number | null;
  harsh_accelerations: number | null;
  harsh_turns: number | null;
  illegal_overtakes: number | null;
  kilometers: number | null;
  notes: string | null;
}

// Severity label mapping
const severityLabels: Record<string, string> = {
  minor: 'קל',
  moderate: 'בינוני',
  severe: 'חמור'
};

const severityColors: Record<string, string> = {
  minor: 'bg-yellow-500/20 text-yellow-400',
  moderate: 'bg-orange-500/20 text-orange-400',
  severe: 'bg-red-500/20 text-red-400'
};

// Expandable incident card component
function IncidentCard({ incident }: { incident: SafetyIncident }) {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <div className="p-3 rounded-xl bg-slate-700/50 border border-slate-600 cursor-pointer hover:bg-slate-600/50 transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              <div>
                <p className="font-medium text-white text-sm">{incident.title || 'ללא כותרת'}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-slate-400">
                    {incident.event_date ? format(parseISO(incident.event_date), 'dd/MM/yyyy') : 'לא צוין'}
                  </span>
                  {incident.severity && (
                    <span className={`px-2 py-0.5 rounded-full text-xs ${severityColors[incident.severity] || 'bg-slate-500/20 text-slate-300'}`}>
                      {severityLabels[incident.severity] || incident.severity}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-2 p-4 rounded-xl bg-slate-800/70 border border-slate-600 space-y-3">
          {/* Description */}
          {incident.description && (
            <div>
              <Label className="text-xs text-slate-400 mb-1 block">תיאור</Label>
              <p className="text-sm text-slate-200">{incident.description}</p>
            </div>
          )}
          
          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            {incident.vehicle_number && (
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-slate-400" />
                <span className="text-slate-300">רכב: {incident.vehicle_number}</span>
              </div>
            )}
            {incident.outpost && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-slate-400" />
                <span className="text-slate-300">מוצב: {incident.outpost}</span>
              </div>
            )}
            {incident.region && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-slate-400" />
                <span className="text-slate-300">גזרה: {incident.region}</span>
              </div>
            )}
            {incident.driver_type && (
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-slate-400" />
                <span className="text-slate-300">
                  סוג נהג: {incident.driver_type === 'security' ? 'נהג בט"ש' : 'נהג גדוד'}
                </span>
              </div>
            )}
          </div>

          {/* Image */}
          {incident.image_url && (
            <div className="mt-3">
              <Label className="text-xs text-slate-400 mb-2 block">תמונה</Label>
              <StorageImage
                src={incident.image_url}
                alt={incident.title}
                className="w-full max-h-48 object-cover rounded-lg"
              />
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

const INTERVIEW_GUIDELINES = [
  "ערנות - יש לשמור על שעות שינה טרם עלייה להגה - נהג עייף - לא נוהג! עייפות = שכרות",
  "שמירת מרחק - יש לשמור מרחק לרכב לפנים ולזה שלפניו, בשעה שהרכב מלפנים בולם יש להוריד מיידית את הרגל מהגז ולהאט",
  "מראות - יש לתת מבט במראות בכל עת",
  "שיטת הבלימה - בעת עצירה יש לבלום את הרכב באופן מבוקר",
  "התאמת מהירות לתנאי הדרך - יש לוודא כי המהירות מתאפשרת על פי תנאי הדרך ומזג אוויר, להאט לפני עיקול לפני כיכר לפני צומת",
  "תמרור זכות קדימה = תמרור עצור - אם נתייחס לזכות קדימה כתמרור עצור נמנע תאונות מיותרות",
  "קו לבן = קיר - אין עקיפה על קו לבן",
  "הקפדה על איתותים - בכל פנייה או פרסה יש להקפיד על איתותים האיתות הוא הדרך היחידה לתקשר עם הרכב האחר על מה אני עתיד לעשות",
  "הדלקת אורות בכל ימות השנה גם ביום וגם בלילה",
  "נסיעה לאחור עם מכווין קרקעי ע\"י מפקד המשימה בלבד",
  "נהיגה במזג אוויר שונים - לנהיגה בקיץ יש משמעויות כמו עייפות, חום, שחיקת צמיגים, גלי חום על הכביש, ולחורף משמעויות משלו כמו קור גשם אדים על החלון, תקינות מגבים, החלקה ועוד. נהיגה זהירה תשמור על חיינו - נא לנהוג בחכמה ובזהירות",
  "טרם יציאה לבית יש לעבור תדריך יציאה ע\"י קצין מוצב",
  "אין הגעה עם רכב פרטי למוצב",
  "ביצוע טל\"ת לפני תחילת המשימה ובדיקת כלי הנהג, והזנת טופס באפליקציה",
];

export default function DriverInterviews() {
  const { userType, loading: authLoading, user, canAccessDriverInterviews } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [soldiers, setSoldiers] = useState<Soldier[]>([]);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [safetyIncidents, setSafetyIncidents] = useState<SafetyIncident[]>([]);
  const [selectedIncidents, setSelectedIncidents] = useState<SafetyIncident[]>([]);
  const [safetyScores, setSafetyScores] = useState<SafetyScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const signatureRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [editingInterviewId, setEditingInterviewId] = useState<string | null>(null);
  const [existingSignature, setExistingSignature] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    interview_date: format(new Date(), "yyyy-MM-dd"),
    region: "",
    battalion: "",
    outpost: "",
    soldier_id: "",
    driver_name: "",
    civilian_license_expiry: "",
    license_type: "",
    military_license_expiry: "",
    permits: "",
    defensive_driving_passed: false,
    military_accidents: "",
    family_status: "",
    financial_status: "",
    additional_notes: "",
    interviewer_summary: "",
    interviewer_name: "",
    qualified_date: "",
  });

  useEffect(() => {
    // Allow users with driver interview access and battalion users
    if (!authLoading && userType !== 'battalion' && !canAccessDriverInterviews) {
      navigate("/");
    }
  }, [userType, canAccessDriverInterviews, authLoading, navigate]);

  useEffect(() => {
    if (userType === 'battalion' || canAccessDriverInterviews) {
      fetchData();
    }
  }, [userType, canAccessDriverInterviews]);

  // Handle edit mode from URL params
  useEffect(() => {
    const editId = searchParams.get('edit');
    if (editId && !loading && (userType === 'battalion' || canAccessDriverInterviews)) {
      loadInterviewForEdit(editId);
    }
  }, [searchParams, loading, userType, canAccessDriverInterviews]);

  const loadInterviewForEdit = async (interviewId: string) => {
    try {
      const { data, error } = await supabase
        .from('driver_interviews')
        .select('*')
        .eq('id', interviewId)
        .single();

      if (error) throw error;
      if (!data) {
        toast.error("הראיון לא נמצא");
        setSearchParams({});
        return;
      }

      // Find the soldier if exists
      const soldier = soldiers.find(s => s.id === data.soldier_id);

      setFormData({
        interview_date: data.interview_date || format(new Date(), "yyyy-MM-dd"),
        region: data.region || "",
        battalion: data.battalion || "",
        outpost: data.outpost || "",
        soldier_id: data.soldier_id || "",
        driver_name: data.driver_name || "",
        civilian_license_expiry: data.civilian_license_expiry || "",
        license_type: data.license_type || "",
        military_license_expiry: data.military_license_expiry || "",
        permits: data.permits || "",
        defensive_driving_passed: data.defensive_driving_passed || false,
        military_accidents: data.military_accidents || "",
        family_status: data.family_status || "",
        financial_status: data.financial_status || "",
        additional_notes: data.additional_notes || "",
        interviewer_summary: data.interviewer_summary || "",
        interviewer_name: data.interviewer_name || "",
        qualified_date: soldier?.qualified_date || "",
      });

      setEditingInterviewId(interviewId);
      setExistingSignature(data.signature || null);
      setDialogOpen(true);
      setCurrentStep(1);

      // Load safety scores if soldier exists
      if (data.soldier_id) {
        const threeMonthsAgo = format(subMonths(new Date(), 3), "yyyy-MM-01");
        const { data: scoresData } = await supabase
          .from("monthly_safety_scores")
          .select("*")
          .eq("soldier_id", data.soldier_id)
          .gte("score_month", threeMonthsAgo)
          .order("score_month", { ascending: false });
        
        setSafetyScores(scoresData || []);
      }
    } catch (error) {
      console.error('Error loading interview for edit:', error);
      toast.error("שגיאה בטעינת הראיון לעריכה");
      setSearchParams({});
    }
  };

  const fetchData = async () => {
    setLoading(true);
    
    const [soldiersRes, interviewsRes, incidentsRes] = await Promise.all([
      supabase
        .from("soldiers")
        .select("id, personal_number, full_name, outpost, civilian_license_expiry, military_license_expiry, defensive_driving_passed, license_type, permits, qualified_date")
        .eq("is_active", true)
        .order("full_name"),
      supabase
        .from("driver_interviews")
        .select("id, interview_date, region, battalion, outpost, driver_name, interviewer_name, created_at")
        .eq("user_id", user?.id)
        .order("interview_date", { ascending: false })
        .limit(20),
      supabase
        .from("safety_content")
        .select("id, soldier_id, driver_name, event_date, title, description, severity, event_type, vehicle_number, driver_type, outpost, region, image_url")
        .eq("category", "sector_events")
        .in("event_type", ["accident", "stuck"])
        .order("event_date", { ascending: false })
    ]);

    if (soldiersRes.data) setSoldiers(soldiersRes.data);
    if (interviewsRes.data) setInterviews(interviewsRes.data as Interview[]);
    if (incidentsRes.data) setSafetyIncidents(incidentsRes.data as SafetyIncident[]);
    
    setLoading(false);
  };

  const handleSoldierSelect = async (soldierId: string) => {
    const soldier = soldiers.find(s => s.id === soldierId);
    if (soldier) {
      // Get incidents for this soldier from safety_content table
      const soldierIncidents = safetyIncidents.filter(a => 
        a.soldier_id === soldierId || 
        (a.driver_name && a.driver_name.toLowerCase() === soldier.full_name.toLowerCase())
      );
      
      // Store incidents for display as cards
      setSelectedIncidents(soldierIncidents);
      
      // Keep text for backward compatibility with saved interviews
      const incidentsText = soldierIncidents.length > 0
        ? soldierIncidents.map(a => 
            `${a.event_date ? format(new Date(a.event_date), "dd/MM/yyyy") : 'לא צוין'} - ${a.title || 'ללא תיאור'} (${a.severity || 'לא צוין'})`
          ).join('\n')
        : "";

      setFormData({
        ...formData,
        soldier_id: soldierId,
        driver_name: soldier.full_name,
        civilian_license_expiry: soldier.civilian_license_expiry || "",
        military_license_expiry: soldier.military_license_expiry || "",
        defensive_driving_passed: soldier.defensive_driving_passed || false,
        military_accidents: incidentsText,
        license_type: soldier.license_type || "",
        permits: soldier.permits?.join(", ") || "",
        qualified_date: soldier.qualified_date || "",
      });

      // Fetch safety scores for the last 3 months
      const threeMonthsAgo = format(subMonths(new Date(), 3), "yyyy-MM-01");
      const { data: scoresData } = await supabase
        .from("monthly_safety_scores")
        .select("*")
        .eq("soldier_id", soldierId)
        .gte("score_month", threeMonthsAgo)
        .order("score_month", { ascending: false });
      
      setSafetyScores(scoresData || []);
    }
  };

  // Always show all soldiers from the soldiers control table
  // Battalion admin and all management roles should see the full roster
  const filteredSoldiers = soldiers;

  const getSignatureData = (): string => {
    if (signatureRef.current) {
      return signatureRef.current.toDataURL();
    }
    return "";
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = signatureRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const rect = canvas.getBoundingClientRect();
        const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
        const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
        ctx.beginPath();
        ctx.moveTo(x, y);
      }
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = signatureRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const rect = canvas.getBoundingClientRect();
        const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
        const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
        ctx.lineTo(x, y);
        ctx.stroke();
      }
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = signatureRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  };

  const handleSubmit = async () => {
    if (!formData.interviewer_name) {
      toast.error("יש להזין את שם הסמ\"פ המראיין");
      return;
    }

    const signature = getSignatureData();
    // Only require signature for new interviews, not edits
    if (!editingInterviewId && (!signature || signature === "data:,")) {
      toast.error("יש לחתום על הטופס");
      return;
    }

    setSaving(true);

    const interviewData = {
      interview_date: formData.interview_date,
      region: formData.region,
      battalion: formData.battalion,
      outpost: formData.outpost,
      soldier_id: formData.soldier_id || null,
      driver_name: formData.driver_name,
      civilian_license_expiry: formData.civilian_license_expiry || null,
      license_type: formData.license_type || null,
      military_license_expiry: formData.military_license_expiry || null,
      permits: formData.permits || null,
      defensive_driving_passed: formData.defensive_driving_passed,
      military_accidents: formData.military_accidents || null,
      family_status: formData.family_status || null,
      financial_status: formData.financial_status || null,
      additional_notes: formData.additional_notes || null,
      interviewer_summary: formData.interviewer_summary || null,
      interviewer_name: formData.interviewer_name,
    };

    let error;

    if (editingInterviewId) {
      // Update existing interview
      const updateData = signature && signature !== "data:," 
        ? { ...interviewData, signature } 
        : interviewData;
      
      const result = await supabase
        .from("driver_interviews")
        .update(updateData)
        .eq('id', editingInterviewId);
      
      error = result.error;
    } else {
      // Insert new interview
      const result = await supabase
        .from("driver_interviews")
        .insert({
          user_id: user?.id,
          ...interviewData,
          signature: signature,
        });
      
      error = result.error;
    }

    setSaving(false);

    if (error) {
      toast.error(editingInterviewId ? "שגיאה בעדכון הראיון" : "שגיאה בשמירת הראיון");
      console.error(error);
    } else {
      toast.success(editingInterviewId ? "הראיון עודכן בהצלחה" : "הראיון נשמר בהצלחה");
      setDialogOpen(false);
      resetForm();
      setSearchParams({});
      fetchData();
    }
  };

  const resetForm = () => {
    setFormData({
      interview_date: format(new Date(), "yyyy-MM-dd"),
      region: "",
      battalion: "",
      outpost: "",
      soldier_id: "",
      driver_name: "",
      civilian_license_expiry: "",
      license_type: "",
      military_license_expiry: "",
      permits: "",
      defensive_driving_passed: false,
      military_accidents: "",
      family_status: "",
      financial_status: "",
      additional_notes: "",
      interviewer_summary: "",
      interviewer_name: "",
      qualified_date: "",
    });
    setCurrentStep(1);
    clearSignature();
    setSafetyScores([]);
    setSelectedIncidents([]);
    setEditingInterviewId(null);
    setExistingSignature(null);
  };

  const canProceedToStep2 = formData.region && formData.battalion && formData.outpost && formData.driver_name;
  const canProceedToStep3 = true; // Guidelines step, just read
  const canProceedToStep4 = true; // Interview step, optional fields

  if (authLoading || loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4 text-primary">
              <User className="w-5 h-5" />
              <h3 className="font-bold">פרטי הנהג והמוצב</h3>
            </div>

            <div>
              <Label>תאריך ביצוע הראיון</Label>
              <Input
                type="date"
                value={formData.interview_date}
                onChange={(e) => setFormData({ ...formData, interview_date: e.target.value })}
                className="rounded-xl"
              />
            </div>

            <div>
              <Label>גזרה *</Label>
              <Select value={formData.region} onValueChange={(value) => setFormData({ ...formData, region: value })}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="בחר גזרה" />
                </SelectTrigger>
                <SelectContent>
                  {REGIONS.map(region => (
                    <SelectItem key={region} value={region}>{region}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>גדוד *</Label>
              <Input
                value={formData.battalion}
                onChange={(e) => setFormData({ ...formData, battalion: e.target.value })}
                placeholder="הזן שם גדוד"
                className="rounded-xl"
              />
            </div>

            <div>
              <Label>מוצב *</Label>
              <Select value={formData.outpost} onValueChange={(value) => setFormData({ ...formData, outpost: value, soldier_id: "", driver_name: "" })}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="בחר מוצב" />
                </SelectTrigger>
                <SelectContent>
                  {OUTPOSTS.map(outpost => (
                    <SelectItem key={outpost} value={outpost}>{outpost}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>שם הנהג *</Label>
              <Select value={formData.soldier_id} onValueChange={handleSoldierSelect}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="בחר נהג" />
                </SelectTrigger>
                <SelectContent>
                  {filteredSoldiers.map(soldier => (
                    <SelectItem key={soldier.id} value={soldier.id}>
                      {soldier.full_name} ({soldier.personal_number})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Driver characteristics */}
            <div className="pt-4 border-t border-slate-600">
              <div className="flex items-center gap-2 mb-4">
                <Car className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-amber-400">מאפייני הנהג</h3>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-slate-300">נהג מוכשר מתאריך</Label>
                  <Input
                    type="date"
                    value={formData.qualified_date}
                    readOnly
                    className="rounded-xl text-sm bg-slate-700 text-white border-slate-600"
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-300">סוג רשיון</Label>
                  <Input
                    value={formData.license_type}
                    readOnly
                    placeholder="מהטבלת שליטה"
                    className="rounded-xl text-sm bg-slate-700 text-white border-slate-600"
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-300">תוקף רשיון אזרחי</Label>
                  <Input
                    type="date"
                    value={formData.civilian_license_expiry}
                    onChange={(e) => setFormData({ ...formData, civilian_license_expiry: e.target.value })}
                    className="rounded-xl text-sm bg-slate-700 text-white border-slate-600"
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-300">תוקף רשיון צבאי</Label>
                  <Input
                    type="date"
                    value={formData.military_license_expiry}
                    onChange={(e) => setFormData({ ...formData, military_license_expiry: e.target.value })}
                    className="rounded-xl text-sm bg-slate-700 text-white border-slate-600"
                  />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs text-slate-300">היתרים</Label>
                  <Input
                    value={formData.permits}
                    readOnly
                    placeholder="מהטבלת שליטה"
                    className="rounded-xl text-sm bg-slate-700 text-white border-slate-600"
                  />
                </div>
              </div>

              <div className="mt-3 flex items-center gap-3">
                <Label className="text-sm text-slate-300">ביצוע נהיגה מונעת:</Label>
                <span className={`px-3 py-1 rounded-full text-sm font-bold ${formData.defensive_driving_passed ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                  {formData.defensive_driving_passed ? 'עבר' : 'לא עבר'}
                </span>
              </div>

              {/* Accidents Section - Expandable Cards */}
              <div className="mt-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  <Label className="text-sm font-bold text-red-400">תאונות במסגרת הצבא</Label>
                </div>
                {selectedIncidents.filter(i => i.event_type === 'accident').length > 0 ? (
                  <div className="space-y-2">
                    {selectedIncidents.filter(i => i.event_type === 'accident').map(incident => (
                      <IncidentCard key={incident.id} incident={incident} />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 italic">אין תאונות רשומות</p>
                )}
              </div>

              {/* Stuck Incidents Section - Expandable Cards */}
              <div className="mt-4">
                <div className="flex items-center gap-2 mb-3">
                  <Car className="w-4 h-4 text-amber-400" />
                  <Label className="text-sm font-bold text-amber-400">אירועי התחפרות</Label>
                </div>
                {selectedIncidents.filter(i => i.event_type === 'stuck').length > 0 ? (
                  <div className="space-y-2">
                    {selectedIncidents.filter(i => i.event_type === 'stuck').map(incident => (
                      <IncidentCard key={incident.id} incident={incident} />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 italic">אין אירועי התחפרות רשומים</p>
                )}
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4 text-primary">
              <Shield className="w-5 h-5" />
              <h3 className="font-bold">דגשים לביצוע ראיון וחידוד הנחיות</h3>
            </div>

            <ScrollArea className="h-[400px] pr-3">
              <div className="space-y-3">
                {INTERVIEW_GUIDELINES.map((guideline, index) => (
                  <div key={index} className="flex gap-3 p-3 rounded-xl bg-amber-50 border border-amber-200">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center text-sm font-bold">
                      {index + 1}
                    </span>
                    <p className="text-sm text-slate-700">{guideline}</p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4 text-primary">
              <FileText className="w-5 h-5" />
              <h3 className="font-bold">הראיון להכיר את הנהג</h3>
            </div>

            {/* Safety Scores Section - Moved here from step 4 */}
            {safetyScores.length > 0 && (
              <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200">
                <div className="flex items-center gap-2 mb-3">
                  <Gauge className="w-5 h-5 text-blue-600" />
                  <h4 className="font-bold text-blue-800">ציוני בטיחות - 3 חודשים אחרונים</h4>
                </div>
                <div className="space-y-3">
                  {safetyScores.map(score => (
                    <div key={score.id} className="p-3 rounded-lg bg-white border border-blue-100">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-slate-700">
                          {format(parseISO(score.score_month + ""), "MMMM yyyy", { locale: he })}
                        </span>
                        <Badge className={score.safety_score >= 75 ? "bg-green-500" : "bg-red-500"}>
                          {score.safety_score}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {score.speed_violations !== null && score.speed_violations > 0 && (
                          <div className="flex items-center gap-1 text-red-600">
                            <AlertTriangle className="w-3 h-3" />
                            <span>חריגות מהירות: {score.speed_violations}</span>
                          </div>
                        )}
                        {score.harsh_braking !== null && score.harsh_braking > 0 && (
                          <div className="flex items-center gap-1 text-amber-600">
                            <AlertTriangle className="w-3 h-3" />
                            <span>בלימות חדות: {score.harsh_braking}</span>
                          </div>
                        )}
                        {score.harsh_accelerations !== null && score.harsh_accelerations > 0 && (
                          <div className="flex items-center gap-1 text-amber-600">
                            <AlertTriangle className="w-3 h-3" />
                            <span>האצות חדות: {score.harsh_accelerations}</span>
                          </div>
                        )}
                        {score.harsh_turns !== null && score.harsh_turns > 0 && (
                          <div className="flex items-center gap-1 text-amber-600">
                            <AlertTriangle className="w-3 h-3" />
                            <span>פניות חדות: {score.harsh_turns}</span>
                          </div>
                        )}
                        {score.illegal_overtakes !== null && score.illegal_overtakes > 0 && (
                          <div className="flex items-center gap-1 text-red-600">
                            <AlertTriangle className="w-3 h-3" />
                            <span>עקיפות אסורות: {score.illegal_overtakes}</span>
                          </div>
                        )}
                        {score.kilometers !== null && (
                          <div className="text-slate-500">
                            <span>ק"מ: {score.kilometers}</span>
                          </div>
                        )}
                      </div>
                      {score.notes && (
                        <p className="text-xs text-slate-600 mt-2 italic">{score.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {safetyScores.length === 0 && formData.soldier_id && (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
                <Gauge className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                <p className="text-sm text-slate-500">אין ציוני בטיחות ל-3 חודשים אחרונים</p>
              </div>
            )}

            <div>
              <Label>1. מצב משפחתי של החייל ורקע כללי</Label>
              <p className="text-xs text-slate-500 mb-1">פרט על מצב משפחתי ורקע, תחביבים, לימודים, במה עובד</p>
              <Textarea
                value={formData.family_status}
                onChange={(e) => setFormData({ ...formData, family_status: e.target.value })}
                placeholder="פרט על מצב משפחתי ורקע, תחביבים, לימודים, במה עובד..."
                className="rounded-xl mt-2"
                rows={4}
              />
            </div>

            <div>
              <Label>2. מצב כלכלי של החייל</Label>
              <Textarea
                value={formData.financial_status}
                onChange={(e) => setFormData({ ...formData, financial_status: e.target.value })}
                placeholder="פרט על מצב כלכלי..."
                className="rounded-xl mt-2"
                rows={3}
              />
            </div>

            <div>
              <Label>3. הערות נוספות של החייל</Label>
              <Textarea
                value={formData.additional_notes}
                onChange={(e) => setFormData({ ...formData, additional_notes: e.target.value })}
                placeholder="הערות נוספות..."
                className="rounded-xl mt-2"
                rows={3}
              />
            </div>

            <div>
              <Label>4. סיכום המראיין והדברים שנאמרו בראיון</Label>
              <Textarea
                value={formData.interviewer_summary}
                onChange={(e) => setFormData({ ...formData, interviewer_summary: e.target.value })}
                placeholder="סכם את הראיון..."
                className="rounded-xl mt-2"
                rows={4}
              />
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4 text-primary">
              <Check className="w-5 h-5" />
              <h3 className="font-bold">סיום וחתימה</h3>
            </div>

            <div>
              <Label>שם הסמ"פ המראיין *</Label>
              <Input
                value={formData.interviewer_name}
                onChange={(e) => setFormData({ ...formData, interviewer_name: e.target.value })}
                placeholder="הזן שם מלא של המראיין"
                className="rounded-xl"
              />
            </div>

            {editingInterviewId && existingSignature ? (
              <div>
                <Label>חתימת הסמ"פ (נשמרה מהראיון המקורי)</Label>
                <div className="border-2 border-dashed border-slate-300 rounded-xl overflow-hidden mt-2 p-4 bg-slate-50">
                  <img src={existingSignature} alt="חתימה" className="max-w-full h-auto" />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  החתימה נשמרת ולא ניתן לשנות אותה בעריכה
                </p>
              </div>
            ) : (
              <div>
                <Label>חתימה *</Label>
                <div className="border-2 border-dashed border-slate-300 rounded-xl overflow-hidden mt-2">
                  <canvas
                    ref={signatureRef}
                    width={300}
                    height={150}
                    className="w-full bg-white touch-none"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                  />
                </div>
                <Button variant="outline" size="sm" onClick={clearSignature} className="mt-2">
                  נקה חתימה
                </Button>
              </div>
            )}

            <div className="p-4 rounded-xl bg-green-50 border border-green-200">
              <p className="text-sm text-green-700">
                בלחיצה על "שמור ראיון" הראיון יישמר במערכת.
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

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
              <ClipboardList className="w-4 h-4 text-gold" />
              <span className="text-sm font-bold text-gold">ראיונות נהגים</span>
            </div>
            <h1 className="text-2xl font-black text-white mb-2">ראיונות נהגי קו</h1>
            <p className="text-amber-200 text-sm">{interviews.length} ראיונות בוצעו</p>
          </div>
        </div>

        <div className="px-4 py-6 space-y-6">
          {/* Add New Interview */}
          <Button
            onClick={() => { resetForm(); setDialogOpen(true); }}
            className="w-full bg-gradient-to-r from-primary to-teal text-white py-6 rounded-2xl shadow-lg"
          >
            <Plus className="w-5 h-5 ml-2" />
            ביצוע ראיון חדש
          </Button>

          {/* Recent Interviews */}
          <Card className="border-0 shadow-xl bg-white/90 backdrop-blur rounded-3xl">
            <CardHeader>
              <CardTitle className="text-slate-800">ראיונות אחרונים</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[50vh]">
                <div className="space-y-3">
                  {interviews.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">
                      <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>לא בוצעו ראיונות עדיין</p>
                    </div>
                  ) : (
                    interviews.map(interview => (
                      <div
                        key={interview.id}
                        className="p-4 rounded-2xl bg-slate-50 border border-slate-200"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-bold text-slate-800">{interview.driver_name}</h4>
                            <p className="text-sm text-slate-500">{interview.outpost} - {interview.battalion}</p>
                            <p className="text-xs text-slate-400 mt-1">
                              {format(parseISO(interview.interview_date), "d בMMMM yyyy", { locale: he })}
                            </p>
                          </div>
                          <div className="text-xs text-slate-500">
                            מראיין: {interview.interviewer_name}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Interview Dialog */}
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            resetForm();
            setSearchParams({});
          }
        }}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" dir="rtl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5" />
                {editingInterviewId ? 'עריכת ראיון' : 'ראיון נהג קו'} - שלב {currentStep} מתוך 4
              </DialogTitle>
            </DialogHeader>

            {/* Steps indicator */}
            <div className="flex items-center justify-center gap-2 py-2">
              {[1, 2, 3, 4].map(step => (
                <div
                  key={step}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                    step === currentStep 
                      ? 'bg-primary text-white' 
                      : step < currentStep 
                        ? 'bg-green-500 text-white' 
                        : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {step < currentStep ? <Check className="w-4 h-4" /> : step}
                </div>
              ))}
            </div>

            <ScrollArea className="max-h-[60vh]">
              {renderStepContent()}
            </ScrollArea>

            <DialogFooter className="gap-2 mt-4">
              {currentStep > 1 && (
                <Button variant="outline" onClick={() => setCurrentStep(currentStep - 1)}>
                  <ChevronRight className="w-4 h-4 ml-1" />
                  הקודם
                </Button>
              )}
              {currentStep < 4 ? (
                <Button
                  onClick={() => setCurrentStep(currentStep + 1)}
                  disabled={currentStep === 1 && !canProceedToStep2}
                  className="bg-primary"
                >
                  הבא
                  <ChevronLeft className="w-4 h-4 mr-1" />
                </Button>
              ) : (
                <Button onClick={handleSubmit} disabled={saving} className="bg-green-600 hover:bg-green-700">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
                  {editingInterviewId ? 'עדכן ראיון' : 'שמור ראיון'}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}