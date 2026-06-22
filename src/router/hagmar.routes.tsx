import React, { Suspense } from "react";
import { Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { LoadingState } from "@/components/shared/LoadingState";

const HagmarHome = React.lazy(() => import("@/pages/HagmarHome"));
const HagmarDashboard = React.lazy(() => import("@/pages/HagmarDashboard"));
const HagmarUsersManagement = React.lazy(() => import("@/pages/HagmarUsersManagement"));
const WeaponHoldersTracking = React.lazy(() => import("@/pages/WeaponHoldersTracking"));
const HagmarSoldiers = React.lazy(() => import("@/pages/HagmarSoldiers"));
const HagmarTrainingEvents = React.lazy(() => import("@/pages/HagmarTrainingEvents"));
const HagmarEquipment = React.lazy(() => import("@/pages/HagmarEquipment"));
const HagmarSecurityIncidents = React.lazy(() => import("@/pages/HagmarSecurityIncidents"));
const HagmarShootingRanges = React.lazy(() => import("@/pages/HagmarShootingRanges"));
const HagmarSettlementDrills = React.lazy(() => import("@/pages/HagmarSettlementDrills"));
const HagmarSimulatorTraining = React.lazy(() => import("@/pages/HagmarSimulatorTraining"));
const HagmarProfessionalDev = React.lazy(() => import("@/pages/HagmarProfessionalDev"));
const HagmarSafetyInvestigations = React.lazy(() => import("@/pages/HagmarSafetyInvestigations"));
const HagmarAmlach = React.lazy(() => import("@/pages/HagmarAmlach"));
const HagmarSecurityComponents = React.lazy(() => import("@/pages/HagmarSecurityComponents"));
const HagmarDefenseFiles = React.lazy(() => import("@/pages/HagmarDefenseFiles"));
const HagmarWeaponAuthorizations = React.lazy(() => import("@/pages/HagmarWeaponAuthorizations"));
const HagmarSettlementCard = React.lazy(() => import("@/pages/HagmarSettlementCard"));
const HagmarMap = React.lazy(() => import("@/pages/HagmarMap"));
const ReadinessWeightsSettings = React.lazy(() => import("@/pages/ReadinessWeightsSettings"));
const HagmarThreatRatings = React.lazy(() => import("@/pages/HagmarThreatRatings"));

const HagmarSuspense = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<LoadingState fullPage text="טוען..." />}>
    {children}
  </Suspense>
);

const protect = (element: React.ReactNode) => (
  <ProtectedRoute>
    <HagmarSuspense>{element}</HagmarSuspense>
  </ProtectedRoute>
);

export const hagmarRoutes = (
  <>
    <Route path="/hagmar" element={protect(<HagmarHome />)} />
    <Route path="/hagmar/dashboard" element={protect(<HagmarDashboard />)} />
    <Route path="/hagmar/users-management" element={protect(<HagmarUsersManagement />)} />
    <Route path="/hagmar/weapon-holders" element={protect(<WeaponHoldersTracking />)} />
    <Route path="/hagmar/soldiers" element={protect(<HagmarSoldiers />)} />
    <Route path="/hagmar/training-events" element={protect(<HagmarTrainingEvents />)} />
    <Route path="/hagmar/equipment" element={protect(<HagmarEquipment />)} />
    <Route path="/hagmar/security-incidents" element={protect(<HagmarSecurityIncidents />)} />
    <Route path="/hagmar/shooting-ranges" element={protect(<HagmarShootingRanges />)} />
    <Route path="/hagmar/settlement-drills" element={protect(<HagmarSettlementDrills />)} />
    <Route path="/hagmar/simulator-training" element={protect(<HagmarSimulatorTraining />)} />
    <Route path="/hagmar/professional-dev" element={protect(<HagmarProfessionalDev />)} />
    <Route path="/hagmar/safety-investigations" element={protect(<HagmarSafetyInvestigations />)} />
    <Route path="/hagmar/amlach" element={protect(<HagmarAmlach />)} />
    <Route path="/hagmar/security-components" element={protect(<HagmarSecurityComponents />)} />
    <Route path="/hagmar/defense-files" element={protect(<HagmarDefenseFiles />)} />
    <Route path="/hagmar/weapon-authorizations" element={protect(<HagmarWeaponAuthorizations />)} />
    <Route path="/hagmar/settlement-card" element={protect(<HagmarSettlementCard />)} />
    <Route path="/hagmar/map" element={protect(<HagmarMap />)} />
    <Route path="/hagmar/readiness-weights" element={protect(<ReadinessWeightsSettings />)} />
    <Route path="/hagmar/threat-ratings" element={protect(<HagmarThreatRatings />)} />
  </>
);
