import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { EmergencyModeProvider } from "@/hooks/useEmergencyMode";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import AuthBattalion from "./pages/AuthBattalion";
import ShiftForm from "./pages/ShiftForm";
import DrillLocations from "./pages/DrillLocations";
import SafetyFiles from "./pages/SafetyFiles";
import SafetyEvents from "./pages/SafetyEvents";
import TrainingVideos from "./pages/TrainingVideos";
import Procedures from "./pages/Procedures";
import MyReports from "./pages/MyReports";
import AdminDashboard from "./pages/AdminDashboard";
import AnnualWorkPlan from "./pages/AnnualWorkPlan";
import BomReport from "./pages/BomReport";
import SoldiersControl from "./pages/SoldiersControl";
import AttendanceTracking from "./pages/AttendanceTracking";
import PunishmentsTracking from "./pages/PunishmentsTracking";
import Inspections from "./pages/Inspections";
import HolidaysManagement from "./pages/HolidaysManagement";
import AccidentsTracking from "./pages/AccidentsTracking";
import KnowTheArea from "./pages/KnowTheArea";
import Install from "./pages/Install";
import DepartmentInstallPage from "./pages/DepartmentInstallPage";
import UsersManagement from "./pages/UsersManagement";
import CleaningParades from "./pages/CleaningParades";
import CleaningParadesAdmin from "./pages/CleaningParadesAdmin";
import FitnessReport from "./pages/FitnessReport";
import TripForm from "./pages/TripForm";
import SafetyScoresManagement from "./pages/SafetyScoresManagement";
import DriverInterviews from "./pages/DriverInterviews";
import AdminDriverInterviews from "./pages/AdminDriverInterviews";
import CoursesManagement from "./pages/CoursesManagement";
import WorkSchedule from "./pages/WorkSchedule";
import ProcedureSignaturesTracking from "./pages/ProcedureSignaturesTracking";
import WeeklyMeeting from "./pages/WeeklyMeeting";
import EquipmentTracking from "./pages/EquipmentTracking";
import DepartmentSelector from "./pages/DepartmentSelector";
import HagmarAuth from "./pages/HagmarAuth";
import HagmarHome from "./pages/HagmarHome";
import HagmarUsersManagement from "./pages/HagmarUsersManagement";
import WeaponHoldersTracking from "./pages/WeaponHoldersTracking";
import HagmarSoldiers from "./pages/HagmarSoldiers";
import HagmarTrainingEvents from "./pages/HagmarTrainingEvents";
import HagmarEquipment from "./pages/HagmarEquipment";
import HagmarSecurityIncidents from "./pages/HagmarSecurityIncidents";
import HagmarDashboard from "./pages/HagmarDashboard";
import HagmarShootingRanges from "./pages/HagmarShootingRanges";
import HagmarSettlementDrills from "./pages/HagmarSettlementDrills";
import HagmarSimulatorTraining from "./pages/HagmarSimulatorTraining";
import HagmarProfessionalDev from "./pages/HagmarProfessionalDev";
import HagmarSafetyInvestigations from "./pages/HagmarSafetyInvestigations";
import HagmarAmlach from "./pages/HagmarAmlach";
import HagmarSecurityComponents from "./pages/HagmarSecurityComponents";
import HagmarDefenseFiles from "./pages/HagmarDefenseFiles";
import HagmarWeaponAuthorizations from "./pages/HagmarWeaponAuthorizations";
import HagmarSettlementCard from "./pages/HagmarSettlementCard";
import HagmarMap from "./pages/HagmarMap";
import ReadinessWeightsSettings from "./pages/ReadinessWeightsSettings";
import HagmarThreatRatings from "./pages/HagmarThreatRatings";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import BattalionUsersManagement from "./pages/BattalionUsersManagement";
import NotFound from "./pages/NotFound";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";



const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <EmergencyModeProvider>
        <Toaster />
        <Sonner />
        <InstallPrompt />
        <BrowserRouter>
          <Routes>
            <Route path="/install" element={<Install />} />
            <Route path="/install/drivers" element={<DepartmentInstallPage department="drivers" />} />
            <Route path="/install/gdud" element={<DepartmentInstallPage department="gdud" />} />
            <Route path="/install/hagmar" element={<DepartmentInstallPage department="hagmar" />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/auth/gdud" element={<AuthBattalion />} />
            <Route path="/auth/hagmar" element={<HagmarAuth />} />
            <Route
              path="/department-selector"
              element={
                <ProtectedRoute>
                  <DepartmentSelector />
                </ProtectedRoute>
              }
            />
            <Route
              path="/hagmar"
              element={
                <ProtectedRoute>
                  <HagmarHome />
                </ProtectedRoute>
              }
            />
            <Route
              path="/hagmar/users-management"
              element={
                <ProtectedRoute>
                  <HagmarUsersManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/hagmar/weapon-holders"
              element={
                <ProtectedRoute>
                  <WeaponHoldersTracking />
                </ProtectedRoute>
              }
            />
            <Route
              path="/hagmar/soldiers"
              element={
                <ProtectedRoute>
                  <HagmarSoldiers />
                </ProtectedRoute>
              }
            />
            <Route
              path="/hagmar/training-events"
              element={
                <ProtectedRoute>
                  <HagmarTrainingEvents />
                </ProtectedRoute>
              }
            />
            <Route
              path="/hagmar/equipment"
              element={
                <ProtectedRoute>
                  <HagmarEquipment />
                </ProtectedRoute>
              }
            />
            <Route
              path="/hagmar/security-incidents"
              element={
                <ProtectedRoute>
                  <HagmarSecurityIncidents />
                </ProtectedRoute>
              }
            />
            <Route
              path="/hagmar/dashboard"
              element={
                <ProtectedRoute>
                  <HagmarDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/hagmar/shooting-ranges"
              element={
                <ProtectedRoute>
                  <HagmarShootingRanges />
                </ProtectedRoute>
              }
            />
            <Route
              path="/hagmar/settlement-drills"
              element={
                <ProtectedRoute>
                  <HagmarSettlementDrills />
                </ProtectedRoute>
              }
            />
            <Route
              path="/hagmar/simulator-training"
              element={
                <ProtectedRoute>
                  <HagmarSimulatorTraining />
                </ProtectedRoute>
              }
            />
            <Route
              path="/hagmar/professional-dev"
              element={
                <ProtectedRoute>
                  <HagmarProfessionalDev />
                </ProtectedRoute>
              }
            />
            <Route
              path="/hagmar/safety-investigations"
              element={
                <ProtectedRoute>
                  <HagmarSafetyInvestigations />
                </ProtectedRoute>
              }
            />
            <Route
              path="/hagmar/amlach"
              element={
                <ProtectedRoute>
                  <HagmarAmlach />
                </ProtectedRoute>
              }
            />
            <Route
              path="/hagmar/security-components"
              element={
                <ProtectedRoute>
                  <HagmarSecurityComponents />
                </ProtectedRoute>
              }
            />
            <Route
              path="/hagmar/defense-files"
              element={
                <ProtectedRoute>
                  <HagmarDefenseFiles />
                </ProtectedRoute>
              }
            />
            <Route
              path="/hagmar/weapon-authorizations"
              element={
                <ProtectedRoute>
                  <HagmarWeaponAuthorizations />
                </ProtectedRoute>
              }
            />
            <Route
              path="/hagmar/settlement-card"
              element={
                <ProtectedRoute>
                  <HagmarSettlementCard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/hagmar/map"
              element={
                <ProtectedRoute>
                  <HagmarMap />
                </ProtectedRoute>
              }
            />
            <Route
              path="/hagmar/readiness-weights"
              element={
                <ProtectedRoute>
                  <ReadinessWeightsSettings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/hagmar/threat-ratings"
              element={
                <ProtectedRoute>
                  <HagmarThreatRatings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/planag"
              element={
                <ProtectedRoute>
                  <Index />
                </ProtectedRoute>
              }
            />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Index />
                </ProtectedRoute>
              }
            />
            <Route
              path="/shift-form"
              element={
                <ProtectedRoute>
                  <ShiftForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/drill-locations"
              element={
                <ProtectedRoute>
                  <DrillLocations />
                </ProtectedRoute>
              }
            />
            <Route
              path="/safety-files"
              element={
                <ProtectedRoute>
                  <SafetyFiles />
                </ProtectedRoute>
              }
            />
            <Route
              path="/safety-events"
              element={
                <ProtectedRoute>
                  <SafetyEvents />
                </ProtectedRoute>
              }
            />
            <Route
              path="/training-videos"
              element={
                <ProtectedRoute>
                  <TrainingVideos />
                </ProtectedRoute>
              }
            />
            <Route
              path="/procedures"
              element={
                <ProtectedRoute>
                  <Procedures />
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-reports"
              element={
                <ProtectedRoute>
                  <MyReports />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/annual-work-plan"
              element={
                <ProtectedRoute>
                  <AnnualWorkPlan />
                </ProtectedRoute>
              }
            />
            <Route
              path="/bom-report"
              element={
                <ProtectedRoute>
                  <BomReport />
                </ProtectedRoute>
              }
            />
            <Route
              path="/soldiers-control"
              element={
                <ProtectedRoute>
                  <SoldiersControl />
                </ProtectedRoute>
              }
            />
            <Route
              path="/attendance-tracking"
              element={
                <ProtectedRoute>
                  <AttendanceTracking />
                </ProtectedRoute>
              }
            />
            <Route
              path="/punishments"
              element={
                <ProtectedRoute>
                  <PunishmentsTracking />
                </ProtectedRoute>
              }
            />
            <Route
              path="/inspections"
              element={
                <ProtectedRoute>
                  <Inspections />
                </ProtectedRoute>
              }
            />
            <Route
              path="/holidays-management"
              element={
                <ProtectedRoute>
                  <HolidaysManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/accidents-tracking"
              element={
                <ProtectedRoute>
                  <AccidentsTracking />
                </ProtectedRoute>
              }
            />
            <Route
              path="/know-the-area"
              element={
                <ProtectedRoute>
                  <KnowTheArea />
                </ProtectedRoute>
              }
            />
            <Route
              path="/users-management"
              element={
                <ProtectedRoute>
                  <UsersManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/cleaning-parades"
              element={
                <ProtectedRoute>
                  <CleaningParades />
                </ProtectedRoute>
              }
            />
            <Route
              path="/cleaning-parades-admin"
              element={
                <ProtectedRoute>
                  <CleaningParadesAdmin />
                </ProtectedRoute>
              }
            />
            <Route
              path="/fitness-report"
              element={
                <ProtectedRoute>
                  <FitnessReport />
                </ProtectedRoute>
              }
            />
            <Route
              path="/trip-form"
              element={
                <ProtectedRoute>
                  <TripForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/safety-scores"
              element={
                <ProtectedRoute>
                  <SafetyScoresManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/driver-interviews"
              element={
                <ProtectedRoute>
                  <DriverInterviews />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin-driver-interviews"
              element={
                <ProtectedRoute>
                  <AdminDriverInterviews />
                </ProtectedRoute>
              }
            />
            <Route
              path="/courses-management"
              element={
                <ProtectedRoute>
                  <CoursesManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/work-schedule"
              element={
                <ProtectedRoute>
                  <WorkSchedule />
                </ProtectedRoute>
              }
            />
            <Route
              path="/weekly-meeting"
              element={
                <ProtectedRoute>
                  <WeeklyMeeting />
                </ProtectedRoute>
              }
            />
            <Route
              path="/procedure-signatures-tracking"
              element={
                <ProtectedRoute>
                  <ProcedureSignaturesTracking />
                </ProtectedRoute>
              }
            />
            <Route
              path="/equipment-tracking"
              element={
                <ProtectedRoute>
                  <EquipmentTracking />
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin-dashboard"
              element={
                <ProtectedRoute>
                  <SuperAdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/battalion-users-management"
              element={
                <ProtectedRoute>
                  <BattalionUsersManagement />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        </EmergencyModeProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;