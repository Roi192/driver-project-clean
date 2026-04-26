import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useHagmarSettlement } from "@/hooks/useHagmarSettlement";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { Target, Plus, Calendar, MapPin, Users, ChevronDown, ChevronUp, CheckCircle2, XCircle, Trash2, FileSpreadsheet } from "lucide-react";
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
import { HAGMAR_REGIONS, HAGMAR_EVENT_TYPES } from "@/lib/hagmar-constants";
import * as XLSX from "xlsx";

interface TrainingEvent {
  id: string;
  title: string;
  event_type: string;
  event_date: string;
  event_time: string | null;
  settlement: string | null;
  company: string | null;
  region: string | null;
  description: string | null;
  created_by: string | null;
  created_at: string;
}

interface Attendance {
  id: string;
  event_id: string;
  soldier_id: string;
  attended: boolean | null;
  notes: string | null;
  soldier_name?: string;
}

interface HagmarSoldier {
  id: string;
  full_name: string;
  settlement: string;
}

export default function HagmarTrainingEvents() {
  const { user, isHagmarAdmin, isSuperAdmin } = useAuth();
  const { userSettlement, isRestricted } = useHagmarSettlement();
  const isManager = isHagmarAdmin || isSuperAdmin;

  const [events, setEvents] = useState<TrainingEvent[]>([]);
  const [soldiers, setSoldiers] = useState<HagmarSoldier[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
  const [attendance, setAttendance] = useState<Map<string, Attendance[]>>(new Map());

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formType, setFormType] = useState("shooting_range");
  const [formDate, setFormDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [formTime, setFormTime] = useState("");
  const [formSettlement, setFormSettlement] = useState("");
  const [formRegion, setFormRegion] = useState("");
  const [formDescription, setFormDescription] = useState("");

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [eventsRes, soldiersRes] = await Promise.all([
        supabase.from("hagmar_training_events").select("*").order("event_date", { ascending: false }).limit(50),
        supabase.from("hagmar_soldiers").select("id, full_name, settlement").eq("is_active", true),
      ]);
      if (eventsRes.error) throw eventsRes.error;
      if (soldiersRes.error) throw soldiersRes.error;
      setEvents(eventsRes.data || []);
      setSoldiers(soldiersRes.data || []);
    } catch (err) {
      console.error(err);
      toast.error("שגיאה בטעינת הנתונים");
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendance = async (eventId: string) => {
    try {
      const { data, error } = await supabase
        .from("hagmar_training_attendance")
        .select("*")
        .eq("event_id", eventId);
      if (error) throw error;

      const enriched = (data || []).map(a => ({
        ...a,
        attended: a.attended ?? null,
        notes: a.notes ?? null,
        soldier_name: soldiers.find(s => s.id === a.soldier_id)?.full_name || "לא ידוע",
      }));
      setAttendance(prev => new Map(prev).set(eventId, enriched));
    } catch (err) {
      console.error(err);
    }
  };

  const toggleEvent = (eventId: string) => {
    if (expandedEvent === eventId) {
      setExpandedEvent(null);
    } else {
      setExpandedEvent(eventId);
      if (!attendance.has(eventId)) fetchAttendance(eventId);
    }
  };

  const createEvent = async () => {
    if (!formTitle || !formDate) { toast.error("יש למלא כותרת ותאריך"); return; }
    try {
      const { error } = await supabase.from("hagmar_training_events").insert({
        title: formTitle,
        event_type: formType,
        event_date: formDate,
        event_time: formTime || null,
        settlement: formSettlement || null,
        region: formRegion || null,
        description: formDescription || null,
        created_by: user?.id,
      });
      if (error) throw error;
      toast.success("אירוע נוצר בהצלחה");
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error("שגיאה ביצירת אירוע");
    }
  };

  const deleteEvent = async (id: string) => {
    if (!confirm("למחוק אירוע זה?")) return;
    try {
      await supabase.from("hagmar_training_attendance").delete().eq("event_id", id);
      const { error } = await supabase.from("hagmar_training_events").delete().eq("id", id);
      if (error) throw error;
      toast.success("אירוע נמחק");
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error("שגיאה במחיקה");
    }
  };

  const addAllSoldiersToEvent = async (eventId: string, event: TrainingEvent) => {
    const relevantSoldiers = event.settlement
      ? soldiers.filter(s => s.settlement === event.settlement)
      : soldiers;
    
    const existing = attendance.get(eventId) || [];
    const existingIds = new Set(existing.map(a => a.soldier_id));
    const toAdd = relevantSoldiers.filter(s => !existingIds.has(s.id));

    if (toAdd.length === 0) { toast.info("כל הלוחמים כבר רשומים"); return; }

    try {
      const { error } = await supabase.from("hagmar_training_attendance").insert(
        toAdd.map(s => ({ event_id: eventId, soldier_id: s.id, attended: null }))
      );
      if (error) throw error;
      toast.success(`${toAdd.length} לוחמים נוספו`);
      fetchAttendance(eventId);
    } catch (err) {
      console.error(err);
      toast.error("שגיאה בהוספה");
    }
  };

  const toggleAttendance = async (attendanceId: string, currentValue: boolean | null, eventId: string) => {
    const newValue = currentValue === true ? false : true;
    try {
      const { error } = await supabase
        .from("hagmar_training_attendance")
        .update({ attended: newValue })
        .eq("id", attendanceId);
      if (error) throw error;
      fetchAttendance(eventId);
    } catch (err) {
      console.error(err);
      toast.error("שגיאה בעדכון");
    }
  };

  const resetForm = () => {
    setFormTitle(""); setFormType("shooting_range"); setFormDate(format(new Date(), "yyyy-MM-dd"));
    setFormTime(""); setFormSettlement(""); setFormRegion(""); setFormDescription("");
  };

  const allSettlements = useMemo(() => {
    if (isRestricted && userSettlement) return [userSettlement];
    return HAGMAR_REGIONS.flatMap(r => r.companies.flatMap(c => c.settlements));
  }, [isRestricted, userSettlement]);

  // Filter events for Ravshatz
  const visibleEvents = useMemo(() => {
    if (!isRestricted || !userSettlement) return events;
    return events.filter(e => !e.settlement || e.settlement === userSettlement);
  }, [events, isRestricted, userSettlement]);

  const getTypeLabel = (value: string) => HAGMAR_EVENT_TYPES.find(t => t.value === value)?.label || value;
  const getTypeColor = (type: string) => {
    switch (type) {
      case "shooting_range": return "bg-red-100 text-red-700 border-red-200";
      case "drill": return "bg-blue-100 text-blue-700 border-blue-200";
      case "certification": return "bg-purple-100 text-purple-700 border-purple-200";
      case "briefing": return "bg-amber-100 text-amber-700 border-amber-200";
      default: return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const exportToExcel = () => {
    const rows = events.map(e => ({
      "כותרת": e.title,
      "סוג": getTypeLabel(e.event_type),
      "תאריך": e.event_date,
      "שעה": e.event_time || "",
      "ישוב": e.settlement || "",
      "אזור": e.region || "",
      "תיאור": e.description || "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "אירועים");
    XLSX.writeFile(wb, `hagmar_events_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
  };

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-br from-white via-amber-50/30 to-white pb-24" dir="rtl">
        <div className="px-4 py-6 space-y-5">
          <PageHeader title="אירועי אימונים ומטווחים" subtitle="ניהול אירועים ומעקב נוכחות" icon={Target} />

          {/* Actions */}
          {isManager && (
            <div className="flex gap-2">
              <Button onClick={() => setDialogOpen(true)} className="flex-1 h-12 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold gap-2">
                <Plus className="w-5 h-5" /> אירוע חדש
              </Button>
              <Button variant="outline" onClick={exportToExcel} className="h-12 gap-2">
                <FileSpreadsheet className="w-5 h-5" /> Excel
              </Button>
            </div>
          )}

          {/* Events List */}
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full mx-auto" />
            </div>
          ) : visibleEvents.length === 0 ? (
            <div className="text-center py-12">
              <Target className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <p className="font-bold text-foreground">אין אירועים</p>
            </div>
          ) : (
            <div className="space-y-3">
              {visibleEvents.map(event => {
                const isExpanded = expandedEvent === event.id;
                const eventAttendance = attendance.get(event.id) || [];
                const attended = eventAttendance.filter(a => a.attended === true).length;
                const total = eventAttendance.length;

                return (
                  <Card key={event.id} className="overflow-hidden border-border">
                    <div className="p-4 cursor-pointer" onClick={() => toggleEvent(event.id)}>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className={getTypeColor(event.event_type)}>{getTypeLabel(event.event_type)}</Badge>
                          </div>
                          <h3 className="font-bold text-foreground">{event.title}</h3>
                        </div>
                        {isExpanded ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{event.event_date}</span>
                        {event.event_time && <span>{event.event_time}</span>}
                        {event.settlement && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{event.settlement}</span>}
                        {total > 0 && <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{attended}/{total}</span>}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-border p-4 space-y-3 bg-muted/30">
                        {event.description && <p className="text-sm text-muted-foreground">{event.description}</p>}

                        {isManager && (
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => addAllSoldiersToEvent(event.id, event)} className="gap-1">
                              <Users className="w-4 h-4" /> הוסף לוחמים
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => deleteEvent(event.id)} className="gap-1">
                              <Trash2 className="w-4 h-4" /> מחק
                            </Button>
                          </div>
                        )}

                        {eventAttendance.length > 0 && (
                          <div className="space-y-1.5">
                            <p className="text-sm font-bold">נוכחות ({attended}/{total})</p>
                            {eventAttendance.map(a => (
                              <div key={a.id} className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-background border border-border">
                                <span className="text-sm font-medium">{a.soldier_name}</span>
                                {isManager ? (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => toggleAttendance(a.id, a.attended, event.id)}
                                    className={a.attended ? "text-emerald-600" : a.attended === false ? "text-red-500" : "text-muted-foreground"}
                                  >
                                    {a.attended ? <CheckCircle2 className="w-5 h-5" /> : a.attended === false ? <XCircle className="w-5 h-5" /> : <span className="text-xs">לא סומן</span>}
                                  </Button>
                                ) : (
                                  <span>{a.attended ? "✅" : a.attended === false ? "❌" : "—"}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Create Event Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader><DialogTitle>אירוע חדש</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>כותרת *</Label>
              <Input value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="שם האירוע" />
            </div>
            <div>
              <Label>סוג אירוע</Label>
              <Select value={formType} onValueChange={setFormType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {HAGMAR_EVENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>תאריך *</Label>
                <Input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} />
              </div>
              <div>
                <Label>שעה</Label>
                <Input type="time" value={formTime} onChange={e => setFormTime(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>אזור</Label>
              <Select value={formRegion} onValueChange={setFormRegion}>
                <SelectTrigger><SelectValue placeholder="בחר אזור" /></SelectTrigger>
                <SelectContent>
                  {HAGMAR_REGIONS.map(r => <SelectItem key={r.name} value={r.name}>{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>ישוב</Label>
              <Select value={formSettlement} onValueChange={setFormSettlement}>
                <SelectTrigger><SelectValue placeholder="בחר ישוב" /></SelectTrigger>
                <SelectContent>
                  {allSettlements.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>תיאור</Label>
              <Textarea value={formDescription} onChange={e => setFormDescription(e.target.value)} placeholder="פרטים נוספים" rows={3} />
            </div>
            <Button onClick={createEvent} className="w-full h-12 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold">
              צור אירוע
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}