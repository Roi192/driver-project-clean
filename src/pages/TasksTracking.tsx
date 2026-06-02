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
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { format, addMonths, differenceInDays } from "date-fns";
import {
  ClipboardCheck,
  Plus,
  Edit,
  Trash2,
  Loader2,
  Search,
  CheckCircle2,
  Clock,
  CalendarDays,
  Users,
  ChevronLeft,
  Repeat,
} from "lucide-react";

interface Soldier { id: string; full_name: string; personal_number: string; }
interface Task {
  id: string;
  name: string;
  description: string | null;
  task_type: string;
  recurrence: string | null;
  target_audience: string;
  due_date: string | null;
  parent_task_id: string | null;
  is_active: boolean;
  created_at: string;
}
interface Completion { id: string; task_id: string; soldier_id: string; completed_at: string; notes: string | null; }

const RECURRENCE = [
  { value: "monthly", label: "חודשי", months: 1 },
  { value: "quarterly", label: "רבעוני", months: 3 },
  { value: "biannual", label: "חצי-שנתי", months: 6 },
  { value: "annual", label: "שנתי", months: 12 },
];

export default function TasksTracking() {
  const { isAdmin, isPlatoonCommander, loading: authLoading, user, brigade, isDivisionAdmin } = useAuth();
  const navigate = useNavigate();
  const hasAccess = isAdmin || isPlatoonCommander;

  const [tasks, setTasks] = useState<Task[]>([]);
  const [completions, setCompletions] = useState<Completion[]>([]);
  const [soldiers, setSoldiers] = useState<Soldier[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [openTask, setOpenTask] = useState<Task | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [form, setForm] = useState({
    name: "",
    description: "",
    task_type: "one_time",
    recurrence: "monthly",
    due_date: format(addMonths(new Date(), 1), "yyyy-MM-dd"),
  });

  useEffect(() => {
    if (!authLoading && !hasAccess) navigate("/");
  }, [authLoading, hasAccess, navigate]);

  useEffect(() => { if (hasAccess) loadData(); }, [hasAccess, brigade, isDivisionAdmin]);

  const loadData = async () => {
    setLoading(true);
    try {
      let tasksQuery = supabase.from("company_tasks").select("*").order("created_at", { ascending: false });
      let completionsQuery = supabase.from("task_completions").select("*");
      let soldiersQuery = supabase.from("soldiers").select("id, full_name, personal_number").eq("is_active", true).order("full_name");

      if (!isDivisionAdmin && brigade) {
        tasksQuery = tasksQuery.eq("brigade", brigade);
        completionsQuery = completionsQuery.eq("brigade", brigade);
        soldiersQuery = soldiersQuery.eq("brigade", brigade);
      }

      const [{ data: t, error: te }, { data: c, error: ce }, { data: s, error: se }] = await Promise.all([
        tasksQuery,
        completionsQuery,
        soldiersQuery,
      ]);
      if (te) throw te;
      if (ce) throw ce;
      if (se) throw se;
      setTasks((t || []) as Task[]);
      setCompletions((c || []) as Completion[]);
      setSoldiers(s || []);
      // Auto-rollover recurring tasks
      await checkRecurrence((t || []) as Task[]);
    } catch (e: any) {
      toast.error(`שגיאה בטעינה: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const checkRecurrence = async (allTasks: Task[]) => {
    const today = new Date();
    // For each recurring task, find latest occurrence in the chain
    const groups = new Map<string, Task[]>();
    allTasks.filter((t) => t.task_type === "recurring").forEach((t) => {
      const rootId = t.parent_task_id || t.id;
      const arr = groups.get(rootId) || [];
      arr.push(t);
      groups.set(rootId, arr);
    });
    const toCreate: any[] = [];
    for (const [, arr] of groups) {
      const sorted = arr.sort((a, b) => (a.due_date || "").localeCompare(b.due_date || ""));
      const latest = sorted[sorted.length - 1];
      if (!latest.due_date) continue;
      const dueDate = new Date(latest.due_date);
      if (dueDate >= today) continue;
      const rec = RECURRENCE.find((r) => r.value === latest.recurrence);
      if (!rec) continue;
      const nextDue = addMonths(dueDate, rec.months);
      toCreate.push({
        name: latest.name,
        description: latest.description,
        task_type: "recurring",
        recurrence: latest.recurrence,
        target_audience: latest.target_audience,
        due_date: format(nextDue, "yyyy-MM-dd"),
        parent_task_id: latest.parent_task_id || latest.id,
        created_by: user?.id,
        brigade: brigade || "binyamin",
      });
    }
    if (toCreate.length) {
      const { error } = await supabase.from("company_tasks").insert(toCreate);
      if (!error) {
        const { data: t } = await supabase.from("company_tasks").select("*").order("created_at", { ascending: false });
        setTasks((t || []) as Task[]);
      }
    }
  };

  const completionsByTask = useMemo(() => {
    const m = new Map<string, Completion[]>();
    completions.forEach((c) => {
      const arr = m.get(c.task_id) || [];
      arr.push(c);
      m.set(c.task_id, arr);
    });
    return m;
  }, [completions]);

  const taskProgress = (t: Task) => {
    const done = completionsByTask.get(t.id)?.length || 0;
    const total = soldiers.length;
    const pct = total ? Math.round((done / total) * 100) : 0;
    const overdue = t.due_date && new Date(t.due_date) < new Date() && pct < 100;
    return { done, total, pct, overdue };
  };

  const filteredTasks = useMemo(() => {
    if (!search) return tasks;
    const q = search.toLowerCase();
    return tasks.filter((t) => t.name.toLowerCase().includes(q));
  }, [tasks, search]);

  const openAdd = () => {
    setEditing(null);
    setForm({
      name: "", description: "", task_type: "one_time",
      recurrence: "monthly",
      due_date: format(addMonths(new Date(), 1), "yyyy-MM-dd"),
    });
    setDialogOpen(true);
  };

  const openEdit = (t: Task) => {
    setEditing(t);
    setForm({
      name: t.name,
      description: t.description || "",
      task_type: t.task_type,
      recurrence: t.recurrence || "monthly",
      due_date: t.due_date || format(addMonths(new Date(), 1), "yyyy-MM-dd"),
    });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) {
      toast.error("יש להזין שם משימה");
      return;
    }
    try {
      const payload: any = {
        name: form.name.trim(),
        description: form.description || null,
        task_type: form.task_type,
        recurrence: form.task_type === "recurring" ? form.recurrence : null,
        target_audience: "all",
        due_date: form.due_date || null,
        brigade: brigade || "binyamin",
      };
      if (editing) {
        const { error } = await supabase.from("company_tasks").update(payload).eq("id", editing.id);
        if (error) throw error;
        toast.success("המשימה עודכנה");
      } else {
        payload.created_by = user?.id;
        const { error } = await supabase.from("company_tasks").insert(payload);
        if (error) throw error;
        toast.success("המשימה נוצרה");
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
      const { error } = await supabase.from("company_tasks").delete().eq("id", deleteId);
      if (error) throw error;
      toast.success("המשימה נמחקה");
      setDeleteId(null);
      loadData();
    } catch (e: any) {
      toast.error(`שגיאה במחיקה: ${e.message}`);
    }
  };

  const toggleCompletion = async (taskId: string, soldierId: string, isDone: boolean) => {
    try {
      if (isDone) {
        const { error } = await supabase.from("task_completions").delete().eq("task_id", taskId).eq("soldier_id", soldierId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("task_completions").insert({
          task_id: taskId, soldier_id: soldierId, completed_by: user?.id, brigade: brigade || "binyamin",
        });
        if (error) throw error;
      }
      let completionsQuery = supabase.from("task_completions").select("*");
      if (!isDivisionAdmin && brigade) completionsQuery = completionsQuery.eq("brigade", brigade);
      const { data: c } = await completionsQuery;
      setCompletions((c || []) as Completion[]);
    } catch (e: any) {
      toast.error(`שגיאה: ${e.message}`);
    }
  };

  const markAll = async (taskId: string) => {
    const done = new Set((completionsByTask.get(taskId) || []).map((c) => c.soldier_id));
    const missing = soldiers.filter((s) => !done.has(s.id));
    if (!missing.length) return;
    try {
      const { error } = await supabase.from("task_completions").insert(
        missing.map((s) => ({ task_id: taskId, soldier_id: s.id, completed_by: user?.id, brigade: brigade || "binyamin" }))
      );
      if (error) throw error;
      toast.success(`סומנו ${missing.length} חיילים`);
      let completionsQuery = supabase.from("task_completions").select("*");
      if (!isDivisionAdmin && brigade) completionsQuery = completionsQuery.eq("brigade", brigade);
      const { data: c } = await completionsQuery;
      setCompletions((c || []) as Completion[]);
    } catch (e: any) {
      toast.error(`שגיאה: ${e.message}`);
    }
  };

  if (authLoading) {
    return <AppLayout><div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-slate-700" /></div></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
              <ClipboardCheck className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">מעקב משימות</h1>
              <p className="text-sm text-slate-600">ניהול ראיונות, סקרים ומשימות פלוגתיות</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <Button onClick={openAdd} className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
            <Plus className="w-4 h-4 ml-1" /> משימה חדשה
          </Button>
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input placeholder="חיפוש משימה" value={search} onChange={(e) => setSearch(e.target.value)} className="pr-9" />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-slate-700" /></div>
        ) : filteredTasks.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-slate-600">אין משימות להצגה</CardContent></Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredTasks.map((t) => {
              const { done, total, pct, overdue } = taskProgress(t);
              const daysLeft = t.due_date ? differenceInDays(new Date(t.due_date), new Date()) : null;
              const barColor = pct === 100 ? "from-emerald-500 to-green-600" : overdue ? "from-red-500 to-rose-600" : "from-blue-500 to-indigo-600";
              return (
                <Card key={t.id} className={`border-2 ${overdue ? "border-red-300 bg-red-50/30" : pct === 100 ? "border-emerald-300 bg-emerald-50/30" : "border-slate-200"}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-slate-800 text-base">{t.name}</h3>
                        {t.description && <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">{t.description}</p>}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(t)}><Edit className="w-4 h-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => setDeleteId(t.id)} className="text-red-600"><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      {t.task_type === "recurring" ? (
                        <Badge className="bg-purple-100 text-purple-700 border-purple-300"><Repeat className="w-3 h-3 ml-1" />{RECURRENCE.find((r) => r.value === t.recurrence)?.label || "חזרתי"}</Badge>
                      ) : (
                        <Badge className="bg-slate-100 text-slate-700 border-slate-300">חד-פעמי</Badge>
                      )}
                      {t.due_date && (
                        <Badge variant="outline" className={overdue ? "text-red-700 border-red-300" : "text-slate-700 border-slate-300"}>
                          <CalendarDays className="w-3 h-3 ml-1" />
                          {format(new Date(t.due_date), "dd/MM/yyyy")}
                          {daysLeft !== null && daysLeft >= 0 && <span className="mr-1">• עוד {daysLeft} ימים</span>}
                          {daysLeft !== null && daysLeft < 0 && <span className="mr-1">• פיגור {Math.abs(daysLeft)} ימים</span>}
                        </Badge>
                      )}
                    </div>
                    <div className="mb-2">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-700 font-semibold">{done}/{total} בוצעו</span>
                        <span className="text-slate-700">{pct}%</span>
                      </div>
                      <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div className={`h-full bg-gradient-to-r ${barColor}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <Button onClick={() => setOpenTask(t)} variant="outline" className="w-full">
                      פתח רשימת חיילים <ChevronLeft className="w-4 h-4 mr-1" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Task Detail Dialog */}
        <Dialog open={!!openTask} onOpenChange={(o) => !o && setOpenTask(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="text-slate-800">{openTask?.name}</DialogTitle>
            </DialogHeader>
            {openTask && (() => {
              const done = new Set((completionsByTask.get(openTask.id) || []).map((c) => c.soldier_id));
              const completed = soldiers.filter((s) => done.has(s.id));
              const pending = soldiers.filter((s) => !done.has(s.id));
              const pct = soldiers.length ? Math.round((completed.length / soldiers.length) * 100) : 0;
              return (
                <div className="flex-1 overflow-hidden flex flex-col">
                  <div className="mb-3">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-bold text-slate-800">{completed.length}/{soldiers.length} ביצעו ({pct}%)</span>
                      <Button size="sm" variant="outline" onClick={() => markAll(openTask.id)} disabled={pending.length === 0}>
                        סמן הכל
                      </Button>
                    </div>
                    <Progress value={pct} className="h-2" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1 overflow-hidden">
                    {/* Pending */}
                    <div className="flex flex-col overflow-hidden">
                      <h4 className="text-sm font-bold text-amber-700 mb-2 flex items-center gap-1">
                        <Clock className="w-4 h-4" /> ממתינים ({pending.length})
                      </h4>
                      <div className="overflow-y-auto space-y-1 border border-amber-200 rounded-lg p-2 bg-amber-50/30">
                        {pending.length === 0 && <p className="text-xs text-slate-600 text-center py-2">כולם ביצעו 🎉</p>}
                        {pending.map((s) => (
                          <button
                            key={s.id}
                            onClick={() => toggleCompletion(openTask.id, s.id, false)}
                            className="w-full flex items-center justify-between px-2 py-2 bg-white rounded border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50 text-right transition-colors"
                          >
                            <span className="text-sm text-slate-800">{s.full_name}</span>
                            <CheckCircle2 className="w-4 h-4 text-slate-400" />
                          </button>
                        ))}
                      </div>
                    </div>
                    {/* Completed */}
                    <div className="flex flex-col overflow-hidden">
                      <h4 className="text-sm font-bold text-emerald-700 mb-2 flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> בוצעו ({completed.length})
                      </h4>
                      <div className="overflow-y-auto space-y-1 border border-emerald-200 rounded-lg p-2 bg-emerald-50/30">
                        {completed.length === 0 && <p className="text-xs text-slate-600 text-center py-2">עדיין אין</p>}
                        {completed.map((s) => (
                          <button
                            key={s.id}
                            onClick={() => toggleCompletion(openTask.id, s.id, true)}
                            className="w-full flex items-center justify-between px-2 py-2 bg-white rounded border border-emerald-200 hover:border-red-400 hover:bg-red-50 text-right transition-colors"
                          >
                            <span className="text-sm text-slate-800">{s.full_name}</span>
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenTask(null)}>סגור</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add/Edit */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-slate-800">{editing ? "עריכת משימה" : "משימה חדשה"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>שם המשימה *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="לדוגמא: ראיון תקופתי" />
              </div>
              <div>
                <Label>תיאור</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
              </div>
              <div>
                <Label>סוג משימה</Label>
                <Select value={form.task_type} onValueChange={(v) => setForm({ ...form, task_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="one_time">חד-פעמי</SelectItem>
                    <SelectItem value="recurring">חזרתי</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.task_type === "recurring" && (
                <div>
                  <Label>תדירות</Label>
                  <Select value={form.recurrence} onValueChange={(v) => setForm({ ...form, recurrence: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {RECURRENCE.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label>תאריך יעד</Label>
                <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 p-2 rounded">
                <Users className="w-4 h-4" /> המשימה תעקוב אחרי כל החיילים הפעילים ({soldiers.length})
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>ביטול</Button>
              <Button onClick={save} className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white">שמור</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle className="text-slate-800">מחיקת משימה</DialogTitle></DialogHeader>
            <p className="text-slate-700">המחיקה תסיר את המשימה ואת כל סימוני הביצוע שלה. להמשיך?</p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteId(null)}>ביטול</Button>
              <Button variant="destructive" onClick={confirmDelete}>מחק</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}