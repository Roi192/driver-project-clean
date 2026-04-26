import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { OUTPOSTS } from "@/lib/constants";
import { 
  Sparkles, 
  Plus, 
  Trash2, 
  Edit,
  MapPin,
  CheckCircle2,
  RotateCcw,
  ListChecks
} from "lucide-react";

interface ResponsibilityArea {
  id: string;
  outpost: string;
  area_name: string;
  description: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

const CleaningParadeAreas = () => {
  const [areas, setAreas] = useState<ResponsibilityArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOutpost, setSelectedOutpost] = useState<string>(OUTPOSTS[0] as string);

  // Dialogs
  const [areaDialogOpen, setAreaDialogOpen] = useState(false);
  const [editingArea, setEditingArea] = useState<ResponsibilityArea | null>(null);

  // Form state
  const [areaForm, setAreaForm] = useState<{
    outpost: string;
    area_name: string;
    description: string;
    display_order: number;
  }>({
    outpost: OUTPOSTS[0],
    area_name: "",
    description: "",
    display_order: 0,
  });

  useEffect(() => {
    fetchAreas();
  }, []);

  const fetchAreas = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("cleaning_responsibility_areas")
        .select("*")
        .order("outpost")
        .order("display_order");

      if (error) throw error;
      setAreas(data || []);
    } catch (error) {
      console.error("Error fetching areas:", error);
      toast.error("שגיאה בטעינת תחומי האחריות");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveArea = async () => {
    if (!areaForm.area_name.trim()) {
      toast.error("יש להזין שם תחום אחריות");
      return;
    }

    try {
      if (editingArea) {
        const { error } = await supabase
          .from("cleaning_responsibility_areas")
          .update({
            outpost: areaForm.outpost,
            area_name: areaForm.area_name,
            description: areaForm.description || null,
            display_order: areaForm.display_order,
          })
          .eq("id", editingArea.id);

        if (error) throw error;
        toast.success("תחום האחריות עודכן בהצלחה");
      } else {
        const { error } = await supabase.from("cleaning_responsibility_areas").insert({
          outpost: areaForm.outpost,
          area_name: areaForm.area_name,
          description: areaForm.description || null,
          display_order: areaForm.display_order,
        });

        if (error) throw error;
        toast.success("תחום האחריות נוסף בהצלחה");
      }

      setAreaDialogOpen(false);
      setEditingArea(null);
      setAreaForm({ outpost: selectedOutpost, area_name: "", description: "", display_order: 0 });
      fetchAreas();
    } catch (error) {
      console.error("Error saving area:", error);
      toast.error("שגיאה בשמירת תחום האחריות");
    }
  };

  const handleDeleteArea = async (areaId: string) => {
    if (!confirm("האם למחוק את תחום האחריות?")) return;

    try {
      const { error } = await supabase.from("cleaning_responsibility_areas").delete().eq("id", areaId);
      if (error) throw error;
      toast.success("תחום האחריות נמחק");
      fetchAreas();
    } catch (error) {
      console.error("Error deleting area:", error);
      toast.error("שגיאה במחיקת תחום האחריות");
    }
  };

  const openEditArea = (area: ResponsibilityArea) => {
    setEditingArea(area);
    setAreaForm({
      outpost: area.outpost,
      area_name: area.area_name,
      description: area.description || "",
      display_order: area.display_order,
    });
    setAreaDialogOpen(true);
  };

  const addDefaultAreas = async () => {
    const defaultAreas = [
      "פינה ימנית של החדר",
      "פינה שמאלית של החדר",
      "מזגן ומקרר",
      "ארוניות וציוד מעל הארוניות",
      "רצפה וניקיון כללי",
    ];

    try {
      const newAreas = defaultAreas.map((name, index) => ({
        outpost: selectedOutpost,
        area_name: name,
        display_order: index,
      }));

      const { error } = await supabase.from("cleaning_responsibility_areas").insert(newAreas);
      if (error) throw error;

      toast.success(`נוספו ${defaultAreas.length} תחומי אחריות למוצב ${selectedOutpost}`);
      fetchAreas();
    } catch (error) {
      console.error("Error adding default areas:", error);
      toast.error("שגיאה בהוספת תחומי אחריות ברירת מחדל");
    }
  };

  const getAreasForOutpost = (outpost: string) => {
    return areas.filter((a) => a.outpost === outpost);
  };

  const outpostAreas = getAreasForOutpost(selectedOutpost);

  return (
    <AppLayout>
      <div className="min-h-screen p-4 md:p-6 space-y-6">
        <PageHeader
          title="תחומי אחריות במסדרים"
          subtitle="הגדרת תחומי אחריות לכל מוצב עם רוטציה אוטומטית"
        />

        <div className="flex flex-wrap gap-3">
          <Button
            onClick={() => {
              setEditingArea(null);
              setAreaForm({ outpost: selectedOutpost, area_name: "", description: "", display_order: 0 });
              setAreaDialogOpen(true);
            }}
            className="bg-primary/20 hover:bg-primary/30 text-primary"
          >
            <Plus className="w-4 h-4 ml-2" />
            הוסף תחום אחריות
          </Button>
          <Button
            onClick={addDefaultAreas}
            variant="outline"
            className="text-amber-400 border-amber-400/30 hover:bg-amber-400/10"
          >
            <ListChecks className="w-4 h-4 ml-2" />
            הוסף תחומים ברירת מחדל למוצב
          </Button>
        </div>

        <Card className="bg-slate-900/70 border-slate-700">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                תחומי אחריות לפי מוצב
              </CardTitle>
              <Select value={selectedOutpost} onValueChange={setSelectedOutpost}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OUTPOSTS.map((outpost) => (
                    <SelectItem key={outpost} value={outpost}>
                      {outpost} ({getAreasForOutpost(outpost).length})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {outpostAreas.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>אין תחומי אחריות מוגדרים למוצב זה</p>
                <Button
                  variant="link"
                  onClick={addDefaultAreas}
                  className="text-primary mt-2"
                >
                  הוסף תחומי ברירת מחדל
                </Button>
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-700">
                      <TableHead className="text-right w-12">#</TableHead>
                      <TableHead className="text-right">תחום אחריות</TableHead>
                      <TableHead className="text-right">תיאור</TableHead>
                      <TableHead className="text-right">סטטוס</TableHead>
                      <TableHead className="text-right">פעולות</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {outpostAreas.map((area, index) => (
                      <TableRow key={area.id} className="border-slate-700/50">
                        <TableCell className="font-bold text-primary">
                          {index + 1}
                        </TableCell>
                        <TableCell className="font-medium">{area.area_name}</TableCell>
                        <TableCell className="text-slate-400 max-w-xs truncate">
                          {area.description || "-"}
                        </TableCell>
                        <TableCell>
                          {area.is_active ? (
                            <Badge className="bg-emerald-500/20 text-emerald-400">
                              <CheckCircle2 className="w-3 h-3 ml-1" />
                              פעיל
                            </Badge>
                          ) : (
                            <Badge variant="secondary">לא פעיל</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => openEditArea(area)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-red-400 hover:text-red-300"
                              onClick={() => handleDeleteArea(area.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Summary by Outpost */}
        <Card className="bg-slate-900/70 border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-amber-400" />
              סיכום תחומים לכל המוצבים
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {OUTPOSTS.map((outpost) => {
                const count = getAreasForOutpost(outpost).length;
                return (
                  <div
                    key={outpost}
                    className="p-3 bg-slate-800/50 rounded-lg border border-slate-700/50 cursor-pointer hover:bg-slate-800 transition-colors"
                    onClick={() => setSelectedOutpost(outpost)}
                  >
                    <div className="text-sm text-slate-400">{outpost}</div>
                    <div className="text-2xl font-bold">
                      {count}
                      <span className="text-sm font-normal text-slate-500 mr-1">תחומים</span>
                    </div>
                    {count === 0 && (
                      <Badge variant="outline" className="text-xs mt-1 text-amber-400 border-amber-400/30">
                        לא מוגדר
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Add/Edit Area Dialog */}
        <Dialog open={areaDialogOpen} onOpenChange={setAreaDialogOpen}>
          <DialogContent className="bg-slate-900 border-slate-700 max-w-md" dir="rtl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                {editingArea ? "עריכת תחום אחריות" : "הוספת תחום אחריות"}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label>מוצב *</Label>
                <Select
                  value={areaForm.outpost}
                  onValueChange={(val) => setAreaForm({ ...areaForm, outpost: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OUTPOSTS.map((outpost) => (
                      <SelectItem key={outpost} value={outpost}>
                        {outpost}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>שם תחום האחריות *</Label>
                <Input
                  value={areaForm.area_name}
                  onChange={(e) => setAreaForm({ ...areaForm, area_name: e.target.value })}
                  placeholder="לדוגמה: פינה ימנית של החדר"
                />
              </div>

              <div>
                <Label>סדר הצגה</Label>
                <Input
                  type="number"
                  min={0}
                  value={areaForm.display_order}
                  onChange={(e) =>
                    setAreaForm({ ...areaForm, display_order: parseInt(e.target.value) || 0 })
                  }
                />
              </div>

              <div>
                <Label>תיאור</Label>
                <Textarea
                  value={areaForm.description}
                  onChange={(e) => setAreaForm({ ...areaForm, description: e.target.value })}
                  placeholder="תיאור מפורט של מה כולל התחום..."
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="ghost" onClick={() => setAreaDialogOpen(false)}>
                ביטול
              </Button>
              <Button onClick={handleSaveArea}>
                {editingArea ? "עדכון" : "הוספה"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

export default CleaningParadeAreas;