import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { GraduationCap, Plus, Calendar, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";
import { PROF_DEV_TYPES } from "@/lib/hagmar-constants";

interface ProfDev {
  id: string;
  dev_type: string;
  event_date: string;
  content: string | null;
  attendees: string[] | null;
  summary: string | null;
}

interface Profile { user_id: string; full_name: string; department: string | null; }

export default function HagmarProfessionalDev() {
  const { user, isHagmarAdmin, isSuperAdmin } = useAuth();
  const isManager = isHagmarAdmin || isSuperAdmin;

  const [events, setEvents] = useState<ProfDev[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [formType, setFormType] = useState("ravshatz");
  const [formDate, setFormDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [formContent, setFormContent] = useState("");
  const [formAttendees, setFormAttendees] = useState<string[]>([]);
  const [formSummary, setFormSummary] = useState("");

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const [evRes, profRes] = await Promise.all([
      supabase.from("hagmar_professional_development").select("*").order("event_date", { ascending: false }),
      supabase.from("profiles").select("user_id, full_name, department").eq("department", "hagmar"),
    ]);
    setEvents((evRes.data || []) as ProfDev[]);
    setProfiles(profRes.data || []);
    setLoading(false);
  };

  const toggleAttendee = (id: string) => setFormAttendees(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);

  const create = async () => {
    if (!formDate) { toast.error("יש למלא תאריך"); return; }
    const { error } = await supabase.from("hagmar_professional_development").insert({
      dev_type: formType,
      event_date: formDate,
      content: formContent || null,
      attendees: formAttendees.length > 0 ? formAttendees : null,
      summary: formSummary || null,
      created_by: user?.id,
    });
    if (error) { toast.error("שגיאה"); return; }
    toast.success("השתלמות נוצרה");
    setDialogOpen(false);
    fetchData();
  };

  const deleteEvent = async (id: string) => {
    if (!confirm("למחוק?")) return;
    await supabase.from("hagmar_professional_development").delete().eq("id", id);
    toast.success("נמחק");
    fetchData();
  };

  const getTypeName = (v: string) => PROF_DEV_TYPES.find(t => t.value === v)?.label || v;
  const getProfileName = (id: string) => profiles.find(p => p.user_id === id)?.full_name || id;

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-br from-white via-amber-50/30 to-white pb-24" dir="rtl">
        <div className="px-4 py-6 space-y-5">
          <PageHeader title="מעקב השתלמויות" subtitle={'השתלמויות רבש"צים ומ"מ'} icon={GraduationCap} />

          {isManager && (
            <Button onClick={() => setDialogOpen(true)} className="w-full h-12 bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-bold gap-2">
              <Plus className="w-5 h-5" /> השתלמות חדשה
            </Button>
          )}

          {loading ? (
            <div className="text-center py-12"><div className="animate-spin w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full mx-auto" /></div>
          ) : events.length === 0 ? (
            <div className="text-center py-12"><GraduationCap className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" /><p className="font-bold">אין השתלמויות</p></div>
          ) : (
            <div className="space-y-3">
              {events.map(ev => (
                <Card key={ev.id} className="p-4 border-border">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <Badge className="bg-teal-100 text-teal-700 border-teal-200 mb-1">{getTypeName(ev.dev_type)}</Badge>
                      <p className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" />{ev.event_date}</p>
                    </div>
                    {isManager && <Button size="icon" variant="ghost" onClick={() => deleteEvent(ev.id)} className="text-destructive"><Trash2 className="w-4 h-4" /></Button>}
                  </div>
                  {ev.content && <p className="text-sm mb-2">{ev.content}</p>}
                  {ev.attendees && ev.attendees.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs font-bold mb-1 flex items-center gap-1"><Users className="w-3 h-3" />נוכחים ({ev.attendees.length}):</p>
                      <div className="flex flex-wrap gap-1">
                        {ev.attendees.map(a => <Badge key={a} variant="outline" className="text-xs">{getProfileName(a)}</Badge>)}
                      </div>
                    </div>
                  )}
                  {ev.summary && <p className="text-xs text-muted-foreground mt-2 border-t pt-2">{ev.summary}</p>}
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader><DialogTitle>השתלמות חדשה</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>סוג השתלמות</Label>
              <Select value={formType} onValueChange={setFormType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PROF_DEV_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>תאריך *</Label><Input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} /></div>
            <div><Label>תוכן ההשתלמות</Label><Textarea value={formContent} onChange={e => setFormContent(e.target.value)} rows={3} /></div>
            {profiles.length > 0 && (
              <div><Label>משתתפים</Label>
                <div className="max-h-40 overflow-y-auto border rounded-lg p-2 space-y-1 mt-1">
                  {profiles.map(p => (
                    <div key={p.user_id} className="flex items-center gap-2">
                      <Checkbox checked={formAttendees.includes(p.user_id)} onCheckedChange={() => toggleAttendee(p.user_id)} />
                      <span className="text-sm">{p.full_name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div><Label>סיכום</Label><Textarea value={formSummary} onChange={e => setFormSummary(e.target.value)} rows={2} /></div>
            <Button onClick={create} className="w-full h-12 bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-bold">צור השתלמות</Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}