import React, { useState } from "react";
import {
  Bell, CheckCheck, Info, CheckCircle, AlertTriangle, XCircle,
  Clock, AlarmClock, Plus, Trash2, Activity, SlidersHorizontal,
  Calendar, ChevronRight, Filter, X, Sparkles, BellOff
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import {
  useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead,
  useReminders, useCreateReminder, useCancelReminder, useActivityFeed
} from "../hooks/useApi";
import { formatRelativeTime } from "../lib/utils";
import { cn } from "../lib/utils";
import type { Employee } from "../types";

interface NotificationsProps { user: Employee; }

// ── Type metadata maps ─────────────────────────────────────────────────
const TYPE_ICONS: Record<string, React.ElementType> = {
  info: Info, success: CheckCircle, warning: AlertTriangle, danger: XCircle,
};
const TYPE_COLORS: Record<string, string> = {
  info: "text-blue-500 bg-blue-50 dark:bg-blue-950/30",
  success: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30",
  warning: "text-amber-500 bg-amber-50 dark:bg-amber-950/30",
  danger: "text-red-500 bg-red-50 dark:bg-red-950/30",
};
const TYPE_RING: Record<string, string> = {
  info: "border-blue-200 dark:border-blue-900",
  success: "border-emerald-200 dark:border-emerald-900",
  warning: "border-amber-200 dark:border-amber-900",
  danger: "border-red-200 dark:border-red-900",
};
const PRIORITY_BADGE: Record<string, string> = {
  info: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
  success: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  warning: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  danger: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300",
};

const ACTION_ICONS: Record<string, string> = {
  asset_created: "🖥️", asset_allocated: "📦", asset_returned: "↩️",
  asset_updated: "✏️", asset_deleted: "🗑️", transfer_requested: "🔄",
  transfer_approved: "✅", booking_cancelled: "❌", resource_booked: "📅",
  maintenance_reported: "🔧", maintenance_updated: "🔩", audit_cycle_created: "📋",
  audit_cycle_closed: "🔒", audit_asset_scanned: "🔍", employee_registered: "👤",
};

type TabKey = "notifications" | "timeline" | "reminders";
type CategoryFilter = "all" | "info" | "success" | "warning" | "danger";
type ReadFilter = "all" | "unread" | "read";

export const Notifications: React.FC<NotificationsProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<TabKey>("notifications");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [readFilter, setReadFilter] = useState<ReadFilter>("all");

  // Reminder form state
  const [rTitle, setRTitle] = useState("");
  const [rMessage, setRMessage] = useState("");
  const [rDateTime, setRDateTime] = useState("");
  const [rPriority, setRPriority] = useState<"info" | "success" | "warning" | "danger">("info");

  // Data hooks
  const { data: notifications = [], isLoading: nLoading } = useNotifications(user?.id);
  const { data: activityFeed = [], isLoading: aLoading } = useActivityFeed();
  const { data: reminders = [], isLoading: rLoading } = useReminders(user?.id);

  const { mutate: markRead } = useMarkNotificationRead();
  const { mutate: markAllRead } = useMarkAllNotificationsRead();
  const { mutate: createReminder, isPending: creating } = useCreateReminder();
  const { mutate: cancelReminder } = useCancelReminder();

  // Derived
  const unreadCount = notifications.filter((n: any) => !n.read).length;

  const filteredNotifications = notifications.filter((n: any) => {
    const catOk = categoryFilter === "all" || n.type === categoryFilter;
    const readOk = readFilter === "all" || (readFilter === "unread" ? !n.read : n.read);
    return catOk && readOk;
  });

  const handleMarkAll = () => markAllRead(user.id);

  const handleCreateReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rTitle || !rDateTime) return;
    createReminder({
      payload: { title: rTitle, message: rMessage, scheduled_for: rDateTime, priority: rPriority },
      userId: user.id,
    });
    setRTitle(""); setRMessage(""); setRDateTime(""); setRPriority("info");
  };

  const TABS: { key: TabKey; label: string; icon: React.ElementType; count?: number }[] = [
    { key: "notifications", label: "Notifications", icon: Bell, count: unreadCount || undefined },
    { key: "timeline", label: "Activity Timeline", icon: Activity },
    { key: "reminders", label: "Scheduled Reminders", icon: AlarmClock, count: reminders.length || undefined },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">

      {/* Page header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary-500 to-indigo-500 bg-clip-text text-transparent flex items-center gap-2">
            <Bell className="w-6 h-6 text-primary-500" />
            Notification Center
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Activity timeline, alerts, and scheduled reminders — all in one place
          </p>
        </div>
        {activeTab === "notifications" && unreadCount > 0 && (
          <button
            onClick={handleMarkAll}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-primary-600/20 cursor-pointer"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            Mark all as read ({unreadCount})
          </button>
        )}
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800/60 rounded-xl p-1">
        {TABS.map(({ key, label, icon: Icon, count }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer",
              activeTab === key
                ? "bg-white dark:bg-slate-900 text-primary-600 dark:text-primary-400 shadow-sm"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
            {count !== undefined && count > 0 && (
              <span className="bg-red-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {count > 9 ? "9+" : count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── TAB: NOTIFICATIONS ─────────────────────────────────────────── */}
      {activeTab === "notifications" && (
        <div className="space-y-4">

          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-center p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold">
              <Filter className="w-3.5 h-3.5" />
              Filters:
            </div>

            {/* Category pills */}
            <div className="flex gap-2 flex-wrap">
              {(["all", "info", "success", "warning", "danger"] as CategoryFilter[]).map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={cn(
                    "px-3 py-1 rounded-full text-[11px] font-bold border transition-all cursor-pointer capitalize",
                    categoryFilter === cat
                      ? "bg-primary-600 text-white border-primary-600"
                      : "bg-slate-50 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700 hover:border-slate-400"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 hidden sm:block" />

            {/* Read status pills */}
            <div className="flex gap-2">
              {(["all", "unread", "read"] as ReadFilter[]).map(r => (
                <button
                  key={r}
                  onClick={() => setReadFilter(r)}
                  className={cn(
                    "px-3 py-1 rounded-full text-[11px] font-bold border transition-all cursor-pointer capitalize",
                    readFilter === r
                      ? "bg-slate-800 dark:bg-white text-white dark:text-slate-900 border-slate-800 dark:border-white"
                      : "bg-slate-50 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700"
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Notification list */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            {nLoading ? (
              <div className="space-y-0">
                {[1,2,3,4].map(i => (
                  <div key={i} className="flex gap-3 p-4 border-b border-slate-50 dark:border-slate-800">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse flex-shrink-0" />
                    <div className="flex-1 space-y-2 pt-1">
                      <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded animate-pulse w-2/3" />
                      <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded animate-pulse w-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-16 text-slate-400">
                <BellOff className="w-10 h-10 opacity-30" />
                <p className="text-sm font-medium">No notifications match your filters</p>
                <button onClick={() => { setCategoryFilter("all"); setReadFilter("all"); }} className="text-xs text-primary-500 hover:underline cursor-pointer">Clear filters</button>
              </div>
            ) : (
              filteredNotifications.map((n: any) => {
                const Icon = TYPE_ICONS[n.type] ?? Info;
                const colorClass = TYPE_COLORS[n.type] ?? TYPE_COLORS.info;
                const ringClass = TYPE_RING[n.type] ?? TYPE_RING.info;
                return (
                  <div
                    key={n.id}
                    className={cn(
                      "flex items-start gap-3 p-4 border-b border-slate-50 dark:border-slate-800/60 transition-colors",
                      !n.read && "bg-primary-50/30 dark:bg-primary-950/10"
                    )}
                  >
                    <div className={cn("p-2 rounded-xl border flex-shrink-0", colorClass, ringClass)}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{n.title}</p>
                        <span className="text-[10px] text-slate-400 flex-shrink-0 mt-0.5">
                          {formatRelativeTime(n.created_at)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{n.message}</p>
                    </div>
                    {!n.read && (
                      <button
                        onClick={() => markRead(n.id)}
                        title="Mark as read"
                        className="flex-shrink-0 w-2 h-2 rounded-full bg-primary-500 mt-2 hover:scale-150 transition-transform cursor-pointer"
                      />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ── TAB: ACTIVITY TIMELINE ─────────────────────────────────────── */}
      {activeTab === "timeline" && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Recent System Activity</h2>
          </div>
          {aLoading ? (
            <div className="p-6 space-y-4">
              {[1,2,3].map(i => <div key={i} className="h-8 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />)}
            </div>
          ) : activityFeed.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-slate-400">
              <Activity className="w-10 h-10 opacity-30" />
              <p className="text-sm">No activity recorded yet</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50 dark:divide-slate-800/60 relative">
              {/* Vertical timeline line */}
              <div className="absolute left-[2.15rem] top-0 bottom-0 w-px bg-slate-100 dark:bg-slate-800 z-0" />

              {activityFeed.map((act: any, idx: number) => {
                const emoji = ACTION_ICONS[act.action] ?? "📌";
                return (
                  <div key={act.id ?? idx} className="flex items-start gap-4 px-4 py-3 relative z-10">
                    {/* Timeline dot */}
                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center text-sm">
                      {emoji}
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                          <span className="text-primary-600 dark:text-primary-400">{act.user_name ?? "System"}</span>
                          {" · "}
                          <span className="font-normal text-slate-500">{(act.action ?? "").replace(/_/g, " ")}</span>
                        </p>
                        <span className="text-[10px] text-slate-400 flex-shrink-0">
                          {formatRelativeTime(act.timestamp)}
                        </span>
                      </div>
                      {act.details && (
                        <p className="text-[11px] text-slate-400 mt-0.5 truncate">{act.details}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB: SCHEDULED REMINDERS ───────────────────────────────────── */}
      {activeTab === "reminders" && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* Reminder creation form */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-primary-50/50 to-indigo-50/30 dark:from-primary-950/20 dark:to-indigo-950/10">
                <h2 className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Plus className="w-3.5 h-3.5 text-primary-500" />
                  Schedule a Reminder
                </h2>
              </div>

              <form onSubmit={handleCreateReminder} className="p-4 space-y-3">
                <div>
                  <label className="text-[10px] text-slate-400 font-semibold uppercase block mb-1">Title *</label>
                  <input
                    value={rTitle}
                    onChange={e => setRTitle(e.target.value)}
                    placeholder="e.g. Review laptop allocation"
                    required
                    className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-primary-500 text-slate-800 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 font-semibold uppercase block mb-1">Details</label>
                  <textarea
                    value={rMessage}
                    onChange={e => setRMessage(e.target.value)}
                    placeholder="Additional context for this reminder…"
                    rows={2}
                    className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-primary-500 resize-none text-slate-800 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 font-semibold uppercase block mb-1">Schedule Date & Time *</label>
                  <input
                    type="datetime-local"
                    value={rDateTime}
                    onChange={e => setRDateTime(e.target.value)}
                    required
                    min={new Date(Date.now() + 60000).toISOString().slice(0, 16)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-primary-500 text-slate-800 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 font-semibold uppercase block mb-1">Priority Level</label>
                  <select
                    value={rPriority}
                    onChange={e => setRPriority(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-primary-500 text-slate-800 dark:text-slate-100"
                  >
                    <option value="info">ℹ️ Info</option>
                    <option value="success">✅ Success</option>
                    <option value="warning">⚠️ Warning</option>
                    <option value="danger">🚨 Urgent</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={creating || !rTitle || !rDateTime}
                  className="w-full py-2.5 px-4 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-primary-600/20"
                >
                  <AlarmClock className="w-3.5 h-3.5" />
                  {creating ? "Scheduling…" : "Schedule Reminder"}
                </button>
              </form>
            </div>
          </div>

          {/* Active reminders list */}
          <div className="lg:col-span-3">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden h-full">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800">
                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5" />
                  Pending Reminders ({reminders.length})
                </h2>
              </div>

              {rLoading ? (
                <div className="p-6 space-y-3">
                  {[1,2].map(i => <div key={i} className="h-14 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />)}
                </div>
              ) : reminders.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-16 text-slate-400">
                  <AlarmClock className="w-10 h-10 opacity-30" />
                  <p className="text-sm">No pending reminders</p>
                  <p className="text-xs text-slate-400">Use the form to schedule your first reminder</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50 dark:divide-slate-800/60">
                  {reminders.map((r: any) => {
                    const badge = PRIORITY_BADGE[r.priority] ?? PRIORITY_BADGE.info;
                    const scheduledDate = new Date(r.scheduled_for);
                    const isOverdue = scheduledDate < new Date();
                    return (
                      <div key={r.id} className="flex items-start gap-3 p-4">
                        <div className={cn(
                          "p-2 rounded-xl flex-shrink-0",
                          TYPE_COLORS[r.priority] ?? TYPE_COLORS.info
                        )}>
                          <AlarmClock className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{r.title}</p>
                            <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0", badge)}>
                              {r.priority}
                            </span>
                          </div>
                          {r.message && (
                            <p className="text-xs text-slate-500 mt-0.5">{r.message}</p>
                          )}
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            <span className={cn("text-[10px] font-medium", isOverdue ? "text-red-500" : "text-slate-400")}>
                              {isOverdue ? "Overdue · " : ""}
                              {scheduledDate.toLocaleString()}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => cancelReminder({ reminderId: r.id, userId: user.id })}
                          title="Cancel reminder"
                          className="flex-shrink-0 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
