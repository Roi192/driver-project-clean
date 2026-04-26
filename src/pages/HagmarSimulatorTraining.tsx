import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useHagmarSettlement } from "@/hooks/useHagmarSettlement";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { Monitor, Plus, Calendar, Trash2 } from "lucide-react";
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
import { HAGMAR_ALL_SETTLEMENTS } from "@/lib/hagmar-constants";

interface SimTraining {
  id: string;
  settlement: string | null;
  training_date: string;
  training_content: string | null;
  commander_name: string | null;
  participants: string[] | null;
  summary: string | null;
}

interface Soldier { id: string; full_name: string; settlement: string; }

export default function HagmarSimulatorTraining() {
  const { user, isHagmarAdmin, isSuperAdmin } = useAuth();
  const { userSettlement, isRestricted } = useHagmarSettlement();
  const isManager = isHagmarAdmin || isSuperAdmin;

  const [trainings, setTrainings] = useState<SimTraining[]>([]);
  const [soldiers, setSoldiers] = useState<Soldier[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [formDate, setFormDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [formSettlement, setFormSettlement] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formCommander, setFormCommander] = useState("");
  const [formParticipants, setFormParticipants] = useState<string[]>([]);
  const [formSummary, setFormSummary] = useState("");

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const [tRes, sRes] = await Promise.all([
      supabase.from("hagmar_simulator_training").select("*").order("training_date", { ascending: false }),
      supabase.from("hagmar_soldiers").select("id, full_name, settlement").eq("is_active", true),
    ]);
    setTrainings((tRes.data || []) as SimTraining[]);
    setSoldiers(sRes.data || []);
    setLoading(false);
  };

  const allSettlements = useMemo(() => isRestricted && userSettlement ? [userSettlement] : HAGMAR_ALL_SETTLEMENTS, [isRestricted, userSettlement]);
  const settlementSoldiers = useMemo(() => formSettlement ? soldiers.filter(s => s.settlement === formSettlement) : soldiers, [soldiers, formSettlement]);

  const toggleParticipant = (id: string) => setFormParticipants(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);

  const create = async () => {
    if (!formDate) { toast.error("יש למלא תאריך"); return; }
    const { error } = await supabase.from("hagmar_simulator_training").insert({
      settlement: formSettlement || null,
      training_date: formDate,
      training_content: formContent || null,
      commander_name: formCommander || null,
      participants: formParticipants.length > 0 ? formParticipants : null,
      summary: formSummary || null,
      created_by: user?.id,
    });
    if (error) { toast.error("שגיאה"); return; }
    toast.success("אימון סימולטור נוצר");
    setDialogOpen(false);
    fetchData();
  };

  const deleteTraining = async (id: string) => {
    if (!confirm("למחוק?")) return;
    await supabase.from("hagmar_simulator_training").delete().eq("id", id);
    toast.success("נמחק");
    fetchData();
  };

  const getSoldierName = (id: string) => soldiers.find(s => s.id === id)?.full_name || id;

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-br from-white via-amber-50/30 to-white pb-24" dir="rtl">
        <div className="px-4 py-6 space-y-5">
          <PageHeader title="אימון סימולטור" subtitle="ניהול אימוני סימולטור" icon={Monitor} />

          {isManager && (
            <Button onClick={() => setDialogOpen(true)} className="w-full h-12 bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-bold gap-2">
              <Plus className="w-5 h-5" /> אימון סימולטור חדש
            </Button>
          )}

          {loading ? (
            <div className="text-center py-12"><div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full mx-auto" /></div>
          ) : trainings.length === 0 ? (
            <div className="text-center py-12"><Monitor className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" /><p className="font-bold">אין אימוני סימולטור</p></div>
          ) : (
            <div className="space-y-3">
              {trainings.map(t => (
                <Card key={t.id} className="p-4 border-border">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <Badge className="bg-purple-100 text-purple-700 border-purple-200 mb-1">סימולטור</Badge>
                      <p className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" />{t.training_date}</p>
                      {t.settlement && <p className="text-xs text-muted-foreground">{t.settlement}</p>}
                    </div>
                    {isManager && <Button size="icon" variant="ghost" onClick={() => deleteTraining(t.id)} className="text-destructive"><Trash2 className="w-4 h-4" /></Button>}
                  </div>
                  {t.training_content && <p className="text-sm mb-2">{t.training_content}</p>}
                  {t.commander_name && <p className="text-xs text-muted-foreground">מפקד: <strong>{t.commander_name}</strong></p>}
                  {t.participants && t.participants.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {t.participants.map(p => <Badge key={p} variant="outline" className="text-xs">{getSoldierName(p)}</Badge>)}
                    </div>
                  )}
                  {t.summary && <p className="text-xs text-muted-foreground mt-2 border-t pt-2">{t.summary}</p>}
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader><DialogTitle>אימון סימולטור חדש</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>תאריך *</Label><Input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} /></div>
            <div><Label>ישוב</Label>
              <Select value={formSettlement} onValueChange={setFormSettlement}>
                <SelectTrigger><SelectValue placeholder="בחר ישוב" /></SelectTrigger>
                <SelectContent>{allSettlements.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>תוכן האימון</Label><Textarea value={formContent} onChange={e => setFormContent(e.target.value)} rows={2} /></div>
            <div><Label>מפקד מתרגל</Label><Input value={formCommander} onChange={e => setFormCommander(e.target.value)} /></div>
            {settlementSoldiers.length > 0 && (
              <div><Label>לוחמים משתתפים</Label>
                <div className="max-h-40 overflow-y-auto border rounded-lg p-2 space-y-1 mt-1">
                  {settlementSoldiers.map(s => (
                    <div key={s.id} className="flex items-center gap-2">
                      <Checkbox checked={formParticipants.includes(s.id)} onCheckedChange={() => toggleParticipant(s.id)} />
                      <span className="text-sm">{s.full_name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div><Label>סיכום</Label><Textarea value={formSummary} onChange={e => setFormSummary(e.target.value)} rows={3} /></div>
            <Button onClick={create} className="w-full h-12 bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-bold">צור אימון</Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}