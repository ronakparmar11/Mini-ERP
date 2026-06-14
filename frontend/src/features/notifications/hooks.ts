import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getNotifications,
  getUnreadCount,
  markNotificationRead,
} from "@/api/notifications";

const NOTIFICATION_KEY = "notifications";
const UNREAD_COUNT_KEY = "notifications-unread-count";

/** Fetches the full notification list, polling every 30 seconds. */
export const useNotifications = () =>
  useQuery({
    queryKey: [NOTIFICATION_KEY],
    queryFn: getNotifications,
    refetchInterval: 30_000,
  });

/** Fetches only the unread count for the bell badge, polling every 30 seconds. */
export const useUnreadNotificationCount = () =>
  useQuery({
    queryKey: [UNREAD_COUNT_KEY],
    queryFn: getUnreadCount,
    refetchInterval: 30_000,
  });

/** Marks a notification as read and refreshes both the list and the badge count. */
export const useMarkNotificationRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => markNotificationRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [NOTIFICATION_KEY] });
      qc.invalidateQueries({ queryKey: [UNREAD_COUNT_KEY] });
    },
  });
};
