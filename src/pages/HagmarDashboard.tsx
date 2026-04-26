import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useHagmarSettlement } from "@/hooks/useHagmarSettlement";
import { useSettlementScores } from "@/hooks/useSettlementScores";
import { useEmergencyMode } from "@/hooks/useEmergencyMode";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { LayoutDashboard, Users, Shield, Target, Package, AlertTriangle, ChevronLeft, Map, BarChart3, Siren, Phone, Radio, Crosshair } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useNavigate } from "react-router-dom";

export default function HagmarDashboard() {
  const { isHagmarAdmin, isSuperAdmin } = useAuth();
  const { userSettlement, isRestricted } = useHagmarSettlement();
  const { scores, loading } = useSettlementScores();
  const { isEmergency, toggleMode } = useEmergencyMode();
  const navigate = useNavigate();

  if (loading) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-slate-900 flex items-center justify-center">
          <div className="animate-spin w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full" />
        </div>
      </AppLayout>
    );
  }

  const displayScores = isRestricted && userSettlement
    ? scores.filter(s => s.settlement === userSettlement)
    : scores;

  const totalSoldiers = displayScores.reduce((sum, s) => sum + s.activeSoldiers, 0);
  const totalExpiredShooting = displayScores.reduce((sum, s) => sum + s.expiredShooting, 0);
  const totalOpenIncidents = displayScores.reduce((sum, s) => sum + s.openIncidents, 0);
  const totalArmed = displayScores.reduce((sum, s) => sum + s.armedCount, 0);
  const avgReadiness = displayScores.length > 0 ? Math.round(displayScores.reduce((sum, s) => sum + s.readiness, 0) / displayScores.length) : 0;
  const criticalSettlements = displayScores.filter(s => s.readiness < 40).length;

  // ── Emergency View ──
  if (isEmergency) {
    const sortedByPriority = [...displayScores].sort((a, b) => b.priority - a.priority);
    const criticalList = sortedByPriority.filter(s => s.readiness < 70);

    return (
      <AppLayout>
        <div className="min-h-screen bg-gradient-to-br from-red-950 via-slate-900 to-red-950 pb-24" dir="rtl">
          {/* Pulsing emergency banner */}
          <div className="bg-red-600 text-white text-center py-3 font-black text-lg flex items-center justify-center gap-2 animate-pulse">
            <Siren className="w-6 h-6" />
            מצב חירום פעיל
            <Siren className="w-6 h-6" />
          </div>

          <div className="px-4 py-4 space-y-4">
            {/* Mode toggle */}
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-black text-white flex items-center gap-2">
                <Siren className="w-6 h-6 text-red-400" /> תמונת מצב חירום
              </h1>
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-300 font-bold">חירום</span>
                <Switch checked={isEmergency} onCheckedChange={toggleMode} className="data-[state=checked]:bg-red-600" />
              </div>
            </div>

            {/* Critical KPIs - 2x2 grid */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="border-0 overflow-hidden">
                <CardContent className="p-4 bg-gradient-to-br from-blue-600 to-blue-800 text-white">
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="w-5 h-5 opacity-80" />
                    <span className="text-xs font-bold opacity-90">לוחמים זמינים</span>
                  </div>
                  <p className="text-4xl font-black">{totalSoldiers}</p>
                </CardContent>
              </Card>
              <Card className="border-0 overflow-hidden">
                <CardContent className="p-4 bg-gradient-to-br from-emerald-600 to-emerald-800 text-white">
                  <div className="flex items-center gap-2 mb-1">
                    <Crosshair className="w-5 h-5 opacity-80" />
                    <span className="text-xs font-bold opacity-90">חמושים</span>
                  </div>
                  <p className="text-4xl font-black">{totalArmed}</p>
                </CardContent>
              </Card>
              <Card className="border-0 overflow-hidden">
                <CardContent className="p-4 bg-gradient-to-br from-red-600 to-red-800 text-white">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="w-5 h-5 opacity-80" />
                    <span className="text-xs font-bold opacity-90">אירועים פתוחים</span>
                  </div>
                  <p className="text-4xl font-black">{totalOpenIncidents}</p>
                </CardContent>
              </Card>
              <Card className="border-0 overflow-hidden">
                <CardContent className="p-4 bg-gradient-to-br from-amber-600 to-amber-800 text-white">
                  <div className="flex items-center gap-2 mb-1">
                    <Shield className="w-5 h-5 opacity-80" />
                    <span className="text-xs font-bold opacity-90">יישובים קריטיים</span>
                  </div>
                  <p className="text-4xl font-black">{criticalSettlements}</p>
                </CardContent>
              </Card>
            </div>

            {/* Quick actions */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                className="h-14 bg-gradient-to-r from-cyan-600 to-blue-700 text-white font-bold text-sm border-0"
                onClick={() => navigate("/hagmar/map")}
              >
                <Map className="w-5 h-5 ml-2" /> מפה חטיבתית
              </Button>
              <Button
                className="h-14 bg-gradient-to-r from-red-600 to-rose-700 text-white font-bold text-sm border-0"
                onClick={() => navigate("/hagmar/security-incidents")}
              >
                <AlertTriangle className="w-5 h-5 ml-2" /> אירועים
              </Button>
            </div>

            {/* Settlement list - condensed */}
            <div className="space-y-2">
              <h2 className="text-sm font-black text-red-400 flex items-center gap-1">
                <Radio className="w-4 h-4" /> מצב יישובים — {displayScores.length} יישובים
              </h2>
              {sortedByPriority.map(score => {
                const color = score.readiness >= 70 ? "border-emerald-700 bg-emerald-900/20" 
                  : score.readiness >= 40 ? "border-amber-700 bg-amber-900/20" 
                  : "border-red-700 bg-red-900/20";
                const dotColor = score.readiness >= 70 ? "bg-emerald-500" : score.readiness >= 40 ? "bg-amber-500" : "bg-red-500 animate-pulse";

                return (
                  <Card
                    key={score.settlement}
                    className={`p-3 cursor-pointer transition-all hover:shadow-md border ${color}`}
                    onClick={() => navigate(`/hagmar/settlement-card?settlement=${encodeURIComponent(score.settlement)}`)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${dotColor}`} />
                        <div>
                          <p className="text-sm font-bold text-white">{score.settlement}</p>
                          <p className="text-xs text-slate-400">
                            {score.activeSoldiers} לוחמים · {score.armedCount} חמושים
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={`border-0 text-xs text-white ${
                          score.readiness >= 70 ? "bg-emerald-600" : score.readiness >= 40 ? "bg-amber-600" : "bg-red-600"
                        }`}>
                          {score.readiness}%
                        </Badge>
                        <ChevronLeft className="w-4 h-4 text-slate-500" />
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  // ── Routine View (original) ──
  const kpis = [
    { label: "כשירות ממוצעת", value: `${avgReadiness}%`, color: avgReadiness >= 70 ? "from-emerald-500 to-teal-500" : avgReadiness >= 40 ? "from-amber-500 to-orange-500" : "from-red-500 to-rose-500", icon: BarChart3 },
    { label: "לוחמים פעילים", value: totalSoldiers, color: "from-blue-500 to-indigo-500", icon: Users },
    { label: "ללא מטווח", value: totalExpiredShooting, color: totalExpiredShooting > 0 ? "from-red-500 to-rose-500" : "from-emerald-500 to-teal-500", icon: Target },
    { label: "אירועים פתוחים", value: totalOpenIncidents, color: totalOpenIncidents > 0 ? "from-red-600 to-red-700" : "from-slate-500 to-slate-600", icon: AlertTriangle },
    { label: "יישובים קריטיים", value: criticalSettlements, color: criticalSettlements > 0 ? "from-red-500 to-rose-500" : "from-emerald-500 to-teal-500", icon: Shield },
    { label: "סה\"כ יישובים", value: displayScores.length, color: "from-slate-500 to-slate-600", icon: Package },
  ];

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pb-24" dir="rtl">
        <div className="px-4 py-6 space-y-5">
          <div className="flex items-center justify-between">
            <PageHeader title='דשבורד קצין גמ"ר' subtitle="תמונת מצב חטיבתית" icon={LayoutDashboard} />
            <div className="flex items-center gap-2">
              {/* Emergency toggle */}
              <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5">
                <span className="text-xs text-slate-400">שגרה</span>
                <Switch checked={isEmergency} onCheckedChange={toggleMode} className="data-[state=checked]:bg-red-600" />
                <Siren className={`w-4 h-4 ${isEmergency ? "text-red-400" : "text-slate-500"}`} />
              </div>
              <Button
                variant="outline"
                size="sm"
                className="border-amber-600 text-amber-400 hover:bg-amber-600/20"
                onClick={() => navigate("/hagmar/map")}
              >
                <Map className="w-4 h-4 ml-1" /> מפה
              </Button>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 gap-3">
            {kpis.map((kpi, i) => {
              const Icon = kpi.icon;
              return (
                <Card key={i} className="border-0 overflow-hidden">
                  <CardContent className={`p-4 bg-gradient-to-br ${kpi.color} text-white`}>
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="w-5 h-5 opacity-80" />
                      <span className="text-xs font-semibold opacity-90">{kpi.label}</span>
                    </div>
                    <p className="text-3xl font-black">{kpi.value}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Alerts */}
          {displayScores.filter(s => s.readiness < 70).length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-bold text-red-400 flex items-center gap-1">
                <AlertTriangle className="w-4 h-4" /> יישובים מתחת ל-70% כשירות
              </h2>
              {displayScores.filter(s => s.readiness < 70).slice(0, 5).map(score => (
                <Card
                  key={score.settlement}
                  className={`p-3 cursor-pointer transition-all hover:shadow-md border ${
                    score.readiness < 40 ? "border-red-700 bg-red-900/20" : "border-amber-700 bg-amber-900/20"
                  }`}
                  onClick={() => navigate(`/hagmar/settlement-card?settlement=${encodeURIComponent(score.settlement)}`)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className={`w-4 h-4 ${score.readiness < 40 ? "text-red-400" : "text-amber-400"}`} />
                      <div>
                        <p className="text-sm font-bold text-white">{score.settlement}</p>
                        <p className="text-xs text-slate-400">{score.reasons[0] || ""}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={`border-0 text-xs text-white ${score.readiness < 40 ? "bg-red-600" : "bg-amber-600"}`}>
                        {score.readiness}%
                      </Badge>
                      <ChevronLeft className="w-4 h-4 text-slate-500" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Top 10 Priority */}
          <div className="space-y-2">
            <h2 className="text-sm font-bold text-amber-400 flex items-center gap-1">
              <BarChart3 className="w-4 h-4" /> 10 יישובים דחופים לטיפול
            </h2>
            {displayScores.slice(0, 10).map((score, i) => (
              <Card
                key={score.settlement}
                className="bg-slate-800/80 border-slate-700 cursor-pointer hover:border-amber-600/50 transition-all"
                onClick={() => navigate(`/hagmar/settlement-card?settlement=${encodeURIComponent(score.settlement)}`)}
              >
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black text-white ${
                      i < 3 ? "bg-red-600" : i < 6 ? "bg-amber-600" : "bg-slate-600"
                    }`}>
                      {i + 1}
                    </div>
                    <div>
                      <span className="text-sm font-bold text-white">{score.settlement}</span>
                      <div className="flex gap-2 mt-0.5">
                        <span className="text-xs text-slate-500">כשירות: {score.readiness}%</span>
                        <span className="text-xs text-slate-500">מסוכנות: {score.risk}%</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={`border-0 text-xs text-white ${
                      score.priority >= 70 ? "bg-red-600" : score.priority >= 40 ? "bg-amber-600" : "bg-emerald-600"
                    }`}>
                      עדיפות {score.priority}%
                    </Badge>
                    <ChevronLeft className="w-4 h-4 text-slate-500" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}