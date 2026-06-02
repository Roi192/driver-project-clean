import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { BRIGADES, BRIGADE_CODES, BrigadeCode } from "@/lib/brigades";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";

interface Row {
  code: BrigadeCode;
  safetyEvents: number;
  accidents: number;
  soldiers: number;
  parades: number;
  exitRequests: number;
  warnings: number;
  interviews: number;
}

const DivisionReport = () => {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const data = await Promise.all(
          BRIGADE_CODES.map(async (code) => {
            const [se, ac, sol, par, ex, wr, di] = await Promise.all([
              supabase.from("safety_events").select("id", { count: "exact", head: true }).eq("brigade", code),
              supabase.from("accidents").select("id", { count: "exact", head: true }).eq("brigade", code),
              supabase.from("soldiers").select("id", { count: "exact", head: true }).eq("brigade", code).eq("is_active", true),
              supabase.from("cleaning_parades").select("id", { count: "exact", head: true }).eq("brigade", code),
              supabase.from("exit_requests").select("id", { count: "exact", head: true }).eq("brigade", code),
              supabase.from("soldier_warnings").select("id", { count: "exact", head: true }).eq("brigade", code),
              supabase.from("driver_interviews").select("id", { count: "exact", head: true }).eq("brigade", code),
            ]);
            return {
              code,
              safetyEvents: se.count || 0,
              accidents: ac.count || 0,
              soldiers: sol.count || 0,
              parades: par.count || 0,
              exitRequests: ex.count || 0,
              warnings: wr.count || 0,
              interviews: di.count || 0,
            } as Row;
          })
        );
        setRows(data);
      } catch (e: any) {
        toast.error(`שגיאה: ${e?.message || e}`);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const exportCsv = () => {
    const header = ["חטיבה", "אירועי בטיחות", "תאונות", "חיילים פעילים", "מסדרי ניקיון", "בקשות יציאה", "אזהרות", "ראיונות"];
    const lines = [header.join(",")];
    rows.forEach((r) => {
      lines.push(
        [BRIGADES[r.code].name, r.safetyEvents, r.accidents, r.soldiers, r.parades, r.exitRequests, r.warnings, r.interviews].join(",")
      );
    });
    const csv = "\uFEFF" + lines.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `division-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppLayout>
      <div className="min-h-screen bg-slate-50 pt-20 pb-24" dir="rtl">
        <div className="max-w-6xl mx-auto px-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                <FileSpreadsheet className="w-7 h-7 text-primary" />
                דוח אוגדתי מרוכז
              </h1>
              <p className="text-slate-600 text-sm mt-1">השוואה בין כל חטיבות איו"ש</p>
            </div>
            <Button onClick={exportCsv} disabled={loading} className="bg-primary hover:bg-primary/90 text-white font-bold">
              <Download className="w-4 h-4 ml-2" />
              ייצוא ל-Excel
            </Button>
          </div>

          <Card className="bg-white border-2 border-slate-200 shadow-md overflow-hidden">
            <div className="overflow-auto max-h-[calc(100vh-220px)]">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 sticky top-0">
                  <tr className="text-right text-slate-800 font-black">
                    <th className="p-3 whitespace-nowrap">חטיבה</th>
                    <th className="p-3 whitespace-nowrap">אירועי בטיחות</th>
                    <th className="p-3 whitespace-nowrap">תאונות</th>
                    <th className="p-3 whitespace-nowrap">חיילים פעילים</th>
                    <th className="p-3 whitespace-nowrap">מסדרי ניקיון</th>
                    <th className="p-3 whitespace-nowrap">בקשות יציאה</th>
                    <th className="p-3 whitespace-nowrap">אזהרות</th>
                    <th className="p-3 whitespace-nowrap">ראיונות נהגים</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-600">טוען...</td>
                    </tr>
                  ) : (
                    rows.map((r) => (
                      <tr key={r.code} className="border-t border-slate-200 hover:bg-slate-50">
                        <td className="p-3 font-bold text-slate-900 whitespace-nowrap">{BRIGADES[r.code].name}</td>
                        <td className="p-3 text-slate-800">{r.safetyEvents}</td>
                        <td className="p-3 text-slate-800">{r.accidents}</td>
                        <td className="p-3 text-slate-800">{r.soldiers}</td>
                        <td className="p-3 text-slate-800">{r.parades}</td>
                        <td className="p-3 text-slate-800">{r.exitRequests}</td>
                        <td className="p-3 text-slate-800">{r.warnings}</td>
                        <td className="p-3 text-slate-800">{r.interviews}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};

export default DivisionReport;