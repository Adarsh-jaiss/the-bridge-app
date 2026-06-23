import { apiFetch, ApiResponse } from "./client";

export interface FeedPollOption {
  id: number;
  option_text: string;
  position: number;
  votes_count?: number;
}

export interface FeedLatestComment {
  id: number;
  content: string;
  created_at: string;
  public_id?: string;
  first_name?: string;
  last_name?: string;
  profile_picture?: string;
}

export interface FeedPost {
  id: number;
  content: string;
  created_at: string;
  author_first_name: string;
  author_last_name: string;
  author_profile_picture?: string;
  author_public_id?: string;
  attachments?: string[];
  comments_count?: number;
  repost_count?: number;
  likes_count?: number;
  bookmarks_count?: number;
  is_liked?: boolean;
  is_bookmarked?: boolean;
  is_reposted?: boolean;
  has_voted?: boolean;
  user_voted_option_id?: number | null;
  post_type?: string;
  poll_options?: FeedPollOption[];
  latest_comment?: FeedLatestComment;
}

export interface FeedPage {
  posts: FeedPost[];
  next_cursor?: string | number;
}

export interface PollOptionResult {
  option_id: number;
  option_text: string;
  position: number;
  votes_count: number;
}

export interface VotePollResponse {
  poll_options_result: PollOptionResult[];
}

export interface ReportPostRequest {
  reason: string;
}

export interface CreatePostPayload {
  content: string;
  is_post_poll?: boolean;
  poll_options?: string[];
  attachments?: string[];
}

export interface PostComment {
  id: number;
  content: string;
  first_name?: string;
  last_name?: string;
  username?: string;
  public_id?: string;
  profile_picture?: string;
  created_at: string;
  next_child_cursor?: number;
  child_comments?: PostComment[];
}

export interface PostDetailsResponse {
  post: FeedPost;
  parent_comments: PostComment[];
  next_parent_cursor?: number;
}

export interface AddCommentPayload {
  comment: string;
  parent_comment_id?: number;
}

export interface CommentRepliesResponse {
  replies: PostComment[];
  next_cursor?: number;
}

function normalizeFeedPage(raw: any): FeedPage {
  const data = raw?.data ?? raw ?? {};
  const posts =
    (Array.isArray(data.posts) && data.posts) ||
    (Array.isArray(data.reposted_posts) && data.reposted_posts) ||
    (Array.isArray(data.bookmarked_posts) && data.bookmarked_posts) ||
    (Array.isArray(data.reposts) && data.reposts) ||
    (Array.isArray(data.bookmarks) && data.bookmarks) ||
    (Array.isArray(data) ? data : []);
  const rawNextCursor = data.next_cursor ?? data.cursor ?? data.nextCursor;
  const hasUsableCursor =
    rawNextCursor !== null &&
    rawNextCursor !== undefined &&
    rawNextCursor !== "" &&
    rawNextCursor !== 0 &&
    rawNextCursor !== "0";
  const nextCursor = hasUsableCursor ? rawNextCursor : undefined;
  return {
    posts,
    next_cursor: nextCursor,
  };
}

export async function getFeed(params?: { limit?: number; cursor?: string | number }): Promise<FeedPage> {
  const queryParams = new URLSearchParams();
  if (params?.limit !== undefined) queryParams.append("limit", String(params.limit));
  if (params?.cursor !== undefined) queryParams.append("cursor", String(params.cursor));
  const queryString = queryParams.toString();

  const response = await apiFetch<ApiResponse<any>>(`/v1/feed${queryString ? `?${queryString}` : ""}`, {
    method: "GET",
    headers: {
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
    },
  });

  return normalizeFeedPage(response);
}

export async function togglePostLike(postId: number): Promise<void> {
  await apiFetch<ApiResponse<unknown>>(`/v1/posts/${postId}/toggle-like`, {
    method: "POST",
  });
}

export async function toggleBookmark(postId: number): Promise<void> {
  await apiFetch<ApiResponse<unknown>>(`/v1/posts/${postId}/bookmark`, {
    method: "POST",
  });
}

export async function toggleRepost(postId: number): Promise<void> {
  await apiFetch<ApiResponse<unknown>>(`/v1/posts/${postId}/repost`, {
    method: "POST",
  });
}

export async function removeBookmark(postId: number): Promise<void> {
  await apiFetch<ApiResponse<unknown>>(`/v1/posts/${postId}/bookmark`, {
    method: "DELETE",
  });
}

export async function removeRepost(postId: number): Promise<void> {
  await apiFetch<ApiResponse<unknown>>(`/v1/posts/${postId}/repost`, {
    method: "DELETE",
  });
}

export async function getBookmarkedPosts(params?: {
  limit?: number;
  cursor?: string | number;
}): Promise<FeedPage> {
  const queryParams = new URLSearchParams();
  if (params?.limit !== undefined) queryParams.append("limit", String(params.limit));
  if (params?.cursor !== undefined) queryParams.append("cursor", String(params.cursor));
  const queryString = queryParams.toString();

  const response = await apiFetch<ApiResponse<any>>(
    `/v1/posts/bookmarked${queryString ? `?${queryString}` : ""}`,
    {
      method: "GET",
    }
  );

  return normalizeFeedPage(response);
}

export async function getRepostedPosts(params?: {
  limit?: number;
  cursor?: string | number;
}): Promise<FeedPage> {
  const queryParams = new URLSearchParams();
  if (params?.limit !== undefined) queryParams.append("limit", String(params.limit));
  if (params?.cursor !== undefined) queryParams.append("cursor", String(params.cursor));
  const queryString = queryParams.toString();

  const response = await apiFetch<ApiResponse<any>>(
    `/v1/posts/reposted${queryString ? `?${queryString}` : ""}`,
    {
      method: "GET",
    }
  );

  return normalizeFeedPage(response);
}

export async function votePollOption(pollOptionId: number): Promise<VotePollResponse> {
  const response = await apiFetch<ApiResponse<VotePollResponse>>(
    `/v1/posts/poll/vote/${pollOptionId}`,
    {
      method: "POST",
    }
  );
  return response.data;
}

export async function reportPost(postId: number, payload: ReportPostRequest): Promise<void> {
  await apiFetch<ApiResponse<unknown>>(`/v1/posts/${postId}/report`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function createPost(payload: CreatePostPayload): Promise<void> {
  const requestBody: Record<string, unknown> = {
    content: payload.content,
    is_post_poll: payload.is_post_poll,
  };

  if (payload.poll_options !== undefined) {
    requestBody.poll_options = payload.poll_options;
  }

  if (payload.attachments !== undefined) {
    requestBody.attachments = payload.attachments;
  }

  await apiFetch<ApiResponse<unknown>>("/v1/posts", {
    method: "POST",
    body: JSON.stringify(requestBody),
  });
}

export async function getPostDetails(postId: number, cursor?: number): Promise<PostDetailsResponse> {
  const queryParams = new URLSearchParams();
  if (cursor !== undefined) queryParams.append("cursor", String(cursor));
  const queryString = queryParams.toString();

  const response = await apiFetch<ApiResponse<PostDetailsResponse>>(
    `/v1/posts/${postId}${queryString ? `?${queryString}` : ""}`,
    {
      method: "GET",
    }
  );

  return response.data;
}

export async function deletePost(postId: number): Promise<void> {
  await apiFetch<ApiResponse<unknown>>(`/v1/posts/${postId}`, {
    method: "DELETE",
  });
}

export async function addComment(postId: number, payload: AddCommentPayload): Promise<void> {
  await apiFetch<ApiResponse<unknown>>(`/v1/posts/${postId}/comment`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getCommentReplies(commentId: number, cursor?: number): Promise<CommentRepliesResponse> {
  const queryParams = new URLSearchParams();
  if (cursor !== undefined && cursor > 0) queryParams.append("cursor", String(cursor));
  const queryString = queryParams.toString();

  const response = await apiFetch<ApiResponse<any>>(
    `/v1/comments/${commentId}/replies${queryString ? `?${queryString}` : ""}`,
    {
      method: "GET",
    }
  );

  const rawData = response?.data;
  const replies = Array.isArray(rawData)
    ? rawData
    : Array.isArray(rawData?.replies)
      ? rawData.replies
      : Array.isArray(rawData?.comments)
        ? rawData.comments
        : [];
  const nextCursorRaw = rawData?.next_cursor ?? rawData?.next_child_cursor ?? rawData?.cursor;
  const nextCursor =
    typeof nextCursorRaw === "number" && Number.isFinite(nextCursorRaw) && nextCursorRaw > 0
      ? nextCursorRaw
      : undefined;

  return { replies, next_cursor: nextCursor };
}
