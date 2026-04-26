import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Shield, CheckCircle, Clock, XCircle } from "lucide-react";
import { format, startOfWeek, endOfWeek } from "date-fns";
import { he } from "date-fns/locale";

interface Props {
  settlement: string;
}

export function WeekendClosersTab({ settlement }: Props) {
  const [holders, setHolders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const today = new Date();
      const weekStart = format(startOfWeek(today, { weekStartsOn: 0 }), "yyyy-MM-dd");
      const weekEnd = format(endOfWeek(today, { weekStartsOn: 0 }), "yyyy-MM-dd");

      const { data } = await supabase
        .from("weekend_weapon_holders")
        .select("*, hagmar_soldiers(full_name, weapon_serial, id_number)")
        .eq("settlement", settlement)
        .gte("weekend_date", weekStart)
        .lte("weekend_date", weekEnd);
      setHolders(data || []);
      setLoading(false);
    };
    fetch();
  }, [settlement]);

  if (loading) {
    return <div className="flex justify-center py-10"><div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full" /></div>;
  }

  const approved = holders.filter(h => h.status === "approved");
  const pending = holders.filter(h => h.status === "pending");
  const rejected = holders.filter(h => h.status === "rejected");

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="bg-emerald-900/20 border-emerald-800">
          <CardContent className="p-3 text-center">
            <CheckCircle className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
            <p className="text-2xl font-black text-emerald-400">{approved.length}</p>
            <p className="text-xs text-slate-400">מאושרים</p>
          </CardContent>
        </Card>
        <Card className="bg-amber-900/20 border-amber-800">
          <CardContent className="p-3 text-center">
            <Clock className="w-5 h-5 text-amber-400 mx-auto mb-1" />
            <p className="text-2xl font-black text-amber-400">{pending.length}</p>
            <p className="text-xs text-slate-400">ממתינים</p>
          </CardContent>
        </Card>
        <Card className="bg-red-900/20 border-red-800">
          <CardContent className="p-3 text-center">
            <XCircle className="w-5 h-5 text-red-400 mx-auto mb-1" />
            <p className="text-2xl font-black text-red-400">{rejected.length}</p>
            <p className="text-xs text-slate-400">נדחו</p>
          </CardContent>
        </Card>
      </div>

      {/* Holders List */}
      <div className="space-y-2">
        {holders.map(holder => {
          const soldier = holder.hagmar_soldiers;
          const statusColor = holder.status === "approved" ? "bg-emerald-600" : holder.status === "pending" ? "bg-amber-600" : "bg-red-600";
          const statusLabel = holder.status === "approved" ? "מאושר" : holder.status === "pending" ? "ממתין" : "נדחה";
          return (
            <Card key={holder.id} className="bg-slate-800/80 border-slate-700">
              <CardContent className="p-3 flex items-center justify-between">
                <div>
                  <span className="text-sm font-bold text-white">{soldier?.full_name || "לא ידוע"}</span>
                  {soldier?.weapon_serial && (
                    <p className="text-xs text-slate-500">נשק: {soldier.weapon_serial}</p>
                  )}
                </div>
                <Badge className={`${statusColor} text-white border-0 text-xs`}>{statusLabel}</Badge>
              </CardContent>
            </Card>
          );
        })}
        {holders.length === 0 && (
          <p className="text-center text-slate-500 py-8">אין הצהרות סגירת שבת לשבוע זה</p>
        )}
      </div>
    </div>
  );
}