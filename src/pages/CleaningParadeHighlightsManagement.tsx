import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { toast } from "sonner";
import { Plus, ListChecks, Trash2, Edit2, GripVertical } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";

interface Highlight {
  id: string;
  title: string;
  display_order: number;
  is_active: boolean;
}

export default function CleaningParadeHighlightsManagement() {
  const navigate = useNavigate();
  const { isAdmin, isLoading: isRoleLoading } = useUserRole();
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingHighlight, setEditingHighlight] = useState<Highlight | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isRoleLoading && !isAdmin) {
      navigate("/");
    }
  }, [isAdmin, isRoleLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchHighlights();
    }
  }, [isAdmin]);

  const fetchHighlights = async () => {
    try {
      const { data, error } = await supabase
        .from('cleaning_parade_highlights')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setHighlights(data || []);
    } catch (error: any) {
      console.error('Error fetching highlights:', error);
      toast.error("שגיאה בטעינת הדגשים");
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!newTitle.trim()) {
      toast.error("נא להזין כותרת");
      return;
    }

    setSaving(true);
    try {
      const maxOrder = highlights.length > 0 
        ? Math.max(...highlights.map(h => h.display_order)) 
        : 0;

      const { error } = await supabase
        .from('cleaning_parade_highlights')
        .insert({
          title: newTitle.trim(),
          display_order: maxOrder + 1
        });

      if (error) throw error;
      
      toast.success("הדגש נוסף בהצלחה");
      setNewTitle("");
      setDialogOpen(false);
      fetchHighlights();
    } catch (error: any) {
      console.error('Error adding highlight:', error);
      toast.error("שגיאה בהוספת הדגש");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!editingHighlight || !newTitle.trim()) {
      toast.error("נא להזין כותרת");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('cleaning_parade_highlights')
        .update({ title: newTitle.trim() })
        .eq('id', editingHighlight.id);

      if (error) throw error;
      
      toast.success("הדגש עודכן בהצלחה");
      setNewTitle("");
      setEditingHighlight(null);
      setDialogOpen(false);
      fetchHighlights();
    } catch (error: any) {
      console.error('Error updating highlight:', error);
      toast.error("שגיאה בעדכון הדגש");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("האם אתה בטוח שברצונך למחוק דגש זה?")) return;

    try {
      const { error } = await supabase
        .from('cleaning_parade_highlights')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast.success("הדגש נמחק בהצלחה");
      fetchHighlights();
    } catch (error: any) {
      console.error('Error deleting highlight:', error);
      toast.error("שגיאה במחיקת הדגש");
    }
  };

  const openEditDialog = (highlight: Highlight) => {
    setEditingHighlight(highlight);
    setNewTitle(highlight.title);
    setDialogOpen(true);
  };

  const openAddDialog = () => {
    setEditingHighlight(null);
    setNewTitle("");
    setDialogOpen(true);
  };

  if (isRoleLoading || loading) {
    return (
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-br from-white via-slate-50/80 to-cream/20">
        <div className="relative px-4 py-6 space-y-6 pb-24">
          {/* Header */}
          <PageHeader
            icon={ListChecks}
            title="עריכת דגשים למסדרי ניקיון"
            subtitle="ניהול הדגשים שמוצגים בדף מסדרי הניקיון"
            badge="דגשים למסדר"
          />
          

          {/* Add Button */}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                onClick={openAddDialog}
                className="w-full h-14 text-lg font-bold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
              >
                <Plus className="w-5 h-5 ml-2" />
                הוסף דגש חדש
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingHighlight ? "עריכת דגש" : "הוספת דגש חדש"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <Input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="כותרת הדגש"
                  className="bg-white text-slate-900 placeholder:text-slate-400"
                />
                <Button
                  onClick={editingHighlight ? handleEdit : handleAdd}
                  disabled={saving || !newTitle.trim()}
                  className="w-full"
                >
                  {saving ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : editingHighlight ? (
                    "עדכן"
                  ) : (
                    "הוסף"
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Highlights List */}
          <Card className="border-slate-200/60 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">רשימת דגשים ({highlights.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {highlights.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-8">אין דגשים מוגדרים</p>
              ) : (
                <div className="space-y-2">
                  {highlights.map((highlight, index) => (
                    <div 
                      key={highlight.id} 
                      className="flex items-center gap-3 p-3 bg-amber-50 rounded-xl border border-amber-200"
                    >
                      <GripVertical className="w-5 h-5 text-amber-400 flex-shrink-0" />
                      <span className="w-6 h-6 rounded-full bg-amber-500 text-white text-sm flex items-center justify-center font-bold flex-shrink-0">
                        {index + 1}
                      </span>
                      <span className="flex-1 text-sm text-amber-800 font-medium">
                        {highlight.title}
                      </span>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(highlight)}
                          className="w-8 h-8 text-amber-600 hover:text-amber-700 hover:bg-amber-100"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(highlight.id)}
                          className="w-8 h-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}