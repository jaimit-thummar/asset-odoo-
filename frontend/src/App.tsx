import React, { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppProviders } from "./providers/AppProviders";
import { AppShell } from "./components/layout/AppShell";
import { ProtectedRoute, PublicRoute } from "./components/auth/ProtectedRoute";
import { useKeyboardShortcut } from "./hooks/useKeyboardShortcut";
import { useUIStore } from "./store/uiStore";
import { useAuth } from "./hooks/useAuth";
import { ROUTES } from "./lib/constants";

// Feature pages via Lazy Loading Splitting (Linear & Stripe best practices)
const Login = lazy(() => import("./features/Login").then(m => ({ default: m.Login })));
const Dashboard = lazy(() => import("./features/Dashboard").then(m => ({ default: m.Dashboard })));
const Assets = lazy(() => import("./features/Assets").then(m => ({ default: m.Assets })));
const Allocations = lazy(() => import("./features/Allocations").then(m => ({ default: m.Allocations })));
const Transfers = lazy(() => import("./features/Transfers").then(m => ({ default: m.Transfers })));
const Bookings = lazy(() => import("./features/Bookings").then(m => ({ default: m.Bookings })));
const Maintenance = lazy(() => import("./features/Maintenance").then(m => ({ default: m.Maintenance })));
const Audits = lazy(() => import("./features/Audits").then(m => ({ default: m.Audits })));
const Reports = lazy(() => import("./features/Reports").then(m => ({ default: m.Reports })));
const Notifications = lazy(() => import("./features/Notifications").then(m => ({ default: m.Notifications })));
const Organization = lazy(() => import("./features/Organization").then(m => ({ default: m.Organization })));
const Profile = lazy(() => import("./features/Profile").then(m => ({ default: m.Profile })));
const Settings = lazy(() => import("./features/Settings").then(m => ({ default: m.Settings })));
const Help = lazy(() => import("./features/Help").then(m => ({ default: m.Help })));

/**
 * Premium Page transition skeleton loader that simulates Stripe/Linear dashboard layouts
 */
function PageSkeleton() {
  return (
    <div className="p-6 space-y-6 animate-pulse w-full max-w-7xl mx-auto">
      <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800/80">
        <div className="space-y-2">
          <div className="h-5 w-48 bg-slate-200 dark:bg-slate-800 rounded-lg" />
          <div className="h-3.5 w-64 bg-slate-100 dark:bg-slate-900/50 rounded-lg" />
        </div>
        <div className="h-8.5 w-28 bg-slate-250 dark:bg-slate-800 rounded-lg" />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-28 bg-slate-100/60 dark:bg-slate-900/35 rounded-xl border border-slate-200/25 dark:border-slate-800/30 p-4 space-y-3">
            <div className="h-3 w-16 bg-slate-200 dark:bg-slate-850 rounded" />
            <div className="h-6 w-20 bg-slate-200 dark:bg-slate-800 rounded" />
          </div>
        ))}
      </div>

      <div className="h-80 bg-slate-100/30 dark:bg-slate-900/20 rounded-xl border border-slate-200/25 dark:border-slate-800/35 p-6 space-y-4">
        <div className="h-3 w-1/4 bg-slate-200 dark:bg-slate-850 rounded" />
        <div className="space-y-2.5">
          <div className="h-8.5 bg-slate-100/50 dark:bg-slate-900/40 rounded-lg" />
          <div className="h-8.5 bg-slate-100/50 dark:bg-slate-900/40 rounded-lg" />
          <div className="h-8.5 bg-slate-100/50 dark:bg-slate-900/40 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

/**
 * Adapter: reads `user` from auth store and passes it to legacy feature pages
 * that still expect it as a prop. Avoids touching all 11 existing feature files.
 */
function WithUser({ Component }: { Component: React.ComponentType<any> }) {
  const { user } = useAuth();
  const { openCommandPalette } = useUIStore();
  if (!user) return null;
  return (
    <Component
      user={user}
      onOpenSearch={openCommandPalette}
      onQuickAction={() => {}}
    />
  );
}

function KeyboardShortcuts() {
  const { toggleCommandPalette } = useUIStore();
  useKeyboardShortcut({
    key: "k",
    modifiers: ["ctrl"],
    onPress: toggleCommandPalette,
  });
  return null;
}

function AppRoutes() {
  return (
    <>
      <KeyboardShortcuts />
      <Suspense fallback={<PageSkeleton />}>
        <Routes>
          {/* Public routes — only accessible when NOT logged in */}
          <Route element={<PublicRoute />}>
            <Route path={ROUTES.LOGIN} element={<Login />} />
          </Route>

          {/* Protected routes under a SINGLE AppShell instance */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppShell />}>
              <Route path={ROUTES.DASHBOARD} element={<WithUser Component={Dashboard} />} />
              <Route path={ROUTES.ASSETS} element={<WithUser Component={Assets} />} />
              <Route path={ROUTES.ALLOCATIONS} element={<WithUser Component={Allocations} />} />
              <Route path={ROUTES.TRANSFERS} element={<WithUser Component={Transfers} />} />
              <Route path={ROUTES.BOOKINGS} element={<WithUser Component={Bookings} />} />
              <Route path={ROUTES.MAINTENANCE} element={<WithUser Component={Maintenance} />} />
              <Route path={ROUTES.NOTIFICATIONS} element={<WithUser Component={Notifications} />} />
              <Route path={ROUTES.PROFILE} element={<WithUser Component={Profile} />} />
              <Route path={ROUTES.SETTINGS} element={<WithUser Component={Settings} />} />
              <Route path={ROUTES.HELP} element={<WithUser Component={Help} />} />

              {/* Role-restricted subroutes */}
              <Route element={<ProtectedRoute allowedRoles={["admin", "asset_manager"]} />}>
                <Route path={ROUTES.AUDITS} element={<WithUser Component={Audits} />} />
              </Route>

              <Route element={<ProtectedRoute allowedRoles={["admin", "asset_manager", "department_head"]} />}>
                <Route path={ROUTES.REPORTS} element={<WithUser Component={Reports} />} />
                <Route path={ROUTES.ORGANIZATION} element={<WithUser Component={Organization} />} />
              </Route>
            </Route>
          </Route>

          {/* Catch-all — redirect to dashboard */}
          <Route path="*" element={<ProtectedRoute />}>
            <Route path="*" element={<WithUser Component={Dashboard} />} />
          </Route>
        </Routes>
      </Suspense>
    </>
  );
}

export default function App() {
  return (
    <AppProviders>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AppProviders>
  );
}
