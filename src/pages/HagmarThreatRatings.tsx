import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, Save, Check } from "lucide-react";
import { HAGMAR_ALL_SETTLEMENTS } from "@/lib/hagmar-constants";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface ThreatRating {
  id?: string;
  settlement: string;
  village_proximity: number;
  road_proximity: number;
  topographic_vulnerability: number;
  regional_alert_level: number;
  notes: string | null;
}

const RATING_LABELS: Record<string, string> = {
  village_proximity: "סמיכות לכפרים עוינים",
  road_proximity: "סמיכות לצירים",
  topographic_vulnerability: "חשיפה טופוגרפית",
  regional_alert_level: "רמת כוננות אזורית",
};

const LEVEL_LABELS = ["", "נמוך מאוד", "נמוך", "בינוני", "גבוה", "קריטי"];
const LEVEL_COLORS = ["", "text-emerald-600", "text-emerald-500", "text-amber-500", "text-orange-500", "text-red-500"];

export default function HagmarThreatRatings() {
  const [ratings, setRatings] = useState<Record<string, ThreatRating>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [expandedSettlement, setExpandedSettlement] = useState<string | null>(null);

  useEffect(() => {
    fetchRatings();
  }, []);

  const fetchRatings = async () => {
    const { data } = await supabase.from("hagmar_threat_ratings").select("*");
    const map: Record<string, ThreatRating> = {};
    (data || []).forEach((r: any) => {
      map[r.settlement] = r;
    });
    setRatings(map);
    setLoading(false);
  };

  const getOrDefault = (settlement: string): ThreatRating => {
    return ratings[settlement] || {
      settlement,
      village_proximity: 1,
      road_proximity: 1,
      topographic_vulnerability: 1,
      regional_alert_level: 1,
      notes: null,
    };
  };

  const updateField = (settlement: string, field: string, value: number | string) => {
    const current = getOrDefault(settlement);
    setRatings(prev => ({
      ...prev,
      [settlement]: { ...current, [field]: value },
    }));
  };

  const saveRating = async (settlement: string) => {
    setSaving(settlement);
    const rating = getOrDefault(settlement);
    const userId = (await supabase.auth.getUser()).data.user?.id;

    const payload = {
      settlement: rating.settlement,
      village_proximity: rating.village_proximity,
      road_proximity: rating.road_proximity,
      topographic_vulnerability: rating.topographic_vulnerability,
      regional_alert_level: rating.regional_alert_level,
      notes: rating.notes,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    };

    if (rating.id) {
      await supabase.from("hagmar_threat_ratings").update(payload).eq("id", rating.id);
    } else {
      const { data } = await supabase.from("hagmar_threat_ratings").insert(payload).select().single();
      if (data) {
        setRatings(prev => ({ ...prev, [settlement]: { ...rating, id: data.id } }));
      }
    }

    toast.success(`דירוג איום עודכן עבור ${settlement}`);
    setSaving(null);
  };

  const getAvgScore = (settlement: string) => {
    const r = getOrDefault(settlement);
    return Math.round(((r.village_proximity + r.road_proximity + r.topographic_vulnerability + r.regional_alert_level) / 4) * 20);
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-[hsl(var(--hagmar-bg))] flex items-center justify-center" dir="rtl">
          <p className="text-slate-400">טוען...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pb-24" dir="rtl">
        <div className="px-4 py-6 space-y-4">
          <PageHeader
            title="דירוג איומים ליישובים"
            subtitle="דרג כל יישוב בסולם 1-5 לפי 4 קטגוריות"
            icon={AlertTriangle}
          />

          <Card className="border-amber-700/50 bg-amber-900/20">
            <CardContent className="p-3">
              <p className="text-xs text-amber-300">
                <AlertTriangle className="w-3.5 h-3.5 inline ml-1" />
                דירוגי האיום משפיעים ישירות על ציון <strong>מסוכנות</strong> של כל יישוב במפה ובכרטיס היישוב.
                סולם 1 = נמוך מאוד, 5 = קריטי.
              </p>
            </CardContent>
          </Card>

          <div className="space-y-3">
            {HAGMAR_ALL_SETTLEMENTS.map(settlement => {
              const r = getOrDefault(settlement);
              const avg = getAvgScore(settlement);
              const isExpanded = expandedSettlement === settlement;
              const hasData = !!ratings[settlement]?.id;

              return (
                <Card
                  key={settlement}
                  className="border-slate-700 bg-slate-800/80 overflow-hidden"
                >
                  {/* Collapsed header */}
                  <button
                    className="w-full flex items-center justify-between p-3 text-right"
                    onClick={() => setExpandedSettlement(isExpanded ? null : settlement)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">{settlement}</span>
                      {hasData && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={`text-xs ${avg >= 60 ? "border-red-500 text-red-400" : avg >= 40 ? "border-amber-500 text-amber-400" : "border-emerald-500 text-emerald-400"}`}>
                        {avg}%
                      </Badge>
                      <span className="text-slate-500 text-xs">{isExpanded ? "▲" : "▼"}</span>
                    </div>
                  </button>

                  {/* Expanded form */}
                  {isExpanded && (
                    <CardContent className="p-3 pt-0 space-y-4 border-t border-slate-700">
                      {(["village_proximity", "road_proximity", "topographic_vulnerability", "regional_alert_level"] as const).map(field => (
                        <div key={field} className="space-y-1.5">
                          <div className="flex justify-between items-center">
                            <label className="text-xs font-medium text-slate-300">{RATING_LABELS[field]}</label>
                            <span className={`text-xs font-bold ${LEVEL_COLORS[r[field]]}`}>
                              {r[field]} - {LEVEL_LABELS[r[field]]}
                            </span>
                          </div>
                          <Slider
                            min={1}
                            max={5}
                            step={1}
                            value={[r[field]]}
                            onValueChange={([v]) => updateField(settlement, field, v)}
                            className="w-full"
                          />
                          <div className="flex justify-between text-[10px] text-slate-500 px-1">
                            <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
                          </div>
                        </div>
                      ))}

                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-300">הערות</label>
                        <Textarea
                          value={r.notes || ""}
                          onChange={e => updateField(settlement, "notes", e.target.value)}
                          placeholder="הערות נוספות..."
                          className="bg-slate-700 border-slate-600 text-white text-sm min-h-[60px]"
                        />
                      </div>

                      <Button
                        onClick={() => saveRating(settlement)}
                        disabled={saving === settlement}
                        className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                      >
                        <Save className="w-4 h-4 ml-2" />
                        {saving === settlement ? "שומר..." : "שמור דירוג"}
                      </Button>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}