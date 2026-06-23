import { apiFetch, ApiResponse } from "./client";

export interface ContactResponse {
  company: any;
  profile_picture?: string;
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  country?: string;
  distance?: number;
  email?: string;
  first_name?: string;
  id?: number;
  public_id?: string;
  industry?: string;
  last_name?: string;
  latitude?: number;
  longitude?: number;
  mobile_number?: string;
  postal_code?: string;
  service?: string;
  state?: string;
  bio?: string;
  rank?: string;
}

export interface DirectoryResponse {
  contacts: ContactResponse[];
  next_cursor_distance?: number;
  next_cursor_id?: number;
}

export interface GetDirectoryParams {
  industry?: string;
  longitude?: number;
  latitude?: number;
  cursor_id?: number;
  cursor_distance?: number;
  limit?: number;
}

export async function getDirectoryContacts(params?: GetDirectoryParams): Promise<DirectoryResponse> {
  const queryParams = new URLSearchParams();
  if (params?.industry) queryParams.append("industry", params.industry);
  if (params?.longitude !== undefined) queryParams.append("longitude", params.longitude.toString());
  if (params?.latitude !== undefined) queryParams.append("latitude", params.latitude.toString());
  if (params?.cursor_id !== undefined) queryParams.append("cursor_id", params.cursor_id.toString());
  if (params?.cursor_distance !== undefined) queryParams.append("cursor_distance", params.cursor_distance.toString());
  if (params?.limit !== undefined) queryParams.append("limit", params.limit.toString());

  const queryString = queryParams.toString();
  const url = `/v1/directory${queryString ? `?${queryString}` : ""}`;

  const response = await apiFetch<ApiResponse<DirectoryResponse>>(url, {
    method: "GET",
  });
  
  return response.data;
}
