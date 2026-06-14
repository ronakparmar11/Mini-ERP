import { api } from "./axios";

export interface Notification {
  id: number;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface UnreadCount {
  count: number;
}

export const getNotifications = (): Promise<Notification[]> =>
  api.get<Notification[]>("/notifications").then((r) => r.data);

export const markNotificationRead = (id: number): Promise<Notification> =>
  api.patch<Notification>(`/notifications/${id}/read`).then((r) => r.data);

export const getUnreadCount = (): Promise<UnreadCount> =>
  api.get<UnreadCount>("/notifications/unread-count").then((r) => r.data);
