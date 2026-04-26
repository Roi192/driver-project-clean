import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { Crosshair, Save, AlertTriangle, CheckCircle2, Hash, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { OUTPOSTS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface EquipmentItem {
  id?: string;
  outpost: string;
  item_type: string;
  expected_quantity: number;
  actual_quantity: number;
  serial_numbers: string[];
  notes: string;
}

const ITEM_TYPES = [
  { value: "ringo", label: "רינגו", hasSerials: true, icon: "🔫", color: "from-red-500 to-red-700" },
  { value: "matulon", label: "מטולון", hasSerials: true, icon: "🎯", color: "from-orange-500 to-orange-700" },
  { value: "rimon_rss", label: "רימון רסס", hasSerials: false, icon: "💨", color: "from-yellow-500 to-amber-600" },
  { value: "matul_nafitz", label: "מטול נפיץ", hasSerials: false, icon: "💥", color: "from-purple-500 to-purple-700" },
  { value: "til_lau", label: "טיל לאו", hasSerials: false, icon: "🚀", color: "from-blue-500 to-blue-700" },
];

const getItemConfig = (type: string) => ITEM_TYPES.find(i => i.value === type);

export default function EquipmentTracking() {
  const { user } = useAuth();
  const { role } = useUserRole();
  const isAdmin = role === "admin" || role === "super_admin";
  const [selectedOutpost, setSelectedOutpost] = useState<string>("");
  const [trackingDate, setTrackingDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [items, setItems] = useState<EquipmentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dialogItem, setDialogItem] = useState<string | null>(null);

  useEffect(() => {
    if (selectedOutpost && trackingDate) fetchData();
  }, [selectedOutpost, trackingDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("equipment_tracking")
        .select("*")
        .eq("outpost", selectedOutpost)
        .eq("tracking_date", trackingDate);

      if (error) throw error;

      const fullList: EquipmentItem[] = ITEM_TYPES.map(type => {
        const existing = data?.find(d => d.item_type === type.value);
        return {
          id: existing?.id,
          outpost: selectedOutpost,
          item_type: type.value,
          expected_quantity: existing?.expected_quantity ?? 0,
          actual_quantity: existing?.actual_quantity ?? 0,
          serial_numbers: existing?.serial_numbers ?? [],
          notes: existing?.notes ?? "",
        };
      });
      setItems(fullList);
    } catch (err) {
      console.error(err);
      toast.error("שגיאה בטעינת הנתונים");
    } finally {
      setLoading(false);
    }
  };

  const updateItem = (itemType: string, field: keyof EquipmentItem, value: any) => {
    setItems(prev => prev.map(item =>
      item.item_type === itemType ? { ...item, [field]: value } : item
    ));
  };

  const updateSerialNumber = (itemType: string, index: number, value: string) => {
    setItems(prev => prev.map(item => {
      if (item.item_type !== itemType) return item;
      const serials = [...item.serial_numbers];
      serials[index] = value;
      return { ...item, serial_numbers: serials };
    }));
  };

  const addSerialNumber = (itemType: string) => {
    setItems(prev => prev.map(item => {
      if (item.item_type !== itemType) return item;
      return { ...item, serial_numbers: [...item.serial_numbers, ""] };
    }));
  };

  const removeSerialNumber = (itemType: string, index: number) => {
    setItems(prev => prev.map(item => {
      if (item.item_type !== itemType) return item;
      const serials = item.serial_numbers.filter((_, i) => i !== index);
      return { ...item, serial_numbers: serials };
    }));
  };

  const saveAll = async () => {
    if (!selectedOutpost) return;
    setSaving(true);
    try {
      for (const item of items) {
        const payload: any = {
          outpost: selectedOutpost,
          item_type: item.item_type,
          actual_quantity: item.actual_quantity,
          serial_numbers: item.serial_numbers.filter(s => s.trim() !== ""),
          notes: item.notes,
          created_by: user?.id,
          tracking_date: trackingDate,
        };

        // Only admin can set expected_quantity
        if (isAdmin) {
          payload.expected_quantity = item.expected_quantity;
        }

        if (item.id) {
          const { error } = await supabase
            .from("equipment_tracking")
            .update(payload)
            .eq("id", item.id);
          if (error) throw error;
        } else {
          if (item.expected_quantity > 0 || item.actual_quantity > 0 || item.serial_numbers.length > 0) {
            if (!isAdmin) {
              payload.expected_quantity = 0;
            }
            const { error } = await supabase
              .from("equipment_tracking")
              .insert(payload);
            if (error) throw error;
          }
        }
      }
      toast.success("הנתונים נשמרו בהצלחה");
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error("שגיאה בשמירת הנתונים");
    } finally {
      setSaving(false);
    }
  };

  const getGap = (expected: number, actual: number) => expected - actual;

  const currentDialogItem = items.find(i => i.item_type === dialogItem);
  const currentDialogConfig = dialogItem ? getItemConfig(dialogItem) : null;

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 pb-24">
        <div className="px-4 py-6 space-y-6">
          <PageHeader
            title={'מעקב צל"ם'}
            subtitle="ניהול ומעקב ציוד לחימה מרוכז"
            icon={Crosshair}
          />

          {/* Outpost & Date Selection */}
          <Card className="p-4 bg-card/90 backdrop-blur-sm border-border space-y-3">
            <div>
              <Label className="text-sm font-bold mb-1 block text-foreground">בחר מוצב</Label>
              <Select value={selectedOutpost} onValueChange={setSelectedOutpost}>
                <SelectTrigger className="h-12 text-base font-semibold">
                  <SelectValue placeholder="בחר מוצב..." />
                </SelectTrigger>
                <SelectContent>
                  {OUTPOSTS.map(outpost => (
                    <SelectItem key={outpost} value={outpost} className="text-base">
                      {outpost}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-bold mb-1 block text-foreground flex items-center gap-1.5">
                <CalendarDays className="w-4 h-4" />
                תאריך דיווח
              </Label>
              <Input
                type="date"
                value={trackingDate}
                onChange={e => setTrackingDate(e.target.value)}
                className="h-12 text-base font-semibold bg-white text-slate-800"
              />
            </div>
          </Card>

          {/* Equipment Items Grid */}
          {selectedOutpost && !loading && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {items.map(item => {
                  const config = getItemConfig(item.item_type);
                  const gap = getGap(item.expected_quantity, item.actual_quantity);
                  const hasGap = gap > 0;

                  return (
                    <button
                      key={item.item_type}
                      onClick={() => setDialogItem(item.item_type)}
                      className="text-right"
                    >
                      <Card className={cn(
                        "p-3 transition-all duration-300 border-2",
                        hasGap
                          ? "border-destructive/40 bg-destructive/5"
                          : "border-border hover:border-primary/40"
                      )}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xl">{config?.icon}</span>
                          <span className="font-bold text-sm text-slate-800">{config?.label}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="text-xs text-slate-600">
                            {item.actual_quantity}/{item.expected_quantity}
                          </div>
                          {hasGap ? (
                            <Badge variant="destructive" className="text-xs px-1.5 py-0.5">
                              חסר {gap}
                            </Badge>
                          ) : item.expected_quantity > 0 ? (
                            <Badge className="bg-emerald-500 text-white text-xs px-1.5 py-0.5">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              תקין
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                              לא הוזן
                            </Badge>
                          )}
                        </div>
                      </Card>
                    </button>
                  );
                })}
              </div>

              {/* Save Button */}
              <Button
                onClick={saveAll}
                disabled={saving}
                className="w-full h-14 text-lg font-bold gap-2 bg-gradient-to-r from-primary to-primary/80 shadow-lg"
                size="lg"
              >
                <Save className="w-5 h-5" />
                {saving ? "שומר..." : "שמור הכל"}
              </Button>

              {/* Total Summary */}
              {items.some(i => i.expected_quantity > 0) && (
                <Card className="p-4 bg-gradient-to-br from-slate-800 to-slate-900 text-white border-0">
                  <h3 className="font-black text-base mb-3 flex items-center gap-2">
                    <Crosshair className="w-5 h-5" />
                    סיכום צל"ם - {selectedOutpost}
                  </h3>
                  <div className="space-y-2">
                    {items.filter(i => i.expected_quantity > 0).map(item => {
                      const config = getItemConfig(item.item_type);
                      const gap = getGap(item.expected_quantity, item.actual_quantity);
                      return (
                        <div key={item.item_type} className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2">
                            <span>{config?.icon}</span>
                            <span>{config?.label}</span>
                          </span>
                          <span className={cn(
                            "font-bold",
                            gap > 0 ? "text-red-400" : gap === 0 ? "text-emerald-400" : "text-amber-400"
                          )}>
                            {item.actual_quantity}/{item.expected_quantity}
                            {gap > 0 && ` (חסר ${gap})`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              )}
            </div>
          )}

          {loading && (
            <div className="text-center py-12">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-3" />
              <p className="text-muted-foreground">טוען נתונים...</p>
            </div>
          )}

          {!selectedOutpost && (
            <div className="text-center py-16">
              <Crosshair className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-slate-700 font-bold">בחר מוצב כדי להתחיל</p>
              <p className="text-sm text-slate-500 mt-1">ניהול ומעקב ציוד לחימה מרוכז לפי מוצב</p>
            </div>
          )}
        </div>
      </div>

      {/* Item Detail Dialog */}
      <Dialog open={!!dialogItem} onOpenChange={open => !open && setDialogItem(null)}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto bg-white text-slate-800">
          {currentDialogItem && currentDialogConfig && (() => {
            const item = currentDialogItem;
            const config = currentDialogConfig;
            const gap = getGap(item.expected_quantity, item.actual_quantity);

            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-3 text-slate-800">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br text-white text-lg shadow-lg",
                      config.color
                    )}>
                      {config.icon}
                    </div>
                    <div>
                      <div className="font-black text-lg">{config.label}</div>
                      <div className="text-sm text-slate-500 font-normal">{selectedOutpost} • {trackingDate}</div>
                    </div>
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-5 mt-2">
                  {/* Quantities */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-bold mb-1 block text-slate-700">כמות צפויה</Label>
                      <Input
                        type="number"
                        min={0}
                        value={item.expected_quantity}
                        onChange={e => updateItem(dialogItem!, "expected_quantity", parseInt(e.target.value) || 0)}
                        className="h-12 text-center text-lg font-bold bg-white text-slate-800"
                        disabled={!isAdmin}
                      />
                      {!isAdmin && (
                        <p className="text-xs text-slate-400 mt-1 text-center">נקבע ע"י מנהל מ"פ</p>
                      )}
                    </div>
                    <div>
                      <Label className="text-sm font-bold mb-1 block text-slate-700">כמות בשטח</Label>
                      <Input
                        type="number"
                        min={0}
                        value={item.actual_quantity}
                        onChange={e => updateItem(dialogItem!, "actual_quantity", parseInt(e.target.value) || 0)}
                        className="h-12 text-center text-lg font-bold bg-white text-slate-800"
                      />
                    </div>
                  </div>

                  {/* Gap Display */}
                  {item.expected_quantity > 0 && (
                    <div className={cn(
                      "rounded-xl p-3 flex items-center gap-3",
                      gap > 0
                        ? "bg-red-50 border border-red-300"
                        : gap === 0
                          ? "bg-emerald-50 border border-emerald-300"
                          : "bg-amber-50 border border-amber-300"
                    )}>
                      {gap > 0 ? (
                        <>
                          <AlertTriangle className="w-5 h-5 text-red-600" />
                          <span className="font-bold text-red-700">פער: חסרים {gap} פריטים</span>
                        </>
                      ) : gap === 0 ? (
                        <>
                          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                          <span className="font-bold text-emerald-700">הכמות תקינה - אין פער</span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-5 h-5 text-amber-600" />
                          <span className="font-bold text-amber-700">עודף של {Math.abs(gap)} פריטים</span>
                        </>
                      )}
                    </div>
                  )}

                  {/* Serial Numbers - auto-generated based on actual_quantity */}
                  {config.hasSerials && item.actual_quantity > 0 && (
                    <div className="space-y-3">
                      <Label className="text-sm font-bold flex items-center gap-2 text-slate-700">
                        <Hash className="w-4 h-4" />
                        מספרי צ' ({item.actual_quantity} פריטים)
                      </Label>
                      <div className="bg-slate-50 rounded-xl p-3 space-y-2">
                        {Array.from({ length: item.actual_quantity }).map((_, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <span className="text-xs text-slate-500 font-bold w-6 text-center">{idx + 1}</span>
                            <Input
                              value={item.serial_numbers[idx] || ""}
                              onChange={e => {
                                // Ensure serial_numbers array is long enough
                                const newSerials = [...item.serial_numbers];
                                while (newSerials.length <= idx) newSerials.push("");
                                newSerials[idx] = e.target.value;
                                updateItem(dialogItem!, "serial_numbers", newSerials);
                              }}
                              placeholder={`הזן מספר צ' ${idx + 1}`}
                              className="flex-1 bg-white text-slate-800"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {config.hasSerials && item.actual_quantity === 0 && (
                    <p className="text-sm text-slate-400 text-center py-3 bg-slate-50 rounded-xl">
                      הזן כמות בשטח כדי להזין מספרי צ'
                    </p>
                  )}

                  {/* Notes */}
                  <div>
                    <Label className="text-sm font-bold mb-1 block text-slate-700">הערות</Label>
                    <Input
                      value={item.notes}
                      onChange={e => updateItem(dialogItem!, "notes", e.target.value)}
                      placeholder="הערות נוספות..."
                      className="bg-white text-slate-800"
                    />
                  </div>

                  {/* Save inside dialog */}
                  <Button
                    onClick={() => { saveAll(); setDialogItem(null); }}
                    disabled={saving}
                    className="w-full h-12 text-base font-bold gap-2 bg-gradient-to-r from-primary to-primary/80 shadow-lg mt-2"
                  >
                    <Save className="w-5 h-5" />
                    {saving ? "שומר..." : "שמור"}
                  </Button>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}