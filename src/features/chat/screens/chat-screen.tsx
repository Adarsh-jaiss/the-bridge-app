import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MaterialIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { InfiniteData } from "@tanstack/react-query";
import { ArrowLeft, Send } from "lucide-react-native";
import { ActivityIndicator, Alert, Dimensions, Keyboard, KeyboardAvoidingView, Platform, Text, TextInput, TouchableOpacity, View } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getFallbackAvatarUrl } from "../../../lib/avatar-fallback";
import { deleteChatMessage, markConversationRead, Message } from "../../../lib/api/chat";
import { ChatBubble } from "../components/chat-bubble";
import { chatKeys, useChatHistory } from "../hooks/use-chat-history";
import { useChatWebSocket } from "../hooks/use-chat-websocket";
import { conversationKeys, markConversationReadInCache } from "../hooks/use-conversations";

const formatTime = (dateString: string) => {
    try {
        const date = new Date(dateString);
        return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
        return "";
    }
};

const getDayKey = (dateString: string) => {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return "";
    return date.toDateString();
};

const formatDayLabel = (dateString: string) => {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return "";

    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday";

    return date.toLocaleDateString([], {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
};

type ChatScreenProps = {
    otherUserId: number;
    otherUserName: string;
    otherUserAvatar?: string;
};

type ChatHistoryCache = InfiniteData<Message[], string | undefined>;

export const ChatScreen = ({ otherUserId, otherUserName, otherUserAvatar }: ChatScreenProps) => {
    const router = useRouter();
    const queryClient = useQueryClient();
    const insets = useSafeAreaInsets();
    const lastReadRequestRef = useRef<string | undefined>(undefined);
    const [inputText, setInputText] = useState("");
    const [androidKeyboardOffset, setAndroidKeyboardOffset] = useState(0);

    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
    } = useChatHistory(otherUserId);

    const { sendMessage, isConnected } = useChatWebSocket(otherUserId);
    const avatarUri = otherUserAvatar || getFallbackAvatarUrl(String(otherUserId) || otherUserName);
    const canSend = isConnected && inputText.trim().length > 0;
    const composerBottomPadding = Platform.OS === "android" && androidKeyboardOffset > 0
        ? androidKeyboardOffset
        : Math.max(insets.bottom, 8);

    const messages = useMemo<Message[]>(() => {
        if (!data) return [];
        return data.pages.flat();
    }, [data]);
    const latestMessageAt = messages[0]?.created_at;
    const latestUnreadIncomingAt = useMemo(() => {
        return messages.find((message) => message.sender_id === otherUserId && !message.is_read)?.created_at;
    }, [messages, otherUserId]);

    const { mutate: markReadOnBackend } = useMutation({
        mutationFn: () => markConversationRead(otherUserId),
        onSuccess: () => {
            queryClient.setQueryData<ChatHistoryCache>(chatKeys.history(otherUserId), (oldData) => {
                if (!oldData) return oldData;

                return {
                    ...oldData,
                    pages: oldData.pages.map((page) =>
                        page.map((message) =>
                            message.sender_id === otherUserId ? { ...message, is_read: true } : message
                        )
                    ),
                };
            });
            queryClient.invalidateQueries({ queryKey: conversationKeys.list() });
        },
        onError: () => {
            lastReadRequestRef.current = undefined;
        },
    });

    const { mutate: deleteMessage, isPending: isDeletingMessage } = useMutation({
        mutationFn: deleteChatMessage,
        onMutate: async (messageId: string) => {
            await queryClient.cancelQueries({ queryKey: chatKeys.history(otherUserId) });

            const previousHistory = queryClient.getQueryData<ChatHistoryCache>(
                chatKeys.history(otherUserId)
            );

            queryClient.setQueryData<ChatHistoryCache>(chatKeys.history(otherUserId), (oldData) => {
                if (!oldData) return oldData;

                return {
                    ...oldData,
                    pages: oldData.pages.map((page) =>
                        page.filter((message) => message.id !== messageId)
                    ),
                };
            });

            return { previousHistory };
        },
        onError: (_error, _messageId, context) => {
            if (context?.previousHistory) {
                queryClient.setQueryData(chatKeys.history(otherUserId), context.previousHistory);
            }
            Alert.alert("Couldn't delete message", "Please try again.");
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: chatKeys.history(otherUserId) });
            queryClient.invalidateQueries({ queryKey: conversationKeys.list() });
        },
    });

    useEffect(() => {
        if (!latestMessageAt) return;
        markConversationReadInCache(queryClient, otherUserId, latestMessageAt);
    }, [latestMessageAt, otherUserId, queryClient]);

    useEffect(() => {
        if (Platform.OS !== "android") return;

        const showSub = Keyboard.addListener("keyboardDidShow", (event) => {
            const windowHeight = Dimensions.get("window").height;
            const keyboardTop = event.endCoordinates?.screenY ?? windowHeight;
            setAndroidKeyboardOffset(Math.max(0, windowHeight - keyboardTop));
        });
        const hideSub = Keyboard.addListener("keyboardDidHide", () => {
            setAndroidKeyboardOffset(0);
        });

        return () => {
            showSub.remove();
            hideSub.remove();
        };
    }, []);

    useEffect(() => {
        if (!latestUnreadIncomingAt || lastReadRequestRef.current === latestUnreadIncomingAt) {
            return;
        }

        lastReadRequestRef.current = latestUnreadIncomingAt;
        markReadOnBackend();
    }, [latestUnreadIncomingAt, markReadOnBackend]);

    const handleSend = () => {
        const text = inputText.trim();
        if (!text || !isConnected) return;
        sendMessage(text);
        setInputText("");
    };

    const handleDeleteMessage = useCallback(
        (messageId: string) => {
            if (isDeletingMessage) return;

            Alert.alert("Delete message", "Delete this message for everyone?", [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => deleteMessage(messageId),
                },
            ]);
        },
        [deleteMessage, isDeletingMessage]
    );

    const renderItem = useCallback(
        ({ item, index }: { item: Message; index: number }) => {
            const isSent = item.sender_id !== otherUserId;
            // For an inverted list, the visually "previous" (older) message is at index + 1
            const olderMessage = index < messages.length - 1 ? messages[index + 1] : undefined;
            const showDayDivider =
                !olderMessage || getDayKey(olderMessage.created_at) !== getDayKey(item.created_at);

            return (
                <View className="px-4 py-1.5">
                    {showDayDivider && (
                        <View className="items-center py-2.5">
                            <Text className="px-3 py-1 rounded-full text-[11px] font-medium text-on-surface-variant bg-surface-container-high">
                                {formatDayLabel(item.created_at)}
                            </Text>
                        </View>
                    )}
                    <ChatBubble
                        message={item.message}
                        timestamp={formatTime(item.created_at)}
                        isSent={isSent}
                        isRead={Boolean(item.is_read)}
                        onLongPress={isSent ? () => handleDeleteMessage(item.id) : undefined}
                    />
                </View>
            );
        },
        [handleDeleteMessage, messages, otherUserId]
    );

    return (
        <KeyboardAvoidingView
            className="flex-1 bg-surface"
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            keyboardVerticalOffset={0}
        >
            <View
                className="w-full bg-surface border-b border-surface-container-high px-4 pb-3"
                style={{ paddingTop: Math.max(insets.top, 10) }}
            >
                <View className="flex-row items-center gap-3">
                    <TouchableOpacity
                        onPress={() => router.back()}
                        className="w-10 h-10 rounded-full items-center justify-center active:bg-surface-container-high"
                    >
                        <ArrowLeft size={22} color="#0050cb" />
                    </TouchableOpacity>

                    <Image
                        source={{ uri: avatarUri }}
                        className="w-10 h-10 rounded-full bg-surface-container-high"
                        contentFit="cover"
                    />
                    <View className="flex-1">
                        <Text className="font-['Inter'] font-bold text-[17px] text-on-surface" numberOfLines={1}>
                            {otherUserName}
                        </Text>
                        <Text className="text-[12px] text-on-surface-variant">
                            Direct conversation
                        </Text>
                    </View>
                </View>
            </View>



            <View className="flex-1">
                {isLoading ? (
                    <View className="flex-1 items-center justify-center">
                        <ActivityIndicator size="large" color="#0050cb" />
                    </View>
                ) : messages.length === 0 ? (
                    <View className="flex-1 items-center justify-center px-8">
                        <View className="w-16 h-16 rounded-full bg-surface-container-high items-center justify-center">
                            <MaterialIcons name="chat-bubble-outline" size={30} color="#727687" />
                        </View>
                        <Text className="text-on-surface font-bold text-lg text-center mt-4">
                            No messages yet
                        </Text>
                        <Text className="text-on-surface-variant text-center mt-1">
                            Say hi and start a natural conversation.
                        </Text>
                    </View>
                ) : (
                    <FlashList
                        data={messages}
                        renderItem={renderItem}
                        keyExtractor={(item: Message) => item.id}
                        inverted
                        contentContainerStyle={{ paddingTop: 10, paddingBottom: 16 }}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        onEndReached={() => {
                            if (hasNextPage && !isFetchingNextPage) {
                                fetchNextPage();
                            }
                        }}
                        onEndReachedThreshold={0.3}
                        ListFooterComponent={
                            isFetchingNextPage ? (
                                <View className="py-4 items-center">
                                    <ActivityIndicator size="small" color="#0050cb" />
                                    <Text className="text-[11px] text-on-surface-variant mt-1">
                                        Loading older messages...
                                    </Text>
                                </View>
                            ) : null
                        }
                    />
                )}
            </View>

            <View
                className="w-full bg-surface border-t border-surface-container-high"
                style={{ paddingBottom: composerBottomPadding }}
            >
                <View className="px-4 pt-3 pb-2">
                    <View className="flex-row items-end gap-2.5">
                        <View className="flex-1 rounded-3xl bg-surface-container-high px-4 py-2.5">
                            <TextInput
                                className="text-[15px] text-on-surface"
                                placeholder="Type a message..."
                                placeholderTextColor="#727687"
                                value={inputText}
                                onChangeText={setInputText}
                                onSubmitEditing={handleSend}
                                returnKeyType="send"
                                multiline
                                blurOnSubmit={false}
                                textAlignVertical="top"
                                style={{ minHeight: 22, maxHeight: 120, paddingVertical: 0 }}
                            />
                        </View>
                        <TouchableOpacity
                            onPress={handleSend}
                            disabled={!canSend}
                            className={`w-11 h-11 rounded-full items-center justify-center ${
                                canSend ? "bg-primary" : "bg-surface-container-high"
                            }`}
                        >
                            <Send size={18} color={canSend ? "#ffffff" : "#727687"} />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
};
