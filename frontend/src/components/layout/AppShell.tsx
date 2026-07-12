import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import toast from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Sidebar } from "./Sidebar";
import { TopNav } from "./TopNav";
import { GlobalSearch } from "../feedback/GlobalSearch";
import { NotificationPanel } from "../feedback/NotificationPanel";
import { useUIStore } from "../../store/uiStore";
import { useAuth } from "../../hooks/useAuth";
import { supabase, supabaseActive } from "../../services/supabase";
import { QK } from "../../hooks/useApi";

export function AppShell() {
  const { commandPaletteOpen, notificationPanelOpen, closeNotifications } =
    useUIStore();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // ── Supabase Realtime: listen for new notifications ──────────────────
  useEffect(() => {
    if (!supabaseActive || !supabase || !user?.id) return;

    const sb = supabase; // non-null narrowed reference
    const channel = sb
      .channel(`notifications:user:${user.id}`)
      .on(
        "postgres_changes" as any,
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `employee_id=eq.${user.id}`,
        },
        (payload: any) => {
          queryClient.invalidateQueries({
            predicate: (q) => q.queryKey[0] === "notifications",
          });

          const title = payload.new?.title ?? "New Notification";
          const typeMap: Record<string, string> = {
            success: "✅", warning: "⚠️", danger: "🚨", info: "ℹ️",
          };
          const emoji = typeMap[payload.new?.type] ?? "🔔";
          toast(`${emoji} ${title}`, {
            duration: 4000,
            style: { fontWeight: 600, fontSize: "13px" },
          });

          try {
            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = 880;
            gain.gain.setValueAtTime(0.15, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.3);
          } catch { /* silent */ }
        }
      )
      .subscribe();

    return () => { sb.removeChannel(channel); };
  }, [user?.id, queryClient]);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 font-sans">
      {/* Sidebar */}
      <Sidebar />

      {/* Main */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Top navigation bar */}
        <TopNav />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>

      {/* Global overlays */}
      {commandPaletteOpen && <GlobalSearch />}
      <NotificationPanel
        open={notificationPanelOpen}
        onClose={closeNotifications}
      />
    </div>
  );
}
