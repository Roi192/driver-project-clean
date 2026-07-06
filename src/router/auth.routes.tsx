import { Route } from "react-router-dom";
import Auth from "@/pages/Auth";
import AuthBattalion from "@/pages/AuthBattalion";
import BrigadeAuth from "@/pages/BrigadeAuth";
import DivisionAuth from "@/pages/DivisionAuth";
import ResetPassword from "@/pages/ResetPassword";
import Install from "@/pages/Install";
import DepartmentInstallPage from "@/pages/DepartmentInstallPage";

export const authRoutes = (
  <>
    <Route path="/auth" element={<Auth />} />
    <Route path="/auth/gdud" element={<AuthBattalion />} />
    <Route path="/auth/brigade/:code" element={<BrigadeAuth />} />
    <Route path="/auth/division" element={<DivisionAuth />} />
    <Route path="/reset-password" element={<ResetPassword />} />
    <Route path="/install" element={<Install />} />
    <Route path="/install/drivers" element={<DepartmentInstallPage department="drivers" />} />
    <Route path="/install/gdud" element={<DepartmentInstallPage department="gdud" />} />
  </>
);
