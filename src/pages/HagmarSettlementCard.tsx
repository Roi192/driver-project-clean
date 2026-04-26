import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useHagmarSettlement } from "@/hooks/useHagmarSettlement";
import { useSettlementScores } from "@/hooks/useSettlementScores";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building, Users, Shield, Package, Calendar, ClipboardCheck, Target, ArrowRight, AlertTriangle, BarChart3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { HAGMAR_REGIONS, HAGMAR_ALL_SETTLEMENTS, SHOOTING_VALIDITY_DAYS, SHOOTING_WARNING_DAYS, CERT_VALIDITY_DAYS } from "@/lib/hagmar-constants";
import { differenceInDays, parseISO, format } from "date-fns";
import { PersonnelTab } from "@/components/hagmar-settlement/PersonnelTab";
import { SecurityComponentsTab } from "@/components/hagmar-settlement/SecurityComponentsTab";
import { EquipmentTab } from "@/components/hagmar-settlement/EquipmentTab";
import { WeekendClosersTab } from "@/components/hagmar-settlement/WeekendClosersTab";
import { TrainingTab } from "@/components/hagmar-settlement/TrainingTab";
import { InspectionsTab } from "@/components/hagmar-settlement/InspectionsTab";

export default function HagmarSettlementCard() {
  const { isHagmarAdmin, isSuperAdmin, isRavshatz } = useAuth();
  const { userSettlement, isRestricted } = useHagmarSettlement();
  const { scores } = useSettlementScores();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const selectedSettlement = searchParams.get("settlement") || (isRestricted ? userSettlement : null);

  const setSelectedSettlement = (s: string) => {
    setSearchParams({ settlement: s });
  };

  // If ravshatz, auto-select their settlement
  useEffect(() => {
    if (isRestricted && userSettlement && !searchParams.get("settlement")) {
      setSearchParams({ settlement: userSettlement }, { replace: true });
    }
  }, [isRestricted, userSettlement]);

  // Readiness score placeholder
  const [readinessScore, setReadinessScore] = useState<number | null>(null);

  if (!selectedSettlement) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-[hsl(var(--hagmar-bg))] pb-24" dir="rtl">
          <div className="px-4 py-6 space-y-5">
            <PageHeader title="כרטיס יישוב" subtitle="בחר יישוב לצפייה" icon={Building} />
            <div className="max-w-md mx-auto mt-10">
              <Select onValueChange={setSelectedSettlement}>
                <SelectTrigger className="bg-card border-border">
                  <SelectValue placeholder="בחר יישוב..." />
                </SelectTrigger>
                <SelectContent>
                  {HAGMAR_REGIONS.map(region => (
                    <div key={region.name}>
                      <div className="px-2 py-1.5 text-xs font-bold text-muted-foreground">{region.name}</div>
                      {region.companies.flatMap(c => c.settlements).map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </div>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pb-24" dir="rtl">
        <div className="px-4 py-6 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                <Building className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-black text-white">{selectedSettlement}</h1>
                <p className="text-sm text-slate-400">
                  {HAGMAR_REGIONS.find(r => r.companies.some(c => c.settlements.includes(selectedSettlement)))?.name || ""}
                </p>
              </div>
            </div>
            {!isRestricted && (
              <Select value={selectedSettlement} onValueChange={setSelectedSettlement}>
                <SelectTrigger className="w-40 bg-slate-700 border-slate-600 text-white text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HAGMAR_ALL_SETTLEMENTS.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Readiness Diagnostic Banner */}
          {(() => {
            const score = scores.find(s => s.settlement === selectedSettlement);
            if (!score) return null;
            const color = score.readiness >= 70 ? "border-emerald-700 bg-emerald-900/20" : score.readiness >= 40 ? "border-amber-700 bg-amber-900/20" : "border-red-700 bg-red-900/20";
            const textColor = score.readiness >= 70 ? "text-emerald-400" : score.readiness >= 40 ? "text-amber-400" : "text-red-400";
            return (
              <Card className={`border ${color}`}>
                <CardContent className="p-3 space-y-3">
                  {/* Score circles */}
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: "כשירות", value: score.readiness, good: (v: number) => v >= 70 },
                      { label: "מסוכנות", value: score.risk, good: (v: number) => v < 40 },
                      { label: "עדיפות", value: score.priority, good: (v: number) => v < 40 },
                    ].map(item => (
                      <div key={item.label} className="text-center">
                        <p className="text-xs text-slate-400 mb-1">{item.label}</p>
                        <div className="relative w-14 h-14 mx-auto">
                          <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                            <circle cx="18" cy="18" r="15.9" fill="none" stroke="#334155" strokeWidth="3" />
                            <circle cx="18" cy="18" r="15.9" fill="none"
                              stroke={item.good(item.value) ? "#22c55e" : item.value >= 40 && item.value < 70 ? "#f59e0b" : "#ef4444"}
                              strokeWidth="3" strokeDasharray={`${item.value} ${100 - item.value}`} strokeLinecap="round"
                            />
                          </svg>
                          <span className="absolute inset-0 flex items-center justify-center text-sm font-black text-white">{item.value}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Sub-scores */}
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "כוח אדם", value: score.personnelFitness },
                      { label: "תשתיות", value: score.componentHealth },
                      { label: "אימונים", value: score.trainingScore },
                    ].map(sub => (
                      <div key={sub.label} className="bg-slate-700/50 rounded-lg p-1.5 text-center">
                        <p className="text-[10px] text-slate-400">{sub.label}</p>
                        <p className={`text-sm font-black ${sub.value >= 70 ? "text-emerald-400" : sub.value >= 40 ? "text-amber-400" : "text-red-400"}`}>
                          {sub.value}%
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Reasons */}
                  {score.reasons.length > 0 && (
                    <div>
                      <p className={`text-xs font-black ${textColor} mb-1 flex items-center gap-1`}>
                        <AlertTriangle className="w-3.5 h-3.5" />
                        {score.readiness < 40 ? "למה אדום?" : score.readiness < 70 ? "למה כתום?" : "פרטים"}
                      </p>
                      <ul className="space-y-0.5">
                        {score.reasons.map((r, i) => (
                          <li key={i} className="text-xs text-slate-300 flex items-center gap-1.5">
                            <span className="w-1 h-1 rounded-full bg-red-500 shrink-0" />
                            {r}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })()}

          {/* Tabs */}
          <Tabs defaultValue="personnel" className="w-full">
            <TabsList className="w-full grid grid-cols-3 bg-slate-800 border border-slate-700 h-auto p-1 gap-1">
              <TabsTrigger value="personnel" className="text-xs data-[state=active]:bg-amber-600 data-[state=active]:text-white text-slate-300 py-2">
                <Users className="w-3.5 h-3.5 ml-1" />כוח אדם
              </TabsTrigger>
              <TabsTrigger value="security" className="text-xs data-[state=active]:bg-amber-600 data-[state=active]:text-white text-slate-300 py-2">
                <Shield className="w-3.5 h-3.5 ml-1" />מרכיבי ביטחון
              </TabsTrigger>
              <TabsTrigger value="equipment" className="text-xs data-[state=active]:bg-amber-600 data-[state=active]:text-white text-slate-300 py-2">
                <Package className="w-3.5 h-3.5 ml-1" />אמל"ח
              </TabsTrigger>
            </TabsList>
            <TabsList className="w-full grid grid-cols-3 bg-slate-800 border border-slate-700 h-auto p-1 gap-1 mt-1">
              <TabsTrigger value="weekend" className="text-xs data-[state=active]:bg-amber-600 data-[state=active]:text-white text-slate-300 py-2">
                <Calendar className="w-3.5 h-3.5 ml-1" />סוגרי שבת
              </TabsTrigger>
              <TabsTrigger value="training" className="text-xs data-[state=active]:bg-amber-600 data-[state=active]:text-white text-slate-300 py-2">
                <Target className="w-3.5 h-3.5 ml-1" />אימונים
              </TabsTrigger>
              <TabsTrigger value="inspections" className="text-xs data-[state=active]:bg-amber-600 data-[state=active]:text-white text-slate-300 py-2">
                <ClipboardCheck className="w-3.5 h-3.5 ml-1" />ביקורות
              </TabsTrigger>
            </TabsList>

            <div className="mt-4">
              <TabsContent value="personnel">
                <PersonnelTab settlement={selectedSettlement} />
              </TabsContent>
              <TabsContent value="security">
                <SecurityComponentsTab settlement={selectedSettlement} />
              </TabsContent>
              <TabsContent value="equipment">
                <EquipmentTab settlement={selectedSettlement} />
              </TabsContent>
              <TabsContent value="weekend">
                <WeekendClosersTab settlement={selectedSettlement} />
              </TabsContent>
              <TabsContent value="training">
                <TrainingTab settlement={selectedSettlement} />
              </TabsContent>
              <TabsContent value="inspections">
                <InspectionsTab settlement={selectedSettlement} />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </AppLayout>
  );
}