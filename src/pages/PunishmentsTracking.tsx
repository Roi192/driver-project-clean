import { useState, useEffect, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { format, parseISO, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths } from "date-fns";
import { he } from "date-fns/locale";
import { 
  Gavel, 
  Plus, 
  Edit, 
  Trash2, 
  Loader2,
  FileSpreadsheet,
  Search,
  User,
  CalendarOff,
  TrendingUp
} from "lucide-react";
import * as XLSX from "xlsx";
import unitLogo from "@/assets/unit-logo.png";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface Soldier {
  id: string;
  full_name: string;
  personal_number: string;
}

interface Punishment {
  id: string;
  soldier_id: string;
  punishment_date: string;
  offense: string;
  punishment: string;
  judge: string;
  notes: string | null;
  created_at: string;
  soldiers?: Soldier;
}

type PunishmentType = "משפט" | "שלילת ימי חופשה";

export default function PunishmentsTracking() {
  const { isAdmin, isPlatoonCommander, canAccessPunishments, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const hasAccess = canAccessPunishments;
  const [punishments, setPunishments] = useState<Punishment[]>([]);
  const [soldiers, setSoldiers] = useState<Soldier[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPunishment, setEditingPunishment] = useState<Punishment | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<Punishment | null>(null);
  
  // Dialogs for punishment type lists
  const [trialsDialogOpen, setTrialsDialogOpen] = useState(false);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);

  const [formData, setFormData] = useState({
    soldier_id: "",
    punishment_date: format(new Date(), "yyyy-MM-dd"),
    punishment_type: "" as PunishmentType | "",
    offense: "",
    punishment: "",
    judge: "",
    notes: "",
  });

  useEffect(() => {
    if (!authLoading && !hasAccess) {
      navigate("/");
    }
  }, [hasAccess, authLoading, navigate]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    
    const [punishmentsRes, soldiersRes] = await Promise.all([
      supabase
        .from("punishments")
        .select("*, soldiers(id, full_name, personal_number)")
        .order("punishment_date", { ascending: false }),
      supabase
        .from("soldiers")
        .select("id, full_name, personal_number")
        .eq("is_active", true)
        .order("full_name")
    ]);

    if (punishmentsRes.error) {
      console.error("Error fetching punishments:", punishmentsRes.error);
    } else {
      setPunishments(punishmentsRes.data || []);
    }

    if (soldiersRes.error) {
      console.error("Error fetching soldiers:", soldiersRes.error);
    } else {
      setSoldiers(soldiersRes.data || []);
    }

    setLoading(false);
  };

  // פונקציה לזיהוי סוג עונש
  const getPunishmentType = (punishment: Punishment): PunishmentType => {
    const text = punishment.punishment.toLowerCase();
    if (text.includes("שלילת") || text.includes("ימי חופשה") || text.includes("חופש")) {
      return "שלילת ימי חופשה";
    }
    return "משפט";
  };

  // סטטיסטיקות
  const trialsPunishments = punishments.filter(p => getPunishmentType(p) === "משפט");
  const leavePunishments = punishments.filter(p => getPunishmentType(p) === "שלילת ימי חופשה");

  // Monthly trend data
  const monthlyTrendData = useMemo(() => {
    const now = new Date();
    const sixMonthsAgo = subMonths(now, 5);
    const months = eachMonthOfInterval({ start: startOfMonth(sixMonthsAgo), end: endOfMonth(now) });
    
    return months.map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      
      const monthPunishments = punishments.filter(p => {
        const date = parseISO(p.punishment_date);
        return date >= monthStart && date <= monthEnd;
      });
      
      const trials = monthPunishments.filter(p => getPunishmentType(p) === "משפט").length;
      const leave = monthPunishments.filter(p => getPunishmentType(p) === "שלילת ימי חופשה").length;
      
      return {
        month: format(month, "MMM yy", { locale: he }),
        משפטים: trials,
        "שלילת חופשה": leave,
        total: trials + leave,
      };
    });
  }, [punishments]);

  const handleSubmit = async () => {
    if (!formData.soldier_id || !formData.offense || !formData.punishment || !formData.judge || !formData.punishment_type) {
      toast.error("יש למלא את כל השדות הנדרשים");
      return;
    }

    // בנה את העונש עם סוג העונש
    const fullPunishment = formData.punishment_type === "שלילת ימי חופשה" 
      ? `שלילת ימי חופשה - ${formData.punishment}`
      : formData.punishment;

    const data = {
      soldier_id: formData.soldier_id,
      punishment_date: formData.punishment_date,
      offense: formData.offense,
      punishment: fullPunishment,
      judge: formData.judge,
      notes: formData.notes || null,
    };

    if (editingPunishment) {
      const { error } = await supabase
        .from("punishments")
        .update(data)
        .eq("id", editingPunishment.id);

      if (error) {
        toast.error("שגיאה בעדכון");
      } else {
        toast.success("עודכן בהצלחה");
        fetchData();
      }
    } else {
      const { error } = await supabase
        .from("punishments")
        .insert(data);

      if (error) {
        toast.error("שגיאה בהוספה");
      } else {
        toast.success("נוסף בהצלחה");
        fetchData();
      }
    }

    setDialogOpen(false);
    resetForm();
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;

    const { error } = await supabase
      .from("punishments")
      .delete()
      .eq("id", itemToDelete.id);

    if (error) {
      toast.error("שגיאה במחיקה");
    } else {
      toast.success("נמחק בהצלחה");
      fetchData();
    }
    setDeleteConfirmOpen(false);
    setItemToDelete(null);
  };

  const resetForm = () => {
    setFormData({
      soldier_id: "",
      punishment_date: format(new Date(), "yyyy-MM-dd"),
      punishment_type: "",
      offense: "",
      punishment: "",
      judge: "",
      notes: "",
    });
    setEditingPunishment(null);
  };

  const openEditDialog = (punishment: Punishment) => {
    setEditingPunishment(punishment);
    const type = getPunishmentType(punishment);
    let punishmentText = punishment.punishment;
    if (type === "שלילת ימי חופשה" && punishmentText.includes(" - ")) {
      punishmentText = punishmentText.split(" - ").slice(1).join(" - ");
    }
    
    setFormData({
      soldier_id: punishment.soldier_id,
      punishment_date: punishment.punishment_date,
      punishment_type: type,
      offense: punishment.offense,
      punishment: punishmentText,
      judge: punishment.judge,
      notes: punishment.notes || "",
    });
    setDialogOpen(true);
  };

  const exportToExcel = () => {
    const data = punishments.map(p => ({
      "תאריך": format(parseISO(p.punishment_date), "dd/MM/yyyy"),
      "שם החייל": p.soldiers?.full_name || "-",
      "מספר אישי": p.soldiers?.personal_number || "-",
      "סוג עונש": getPunishmentType(p),
      "העבירה": p.offense,
      "העונש": p.punishment,
      "השופט": p.judge,
      "הערות": p.notes || "-",
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "מעקב עונשים");
    XLSX.writeFile(wb, `מעקב_עונשים_${format(new Date(), "dd-MM-yyyy")}.xlsx`);
    toast.success("הקובץ יוצא בהצלחה");
  };

  const filteredPunishments = punishments.filter(p =>
    p.soldiers?.full_name?.includes(searchTerm) ||
    p.offense.includes(searchTerm) ||
    p.punishment.includes(searchTerm)
  );

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
        <div className="relative overflow-hidden bg-gradient-to-l from-slate-900 via-slate-800 to-slate-900 px-4 py-8">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--gold)/0.2),transparent_50%)]" />
          <div className="absolute top-4 left-4 opacity-20">
            <img src={unitLogo} alt="" className="w-20 h-20" />
          </div>
          
          <div className="relative z-10 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-500/20 border border-red-500/30 mb-4">
              <Gavel className="w-4 h-4 text-red-400" />
              <span className="text-sm font-bold text-red-400">מעקב עונשים</span>
            </div>
            <h1 className="text-2xl font-black text-white mb-2">ניהול עונשים</h1>
            <p className="text-slate-400 text-sm">{punishments.length} רשומות</p>
          </div>
        </div>

        <div className="px-4 py-6 space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 gap-3">
            <Card 
              className="border-0 bg-gradient-to-br from-orange-50 to-amber-50 cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => setTrialsDialogOpen(true)}
            >
              <CardContent className="p-4 text-center">
                <div className="flex justify-center mb-2">
                  <Gavel className="w-8 h-8 text-orange-600" />
                </div>
                <p className="text-3xl font-black text-orange-600">{trialsPunishments.length}</p>
                <p className="text-sm text-slate-600">משפטים</p>
                <p className="text-xs text-orange-500 mt-1">לחץ לצפייה</p>
              </CardContent>
            </Card>
            <Card 
              className="border-0 bg-gradient-to-br from-purple-50 to-indigo-50 cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => setLeaveDialogOpen(true)}
            >
              <CardContent className="p-4 text-center">
                <div className="flex justify-center mb-2">
                  <CalendarOff className="w-8 h-8 text-purple-600" />
                </div>
                <p className="text-3xl font-black text-purple-600">{leavePunishments.length}</p>
                <p className="text-sm text-slate-600">שלילת ימי חופשה</p>
                <p className="text-xs text-purple-500 mt-1">לחץ לצפייה</p>
              </CardContent>
            </Card>
          </div>

          {/* Monthly Trend Chart */}
          <Card className="border-0 shadow-xl bg-white/90 backdrop-blur rounded-3xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-slate-800 flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                מגמת עונשים (6 חודשים)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyTrendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis 
                      dataKey="month" 
                      tick={{ fontSize: 12, fill: '#64748b' }}
                      axisLine={{ stroke: '#e2e8f0' }}
                    />
                    <YAxis 
                      tick={{ fontSize: 12, fill: '#64748b' }}
                      axisLine={{ stroke: '#e2e8f0' }}
                      allowDecimals={false}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        direction: 'rtl'
                      }}
                    />
                    <Legend />
                    <Bar dataKey="משפטים" fill="#f97316" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="שלילת חופשה" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              onClick={() => { resetForm(); setDialogOpen(true); }}
              className="flex-1 bg-gradient-to-r from-red-500 to-red-600 text-white py-6 rounded-2xl shadow-lg"
            >
              <Plus className="w-5 h-5 ml-2" />
              הוסף עונש
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

          {/* List */}
          <Card className="border-0 shadow-xl bg-white/90 backdrop-blur rounded-3xl">
            <CardHeader>
              <CardTitle className="text-slate-800">רשימת עונשים</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <div className="min-w-[600px] space-y-3">
                  {filteredPunishments.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">
                      <Gavel className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>אין עונשים</p>
                    </div>
                  ) : (
                    filteredPunishments.map(p => {
                      const type = getPunishmentType(p);
                      return (
                        <div key={p.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <User className="w-4 h-4 text-slate-400 flex-shrink-0" />
                              <h4 className="font-bold text-slate-800">{p.soldiers?.full_name}</h4>
                              <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${type === "משפט" ? "bg-orange-100 text-orange-700" : "bg-purple-100 text-purple-700"}`}>
                                {type}
                              </span>
                              <span className="text-xs text-slate-500 whitespace-nowrap">
                                {format(parseISO(p.punishment_date), "dd/MM/yyyy")}
                              </span>
                            </div>
                            <p className="text-sm text-slate-600 mb-1"><strong>העבירה:</strong> {p.offense}</p>
                            <p className="text-sm text-slate-600 mb-1"><strong>העונש:</strong> {p.punishment}</p>
                            <p className="text-sm text-slate-500"><strong>שופט:</strong> {p.judge}</p>
                            {p.notes && (
                              <p className="text-sm text-slate-500 mt-1"><strong>הערות:</strong> {p.notes}</p>
                            )}
                            {isAdmin && (
                              <div className="flex gap-2 mt-3 pt-3 border-t border-slate-200">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openEditDialog(p)}
                                  className="rounded-xl flex-1"
                                >
                                  <Edit className="w-4 h-4 ml-1" />
                                  עריכה
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => { setItemToDelete(p); setDeleteConfirmOpen(true); }}
                                  className="rounded-xl text-red-500 flex-1"
                                >
                                  <Trash2 className="w-4 h-4 ml-1" />
                                  מחיקה
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Add/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" dir="rtl">
            <DialogHeader>
              <DialogTitle>{editingPunishment ? "עריכה" : "הוספת עונש חדש"}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label>חייל *</Label>
                <Select
                  value={formData.soldier_id}
                  onValueChange={(value) => setFormData({ ...formData, soldier_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="בחר חייל" />
                  </SelectTrigger>
                  <SelectContent>
                    {soldiers.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>תאריך *</Label>
                <Input
                  type="date"
                  value={formData.punishment_date}
                  onChange={(e) => setFormData({ ...formData, punishment_date: e.target.value })}
                />
              </div>

              <div>
                <Label>סוג עונש *</Label>
                <Select
                  value={formData.punishment_type}
                  onValueChange={(value) => setFormData({ ...formData, punishment_type: value as PunishmentType })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="בחר סוג עונש" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="משפט">
                      <div className="flex items-center gap-2">
                        <Gavel className="w-4 h-4 text-orange-600" />
                        משפט
                      </div>
                    </SelectItem>
                    <SelectItem value="שלילת ימי חופשה">
                      <div className="flex items-center gap-2">
                        <CalendarOff className="w-4 h-4 text-purple-600" />
                        שלילת ימי חופשה
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>מה עשה *</Label>
                <Textarea
                  value={formData.offense}
                  onChange={(e) => setFormData({ ...formData, offense: e.target.value })}
                  placeholder="תאר את העבירה"
                />
              </div>

              <div>
                <Label>{formData.punishment_type === "שלילת ימי חופשה" ? "כמה ימים נשללו *" : "מה העונש *"}</Label>
                <Textarea
                  value={formData.punishment}
                  onChange={(e) => setFormData({ ...formData, punishment: e.target.value })}
                  placeholder={formData.punishment_type === "שלילת ימי חופשה" ? "לדוגמא: 3 ימים" : "תאר את העונש"}
                />
              </div>

              <div>
                <Label>השופט *</Label>
                <Input
                  value={formData.judge}
                  onChange={(e) => setFormData({ ...formData, judge: e.target.value })}
                  placeholder="שם השופט"
                />
              </div>

              <div>
                <Label>הערות</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="הערות נוספות"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 mt-4">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>ביטול</Button>
              <Button onClick={handleSubmit} className="bg-primary">
                {editingPunishment ? "עדכן" : "הוסף"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirm */}
        <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <DialogContent dir="rtl">
            <DialogHeader>
              <DialogTitle>אישור מחיקה</DialogTitle>
            </DialogHeader>
            <p className="text-slate-600">האם אתה בטוח?</p>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>ביטול</Button>
              <Button variant="destructive" onClick={handleDelete}>מחק</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Trials List Dialog */}
        <Dialog open={trialsDialogOpen} onOpenChange={setTrialsDialogOpen}>
          <DialogContent className="max-w-md max-h-[90vh]" dir="rtl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-orange-800">
                <Gavel className="w-5 h-5" />
                רשימת משפטים ({trialsPunishments.length})
              </DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-3">
                {trialsPunishments.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <Gavel className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>אין משפטים</p>
                  </div>
                ) : (
                  trialsPunishments.map(p => (
                    <div key={p.id} className="p-3 rounded-xl bg-orange-50 border border-orange-200">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-bold text-slate-800">{p.soldiers?.full_name}</h4>
                        <span className="text-xs text-slate-500">
                          {format(parseISO(p.punishment_date), "dd/MM/yyyy")}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600"><strong>עבירה:</strong> {p.offense}</p>
                      <p className="text-sm text-slate-600"><strong>עונש:</strong> {p.punishment}</p>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>

        {/* Leave Revocation List Dialog */}
        <Dialog open={leaveDialogOpen} onOpenChange={setLeaveDialogOpen}>
          <DialogContent className="max-w-md max-h-[90vh]" dir="rtl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-purple-800">
                <CalendarOff className="w-5 h-5" />
                רשימת שלילת ימי חופשה ({leavePunishments.length})
              </DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-3">
                {leavePunishments.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <CalendarOff className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>אין שלילת ימי חופשה</p>
                  </div>
                ) : (
                  leavePunishments.map(p => (
                    <div key={p.id} className="p-3 rounded-xl bg-purple-50 border border-purple-200">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-bold text-slate-800">{p.soldiers?.full_name}</h4>
                        <span className="text-xs text-slate-500">
                          {format(parseISO(p.punishment_date), "dd/MM/yyyy")}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600"><strong>עבירה:</strong> {p.offense}</p>
                      <p className="text-sm text-slate-600"><strong>עונש:</strong> {p.punishment}</p>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}