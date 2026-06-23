import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { useBrigadeOutposts, BrigadeOutpost } from "@/hooks/useBrigadeOutposts";
import { supabase } from "@/integrations/supabase/client";
import { BRIGADES, getBrigade } from "@/lib/brigades";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Building, Plus, Pencil, Trash2, Loader2, MapPin, Navigation, Lock, X, Layers } from "lucide-react";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { Navigate } from "react-router-dom";

export default function BrigadeOutpostsManagement() {
  const { user, brigade: myBrigade, isAdmin, isPlatoonCommander, isDivisionAdmin, loading: authLoading } = useAuth();
  const canManage = isAdmin || isPlatoonCommander || isDivisionAdmin;

  // Division admin can pick brigade; others pinned to their own
  const [selectedBrigade, setSelectedBrigade] = useState<string>(myBrigade || "binyamin");
  useEffect(() => {
    if (!isDivisionAdmin && myBrigade) setSelectedBrigade(myBrigade);
  }, [myBrigade, isDivisionAdmin]);

  const { outposts, loading, refetch } = useBrigadeOutposts(selectedBrigade);

  // Single outpost add/edit dialog
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<BrigadeOutpost | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BrigadeOutpost | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({ name: "", region: "" });
  const resetForm = () => setForm({ name: "", region: "" });

  // Sector (גזרה) dialog
  const [sectorDialogOpen, setSectorDialogOpen] = useState(false);
  const [sectorForm, setSectorForm] = useState({ region: "", outposts: [""] });
  const resetSectorForm = () => setSectorForm({ region: "", outposts: [""] });

  if (authLoading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  if (!canManage) return <Navigate to="/" replace />;

  const brigadeInfo = getBrigade(selectedBrigade);
  const isBinyamin = selectedBrigade === "binyamin";

  // Group outposts by region
  const grouped = outposts.reduce((acc, op) => {
    const r = op.region || "ללא גזרה";
    if (!acc[r]) acc[r] = [];
    acc[r].push(op);
    return acc;
  }, {} as Record<string, BrigadeOutpost[]>);

  // Regions sorted: named ones first (alphabetically), then "ללא גזרה" last
  const regionKeys = Object.keys(grouped).sort((a, b) => {
    if (a === "ללא גזרה") return 1;
    if (b === "ללא גזרה") return -1;
    return a.localeCompare(b, "he");
  });

  const handleAdd = async (regionOverride?: string) => {
    if (!form.name.trim()) {
      toast.error("יש להזין שם מוצב");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("brigade_outposts" as any).insert({
      brigade: selectedBrigade,
      name: form.name.trim(),
      region: (regionOverride ?? form.region).trim() || null,
    } as any);
    setSubmitting(false);
    if (error) {
      toast.error(`שגיאה בהוספת מוצב: ${error.message}`);
      return;
    }
    toast.success("המוצב נוסף בהצלחה");
    setAddOpen(false);
    resetForm();
    refetch();
  };

  const handleEdit = async () => {
    if (!editTarget) return;
    if (!form.name.trim()) {
      toast.error("יש להזין שם מוצב");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase
      .from("brigade_outposts" as any)
      .update({ name: form.name.trim(), region: form.region.trim() || null } as any)
      .eq("id", editTarget.id);
    setSubmitting(false);
    if (error) {
      toast.error(`שגיאה בעדכון מוצב: ${error.message}`);
      return;
    }
    toast.success("המוצב עודכן בהצלחה");
    setEditTarget(null);
    resetForm();
    refetch();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSubmitting(true);
    const { error } = await supabase
      .from("brigade_outposts" as any)
      .delete()
      .eq("id", deleteTarget.id);
    setSubmitting(false);
    if (error) {
      toast.error(`שגיאה במחיקה: ${error.message}`);
      return;
    }
    toast.success("המוצב נמחק בהצלחה");
    setDeleteTarget(null);
    refetch();
  };

  const handleToggleTrackShiftForms = async (op: BrigadeOutpost) => {
    const { error } = await supabase
      .from("brigade_outposts" as any)
      .update({ track_shift_forms: !op.track_shift_forms } as any)
      .eq("id", op.id);
    if (error) {
      toast.error(`שגיאה בעדכון: ${error.message}`);
      return;
    }
    refetch();
  };

  const handleAddSector = async () => {
    if (!sectorForm.region.trim()) {
      toast.error("יש להזין שם גזרה");
      return;
    }
    const validOutposts = sectorForm.outposts.map((n) => n.trim()).filter(Boolean);
    if (validOutposts.length === 0) {
      toast.error("יש להזין לפחות מוצב אחד");
      return;
    }
    setSubmitting(true);
    try {
      await Promise.all(
        validOutposts.map((name) =>
          supabase.from("brigade_outposts" as any).insert({
            brigade: selectedBrigade,
            name,
            region: sectorForm.region.trim(),
          } as any)
        )
      );
      toast.success(`הגזרה "${sectorForm.region.trim()}" נוספה עם ${validOutposts.length} מוצבים`);
      setSectorDialogOpen(false);
      resetSectorForm();
      refetch();
    } catch {
      toast.error("שגיאה בהוספת הגזרה");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppLayout>
      <PageHeader
        icon={Building}
        title="ניהול מוצבי החטיבה"
        subtitle={brigadeInfo ? brigadeInfo.name : "בחר חטיבה"}
      />

      <div className="space-y-4 pb-24">
        {/* Brigade selector for division admins */}
        {isDivisionAdmin && (
          <Card className="border-2 border-amber-300 bg-amber-50">
            <CardContent className="p-4">
              <Label className="text-slate-800 font-bold mb-2 block">בחירת חטיבה</Label>
              <select
                value={selectedBrigade}
                onChange={(e) => setSelectedBrigade(e.target.value)}
                className="w-full p-3 rounded-xl border-2 border-slate-300 bg-white text-slate-800 font-bold"
              >
                {Object.values(BRIGADES).map((b) => (
                  <option key={b.code} value={b.code}>{b.name}</option>
                ))}
              </select>
            </CardContent>
          </Card>
        )}

        {isBinyamin && !isDivisionAdmin && (
          <Card className="border-2 border-slate-200 bg-slate-50">
            <CardContent className="p-4 flex items-center gap-3 text-slate-700">
              <Lock className="w-5 h-5 text-slate-500" />
              <p className="text-sm font-semibold">רשימת מוצבי חטיבת בנימין מנוהלת כברירת מחדל ומגיעה מוכנה עם המערכת.</p>
            </CardContent>
          </Card>
        )}

        {/* Action buttons */}
        <div className="flex gap-3">
          <Button
            onClick={() => { resetSectorForm(); setSectorDialogOpen(true); }}
            className="flex-1 gap-2 bg-gradient-to-r from-primary to-accent text-primary-foreground font-bold py-6 rounded-2xl"
          >
            <Layers className="w-5 h-5" />
            הוסף גזרה
          </Button>
          <Button
            variant="outline"
            onClick={() => { resetForm(); setAddOpen(true); }}
            className="flex-1 gap-2 font-bold py-6 rounded-2xl border-2"
          >
            <Plus className="w-5 h-5" />
            הוסף מוצב בודד
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : outposts.length === 0 ? (
          <Card className="border-2 border-dashed border-slate-300">
            <CardContent className="p-8 text-center">
              <MapPin className="w-12 h-12 mx-auto mb-3 text-slate-400" />
              <p className="text-slate-700 font-bold mb-1">אין מוצבים מוגדרים</p>
              <p className="text-sm text-slate-500">לחץ "הוסף גזרה" או "הוסף מוצב בודד" כדי להתחיל</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {regionKeys.map((region) => (
              <div key={region}>
                {/* Region header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Navigation className="w-4 h-4 text-primary" />
                    <h3 className="font-black text-slate-800 text-base">{region}</h3>
                    <span className="text-xs text-slate-500 font-semibold">({grouped[region].length})</span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1 text-xs font-bold rounded-xl h-8 px-3"
                    onClick={() => {
                      setForm({ name: "", region: region === "ללא גזרה" ? "" : region });
                      setAddOpen(true);
                    }}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    הוסף מוצב
                  </Button>
                </div>

                {/* Outposts in this region */}
                <div className="space-y-2 pr-2 border-r-2 border-primary/20">
                  {grouped[region].map((op) => (
                    <Card key={op.id} className="border-2 border-slate-200 hover:border-primary/40 transition-colors">
                      <CardContent className="p-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <MapPin className="w-4 h-4 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-800 truncate">{op.name}</p>
                            <p className="text-xs text-slate-500">מעקב טפסי משמרת</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Switch
                            checked={op.track_shift_forms !== false}
                            onCheckedChange={() => handleToggleTrackShiftForms(op)}
                          />
                          <Button
                            size="icon"
                            variant="outline"
                            className="w-8 h-8"
                            onClick={() => { setEditTarget(op); setForm({ name: op.name, region: op.region || "" }); }}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="outline"
                            className="w-8 h-8 text-destructive hover:bg-destructive/10"
                            onClick={() => setDeleteTarget(op)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit single outpost dialog */}
      <Dialog open={addOpen || !!editTarget} onOpenChange={(open) => { if (!open) { setAddOpen(false); setEditTarget(null); resetForm(); } }}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>{editTarget ? "עריכת מוצב" : "הוספת מוצב"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-slate-800 font-bold">שם המוצב *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="לדוגמה: מוצב הר ברכה"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-slate-800 font-bold">אזור / גזרה (אופציונלי)</Label>
              <Input
                value={form.region}
                onChange={(e) => setForm({ ...form, region: e.target.value })}
                placeholder="לדוגמה: גזרה צפונית"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setAddOpen(false); setEditTarget(null); resetForm(); }}
              disabled={submitting}
            >
              ביטול
            </Button>
            <Button onClick={editTarget ? handleEdit : () => handleAdd()} disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
              {editTarget ? "שמור שינויים" : "הוסף"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Sector dialog */}
      <Dialog open={sectorDialogOpen} onOpenChange={(open) => { if (!open) { setSectorDialogOpen(false); resetSectorForm(); } }}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-primary" />
              הוספת גזרה
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-slate-800 font-bold">שם הגזרה *</Label>
              <Input
                value={sectorForm.region}
                onChange={(e) => setSectorForm({ ...sectorForm, region: e.target.value })}
                placeholder="לדוגמה: גזרה צפונית"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-slate-800 font-bold mb-2 block">מוצבים בגזרה *</Label>
              <div className="space-y-2">
                {sectorForm.outposts.map((name, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <Input
                      value={name}
                      onChange={(e) => {
                        const updated = [...sectorForm.outposts];
                        updated[idx] = e.target.value;
                        setSectorForm({ ...sectorForm, outposts: updated });
                      }}
                      placeholder={`מוצב ${idx + 1}`}
                      className="flex-1"
                    />
                    {sectorForm.outposts.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const updated = sectorForm.outposts.filter((_, i) => i !== idx);
                          setSectorForm({ ...sectorForm, outposts: updated });
                        }}
                        className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"
                        aria-label="הסר מוצב"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2 gap-1 font-bold rounded-xl"
                onClick={() => setSectorForm({ ...sectorForm, outposts: [...sectorForm.outposts, ""] })}
              >
                <Plus className="w-3.5 h-3.5" />
                הוסף מוצב
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setSectorDialogOpen(false); resetSectorForm(); }}
              disabled={submitting}
            >
              ביטול
            </Button>
            <Button onClick={handleAddSector} disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
              הוסף גזרה
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="מחיקת מוצב"
        description={`האם למחוק את "${deleteTarget?.name}"? תוכן (תיקי בטיחות, נקודות תרגול) השייך למוצב זה לא יימחק אך לא יוצג עוד ברשימה.`}
        isLoading={submitting}
      />
    </AppLayout>
  );
}
