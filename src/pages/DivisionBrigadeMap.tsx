import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { BRIGADES, BRIGADE_CODES, BrigadeCode } from "@/lib/brigades";
import { Card } from "@/components/ui/card";
import { Map as MapIcon } from "lucide-react";
import { toast } from "sonner";

interface BrigadeAggregate {
  events: number;
  accidents: number;
  rollovers: number;
  prevAccidents: number;
  fitPct: number;
  battalionAccidents: number;
  securityAccidents: number;
}

const computeScore = (a: BrigadeAggregate) => {
  let s = 100;
  s -= Math.min(30, a.events * 3);
  s -= Math.min(35, a.accidents * 6);
  s -= Math.min(35, a.rollovers * 10);
  s -= Math.round((100 - a.fitPct) * 0.15);
  return Math.max(0, Math.min(100, s));
};

const fillColor = (score: number) => {
  if (score >= 75) return "#10b981";
  if (score >= 50) return "#f59e0b";
  return "#ef4444";
};

const DivisionBrigadeMap = () => {
  const navigate = useNavigate();
  const { setActiveBrigade } = useAuth() as any;
  const [data, setData] = useState<Record<BrigadeCode, BrigadeAggregate>>({} as any);
  const [scores, setScores] = useState<Record<BrigadeCode, number>>({} as any);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
        const today = new Date().toISOString().slice(0, 10);
        const aggregates: Record<string, BrigadeAggregate> = {};
        const scoreMap: Record<string, number> = {};
        await Promise.all(
          BRIGADE_CODES.map(async (code) => {
            const [se, acAll, acSec, acBat, roll, prevAc, sol, unfit] = await Promise.all([
              supabase.from("safety_content").select("id", { count: "exact", head: true })
                .eq("brigade", code).eq("category", "sector_events").gte("event_date", monthStart.slice(0, 10)),
              supabase.from("accidents").select("id", { count: "exact", head: true })
                .eq("brigade", code).gte("accident_date", monthStart.slice(0, 10)),
              supabase.from("accidents").select("id", { count: "exact", head: true })
                .eq("brigade", code).eq("driver_type", "security").gte("accident_date", monthStart.slice(0, 10)),
              supabase.from("accidents").select("id", { count: "exact", head: true })
                .eq("brigade", code).eq("driver_type", "combat").gte("accident_date", monthStart.slice(0, 10)),
              supabase.from("accidents").select("id", { count: "exact", head: true })
                .eq("brigade", code).eq("incident_type", "rollover").gte("accident_date", monthStart.slice(0, 10)),
              supabase.from("accidents").select("id", { count: "exact", head: true })
                .eq("brigade", code).gte("accident_date", prevMonthStart.slice(0, 10)).lt("accident_date", monthStart.slice(0, 10)),
              supabase.from("soldiers").select("id", { count: "exact", head: true }).eq("brigade", code).eq("is_active", true),
              supabase.from("soldiers").select("id", { count: "exact", head: true }).eq("brigade", code).eq("is_active", true).lt("military_license_expiry", today),
            ]);
            const total = sol.count || 0;
            const unfitN = unfit.count || 0;
            const fitPct = total === 0 ? 100 : Math.round(((total - unfitN) / total) * 100);
            const agg: BrigadeAggregate = {
              events: se.count || 0,
              accidents: acAll.count || 0,
              rollovers: roll.count || 0,
              prevAccidents: prevAc.count || 0,
              fitPct,
              securityAccidents: acSec.count || 0,
              battalionAccidents: acBat.count || 0,
            };
            aggregates[code] = agg;
            scoreMap[code] = computeScore(agg);
          })
        );
        setData(aggregates as any);
        setScores(scoreMap as any);
      } catch (e: any) {
        toast.error(`שגיאה: ${e?.message || e}`);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

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
              מפת איו"ש (חטיבתית)
            </h1>
            <p className="text-slate-600 text-sm mt-1">תצוגה חטיבתית מלאה — נהגי גדוד וגם נהגי פלנג יחד</p>
          </div>

          <Card className="bg-white border-2 border-slate-200 shadow-md p-4">
            <div className="grid grid-cols-3 gap-3" style={{ direction: "ltr" }}>
              {Array.from({ length: 4 }).map((_, row) =>
                Array.from({ length: 3 }).map((_, col) => {
                  const cell = layout.find((l) => l.x === col && l.y === row);
                  if (!cell) return <div key={`${row}-${col}`} />;
                  const score = scores[cell.code] ?? 0;
                  const agg = data[cell.code];
                  return (
                    <button
                      key={cell.code}
                      onClick={() => enterBrigade(cell.code)}
                      className="aspect-square rounded-2xl border-4 border-white shadow-lg flex flex-col items-center justify-center text-white font-black hover:scale-105 transition-transform p-2"
                      style={{ backgroundColor: loading ? "#cbd5e1" : fillColor(score) }}
                      dir="rtl"
                    >
                      <div className="text-sm md:text-base text-center">{BRIGADES[cell.code].name}</div>
                      {!loading && agg && (
                        <>
                          <div className="text-xs mt-1 opacity-90">ציון {score}</div>
                          <div className="text-[10px] mt-0.5 opacity-90 text-center leading-tight">
                            בט"ש {agg.securityAccidents} · גדוד {agg.battalionAccidents}
                          </div>
                        </>
                      )}
                    </button>
                  );
                })
              )}
            </div>

            <div className="mt-6 flex items-center justify-center gap-4 text-xs text-slate-700 font-bold">
              <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-emerald-500" /> תקין (75+)</div>
              <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-amber-500" /> סיכון בינוני</div>
              <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-red-500" /> סיכון גבוה</div>
            </div>

            <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 leading-relaxed">
              <div className="font-black mb-1">איך מחושב הציון?</div>
              <ul className="list-disc pr-5 space-y-0.5">
                <li>הציון מחושב לחודש הנוכחי, ומסכם <b>את כל הנהגים בחטיבה</b> — בט"ש (פלנג) וגם גדוד תע"ם.</li>
                <li>גריעות: כל אירוע בטיחות = −3, כל תאונה = −6, כל התהפכות = −10.</li>
                <li>15% מהציון מבוסס על אחוז כשירות הנהגים (רישיון צבאי תקף).</li>
                <li>מתחת לכל חטיבה: פירוט מספר תאונות נהגי בט"ש לעומת נהגי גדוד החודש.</li>
              </ul>
            </div>
          </Card>

          <p className="text-xs text-slate-600 text-center font-medium">לחצו על חטיבה כדי להיכנס לתצוגה המלאה שלה</p>
        </div>
      </div>
    </AppLayout>
  );
};

export default DivisionBrigadeMap;