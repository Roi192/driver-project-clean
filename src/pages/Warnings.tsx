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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  AlertTriangle,
  Plus,
  Edit,
  Trash2,
  Loader2,
  FileSpreadsheet,
  Search,
  Users,
  ListChecks,
  BarChart3,
  ShieldAlert,
  Settings,
  X,
  CheckCircle2,
  Clock,
} from "lucide-react";
import * as XLSX from "xlsx";

interface Soldier { id: string; full_name: string; personal_number: string; }
interface Category { id: string; name: string; sort_order: number; }
interface Warning {
  id: string;
  soldier_id: string;
  category: string;
  event_date: string;
  action_taken: string | null;
  description: string | null;
  created_at: string;
  soldier_signature?: string | null;
  signed_at?: string | null;
  soldiers?: Soldier;
}

const ACTIONS = ["שיחת אזהרה", "שיחת בירור", "רישום בלבד", "הפניה לענישה"];


export default function Warnings() {
  const { isAdmin, isPlatoonCommander, loading: authLoading, user, brigade, isDivisionAdmin } = useAuth();
  const navigate = useNavigate();
  const hasAccess = isAdmin || isPlatoonCommander;

  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [soldiers, setSoldiers] = useState<Soldier[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Warning | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");

  const [form, setForm] = useState({
    soldier_id: "",
    category: "",
    event_date: format(new Date(), "yyyy-MM-dd"),
    action_taken: "שיחת אזהרה",
    description: "",
  });

  useEffect(() => {
    if (!authLoading && !hasAccess) navigate("/");
  }, [authLoading, hasAccess, navigate]);

  useEffect(() => {
    if (hasAccess) loadData();
  }, [hasAccess, brigade, isDivisionAdmin]);

  const loadData = async () => {
    setLoading(true);
    try {
      let warningsQuery = supabase.from("soldier_warnings").select("*").order("event_date", { ascending: false });
      let soldiersQuery = supabase.from("soldiers").select("id, full_name, personal_number").eq("is_active", true).order("full_name");
      let categoriesQuery = supabase.from("warning_categories" as any).select("*").order("sort_order").order("name");

      if (!isDivisionAdmin && brigade) {
        warningsQuery = warningsQuery.eq("brigade", brigade);
        soldiersQuery = soldiersQuery.eq("brigade", brigade);
        categoriesQuery = categoriesQuery.eq("brigade", brigade);
      }

      const [{ data: w, error: we }, { data: s, error: se }, { data: c, error: ce }] = await Promise.all([
        warningsQuery,
        soldiersQuery,
        categoriesQuery,
      ]);
      if (we) throw we;
      if (se) throw se;
      if (ce) throw ce;
      const soldierMap = new Map((s || []).map((x) => [x.id, x]));
      // also fetch released soldiers referenced by warnings, in case
      const missing = Array.from(new Set((w || []).map((x: any) => x.soldier_id).filter((id: string) => !soldierMap.has(id))));
      if (missing.length) {
        const { data: extra } = await supabase.from("soldiers").select("id, full_name, personal_number").in("id", missing);
        (extra || []).forEach((x) => soldierMap.set(x.id, x));
      }
      const enriched = (w || []).map((x: any) => ({ ...x, soldiers: soldierMap.get(x.soldier_id) })) as Warning[];
      setWarnings(enriched);
      setSoldiers(s || []);
      setCategories(((c as any) || []) as Category[]);
    } catch (e: any) {
      toast.error(`שגיאה בטעינה: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const addCategory = async () => {
    const name = newCatName.trim();
    if (!name) return;
    const maxOrder = categories.reduce((m, c) => Math.max(m, c.sort_order), 0);
    const { error } = await supabase.from("warning_categories" as any).insert({ name, sort_order: maxOrder + 1, created_by: user?.id, brigade: brigade || "binyamin" });
    if (error) { toast.error(`שגיאה בהוספה: ${error.message}`); return; }
    setNewCatName("");
    toast.success("נושא נוסף");
    loadData();
  };

  const deleteCategory = async (id: string) => {
    const { error } = await supabase.from("warning_categories" as any).delete().eq("id", id);
    if (error) { toast.error(`שגיאה במחיקה: ${error.message}`); return; }
    toast.success("נושא נמחק");
    loadData();
  };

  const filtered = useMemo(() => {
    return warnings.filter((w) => {
      if (categoryFilter !== "all" && w.category !== categoryFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const name = w.soldiers?.full_name?.toLowerCase() || "";
        const num = w.soldiers?.personal_number?.toLowerCase() || "";
        if (!name.includes(q) && !num.includes(q) && !w.category.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [warnings, search, categoryFilter]);

  // Count repeats per (soldier, category)
  const repeatMap = useMemo(() => {
    const m = new Map<string, number>();
    warnings.forEach((w) => {
      const k = `${w.soldier_id}|${w.category}`;
      m.set(k, (m.get(k) || 0) + 1);
    });
    return m;
  }, [warnings]);

  // Repeat detection for current form
  const formRepeat = useMemo(() => {
    if (!form.soldier_id || !form.category) return 0;
    const k = `${form.soldier_id}|${form.category}`;
    let count = repeatMap.get(k) || 0;
    // If editing, exclude current item
    if (editing && editing.soldier_id === form.soldier_id && editing.category === form.category) count--;
    return Math.max(0, count);
  }, [form.soldier_id, form.category, repeatMap, editing]);

  const bySoldier = useMemo(() => {
    const groups = new Map<string, { soldier: Soldier; items: Warning[] }>();
    warnings.forEach((w) => {
      if (!w.soldiers) return;
      const g = groups.get(w.soldier_id) || { soldier: w.soldiers, items: [] };
      g.items.push(w);
      groups.set(w.soldier_id, g);
    });
    return Array.from(groups.values()).sort((a, b) => b.items.length - a.items.length);
  }, [warnings]);

  const stats = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonth = warnings.filter((w) => new Date(w.event_date) >= monthStart).length;
    const repeatOffenders = bySoldier.filter((g) => g.items.length >= 2).length;
    const byCat: Record<string, number> = {};
    warnings.forEach((w) => { byCat[w.category] = (byCat[w.category] || 0) + 1; });
    const topCats = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
    return { total: warnings.length, thisMonth, repeatOffenders, topCats };
  }, [warnings, bySoldier]);

  const openAdd = () => {
    setEditing(null);
    setForm({
      soldier_id: "", category: "",
      event_date: format(new Date(), "yyyy-MM-dd"),
      action_taken: "שיחת אזהרה", description: "",
    });
    setDialogOpen(true);
  };

  const openEdit = (w: Warning) => {
    setEditing(w);
    setForm({
      soldier_id: w.soldier_id,
      category: w.category,
      event_date: w.event_date,
      action_taken: w.action_taken || "שיחת אזהרה",
      description: w.description || "",
    });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!form.soldier_id || !form.category) {
      toast.error("יש לבחור חייל ונושא");
      return;
    }
    try {
      if (editing) {
        const { error } = await supabase.from("soldier_warnings").update({
          soldier_id: form.soldier_id,
          category: form.category,
          event_date: form.event_date,
          action_taken: form.action_taken,
          description: form.description || null,
        }).eq("id", editing.id);
        if (error) throw error;
        toast.success("האזהרה עודכנה");
      } else {
        const { error } = await supabase.from("soldier_warnings").insert({
          soldier_id: form.soldier_id,
          category: form.category,
          event_date: form.event_date,
          action_taken: form.action_taken,
          description: form.description || null,
          created_by: user?.id,
          brigade: brigade || "binyamin",
        });
        if (error) throw error;
        toast.success("האזהרה נוספה");
      }
      setDialogOpen(false);
      loadData();
    } catch (e: any) {
      toast.error(`שגיאה בשמירה: ${e.message}`);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      const { error } = await supabase.from("soldier_warnings").delete().eq("id", deleteId);
      if (error) throw error;
      toast.success("האזהרה נמחקה");
      setDeleteId(null);
      loadData();
    } catch (e: any) {
      toast.error(`שגיאה במחיקה: ${e.message}`);
    }
  };

  const exportXlsx = () => {
    const rows = filtered.map((w) => ({
      "תאריך": w.event_date,
      "חייל": w.soldiers?.full_name || "",
      "מספר אישי": w.soldiers?.personal_number || "",
      "נושא": w.category,
      "אמצעי": w.action_taken || "",
      "תיאור": w.description || "",
      "מספר אזהרות באותו נושא": repeatMap.get(`${w.soldier_id}|${w.category}`) || 1,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "אזהרות");
    XLSX.writeFile(wb, `אזהרות-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
  };

  if (authLoading) {
    return <AppLayout><div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-slate-700" /></div></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center shadow-lg">
              <ShieldAlert className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">אזהרות וענישה</h1>
              <p className="text-sm text-slate-600">תיעוד שיחות אזהרה ומעקב עבירות חוזרות</p>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <Card className="border-slate-200">
            <CardContent className="p-4">
              <div className="text-xs text-slate-600 font-semibold">סה״כ אזהרות</div>
              <div className="text-2xl font-bold text-slate-800">{stats.total}</div>
            </CardContent>
          </Card>
          <Card className="border-blue-200 bg-blue-50/50">
            <CardContent className="p-4">
              <div className="text-xs text-blue-700 font-semibold">החודש</div>
              <div className="text-2xl font-bold text-blue-800">{stats.thisMonth}</div>
            </CardContent>
          </Card>
          <Card className="border-red-200 bg-red-50/50">
            <CardContent className="p-4">
              <div className="text-xs text-red-700 font-semibold">חיילים עם 2+ אזהרות</div>
              <div className="text-2xl font-bold text-red-800">{stats.repeatOffenders}</div>
            </CardContent>
          </Card>
          <Card className="border-emerald-200 bg-emerald-50/50">
            <CardContent className="p-4">
              <div className="text-xs text-emerald-700 font-semibold">נושאים שונים</div>
              <div className="text-2xl font-bold text-emerald-800">{stats.topCats.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <Button onClick={openAdd} className="bg-gradient-to-r from-red-500 to-orange-600 text-white">
            <Plus className="w-4 h-4 ml-1" /> אזהרה חדשה
          </Button>
          <Button onClick={exportXlsx} variant="outline">
            <FileSpreadsheet className="w-4 h-4 ml-1" /> ייצוא לאקסל
          </Button>
          <Button onClick={() => setCatDialogOpen(true)} variant="outline">
            <Settings className="w-4 h-4 ml-1" /> ניהול נושאים
          </Button>
        </div>

        <Tabs defaultValue="list">
          <TabsList className="grid grid-cols-3 w-full mb-4">
            <TabsTrigger value="list"><ListChecks className="w-4 h-4 ml-1" />רשימה</TabsTrigger>
            <TabsTrigger value="bySoldier"><Users className="w-4 h-4 ml-1" />לפי חייל</TabsTrigger>
            <TabsTrigger value="dashboard"><BarChart3 className="w-4 h-4 ml-1" />דשבורד</TabsTrigger>
          </TabsList>

          {/* List */}
          <TabsContent value="list">
            <div className="bg-white border border-slate-200 rounded-xl p-3 mb-3 shadow-sm">
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <Input placeholder="חיפוש לפי חייל / נושא" value={search} onChange={(e) => setSearch(e.target.value)} className="pr-9 text-slate-900 font-semibold placeholder:font-normal" />
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-full sm:w-56 text-slate-900 font-semibold"><SelectValue placeholder="נושא" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל הנושאים</SelectItem>
                  {categories.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-slate-700" /></div>
            ) : filtered.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-slate-600">אין אזהרות להצגה</CardContent></Card>
            ) : (
              <div className="space-y-2">
                {filtered.map((w) => {
                  const repeats = repeatMap.get(`${w.soldier_id}|${w.category}`) || 1;
                  const isSigned = !!w.signed_at;
                  return (
                    <Card key={w.id} className={repeats >= 2 ? "border-red-300 bg-red-50/20" : "border-slate-200"}>
                      <CardContent className="p-2">
                        <div className="bg-white rounded-lg p-3 border border-slate-100">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-slate-900 text-base">{w.soldiers?.full_name || "—"}</span>
                                <span className="text-xs text-slate-600 font-semibold">{w.soldiers?.personal_number}</span>
                                {repeats >= 2 && (
                                  <Badge className="bg-red-600 text-white text-xs">חוזר {repeats} פעמים</Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                <Badge variant="outline" className="text-slate-900 border-slate-300 font-bold text-xs bg-white">{w.category}</Badge>
                                <span className="text-sm text-slate-900 font-bold">{format(new Date(w.event_date), "dd/MM/yyyy")}</span>
                                {w.action_taken && <span className="text-xs text-slate-700 font-medium">• {w.action_taken}</span>}
                              </div>
                              {w.description && <p className="text-sm text-slate-800 mt-2 line-clamp-2 font-medium leading-relaxed">{w.description}</p>}
                            </div>
                            <div className="flex flex-col items-end gap-1.5 shrink-0">
                              {isSigned ? (
                                <Badge className="bg-emerald-600 text-white gap-1 text-xs">
                                  <CheckCircle2 className="w-3 h-3" /> נחתם
                                </Badge>
                              ) : (
                                <Badge className="bg-amber-500 text-white gap-1 text-xs animate-pulse">
                                  <Clock className="w-3 h-3" /> טרם נחתם
                                </Badge>
                              )}
                              <div className="flex gap-1">
                                <Button size="icon" variant="ghost" onClick={() => openEdit(w)}><Edit className="w-4 h-4" /></Button>
                                <Button size="icon" variant="ghost" onClick={() => setDeleteId(w.id)} className="text-red-600 hover:text-red-700"><Trash2 className="w-4 h-4" /></Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* By Soldier */}
          <TabsContent value="bySoldier">
            {bySoldier.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-slate-600">אין נתונים</CardContent></Card>
            ) : (
              <div className="space-y-2">
                {bySoldier.map((g) => (
                  <Card key={g.soldier.id} className={g.items.length >= 2 ? "border-red-300 bg-red-50/40" : "border-slate-200"}>
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <span className="font-bold text-slate-800">{g.soldier.full_name}</span>
                          <span className="text-xs text-slate-600 mr-2">{g.soldier.personal_number}</span>
                        </div>
                        <Badge className={g.items.length >= 2 ? "bg-red-600 text-white" : "bg-slate-200 text-slate-800"}>
                          {g.items.length} אזהרות
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {g.items.map((it) => (
                          <span
                            key={it.id}
                            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-slate-50 px-2 py-1 text-xs"
                          >
                            <span className="font-bold text-slate-900">{it.category}</span>
                            <span className="text-slate-400">•</span>
                            <span className="font-semibold text-slate-800">{format(new Date(it.event_date), "dd/MM/yyyy")}</span>
                          </span>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Dashboard */}
          <TabsContent value="dashboard">
            <Card>
              <CardHeader><CardTitle className="text-slate-800">פילוח לפי נושא</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {stats.topCats.length === 0 ? <p className="text-slate-600">אין נתונים</p> : stats.topCats.map(([cat, count]) => {
                  const pct = stats.total ? Math.round((count / stats.total) * 100) : 0;
                  return (
                    <div key={cat}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-800 font-semibold">{cat}</span>
                        <span className="text-slate-700">{count} ({pct}%)</span>
                      </div>
                      <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-red-500 to-orange-500" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Add/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-slate-800">{editing ? "עריכת אזהרה" : "אזהרה חדשה"}</DialogTitle>
            </DialogHeader>

            {formRepeat >= 1 && (
              <div className="border-2 border-red-400 bg-red-50 rounded-lg p-3 flex gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
                <div className="text-sm text-red-800">
                  <strong>אזהרה חוזרת!</strong> לחייל זה כבר {formRepeat} אזהרות על נושא זה. שקול מעבר לענישה.
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <Label>חייל *</Label>
                <Select value={form.soldier_id} onValueChange={(v) => setForm({ ...form, soldier_id: v })}>
                  <SelectTrigger><SelectValue placeholder="בחר חייל" /></SelectTrigger>
                  <SelectContent className="max-h-72">
                    {soldiers.map((s) => <SelectItem key={s.id} value={s.id}>{s.full_name} ({s.personal_number})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>נושא *</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue placeholder="בחר נושא" /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>תאריך</Label>
                <Input type="date" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} />
              </div>
              <div>
                <Label>אמצעי שננקט</Label>
                <Select value={form.action_taken} onValueChange={(v) => setForm({ ...form, action_taken: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ACTIONS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>תיאור</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} placeholder="פרטי האירוע..." />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>ביטול</Button>
              <Button onClick={save} className="bg-gradient-to-r from-red-500 to-orange-600 text-white">שמור</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete confirm */}
        <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle className="text-slate-800">מחיקת אזהרה</DialogTitle></DialogHeader>
            <p className="text-slate-700">האם למחוק את האזהרה? פעולה זו אינה הפיכה.</p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteId(null)}>ביטול</Button>
              <Button variant="destructive" onClick={confirmDelete}>מחק</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={catDialogOpen} onOpenChange={setCatDialogOpen}>
          <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-slate-800">ניהול נושאי אזהרה</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="שם נושא חדש"
                  onKeyDown={(e) => { if (e.key === "Enter") addCategory(); }}
                />
                <Button onClick={addCategory} className="shrink-0">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="space-y-1.5 max-h-[50vh] overflow-y-auto">
                {categories.length === 0 ? (
                  <p className="text-center text-slate-500 py-4">אין נושאים</p>
                ) : categories.map((c) => (
                  <div key={c.id} className="flex items-center justify-between border border-slate-200 rounded-lg px-3 py-2 bg-white">
                    <span className="text-slate-800 font-medium">{c.name}</span>
                    <Button size="icon" variant="ghost" onClick={() => deleteCategory(c.id)} className="text-red-600 hover:text-red-700 h-8 w-8">
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCatDialogOpen(false)}>סגור</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}