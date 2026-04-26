import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { HAGMAR_ALL_SETTLEMENTS, SHOOTING_VALIDITY_DAYS, CERT_VALIDITY_DAYS } from "@/lib/hagmar-constants";
import { differenceInDays, parseISO, startOfWeek, endOfWeek, format } from "date-fns";

export interface ReadinessWeights {
  personnel_weight: number;
  components_weight: number;
  training_weight: number;
  risk_threat_weight: number;
  risk_infra_weight: number;
  risk_response_weight: number;
  risk_incidents_weight: number;
  priority_risk_weight: number;
  priority_readiness_weight: number;
}

export const DEFAULT_WEIGHTS: ReadinessWeights = {
  personnel_weight: 0.4,
  components_weight: 0.4,
  training_weight: 0.2,
  risk_threat_weight: 0.3,
  risk_infra_weight: 0.3,
  risk_response_weight: 0.3,
  risk_incidents_weight: 0.1,
  priority_risk_weight: 0.6,
  priority_readiness_weight: 0.4,
};

export interface SettlementScore {
  settlement: string;
  readiness: number;
  risk: number;
  priority: number;
  personnelFitness: number;
  componentHealth: number;
  trainingScore: number;
  threatRating: number;
  infraVulnerability: number;
  responseCapability: number;
  openIncidents: number;
  reasons: string[];
  totalSoldiers: number;
  activeSoldiers: number;
  expiredShooting: number;
  armedCount: number;
}

export function useReadinessWeights() {
  const [weights, setWeights] = useState<ReadinessWeights>(DEFAULT_WEIGHTS);
  const [weightId, setWeightId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchWeights = async () => {
    const { data } = await supabase
      .from("hagmar_readiness_weights")
      .select("*")
      .limit(1)
      .maybeSingle();
    if (data) {
      setWeightId(data.id);
      setWeights({
        personnel_weight: Number(data.personnel_weight),
        components_weight: Number(data.components_weight),
        training_weight: Number(data.training_weight),
        risk_threat_weight: Number(data.risk_threat_weight),
        risk_infra_weight: Number(data.risk_infra_weight),
        risk_response_weight: Number(data.risk_response_weight),
        risk_incidents_weight: Number(data.risk_incidents_weight),
        priority_risk_weight: Number(data.priority_risk_weight),
        priority_readiness_weight: Number(data.priority_readiness_weight),
      });
    }
    setLoading(false);
  };

  useEffect(() => { fetchWeights(); }, []);

  const saveWeights = async (newWeights: ReadinessWeights) => {
    if (!weightId) return;
    await supabase
      .from("hagmar_readiness_weights")
      .update({ ...newWeights, updated_at: new Date().toISOString(), updated_by: (await supabase.auth.getUser()).data.user?.id })
      .eq("id", weightId);
    setWeights(newWeights);
  };

  return { weights, loading, saveWeights };
}

export function useSettlementScores() {
  const [scores, setScores] = useState<SettlementScore[]>([]);
  const [loading, setLoading] = useState(true);
  const { weights, loading: weightsLoading } = useReadinessWeights();

  useEffect(() => {
    if (!weightsLoading) fetchAll();
  }, [weightsLoading, weights]);

  const fetchAll = async () => {
    setLoading(true);
    const today = new Date();
    const weekStart = format(startOfWeek(today, { weekStartsOn: 0 }), "yyyy-MM-dd");
    const weekEnd = format(endOfWeek(today, { weekStartsOn: 0 }), "yyyy-MM-dd");

    const [soldiersRes, certsRes, componentsRes, equipRes, threatRes, incidentsRes, eventsRes, drillsRes, weaponRes] = await Promise.all([
      supabase.from("hagmar_soldiers").select("id, full_name, is_active, last_shooting_range_date, weapon_serial, settlement"),
      supabase.from("hagmar_certifications").select("id, soldier_id, cert_type, last_refresh_date"),
      supabase.from("hagmar_security_components").select("*"),
      supabase.from("hagmar_equipment").select("id, settlement, expected_quantity, actual_quantity"),
      supabase.from("hagmar_threat_ratings").select("*"),
      supabase.from("hagmar_security_incidents").select("id, settlement, status").eq("status", "open"),
      supabase.from("hagmar_training_events").select("id, settlement, event_date"),
      supabase.from("hagmar_settlement_drills").select("id, settlement, drill_date"),
      supabase.from("weekend_weapon_holders").select("id, settlement, is_holding_weapon").gte("weekend_date", weekStart).lte("weekend_date", weekEnd),
    ]);

    const soldiers = soldiersRes.data || [];
    const certs = certsRes.data || [];
    const components = componentsRes.data || [];
    const equipment = equipRes.data || [];
    const threats = threatRes.data || [];
    const incidents = incidentsRes.data || [];
    const events = eventsRes.data || [];
    const drills = drillsRes.data || [];
    const weapons = weaponRes.data || [];

    const w = weights;

    const results: SettlementScore[] = HAGMAR_ALL_SETTLEMENTS.map(settlement => {
      const reasons: string[] = [];

      // === PERSONNEL FITNESS ===
      const sSoldiers = soldiers.filter(s => s.settlement === settlement);
      const active = sSoldiers.filter(s => s.is_active);
      const totalSoldiers = sSoldiers.length;
      const activeSoldiers = active.length;

      let expiredShooting = 0;
      active.forEach(s => {
        if (!s.last_shooting_range_date) { expiredShooting++; return; }
        if (differenceInDays(today, parseISO(s.last_shooting_range_date)) > SHOOTING_VALIDITY_DAYS) expiredShooting++;
      });

      const shootingRate = activeSoldiers > 0 ? ((activeSoldiers - expiredShooting) / activeSoldiers) * 100 : 0;
      const soldierIds = active.map(s => s.id);
      const sCerts = certs.filter(c => soldierIds.includes(c.soldier_id));
      const expiredCerts = sCerts.filter(c => {
        if (!c.last_refresh_date) return true;
        return differenceInDays(today, parseISO(c.last_refresh_date)) > CERT_VALIDITY_DAYS;
      }).length;
      const certRate = sCerts.length > 0 ? ((sCerts.length - expiredCerts) / sCerts.length) * 100 : 100;
      const personnelFitness = activeSoldiers > 0 ? (shootingRate * 0.7 + certRate * 0.3) : 0;
      
      if (expiredShooting > 0) reasons.push(`${expiredShooting} לוחמים ללא מטווח`);
      if (expiredCerts > 0) reasons.push(`${expiredCerts} הסמכות פגות`);
      if (activeSoldiers === 0) reasons.push("אין לוחמים פעילים");

      // === COMPONENT HEALTH ===
      const sComp = components.find(c => c.settlement === settlement);
      let componentHealth = 0;
      if (sComp) {
        const checks = [sComp.armory, sComp.armored_vehicle, sComp.hailkis, !!sComp.fence_type, !!sComp.command_center_type, !!sComp.defensive_security_type];
        const operational = checks.filter(Boolean).length;
        componentHealth = (operational / checks.length) * 100;
        if (!sComp.armory) reasons.push("חדר נשק לא קיים");
        if (!sComp.fence_type) reasons.push("גדר לא מוגדרת");
        if (!sComp.command_center_type) reasons.push("מוקד שליטה לא מוגדר");
      } else {
        reasons.push("מרכיבי ביטחון לא הוזנו");
      }

      // === TRAINING SCORE ===
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const sixMonthsStr = format(sixMonthsAgo, "yyyy-MM-dd");
      const recentEvents = events.filter(e => e.settlement === settlement && e.event_date >= sixMonthsStr).length;
      const recentDrills = drills.filter(d => d.settlement === settlement && d.drill_date >= sixMonthsStr).length;
      const eventScore = Math.min(recentEvents / 2, 1) * 50;
      const drillScore = Math.min(recentDrills / 1, 1) * 50;
      const trainingScore = eventScore + drillScore;
      if (recentDrills === 0) reasons.push("אין תרגיל ב-6 חודשים אחרונים");
      if (recentEvents === 0) reasons.push("אין אירועי אימון ב-6 חודשים");

      // === READINESS (using custom weights) ===
      const readiness = Math.round(
        personnelFitness * w.personnel_weight +
        componentHealth * w.components_weight +
        trainingScore * w.training_weight
      );

      // === RISK ===
      const threat = threats.find(t => t.settlement === settlement);
      let threatRating = 0;
      if (threat) {
        const avg = (threat.village_proximity + threat.road_proximity + threat.topographic_vulnerability + threat.regional_alert_level) / 4;
        threatRating = (avg / 5) * 100;
        if (threat.village_proximity >= 4) reasons.push(`סמיכות לכפר ברמה ${threat.village_proximity}`);
      }

      let infraVulnerability = 100 - componentHealth;
      const armed = active.filter(s => s.weapon_serial);
      const weekendApproved = weapons.filter(ww => ww.settlement === settlement && ww.is_holding_weapon).length;
      const responseScore = activeSoldiers > 0
        ? ((activeSoldiers - expiredShooting) / activeSoldiers * 40) +
          (armed.length > 0 ? 30 : 0) +
          (weekendApproved > 0 ? 30 : 0)
        : 0;
      const responseCapability = 100 - responseScore;
      if (weekendApproved === 0) reasons.push("אין סוגרי שבת מאושרים");

      const sIncidents = incidents.filter(i => i.settlement === settlement).length;
      const openIncidentScore = Math.min(sIncidents * 25, 100);
      if (sIncidents > 0) reasons.push(`${sIncidents} אירועים ביטחוניים פתוחים`);

      const risk = Math.round(
        threatRating * w.risk_threat_weight +
        infraVulnerability * w.risk_infra_weight +
        responseCapability * w.risk_response_weight +
        openIncidentScore * w.risk_incidents_weight
      );

      // === PRIORITY (using custom weights) ===
      const priority = Math.round(
        risk * w.priority_risk_weight +
        (100 - readiness) * w.priority_readiness_weight
      );

      return {
        settlement, readiness, risk, priority,
        personnelFitness: Math.round(personnelFitness),
        componentHealth: Math.round(componentHealth),
        trainingScore: Math.round(trainingScore),
        threatRating: Math.round(threatRating),
        infraVulnerability: Math.round(infraVulnerability),
        responseCapability: Math.round(responseCapability),
        openIncidents: sIncidents,
        reasons, totalSoldiers, activeSoldiers, expiredShooting,
        armedCount: armed.length,
      };
    });

    setScores(results.sort((a, b) => b.priority - a.priority));
    setLoading(false);
  };

  return { scores, loading, refetch: fetchAll };
}