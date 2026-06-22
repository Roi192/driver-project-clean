import { ReactNode } from "react";
import { Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import DepartmentSelector from "@/pages/DepartmentSelector";
import BrigadeContextSelector from "@/pages/BrigadeContextSelector";
import DivisionReport from "@/pages/DivisionReport";
import DivisionMap from "@/pages/DivisionMap";
import DivisionBrigadeMap from "@/pages/DivisionBrigadeMap";
import DivisionFitness from "@/pages/DivisionFitness";
import SuperAdminDashboard from "@/pages/SuperAdminDashboard";
import BattalionUsersManagement from "@/pages/BattalionUsersManagement";
import BrigadeOutpostsManagement from "@/pages/BrigadeOutpostsManagement";

const protect = (element: ReactNode) => (
  <ProtectedRoute>{element}</ProtectedRoute>
);

export const divisionRoutes = (
  <>
    <Route path="/department-selector" element={protect(<DepartmentSelector />)} />
    <Route path="/brigade-context" element={protect(<BrigadeContextSelector />)} />
    <Route path="/division/report" element={protect(<DivisionReport />)} />
    <Route path="/division/map" element={protect(<DivisionMap />)} />
    <Route path="/division/brigade-map" element={protect(<DivisionBrigadeMap />)} />
    <Route path="/division/fitness" element={protect(<DivisionFitness />)} />
    <Route path="/super-admin-dashboard" element={protect(<SuperAdminDashboard />)} />
    <Route path="/battalion-users-management" element={protect(<BattalionUsersManagement />)} />
    <Route path="/brigade-outposts" element={protect(<BrigadeOutpostsManagement />)} />
  </>
);
