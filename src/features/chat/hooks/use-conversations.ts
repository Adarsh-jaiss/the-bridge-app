import { InfiniteData, QueryClient, useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { ConversationsResponse, getConversations } from "../../../lib/api/chat";

export const conversationKeys = {
    list: () => ["chat", "conversations"] as const,
    readState: () => ["chat", "conversations", "read-state"] as const,
};

const CONVERSATIONS_PAGE_SIZE = 30;
export type ConversationReadState = Record<number, string>;

export const markConversationReadInCache = (
    queryClient: QueryClient,
    userId: number,
    readThrough: string = new Date().toISOString()
) => {
    queryClient.setQueryData<ConversationReadState>(conversationKeys.readState(), (oldState) => ({
        ...(oldState ?? {}),
        [userId]: readThrough,
    }));

    queryClient.setQueryData<InfiniteData<ConversationsResponse>>(conversationKeys.list(), (oldData) => {
        if (!oldData) return oldData;

        let changed = false;
        const pages = oldData.pages.map((page) => ({
            ...page,
            conversations: page.conversations.map((conversation) => {
                if (conversation.user_id !== userId || conversation.unread_count === 0) {
                    return conversation;
                }

                changed = true;
                return {
                    ...conversation,
                    unread_count: 0,
                };
            }),
        }));

        return changed ? { ...oldData, pages } : oldData;
    });
};

export const useConversationReadState = () => {
    return useQuery({
        queryKey: conversationKeys.readState(),
        queryFn: () => ({} as ConversationReadState),
        initialData: {} as ConversationReadState,
        staleTime: Infinity,
        gcTime: Infinity,
    });
};

export const useConversations = () => {
    return useInfiniteQuery({
        queryKey: conversationKeys.list(),
        queryFn: ({ pageParam }) =>
            getConversations(pageParam as string | undefined, CONVERSATIONS_PAGE_SIZE),
        initialPageParam: undefined as string | undefined,
        getNextPageParam: (lastPage: ConversationsResponse) => lastPage.next_cursor || undefined,
    });
};
