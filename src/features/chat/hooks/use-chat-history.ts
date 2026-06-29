import { useInfiniteQuery } from "@tanstack/react-query";
import { getChatHistory, Message } from "../../../lib/api/chat";

export const chatKeys = {
    history: (userId: number) => ["chat", "history", userId] as const,
};

export const useChatHistory = (userId: number) => {
    return useInfiniteQuery({
        queryKey: chatKeys.history(userId),
        queryFn: async ({ pageParam }) => {
            return getChatHistory(userId, pageParam as string | undefined);
        },
        initialPageParam: undefined as string | undefined,
        getNextPageParam: (lastPage: Message[]) => {
            if (lastPage.length === 0) {
                return undefined;
            }
            // The oldest message is the last one in the array
            const oldestMessage = lastPage[lastPage.length - 1];
            return oldestMessage.created_at;
        },
        // We might want to invert the data because FlashList inverted expects data in a specific order
        // Actually FlashList with inverted={true} expects the newest items at index 0
        // Our backend returns the latest messages first (DESC by created_at)
        // so index 0 is the newest, which is exactly what inverted FlashList wants.
    });
};
