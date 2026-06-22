import { ReactNode } from "react";
import { Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Index from "@/pages/Index";
import ShiftForm from "@/pages/ShiftForm";
import DrillLocations from "@/pages/DrillLocations";
import SafetyFiles from "@/pages/SafetyFiles";
import SafetyEvents from "@/pages/SafetyEvents";
import TrainingVideos from "@/pages/TrainingVideos";
import Procedures from "@/pages/Procedures";
import MyReports from "@/pages/MyReports";
import CleaningParades from "@/pages/CleaningParades";
import FitnessReport from "@/pages/FitnessReport";
import TripForm from "@/pages/TripForm";
import DriverInterviews from "@/pages/DriverInterviews";
import MyWarnings from "@/pages/MyWarnings";
import NotificationSettings from "@/pages/NotificationSettings";

const protect = (element: ReactNode) => (
  <ProtectedRoute>{element}</ProtectedRoute>
);

export const driversRoutes = (
  <>
    <Route path="/" element={protect(<Index />)} />
    <Route path="/planag" element={protect(<Index />)} />
    <Route path="/shift-form" element={protect(<ShiftForm />)} />
    <Route path="/drill-locations" element={protect(<DrillLocations />)} />
    <Route path="/safety-files" element={protect(<SafetyFiles />)} />
    <Route path="/safety-events" element={protect(<SafetyEvents />)} />
    <Route path="/training-videos" element={protect(<TrainingVideos />)} />
    <Route path="/procedures" element={protect(<Procedures />)} />
    <Route path="/my-reports" element={protect(<MyReports />)} />
    <Route path="/cleaning-parades" element={protect(<CleaningParades />)} />
    <Route path="/fitness-report" element={protect(<FitnessReport />)} />
    <Route path="/trip-form" element={protect(<TripForm />)} />
    <Route path="/driver-interviews" element={protect(<DriverInterviews />)} />
    <Route path="/my-warnings" element={protect(<MyWarnings />)} />
    <Route path="/notification-settings" element={protect(<NotificationSettings />)} />
  </>
);
