import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { useSettlementScores, SettlementScore } from "@/hooks/useSettlementScores";
import { SETTLEMENT_COORDS, HAGMAR_REGIONS } from "@/lib/hagmar-constants";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Shield, AlertTriangle, Target, ChevronLeft, BarChart3 } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type ColorMode = "readiness" | "risk" | "priority";

const COLOR_MODE_LABELS: Record<ColorMode, string> = {
  readiness: "כשירות",
  risk: "מסוכנות",
  priority: "עדיפות טיפול",
};

function getColor(value: number, mode: ColorMode): string {
  if (mode === "readiness") {
    // High readiness = green, low = red
    if (value >= 70) return "#22c55e";
    if (value >= 40) return "#f59e0b";
    return "#ef4444";
  }
  // Risk and priority: high = red, low = green
  if (value >= 70) return "#ef4444";
  if (value >= 40) return "#f59e0b";
  return "#22c55e";
}

function getScoreValue(score: SettlementScore, mode: ColorMode): number {
  switch (mode) {
    case "readiness": return score.readiness;
    case "risk": return score.risk;
    case "priority": return score.priority;
  }
}

export default function HagmarMap() {
  const { scores, loading } = useSettlementScores();
  const [colorMode, setColorMode] = useState<ColorMode>("priority");
  const [selectedScore, setSelectedScore] = useState<SettlementScore | null>(null);
  const navigate = useNavigate();
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.CircleMarker[]>([]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [31.92, 35.20],
      zoom: 11,
      zoomControl: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
    }).addTo(map);

    L.control.zoom({ position: "bottomright" }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update markers when scores or colorMode changes
  useEffect(() => {
    if (!mapRef.current || loading) return;

    // Clear existing markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    scores.forEach(score => {
      const coords = SETTLEMENT_COORDS[score.settlement];
      if (!coords) return;

      const value = getScoreValue(score, colorMode);
      const color = getColor(value, colorMode);

      const marker = L.circleMarker([coords[0], coords[1]], {
        radius: 14,
        fillColor: color,
        color: "#1e293b",
        weight: 3,
        opacity: 1,
        fillOpacity: 0.85,
      }).addTo(mapRef.current!);

      // Tooltip
      marker.bindTooltip(
        `<div style="text-align:right;direction:rtl;font-family:system-ui">
          <strong>${score.settlement}</strong><br/>
          ${COLOR_MODE_LABELS[colorMode]}: ${value}%
        </div>`,
        { direction: "top", className: "settlement-tooltip" }
      );

      // Add score text inside marker
      const icon = L.divIcon({
        className: "settlement-score-label",
        html: `<div style="
          width:28px;height:28px;
          display:flex;align-items:center;justify-content:center;
          font-size:11px;font-weight:900;color:white;
          text-shadow:0 1px 2px rgba(0,0,0,0.5);
          pointer-events:none;
        ">${value}</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const labelMarker = L.marker([coords[0], coords[1]], { icon, interactive: false }).addTo(mapRef.current!);

      marker.on("click", () => {
        setSelectedScore(score);
      });

      markersRef.current.push(marker);
    });
  }, [scores, colorMode, loading]);

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
      <div className="min-h-screen bg-slate-900" dir="rtl">
        {/* Color mode selector */}
        <div className="absolute top-16 right-4 z-[1000] flex gap-1 bg-slate-800/95 backdrop-blur rounded-xl p-1 border border-slate-700 shadow-xl">
          {(["priority", "readiness", "risk"] as ColorMode[]).map(mode => (
            <button
              key={mode}
              onClick={() => setColorMode(mode)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                colorMode === mode
                  ? "bg-amber-600 text-white"
                  : "text-slate-400 hover:text-white hover:bg-slate-700"
              }`}
            >
              {COLOR_MODE_LABELS[mode]}
            </button>
          ))}
        </div>

        {/* Legend */}
        <div className="absolute top-16 left-4 z-[1000] bg-slate-800/95 backdrop-blur rounded-xl p-3 border border-slate-700 shadow-xl">
          <p className="text-xs font-bold text-slate-300 mb-2">{COLOR_MODE_LABELS[colorMode]}</p>
          <div className="space-y-1">
            {colorMode === "readiness" ? (
              <>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-green-500" /><span className="text-xs text-slate-400">70%+</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-500" /><span className="text-xs text-slate-400">40-70%</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500" /><span className="text-xs text-slate-400">&lt;40%</span></div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-green-500" /><span className="text-xs text-slate-400">&lt;40%</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-500" /><span className="text-xs text-slate-400">40-70%</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500" /><span className="text-xs text-slate-400">70%+</span></div>
              </>
            )}
          </div>
        </div>

        {/* Map */}
        <div ref={mapContainerRef} className="w-full h-[60vh]" />

        {/* Selected settlement detail */}
        {selectedScore && (
          <div className="px-4 py-4 space-y-3">
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-black text-white">{selectedScore.settlement}</h2>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-amber-600 text-amber-400 hover:bg-amber-600/20"
                    onClick={() => navigate(`/hagmar/settlement-card?settlement=${encodeURIComponent(selectedScore.settlement)}`)}
                  >
                    כרטיס יישוב <ChevronLeft className="w-4 h-4 mr-1" />
                  </Button>
                </div>

                {/* Score bars */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {[
                    { label: "כשירות", value: selectedScore.readiness, color: getColor(selectedScore.readiness, "readiness") },
                    { label: "מסוכנות", value: selectedScore.risk, color: getColor(selectedScore.risk, "risk") },
                    { label: "עדיפות", value: selectedScore.priority, color: getColor(selectedScore.priority, "priority") },
                  ].map(item => (
                    <div key={item.label} className="text-center">
                      <p className="text-xs text-slate-400 mb-1">{item.label}</p>
                      <div className="relative w-16 h-16 mx-auto">
                        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                          <circle cx="18" cy="18" r="15.9" fill="none" stroke="#334155" strokeWidth="3" />
                          <circle
                            cx="18" cy="18" r="15.9" fill="none"
                            stroke={item.color} strokeWidth="3"
                            strokeDasharray={`${item.value} ${100 - item.value}`}
                            strokeLinecap="round"
                          />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-sm font-black text-white">
                          {item.value}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Quick stats */}
                <div className="grid grid-cols-4 gap-2 mb-3">
                  <div className="text-center bg-slate-700/50 rounded-lg p-2">
                    <p className="text-lg font-black text-white">{selectedScore.activeSoldiers}</p>
                    <p className="text-xs text-slate-400">פעילים</p>
                  </div>
                  <div className="text-center bg-slate-700/50 rounded-lg p-2">
                    <p className="text-lg font-black text-red-400">{selectedScore.expiredShooting}</p>
                    <p className="text-xs text-slate-400">ללא מטווח</p>
                  </div>
                  <div className="text-center bg-slate-700/50 rounded-lg p-2">
                    <p className="text-lg font-black text-amber-400">{selectedScore.armedCount}</p>
                    <p className="text-xs text-slate-400">חמושים</p>
                  </div>
                  <div className="text-center bg-slate-700/50 rounded-lg p-2">
                    <p className="text-lg font-black text-red-400">{selectedScore.openIncidents}</p>
                    <p className="text-xs text-slate-400">אירועים</p>
                  </div>
                </div>

                {/* Diagnostic panel - "Why are you red?" */}
                {selectedScore.reasons.length > 0 && (
                  <div className="bg-red-900/20 border border-red-800/50 rounded-lg p-3">
                    <p className="text-sm font-black text-red-400 mb-2 flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4" /> למה {selectedScore.settlement} {selectedScore.readiness < 40 ? "אדום" : selectedScore.readiness < 70 ? "כתום" : "דורש תשומת לב"}?
                    </p>
                    <ul className="space-y-1.5">
                      {selectedScore.reasons.map((r, i) => (
                        <li key={i} className="text-xs text-slate-300 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Sub-scores breakdown */}
                <div className="grid grid-cols-3 gap-2 mt-3">
                  {[
                    { label: "כוח אדם", value: selectedScore.personnelFitness },
                    { label: "מרכיבי ביטחון", value: selectedScore.componentHealth },
                    { label: "אימונים", value: selectedScore.trainingScore },
                  ].map(sub => (
                    <div key={sub.label} className="bg-slate-700/50 rounded-lg p-2 text-center">
                      <p className="text-xs text-slate-400">{sub.label}</p>
                      <p className={`text-base font-black ${sub.value >= 70 ? "text-emerald-400" : sub.value >= 40 ? "text-amber-400" : "text-red-400"}`}>
                        {sub.value}%
                      </p>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {[
                    { label: "דירוג איום", value: selectedScore.threatRating },
                    { label: "פגיעות תשתית", value: selectedScore.infraVulnerability },
                  ].map(sub => (
                    <div key={sub.label} className="bg-slate-700/50 rounded-lg p-2 text-center">
                      <p className="text-xs text-slate-400">{sub.label}</p>
                      <p className={`text-base font-black ${sub.value < 40 ? "text-emerald-400" : sub.value < 70 ? "text-amber-400" : "text-red-400"}`}>
                        {sub.value}%
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Bottom: Top 10 priority list */}
        {!selectedScore && (
          <div className="px-4 py-4 space-y-2">
            <h3 className="text-sm font-bold text-amber-400 flex items-center gap-1">
              <BarChart3 className="w-4 h-4" /> 10 יישובים דחופים לטיפול
            </h3>
            {scores.slice(0, 10).map((score, i) => (
              <Card
                key={score.settlement}
                className="bg-slate-800/80 border-slate-700 cursor-pointer hover:border-amber-600/50 transition-all"
                onClick={() => setSelectedScore(score)}
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
                      <p className="text-xs text-slate-500">{score.reasons[0] || ""}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Badge className="bg-slate-700 text-white border-0 text-xs">כשירות {score.readiness}%</Badge>
                    <Badge className={`border-0 text-xs text-white ${
                      score.priority >= 70 ? "bg-red-600" : score.priority >= 40 ? "bg-amber-600" : "bg-emerald-600"
                    }`}>
                      עדיפות {score.priority}%
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}