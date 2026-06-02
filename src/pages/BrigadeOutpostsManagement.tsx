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
import { Building, Plus, Pencil, Trash2, Loader2, MapPin, Navigation, Lock } from "lucide-react";
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

  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<BrigadeOutpost | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BrigadeOutpost | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({ name: "", region: "" });
  const resetForm = () => setForm({ name: "", region: "" });

  if (authLoading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  if (!canManage) return <Navigate to="/" replace />;

  const brigadeInfo = getBrigade(selectedBrigade);
  const isBinyamin = selectedBrigade === "binyamin";

  const handleAdd = async () => {
    if (!form.name.trim()) {
      toast.error("יש להזין שם מוצב");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("brigade_outposts" as any).insert({
      brigade: selectedBrigade,
      name: form.name.trim(),
      region: form.region.trim() || null,
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

        <Button
          onClick={() => { resetForm(); setAddOpen(true); }}
          className="w-full gap-2 bg-gradient-to-r from-primary to-accent text-primary-foreground font-bold py-6 rounded-2xl"
        >
          <Plus className="w-5 h-5" />
          הוסף מוצב חדש
        </Button>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : outposts.length === 0 ? (
          <Card className="border-2 border-dashed border-slate-300">
            <CardContent className="p-8 text-center">
              <MapPin className="w-12 h-12 mx-auto mb-3 text-slate-400" />
              <p className="text-slate-700 font-bold mb-1">אין מוצבים מוגדרים</p>
              <p className="text-sm text-slate-500">לחץ "הוסף מוצב חדש" כדי להתחיל</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {outposts.map((op) => (
              <Card key={op.id} className="border-2 border-slate-200 hover:border-primary/40 transition-colors">
                <CardContent className="p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 truncate">{op.name}</p>
                      {op.region && (
                        <p className="text-xs text-slate-500 flex items-center gap-1 truncate">
                          <Navigation className="w-3 h-3" />
                          {op.region}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => { setEditTarget(op); setForm({ name: op.name, region: op.region || "" }); }}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => setDeleteTarget(op)}
                      className="text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit dialog */}
      <Dialog open={addOpen || !!editTarget} onOpenChange={(open) => { if (!open) { setAddOpen(false); setEditTarget(null); resetForm(); } }}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>{editTarget ? "עריכת מוצב" : "הוספת מוצב חדש"}</DialogTitle>
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
            <Button onClick={editTarget ? handleEdit : handleAdd} disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
              {editTarget ? "שמור שינויים" : "הוסף"}
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