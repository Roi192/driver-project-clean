import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { format, isPast, isToday, differenceInDays } from "date-fns";
import { he } from "date-fns/locale";
import * as XLSX from "xlsx";
import { 
  ClipboardCheck, 
  Plus, 
  Loader2,
  Edit,
  Trash2,
  Clock,
  User,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Download,
  MessageSquare
} from "lucide-react";
import unitLogo from "@/assets/unit-logo.png";

interface BomTask {
  id: string;
  title: string;
  description: string | null;
  assigned_to: string;
  due_date: string;
  status: "pending" | "in_progress" | "completed";
  notes: string | null;
  created_at: string;
}

const statusColors = {
  pending: "bg-amber-500",
  in_progress: "bg-blue-500",
  completed: "bg-emerald-500",
};

const statusLabels = {
  pending: "לא בוצע",
  in_progress: "בתהליך",
  completed: "בוצע",
};

const statusIcons = {
  pending: XCircle,
  in_progress: Clock,
  completed: CheckCircle2,
};

export default function BomReport() {
  const { isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<BomTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<BomTask | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<BomTask | null>(null);
  const [activeTab, setActiveTab] = useState("all");

  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    assigned_to: string;
    due_date: string;
    status: "pending" | "in_progress" | "completed";
    notes: string;
  }>({
    title: "",
    description: "",
    assigned_to: "",
    due_date: "",
    status: "pending",
    notes: "",
  });

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      navigate("/");
    }
  }, [isAdmin, authLoading, navigate]);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("bom_tasks")
      .select("*")
      .order("due_date", { ascending: true });

    if (error) {
      console.error("Error fetching tasks:", error);
      toast.error("שגיאה בטעינת המשימות");
    } else {
      setTasks((data || []) as BomTask[]);
    }
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.assigned_to || !formData.due_date) {
      toast.error("יש למלא כותרת, אחראי ותג\"ב");
      return;
    }

    const taskData = {
      title: formData.title,
      description: formData.description || null,
      assigned_to: formData.assigned_to,
      due_date: formData.due_date,
      status: formData.status,
      notes: formData.notes || null,
    };

    if (editingTask) {
      const { error } = await supabase
        .from("bom_tasks")
        .update(taskData)
        .eq("id", editingTask.id);

      if (error) {
        toast.error("שגיאה בעדכון המשימה");
      } else {
        toast.success("המשימה עודכנה בהצלחה");
        fetchTasks();
      }
    } else {
      const { error } = await supabase
        .from("bom_tasks")
        .insert(taskData);

      if (error) {
        toast.error("שגיאה ביצירת המשימה");
      } else {
        toast.success("המשימה נוצרה בהצלחה");
        fetchTasks();
      }
    }

    setDialogOpen(false);
    resetForm();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from("bom_tasks")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("שגיאה במחיקת המשימה");
    } else {
      toast.success("המשימה נמחקה בהצלחה");
      fetchTasks();
      setDetailDialogOpen(false);
    }
  };

  const handleQuickStatusUpdate = async (task: BomTask, newStatus: string) => {
    const { error } = await supabase
      .from("bom_tasks")
      .update({ status: newStatus })
      .eq("id", task.id);

    if (error) {
      toast.error("שגיאה בעדכון הסטטוס");
    } else {
      toast.success("הסטטוס עודכן");
      fetchTasks();
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      assigned_to: "",
      due_date: "",
      status: "pending",
      notes: "",
    });
    setEditingTask(null);
  };

  const openEditDialog = (task: BomTask) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description || "",
      assigned_to: task.assigned_to,
      due_date: task.due_date,
      status: task.status,
      notes: task.notes || "",
    });
    setDialogOpen(true);
    setDetailDialogOpen(false);
  };

  const handleExportToExcel = () => {
    try {
      if (tasks.length === 0) {
        toast.error("אין משימות לייצוא");
        return;
      }

      const exportData = tasks.map(task => ({
        "משימה": task.title,
        "תיאור": task.description || "",
        "אחראי": task.assigned_to,
        "תג\"ב": format(new Date(task.due_date), "dd/MM/yyyy"),
        "סטטוס": statusLabels[task.status],
        "הערות": task.notes || "",
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      ws["!cols"] = [{ wch: 25 }, { wch: 30 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 30 }];
      
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "דוח בו\"מ");
      
      const fileName = `דוח_בום_${format(new Date(), "yyyy-MM-dd")}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      toast.success("הקובץ יוצא בהצלחה");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("שגיאה בייצוא הקובץ");
    }
  };

  const getFilteredTasks = () => {
    switch (activeTab) {
      case "pending":
        return tasks.filter(t => t.status === "pending");
      case "in_progress":
        return tasks.filter(t => t.status === "in_progress");
      case "completed":
        return tasks.filter(t => t.status === "completed");
      case "overdue":
        return tasks.filter(t => isPast(new Date(t.due_date)) && t.status !== "completed");
      default:
        return tasks;
    }
  };

  const getTaskUrgency = (task: BomTask) => {
    if (task.status === "completed") return "none";
    const daysUntil = differenceInDays(new Date(task.due_date), new Date());
    if (daysUntil < 0) return "overdue";
    if (daysUntil <= 3) return "urgent";
    if (daysUntil <= 7) return "soon";
    return "normal";
  };

  const stats = {
    total: tasks.length,
    completed: tasks.filter(t => t.status === "completed").length,
    pending: tasks.filter(t => t.status === "pending").length,
    inProgress: tasks.filter(t => t.status === "in_progress").length,
    overdue: tasks.filter(t => isPast(new Date(t.due_date)) && t.status !== "completed").length,
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
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gold/20 border border-gold/30 mb-4">
              <ClipboardCheck className="w-4 h-4 text-gold" />
              <span className="text-sm font-bold text-gold">בקרה ומעקב</span>
            </div>
            <h1 className="text-2xl font-black text-white mb-2">דו"ח בו"מ</h1>
            <p className="text-slate-400 text-sm">ניהול משימות ומעקב ביצוע</p>
          </div>
        </div>

        <div className="px-4 py-6 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-50 to-emerald-100">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-black text-emerald-700">{stats.completed}</p>
                  <p className="text-xs text-emerald-600">בוצעו</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-gradient-to-br from-amber-50 to-amber-100">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-amber-500 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-black text-amber-700">{stats.pending + stats.inProgress}</p>
                  <p className="text-xs text-amber-600">בהמתנה</p>
                </div>
              </CardContent>
            </Card>

            {stats.overdue > 0 && (
              <Card className="col-span-2 border-0 shadow-lg bg-gradient-to-br from-red-50 to-red-100">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-red-500 flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-2xl font-black text-red-700">{stats.overdue}</p>
                    <p className="text-xs text-red-600">משימות באיחור!</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              onClick={() => { resetForm(); setDialogOpen(true); }}
              className="flex-1 bg-gradient-to-r from-primary to-teal text-white py-6 rounded-2xl shadow-lg"
            >
              <Plus className="w-5 h-5 ml-2" />
              הוסף משימה
            </Button>
            <Button
              onClick={handleExportToExcel}
              variant="outline"
              className="py-6 rounded-2xl"
            >
              <Download className="w-5 h-5" />
            </Button>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full grid grid-cols-5 h-auto p-1 bg-slate-100 rounded-2xl">
              <TabsTrigger value="all" className="rounded-xl py-2 text-xs">הכל</TabsTrigger>
              <TabsTrigger value="pending" className="rounded-xl py-2 text-xs">ממתין</TabsTrigger>
              <TabsTrigger value="in_progress" className="rounded-xl py-2 text-xs">בתהליך</TabsTrigger>
              <TabsTrigger value="completed" className="rounded-xl py-2 text-xs">בוצע</TabsTrigger>
              <TabsTrigger value="overdue" className="rounded-xl py-2 text-xs text-red-600">באיחור</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Tasks List */}
          <Card className="border-0 shadow-xl bg-white/90 backdrop-blur rounded-3xl">
            <CardContent className="p-4">
              <ScrollArea className="h-[calc(100vh-420px)] min-h-[300px]">
                <div className="space-y-3">
                  {getFilteredTasks().length === 0 ? (
                    <div className="text-center py-12 text-slate-500">
                      <ClipboardCheck className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>אין משימות</p>
                    </div>
                  ) : (
                    getFilteredTasks().map(task => {
                      const urgency = getTaskUrgency(task);
                      const StatusIcon = statusIcons[task.status];

                      return (
                        <div
                          key={task.id}
                          onClick={() => { setSelectedTask(task); setDetailDialogOpen(true); }}
                          className={`
                            p-4 rounded-2xl border cursor-pointer transition-all
                            ${urgency === "overdue" ? "bg-red-50 border-red-200" : "bg-slate-50 border-slate-200 hover:bg-slate-100"}
                          `}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`w-10 h-10 rounded-xl ${statusColors[task.status]} flex items-center justify-center`}>
                              <StatusIcon className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-bold text-slate-800">{task.title}</h4>
                                {urgency === "overdue" && (
                                  <Badge className="bg-red-500 text-white text-xs">באיחור!</Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-sm text-slate-500">
                                <span className="flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  {task.assigned_to}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {format(new Date(task.due_date), "dd/MM/yyyy")}
                                </span>
                              </div>
                              {task.notes && (
                                <div className="flex items-center gap-1 text-xs text-slate-400 mt-1">
                                  <MessageSquare className="w-3 h-3" />
                                  <span className="truncate max-w-[200px]">{task.notes}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Quick Status Buttons */}
                          <div className="flex gap-2 mt-3 pt-3 border-t border-slate-200" onClick={(e) => e.stopPropagation()}>
                            {(["pending", "in_progress", "completed"] as const).map(status => (
                              <Button
                                key={status}
                                size="sm"
                                variant={task.status === status ? "default" : "outline"}
                                className={`flex-1 text-xs ${task.status === status ? statusColors[status] : ""}`}
                                onClick={() => handleQuickStatusUpdate(task, status)}
                              >
                                {statusLabels[status]}
                              </Button>
                            ))}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Add/Edit Task Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto bg-card" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-foreground">{editingTask ? "עריכת משימה" : "הוספת משימה חדשה"}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label className="text-foreground">כותרת המשימה *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="תיאור המשימה"
                />
              </div>

              <div>
                <Label className="text-foreground">פירוט</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="פירוט נוסף על המשימה"
                />
              </div>

              <div>
                <Label className="text-foreground">אחראי לביצוע *</Label>
                <Input
                  value={formData.assigned_to}
                  onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                  placeholder="שם העובד"
                />
              </div>

              <div>
                <Label className="text-foreground">תג"ב (תאריך גמר ביצוע) *</Label>
                <Input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                />
              </div>

              <div>
                <Label className="text-foreground">סטטוס</Label>
                <Select
                  value={formData.status}
                  onValueChange={(v) => setFormData({ ...formData, status: v as any })}
                >
                  <SelectTrigger className="bg-background text-foreground border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border z-[10000]">
                    <SelectItem value="pending">לא בוצע</SelectItem>
                    <SelectItem value="in_progress">בתהליך</SelectItem>
                    <SelectItem value="completed">בוצע</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-foreground">הערות</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="הערות נוספות"
                />
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                ביטול
              </Button>
              <Button onClick={handleSubmit} className="bg-primary">
                {editingTask ? "עדכן" : "הוסף"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Task Detail Dialog */}
        <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
          <DialogContent className="max-w-md bg-card" dir="rtl">
            {selectedTask && (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl ${statusColors[selectedTask.status]} flex items-center justify-center`}>
                      {(() => {
                        const Icon = statusIcons[selectedTask.status];
                        return <Icon className="w-6 h-6 text-white" />;
                      })()}
                    </div>
                    <div>
                      <DialogTitle>{selectedTask.title}</DialogTitle>
                      <Badge className={`${statusColors[selectedTask.status]} text-white mt-1`}>
                        {statusLabels[selectedTask.status]}
                      </Badge>
                    </div>
                  </div>
                </DialogHeader>

                <div className="space-y-4 mt-4">
                  {selectedTask.description && (
                    <p className="text-slate-600">{selectedTask.description}</p>
                  )}

                  <div className="flex items-center gap-2 text-slate-600">
                    <User className="w-4 h-4" />
                    <span>אחראי: {selectedTask.assigned_to}</span>
                  </div>

                  <div className="flex items-center gap-2 text-slate-600">
                    <Clock className="w-4 h-4" />
                    <span>תג"ב: {format(new Date(selectedTask.due_date), "dd/MM/yyyy")}</span>
                  </div>

                  {selectedTask.notes && (
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="flex items-center gap-2 text-slate-600 mb-1">
                        <MessageSquare className="w-4 h-4" />
                        <span className="font-semibold">הערות:</span>
                      </div>
                      <p className="text-slate-600 text-sm">{selectedTask.notes}</p>
                    </div>
                  )}
                </div>

                <DialogFooter className="mt-6 flex gap-2">
                  <Button
                    variant="destructive"
                    onClick={() => handleDelete(selectedTask.id)}
                  >
                    <Trash2 className="w-4 h-4 ml-1" />
                    מחק
                  </Button>
                  <Button onClick={() => openEditDialog(selectedTask)}>
                    <Edit className="w-4 h-4 ml-1" />
                    ערוך
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}