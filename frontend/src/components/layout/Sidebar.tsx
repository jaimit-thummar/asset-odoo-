import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  Zap,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { useAuth } from "../../hooks/useAuth";
import { useUIStore } from "../../store/uiStore";
import { SIDEBAR_NAV, ROLE_LABELS, type RoleName } from "../../lib/constants";
import { Avatar } from "../ui/Avatar";
import { Tooltip } from "../ui/Tooltip";

export function Sidebar() {
  const { user, logout } = useAuth();
  const { sidebarOpen, toggleSidebar } = useUIStore();
  const navigate = useNavigate();

  if (!user) return null;

  const visibleNav = SIDEBAR_NAV.filter((item) =>
    item.roles.includes(user.role as RoleName)
  );

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <aside
      className={cn(
        "relative flex flex-col h-full bg-white/80 dark:bg-slate-900/90 backdrop-blur-xl border-r border-slate-200/60 dark:border-slate-700/50 transition-all duration-300 ease-in-out flex-shrink-0",
        sidebarOpen ? "w-56" : "w-16"
      )}
    >
      {/* Toggle button */}
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-6 z-10 w-6 h-6 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-sm hover:shadow-md transition-all text-slate-500 hover:text-primary-600"
        aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
      >
        {sidebarOpen ? (
          <ChevronLeft className="w-3 h-3" />
        ) : (
          <ChevronRight className="w-3 h-3" />
        )}
      </button>

      {/* Logo */}
      <div
        className={cn(
          "flex items-center gap-2.5 px-4 py-5 border-b border-slate-200/50 dark:border-slate-800 flex-shrink-0",
          !sidebarOpen && "justify-center px-2"
        )}
      >
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-600 to-violet-600 flex items-center justify-center shadow-lg shadow-primary-600/30 flex-shrink-0">
          <Zap className="w-4 h-4 text-white" />
        </div>
        {sidebarOpen && (
          <div className="overflow-hidden">
            <p className="text-sm font-bold text-slate-900 dark:text-white leading-none truncate">
              AssetFlow
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5 truncate">Pro</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {visibleNav.map((item) => {
          const Icon = item.icon;
          const link = (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/"}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 group",
                  isActive
                    ? "bg-primary-600 text-white shadow-sm shadow-primary-600/30"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white",
                  !sidebarOpen && "justify-center px-2"
                )
              }
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {sidebarOpen && (
                <span className="truncate">{item.label}</span>
              )}
            </NavLink>
          );

          if (!sidebarOpen) {
            return (
              <Tooltip key={item.path} content={item.label} position="right">
                {link as React.ReactElement}
              </Tooltip>
            );
          }
          return link;
        })}
      </nav>

      {/* User footer */}
      <div
        className={cn(
          "border-t border-slate-200/50 dark:border-slate-800 p-3",
          !sidebarOpen && "flex justify-center"
        )}
      >
        {sidebarOpen ? (
          <div className="flex items-center gap-2.5">
            <Avatar name={user.full_name} photoUrl={user.profile_photo} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-800 dark:text-white truncate">
                {user.full_name}
              </p>
              <p className="text-[10px] text-slate-400 truncate">
                {ROLE_LABELS[user.role as RoleName] ?? user.role}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="text-[10px] text-slate-400 hover:text-red-500 transition-colors font-medium"
              title="Sign out"
            >
              Out
            </button>
          </div>
        ) : (
          <Tooltip content="Sign out" position="right">
            <button onClick={handleLogout}>
              <Avatar
                name={user.full_name}
                photoUrl={user.profile_photo}
                size="sm"
              />
            </button>
          </Tooltip>
        )}
      </div>
    </aside>
  );
}
