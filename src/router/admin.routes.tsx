import { ReactNode } from "react";
import { Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import AdminDashboard from "@/pages/AdminDashboard";
import AnnualWorkPlan from "@/pages/AnnualWorkPlan";
import BomReport from "@/pages/BomReport";
import SoldiersControl from "@/pages/SoldiersControl";
import AttendanceTracking from "@/pages/AttendanceTracking";
import PunishmentsTracking from "@/pages/PunishmentsTracking";
import ExitRequests from "@/pages/ExitRequests";
import Warnings from "@/pages/Warnings";
import TasksTracking from "@/pages/TasksTracking";
import Inspections from "@/pages/Inspections";
import HolidaysManagement from "@/pages/HolidaysManagement";
import AccidentsTracking from "@/pages/AccidentsTracking";
import KnowTheArea from "@/pages/KnowTheArea";
import UsersManagement from "@/pages/UsersManagement";
import CleaningParadesAdmin from "@/pages/CleaningParadesAdmin";
import YearlySummary from "@/pages/YearlySummary";
import SafetyScoresManagement from "@/pages/SafetyScoresManagement";
import AdminDriverInterviews from "@/pages/AdminDriverInterviews";
import CoursesManagement from "@/pages/CoursesManagement";
import WorkSchedule from "@/pages/WorkSchedule";
import WeeklyMeeting from "@/pages/WeeklyMeeting";
import ProcedureSignaturesTracking from "@/pages/ProcedureSignaturesTracking";
import EquipmentTracking from "@/pages/EquipmentTracking";
import FrameworksManagement from "@/pages/FrameworksManagement";

const protect = (element: ReactNode) => (
  <ProtectedRoute>{element}</ProtectedRoute>
);

export const adminRoutes = (
  <>
    <Route path="/admin" element={protect(<AdminDashboard />)} />
    <Route path="/annual-work-plan" element={protect(<AnnualWorkPlan />)} />
    <Route path="/bom-report" element={protect(<BomReport />)} />
    <Route path="/soldiers-control" element={protect(<SoldiersControl />)} />
    <Route path="/attendance-tracking" element={protect(<AttendanceTracking />)} />
    <Route path="/punishments" element={protect(<PunishmentsTracking />)} />
    <Route path="/exit-requests" element={protect(<ExitRequests />)} />
    <Route path="/warnings" element={protect(<Warnings />)} />
    <Route path="/tasks-tracking" element={protect(<TasksTracking />)} />
    <Route path="/inspections" element={protect(<Inspections />)} />
    <Route path="/holidays-management" element={protect(<HolidaysManagement />)} />
    <Route path="/accidents-tracking" element={protect(<AccidentsTracking />)} />
    <Route path="/know-the-area" element={protect(<KnowTheArea />)} />
    <Route path="/users-management" element={protect(<UsersManagement />)} />
    <Route path="/cleaning-parades-admin" element={protect(<CleaningParadesAdmin />)} />
    <Route path="/yearly-summary" element={protect(<YearlySummary />)} />
    <Route path="/safety-scores" element={protect(<SafetyScoresManagement />)} />
    <Route path="/admin-driver-interviews" element={protect(<AdminDriverInterviews />)} />
    <Route path="/courses-management" element={protect(<CoursesManagement />)} />
    <Route path="/work-schedule" element={protect(<WorkSchedule />)} />
    <Route path="/weekly-meeting" element={protect(<WeeklyMeeting />)} />
    <Route path="/procedure-signatures-tracking" element={protect(<ProcedureSignaturesTracking />)} />
    <Route path="/equipment-tracking" element={protect(<EquipmentTracking />)} />
    <Route path="/frameworks" element={protect(<FrameworksManagement />)} />
  </>
);
