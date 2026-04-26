import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Target, Calendar, Crosshair, Shield } from "lucide-react";
import { format, parseISO } from "date-fns";
import { he } from "date-fns/locale";

interface Props {
  settlement: string;
}

export function TrainingTab({ settlement }: Props) {
  const [events, setEvents] = useState<any[]>([]);
  const [drills, setDrills] = useState<any[]>([]);
  const [ranges, setRanges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const [eventsRes, drillsRes, rangesRes] = await Promise.all([
        supabase.from("hagmar_training_events").select("*").eq("settlement", settlement).order("event_date", { ascending: false }).limit(10),
        supabase.from("hagmar_settlement_drills").select("*").eq("settlement", settlement).order("drill_date", { ascending: false }).limit(5),
        supabase.from("hagmar_shooting_ranges").select("*").eq("settlement", settlement).order("range_date", { ascending: false }).limit(5),
      ]);
      setEvents(eventsRes.data || []);
      setDrills(drillsRes.data || []);
      setRanges(rangesRes.data || []);
      setLoading(false);
    };
    fetch();
  }, [settlement]);

  if (loading) {
    return <div className="flex justify-center py-10"><div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="space-y-5">
      {/* Last Shooting Range */}
      <div>
        <h3 className="text-sm font-bold text-amber-400 mb-2 flex items-center gap-1">
          <Crosshair className="w-4 h-4" /> מטווחים אחרונים
        </h3>
        {ranges.length > 0 ? ranges.map(r => (
          <Card key={r.id} className="bg-slate-800/80 border-slate-700 mb-2">
            <CardContent className="p-3 flex items-center justify-between">
              <span className="text-sm text-white">{format(parseISO(r.range_date), "dd/MM/yyyy")}</span>
              <span className="text-xs text-slate-400">{r.summary || "ללא סיכום"}</span>
            </CardContent>
          </Card>
        )) : <p className="text-slate-500 text-sm">לא נמצאו מטווחים</p>}
      </div>

      {/* Settlement Drills */}
      <div>
        <h3 className="text-sm font-bold text-amber-400 mb-2 flex items-center gap-1">
          <Shield className="w-4 h-4" /> תרגילי יישוב
        </h3>
        {drills.length > 0 ? drills.map(d => (
          <Card key={d.id} className="bg-slate-800/80 border-slate-700 mb-2">
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-white">{format(parseISO(d.drill_date), "dd/MM/yyyy")}</span>
                {d.full_activation_drill && (
                  <Badge className="bg-red-600 text-white border-0 text-xs">כינון מלא</Badge>
                )}
              </div>
              {d.drill_content && <p className="text-xs text-slate-400">{d.drill_content}</p>}
            </CardContent>
          </Card>
        )) : <p className="text-slate-500 text-sm">לא נמצאו תרגילים</p>}
      </div>

      {/* Training Events */}
      <div>
        <h3 className="text-sm font-bold text-amber-400 mb-2 flex items-center gap-1">
          <Target className="w-4 h-4" /> אירועי אימון
        </h3>
        {events.length > 0 ? events.map(e => (
          <Card key={e.id} className="bg-slate-800/80 border-slate-700 mb-2">
            <CardContent className="p-3 flex items-center justify-between">
              <div>
                <span className="text-sm text-white">{e.title}</span>
                <p className="text-xs text-slate-500">{format(parseISO(e.event_date), "dd/MM/yyyy")}</p>
              </div>
              <Badge variant="outline" className="text-xs border-slate-600 text-slate-300">{e.event_type}</Badge>
            </CardContent>
          </Card>
        )) : <p className="text-slate-500 text-sm">לא נמצאו אירועים</p>}
      </div>
    </div>
  );
}