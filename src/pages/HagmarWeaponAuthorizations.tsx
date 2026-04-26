import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useHagmarSettlement } from "@/hooks/useHagmarSettlement";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { FileCheck, Plus, Calendar, AlertTriangle, Trash2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { format, differenceInDays, parseISO } from "date-fns";

interface WeaponAuth {
  id: string;
  soldier_id: string;
  authorization_date: string;
  expiry_date: string | null;
  authorization_file_url: string | null;
  signed_by: string | null;
  is_active: boolean;
  notes: string | null;
}

interface Soldier { id: string; full_name: string; settlement: string; }

export default function HagmarWeaponAuthorizations() {
  const { user, isHagmarAdmin, isSuperAdmin } = useAuth();
  const { userSettlement, isRestricted } = useHagmarSettlement();
  const isManager = isHagmarAdmin || isSuperAdmin;

  const [auths, setAuths] = useState<WeaponAuth[]>([]);
  const [soldiers, setSoldiers] = useState<Soldier[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [formSoldierId, setFormSoldierId] = useState("");
  const [formDate, setFormDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [formExpiry, setFormExpiry] = useState("");
  const [formSignedBy, setFormSignedBy] = useState("");
  const [formFileUrl, setFormFileUrl] = useState("");

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const [authRes, soldierRes] = await Promise.all([
      supabase.from("hagmar_weapon_authorizations").select("*").eq("is_active", true).order("authorization_date", { ascending: false }),
      supabase.from("hagmar_soldiers").select("id, full_name, settlement").eq("is_active", true),
    ]);
    setAuths((authRes.data || []) as WeaponAuth[]);
    setSoldiers(soldierRes.data || []);
    setLoading(false);
  };

  const relevantSoldiers = useMemo(() => {
    if (isRestricted && userSettlement) return soldiers.filter(s => s.settlement === userSettlement);
    return soldiers;
  }, [soldiers, isRestricted, userSettlement]);

  const visibleAuths = useMemo(() => {
    const soldierIds = new Set(relevantSoldiers.map(s => s.id));
    return auths.filter(a => soldierIds.has(a.soldier_id));
  }, [auths, relevantSoldiers]);

  const expiringAuths = useMemo(() => {
    return visibleAuths.filter(a => {
      if (!a.expiry_date) return false;
      const daysLeft = differenceInDays(parseISO(a.expiry_date), new Date());
      return daysLeft <= 30 && daysLeft >= 0;
    });
  }, [visibleAuths]);

  const expiredAuths = useMemo(() => {
    return visibleAuths.filter(a => {
      if (!a.expiry_date) return false;
      return differenceInDays(parseISO(a.expiry_date), new Date()) < 0;
    });
  }, [visibleAuths]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const path = `weapon-auths/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '')}`;
    const { error } = await supabase.storage.from("content-images").upload(path, file);
    if (error) { toast.error("שגיאה בהעלאה"); setUploading(false); return; }
    setFormFileUrl(path);
    setUploading(false);
    toast.success("טופס הועלה");
  };

  const create = async () => {
    if (!formSoldierId || !formDate) { toast.error("יש לבחור לוחם ותאריך"); return; }
    const { error } = await supabase.from("hagmar_weapon_authorizations").insert({
      soldier_id: formSoldierId,
      authorization_date: formDate,
      expiry_date: formExpiry || null,
      signed_by: formSignedBy || null,
      authorization_file_url: formFileUrl || null,
      created_by: user?.id,
    });
    if (error) { toast.error("שגיאה"); return; }
    toast.success("הרשאה נשמרה");
    setDialogOpen(false);
    fetchData();
  };

  const deleteAuth = async (id: string) => {
    if (!confirm("למחוק הרשאה?")) return;
    await supabase.from("hagmar_weapon_authorizations").update({ is_active: false }).eq("id", id);
    toast.success("הרשאה בוטלה");
    fetchData();
  };

  const getSoldierName = (id: string) => soldiers.find(s => s.id === id)?.full_name || id;

  const getExpiryStatus = (expiry: string | null) => {
    if (!expiry) return { label: "ללא תפוגה", color: "bg-slate-100 text-slate-600" };
    const days = differenceInDays(parseISO(expiry), new Date());
    if (days < 0) return { label: `פג תוקף (${Math.abs(days)} ימים)`, color: "bg-red-100 text-red-700" };
    if (days <= 30) return { label: `${days} ימים לתפוגה`, color: "bg-amber-100 text-amber-700" };
    return { label: "תקף", color: "bg-emerald-100 text-emerald-700" };
  };

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-br from-white via-amber-50/30 to-white pb-24" dir="rtl">
        <div className="px-4 py-6 space-y-5">
          <PageHeader title="הרשאות נשק" subtitle={'ניהול הרשאות נשק חתומות ע"י המח"ט'} icon={FileCheck} />

          {(expiredAuths.length > 0 || expiringAuths.length > 0) && (
            <Card className="p-4 border-red-200 bg-red-50/50">
              <div className="flex items-center gap-2 mb-2"><AlertTriangle className="w-5 h-5 text-red-600" /><span className="font-bold text-red-800">התרעות</span></div>
              {expiredAuths.length > 0 && <p className="text-sm text-red-700">{expiredAuths.length} הרשאות פגות תוקף</p>}
              {expiringAuths.length > 0 && <p className="text-sm text-amber-700">{expiringAuths.length} הרשאות עומדות לפוג</p>}
            </Card>
          )}

          <Button onClick={() => setDialogOpen(true)} className="w-full h-12 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold gap-2">
            <Plus className="w-5 h-5" /> הרשאה חדשה
          </Button>

          {loading ? (
            <div className="text-center py-12"><div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full mx-auto" /></div>
          ) : visibleAuths.length === 0 ? (
            <div className="text-center py-12"><FileCheck className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" /><p className="font-bold">אין הרשאות</p></div>
          ) : (
            <div className="space-y-3">
              {visibleAuths.map(auth => {
                const status = getExpiryStatus(auth.expiry_date);
                return (
                  <Card key={auth.id} className="p-4 border-border">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-bold text-foreground flex items-center gap-2"><User className="w-4 h-4" />{getSoldierName(auth.soldier_id)}</h3>
                        <div className="flex gap-2 mt-1 flex-wrap">
                          <Badge className={status.color}>{status.label}</Badge>
                          <span className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" />{auth.authorization_date}</span>
                        </div>
                        {auth.signed_by && <p className="text-xs text-muted-foreground mt-1">חתום ע"י: {auth.signed_by}</p>}
                        {auth.authorization_file_url && <Badge variant="outline" className="text-xs mt-1">📎 טופס מצורף</Badge>}
                      </div>
                      {isManager && <Button size="icon" variant="ghost" onClick={() => deleteAuth(auth.id)} className="text-destructive"><Trash2 className="w-4 h-4" /></Button>}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader><DialogTitle>הרשאת נשק חדשה</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>לוחם *</Label>
              <Select value={formSoldierId} onValueChange={setFormSoldierId}>
                <SelectTrigger><SelectValue placeholder="בחר לוחם" /></SelectTrigger>
                <SelectContent>{relevantSoldiers.map(s => <SelectItem key={s.id} value={s.id}>{s.full_name} ({s.settlement})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>תאריך הרשאה *</Label><Input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} /></div>
            <div><Label>תאריך תפוגה</Label><Input type="date" value={formExpiry} onChange={e => setFormExpiry(e.target.value)} /></div>
            <div><Label>חתום ע"י</Label><Input value={formSignedBy} onChange={e => setFormSignedBy(e.target.value)} placeholder='מח"ט' /></div>
            <div><Label>העלאת טופס הרשאה</Label><Input type="file" onChange={handleFileUpload} disabled={uploading} accept=".pdf,.jpg,.jpeg,.png" /></div>
            {formFileUrl && <Badge className="bg-emerald-100 text-emerald-700">✓ טופס הועלה</Badge>}
            <Button onClick={create} className="w-full h-12 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold" disabled={uploading}>
              {uploading ? "מעלה..." : "שמור הרשאה"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}