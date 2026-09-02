import { useEffect } from "react";
import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import AdminLayout from "@/components/layout/AdminLayout";
import PortalLayout from "@/components/layout/PortalLayout";
import LoginPage from "@/pages/LoginPage";
import { NotFoundPage, UnauthorizedPage } from "@/pages/StatusPages";
import { RequireAuth, RequirePermission, RequireRole } from "@/routes/guards";
import { Toaster } from "@/components/ui/feedback";
import { useAuthStore } from "@/store/authStore";
import LoadingScreen from "@/components/app/LoadingScreen";
import { useBootSequence } from "@/hooks/useBootSequence";

import DashboardPage from "@/pages/admin/DashboardPage";
import ResidentsPage from "@/pages/admin/residents/ResidentsPage";
import ResidentFormPage from "@/pages/admin/residents/ResidentFormPage";
import ResidentDetailPage from "@/pages/admin/residents/ResidentDetailPage";
import HouseholdsPage from "@/pages/admin/households/HouseholdsPage";
import HouseholdDetailPage from "@/pages/admin/households/HouseholdDetailPage";
import OfficialsPage from "@/pages/admin/OfficialsPage";
import BlotterPage from "@/pages/admin/blotter/BlotterPage";
import BlotterDetailPage from "@/pages/admin/blotter/BlotterDetailPage";
import CertificatesPage from "@/pages/admin/CertificatesPage";
import ClearancesPage from "@/pages/admin/ClearancesPage";
import ReportsPage from "@/pages/admin/ReportsPage";
import AnalyticsPage from "@/pages/admin/AnalyticsPage";
import GisPage from "@/pages/admin/GisPage";
import UsersPage from "@/pages/admin/UsersPage";
import RolesPage from "@/pages/admin/RolesPage";
import SettingsPage from "@/pages/admin/SettingsPage";

import PortalHomePage from "@/pages/portal/PortalHomePage";
import PortalProfilePage from "@/pages/portal/PortalProfilePage";
import PortalHouseholdPage from "@/pages/portal/PortalHouseholdPage";
import PortalRequestsPage from "@/pages/portal/PortalRequestsPage";
import PortalDocumentsPage from "@/pages/portal/PortalDocumentsPage";
import PortalNewRequestPage from "@/pages/portal/PortalNewRequestPage";
import PortalNotificationsPage from "@/pages/portal/PortalNotificationsPage";

export default function App() {
  const hydrate = useAuthStore((s) => s.hydrate);
  const boot = useBootSequence(1800);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Application splash screen - shown while the frontend initializes.
  if (!boot.ready) {
    return <LoadingScreen progress={boot.progress} message={boot.message} />;
  }

  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />

        {/*Administrative portal (desktop)*/}
        <Route
          path="/admin"
          element={
            <RequireAuth>
              <RequireRole roles={["super_admin", "admin", "staff"]}>
                <AdminLayout />
              </RequireRole>
            </RequireAuth>
          }
        >
          <Route index element={<DashboardPage />} />

          <Route
            path="residents"
            element={
              <RequirePermission permission="residents.view">
                <ResidentsPage />
              </RequirePermission>
            }
          />
          <Route
            path="residents/new"
            element={
              <RequirePermission permission="residents.create">
                <ResidentFormPage mode="create" />
              </RequirePermission>
            }
          />
          <Route
            path="residents/:id"
            element={
              <RequirePermission permission="residents.view">
                <ResidentDetailPage />
              </RequirePermission>
            }
          />
          <Route
            path="residents/:id/edit"
            element={
              <RequirePermission permission="residents.update">
                <ResidentFormPage mode="edit" />
              </RequirePermission>
            }
          />

          <Route
            path="households"
            element={
              <RequirePermission permission="households.view">
                <HouseholdsPage />
              </RequirePermission>
            }
          />
          <Route
            path="households/:id"
            element={
              <RequirePermission permission="households.view">
                <HouseholdDetailPage />
              </RequirePermission>
            }
          />

          <Route
            path="officials"
            element={
              <RequirePermission permission="officials.view">
                <OfficialsPage />
              </RequirePermission>
            }
          />

          <Route
            path="blotter"
            element={
              <RequirePermission permission="blotter.view">
                <BlotterPage />
              </RequirePermission>
            }
          />
          <Route
            path="blotter/:id"
            element={
              <RequirePermission permission="blotter.view">
                <BlotterDetailPage />
              </RequirePermission>
            }
          />

          <Route
            path="certificates"
            element={
              <RequirePermission permission="certificates.view">
                <CertificatesPage />
              </RequirePermission>
            }
          />
          <Route
            path="clearances"
            element={
              <RequirePermission permission="clearances.view">
                <ClearancesPage />
              </RequirePermission>
            }
          />

          <Route
            path="reports"
            element={
              <RequirePermission permission="reports.view">
                <ReportsPage />
              </RequirePermission>
            }
          />
          <Route
            path="analytics"
            element={
              <RequirePermission permission="analytics.view">
                <AnalyticsPage />
              </RequirePermission>
            }
          />
          <Route
            path="gis"
            element={
              <RequirePermission permission="gis.view">
                <GisPage />
              </RequirePermission>
            }
          />

          <Route
            path="users"
            element={
              <RequirePermission permission="users.view">
                <UsersPage />
              </RequirePermission>
            }
          />
          <Route
            path="roles"
            element={
              <RequirePermission permission="roles.view">
                <RolesPage />
              </RequirePermission>
            }
          />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        {/*Resident portal (mobile-first)*/}
        <Route
          path="/portal"
          element={
            <RequireAuth>
              <RequireRole roles={["resident"]}>
                <PortalLayout />
              </RequireRole>
            </RequireAuth>
          }
        >
          <Route index element={<PortalHomePage />} />
          <Route path="profile" element={<PortalProfilePage />} />
          <Route path="household" element={<PortalHouseholdPage />} />
          <Route path="requests" element={<PortalRequestsPage />} />
          <Route path="requests/new" element={<PortalNewRequestPage />} />
          <Route path="documents" element={<PortalDocumentsPage />} />
          <Route path="certificates" element={<Navigate to="/portal/documents?type=certificates" replace />} />
          <Route path="clearances" element={<Navigate to="/portal/documents?type=clearances" replace />} />
          <Route path="notifications" element={<PortalNotificationsPage />} />
        </Route>

        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      <Toaster />
    </HashRouter>
  );
}
