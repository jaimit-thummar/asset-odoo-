import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCheck, Info, CheckCircle, AlertTriangle, XCircle, ArrowRight } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useNotifications, useMarkNotificationRead } from "../../hooks/useApi";
import { useClickOutside } from "../../hooks/useClickOutside";
import { formatRelativeTime } from "../../lib/utils";
import { cn } from "../../lib/utils";
import type { AppNotification } from "../../types";

const typeIcons = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  danger: XCircle,
};

const typeColors = {
  info: "text-blue-500",
  success: "text-emerald-500",
  warning: "text-amber-500",
  danger: "text-red-500",
};

interface NotificationPanelProps {
  open: boolean;
  onClose: () => void;
}

export function NotificationPanel({ open, onClose }: NotificationPanelProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const panelRef = useRef<HTMLDivElement>(null);
  const { data: notifications = [], isLoading } = useNotifications(user?.id);
  const { mutate: markRead } = useMarkNotificationRead();

  const handleViewAll = () => { onClose(); navigate("/notifications"); };

  useClickOutside(panelRef, onClose, open);

  if (!open) return null;

  const unread = notifications.filter((n: AppNotification) => !n.read);
  const hasUnread = unread.length > 0;

  const handleMarkAll = () => {
    unread.forEach((n: AppNotification) => markRead(n.id));
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end items-start">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-transparent"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className="relative mt-14 mr-3 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden max-h-[calc(100vh-80px)] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-slate-500" />
            <span className="text-sm font-bold text-slate-900 dark:text-white">
              Notifications
            </span>
            {hasUnread && (
              <span className="bg-red-500 text-white text-[9px] font-bold rounded-full px-1.5 py-0.5">
                {unread.length}
              </span>
            )}
          </div>
          {hasUnread && (
            <button
              onClick={handleMarkAll}
              className="flex items-center gap-1 text-[11px] text-primary-600 hover:text-primary-700 font-semibold"
            >
              <CheckCheck className="w-3 h-3" />
              Mark all read
            </button>
          )}
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1">
          {isLoading ? (
            <div className="space-y-0">
              {[1, 2, 3].map((i) => (
                <div key={i} className="px-4 py-3 border-b border-slate-50 dark:border-slate-800/50">
                  <div className="flex gap-3">
                    <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 animate-pulse flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded animate-pulse w-3/4" />
                      <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded animate-pulse w-full" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-slate-400">
              <Bell className="w-8 h-8 opacity-30" />
              <p className="text-xs">No notifications yet</p>
            </div>
          ) : (
            notifications.map((n: AppNotification) => {
              const Icon = typeIcons[n.type] ?? Info;
              const color = typeColors[n.type] ?? typeColors.info;
              return (
                <button
                  key={n.id}
                  onClick={() => !n.read && markRead(n.id)}
                  className={cn(
                    "w-full flex items-start gap-3 px-4 py-3 text-left border-b border-slate-50 dark:border-slate-800/50 transition-colors",
                    n.read
                      ? "opacity-60"
                      : "bg-primary-50/40 dark:bg-primary-950/10 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  )}
                >
                  <div className={cn("mt-0.5 flex-shrink-0", color)}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {n.title}
                    </p>
                    <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5 line-clamp-2">
                      {n.message}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1">
                      {formatRelativeTime(n.created_at)}
                    </p>
                  </div>
                  {!n.read && (
                    <div className="w-1.5 h-1.5 rounded-full bg-primary-500 flex-shrink-0 mt-1.5" />
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Footer: View All link */}
        <div className="border-t border-slate-100 dark:border-slate-800 px-4 py-2.5">
          <button
            onClick={handleViewAll}
            className="w-full flex items-center justify-center gap-1.5 text-[11px] text-primary-600 dark:text-primary-400 hover:text-primary-700 font-semibold py-1 transition-colors cursor-pointer"
          >
            View all in Notification Center
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
