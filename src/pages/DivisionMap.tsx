import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { BRIGADES, BRIGADE_CODES, BrigadeCode } from "@/lib/brigades";
import { Card } from "@/components/ui/card";
import { Map as MapIcon } from "lucide-react";
import { toast } from "sonner";

const computeScore = (
  events: number,
  accidents: number,
  rollovers: number,
  fitPct: number, // 0..100
) => {
  let s = 100;
  s -= Math.min(30, events * 3);
  s -= Math.min(35, accidents * 6);
  s -= Math.min(35, rollovers * 10);
  // Fitness weighted 15% — if 100% fit no penalty, lower fit lowers score
  s -= Math.round((100 - fitPct) * 0.15);
  return Math.max(0, Math.min(100, s));
};

const fillColor = (score: number) => {
  if (score >= 75) return "#10b981"; // emerald-500
  if (score >= 50) return "#f59e0b"; // amber-500
  return "#ef4444"; // red-500
};

const DivisionMap = () => {
  const navigate = useNavigate();
  const { setActiveBrigade } = useAuth() as any;
  const [scores, setScores] = useState<Record<BrigadeCode, number>>({} as any);
  const [trends, setTrends] = useState<Record<BrigadeCode, number>>({} as any);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const monthIso = monthStart.toISOString();
        const prevIso = prevMonthStart.toISOString();
        const result: Record<string, number> = {};
        const trend: Record<string, number> = {};
        await Promise.all(
          BRIGADE_CODES.map(async (code) => {
            const [se, ac, roll, prevAc, sol, unfitSol] = await Promise.all([
              supabase.from("safety_events").select("id", { count: "exact", head: true }).eq("brigade", code).gte("created_at", monthIso),
              supabase.from("accidents").select("id", { count: "exact", head: true }).eq("brigade", code).gte("accident_date", monthIso.slice(0, 10)),
              supabase.from("accidents").select("id", { count: "exact", head: true }).eq("brigade", code).eq("incident_type", "rollover").gte("accident_date", monthIso.slice(0, 10)),
              supabase.from("accidents").select("id", { count: "exact", head: true }).eq("brigade", code).gte("accident_date", prevIso.slice(0, 10)).lt("accident_date", monthIso.slice(0, 10)),
              supabase.from("soldiers").select("id", { count: "exact", head: true }).eq("brigade", code).eq("is_active", true),
              supabase.from("soldiers").select("id", { count: "exact", head: true }).eq("brigade", code).eq("is_active", true).lt("military_license_expiry", new Date().toISOString().slice(0, 10)),
            ]);
            const total = sol.count || 0;
            const unfit = unfitSol.count || 0;
            const fitPct = total === 0 ? 100 : Math.round(((total - unfit) / total) * 100);
            result[code] = computeScore(se.count || 0, ac.count || 0, roll.count || 0, fitPct);
            trend[code] = (ac.count || 0) - (prevAc.count || 0);
          })
        );
        setScores(result as any);
        setTrends(trend as any);
      } catch (e: any) {
        toast.error(`שגיאה: ${e?.message || e}`);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Geographic approximation: Yehuda south, Etzion south-center, Binyamin center,
  // Efraim & Shomron north, Menashe north-tip. Schematic 2×3 layout.
  const layout: { code: BrigadeCode; x: number; y: number }[] = [
    { code: "menashe", x: 1, y: 0 },
    { code: "shomron", x: 0, y: 1 },
    { code: "efraim", x: 2, y: 1 },
    { code: "binyamin", x: 1, y: 2 },
    { code: "etzion", x: 0, y: 3 },
    { code: "yehuda", x: 2, y: 3 },
  ];

  const enterBrigade = async (code: BrigadeCode) => {
    try {
      await setActiveBrigade(code);
      sessionStorage.setItem("superAdminBrigadePicked", "1");
      navigate("/", { replace: true });
    } catch (e: any) {
      toast.error(`שגיאה: ${e?.message || e}`);
    }
  };

  return (
    <AppLayout>
      <div className="min-h-screen bg-slate-50 pt-20 pb-24" dir="rtl">
        <div className="max-w-3xl mx-auto px-4 space-y-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
              <MapIcon className="w-7 h-7 text-primary" />
              מפת איו"ש
            </h1>
            <p className="text-slate-600 text-sm mt-1">צביעת חטיבות לפי ציון בטיחות חודשי</p>
          </div>

          <Card className="bg-white border-2 border-slate-200 shadow-md p-4">
            <div className="grid grid-cols-3 gap-3" style={{ direction: "ltr" }}>
              {Array.from({ length: 4 }).map((_, row) =>
                Array.from({ length: 3 }).map((_, col) => {
                  const cell = layout.find((l) => l.x === col && l.y === row);
                  if (!cell) return <div key={`${row}-${col}`} />;
                  const score = scores[cell.code] ?? 0;
                  return (
                    <button
                      key={cell.code}
                      onClick={() => enterBrigade(cell.code)}
                      className="aspect-square rounded-2xl border-4 border-white shadow-lg flex flex-col items-center justify-center text-white font-black hover:scale-105 transition-transform"
                      style={{ backgroundColor: loading ? "#cbd5e1" : fillColor(score) }}
                      dir="rtl"
                    >
                      <div className="text-sm md:text-base text-center px-2">{BRIGADES[cell.code].name}</div>
                      {!loading && (
                        <>
                          <div className="text-xs mt-1 opacity-90">ציון {score}</div>
                          {trends[cell.code] !== undefined && trends[cell.code] !== 0 && (
                            <div className="text-[10px] mt-0.5 opacity-90">
                              {trends[cell.code] > 0 ? "▲" : "▼"} {Math.abs(trends[cell.code])} מהחודש הקודם
                            </div>
                          )}
                        </>
                      )}
                    </button>
                  );
                })
              )}
            </div>

            <div className="mt-6 flex items-center justify-center gap-4 text-xs text-slate-700 font-bold">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-emerald-500" /> תקין (75+)
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-amber-500" /> סיכון בינוני
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-red-500" /> סיכון גבוה
              </div>
            </div>

            <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 leading-relaxed">
              <div className="font-black mb-1">איך מחושב הציון?</div>
              <ul className="list-disc pr-5 space-y-0.5">
                <li>הציון מחושב <b>לחודש הנוכחי בלבד</b> (מ-1 לחודש עד היום).</li>
                <li>מתחילים מ-100 וגורעים: כל אירוע בטיחות = <b>−3</b>, כל תאונה = <b>−6</b>, כל התהפכות = <b>−10</b>.</li>
                <li>15% מהציון נקבע לפי <b>אחוז כשירות הנהגים</b> בחטיבה (רישיון צבאי תקף).</li>
                <li>החץ ▲/▼ מציג את מגמת התאונות לעומת <b>החודש הקודם</b>.</li>
              </ul>
            </div>
          </Card>

          <p className="text-xs text-slate-600 text-center font-medium">לחצו על חטיבה כדי להיכנס לתצוגה המלאה שלה</p>
        </div>
      </div>
    </AppLayout>
  );
};

export default DivisionMap;