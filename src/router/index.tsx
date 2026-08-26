import { Routes, Route } from "react-router-dom";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import NotFound from "@/pages/NotFound";
import PublicSafetyReport from "@/pages/PublicSafetyReport";
import { authRoutes } from "./auth.routes";
import { driversRoutes } from "./drivers.routes";
import { adminRoutes } from "./admin.routes";
import { divisionRoutes } from "./division.routes";

export const AppRoutes = () => (
  <ErrorBoundary>
    <Routes>
      <Route path="/report" element={<PublicSafetyReport />} />
      {authRoutes}
      {driversRoutes}
      {adminRoutes}
      {divisionRoutes}
      <Route path="*" element={<NotFound />} />
    </Routes>
  </ErrorBoundary>
);
