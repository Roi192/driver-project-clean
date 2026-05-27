import { useState, useEffect, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import {
  DoorOpen,
  Plus,
  Edit,
  Trash2,
  Loader2,
  FileSpreadsheet,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  CalendarDays,
  User as UserIcon,
} from "lucide-react";
import * as XLSX from "xlsx";
import unitLogo from "@/assets/unit-logo.png";

interface Soldier {
  id: string;
  full_name: string;
  personal_number: string;
}

interface ExitRequest {
  id: string;
  soldier_id: string;
  request_date: string;
  exit_date: string;
  request_type: string;
  reason: string | null;
  status: "pending" | "approved" | "rejected";
  decision_notes: string | null;
  decided_at: string | null;
  created_at: string;
  soldiers?: Soldier;
}

const REQUEST_TYPES = [
  "חופשה רגילה",
  "חופשה מיוחדת",
  "יציאת רופא",
  "אפטר",
  "חמשוש",
  "יציאה מנהלית",
  "אחר",
];

const STATUS_META: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: "ממתין", color: "bg-amber-100 text-amber-700 border-amber-300", icon: Clock },
  approved: { label: "אושר", color: "bg-emerald-100 text-emerald-700 border-emerald-300", icon: CheckCircle2 },
  rejected: { label: "נדחה", color: "bg-rose-100 text-rose-700 border-rose-300", icon: XCircle },
};

export default function ExitRequests() {
  const { isAdmin, isPlatoonCommander, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const hasAccess = isAdmin || isPlatoonCommander;

  const [requests, setRequests] = useState<ExitRequest[]>([]);
  const [soldiers, setSoldiers] = useState<Soldier[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ExitRequest | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<ExitRequest | null>(null);

  const [formData, setFormData] = useState({
    soldier_id: "",
    request_date: format(new Date(), "yyyy-MM-dd"),
    exit_date: format(new Date(), "yyyy-MM-dd"),
    request_type: "",
    reason: "",
    status: "pending" as "pending" | "approved" | "rejected",
    decision_notes: "",
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
    const [reqRes, soldiersRes] = await Promise.all([
      supabase
        .from("exit_requests")
        .select("*, soldiers(id, full_name, personal_number)")
        .order("exit_date", { ascending: false }),
      supabase
        .from("soldiers")
        .select("id, full_name, personal_number")
        .eq("is_active", true)
        .order("full_name"),
    ]);

    if (reqRes.error) {
      toast.error("שגיאה בטעינה: " + reqRes.error.message);
    } else {
      setRequests((reqRes.data || []) as ExitRequest[]);
    }
    if (!soldiersRes.error) setSoldiers(soldiersRes.data || []);
    setLoading(false);
  };

  const stats = useMemo(() => {
    return {
      total: requests.length,
      pending: requests.filter((r) => r.status === "pending").length,
      approved: requests.filter((r) => r.status === "approved").length,
      rejected: requests.filter((r) => r.status === "rejected").length,
    };
  }, [requests]);

  const filtered = useMemo(() => {
    return requests.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (searchTerm) {
        const t = searchTerm.trim();
        const inName = r.soldiers?.full_name?.includes(t);
        const inPN = r.soldiers?.personal_number?.includes(t);
        const inType = r.request_type?.includes(t);
        const inReason = r.reason?.includes(t);
        if (!inName && !inPN && !inType && !inReason) return false;
      }
      return true;
    });
  }, [requests, searchTerm, statusFilter]);

  const resetForm = () => {
    setFormData({
      soldier_id: "",
      request_date: format(new Date(), "yyyy-MM-dd"),
      exit_date: format(new Date(), "yyyy-MM-dd"),
      request_type: "",
      reason: "",
      status: "pending",
      decision_notes: "",
    });
    setEditing(null);
  };

  const openEdit = (r: ExitRequest) => {
    setEditing(r);
    setFormData({
      soldier_id: r.soldier_id,
      request_date: r.request_date,
      exit_date: r.exit_date,
      request_type: r.request_type,
      reason: r.reason || "",
      status: r.status,
      decision_notes: r.decision_notes || "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.soldier_id || !formData.exit_date || !formData.request_type) {
      toast.error("יש למלא חייל, תאריך יציאה וסוג בקשה");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();

    const payload: any = {
      soldier_id: formData.soldier_id,
      request_date: formData.request_date,
      exit_date: formData.exit_date,
      request_type: formData.request_type,
      reason: formData.reason || null,
      status: formData.status,
      decision_notes: formData.decision_notes || null,
    };

    if (formData.status !== "pending") {
      payload.decided_at = new Date().toISOString();
      payload.decided_by = user?.id || null;
    } else {
      payload.decided_at = null;
      payload.decided_by = null;
    }

    if (editing) {
      const { error } = await supabase.from("exit_requests").update(payload).eq("id", editing.id);
      if (error) return toast.error("שגיאה בעדכון: " + error.message);
      toast.success("עודכן בהצלחה");
    } else {
      payload.created_by = user?.id || null;
      const { error } = await supabase.from("exit_requests").insert(payload);
      if (error) return toast.error("שגיאה בהוספה: " + error.message);
      toast.success("נוסף בהצלחה");
    }

    setDialogOpen(false);
    resetForm();
    fetchData();
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    const { error } = await supabase.from("exit_requests").delete().eq("id", itemToDelete.id);
    if (error) {
      toast.error("שגיאה במחיקה: " + error.message);
    } else {
      toast.success("נמחק בהצלחה");
      fetchData();
    }
    setDeleteConfirmOpen(false);
    setItemToDelete(null);
  };

  const quickDecide = async (r: ExitRequest, status: "approved" | "rejected") => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("exit_requests")
      .update({
        status,
        decided_at: new Date().toISOString(),
        decided_by: user?.id || null,
      })
      .eq("id", r.id);
    if (error) {
      toast.error("שגיאה: " + error.message);
    } else {
      toast.success(status === "approved" ? "הבקשה אושרה" : "הבקשה נדחתה");
      fetchData();
    }
  };

  const exportToExcel = () => {
    const data = filtered.map((r) => ({
      "תאריך בקשה": format(parseISO(r.request_date), "dd/MM/yyyy"),
      "תאריך יציאה": format(parseISO(r.exit_date), "dd/MM/yyyy"),
      "שם החייל": r.soldiers?.full_name || "-",
      "מספר אישי": r.soldiers?.personal_number || "-",
      "סוג בקשה": r.request_type,
      סיבה: r.reason || "-",
      סטטוס: STATUS_META[r.status]?.label || r.status,
      "הערות החלטה": r.decision_notes || "-",
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "בקשות יציאה");
    XLSX.writeFile(wb, `בקשות_יציאה_${format(new Date(), "dd-MM-yyyy")}.xlsx`);
    toast.success("הקובץ יוצא בהצלחה");
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
        <div className="relative overflow-hidden bg-gradient-to-l from-slate-900 via-slate-800 to-slate-900 px-4 py-8">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--gold)/0.2),transparent_50%)]" />
          <div className="absolute top-4 left-4 opacity-20">
            <img src={unitLogo} alt="" className="w-20 h-20" />
          </div>
          <div className="relative z-10 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/20 border border-blue-500/30 mb-4">
              <DoorOpen className="w-4 h-4 text-blue-300" />
              <span className="text-sm font-bold text-blue-300">מעקב בקשות יציאה</span>
            </div>
            <h1 className="text-2xl font-black text-white mb-2">ניהול בקשות יציאה</h1>
            <p className="text-slate-400 text-sm">{stats.total} רשומות</p>
          </div>
        </div>

        <div className="px-4 py-6 space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-3 gap-3">
            <Card
              className={`border-0 bg-gradient-to-br from-amber-50 to-yellow-50 cursor-pointer hover:shadow-lg transition-shadow ${statusFilter === "pending" ? "ring-2 ring-amber-400" : ""}`}
              onClick={() => setStatusFilter(statusFilter === "pending" ? "all" : "pending")}
            >
              <CardContent className="p-3 text-center">
                <Clock className="w-6 h-6 text-amber-600 mx-auto mb-1" />
                <p className="text-2xl font-black text-amber-600">{stats.pending}</p>
                <p className="text-xs text-slate-700 font-semibold">ממתין</p>
              </CardContent>
            </Card>
            <Card
              className={`border-0 bg-gradient-to-br from-emerald-50 to-green-50 cursor-pointer hover:shadow-lg transition-shadow ${statusFilter === "approved" ? "ring-2 ring-emerald-400" : ""}`}
              onClick={() => setStatusFilter(statusFilter === "approved" ? "all" : "approved")}
            >
              <CardContent className="p-3 text-center">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto mb-1" />
                <p className="text-2xl font-black text-emerald-600">{stats.approved}</p>
                <p className="text-xs text-slate-700 font-semibold">אושרו</p>
              </CardContent>
            </Card>
            <Card
              className={`border-0 bg-gradient-to-br from-rose-50 to-red-50 cursor-pointer hover:shadow-lg transition-shadow ${statusFilter === "rejected" ? "ring-2 ring-rose-400" : ""}`}
              onClick={() => setStatusFilter(statusFilter === "rejected" ? "all" : "rejected")}
            >
              <CardContent className="p-3 text-center">
                <XCircle className="w-6 h-6 text-rose-600 mx-auto mb-1" />
                <p className="text-2xl font-black text-rose-600">{stats.rejected}</p>
                <p className="text-xs text-slate-700 font-semibold">נדחו</p>
              </CardContent>
            </Card>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              onClick={() => { resetForm(); setDialogOpen(true); }}
              className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-6 rounded-2xl shadow-lg"
            >
              <Plus className="w-5 h-5 ml-2" />
              הוסף בקשה
            </Button>
            <Button onClick={exportToExcel} variant="outline" className="py-6 rounded-2xl border-2">
              <FileSpreadsheet className="w-5 h-5" />
            </Button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="חיפוש לפי חייל / סוג / סיבה..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10 bg-white border-slate-200 text-slate-800"
            />
          </div>

          {statusFilter !== "all" && (
            <div className="flex items-center justify-between bg-slate-100 border border-slate-200 rounded-xl px-4 py-2">
              <span className="text-sm text-slate-700 font-semibold">
                מסונן לפי: {STATUS_META[statusFilter]?.label}
              </span>
              <button
                onClick={() => setStatusFilter("all")}
                className="text-xs text-blue-600 font-bold hover:underline"
              >
                נקה סינון
              </button>
            </div>
          )}

          {/* List */}
          <div className="space-y-3">
            {filtered.length === 0 ? (
              <Card className="border-0 bg-white">
                <CardContent className="p-8 text-center text-slate-500">
                  אין בקשות להצגה
                </CardContent>
              </Card>
            ) : (
              filtered.map((r) => {
                const meta = STATUS_META[r.status];
                const Icon = meta.icon;
                return (
                  <Card key={r.id} className="border-0 shadow-md bg-white rounded-2xl overflow-hidden">
                    <CardContent className="p-4 space-y-3">
                      {/* Top row: soldier + status */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-sm flex-shrink-0">
                            {r.soldiers?.full_name?.charAt(0) || "?"}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-800 truncate">{r.soldiers?.full_name || "—"}</p>
                            <p className="text-xs text-slate-500">מ.א. {r.soldiers?.personal_number || "—"}</p>
                          </div>
                        </div>
                        <Badge className={`${meta.color} border font-bold gap-1`}>
                          <Icon className="w-3 h-3" />
                          {meta.label}
                        </Badge>
                      </div>

                      {/* Info grid */}
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="bg-slate-50 rounded-lg p-2">
                          <p className="text-[10px] text-slate-500 font-semibold">סוג בקשה</p>
                          <p className="text-slate-800 font-bold truncate">{r.request_type}</p>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-2">
                          <p className="text-[10px] text-slate-500 font-semibold">תאריך יציאה</p>
                          <p className="text-slate-800 font-bold">
                            {format(parseISO(r.exit_date), "dd/MM/yyyy")}
                          </p>
                        </div>
                      </div>

                      {r.reason && (
                        <div className="bg-blue-50 border border-blue-100 rounded-lg p-2 text-sm">
                          <p className="text-[10px] text-blue-600 font-bold">סיבה</p>
                          <p className="text-slate-700">{r.reason}</p>
                        </div>
                      )}

                      {r.decision_notes && (
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm">
                          <p className="text-[10px] text-slate-500 font-bold">הערות החלטה</p>
                          <p className="text-slate-700">{r.decision_notes}</p>
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                        <span className="text-[11px] text-slate-400">
                          נוצר: {format(parseISO(r.created_at), "dd/MM/yyyy")}
                        </span>
                        <div className="flex items-center gap-1">
                          {r.status === "pending" && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => quickDecide(r, "approved")}
                                className="h-8 text-emerald-700 hover:bg-emerald-50"
                              >
                                <CheckCircle2 className="w-4 h-4 ml-1" />
                                אשר
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => quickDecide(r, "rejected")}
                                className="h-8 text-rose-700 hover:bg-rose-50"
                              >
                                <XCircle className="w-4 h-4 ml-1" />
                                דחה
                              </Button>
                            </>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => openEdit(r)}
                            className="h-8 w-8 text-slate-600 hover:bg-slate-100"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => { setItemToDelete(r); setDeleteConfirmOpen(true); }}
                            className="h-8 w-8 text-rose-600 hover:bg-rose-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </div>

        {/* Add/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-slate-800">
                {editing ? "עריכת בקשת יציאה" : "בקשת יציאה חדשה"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label className="text-slate-700">חייל *</Label>
                <Select
                  value={formData.soldier_id}
                  onValueChange={(v) => setFormData({ ...formData, soldier_id: v })}
                >
                  <SelectTrigger className="bg-white text-slate-800">
                    <SelectValue placeholder="בחר חייל" />
                  </SelectTrigger>
                  <SelectContent>
                    {soldiers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.full_name} ({s.personal_number})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-slate-700">תאריך הבקשה</Label>
                  <Input
                    type="date"
                    value={formData.request_date}
                    onChange={(e) => setFormData({ ...formData, request_date: e.target.value })}
                    className="bg-white text-slate-800"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700">תאריך יציאה *</Label>
                  <Input
                    type="date"
                    value={formData.exit_date}
                    onChange={(e) => setFormData({ ...formData, exit_date: e.target.value })}
                    className="bg-white text-slate-800"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-700">סוג בקשה *</Label>
                <Select
                  value={formData.request_type}
                  onValueChange={(v) => setFormData({ ...formData, request_type: v })}
                >
                  <SelectTrigger className="bg-white text-slate-800">
                    <SelectValue placeholder="בחר סוג בקשה" />
                  </SelectTrigger>
                  <SelectContent>
                    {REQUEST_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-700">סיבה / פירוט</Label>
                <Textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  placeholder="פירוט הבקשה..."
                  rows={3}
                  className="bg-white text-slate-800"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-700">סטטוס</Label>
                <Select
                  value={formData.status}
                  onValueChange={(v: any) => setFormData({ ...formData, status: v })}
                >
                  <SelectTrigger className="bg-white text-slate-800">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">ממתין</SelectItem>
                    <SelectItem value="approved">אושר</SelectItem>
                    <SelectItem value="rejected">נדחה</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.status !== "pending" && (
                <div className="space-y-2">
                  <Label className="text-slate-700">הערות החלטה</Label>
                  <Textarea
                    value={formData.decision_notes}
                    onChange={(e) => setFormData({ ...formData, decision_notes: e.target.value })}
                    placeholder="נימוק אישור / דחייה..."
                    rows={2}
                    className="bg-white text-slate-800"
                  />
                </div>
              )}
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
                ביטול
              </Button>
              <Button onClick={handleSubmit} className="bg-blue-600 hover:bg-blue-700 text-white">
                {editing ? "עדכן" : "הוסף"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <DialogContent dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-slate-800">אישור מחיקה</DialogTitle>
            </DialogHeader>
            <p className="text-slate-700">
              האם למחוק את הבקשה של {itemToDelete?.soldiers?.full_name}?
            </p>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>ביטול</Button>
              <Button variant="destructive" onClick={handleDelete}>מחק</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}