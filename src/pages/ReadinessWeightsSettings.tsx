import { useState, useEffect } from "react";
import { useReadinessWeights, ReadinessWeights } from "@/hooks/useSettlementScores";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Settings, Save, RotateCcw } from "lucide-react";
import { toast } from "sonner";

const WEIGHT_LABELS: Record<string, { label: string; group: string }> = {
  personnel_weight: { label: "כוח אדם", group: "כשירות" },
  components_weight: { label: "מרכיבי ביטחון", group: "כשירות" },
  training_weight: { label: "אימונים", group: "כשירות" },
  risk_threat_weight: { label: "דירוג איום", group: "מסוכנות" },
  risk_infra_weight: { label: "פגיעות תשתית", group: "מסוכנות" },
  risk_response_weight: { label: "יכולת תגובה", group: "מסוכנות" },
  risk_incidents_weight: { label: "אירועים פתוחים", group: "מסוכנות" },
  priority_risk_weight: { label: "מסוכנות", group: "עדיפות" },
  priority_readiness_weight: { label: "חוסר כשירות", group: "עדיפות" },
};

const GROUPS = [
  { key: "כשירות", fields: ["personnel_weight", "components_weight", "training_weight"] },
  { key: "מסוכנות", fields: ["risk_threat_weight", "risk_infra_weight", "risk_response_weight", "risk_incidents_weight"] },
  { key: "עדיפות", fields: ["priority_risk_weight", "priority_readiness_weight"] },
];

export default function ReadinessWeightsSettings() {
  const { isHagmarAdmin, isSuperAdmin } = useAuth();
  const { weights: savedWeights, loading, saveWeights } = useReadinessWeights();
  const [local, setLocal] = useState<ReadinessWeights>(savedWeights);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading) setLocal(savedWeights);
  }, [loading, savedWeights]);

  if (!isHagmarAdmin && !isSuperAdmin) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white" dir="rtl">
          <p>אין לך הרשאה לדף זה</p>
        </div>
      </AppLayout>
    );
  }

  const handleChange = (key: keyof ReadinessWeights, value: number) => {
    setLocal(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    await saveWeights(local);
    setSaving(false);
    toast.success("המשקלות נשמרו בהצלחה");
  };

  const handleReset = () => {
    setLocal({
      personnel_weight: 0.4, components_weight: 0.4, training_weight: 0.2,
      risk_threat_weight: 0.3, risk_infra_weight: 0.3, risk_response_weight: 0.3, risk_incidents_weight: 0.1,
      priority_risk_weight: 0.6, priority_readiness_weight: 0.4,
    });
  };

  const getGroupSum = (fields: string[]) =>
    fields.reduce((sum, f) => sum + (local[f as keyof ReadinessWeights] || 0), 0);

  if (loading) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-slate-900 flex items-center justify-center">
          <div className="animate-spin w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pb-24" dir="rtl">
        <div className="px-4 py-6 space-y-5">
          <PageHeader title="הגדרת משקלות כשירות" subtitle="התאם את אופן חישוב הציונים" icon={Settings} />

          {GROUPS.map(group => {
            const sum = getGroupSum(group.fields);
            const isValid = Math.abs(sum - 1) < 0.01;

            return (
              <Card key={group.key} className="bg-slate-800/80 border-slate-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-white text-base flex items-center justify-between">
                    <span>{group.key}</span>
                    <span className={`text-sm font-mono ${isValid ? "text-emerald-400" : "text-red-400"}`}>
                      סה"כ: {(sum * 100).toFixed(0)}%
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {group.fields.map(field => {
                    const val = local[field as keyof ReadinessWeights];
                    return (
                      <div key={field} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-300">{WEIGHT_LABELS[field].label}</span>
                          <span className="text-sm font-mono text-amber-400">{(val * 100).toFixed(0)}%</span>
                        </div>
                        <Slider
                          value={[val * 100]}
                          min={0}
                          max={100}
                          step={5}
                          onValueChange={([v]) => handleChange(field as keyof ReadinessWeights, v / 100)}
                          className="w-full"
                        />
                      </div>
                    );
                  })}
                  {!isValid && (
                    <p className="text-xs text-red-400">⚠️ הסכום חייב להיות 100%</p>
                  )}
                </CardContent>
              </Card>
            );
          })}

          <div className="flex gap-3">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold"
            >
              <Save className="w-4 h-4 ml-2" />
              {saving ? "שומר..." : "שמור משקלות"}
            </Button>
            <Button
              variant="outline"
              onClick={handleReset}
              className="border-slate-600 text-slate-300"
            >
              <RotateCcw className="w-4 h-4 ml-1" /> איפוס
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}