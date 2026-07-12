import { useLocation, useNavigate } from "react-router-dom";
import { Bell, Search, Sun, Moon, Menu } from "lucide-react";
import { cn } from "../../lib/utils";
import { useAuth } from "../../hooks/useAuth";
import { useUIStore } from "../../store/uiStore";
import { useNotifications } from "../../hooks/useApi";
import { SIDEBAR_NAV } from "../../lib/constants";
import { Avatar } from "../ui/Avatar";
import { Tooltip } from "../ui/Tooltip";

export function TopNav() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const {
    theme,
    toggleTheme,
    openCommandPalette,
    openNotifications,
    toggleSidebar,
  } = useUIStore();

  const location = useLocation();
  const { data: notifications } = useNotifications(user?.id);

  const unreadCount = notifications?.filter((n: any) => !n.read).length ?? 0;

  // Derive page title from current route
  const currentNav = SIDEBAR_NAV.find((n) =>
    n.path === "/"
      ? location.pathname === "/"
      : location.pathname.startsWith(n.path)
  );
  
  // Custom check for profile path
  const isProfile = location.pathname.startsWith("/profile");
  const pageTitle = isProfile ? "My Profile" : (currentNav?.label ?? "AssetFlow Pro");

  return (
    <header className="h-14 flex items-center justify-between px-4 border-b border-slate-200/60 dark:border-slate-700/50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl flex-shrink-0 gap-4">
      {/* Left: hamburger + title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors md:hidden"
        >
          <Menu className="w-4 h-4" />
        </button>
        <h1 className="text-sm font-bold text-slate-900 dark:text-white truncate">
          {pageTitle}
        </h1>
      </div>

      {/* Right: search + actions */}
      <div className="flex items-center gap-1.5">
        {/* Search trigger */}
        <Tooltip content="Search  ⌘K" position="bottom">
          <button
            onClick={openCommandPalette}
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-all hover:border-primary-500/50"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Search…</span>
            <kbd className="ml-1 text-[10px] bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded">
              ⌘K
            </kbd>
          </button>
        </Tooltip>

        {/* Mobile search icon */}
        <button
          onClick={openCommandPalette}
          className="sm:hidden p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
        >
          <Search className="w-4 h-4" />
        </button>

        {/* Theme toggle */}
        <Tooltip content={theme === "dark" ? "Light mode" : "Dark mode"} position="bottom">
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
          >
            {theme === "dark" ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </button>
        </Tooltip>

        {/* Notifications */}
        <Tooltip content="Notifications" position="bottom">
          <button
            onClick={openNotifications}
            className="relative p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 text-[9px] font-bold bg-red-500 text-white rounded-full flex items-center justify-center">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
        </Tooltip>

        {/* Avatar */}
        {user && (
          <Tooltip content="View Profile" position="bottom">
            <div onClick={() => navigate("/profile")} className="cursor-pointer ml-1 select-none">
              <Avatar
                name={user.full_name}
                photoUrl={user.profile_photo}
                size="sm"
              />
            </div>
          </Tooltip>
        )}
      </div>
    </header>
  );
}
