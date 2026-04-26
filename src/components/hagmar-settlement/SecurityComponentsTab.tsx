import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Camera, DoorOpen, Radio, Lightbulb, Shield, CheckCircle, XCircle } from "lucide-react";

interface Props {
  settlement: string;
}

const COMPONENT_LABELS: Record<string, { label: string; icon: React.ElementType }> = {
  cameras: { label: "מצלמות", icon: Camera },
  gates: { label: "שערים", icon: DoorOpen },
  communication: { label: "קשר", icon: Radio },
  lighting: { label: "תאורה", icon: Lightbulb },
  armory: { label: "חדר נשק", icon: Shield },
};

export function SecurityComponentsTab({ settlement }: Props) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { data: comp } = await supabase
        .from("hagmar_security_components")
        .select("*")
        .eq("settlement", settlement)
        .maybeSingle();
      setData(comp);
      setLoading(false);
    };
    fetch();
  }, [settlement]);

  if (loading) {
    return <div className="flex justify-center py-10"><div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full" /></div>;
  }

  if (!data) {
    return (
      <div className="text-center py-10">
        <Shield className="w-12 h-12 text-slate-600 mx-auto mb-3" />
        <p className="text-slate-400">לא הוזנו מרכיבי ביטחון ליישוב זה</p>
        <p className="text-xs text-slate-500 mt-1">ניתן להוסיף מרכיבים דרך דף מרכיבי ביטחון</p>
      </div>
    );
  }

  // Parse cameras and sensors data
  const cameras = data.cameras_data as any || {};
  const sensors = data.sensors_data as any || {};

  const components = [
    { key: "fence", label: "סוג גדר", value: data.fence_type || "לא הוגדר", status: !!data.fence_type },
    { key: "command_center", label: "מוקד שליטה", value: data.command_center_type || "לא הוגדר", status: !!data.command_center_type },
    { key: "armory", label: "חדר נשק", value: data.armory ? "קיים" : "לא קיים", status: data.armory },
    { key: "armored_vehicle", label: 'רכב משוריין', value: data.armored_vehicle ? "קיים" : "לא קיים", status: data.armored_vehicle },
    { key: "hailkis", label: 'חילקי"ש', value: data.hailkis ? "קיים" : "לא קיים", status: data.hailkis },
    { key: "defensive", label: "ביטחון מתגונן", value: data.defensive_security_type || "לא הוגדר", status: !!data.defensive_security_type },
  ];

  const operational = components.filter(c => c.status).length;
  const total = components.length;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-400">תקינות מרכיבים</p>
            <p className="text-3xl font-black text-white">{Math.round((operational / total) * 100)}%</p>
          </div>
          <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
            operational === total ? "bg-emerald-600/20 text-emerald-400" : "bg-amber-600/20 text-amber-400"
          }`}>
            <span className="text-lg font-bold">{operational}/{total}</span>
          </div>
        </CardContent>
      </Card>

      {/* Components Grid */}
      <div className="grid grid-cols-2 gap-2">
        {components.map(comp => (
          <Card key={comp.key} className={`border ${comp.status ? "bg-emerald-900/20 border-emerald-800" : "bg-red-900/20 border-red-800"}`}>
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                {comp.status ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-red-400" />}
                <span className="text-xs font-bold text-white">{comp.label}</span>
              </div>
              <p className="text-xs text-slate-400">{comp.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Security Gaps */}
      {data.security_gaps && (
        <Card className="bg-red-900/20 border-red-800">
          <CardContent className="p-3">
            <p className="text-xs font-bold text-red-400 mb-1">פערי ביטחון</p>
            <p className="text-sm text-white">{data.security_gaps}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}