import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { PageSpinner } from "../ui/Spinner";
import { ROUTES } from "../../lib/constants";
import type { RoleName } from "../../lib/constants";

interface ProtectedRouteProps {
  /**
   * If provided, only users whose role is in this list can access the route.
   * Omitting means any authenticated user is allowed.
   */
  allowedRoles?: RoleName[];
}

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  // Not logged in → redirect to login, remembering the target
  if (!isAuthenticated || !user) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
  }

  // Role check
  if (allowedRoles && allowedRoles.length > 0) {
    if (!allowedRoles.includes(user.role as RoleName)) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen gap-4 text-center p-6">
          <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-950/40 flex items-center justify-center text-3xl">
            🚫
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            Access Denied
          </h1>
          <p className="text-sm text-slate-500 max-w-xs">
            Your role ({user.role}) does not have permission to access this page.
            Contact your administrator.
          </p>
        </div>
      );
    }
  }

  return <Outlet />;
}

/** For routes that should only be accessible when NOT logged in (e.g. login page) */
export function PublicRoute() {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) {
    return <Navigate to={ROUTES.DASHBOARD} replace />;
  }
  return <Outlet />;
}
