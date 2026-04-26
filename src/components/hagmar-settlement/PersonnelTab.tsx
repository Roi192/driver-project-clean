import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Shield, AlertTriangle, CheckCircle } from "lucide-react";
import { differenceInDays, parseISO } from "date-fns";
import { SHOOTING_VALIDITY_DAYS, CERT_VALIDITY_DAYS } from "@/lib/hagmar-constants";

interface Props {
  settlement: string;
}

interface Soldier {
  id: string;
  full_name: string;
  is_active: boolean;
  last_shooting_range_date: string | null;
  weapon_serial: string | null;
  phone: string | null;
}

interface Cert {
  id: string;
  soldier_id: string;
  cert_type: string;
  last_refresh_date: string | null;
}

export function PersonnelTab({ settlement }: Props) {
  const [soldiers, setSoldiers] = useState<Soldier[]>([]);
  const [certs, setCerts] = useState<Cert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const [soldiersRes, certsRes] = await Promise.all([
        supabase.from("hagmar_soldiers").select("id, full_name, is_active, last_shooting_range_date, weapon_serial, phone").eq("settlement", settlement),
        supabase.from("hagmar_certifications").select("id, soldier_id, cert_type, last_refresh_date"),
      ]);
      setSoldiers(soldiersRes.data || []);
      setCerts(certsRes.data || []);
      setLoading(false);
    };
    fetch();
  }, [settlement]);

  const today = new Date();
  const active = soldiers.filter(s => s.is_active);
  const withExpiredShooting = active.filter(s => {
    if (!s.last_shooting_range_date) return true;
    return differenceInDays(today, parseISO(s.last_shooting_range_date)) > SHOOTING_VALIDITY_DAYS;
  });
  const withValidShooting = active.length - withExpiredShooting.length;
  const armed = active.filter(s => s.weapon_serial);

  const getShootingStatus = (date: string | null) => {
    if (!date) return "expired";
    const days = differenceInDays(today, parseISO(date));
    if (days > SHOOTING_VALIDITY_DAYS) return "expired";
    if (days > 60) return "warning";
    return "valid";
  };

  const soldierCerts = (soldierId: string) => certs.filter(c => c.soldier_id === soldierId);

  if (loading) {
    return <div className="flex justify-center py-10"><div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-3 text-center">
            <Users className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
            <p className="text-2xl font-black text-white">{active.length}</p>
            <p className="text-xs text-slate-400">לוחמים פעילים</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-3 text-center">
            <CheckCircle className="w-5 h-5 text-green-400 mx-auto mb-1" />
            <p className="text-2xl font-black text-white">{withValidShooting}</p>
            <p className="text-xs text-slate-400">מטווח בתוקף</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-3 text-center">
            <Shield className="w-5 h-5 text-amber-400 mx-auto mb-1" />
            <p className="text-2xl font-black text-white">{armed.length}</p>
            <p className="text-xs text-slate-400">חמושים</p>
          </CardContent>
        </Card>
      </div>

      {/* Soldiers List */}
      <div className="space-y-2">
        {active.map(soldier => {
          const shootingStatus = getShootingStatus(soldier.last_shooting_range_date);
          const sCerts = soldierCerts(soldier.id);
          return (
            <Card key={soldier.id} className="bg-slate-800/80 border-slate-700">
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-white text-sm">{soldier.full_name}</span>
                  <div className="flex gap-1">
                    {soldier.weapon_serial && (
                      <Badge variant="outline" className="text-xs border-amber-500 text-amber-400">חמוש</Badge>
                    )}
                    <Badge className={`text-xs ${
                      shootingStatus === "valid" ? "bg-emerald-600" :
                      shootingStatus === "warning" ? "bg-amber-600" : "bg-red-600"
                    } text-white border-0`}>
                      {shootingStatus === "valid" ? "מטווח תקין" : shootingStatus === "warning" ? "קרוב לפקיעה" : "פג תוקף"}
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-1 flex-wrap">
                  {sCerts.map(c => {
                    const valid = c.last_refresh_date && differenceInDays(today, parseISO(c.last_refresh_date)) <= CERT_VALIDITY_DAYS;
                    return (
                      <Badge key={c.id} variant="outline" className={`text-xs ${valid ? "border-emerald-600 text-emerald-400" : "border-red-600 text-red-400"}`}>
                        {c.cert_type}
                      </Badge>
                    );
                  })}
                </div>
                {soldier.phone && (
                  <p className="text-xs text-slate-500 mt-1">{soldier.phone}</p>
                )}
              </CardContent>
            </Card>
          );
        })}
        {active.length === 0 && (
          <p className="text-center text-slate-500 py-8">אין לוחמים רשומים ביישוב זה</p>
        )}
      </div>
    </div>
  );
}