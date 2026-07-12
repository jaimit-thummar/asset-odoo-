import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, LayoutDashboard, Package, ArrowLeftRight, CalendarDays, Wrench, ClipboardCheck, Users, Settings, HelpCircle, Cpu } from "lucide-react";
import { useUIStore } from "../../store/uiStore";
import { useAuth } from "../../hooks/useAuth";
import { useClickOutside } from "../../hooks/useClickOutside";
import { useKeyboardShortcut } from "../../hooks/useKeyboardShortcut";
import { SIDEBAR_NAV, type RoleName } from "../../lib/constants";
import { cn } from "../../lib/utils";
import { useState } from "react";

export function GlobalSearch() {
  const { closeCommandPalette } = useUIStore();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);

  useClickOutside(panelRef, closeCommandPalette);
  useKeyboardShortcut({ key: "Escape", onPress: closeCommandPalette });

  const visibleNav = SIDEBAR_NAV.filter((item) =>
    item.roles.includes((user?.role ?? "employee") as RoleName)
  );

  const filtered = query.trim()
    ? visibleNav.filter((n) =>
        n.label.toLowerCase().includes(query.toLowerCase())
      )
    : visibleNav;

  const handleSelect = (path: string) => {
    navigate(path);
    closeCommandPalette();
    setQuery("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />

      {/* Panel */}
      <div
        ref={panelRef}
        className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-800">
          <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pages, actions…"
            className="flex-1 text-sm bg-transparent text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
          />
          <button onClick={closeCommandPalette} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-72 overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <p className="text-center text-xs text-slate-400 py-8">
              No results for "{query}"
            </p>
          ) : (
            filtered.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.path}
                  onClick={() => handleSelect(item.path)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-primary-600 dark:hover:text-primary-400 transition-colors text-left"
                >
                  <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-3.5 h-3.5 text-slate-500" />
                  </div>
                  <span className="font-medium">{item.label}</span>
                </button>
              );
            })
          )}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center gap-3 text-[11px] text-slate-400">
          <span><kbd className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">↵</kbd> Select</span>
          <span><kbd className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">Esc</kbd> Close</span>
        </div>
      </div>
    </div>
  );
}
