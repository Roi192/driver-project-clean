import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useHagmarSettlement } from "@/hooks/useHagmarSettlement";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { Package, Plus, Trash2, Edit2, MapPin, Search, FileSpreadsheet, AlertTriangle } from "lucide-react";
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
import { HAGMAR_REGIONS, HAGMAR_EQUIPMENT_TYPES } from "@/lib/hagmar-constants";
import * as XLSX from "xlsx";

interface EquipmentItem {
  id: string;
  settlement: string;
  item_type: string;
  item_name: string;
  expected_quantity: number;
  actual_quantity: number;
  serial_numbers: string[] | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export default function HagmarEquipment() {
  const { user, isHagmarAdmin, isSuperAdmin } = useAuth();
  const { userSettlement, isRestricted } = useHagmarSettlement();
  const isManager = isHagmarAdmin || isSuperAdmin;

  const [items, setItems] = useState<EquipmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<EquipmentItem | null>(null);
  const [search, setSearch] = useState("");
  const [filterSettlement, setFilterSettlement] = useState("all");

  // Form
  const [formSettlement, setFormSettlement] = useState("");
  const [formType, setFormType] = useState("weapon");
  const [formName, setFormName] = useState("");
  const [formExpected, setFormExpected] = useState(0);
  const [formActual, setFormActual] = useState(0);
  const [formSerials, setFormSerials] = useState("");
  const [formNotes, setFormNotes] = useState("");

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("hagmar_equipment").select("*").order("settlement").order("item_type");
      if (error) throw error;
      setItems(data || []);
    } catch (err) {
      console.error(err);
      toast.error("שגיאה בטעינה");
    } finally {
      setLoading(false);
    }
  };

  const allSettlements = useMemo(() => {
    if (isRestricted && userSettlement) return [userSettlement];
    return HAGMAR_REGIONS.flatMap(r => r.companies.flatMap(c => c.settlements));
  }, [isRestricted, userSettlement]);

  const filtered = useMemo(() => {
    let result = items;
    // Ravshatz: restrict to own settlement
    if (isRestricted && userSettlement) result = result.filter(i => i.settlement === userSettlement);
    if (filterSettlement !== "all") result = result.filter(i => i.settlement === filterSettlement);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(i => i.item_name.toLowerCase().includes(q) || i.settlement.toLowerCase().includes(q));
    }
    return result;
  }, [items, filterSettlement, search, isRestricted, userSettlement]);

  const shortages = useMemo(() => {
    const base = isRestricted && userSettlement ? items.filter(i => i.settlement === userSettlement) : items;
    return base.filter(i => i.actual_quantity < i.expected_quantity);
  }, [items, isRestricted, userSettlement]);

  const openAdd = () => {
    setEditItem(null);
    setFormSettlement(""); setFormType("weapon"); setFormName(""); setFormExpected(0); setFormActual(0); setFormSerials(""); setFormNotes("");
    setDialogOpen(true);
  };

  const openEdit = (item: EquipmentItem) => {
    setEditItem(item);
    setFormSettlement(item.settlement); setFormType(item.item_type); setFormName(item.item_name);
    setFormExpected(item.expected_quantity); setFormActual(item.actual_quantity);
    setFormSerials(item.serial_numbers?.join(", ") || ""); setFormNotes(item.notes || "");
    setDialogOpen(true);
  };

  const saveItem = async () => {
    if (!formSettlement || !formName) { toast.error("יש למלא ישוב ושם פריט"); return; }
    const payload = {
      settlement: formSettlement,
      item_type: formType,
      item_name: formName,
      expected_quantity: formExpected,
      actual_quantity: formActual,
      serial_numbers: formSerials ? formSerials.split(",").map(s => s.trim()).filter(Boolean) : null,
      notes: formNotes || null,
      created_by: user?.id,
    };

    try {
      if (editItem) {
        const { error } = await supabase.from("hagmar_equipment").update(payload).eq("id", editItem.id);
        if (error) throw error;
        toast.success("פריט עודכן");
      } else {
        const { error } = await supabase.from("hagmar_equipment").insert(payload);
        if (error) throw error;
        toast.success("פריט נוסף");
      }
      setDialogOpen(false);
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error("שגיאה בשמירה");
    }
  };

  const deleteItem = async (id: string) => {
    if (!confirm("למחוק פריט זה?")) return;
    try {
      const { error } = await supabase.from("hagmar_equipment").delete().eq("id", id);
      if (error) throw error;
      toast.success("נמחק");
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error("שגיאה במחיקה");
    }
  };

  const getTypeLabel = (value: string) => HAGMAR_EQUIPMENT_TYPES.find(t => t.value === value)?.label || value;

  const exportToExcel = () => {
    const rows = filtered.map(i => ({
      "ישוב": i.settlement,
      "סוג": getTypeLabel(i.item_type),
      "שם פריט": i.item_name,
      "כמות צפויה": i.expected_quantity,
      "כמות בפועל": i.actual_quantity,
      "חוסר": Math.max(0, i.expected_quantity - i.actual_quantity),
      "מספרים סידוריים": i.serial_numbers?.join(", ") || "",
      "הערות": i.notes || "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "ציוד");
    XLSX.writeFile(wb, `hagmar_equipment_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
  };

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-br from-white via-amber-50/30 to-white pb-24" dir="rtl">
        <div className="px-4 py-6 space-y-5">
          <PageHeader title="ניהול ציוד ליישוב" subtitle="מעקב מלאי ציוד לכל ישוב" icon={Package} />

          {/* Shortage Alert */}
          {shortages.length > 0 && (
            <Card className="p-4 border-red-200 bg-gradient-to-br from-red-50 to-orange-50">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <span className="font-bold text-red-800">חוסרים בציוד ({shortages.length})</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {shortages.slice(0, 5).map(s => (
                  <Badge key={s.id} variant="destructive" className="text-xs">
                    {s.settlement} - {s.item_name} (חסר {s.expected_quantity - s.actual_quantity})
                  </Badge>
                ))}
                {shortages.length > 5 && <Badge variant="outline" className="text-xs">+{shortages.length - 5} נוספים</Badge>}
              </div>
            </Card>
          )}

          {/* Actions */}
          {isManager && (
            <div className="flex gap-2">
              <Button onClick={openAdd} className="flex-1 h-12 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold gap-2">
                <Plus className="w-5 h-5" /> הוסף פריט
              </Button>
              <Button variant="outline" onClick={exportToExcel} className="h-12 gap-2">
                <FileSpreadsheet className="w-5 h-5" /> Excel
              </Button>
            </div>
          )}

          {/* Filters */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input placeholder="חיפוש..." value={search} onChange={e => setSearch(e.target.value)} className="pr-9 h-11" />
            </div>
            <Select value={filterSettlement} onValueChange={setFilterSettlement}>
              <SelectTrigger className="w-36 h-11"><SelectValue placeholder="ישוב" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל הישובים</SelectItem>
                {allSettlements.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Items */}
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full mx-auto" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <p className="font-bold text-foreground">אין פריטים</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(item => {
                const shortage = item.expected_quantity - item.actual_quantity;
                const hasShortage = shortage > 0;
                return (
                  <Card key={item.id} className={`p-4 ${hasShortage ? "border-red-200" : "border-border"}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">{getTypeLabel(item.item_type)}</Badge>
                          <span className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" />{item.settlement}</span>
                        </div>
                        <h3 className="font-bold text-foreground">{item.item_name}</h3>
                        <div className="flex gap-4 mt-1 text-sm">
                          <span>צפוי: <strong>{item.expected_quantity}</strong></span>
                          <span>בפועל: <strong className={hasShortage ? "text-red-600" : "text-emerald-600"}>{item.actual_quantity}</strong></span>
                          {hasShortage && <span className="text-red-600 font-bold">חוסר: {shortage}</span>}
                        </div>
                        {item.notes && <p className="text-xs text-muted-foreground mt-1">{item.notes}</p>}
                      </div>
                      {isManager && (
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" onClick={() => openEdit(item)}><Edit2 className="w-4 h-4" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => deleteItem(item.id)} className="text-red-500"><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader><DialogTitle>{editItem ? "עריכת פריט" : "הוספת פריט"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>ישוב *</Label>
              <Select value={formSettlement} onValueChange={setFormSettlement}>
                <SelectTrigger><SelectValue placeholder="בחר ישוב" /></SelectTrigger>
                <SelectContent>
                  {allSettlements.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>סוג ציוד</Label>
              <Select value={formType} onValueChange={setFormType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {HAGMAR_EQUIPMENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>שם הפריט *</Label>
              <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder='לדוגמה: M16, אפוד מגן...' />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>כמות צפויה</Label>
                <Input type="number" value={formExpected} onChange={e => setFormExpected(Number(e.target.value))} min={0} />
              </div>
              <div>
                <Label>כמות בפועל</Label>
                <Input type="number" value={formActual} onChange={e => setFormActual(Number(e.target.value))} min={0} />
              </div>
            </div>
            <div>
              <Label>מספרים סידוריים (מופרדים בפסיקים)</Label>
              <Textarea value={formSerials} onChange={e => setFormSerials(e.target.value)} placeholder="123456, 789012..." rows={2} />
            </div>
            <div>
              <Label>הערות</Label>
              <Textarea value={formNotes} onChange={e => setFormNotes(e.target.value)} rows={2} />
            </div>
            <Button onClick={saveItem} className="w-full h-12 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold">
              {editItem ? "עדכן" : "הוסף"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}