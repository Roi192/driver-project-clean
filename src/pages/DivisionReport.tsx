import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { BRIGADES, BRIGADE_CODES, BrigadeCode } from "@/lib/brigades";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet, ChevronLeft, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { he } from "date-fns/locale";

interface Row {
  code: BrigadeCode;
  safetyEvents: number;
  accidents: number;
  stuck: number;
  rollovers: number;
  other: number;
  interviews: number;
  punishments: number;
  warnings: number;
  avgSafetyScore: number | null;
}

type Preset = "month" | "quarter" | "year" | "all" | "custom";

const todayIso = () => new Date().toISOString().slice(0, 10);
const monthsAgoIso = (m: number) => {
  const d = new Date();
  d.setMonth(d.getMonth() - m);
  return d.toISOString().slice(0, 10);
};

const DivisionReport = () => {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [preset, setPreset] = useState<Preset>("month");
  const [from, setFrom] = useState<string>(monthsAgoIso(1));
  const [to, setTo] = useState<string>(todayIso());
  // Drill-down dialog state
  const [drillBrigade, setDrillBrigade] = useState<BrigadeCode | null>(null);
  const [drillLoading, setDrillLoading] = useState(false);
  const [drillAccidents, setDrillAccidents] = useState<any[]>([]);
  const [drillEvents, setDrillEvents] = useState<any[]>([]);
  const [drillPunishments, setDrillPunishments] = useState<any[]>([]);

  const openBrigadeDetails = async (code: BrigadeCode) => {
    setDrillBrigade(code);
    setDrillLoading(true);
    setDrillAccidents([]); setDrillEvents([]); setDrillPunishments([]);
    try {
      const acQ = supabase.from("accidents")
        .select("id, accident_date, incident_type, severity, driver_name, vehicle_number, location, description, soldiers(full_name, personal_number)")
        .eq("brigade", code)
        .order("accident_date", { ascending: false });
      const evQ = supabase.from("safety_content")
        .select("id, event_date, event_type, severity, driver_name, vehicle_number, region, outpost, description, title")
        .eq("brigade", code).eq("category", "sector_events")
        .order("event_date", { ascending: false });
      const puQ = supabase.from("punishments")
        .select("id, punishment_date, punishment_type, reason, days, soldiers(full_name, personal_number)")
        .eq("brigade", code)
        .order("punishment_date", { ascending: false }).limit(100);
      const filterDate = (q: any, col: string) => {
        if (from) q = q.gte(col, from);
        if (to) q = q.lte(col, to);
        return q;
      };
      const [ac, ev, pu] = await Promise.all([
        filterDate(acQ, "accident_date"),
        filterDate(evQ, "event_date"),
        filterDate(puQ, "punishment_date"),
      ]);
      if (ac.error) throw ac.error;
      if (ev.error) throw ev.error;
      if (pu.error) throw pu.error;
      setDrillAccidents(ac.data || []);
      setDrillEvents(ev.data || []);
      setDrillPunishments(pu.data || []);
    } catch (e: any) {
      toast.error(`שגיאה: ${e?.message || e}`);
    } finally {
      setDrillLoading(false);
    }
  };

  const incidentLabel = (t?: string) =>
    t === "rollover" ? "התהפכות" : t === "stuck" ? "התחפרות" : t === "accident" ? "תאונת דרכים" : (t || "—");

  const applyPreset = (p: Preset) => {
    setPreset(p);
    if (p === "month") { setFrom(monthsAgoIso(1)); setTo(todayIso()); }
    else if (p === "quarter") { setFrom(monthsAgoIso(3)); setTo(todayIso()); }
    else if (p === "year") { setFrom(monthsAgoIso(12)); setTo(todayIso()); }
    else if (p === "all") { setFrom(""); setTo(""); }
  };

  useEffect(() => {
    setLoading(true);
    (async () => {
      try {
        const data = await Promise.all(
          BRIGADE_CODES.map(async (code) => {
            const seQ = supabase.from("safety_content").select("id", { count: "exact", head: true })
              .eq("brigade", code).eq("category", "sector_events");
            const acQ = (incident?: string) => {
              let q = supabase.from("accidents").select("id", { count: "exact", head: true }).eq("brigade", code);
              if (incident) q = q.eq("incident_type", incident);
              return q;
            };
            const acOtherQ = supabase.from("accidents").select("id", { count: "exact", head: true })
              .eq("brigade", code).not("incident_type", "in", "(accident,stuck,rollover)");
            const diQ = supabase.from("driver_interviews").select("id", { count: "exact", head: true }).eq("brigade", code);
            const puQ = supabase.from("punishments").select("id", { count: "exact", head: true }).eq("brigade", code);
            const wrQ = supabase.from("soldier_warnings").select("id", { count: "exact", head: true }).eq("brigade", code);
            const scQ = supabase.from("monthly_safety_scores").select("safety_score").eq("brigade", code);

            // Date filters
            const dateRange = (q: any, col: string) => {
              if (from) q = q.gte(col, from);
              if (to) q = q.lte(col, to);
              return q;
            };

            const [se, ac, st, ro, oth, di, pu, wr, sc] = await Promise.all([
              dateRange(seQ, "event_date"),
              dateRange(acQ("accident"), "accident_date"),
              dateRange(acQ("stuck"), "accident_date"),
              dateRange(acQ("rollover"), "accident_date"),
              dateRange(acOtherQ, "accident_date"),
              dateRange(diQ, "created_at"),
              dateRange(puQ, "punishment_date"),
              dateRange(wrQ, "created_at"),
              dateRange(scQ, "score_month"),
            ]);
            const scores = (sc.data || []) as { safety_score: number }[];
            const avg = scores.length ? Math.round(scores.reduce((s, r) => s + r.safety_score, 0) / scores.length) : null;

            return {
              code,
              safetyEvents: se.count || 0,
              accidents: ac.count || 0,
              stuck: st.count || 0,
              rollovers: ro.count || 0,
              other: oth.count || 0,
              interviews: di.count || 0,
              punishments: pu.count || 0,
              warnings: wr.count || 0,
              avgSafetyScore: avg,
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
  }, [from, to]);

  const exportCsv = () => {
    const header = ["חטיבה", "אירועי בטיחות", "תאונות דרכים", "התחפרות", "התהפכות", "אחר", "ראיונות נהגים", "ענישה", "אזהרות", "ממוצע ציון בטיחות"];
    const lines = [header.join(",")];
    rows.forEach((r) => {
      lines.push(
        [BRIGADES[r.code].name, r.safetyEvents, r.accidents, r.stuck, r.rollovers, r.other, r.interviews, r.punishments, r.warnings, r.avgSafetyScore ?? "—"].join(",")
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
              <p className="text-slate-600 text-sm mt-1">כל הנתונים מסונכרנים מהאירועים והתאונות שמוזנים בכל חטיבה</p>
            </div>
            <Button onClick={exportCsv} disabled={loading} className="bg-primary hover:bg-primary/90 text-white font-bold">
              <Download className="w-4 h-4 ml-2" />
              ייצוא ל-Excel
            </Button>
          </div>

          <Card className="bg-white border-2 border-slate-200 shadow-md p-4">
            <div className="flex flex-wrap items-center gap-2">
              {([
                { id: "month", label: "חודש" },
                { id: "quarter", label: "רבעון" },
                { id: "year", label: "שנה" },
                { id: "all", label: "הכל" },
              ] as { id: Preset; label: string }[]).map((p) => (
                <Button
                  key={p.id}
                  variant={preset === p.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => applyPreset(p.id)}
                  className="font-bold"
                >
                  {p.label}
                </Button>
              ))}
              <div className="flex items-center gap-2 mr-auto">
                <span className="text-xs text-slate-700 font-bold">מ-</span>
                <Input type="date" value={from} onChange={(e) => { setPreset("custom"); setFrom(e.target.value); }} className="h-9 w-40" />
                <span className="text-xs text-slate-700 font-bold">עד</span>
                <Input type="date" value={to} onChange={(e) => { setPreset("custom"); setTo(e.target.value); }} className="h-9 w-40" />
              </div>
            </div>
          </Card>

          <Card className="bg-white border-2 border-slate-200 shadow-md overflow-hidden">
            <div className="overflow-auto max-h-[calc(100vh-220px)]">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 sticky top-0">
                  <tr className="text-right text-slate-800 font-black">
                    <th className="p-3 whitespace-nowrap">חטיבה</th>
                    <th className="p-3 whitespace-nowrap">אירועי בטיחות</th>
                    <th className="p-3 whitespace-nowrap">תאונות דרכים</th>
                    <th className="p-3 whitespace-nowrap">התחפרות</th>
                    <th className="p-3 whitespace-nowrap">התהפכות</th>
                    <th className="p-3 whitespace-nowrap">אחר</th>
                    <th className="p-3 whitespace-nowrap">ראיונות נהגים</th>
                    <th className="p-3 whitespace-nowrap">ענישה</th>
                    <th className="p-3 whitespace-nowrap">אזהרות</th>
                    <th className="p-3 whitespace-nowrap">ממוצע ציון בטיחות</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-slate-600">טוען...</td>
                    </tr>
                  ) : (
                    rows.map((r) => (
                      <tr
                        key={r.code}
                        className="border-t border-slate-200 hover:bg-primary/5 cursor-pointer transition"
                        onClick={() => openBrigadeDetails(r.code)}
                      >
                        <td className="p-3 font-bold text-slate-900 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 text-primary hover:underline">
                            <ChevronLeft className="w-4 h-4" />
                            {BRIGADES[r.code].name}
                          </span>
                        </td>
                        <td className="p-3 text-slate-800">{r.safetyEvents}</td>
                        <td className="p-3 text-slate-800">{r.accidents}</td>
                        <td className="p-3 text-slate-800">{r.stuck}</td>
                        <td className="p-3 text-slate-800">{r.rollovers}</td>
                        <td className="p-3 text-slate-800">{r.other}</td>
                        <td className="p-3 text-slate-800">{r.interviews}</td>
                        <td className="p-3 text-slate-800">{r.punishments}</td>
                        <td className="p-3 text-slate-800">{r.warnings}</td>
                        <td className="p-3 text-slate-800 font-bold">{r.avgSafetyScore ?? "—"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          <Dialog open={!!drillBrigade} onOpenChange={(o) => !o && setDrillBrigade(null)}>
            <DialogContent dir="rtl" className="max-w-3xl bg-white max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-slate-900 text-xl font-black flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-primary" />
                  פירוט מלא – {drillBrigade ? BRIGADES[drillBrigade].name : ""}
                </DialogTitle>
              </DialogHeader>
              {drillLoading ? (
                <div className="text-center text-slate-700 py-8">טוען נתונים...</div>
              ) : (
                <div className="space-y-6">
                  <section>
                    <h3 className="font-black text-slate-800 mb-2">תאונות / אירועי תנועה ({drillAccidents.length})</h3>
                    {drillAccidents.length === 0 ? (
                      <p className="text-sm text-slate-600">אין רשומות בתקופה הנבחרת.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead className="bg-slate-100 text-slate-800 font-bold">
                            <tr>
                              <th className="p-2 text-right">תאריך</th>
                              <th className="p-2 text-right">סוג</th>
                              <th className="p-2 text-right">חומרה</th>
                              <th className="p-2 text-right">נהג</th>
                              <th className="p-2 text-right">רכב</th>
                              <th className="p-2 text-right">מיקום</th>
                            </tr>
                          </thead>
                          <tbody>
                            {drillAccidents.map((r) => (
                              <tr key={r.id} className="border-t border-slate-200">
                                <td className="p-2 text-slate-800">{r.accident_date ? format(parseISO(r.accident_date), "dd/MM/yyyy", { locale: he }) : "—"}</td>
                                <td className="p-2 text-slate-800">{incidentLabel(r.incident_type)}</td>
                                <td className="p-2 text-slate-800">{r.severity || "—"}</td>
                                <td className="p-2 text-slate-800">{r.soldiers?.full_name || r.driver_name || "—"}</td>
                                <td className="p-2 text-slate-800">{r.vehicle_number || "—"}</td>
                                <td className="p-2 text-slate-800">{r.location || "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </section>

                  <section>
                    <h3 className="font-black text-slate-800 mb-2">אירועי בטיחות (גזרתיים) ({drillEvents.length})</h3>
                    {drillEvents.length === 0 ? (
                      <p className="text-sm text-slate-600">אין רשומות בתקופה הנבחרת.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead className="bg-slate-100 text-slate-800 font-bold">
                            <tr>
                              <th className="p-2 text-right">תאריך</th>
                              <th className="p-2 text-right">סוג</th>
                              <th className="p-2 text-right">חומרה</th>
                              <th className="p-2 text-right">גזרה</th>
                              <th className="p-2 text-right">מוצב</th>
                              <th className="p-2 text-right">כותרת</th>
                            </tr>
                          </thead>
                          <tbody>
                            {drillEvents.map((r) => (
                              <tr key={r.id} className="border-t border-slate-200">
                                <td className="p-2 text-slate-800">{r.event_date ? format(parseISO(r.event_date), "dd/MM/yyyy", { locale: he }) : "—"}</td>
                                <td className="p-2 text-slate-800">{incidentLabel(r.event_type)}</td>
                                <td className="p-2 text-slate-800">{r.severity || "—"}</td>
                                <td className="p-2 text-slate-800">{r.region || "—"}</td>
                                <td className="p-2 text-slate-800">{r.outpost || "—"}</td>
                                <td className="p-2 text-slate-800">{r.title || "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </section>

                  <section>
                    <h3 className="font-black text-slate-800 mb-2">ענישה ({drillPunishments.length})</h3>
                    {drillPunishments.length === 0 ? (
                      <p className="text-sm text-slate-600">אין רשומות בתקופה הנבחרת.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead className="bg-slate-100 text-slate-800 font-bold">
                            <tr>
                              <th className="p-2 text-right">תאריך</th>
                              <th className="p-2 text-right">חייל</th>
                              <th className="p-2 text-right">סוג</th>
                              <th className="p-2 text-right">ימים</th>
                              <th className="p-2 text-right">סיבה</th>
                            </tr>
                          </thead>
                          <tbody>
                            {drillPunishments.map((r) => (
                              <tr key={r.id} className="border-t border-slate-200">
                                <td className="p-2 text-slate-800">{r.punishment_date ? format(parseISO(r.punishment_date), "dd/MM/yyyy", { locale: he }) : "—"}</td>
                                <td className="p-2 text-slate-800">{r.soldiers?.full_name || "—"}</td>
                                <td className="p-2 text-slate-800">{r.punishment_type || "—"}</td>
                                <td className="p-2 text-slate-800">{r.days ?? "—"}</td>
                                <td className="p-2 text-slate-800">{r.reason || "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </section>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </AppLayout>
  );
};

export default DivisionReport;