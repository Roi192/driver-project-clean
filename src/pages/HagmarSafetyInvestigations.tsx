import { useState, useEffect, useMemo } from "react";
import { deleteStorageFiles } from "@/lib/storage-cleanup";
import { supabase } from "@/integrations/supabase/client";
import { useHagmarSettlement } from "@/hooks/useHagmarSettlement";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { FileSearch, Plus, Calendar, MapPin, Trash2 } from "lucide-react";
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
import { HAGMAR_ALL_SETTLEMENTS, getRegionFromSettlement, getCompanyFromSettlement } from "@/lib/hagmar-constants";

interface Investigation {
  id: string;
  settlement: string | null;
  investigation_date: string;
  title: string;
  description: string | null;
  file_url: string | null;
  findings: string | null;
  recommendations: string | null;
}

export default function HagmarSafetyInvestigations() {
  const { user, isHagmarAdmin, isSuperAdmin } = useAuth();
  const { userSettlement, isRestricted } = useHagmarSettlement();
  const isManager = isHagmarAdmin || isSuperAdmin;

  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [formTitle, setFormTitle] = useState("");
  const [formDate, setFormDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [formSettlement, setFormSettlement] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formFindings, setFormFindings] = useState("");
  const [formRecommendations, setFormRecommendations] = useState("");

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data } = await supabase.from("hagmar_safety_investigations").select("*").order("investigation_date", { ascending: false });
    setInvestigations((data || []) as Investigation[]);
    setLoading(false);
  };

  const allSettlements = useMemo(() => isRestricted && userSettlement ? [userSettlement] : HAGMAR_ALL_SETTLEMENTS, [isRestricted, userSettlement]);

  const visibleInvestigations = useMemo(() => {
    if (isRestricted && userSettlement) return investigations.filter(i => i.settlement === userSettlement);
    return investigations;
  }, [investigations, isRestricted, userSettlement]);

  const create = async () => {
    if (!formTitle || !formDate) { toast.error("יש למלא כותרת ותאריך"); return; }
    const { error } = await supabase.from("hagmar_safety_investigations").insert({
      title: formTitle,
      investigation_date: formDate,
      settlement: formSettlement || null,
      description: formDescription || null,
      findings: formFindings || null,
      recommendations: formRecommendations || null,
      region: formSettlement ? getRegionFromSettlement(formSettlement) : null,
      company: formSettlement ? getCompanyFromSettlement(formSettlement) : null,
      created_by: user?.id,
    });
    if (error) { toast.error("שגיאה"); return; }
    toast.success("תחקיר נוצר");
    setDialogOpen(false);
    fetchData();
  };

  const deleteInv = async (id: string) => {
    if (!confirm("למחוק?")) return;
    // Find the record to clean up storage files
    const inv = investigations.find(i => i.id === id);
    if (inv?.file_url) {
      await deleteStorageFiles([inv.file_url], "content-images");
    }
    await supabase.from("hagmar_safety_investigations").delete().eq("id", id);
    toast.success("נמחק");
    fetchData();
  };

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-br from-white via-amber-50/30 to-white pb-24" dir="rtl">
        <div className="px-4 py-6 space-y-5">
          <PageHeader title="תחקירי בטיחות" subtitle="ניהול תחקירי בטיחות" icon={FileSearch} />

          {isManager && (
            <Button onClick={() => setDialogOpen(true)} className="w-full h-12 bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold gap-2">
              <Plus className="w-5 h-5" /> תחקיר חדש
            </Button>
          )}

          {loading ? (
            <div className="text-center py-12"><div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full mx-auto" /></div>
          ) : visibleInvestigations.length === 0 ? (
            <div className="text-center py-12"><FileSearch className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" /><p className="font-bold">אין תחקירים</p></div>
          ) : (
            <div className="space-y-3">
              {visibleInvestigations.map(inv => (
                <Card key={inv.id} className="p-4 border-border">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-bold text-foreground">{inv.title}</h3>
                      <div className="flex gap-2 text-xs text-muted-foreground mt-1">
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{inv.investigation_date}</span>
                        {inv.settlement && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{inv.settlement}</span>}
                      </div>
                    </div>
                    {isManager && <Button size="icon" variant="ghost" onClick={() => deleteInv(inv.id)} className="text-destructive"><Trash2 className="w-4 h-4" /></Button>}
                  </div>
                  {inv.description && <p className="text-sm text-muted-foreground mb-2">{inv.description}</p>}
                  {inv.findings && <div className="text-xs bg-amber-50 p-2 rounded mb-1"><strong>ממצאים:</strong> {inv.findings}</div>}
                  {inv.recommendations && <div className="text-xs bg-blue-50 p-2 rounded"><strong>המלצות:</strong> {inv.recommendations}</div>}
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader><DialogTitle>תחקיר בטיחות חדש</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>כותרת *</Label><Input value={formTitle} onChange={e => setFormTitle(e.target.value)} /></div>
            <div><Label>תאריך *</Label><Input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} /></div>
            <div><Label>ישוב</Label>
              <Select value={formSettlement} onValueChange={setFormSettlement}>
                <SelectTrigger><SelectValue placeholder="בחר ישוב" /></SelectTrigger>
                <SelectContent>{allSettlements.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>תיאור</Label><Textarea value={formDescription} onChange={e => setFormDescription(e.target.value)} rows={3} /></div>
            <div><Label>ממצאים</Label><Textarea value={formFindings} onChange={e => setFormFindings(e.target.value)} rows={3} /></div>
            <div><Label>המלצות</Label><Textarea value={formRecommendations} onChange={e => setFormRecommendations(e.target.value)} rows={3} /></div>
            <Button onClick={create} className="w-full h-12 bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold">צור תחקיר</Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}