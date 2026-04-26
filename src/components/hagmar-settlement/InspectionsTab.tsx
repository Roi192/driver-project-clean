import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClipboardCheck, AlertTriangle, Calendar } from "lucide-react";
import { format, parseISO } from "date-fns";

interface Props {
  settlement: string;
}

export function InspectionsTab({ settlement }: Props) {
  const [inspections, setInspections] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const [inspRes, incRes] = await Promise.all([
        supabase.from("hagmar_settlement_inspections").select("*").eq("settlement", settlement).order("inspection_date", { ascending: false }).limit(10),
        supabase.from("hagmar_security_incidents").select("*").eq("settlement", settlement).eq("status", "open").order("incident_date", { ascending: false }),
      ]);
      setInspections(inspRes.data || []);
      setIncidents(incRes.data || []);
      setLoading(false);
    };
    fetch();
  }, [settlement]);

  if (loading) {
    return <div className="flex justify-center py-10"><div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="space-y-5">
      {/* Open Incidents */}
      {incidents.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-red-400 mb-2 flex items-center gap-1">
            <AlertTriangle className="w-4 h-4" /> אירועים פתוחים ({incidents.length})
          </h3>
          {incidents.map(inc => (
            <Card key={inc.id} className="bg-red-900/20 border-red-800 mb-2">
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-bold text-white">{inc.title}</span>
                  <Badge className={`text-xs border-0 ${
                    inc.severity === "high" ? "bg-red-600" : inc.severity === "medium" ? "bg-amber-600" : "bg-blue-600"
                  } text-white`}>
                    {inc.severity === "high" ? "גבוה" : inc.severity === "medium" ? "בינוני" : "נמוך"}
                  </Badge>
                </div>
                <p className="text-xs text-slate-400">{format(parseISO(inc.incident_date), "dd/MM/yyyy")}</p>
                {inc.description && <p className="text-xs text-slate-300 mt-1">{inc.description}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Inspections */}
      <div>
        <h3 className="text-sm font-bold text-amber-400 mb-2 flex items-center gap-1">
          <ClipboardCheck className="w-4 h-4" /> ביקורות ומסדרים
        </h3>
        {inspections.length > 0 ? inspections.map(insp => (
          <Card key={insp.id} className="bg-slate-800/80 border-slate-700 mb-2">
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-1">
                <div>
                  <span className="text-sm text-white">
                    {insp.inspection_type === "monthly" ? "מסדר חודשי" :
                     insp.inspection_type === "officer" ? "ביקורת קצין" : insp.inspection_type}
                  </span>
                  <p className="text-xs text-slate-500">{format(parseISO(insp.inspection_date), "dd/MM/yyyy")}</p>
                </div>
                {insp.score != null && (
                  <Badge className={`text-xs border-0 ${
                    insp.score >= 80 ? "bg-emerald-600" : insp.score >= 60 ? "bg-amber-600" : "bg-red-600"
                  } text-white`}>
                    {insp.score} נק'
                  </Badge>
                )}
              </div>
              {insp.findings && <p className="text-xs text-slate-400 mt-1">{insp.findings}</p>}
            </CardContent>
          </Card>
        )) : <p className="text-slate-500 text-sm">לא נמצאו ביקורות</p>}
      </div>
    </div>
  );
}