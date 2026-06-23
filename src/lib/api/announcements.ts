import { apiFetch, ApiResponse } from "./client";

export interface AnnouncementResponse {
  id?: number;
  title?: string;
  content?: string;
  announcement_type?: string;
  attachments?: string[];
  created_at?: string;
}

export interface AnnouncementsListResponse {
  announcements: AnnouncementResponse[];
  next_cursor?: number;
}

export interface GetAnnouncementsParams {
  limit?: number;
  cursor?: number;
}

export async function getAnnouncements(params?: GetAnnouncementsParams): Promise<AnnouncementsListResponse> {
  const queryParams = new URLSearchParams();
  if (params?.limit !== undefined) queryParams.append("limit", params.limit.toString());
  if (params?.cursor !== undefined && params?.cursor > 0) queryParams.append("cursor", params.cursor.toString());

  const queryString = queryParams.toString();
  const url = `/v1/announcements${queryString ? `?${queryString}` : ""}`;

  const response = await apiFetch<ApiResponse<AnnouncementsListResponse>>(url, {
    method: "GET",
  });
  
  return response.data;
}
