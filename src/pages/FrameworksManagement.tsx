import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Building2, Plus, Pencil, PowerOff, Search, ChevronLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useFrameworks, Framework, FRAMEWORK_TYPE_LABELS } from "@/hooks/useFrameworks";

const FRAMEWORK_TYPES: Framework["type"][] = [
  "brigade", "battalion", "company", "department", "sector", "outpost", "planag", "other"
];

const emptyForm = (): Partial<Framework> => ({
  name: "",
  type: "battalion",
  parent_id: null,
  sector: "",
  department: "",
  description: "",
});

export default function FrameworksManagement() {
  const { brigade: myBrigade } = useAuth() as any;
  const { frameworks, rootFrameworks, getChildren, isLoading, create, update, toggleActive, isCreating, isUpdating } = useFrameworks();

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Framework>>(emptyForm());

  const filteredAll = frameworks.filter((f) => {
    if (!f.is_active) return false;
    if (typeFilter !== "all" && f.type !== typeFilter) return false;
    if (search && !f.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const openAdd = (parentId?: string) => {
    setEditingId(null);
    setForm({ ...emptyForm(), parent_id: parentId ?? null, brigade: myBrigade ?? "" });
    setDialogOpen(true);
  };

  const openEdit = (f: Framework) => {
    setEditingId(f.id);
    setForm({ ...f });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.name?.trim() || !form.type || !form.brigade) return;
    if (editingId) {
      update({ id: editingId, ...form });
    } else {
      create(form as Omit<Framework, "id" | "created_at" | "is_active">);
    }
    setDialogOpen(false);
    setForm(emptyForm());
  };

  const renderNode = (fw: Framework, depth = 0) => {
    const children = getChildren(fw.id);
    const hasChildren = children.length > 0;

    if (hasChildren) {
      return (
        <AccordionItem key={fw.id} value={fw.id} className="border rounded-xl mb-2">
          <AccordionTrigger className="px-4 py-3 hover:no-underline">
            <FrameworkRow fw={fw} depth={depth} onEdit={openEdit} onAdd={() => openAdd(fw.id)} onToggle={() => toggleActive({ id: fw.id, is_active: false })} />
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-2">
            {children.map((child) => renderNode(child, depth + 1))}
          </AccordionContent>
        </AccordionItem>
      );
    }

    return (
      <div key={fw.id} className="border rounded-xl mb-2 px-4 py-3">
        <FrameworkRow fw={fw} depth={depth} onEdit={openEdit} onAdd={() => openAdd(fw.id)} onToggle={() => toggleActive({ id: fw.id, is_active: false })} />
      </div>
    );
  };

  return (
    <AppLayout>
      <div className="p-4 md:p-6 space-y-6" dir="rtl">
        <PageHeader
          icon={Building2}
          title="ניהול מסגרות"
          subtitle="ניהול מבנה ארגוני: גדודים, פלוגות, גזרות ומוצבים"
          badge="ניהול מסגרות"
        />

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              className="pr-9"
              placeholder="חיפוש מסגרת..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="סוג" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל הסוגים</SelectItem>
              {FRAMEWORK_TYPES.map((t) => (
                <SelectItem key={t} value={t}>{FRAMEWORK_TYPE_LABELS[t]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => openAdd()} className="shrink-0">
            <Plus className="w-4 h-4 ml-1" />
            הוסף מסגרת
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">טוען...</div>
        ) : (search || typeFilter !== "all") ? (
          <div className="space-y-2">
            {filteredAll.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">לא נמצאו תוצאות</div>
            )}
            {filteredAll.map((fw) => (
              <div key={fw.id} className="border rounded-xl px-4 py-3">
                <FrameworkRow fw={fw} depth={0} onEdit={openEdit} onAdd={() => openAdd(fw.id)} onToggle={() => toggleActive({ id: fw.id, is_active: false })} />
              </div>
            ))}
          </div>
        ) : (
          <Accordion type="multiple" className="space-y-1">
            {rootFrameworks.map((fw) => renderNode(fw, 0))}
          </Accordion>
        )}

        {rootFrameworks.length === 0 && !isLoading && !search && typeFilter === "all" && (
          <div className="text-center py-16 text-muted-foreground">
            <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">אין מסגרות עדיין</p>
            <p className="text-sm mt-1">לחץ "הוסף מסגרת" כדי להתחיל</p>
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "עריכת מסגרת" : "הוספת מסגרת"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>שם המסגרת *</Label>
              <Input
                value={form.name ?? ""}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="לדוגמה: גדוד 50"
              />
            </div>
            <div className="space-y-1.5">
              <Label>סוג *</Label>
              <Select value={form.type} onValueChange={(v) => setForm((p) => ({ ...p, type: v as Framework["type"] }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FRAMEWORK_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{FRAMEWORK_TYPE_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {form.parent_id && (
              <div className="space-y-1.5">
                <Label>תת-מסגרת של</Label>
                <Select value={form.parent_id ?? ""} onValueChange={(v) => setForm((p) => ({ ...p, parent_id: v || null }))}>
                  <SelectTrigger><SelectValue placeholder="ללא הורה" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">ללא הורה</SelectItem>
                    {frameworks.filter((f) => f.id !== editingId && f.is_active).map((f) => (
                      <SelectItem key={f.id} value={f.id}>{f.name} ({FRAMEWORK_TYPE_LABELS[f.type]})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>תיאור</Label>
              <Textarea
                value={form.description ?? ""}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="תיאור אופציונלי..."
                rows={2}
              />
            </div>
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

function FrameworkRow({
  fw,
  depth,
  onEdit,
  onAdd,
  onToggle,
}: {
  fw: Framework;
  depth: number;
  onEdit: (f: Framework) => void;
  onAdd: () => void;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center gap-3 w-full">
      <div className="flex-1 flex items-center gap-2 min-w-0">
        {depth > 0 && <ChevronLeft className="w-3 h-3 text-muted-foreground shrink-0" />}
        <span className="font-medium truncate">{fw.name}</span>
        <Badge variant="outline" className="text-xs shrink-0">{FRAMEWORK_TYPE_LABELS[fw.type]}</Badge>
        {fw.description && <span className="text-xs text-muted-foreground truncate hidden sm:block">{fw.description}</span>}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); onAdd(); }} title="הוסף תת-מסגרת">
          <Plus className="w-3.5 h-3.5" />
        </Button>
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); onEdit(fw); }}>
          <Pencil className="w-3.5 h-3.5" />
        </Button>
        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={(e) => { e.stopPropagation(); onToggle(); }} title="השבת">
          <PowerOff className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}
