import { Bell } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { cn } from "@/utils/cn";
import {
  useMarkNotificationRead,
  useNotifications,
  useUnreadNotificationCount,
} from "@/features/notifications/hooks";

/**
 * Returns a human-friendly relative timestamp string.
 * e.g. "2m ago", "1h ago", "3d ago"
 */
function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const seconds = Math.floor((now - then) / 1000);

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export function NotificationDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { data: notifications = [] } = useNotifications();
  const { data: unreadData } = useUnreadNotificationCount();
  const markRead = useMarkNotificationRead();
  const { t } = useTranslation();

  const unreadCount = unreadData?.count ?? 0;

  // Close when clicking outside
  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      {/* Bell button — reuses existing IconButton styling from Topbar */}
      <button
        id="notification-bell"
        aria-label={t("topbar.notifications")}
        title={t("topbar.notifications")}
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-10 w-10 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-error px-1 text-[10px] font-bold leading-none text-on-error">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-12 z-30 w-80 animate-fade-in rounded-xl border border-outline-variant/60 bg-surface-container-lowest shadow-lg sm:w-96">
          {/* Header */}
          <div className="border-b border-outline-variant/40 px-4 py-3">
            <h3 className="text-body-md font-semibold text-on-surface">
              {t("topbar.notifications")}
            </h3>
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex items-center justify-center py-10 text-body-sm text-on-surface-variant">
                No notifications.
              </div>
            ) : (
              <ul>
                {notifications.map((notif) => (
                  <li key={notif.id}>
                    <button
                      className={cn(
                        "flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-container",
                        !notif.is_read && "bg-primary/[0.04]",
                      )}
                      onClick={() => {
                        if (!notif.is_read) {
                          markRead.mutate(notif.id);
                        }
                      }}
                    >
                      {/* Unread dot */}
                      <div className="mt-1.5 flex-shrink-0">
                        <span
                          className={cn(
                            "block h-2 w-2 rounded-full",
                            notif.is_read
                              ? "bg-transparent"
                              : "bg-primary",
                          )}
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            "truncate text-body-md",
                            notif.is_read
                              ? "text-on-surface-variant"
                              : "font-semibold text-on-surface",
                          )}
                        >
                          {notif.title}
                        </p>
                        <p className="mt-0.5 text-body-sm text-on-surface-variant line-clamp-2">
                          {notif.message}
                        </p>
                        <p className="mt-1 text-[11px] text-outline">
                          {timeAgo(notif.created_at)}
                        </p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
