import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { BRIGADES, BRIGADE_CODES, BrigadeCode } from "@/lib/brigades";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  Download,
  Search,
} from "lucide-react";
import { differenceInDays, parseISO, addYears, format } from "date-fns";
import { he } from "date-fns/locale";
import { toast } from "sonner";
import * as XLSX from "xlsx";

type FitnessStatus = "fit" | "warning" | "unfit";

interface SoldierRow {
  id: string;
  full_name: string;
  personal_number: string;
  outpost: string | null;
  brigade: string | null;
  military_license_expiry: string | null;
  civilian_license_expiry: string | null;
  defensive_driving_passed: boolean | null;
  correct_driving_in_service_date: string | null;
  qualified_date: string | null;
  is_active: boolean | null;
  military_status: FitnessStatus;
  civilian_status: FitnessStatus;
  correct_status: FitnessStatus;
  overall: FitnessStatus;
}

interface BrigadeFitness {
  code: BrigadeCode;
  total: number;
  militaryExpired: number;
  militarySoon: number;
  civilianExpired: number;
  noDefensive: number;
  correctDrivingDue: number;
  unfit: number;
  warning: number;
  fit: number;
  fitPct: number;
}

const getDateStatus = (d: string | null, daysWarn = 30): FitnessStatus => {
  if (!d) return "unfit";
  const days = differenceInDays(parseISO(d), new Date());
  if (days < 0) return "unfit";
  if (days <= daysWarn) return "warning";
  return "fit";
};

const getCorrectDrivingStatus = (s: { correct_driving_in_service_date: string | null; qualified_date: string | null }): FitnessStatus => {
  const ref = s.correct_driving_in_service_date ? parseISO(s.correct_driving_in_service_date) : s.qualified_date ? parseISO(s.qualified_date) : null;
  if (!ref) return "unfit";
  const days = differenceInDays(addYears(ref, 1), new Date());
  if (days < 0) return "unfit";
  if (days <= 60) return "warning";
  return "fit";
};

type DrillFilter =
  | { kind: "all" }
  | { kind: "militaryExpired" }
  | { kind: "militarySoon" }
  | { kind: "civilianExpired" }
  | { kind: "noDefensive" }
  | { kind: "correctDrivingDue" }
  | { kind: "unfit" };

const filterLabels: Record<DrillFilter["kind"], string> = {
  all: "כל החיילים",
  militaryExpired: "רישיון צבאי פג תוקף",
  militarySoon: "רישיון צבאי פג בקרוב (30 יום)",
  civilianExpired: "רישיון אזרחי פג תוקף",
  noDefensive: "לא עברו נהיגה מונעת",
  correctDrivingDue: "צריכים נהיגה נכונה בשירות",
  unfit: "לא כשירים (כללי)",
};

export default function DivisionFitness() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { realIsDivisionAdmin, loading: authLoading } = useAuth() as any;
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<SoldierRow[]>([]);
  const [drillBrigade, setDrillBrigade] = useState<BrigadeCode | null>(null);
  const [drillFilter, setDrillFilter] = useState<DrillFilter>({ kind: "all" });
  const [drillSearch, setDrillSearch] = useState("");
  const [globalFilter, setGlobalFilter] = useState<DrillFilter["kind"] | null>(null);

  // Apply ?filter=... from query string (drill-down from dashboard)
  useEffect(() => {
    const f = searchParams.get("filter") as DrillFilter["kind"] | null;
    if (f && f in filterLabels) setGlobalFilter(f);
    else setGlobalFilter(null);
  }, [searchParams]);

  useEffect(() => {
    if (!authLoading && !realIsDivisionAdmin) navigate("/");
  }, [authLoading, realIsDivisionAdmin, navigate]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        // Paginate to bypass 1000-row limit
        const all: any[] = [];
        let from = 0;
        const page = 1000;
        while (true) {
          const { data, error } = await supabase
            .from("soldiers")
            .select("id, full_name, personal_number, outpost, brigade, military_license_expiry, civilian_license_expiry, defensive_driving_passed, correct_driving_in_service_date, qualified_date, is_active")
            .eq("is_active", true)
            .order("full_name")
            .range(from, from + page - 1);
          if (error) throw error;
          all.push(...(data || []));
          if (!data || data.length < page) break;
          from += page;
        }
        const enriched: SoldierRow[] = all.map((s) => {
          const military = getDateStatus(s.military_license_expiry);
          const civilian = getDateStatus(s.civilian_license_expiry);
          const correct = getCorrectDrivingStatus(s);
          const arr = [military, civilian, correct];
          const overall: FitnessStatus = arr.includes("unfit") ? "unfit" : arr.includes("warning") ? "warning" : "fit";
          return { ...s, military_status: military, civilian_status: civilian, correct_status: correct, overall };
        });
        setRows(enriched);
      } catch (e: any) {
        toast.error(`שגיאה בטעינת נתוני כשירות: ${e?.message || e}`);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const perBrigade: BrigadeFitness[] = useMemo(() => {
    return BRIGADE_CODES.map((code) => {
      const list = rows.filter((r) => r.brigade === code);
      const today = new Date();
      const militaryExpired = list.filter((r) => r.military_status === "unfit").length;
      const militarySoon = list.filter((r) => r.military_status === "warning").length;
      const civilianExpired = list.filter((r) => r.civilian_status === "unfit").length;
      const noDefensive = list.filter((r) => !r.defensive_driving_passed).length;
      const correctDrivingDue = list.filter((r) => r.correct_status !== "fit").length;
      const unfit = list.filter((r) => r.overall === "unfit").length;
      const warning = list.filter((r) => r.overall === "warning").length;
      const fit = list.filter((r) => r.overall === "fit").length;
      const total = list.length;
      const fitPct = total === 0 ? 0 : Math.round((fit / total) * 100);
      return { code, total, militaryExpired, militarySoon, civilianExpired, noDefensive, correctDrivingDue, unfit, warning, fit, fitPct };
    });
  }, [rows]);

  const totals = useMemo(() => {
    return perBrigade.reduce(
      (acc, b) => ({
        total: acc.total + b.total,
        militaryExpired: acc.militaryExpired + b.militaryExpired,
        militarySoon: acc.militarySoon + b.militarySoon,
        civilianExpired: acc.civilianExpired + b.civilianExpired,
        noDefensive: acc.noDefensive + b.noDefensive,
        correctDrivingDue: acc.correctDrivingDue + b.correctDrivingDue,
        unfit: acc.unfit + b.unfit,
        fit: acc.fit + b.fit,
      }),
      { total: 0, militaryExpired: 0, militarySoon: 0, civilianExpired: 0, noDefensive: 0, correctDrivingDue: 0, unfit: 0, fit: 0 }
    );
  }, [perBrigade]);

  const openDrill = (code: BrigadeCode, kind: DrillFilter["kind"]) => {
    setDrillBrigade(code);
    setDrillFilter({ kind });
    setDrillSearch("");
  };

  const drillRows = useMemo(() => {
    if (!drillBrigade) return [];
    let list = rows.filter((r) => r.brigade === drillBrigade);
    switch (drillFilter.kind) {
      case "militaryExpired": list = list.filter((r) => r.military_status === "unfit"); break;
      case "militarySoon": list = list.filter((r) => r.military_status === "warning"); break;
      case "civilianExpired": list = list.filter((r) => r.civilian_status === "unfit"); break;
      case "noDefensive": list = list.filter((r) => !r.defensive_driving_passed); break;
      case "correctDrivingDue": list = list.filter((r) => r.correct_status !== "fit"); break;
      case "unfit": list = list.filter((r) => r.overall === "unfit"); break;
    }
    if (drillSearch.trim()) {
      const q = drillSearch.trim();
      list = list.filter((r) => r.full_name.includes(q) || r.personal_number.includes(q));
    }
    return list;
  }, [drillBrigade, drillFilter, drillSearch, rows]);

  // Global drill-down across all brigades (from dashboard KPI clicks)
  const globalRows = useMemo(() => {
    if (!globalFilter) return [];
    let list = rows.slice();
    switch (globalFilter) {
      case "militaryExpired": list = list.filter((r) => r.military_status === "unfit"); break;
      case "militarySoon": list = list.filter((r) => r.military_status === "warning"); break;
      case "civilianExpired": list = list.filter((r) => r.civilian_status === "unfit"); break;
      case "noDefensive": list = list.filter((r) => !r.defensive_driving_passed); break;
      case "correctDrivingDue": list = list.filter((r) => r.correct_status !== "fit"); break;
      case "unfit": list = list.filter((r) => r.overall === "unfit"); break;
    }
    return list;
  }, [globalFilter, rows]);

  const fmt = (d: string | null) => (d ? format(parseISO(d), "dd/MM/yyyy", { locale: he }) : "—");

  const exportAll = () => {
    const data = rows.map((r) => ({
      "חטיבה": r.brigade ? BRIGADES[r.brigade as BrigadeCode]?.name || r.brigade : "—",
      "שם": r.full_name,
      "מ.א": r.personal_number,
      "מוצב": r.outpost || "—",
      "רישיון צבאי": fmt(r.military_license_expiry),
      "רישיון אזרחי": fmt(r.civilian_license_expiry),
      "נהיגה מונעת": r.defensive_driving_passed ? "עבר" : "לא עבר",
      "נה\"נ בשירות": fmt(r.correct_driving_in_service_date),
      "סטטוס כללי": r.overall === "fit" ? "כשיר" : r.overall === "warning" ? "אזהרה" : "לא כשיר",
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "כשירות אוגדתית");
    XLSX.writeFile(wb, `כשירות_אוגדתית_${format(new Date(), "dd-MM-yyyy")}.xlsx`);
  };

  const statusPill = (n: number, tone: "red" | "amber" | "green" | "slate" = "slate") => {
    const cls = {
      red: "bg-red-100 text-red-700 border-red-300 hover:bg-red-200",
      amber: "bg-amber-100 text-amber-700 border-amber-300 hover:bg-amber-200",
      green: "bg-emerald-100 text-emerald-700 border-emerald-300 hover:bg-emerald-200",
      slate: "bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200",
    }[tone];
    return <span className={`inline-flex items-center justify-center min-w-[36px] px-2 py-1 rounded-lg text-sm font-black border ${cls}`}>{n}</span>;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 pb-24" dir="rtl">
      <div className="bg-gradient-to-l from-primary via-primary to-accent text-white px-4 pt-20 pb-8 shadow-xl">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center">
              <ShieldCheck className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black">כשירות נהגים אוגדתית</h1>
              <p className="text-sm text-white/80">השוואה בין החטיבות – לחץ על מספר לרשימה</p>
            </div>
          </div>
          <Button variant="secondary" onClick={() => navigate("/")} className="font-bold">
            <ArrowRight className="w-4 h-4 ml-1" /> חזרה
          </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 -mt-6 space-y-6">
        {/* Totals */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="p-4 bg-white border-2 border-slate-200 shadow-md">
            <div className="text-xs font-bold text-slate-600 mb-1">סה"כ נהגים פעילים</div>
            <div className="text-3xl font-black text-slate-900">{loading ? "—" : totals.total}</div>
          </Card>
          <Card className="p-4 bg-red-50 border-2 border-red-300 shadow-md">
            <div className="text-xs font-bold text-red-700 mb-1">לא כשירים</div>
            <div className="text-3xl font-black text-red-700">{loading ? "—" : totals.unfit}</div>
          </Card>
          <Card className="p-4 bg-amber-50 border-2 border-amber-300 shadow-md">
            <div className="text-xs font-bold text-amber-700 mb-1">רישיון צבאי פג בקרוב</div>
            <div className="text-3xl font-black text-amber-700">{loading ? "—" : totals.militarySoon}</div>
          </Card>
          <Card className="p-4 bg-slate-50 border-2 border-slate-300 shadow-md">
            <div className="text-xs font-bold text-slate-700 mb-1">לא עברו נהיגה מונעת</div>
            <div className="text-3xl font-black text-slate-800">{loading ? "—" : totals.noDefensive}</div>
          </Card>
        </div>

        <div className="flex justify-end">
          <Button onClick={exportAll} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
            <Download className="w-4 h-4 ml-1" /> ייצוא לאקסל
          </Button>
        </div>

        {/* Comparison table */}
        <Card className="bg-white border-2 border-slate-200 shadow-md overflow-hidden">
          <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 sticky top-0 z-10">
                <tr className="text-slate-800">
                  <th className="text-right px-3 py-3 font-black">חטיבה</th>
                  <th className="text-center px-3 py-3 font-black">סה"כ</th>
                  <th className="text-center px-3 py-3 font-black">רש' צבאי פג</th>
                  <th className="text-center px-3 py-3 font-black">פג בקרוב</th>
                  <th className="text-center px-3 py-3 font-black">רש' אזרחי פג</th>
                  <th className="text-center px-3 py-3 font-black">ללא נה"מ</th>
                  <th className="text-center px-3 py-3 font-black">נה"נ נדרשת</th>
                  <th className="text-center px-3 py-3 font-black">לא כשירים</th>
                  <th className="text-center px-3 py-3 font-black">% כשירות</th>
                </tr>
              </thead>
              <tbody>
                {perBrigade.map((b) => (
                  <tr key={b.code} className="border-t border-slate-200 hover:bg-slate-50">
                    <td className="px-3 py-3 font-black text-slate-900">{BRIGADES[b.code].name}</td>
                    <td className="text-center px-2 py-2">
                      <button onClick={() => openDrill(b.code, "all")}>{statusPill(b.total, "slate")}</button>
                    </td>
                    <td className="text-center px-2 py-2">
                      <button onClick={() => openDrill(b.code, "militaryExpired")}>{statusPill(b.militaryExpired, b.militaryExpired > 0 ? "red" : "slate")}</button>
                    </td>
                    <td className="text-center px-2 py-2">
                      <button onClick={() => openDrill(b.code, "militarySoon")}>{statusPill(b.militarySoon, b.militarySoon > 0 ? "amber" : "slate")}</button>
                    </td>
                    <td className="text-center px-2 py-2">
                      <button onClick={() => openDrill(b.code, "civilianExpired")}>{statusPill(b.civilianExpired, b.civilianExpired > 0 ? "red" : "slate")}</button>
                    </td>
                    <td className="text-center px-2 py-2">
                      <button onClick={() => openDrill(b.code, "noDefensive")}>{statusPill(b.noDefensive, b.noDefensive > 0 ? "amber" : "slate")}</button>
                    </td>
                    <td className="text-center px-2 py-2">
                      <button onClick={() => openDrill(b.code, "correctDrivingDue")}>{statusPill(b.correctDrivingDue, b.correctDrivingDue > 0 ? "amber" : "slate")}</button>
                    </td>
                    <td className="text-center px-2 py-2">
                      <button onClick={() => openDrill(b.code, "unfit")}>{statusPill(b.unfit, b.unfit > 0 ? "red" : "slate")}</button>
                    </td>
                    <td className="text-center px-2 py-2">
                      <span className={`inline-block px-2 py-1 rounded-lg font-black border ${b.fitPct >= 85 ? "bg-emerald-100 text-emerald-700 border-emerald-300" : b.fitPct >= 70 ? "bg-amber-100 text-amber-700 border-amber-300" : "bg-red-100 text-red-700 border-red-300"}`}>
                        {b.total === 0 ? "—" : `${b.fitPct}%`}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Drill-down dialog */}
      <Dialog open={!!drillBrigade} onOpenChange={(o) => !o && setDrillBrigade(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col bg-white" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right text-slate-900 font-black">
              {drillBrigade ? BRIGADES[drillBrigade].name : ""} – {filterLabels[drillFilter.kind]}
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-2 my-2">
            <Badge variant="outline" className="text-slate-800 border-slate-400">סה"כ: {drillRows.length}</Badge>
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                value={drillSearch}
                onChange={(e) => setDrillSearch(e.target.value)}
                placeholder="חיפוש לפי שם / מ.א"
                className="pr-10 text-slate-900 bg-white border-slate-300 placeholder:text-slate-400"
              />
            </div>
          </div>
          <div className="overflow-auto flex-1 border border-slate-200 rounded-lg bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-200 sticky top-0">
                <tr className="text-slate-900">
                  <th className="text-right px-3 py-2 font-black">שם</th>
                  <th className="text-right px-3 py-2 font-black">מ.א</th>
                  <th className="text-right px-3 py-2 font-black">מוצב</th>
                  <th className="text-center px-3 py-2 font-black">רש' צבאי</th>
                  <th className="text-center px-3 py-2 font-black">רש' אזרחי</th>
                  <th className="text-center px-3 py-2 font-black">נה"מ</th>
                  <th className="text-center px-3 py-2 font-black">נה"נ</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {drillRows.length === 0 ? (
                  <tr className="bg-white"><td colSpan={7} className="text-center text-slate-600 py-6">אין נתונים</td></tr>
                ) : drillRows.map((r) => (
                  <tr key={r.id} className="border-t border-slate-200 bg-white even:bg-slate-50 hover:bg-slate-100">
                    <td className="px-3 py-2 text-slate-900 font-bold">{r.full_name}</td>
                    <td className="px-3 py-2 text-slate-800">{r.personal_number}</td>
                    <td className="px-3 py-2 text-slate-800">{r.outpost || "—"}</td>
                    <td className="px-3 py-2 text-center text-slate-800">{fmt(r.military_license_expiry)}</td>
                    <td className="px-3 py-2 text-center text-slate-800">{fmt(r.civilian_license_expiry)}</td>
                    <td className="px-3 py-2 text-center">
                      {r.defensive_driving_passed ? <Badge className="bg-emerald-500 text-white">עבר</Badge> : <Badge className="bg-slate-400 text-white">לא עבר</Badge>}
                    </td>
                    <td className="px-3 py-2 text-center text-slate-800">{fmt(r.correct_driving_in_service_date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>

      {/* Global drill-down dialog (from dashboard ?filter=...) */}
      <Dialog open={!!globalFilter} onOpenChange={(o) => { if (!o) { setGlobalFilter(null); searchParams.delete("filter"); setSearchParams(searchParams, { replace: true }); } }}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col bg-white" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right text-slate-900 font-black">
              איו"ש – {globalFilter ? filterLabels[globalFilter] : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="my-2">
            <Badge variant="outline" className="text-slate-800 border-slate-400">סה"כ: {globalRows.length}</Badge>
          </div>
          <div className="overflow-auto flex-1 border border-slate-200 rounded-lg bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-200 sticky top-0">
                <tr className="text-slate-900">
                  <th className="text-right px-3 py-2 font-black">חטיבה</th>
                  <th className="text-right px-3 py-2 font-black">שם</th>
                  <th className="text-right px-3 py-2 font-black">מ.א</th>
                  <th className="text-right px-3 py-2 font-black">מוצב</th>
                  <th className="text-center px-3 py-2 font-black">רש' צבאי</th>
                  <th className="text-center px-3 py-2 font-black">רש' אזרחי</th>
                  <th className="text-center px-3 py-2 font-black">נה"נ</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {globalRows.length === 0 ? (
                  <tr className="bg-white"><td colSpan={7} className="text-center text-slate-600 py-6">אין נתונים</td></tr>
                ) : globalRows.map((r) => (
                  <tr key={r.id} className="border-t border-slate-200 bg-white even:bg-slate-50 hover:bg-slate-100">
                    <td className="px-3 py-2 text-slate-900 font-bold">{r.brigade ? BRIGADES[r.brigade as BrigadeCode]?.name : "—"}</td>
                    <td className="px-3 py-2 text-slate-900 font-bold">{r.full_name}</td>
                    <td className="px-3 py-2 text-slate-800">{r.personal_number}</td>
                    <td className="px-3 py-2 text-slate-800">{r.outpost || "—"}</td>
                    <td className="px-3 py-2 text-center text-slate-800">{fmt(r.military_license_expiry)}</td>
                    <td className="px-3 py-2 text-center text-slate-800">{fmt(r.civilian_license_expiry)}</td>
                    <td className="px-3 py-2 text-center text-slate-800">{fmt(r.correct_driving_in_service_date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}