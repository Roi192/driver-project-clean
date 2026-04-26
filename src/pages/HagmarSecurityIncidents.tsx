import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useHagmarSettlement } from "@/hooks/useHagmarSettlement";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { AlertTriangle, Plus, MapPin, Calendar, Search, FileSpreadsheet, Clock, CheckCircle2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";
import { HAGMAR_REGIONS } from "@/lib/hagmar-constants";
import * as XLSX from "xlsx";

const INCIDENT_TYPES = [
  { value: "intrusion", label: "חדירה" },
  { value: "stone_throwing", label: "יידוי אבנים" },
  { value: "fire", label: "הצתה" },
  { value: "theft", label: "גניבה" },
  { value: "vandalism", label: "ונדליזם" },
  { value: "suspicious_activity", label: "פעילות חשודה" },
  { value: "shooting", label: "ירי" },
  { value: "other", label: "אחר" },
];

const SEVERITY_LEVELS = [
  { value: "low", label: "נמוכה", color: "bg-blue-100 text-blue-700 border-blue-200" },
  { value: "medium", label: "בינונית", color: "bg-amber-100 text-amber-700 border-amber-200" },
  { value: "high", label: "גבוהה", color: "bg-orange-100 text-orange-700 border-orange-200" },
  { value: "critical", label: "קריטית", color: "bg-red-100 text-red-700 border-red-200" },
];

interface Incident {
  id: string;
  settlement: string;
  region: string | null;
  incident_date: string;
  incident_type: string;
  severity: string;
  title: string;
  description: string | null;
  location_details: string | null;
  reported_by: string | null;
  status: string;
  resolution: string | null;
  created_at: string;
}

export default function HagmarSecurityIncidents() {
  const { user, isHagmarAdmin, isSuperAdmin } = useAuth();
  const { userSettlement, isRestricted } = useHagmarSettlement();
  const isManager = isHagmarAdmin || isSuperAdmin;

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [profileSettlement, setProfileSettlement] = useState<string | null>(null);

  // Form
  const [formTitle, setFormTitle] = useState("");
  const [formType, setFormType] = useState("other");
  const [formSeverity, setFormSeverity] = useState("low");
  const [formDate, setFormDate] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [formSettlement, setFormSettlement] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formDescription, setFormDescription] = useState("");

  useEffect(() => {
    fetchData();
    fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    const { data } = await supabase.from("profiles").select("settlement").eq("user_id", user.id).maybeSingle();
    setProfileSettlement(data?.settlement || null);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("hagmar_security_incidents")
        .select("*")
        .order("incident_date", { ascending: false })
        .limit(100);
      if (error) throw error;
      setIncidents(data || []);
    } catch (err) {
      console.error(err);
      toast.error("שגיאה בטעינה");
    } finally {
      setLoading(false);
    }
  };

  const allSettlements = useMemo(() => {
    if (isRestricted && userSettlement) return [userSettlement];
    return HAGMAR_REGIONS.flatMap(r => r.companies.flatMap(c => c.settlements));
  }, [isRestricted, userSettlement]);

  const filtered = useMemo(() => {
    let result = incidents;
    // Ravshatz: restrict to own settlement
    if (isRestricted && userSettlement) result = result.filter(i => i.settlement === userSettlement);
    if (filterStatus !== "all") result = result.filter(i => i.status === filterStatus);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(i => i.title.toLowerCase().includes(q) || i.settlement.toLowerCase().includes(q));
    }
    return result;
  }, [incidents, filterStatus, search, isRestricted, userSettlement]);

  const openCounts = useMemo(() => incidents.filter(i => i.status === "open").length, [incidents]);

  const createIncident = async () => {
    if (!formTitle || !formSettlement) { toast.error("יש למלא כותרת וישוב"); return; }
    
    const region = HAGMAR_REGIONS.find(r => r.companies.some(c => c.settlements.includes(formSettlement)))?.name || null;
    const company = HAGMAR_REGIONS.flatMap(r => r.companies).find(c => c.settlements.includes(formSettlement))?.name || null;

    try {
      const { data: profile } = await supabase.from("profiles").select("full_name").eq("user_id", user?.id || "").maybeSingle();
      
      const { error } = await supabase.from("hagmar_security_incidents").insert({
        title: formTitle,
        incident_type: formType,
        severity: formSeverity,
        incident_date: formDate,
        settlement: formSettlement,
        region,
        company,
        location_details: formLocation || null,
        description: formDescription || null,
        reported_by: profile?.full_name || null,
        reported_by_user_id: user?.id,
        status: "open",
      });
      if (error) throw error;
      toast.success("דיווח נשמר בהצלחה");
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error("שגיאה בשמירה");
    }
  };

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase.from("hagmar_security_incidents").update({ status: newStatus }).eq("id", id);
      if (error) throw error;
      toast.success("סטטוס עודכן");
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error("שגיאה בעדכון");
    }
  };

  const resetForm = () => {
    setFormTitle(""); setFormType("other"); setFormSeverity("low");
    setFormDate(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
    setFormSettlement(profileSettlement || ""); setFormLocation(""); setFormDescription("");
  };

  const getTypeLabel = (v: string) => INCIDENT_TYPES.find(t => t.value === v)?.label || v;
  const getSeverity = (v: string) => SEVERITY_LEVELS.find(s => s.value === v);

  const exportToExcel = () => {
    const rows = filtered.map(i => ({
      "כותרת": i.title,
      "סוג": getTypeLabel(i.incident_type),
      "חומרה": getSeverity(i.severity)?.label || i.severity,
      "ישוב": i.settlement,
      "תאריך": format(new Date(i.incident_date), "dd/MM/yyyy HH:mm"),
      "מיקום": i.location_details || "",
      "מדווח": i.reported_by || "",
      "סטטוס": i.status === "open" ? "פתוח" : "סגור",
      "תיאור": i.description || "",
      "פתרון": i.resolution || "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "אירועים");
    XLSX.writeFile(wb, `hagmar_incidents_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
  };

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-br from-white via-amber-50/30 to-white pb-24" dir="rtl">
        <div className="px-4 py-6 space-y-5">
          <PageHeader title="דיווחי אירועים ביטחוניים" subtitle="דיווח ומעקב אירועי ביטחון ביישובים" icon={AlertTriangle} />

          {/* Open Incidents Alert */}
          {openCounts > 0 && (
            <Card className="p-4 border-red-200 bg-gradient-to-br from-red-50 to-orange-50">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <span className="font-bold text-red-800">{openCounts} אירועים פתוחים</span>
              </div>
            </Card>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button onClick={() => { resetForm(); setDialogOpen(true); }} className="flex-1 h-12 bg-gradient-to-r from-red-500 to-orange-500 text-white font-bold gap-2">
              <Plus className="w-5 h-5" /> דיווח אירוע חדש
            </Button>
            <Button variant="outline" onClick={exportToExcel} className="h-12 gap-2">
              <FileSpreadsheet className="w-5 h-5" /> Excel
            </Button>
          </div>

          {/* Filters */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input placeholder="חיפוש..." value={search} onChange={e => setSearch(e.target.value)} className="pr-9 h-11" />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-28 h-11"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">הכל</SelectItem>
                <SelectItem value="open">פתוח</SelectItem>
                <SelectItem value="closed">סגור</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Incidents List */}
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full mx-auto" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <Shield className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <p className="font-bold text-foreground">אין אירועים</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(incident => {
                const severity = getSeverity(incident.severity);
                return (
                  <Card key={incident.id} className={`p-4 ${incident.status === "open" ? "border-red-200" : "border-border"}`}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <Badge className={severity?.color || ""}>{severity?.label || incident.severity}</Badge>
                          <Badge variant="outline" className="text-xs">{getTypeLabel(incident.incident_type)}</Badge>
                          {incident.status === "open" ? (
                            <Badge className="bg-red-100 text-red-700 border-red-200 text-xs"><Clock className="w-3 h-3 ml-1" />פתוח</Badge>
                          ) : (
                            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs"><CheckCircle2 className="w-3 h-3 ml-1" />סגור</Badge>
                          )}
                        </div>
                        <h3 className="font-bold text-foreground">{incident.title}</h3>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mb-2">
                      <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{format(new Date(incident.incident_date), "dd/MM/yyyy HH:mm")}</span>
                      <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{incident.settlement}</span>
                      {incident.reported_by && <span>מדווח: {incident.reported_by}</span>}
                    </div>
                    {incident.description && <p className="text-sm text-muted-foreground mb-2">{incident.description}</p>}
                    {incident.location_details && <p className="text-xs text-muted-foreground">מיקום: {incident.location_details}</p>}
                    {incident.resolution && <p className="text-sm text-emerald-700 mt-1">פתרון: {incident.resolution}</p>}
                    
                    {isManager && incident.status === "open" && (
                      <Button size="sm" variant="outline" className="mt-2 gap-1 text-emerald-600 border-emerald-300" onClick={() => updateStatus(incident.id, "closed")}>
                        <CheckCircle2 className="w-4 h-4" /> סגור אירוע
                      </Button>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Create Incident Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader><DialogTitle>דיווח אירוע ביטחוני</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>כותרת *</Label>
              <Input value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="תיאור קצר של האירוע" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>סוג אירוע</Label>
                <Select value={formType} onValueChange={setFormType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {INCIDENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>חומרה</Label>
                <Select value={formSeverity} onValueChange={setFormSeverity}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SEVERITY_LEVELS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>תאריך ושעה</Label>
              <Input type="datetime-local" value={formDate} onChange={e => setFormDate(e.target.value)} />
            </div>
            <div>
              <Label>ישוב *</Label>
              <Select value={formSettlement} onValueChange={setFormSettlement}>
                <SelectTrigger><SelectValue placeholder="בחר ישוב" /></SelectTrigger>
                <SelectContent>
                  {allSettlements.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>מיקום מדויק</Label>
              <Input value={formLocation} onChange={e => setFormLocation(e.target.value)} placeholder="כניסה מערבית, גדר דרומית..." />
            </div>
            <div>
              <Label>תיאור מפורט</Label>
              <Textarea value={formDescription} onChange={e => setFormDescription(e.target.value)} rows={4} placeholder="מה קרה? פרטים נוספים..." />
            </div>
            <Button onClick={createIncident} className="w-full h-12 bg-gradient-to-r from-red-500 to-orange-500 text-white font-bold">
              שלח דיווח
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}