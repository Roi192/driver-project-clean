import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useHagmarSettlement } from "@/hooks/useHagmarSettlement";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { Package, Save, AlertTriangle, MapPin, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";
import { HAGMAR_ALL_SETTLEMENTS, HAGMAR_AMLACH_ITEMS, getRegionFromSettlement } from "@/lib/hagmar-constants";
import * as XLSX from "xlsx";

interface ExpectedItem { id: string; settlement: string; item_name: string; expected_quantity: number; }
interface ReportItem {
  id: string; settlement: string; item_name: string; actual_quantity: number;
  is_functional: boolean; malfunction_description: string | null;
  reported_to: string | null; report_date: string | null;
  notes: string | null; item_subtype: string | null;
}

export default function HagmarAmlach() {
  const { user, isHagmarAdmin, isSuperAdmin } = useAuth();
  const { userSettlement, isRestricted } = useHagmarSettlement();
  const isManager = isHagmarAdmin || isSuperAdmin;
  const canReport = isManager || !isManager; // ravshatz can also report

  const [expected, setExpected] = useState<ExpectedItem[]>([]);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSettlement, setSelectedSettlement] = useState<string>(userSettlement || "");
  const [localReports, setLocalReports] = useState<Map<string, Partial<ReportItem>>>(new Map());

  useEffect(() => { fetchData(); }, []);
  useEffect(() => { if (userSettlement && !selectedSettlement) setSelectedSettlement(userSettlement); }, [userSettlement]);

  const fetchData = async () => {
    setLoading(true);
    const [expRes, repRes] = await Promise.all([
      supabase.from("hagmar_equipment_expected").select("*"),
      supabase.from("hagmar_equipment_reports").select("*"),
    ]);
    setExpected((expRes.data || []) as ExpectedItem[]);
    setReports((repRes.data || []) as ReportItem[]);
    setLoading(false);
  };

  const allSettlements = useMemo(() => isRestricted && userSettlement ? [userSettlement] : HAGMAR_ALL_SETTLEMENTS, [isRestricted, userSettlement]);

  const settlementExpected = useMemo(() => expected.filter(e => e.settlement === selectedSettlement), [expected, selectedSettlement]);
  const settlementReports = useMemo(() => reports.filter(r => r.settlement === selectedSettlement), [reports, selectedSettlement]);

  const getExpected = (itemName: string) => settlementExpected.find(e => e.item_name === itemName)?.expected_quantity || 0;
  const getReport = (itemName: string) => settlementReports.find(r => r.item_name === itemName);

  const readinessPercent = useMemo(() => {
    if (!selectedSettlement) return 0;
    let totalExpected = 0, totalActual = 0;
    HAGMAR_AMLACH_ITEMS.forEach(item => {
      const exp = getExpected(item.name);
      const rep = getReport(item.name);
      totalExpected += exp;
      totalActual += Math.min(rep?.actual_quantity || 0, exp);
    });
    return totalExpected > 0 ? Math.round((totalActual / totalExpected) * 100) : 0;
  }, [selectedSettlement, settlementExpected, settlementReports]);

  const saveExpected = async (itemName: string, qty: number) => {
    if (!selectedSettlement) return;
    const { error } = await supabase.from("hagmar_equipment_expected").upsert(
      { settlement: selectedSettlement, item_name: itemName, expected_quantity: qty, created_by: user?.id },
      { onConflict: "settlement,item_name" }
    );
    if (error) { toast.error("שגיאה בשמירה"); return; }
    toast.success("נשמר");
    fetchData();
  };

  const saveReport = async (itemName: string, data: Partial<ReportItem>) => {
    if (!selectedSettlement) return;
    const existing = getReport(itemName);
    const payload = {
      settlement: selectedSettlement,
      item_name: itemName,
      actual_quantity: data.actual_quantity ?? 0,
      is_functional: data.is_functional ?? true,
      malfunction_description: data.malfunction_description || null,
      reported_to: data.reported_to || null,
      report_date: data.report_date || null,
      notes: data.notes || null,
      item_subtype: data.item_subtype || null,
      reported_by: user?.id,
    };

    if (existing) {
      const { error } = await supabase.from("hagmar_equipment_reports").update(payload).eq("id", existing.id);
      if (error) { toast.error("שגיאה"); return; }
    } else {
      const { error } = await supabase.from("hagmar_equipment_reports").insert(payload);
      if (error) { toast.error("שגיאה"); return; }
    }
    toast.success("דיווח נשמר");
    fetchData();
  };

  const exportToExcel = () => {
    const rows = HAGMAR_AMLACH_ITEMS.map(item => {
      const exp = getExpected(item.name);
      const rep = getReport(item.name);
      return {
        "ישוב": selectedSettlement,
        "פריט": item.name,
        "צפוי": exp,
        "בפועל": rep?.actual_quantity || 0,
        "תקין": rep?.is_functional ? "כן" : "לא",
        "תקלה": rep?.malfunction_description || "",
        "דווח ל": rep?.reported_to || "",
        "הערות": rep?.notes || "",
      };
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "אמלח");
    XLSX.writeFile(wb, `אמלח_${selectedSettlement}_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
  };

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-br from-white via-amber-50/30 to-white pb-24" dir="rtl">
        <div className="px-4 py-6 space-y-5">
          <PageHeader title='אמל"ח ביישוב' subtitle="ניהול ומעקב ציוד מלחמתי" icon={Package} />

          <div className="flex gap-2">
            <Select value={selectedSettlement} onValueChange={setSelectedSettlement}>
              <SelectTrigger className="flex-1 h-11"><SelectValue placeholder="בחר ישוב" /></SelectTrigger>
              <SelectContent>{allSettlements.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
            <Button variant="outline" onClick={exportToExcel} className="h-11 gap-2" disabled={!selectedSettlement}>
              <FileSpreadsheet className="w-4 h-4" /> Excel
            </Button>
          </div>

          {selectedSettlement && (
            <Card className={`p-4 border-0 shadow-lg ${readinessPercent >= 80 ? 'bg-gradient-to-br from-emerald-500 to-teal-600' : readinessPercent >= 50 ? 'bg-gradient-to-br from-amber-500 to-orange-600' : 'bg-gradient-to-br from-red-500 to-rose-600'} text-white`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold opacity-80">כשירות אמל"ח - {selectedSettlement}</span>
                <span className="text-3xl font-black">{readinessPercent}%</span>
              </div>
              <div className="w-full h-3 rounded-full bg-white/20 overflow-hidden">
                <div className="h-full rounded-full bg-white/80 transition-all" style={{ width: `${readinessPercent}%` }} />
              </div>
            </Card>
          )}

          {loading ? (
            <div className="text-center py-12"><div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full mx-auto" /></div>
          ) : !selectedSettlement ? (
            <div className="text-center py-12"><MapPin className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" /><p className="font-bold">בחר ישוב להצגת הציוד</p></div>
          ) : (
            <div className="space-y-2">
              {HAGMAR_AMLACH_ITEMS.map(item => {
                const exp = getExpected(item.name);
                const rep = getReport(item.name);
                const actual = rep?.actual_quantity || 0;
                const hasShortage = actual < exp && exp > 0;
                const isMalfunction = rep?.is_functional === false;

                return (
                  <Card key={item.name} className={`p-3 ${hasShortage || isMalfunction ? 'border-red-200 bg-red-50/50' : 'border-border'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold text-foreground text-sm">{item.name}</h3>
                      {(hasShortage || isMalfunction) && <AlertTriangle className="w-4 h-4 text-red-500" />}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {isManager && (
                        <div>
                          <Label className="text-xs">צפוי</Label>
                          <Input type="number" className="h-8 text-sm" value={exp} min={0}
                            onChange={e => saveExpected(item.name, Number(e.target.value))} />
                        </div>
                      )}
                      <div>
                        <Label className="text-xs">בפועל</Label>
                        <Input type="number" className="h-8 text-sm" value={actual} min={0}
                          onChange={e => {
                            const newData = { ...(rep || {}), actual_quantity: Number(e.target.value) };
                            saveReport(item.name, newData);
                          }} />
                      </div>
                    </div>

                    {item.hasSubtype && (
                      <div className="mt-1">
                        <Input className="h-7 text-xs" placeholder={item.subtypeLabel} value={rep?.item_subtype || ""}
                          onChange={e => saveReport(item.name, { ...(rep || {}), item_subtype: e.target.value, actual_quantity: actual })} />
                      </div>
                    )}

                    <div className="flex items-center gap-2 mt-2">
                      <Switch checked={rep?.is_functional !== false}
                        onCheckedChange={v => saveReport(item.name, { ...(rep || {}), is_functional: v, actual_quantity: actual })} />
                      <Label className="text-xs">{rep?.is_functional !== false ? "תקין" : "תקול"}</Label>
                    </div>

                    {rep?.is_functional === false && (
                      <div className="mt-1 space-y-1">
                        <Input className="h-7 text-xs" placeholder="תיאור התקלה" value={rep?.malfunction_description || ""}
                          onChange={e => saveReport(item.name, { ...rep, malfunction_description: e.target.value })} />
                        <Input className="h-7 text-xs" placeholder="דווח ל..." value={rep?.reported_to || ""}
                          onChange={e => saveReport(item.name, { ...rep, reported_to: e.target.value })} />
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}