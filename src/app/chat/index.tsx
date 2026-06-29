import { MaterialIcons } from "@expo/vector-icons";
import { Stack, useRouter, useFocusEffect } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { ActivityIndicator, FlatList, Image, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Conversation } from "../../lib/api/chat";
import {
  markConversationReadInCache,
  useConversationReadState,
  useConversations,
} from "../../features/chat/hooks/use-conversations";
import { getFallbackAvatarUrl } from "../../lib/avatar-fallback";

const formatTimeAgo = (dateString: string) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  if (diffMinutes < 1) return "now";
  if (diffMinutes < 60) return `${diffMinutes}m`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h`;
  return `${Math.floor(diffHours / 24)}d`;
};

function ConversationRow({
  item,
  onOpenConversation,
}: {
  item: Conversation;
  onOpenConversation: (item: Conversation) => void;
}) {
  const router = useRouter();
  const fullName = `${item.first_name || ""} ${item.last_name || ""}`.trim() || "User";
  const avatarUrl = item.profile_picture || getFallbackAvatarUrl(String(item.user_id) || fullName);
  const hasUnread = (item.unread_count || 0) > 0;

  const handlePress = () => {
    onOpenConversation(item);
    router.push(
      `/chat/${item.user_id}?name=${encodeURIComponent(fullName)}&avatar=${encodeURIComponent(avatarUrl)}` as any
    );
  };

  return (
    <Pressable
      onPress={handlePress}
      className="px-6 py-4 flex-row items-center bg-surface border-b border-surface-container-high active:bg-surface-container-low"
    >
      <Image
        source={{ uri: avatarUrl }}
        className="w-12 h-12 rounded-full bg-surface-container-high"
      />
      <View className="flex-1 ml-4 pr-2 justify-center">
        <View className="flex-row items-center justify-between">
          <Text
            className={`text-[15px] ${hasUnread ? "font-bold text-on-surface" : "font-semibold text-on-surface"}`}
            numberOfLines={1}
          >
            {fullName}
          </Text>
          <Text className="text-xs text-on-surface-variant ml-2">
            {formatTimeAgo(item.last_message_at)}
          </Text>
        </View>
        <View className="flex-row items-center justify-between mt-1">
          <Text
            className={`text-sm flex-1 pr-2 ${hasUnread ? "text-on-surface font-medium" : "text-on-surface-variant"}`}
            numberOfLines={1}
          >
            {item.last_message || "No messages yet"}
          </Text>
          {hasUnread && (
            <View className="min-w-[20px] h-5 px-1.5 rounded-full bg-primary items-center justify-center">
              <Text className="text-[10px] font-bold text-on-primary leading-none">
                {item.unread_count > 99 ? "99+" : item.unread_count}
              </Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

export default function ConversationsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useConversations();
  const { data: readState } = useConversationReadState();

  const conversations = useMemo(() => {
    return (
      data?.pages.flatMap((page) =>
        (page?.conversations || []).map((conversation) => {
          const readThrough = readState?.[conversation.user_id];
          if (!readThrough || conversation.unread_count === 0) {
            return conversation;
          }

          const lastMessageTime = new Date(conversation.last_message_at).getTime();
          const readThroughTime = new Date(readThrough).getTime();
          const isReadLocally =
            Number.isFinite(lastMessageTime) &&
            Number.isFinite(readThroughTime) &&
            lastMessageTime <= readThroughTime;

          return isReadLocally ? { ...conversation, unread_count: 0 } : conversation;
        })
      ) || []
    );
  }, [data, readState]);

  const handleOpenConversation = useCallback(
    (conversation: Conversation) => {
      markConversationReadInCache(queryClient, conversation.user_id, conversation.last_message_at);
    },
    [queryClient]
  );

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const handleRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-row items-center justify-between px-6 py-4 w-full bg-surface border-b border-surface-container-high">
        <View className="flex-row items-center gap-4">
          <Pressable
            onPress={() => router.back()}
            className="p-2 -ml-2 rounded-full active:bg-surface-container-low"
          >
            <MaterialIcons name="arrow-back" size={24} color="#0050cb" />
          </Pressable>
          <Text className="font-['Inter'] font-bold text-lg tracking-tight text-on-surface">
            Messages
          </Text>
        </View>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#0050cb" />
        </View>
      ) : isError ? (
        <View className="flex-1 items-center justify-center px-6 pt-16">
          <MaterialIcons name="error-outline" size={46} color="#ba1a1a" />
          <Text className="text-on-surface font-bold text-lg text-center mt-4 mb-2">
            Failed to load messages
          </Text>
          <Text className="text-on-surface-variant text-center mb-4">
            Please check your connection and try again.
          </Text>
          <Pressable onPress={() => refetch()} className="px-4 py-2 bg-primary rounded-full active:bg-primary/80">
            <Text className="text-on-primary font-bold">Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => String(item.user_id)}
          renderItem={({ item }) => (
            <ConversationRow item={item} onOpenConversation={handleOpenConversation} />
          )}
          contentContainerStyle={
            conversations.length === 0
              ? { flexGrow: 1, justifyContent: "center", paddingBottom: 0 }
              : { paddingBottom: 110 }
          }
          showsVerticalScrollIndicator={false}
          refreshing={isRefetching}
          onRefresh={handleRefresh}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) {
              fetchNextPage();
            }
          }}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            isFetchingNextPage ? (
              <View className="py-4 items-center">
                <ActivityIndicator size="small" color="#0050cb" />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View className="items-center justify-center px-6">
              <MaterialIcons name="chat-bubble-outline" size={46} color="#94a3b8" />
              <Text className="text-on-surface font-bold text-lg text-center mt-4 mb-2">
                No messages yet
              </Text>
              <Text className="text-on-surface-variant text-center">
                Start a conversation from someone&apos;s profile.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
