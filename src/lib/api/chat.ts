import { apiFetch, ApiResponse } from "./client";

export interface Message {
    id: string;
    sender_id: number;
    receiver_id: number;
    message: string;
    created_at: string;
    updated_at?: string;
    is_read?: boolean;
    is_deleted?: boolean;
    deleted_at?: string | null;
}

export interface SendMessageRequest {
    receiver_id: number;
    message: string;
}

export interface ChatHistoryResponse {
    messages: Message[];
}

export const getChatHistory = async (userId: number, cursor?: string, limit: number = 50): Promise<Message[]> => {
    let url = `/v1/chat/${userId}/history?limit=${limit}`;
    if (cursor) {
        url += `&cursor=${encodeURIComponent(cursor)}`;
    }
    const response = await apiFetch<ChatHistoryResponse>(url);
    return response.messages || [];
};

export const markConversationRead = async (userId: number): Promise<void> => {
    await apiFetch(`/v1/chat/${userId}/read`, {
        method: "PATCH",
    });
};

export const deleteChatMessage = async (messageId: string): Promise<void> => {
    await apiFetch(`/v1/chat/messages/${encodeURIComponent(messageId)}`, {
        method: "DELETE",
    });
};

export interface Conversation {
    user_id: number;
    first_name: string;
    last_name: string;
    profile_picture?: string;
    last_message: string;
    last_message_at: string;
    unread_count: number;
}

export interface ConversationsResponse {
    conversations: Conversation[];
    next_cursor?: string;
}

export const getConversations = async (
    cursor?: string,
    limit: number = 30
): Promise<ConversationsResponse> => {
    const params = new URLSearchParams({ limit: limit.toString() });
    if (cursor) {
        params.append("cursor", cursor);
    }

    const response = await apiFetch<ApiResponse<ConversationsResponse> | ConversationsResponse>(
        `/v1/chat/conversations?${params.toString()}`
    );

    // Be resilient to both response shapes used across this API: some endpoints
    // wrap the payload in { success, data } while the chat endpoints return it
    // directly. Normalize so callers always get a consistent object.
    const payload =
        (response as ApiResponse<ConversationsResponse>)?.data ??
        (response as ConversationsResponse);

    return {
        conversations: payload?.conversations ?? [],
        next_cursor: payload?.next_cursor,
    };
};
