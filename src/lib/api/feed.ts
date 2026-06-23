import { apiFetch, ApiResponse } from "./client";

export interface FeedPostResponse {
  // Mocking the feed post response for now as the swagger doesn't fully define post structure here
  id: string;
  author: {
    name: string;
    avatar: string;
    rank: string;
  };
  content: string;
  created_at: string;
  likes: number;
  comments: number;
}

export interface FeedListResponse {
  posts: FeedPostResponse[];
  next_cursor?: string;
}

export interface GetFeedParams {
  limit?: number;
  cursor?: string;
  searchQuery?: string;
  rank?: string;
  company?: string;
  city?: string;
}

export async function getFeed(params?: GetFeedParams): Promise<FeedListResponse> {
  const queryParams = new URLSearchParams();
  if (params?.limit) queryParams.append("limit", params.limit.toString());
  if (params?.cursor) queryParams.append("cursor", params.cursor);
  
  // Appending the requested filters as query parameters. 
  // Note: These might not be fully supported by the backend yet as per Swagger.
  if (params?.searchQuery) queryParams.append("search", params.searchQuery);
  if (params?.rank) queryParams.append("rank", params.rank);
  if (params?.company) queryParams.append("company", params.company);
  if (params?.city) queryParams.append("city", params.city);

  const queryString = queryParams.toString();
  const url = `/v1/feed${queryString ? `?${queryString}` : ""}`;

  const response = await apiFetch<ApiResponse<FeedListResponse>>(url, {
    method: "GET",
  });
  
  return response.data;
}
