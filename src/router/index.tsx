import { Routes, Route } from "react-router-dom";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import NotFound from "@/pages/NotFound";
import { authRoutes } from "./auth.routes";
import { driversRoutes } from "./drivers.routes";
import { adminRoutes } from "./admin.routes";
import { hagmarRoutes } from "./hagmar.routes";
import { divisionRoutes } from "./division.routes";

export const AppRoutes = () => (
  <ErrorBoundary>
    <Routes>
      {authRoutes}
      {driversRoutes}
      {adminRoutes}
      {divisionRoutes}
      {hagmarRoutes}
      <Route path="*" element={<NotFound />} />
    </Routes>
  </ErrorBoundary>
);
