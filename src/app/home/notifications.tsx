import React, { useCallback, useMemo } from "react";
import { View, Text, FlatList, Image, Pressable, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getNotifications, markNotificationsAsRead, Notification } from "../../lib/api/notifications";
import { getFallbackAvatarUrl } from "../../lib/avatar-fallback";

const formatTimeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  if (diffMinutes < 1) return "now";
  if (diffMinutes < 60) return `${diffMinutes}m`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h`;
  return `${Math.floor(diffHours / 24)}d`;
};

function resolveNotificationRoute(notification: Notification): string {
  let route = notification.redirect_url_template;
  if (!notification.metadata) return route;

  for (const [key, value] of Object.entries(notification.metadata)) {
    const placeholder = `{${key}}`;
    route = route.split(placeholder).join(encodeURIComponent(String(value)));
  }
  return route;
}

function NotificationRow({ item, onRead }: { item: Notification; onRead: (id: string) => void }) {
  const router = useRouter();

  const handlePress = () => {
    if (!item.is_read) {
      onRead(item.id);
    }
    const route = resolveNotificationRoute(item);
    router.push(route as any);
  };

  const avatarUrl = item.metadata?.profile_picture || getFallbackAvatarUrl("User");

  const handleAvatarPress = () => {
    if (item.metadata?.user_id) {
      router.push(`/user/${item.metadata.user_id}` as any);
    }
  };

  return (
    <Pressable 
      onPress={handlePress}
      className={`px-6 py-4 flex-row items-start ${!item.is_read ? 'bg-primary/5' : 'bg-surface'} border-b border-surface-container-high active:bg-surface-container-low`}
    >
      <Pressable onPress={handleAvatarPress}>
        <Image
          source={{ uri: avatarUrl }}
          className="w-12 h-12 rounded-full bg-surface-container-high"
        />
      </Pressable>
      <View className="flex-1 ml-4 pr-2 justify-center">
        <Text className="text-[15px] leading-5 text-on-surface">
          {item.message}
        </Text>
        <Text className="text-xs text-on-surface-variant mt-1.5">
          {formatTimeAgo(item.created_at)}
        </Text>
      </View>
      {!item.is_read && (
        <View className="w-2.5 h-2.5 rounded-full bg-primary ml-2 self-center" />
      )}
    </Pressable>
  );
}

export default function NotificationsScreen() {
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
    isRefetching
  } = useInfiniteQuery({
    queryKey: ["notifications"],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => getNotifications(pageParam, 20),
    getNextPageParam: (lastPage) => lastPage.next_cursor || undefined,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => markNotificationsAsRead([id]),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["unreadNotificationsCount"] });
    }
  });

  const handleRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const handleRead = useCallback((id: string) => {
    markReadMutation.mutate(id);
  }, [markReadMutation]);

  const notifications = useMemo(() => {
    return data?.pages.flatMap(page => page?.notifications || []) || [];
  }, [data]);

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={["top"]}>
      <View className="flex-row items-center justify-between px-6 py-4 w-full bg-surface border-b border-surface-container-high">
        <View className="flex-row items-center gap-4">
          <Pressable
            onPress={() => router.back()}
            className="p-2 -ml-2 rounded-full active:bg-surface-container-low"
          >
            <MaterialIcons name="arrow-back" size={24} color="#0050cb" />
          </Pressable>
          <Text className="font-['Inter'] font-bold text-lg tracking-tight text-on-surface">
            Notifications
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
            Failed to load notifications
          </Text>
          <Pressable onPress={() => refetch()} className="px-4 py-2 mt-4 bg-primary rounded-full">
             <Text className="text-on-primary font-bold">Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <NotificationRow item={item} onRead={handleRead} />
          )}
          contentContainerStyle={{ paddingBottom: 110 }}
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
            <View className="flex-1 items-center justify-center px-6 pt-16">
              <MaterialIcons name="notifications-none" size={46} color="#94a3b8" />
              <Text className="text-on-surface font-bold text-lg text-center mt-4 mb-2">
                No notifications yet
              </Text>
              <Text className="text-on-surface-variant text-center">
                You will see important updates here.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
