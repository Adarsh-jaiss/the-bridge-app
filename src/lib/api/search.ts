import { apiFetch, ApiResponse } from "./client";

export interface SearchUserRequest {
  company?: string | null;
  name?: string | null;
  rank?: string | null;
}

export interface SearchUserResponse {
  company_name?: string;
  first_name?: string;
  last_name?: string;
  profile_picture?: string;
  public_id?: string;
  rank?: string;
}

export async function searchUsers(request: SearchUserRequest): Promise<SearchUserResponse[]> {
  const payload = {
    company: request.company ? request.company : null,
    name: request.name ? request.name : null,
    rank: request.rank ? request.rank : null,
  };

  const response = await apiFetch<ApiResponse<SearchUserResponse[]>>("/v1/user/search", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  
  return response.data;
}
