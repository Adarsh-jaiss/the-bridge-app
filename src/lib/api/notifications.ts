import { apiFetch, ApiResponse } from "./client";

export interface NotificationMetadata {
  user_id?: string;
  profile_picture?: string;
  [key: string]: any;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  redirect_url_template: string;
  metadata: NotificationMetadata;
  is_read: boolean;
  created_at: string;
}

export interface NotificationsResponse {
  notifications: Notification[];
  next_cursor?: string;
}

export interface UnreadCountResponse {
  count: number;
}

export async function getNotifications(cursor?: string, limit: number = 30): Promise<NotificationsResponse> {
  const queryParams = new URLSearchParams({ limit: limit.toString() });
  if (cursor) queryParams.append("cursor", cursor);

  const response = await apiFetch<ApiResponse<NotificationsResponse>>(
    `/v1/notifications?${queryParams.toString()}`,
    { method: "GET" }
  );

  return response.data;
}

export async function getUnreadNotificationsCount(): Promise<UnreadCountResponse> {
  const response = await apiFetch<ApiResponse<UnreadCountResponse>>(
    `/v1/notifications/unread-count`,
    { method: "GET" }
  );

  return response.data;
}

export async function markNotificationsAsRead(notificationIds: string[]): Promise<void> {
  await apiFetch(`/v1/notifications/mark-read`, {
    method: "PATCH",
    body: JSON.stringify({ notification_ids: notificationIds }),
  });
}
