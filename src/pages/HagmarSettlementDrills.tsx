import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useHagmarSettlement } from "@/hooks/useHagmarSettlement";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { Shield, Plus, Calendar, MapPin, Users, Trash2, FileSpreadsheet, CheckCircle2, XCircle } from "lucide-react";
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
import { HAGMAR_ALL_SETTLEMENTS, getRegionFromSettlement, getCompanyFromSettlement } from "@/lib/hagmar-constants";
import * as XLSX from "xlsx";

interface SettlementDrill {
  id: string;
  settlement: string;
  drill_date: string;
  drill_content: string | null;
  regional_force_participated: boolean;
  full_activation_drill: boolean;
  tzahi_activated: boolean;
  settlement_command_activated: boolean;
  settlement_commander_name: string | null;
  participants: string[] | null;
  summary: string | null;
  company: string | null;
  region: string | null;
}

interface Soldier { id: string; full_name: string; settlement: string; }

export default function HagmarSettlementDrills() {
  const { user, isHagmarAdmin, isSuperAdmin } = useAuth();
  const { userSettlement, isRestricted } = useHagmarSettlement();
  const isManager = isHagmarAdmin || isSuperAdmin;

  const [drills, setDrills] = useState<SettlementDrill[]>([]);
  const [soldiers, setSoldiers] = useState<Soldier[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [expandedDrill, setExpandedDrill] = useState<string | null>(null);

  const [formSettlement, setFormSettlement] = useState("");
  const [formDate, setFormDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [formContent, setFormContent] = useState("");
  const [formRegionalForce, setFormRegionalForce] = useState(false);
  const [formFullActivation, setFormFullActivation] = useState(false);
  const [formTzahi, setFormTzahi] = useState(false);
  const [formCommandCenter, setFormCommandCenter] = useState(false);
  const [formCommander, setFormCommander] = useState("");
  const [formParticipants, setFormParticipants] = useState<string[]>([]);
  const [formSummary, setFormSummary] = useState("");

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const [drillsRes, soldiersRes] = await Promise.all([
      supabase.from("hagmar_settlement_drills").select("*").order("drill_date", { ascending: false }),
      supabase.from("hagmar_soldiers").select("id, full_name, settlement").eq("is_active", true),
    ]);
    setDrills((drillsRes.data || []) as SettlementDrill[]);
    setSoldiers(soldiersRes.data || []);
    setLoading(false);
  };

  const allSettlements = useMemo(() => isRestricted && userSettlement ? [userSettlement] : HAGMAR_ALL_SETTLEMENTS, [isRestricted, userSettlement]);

  const visibleDrills = useMemo(() => {
    if (isRestricted && userSettlement) return drills.filter(d => d.settlement === userSettlement);
    return drills;
  }, [drills, isRestricted, userSettlement]);

  const settlementSoldiers = useMemo(() => soldiers.filter(s => s.settlement === formSettlement), [soldiers, formSettlement]);

  const toggleParticipant = (id: string) => {
    setFormParticipants(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  };

  const createDrill = async () => {
    if (!formSettlement || !formDate) { toast.error("יש למלא ישוב ותאריך"); return; }
    const { error } = await supabase.from("hagmar_settlement_drills").insert({
      settlement: formSettlement,
      drill_date: formDate,
      drill_content: formContent || null,
      regional_force_participated: formRegionalForce,
      full_activation_drill: formFullActivation,
      tzahi_activated: formTzahi,
      settlement_command_activated: formCommandCenter,
      settlement_commander_name: formCommander || null,
      participants: formParticipants.length > 0 ? formParticipants : null,
      summary: formSummary || null,
      region: getRegionFromSettlement(formSettlement),
      company: getCompanyFromSettlement(formSettlement),
      created_by: user?.id,
    });
    if (error) { toast.error("שגיאה"); console.error(error); return; }
    toast.success("תרגיל נוצר");
    setDialogOpen(false);
    fetchData();
  };

  const deleteDrill = async (id: string) => {
    if (!confirm("למחוק תרגיל?")) return;
    await supabase.from("hagmar_settlement_drills").delete().eq("id", id);
    toast.success("נמחק");
    fetchData();
  };

  const getSoldierName = (id: string) => soldiers.find(s => s.id === id)?.full_name || id;

  const BoolBadge = ({ val, label }: { val: boolean; label: string }) => (
    <Badge className={`text-xs ${val ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
      {val ? <CheckCircle2 className="w-3 h-3 ml-1" /> : <XCircle className="w-3 h-3 ml-1" />}{label}
    </Badge>
  );

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-br from-white via-amber-50/30 to-white pb-24" dir="rtl">
        <div className="px-4 py-6 space-y-5">
          <PageHeader title="תרגילים ביישוב" subtitle="ניהול תרגילי הגנה ביישובים" icon={Shield} />

          {isManager && (
            <Button onClick={() => setDialogOpen(true)} className="w-full h-12 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-bold gap-2">
              <Plus className="w-5 h-5" /> תרגיל חדש
            </Button>
          )}

          {loading ? (
            <div className="text-center py-12"><div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto" /></div>
          ) : visibleDrills.length === 0 ? (
            <div className="text-center py-12"><Shield className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" /><p className="font-bold">אין תרגילים</p></div>
          ) : (
            <div className="space-y-3">
              {visibleDrills.map(drill => (
                <Card key={drill.id} className="p-4 border-border">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <Badge className="bg-blue-100 text-blue-700 border-blue-200 mb-1">תרגיל ביישוב</Badge>
                      <h3 className="font-bold text-foreground">{drill.settlement}</h3>
                      <p className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" />{drill.drill_date}</p>
                    </div>
                    {isManager && (
                      <Button size="icon" variant="ghost" onClick={() => deleteDrill(drill.id)} className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
                    )}
                  </div>

                  {drill.drill_content && <p className="text-sm text-muted-foreground mb-2">{drill.drill_content}</p>}

                  <div className="flex flex-wrap gap-1.5 mb-2">
                    <BoolBadge val={drill.regional_force_participated} label="כח גזרתי" />
                    <BoolBadge val={drill.full_activation_drill} label="הפעלה מלאה" />
                    <BoolBadge val={drill.tzahi_activated} label='צח"י' />
                    <BoolBadge val={drill.settlement_command_activated} label={'חמ"ל יישוב'} />
                  </div>

                  {drill.settlement_commander_name && (
                    <p className="text-xs text-muted-foreground">מפקד יישוב: <strong>{drill.settlement_commander_name}</strong></p>
                  )}

                  {drill.participants && drill.participants.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs font-bold text-foreground mb-1">משתתפים ({drill.participants.length}):</p>
                      <div className="flex flex-wrap gap-1">
                        {drill.participants.map(p => (
                          <Badge key={p} variant="outline" className="text-xs">{getSoldierName(p)}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {drill.summary && <p className="text-xs text-muted-foreground mt-2 border-t pt-2">סיכום: {drill.summary}</p>}
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader><DialogTitle>תרגיל ביישוב חדש</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>ישוב *</Label>
              <Select value={formSettlement} onValueChange={setFormSettlement}>
                <SelectTrigger><SelectValue placeholder="בחר ישוב" /></SelectTrigger>
                <SelectContent>{allSettlements.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>תאריך *</Label><Input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} /></div>
            <div><Label>תוכן התרגיל</Label><Textarea value={formContent} onChange={e => setFormContent(e.target.value)} rows={2} /></div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2"><Checkbox checked={formRegionalForce} onCheckedChange={v => setFormRegionalForce(!!v)} /><Label>כח גזרתי השתתף</Label></div>
              <div className="flex items-center gap-2"><Checkbox checked={formFullActivation} onCheckedChange={v => setFormFullActivation(!!v)} /><Label>תרגיל הפעלה מלאה</Label></div>
              <div className="flex items-center gap-2"><Checkbox checked={formTzahi} onCheckedChange={v => setFormTzahi(!!v)} /><Label>צח"י הופעלו</Label></div>
              <div className="flex items-center gap-2"><Checkbox checked={formCommandCenter} onCheckedChange={v => setFormCommandCenter(!!v)} /><Label>חמ"ל יישוב הופעל</Label></div>
            </div>

            <div><Label>מפקד יישוב בתרגיל</Label><Input value={formCommander} onChange={e => setFormCommander(e.target.value)} /></div>

            {formSettlement && settlementSoldiers.length > 0 && (
              <div>
                <Label>לוחמים משתתפים</Label>
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

            <div><Label>סיכום תרגיל</Label><Textarea value={formSummary} onChange={e => setFormSummary(e.target.value)} rows={3} /></div>
            <Button onClick={createDrill} className="w-full h-12 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-bold">צור תרגיל</Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}