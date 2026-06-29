import { apiFetch, ApiResponse } from "./client";

export interface UserProfilePost {
  id: number;
  content: string;
  created_at: string;
  author_first_name: string;
  author_last_name: string;
  author_profile_picture: string;
  author_public_id: string;
  attachments: string[];
  comments_count: number;
  repost_count: number;
  likes_count: number;
  bookmarks_count: number;
  is_liked?: boolean;
  is_bookmarked?: boolean;
  is_reposted?: boolean;
  has_voted?: boolean;
  user_voted_option_id?: number | null;
  post_type: string;
  poll_options?: any[];
}

export interface UserProfileData {
  id: number;
  bio: string;
  company_name?: string;
  firstName: string;
  lastName: string;
  followers_count: number;
  following_count: number;
  profile_picture: string;
  rank: string;
  total_post_count: number;
  posts: UserProfilePost[];
}

export interface UserProfileResponse {
  cursor: number;
  is_following: boolean;
  user_profile: UserProfileData;
}

export interface GetUserProfileParams {
  limit?: number;
  page?: number;
}

export async function getUserProfile(
  userId: string | number,
  params?: GetUserProfileParams
): Promise<UserProfileResponse> {
  const queryParams = new URLSearchParams();
  if (params?.limit !== undefined) queryParams.append("limit", params.limit.toString());
  if (params?.page !== undefined) queryParams.append("page", params.page.toString());
  const queryString = queryParams.toString();

  const response = await apiFetch<ApiResponse<UserProfileResponse>>(
    `/v1/user/search/${userId}${queryString ? `?${queryString}` : ""}`,
    {
    method: "GET"
    }
  );
  return response.data;
}

export interface GetMyProfileParams {
  limit?: number;
  cursor?: number;
}

export async function getMyProfile(params?: GetMyProfileParams): Promise<UserProfileResponse> {
  const queryParams = new URLSearchParams();
  if (params?.limit !== undefined) queryParams.append("limit", params.limit.toString());
  if (params?.cursor !== undefined) queryParams.append("cursor", params.cursor.toString());
  const queryString = queryParams.toString();

  const response = await apiFetch<ApiResponse<UserProfileResponse>>(
    `/v1/user/profile${queryString ? `?${queryString}` : ""}`,
    {
      method: "GET",
    }
  );
  return response.data;
}

export async function followUser(userId: string | number): Promise<void> {
  await apiFetch(`/v1/user/${userId}/follow`, {
    method: "POST"
  });
}

export async function unfollowUser(userId: string | number): Promise<void> {
  await apiFetch(`/v1/user/${userId}/unfollow`, {
    method: "DELETE"
  });
}

export interface UpdateMyProfileRequest {
  profile_picture?: string;
  bio?: string;
}

export interface UpdateMyProfileResponse {
  user_profile?: UserProfileData;
}

export async function updateMyProfile(payload: UpdateMyProfileRequest): Promise<UpdateMyProfileResponse> {
  const response = await apiFetch<ApiResponse<UpdateMyProfileResponse>>("/v1/user/profile", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

  return response.data;
}

export interface RegisterUserOnboardingRequest {
  first_name: string;
  last_name: string;
  company_name: string;
  rank: string;
  licence: string;
  licence_type: string;
  licence_number: string;
  seman_book: string;
}

export const registerUserOnboarding = async (payload: RegisterUserOnboardingRequest): Promise<void> => {
  await apiFetch<ApiResponse>("/v1/user/onboarding", {
    method: "POST",
    body: JSON.stringify(payload),
  });
};
