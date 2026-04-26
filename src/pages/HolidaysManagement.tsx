import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { he } from "date-fns/locale";
import { 
  CalendarDays, 
  Plus, 
  Edit, 
  Trash2, 
  Loader2,
  Star,
  Flag
} from "lucide-react";
import unitLogo from "@/assets/unit-logo.png";

interface Holiday {
  id: string;
  title: string;
  event_date: string;
  category: string;
  is_recurring: boolean;
}

export default function HolidaysManagement() {
  const { isAdmin, canAccessHolidays, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const hasAccess = canAccessHolidays;
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [holidayToDelete, setHolidayToDelete] = useState<Holiday | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    event_date: "",
    category: "holiday" as "holiday" | "memorial",
    is_recurring: true
  });

  useEffect(() => {
    if (!authLoading && !hasAccess) {
      navigate("/");
    }
  }, [hasAccess, authLoading, navigate]);

  useEffect(() => {
    fetchHolidays();
  }, []);

  const fetchHolidays = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("calendar_holidays")
      .select("*")
      .order("event_date", { ascending: true });

    if (error) {
      console.error("Error fetching holidays:", error);
    } else {
      setHolidays(data || []);
    }
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.event_date) {
      toast.error("יש למלא את כל השדות הנדרשים");
      return;
    }

    const data = {
      title: formData.title,
      event_date: formData.event_date,
      category: formData.category,
      is_recurring: formData.is_recurring
    };

    if (editingHoliday) {
      const { error } = await supabase
        .from("calendar_holidays")
        .update(data)
        .eq("id", editingHoliday.id);

      if (error) {
        toast.error("שגיאה בעדכון");
      } else {
        toast.success("עודכן בהצלחה");
        fetchHolidays();
      }
    } else {
      const { error } = await supabase
        .from("calendar_holidays")
        .insert(data);

      if (error) {
        toast.error("שגיאה בהוספה");
      } else {
        toast.success("נוסף בהצלחה");
        fetchHolidays();
      }
    }

    setDialogOpen(false);
    resetForm();
  };

  const handleDelete = async () => {
    if (!holidayToDelete) return;

    const { error } = await supabase
      .from("calendar_holidays")
      .delete()
      .eq("id", holidayToDelete.id);

    if (error) {
      toast.error("שגיאה במחיקה");
    } else {
      toast.success("נמחק בהצלחה");
      fetchHolidays();
    }
    setDeleteConfirmOpen(false);
    setHolidayToDelete(null);
  };

  const resetForm = () => {
    setFormData({
      title: "",
      event_date: "",
      category: "holiday",
      is_recurring: true
    });
    setEditingHoliday(null);
  };

  const openEditDialog = (holiday: Holiday) => {
    setEditingHoliday(holiday);
    setFormData({
      title: holiday.title,
      event_date: holiday.event_date,
      category: holiday.category as "holiday" | "memorial",
      is_recurring: holiday.is_recurring
    });
    setDialogOpen(true);
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

  const holidaysList = holidays.filter(h => h.category === "holiday");
  const memorialsList = holidays.filter(h => h.category === "memorial");

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
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/30 mb-4">
              <CalendarDays className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-bold text-amber-400">ניהול חגים</span>
            </div>
            <h1 className="text-2xl font-black text-white mb-2">חגים ואזכורים</h1>
            <p className="text-slate-400 text-sm">{holidays.length} פריטים</p>
          </div>
        </div>

        <div className="px-4 py-6 space-y-6">
          {/* Add Button */}
          <Button
            onClick={() => { resetForm(); setDialogOpen(true); }}
            className="w-full bg-gradient-to-r from-amber-500 to-amber-600 text-white py-6 rounded-2xl shadow-lg"
          >
            <Plus className="w-5 h-5 ml-2" />
            הוסף חג/אזכור
          </Button>

          {/* Holidays Section */}
          <Card className="border-0 shadow-xl bg-white/90 backdrop-blur rounded-3xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-800">
                <Star className="w-5 h-5 text-amber-500" />
                חגים ({holidaysList.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-[300px]">
                <div className="space-y-2">
                  {holidaysList.length === 0 ? (
                    <p className="text-center text-slate-500 py-4">אין חגים</p>
                  ) : (
                    holidaysList.map(holiday => (
                      <div key={holiday.id} className="flex items-center justify-between p-3 rounded-xl bg-amber-50 border border-amber-200">
                        <div>
                          <p className="font-bold text-slate-800">{holiday.title}</p>
                          <p className="text-sm text-slate-500">
                            {format(parseISO(holiday.event_date), "dd/MM/yyyy", { locale: he })}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="icon" onClick={() => openEditDialog(holiday)} className="rounded-xl">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => { setHolidayToDelete(holiday); setDeleteConfirmOpen(true); }} className="rounded-xl text-red-500">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Memorials Section */}
          <Card className="border-0 shadow-xl bg-white/90 backdrop-blur rounded-3xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-800">
                <Flag className="w-5 h-5 text-slate-600" />
                אזכורים ({memorialsList.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-[300px]">
                <div className="space-y-2">
                  {memorialsList.length === 0 ? (
                    <p className="text-center text-slate-500 py-4">אין אזכורים</p>
                  ) : (
                    memorialsList.map(holiday => (
                      <div key={holiday.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                        <div>
                          <p className="font-bold text-slate-800">{holiday.title}</p>
                          <p className="text-sm text-slate-500">
                            {format(parseISO(holiday.event_date), "dd/MM/yyyy", { locale: he })}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="icon" onClick={() => openEditDialog(holiday)} className="rounded-xl">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => { setHolidayToDelete(holiday); setDeleteConfirmOpen(true); }} className="rounded-xl text-red-500">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Add/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-md" dir="rtl">
            <DialogHeader>
              <DialogTitle>{editingHoliday ? "עריכה" : "הוספת חג/אזכור"}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label>שם *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="שם החג/אזכור"
                />
              </div>

              <div>
                <Label>תאריך *</Label>
                <Input
                  type="date"
                  value={formData.event_date}
                  onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                />
              </div>

              <div>
                <Label>סוג</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value: "holiday" | "memorial") => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="holiday">חג</SelectItem>
                    <SelectItem value="memorial">אזכור</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="gap-2 mt-4">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>ביטול</Button>
              <Button onClick={handleSubmit} className="bg-primary">
                {editingHoliday ? "עדכן" : "הוסף"}
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
            <p className="text-slate-600">האם אתה בטוח שברצונך למחוק את {holidayToDelete?.title}?</p>
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