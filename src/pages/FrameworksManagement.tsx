import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Building2, Plus, Pencil, PowerOff, Search } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useFrameworks, Framework } from "@/hooks/useFrameworks";

// Only 3 types exposed in the UI
type UIFrameworkType = "planag" | "battalion" | "department";

const TYPE_LABELS: Record<UIFrameworkType, string> = {
  planag: "חטיבה / מסגרת חטיבתית",
  battalion: "גדוד",
  department: "אגף",
};

const emptyForm = (type: UIFrameworkType, parentId?: string, brigade?: string): Partial<Framework> => ({
  name: "",
  type,
  parent_id: parentId ?? null,
  brigade: brigade ?? "",
  description: "",
});

export default function FrameworksManagement() {
  const { brigade: myBrigade } = useAuth() as any;
  const { frameworks, rootFrameworks, getChildren, isLoading, create, update, toggleActive, isCreating, isUpdating } = useFrameworks();

  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Framework>>(emptyForm("planag", undefined, myBrigade));
  const [dialogTitle, setDialogTitle] = useState("");

  const filteredRoots = rootFrameworks.filter(f =>
    !search || f.name.toLowerCase().includes(search.toLowerCase())
  );

  const openAddBrigade = () => {
    setEditingId(null);
    setForm(emptyForm("planag", undefined, myBrigade ?? ""));
    setDialogTitle("הוסף חטיבה / מסגרת חטיבתית");
    setDialogOpen(true);
  };

  const openAddBattalion = () => {
    setEditingId(null);
    setForm(emptyForm("battalion", undefined, myBrigade ?? ""));
    setDialogTitle("הוסף גדוד");
    setDialogOpen(true);
  };

  const openAddDepartment = (parentId: string) => {
    setEditingId(null);
    setForm(emptyForm("department", parentId, myBrigade ?? ""));
    setDialogTitle("הוסף אגף");
    setDialogOpen(true);
  };

  const openEdit = (fw: Framework) => {
    setEditingId(fw.id);
    setForm({ ...fw });
    const type = (fw.type === "planag" || fw.type === "battalion" || fw.type === "department")
      ? fw.type as UIFrameworkType
      : "planag";
    setDialogTitle(type === "department" ? "ערוך אגף" : type === "battalion" ? "ערוך גדוד" : "ערוך חטיבה");
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.name?.trim()) return;
    const payload = { ...form, brigade: form.brigade || myBrigade || "" };
    if (editingId) {
      update({ id: editingId, ...payload });
    } else {
      create(payload as Omit<Framework, "id" | "created_at" | "is_active">);
    }
    setDialogOpen(false);
  };

  const renderBrigadeNode = (fw: Framework) => {
    const departments = getChildren(fw.id);
    return (
      <AccordionItem key={fw.id} value={fw.id} className="border rounded-xl mb-2">
        <AccordionTrigger className="px-4 py-3 hover:no-underline">
          <div className="flex items-center gap-3 w-full">
            <div className="flex-1 flex items-center gap-2 min-w-0 text-right">
              <span className="font-semibold truncate">{fw.name}</span>
              <Badge variant="outline" className="text-xs shrink-0 bg-blue-50 text-blue-700 border-blue-200">
                חטיבה
              </Badge>
            </div>
            <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
              <Button size="icon" variant="ghost" className="h-7 w-7" title="הוסף אגף"
                onClick={() => openAddDepartment(fw.id)}>
                <Plus className="w-3.5 h-3.5" />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7"
                onClick={() => openEdit(fw)}>
                <Pencil className="w-3.5 h-3.5" />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive"
                onClick={() => toggleActive({ id: fw.id, is_active: false })} title="השבת">
                <PowerOff className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-4 pb-3">
          {departments.length === 0 ? (
            <div className="text-sm text-muted-foreground py-2 text-center">
              אין אגפים עדיין —{" "}
              <button className="text-primary hover:underline font-medium" onClick={() => openAddDepartment(fw.id)}>
                הוסף אגף
              </button>
            </div>
          ) : (
            <div className="space-y-1.5 mt-1">
              {departments.map(dept => (
                <div key={dept.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-muted/40 border border-border/50">
                  <div className="flex-1 flex items-center gap-2 min-w-0">
                    <span className="text-sm font-medium truncate">{dept.name}</span>
                    <Badge variant="outline" className="text-xs shrink-0 bg-green-50 text-green-700 border-green-200">
                      אגף
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button size="icon" variant="ghost" className="h-6 w-6"
                      onClick={() => openEdit(dept)}>
                      <Pencil className="w-3 h-3" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive"
                      onClick={() => toggleActive({ id: dept.id, is_active: false })} title="השבת">
                      <PowerOff className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
              <Button size="sm" variant="outline" className="w-full mt-2 text-xs h-7"
                onClick={() => openAddDepartment(fw.id)}>
                <Plus className="w-3 h-3 ml-1" />
                הוסף אגף נוסף
              </Button>
            </div>
          )}
        </AccordionContent>
      </AccordionItem>
    );
  };

  const renderBattalionNode = (fw: Framework) => (
    <div key={fw.id} className="border rounded-xl mb-2 px-4 py-3 flex items-center gap-3">
      <div className="flex-1 flex items-center gap-2 min-w-0">
        <span className="font-semibold truncate">{fw.name}</span>
        <Badge variant="outline" className="text-xs shrink-0 bg-purple-50 text-purple-700 border-purple-200">
          גדוד
        </Badge>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(fw)}>
          <Pencil className="w-3.5 h-3.5" />
        </Button>
        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive"
          onClick={() => toggleActive({ id: fw.id, is_active: false })} title="השבת">
          <PowerOff className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );

  const brigadeRoots = filteredRoots.filter(f => f.type === "planag" || f.type === "brigade");
  const battalionRoots = filteredRoots.filter(f => f.type === "battalion");

  return (
    <AppLayout>
      <div className="p-4 md:p-6 space-y-6" dir="rtl">
        <PageHeader
          icon={Building2}
          title="ניהול מסגרות"
          subtitle="ניהול מבנה ארגוני: חטיבות, אגפים וגדודים"
          badge="ניהול מסגרות"
        />

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              className="pr-9"
              placeholder="חיפוש מסגרת..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <Button onClick={openAddBrigade} variant="outline" className="shrink-0 border-blue-300 text-blue-700 hover:bg-blue-50">
            <Plus className="w-4 h-4 ml-1" />
            הוסף חטיבה
          </Button>
          <Button onClick={openAddBattalion} className="shrink-0">
            <Plus className="w-4 h-4 ml-1" />
            הוסף גדוד
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">טוען...</div>
        ) : (
          <>
            {brigadeRoots.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-2 px-1">חטיבות ומסגרות חטיבתיות</h3>
                <Accordion type="multiple" className="space-y-1">
                  {brigadeRoots.map(fw => renderBrigadeNode(fw))}
                </Accordion>
              </div>
            )}

            {battalionRoots.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-2 px-1 mt-2">גדודים</h3>
                {battalionRoots.map(fw => renderBattalionNode(fw))}
              </div>
            )}

            {brigadeRoots.length === 0 && battalionRoots.length === 0 && !search && (
              <div className="text-center py-16 text-muted-foreground">
                <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">אין מסגרות עדיין</p>
                <p className="text-sm mt-1">לחץ "הוסף חטיבה" או "הוסף גדוד" כדי להתחיל</p>
              </div>
            )}

            {(brigadeRoots.length === 0 && battalionRoots.length === 0) && search && (
              <div className="text-center py-8 text-muted-foreground">לא נמצאו תוצאות</div>
            )}
          </>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? `ערוך: ${TYPE_LABELS[form.type as UIFrameworkType] ?? "מסגרת"}` : dialogTitle}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>שם *</Label>
              <Input
                value={form.name ?? ""}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder={
                  form.type === "battalion" ? "לדוגמה: גדוד 50"
                  : form.type === "department" ? "לדוגמה: מודיעין"
                  : 'לדוגמה: מפח"ט'
                }
                autoFocus
              />
            </div>
            {form.type && (
              <div className="p-2 rounded-lg bg-muted/50 text-sm text-muted-foreground">
                סוג: <span className="font-medium text-foreground">{TYPE_LABELS[form.type as UIFrameworkType] ?? form.type}</span>
                {form.parent_id && (
                  <span className="mr-2">
                    (תחת: {frameworks.find(f => f.id === form.parent_id)?.name ?? ""})
                  </span>
                )}
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>ביטול</Button>
            <Button onClick={handleSave} disabled={isCreating || isUpdating || !form.name?.trim()}>
              {editingId ? "שמור" : "הוסף"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
