import React, { useCallback, useState } from "react";
import { View, Text, FlatList, ActivityIndicator, Image, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useInfiniteQuery } from "@tanstack/react-query";
import { getAnnouncements, AnnouncementResponse } from "../../lib/api/announcements";
import { MaterialIcons } from "@expo/vector-icons";

const formatDate = (dateString?: string) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).toUpperCase();
};

function AnnouncementCard({ announcement }: { announcement: AnnouncementResponse }) {
  const hasAttachment = announcement.attachments && announcement.attachments.length > 0;

  return (
    <View className="mb-5 p-4 rounded-2xl bg-surface-container-lowest border border-surface-container-low">
      <View className="flex-row items-center gap-3 mb-4">
        <View className="bg-primary-container px-3 py-1 rounded-full">
          <Text className="text-on-primary-container text-[10px] font-bold uppercase tracking-wider">
            {announcement.announcement_type || "OFFICIAL"}
          </Text>
        </View>
        <Text className="text-xs text-outline font-medium">
          {formatDate(announcement.created_at)}
        </Text>
      </View>
      <Text className="text-xl font-bold text-[#111111] mb-2 leading-tight tracking-tight">
        {announcement.title}
      </Text>
      <Text className="text-[#6B7280] leading-relaxed mb-4 font-normal">
        {announcement.content}
      </Text>
      {hasAttachment && (
        <View className="relative overflow-hidden rounded-[12px] bg-surface-container-low aspect-[16/9]">
          <Image
            source={{ uri: announcement.attachments?.[0] || "" }}
            className="w-full h-full object-cover"
            resizeMode="cover"
          />
        </View>
      )}
    </View>
  );
}

export default function AnnouncementScreen() {
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isRefetching,
    isError,
    error,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['announcements'],
    queryFn: ({ pageParam }) => getAnnouncements({ 
      cursor: pageParam,
      limit: 10
    }),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (lastPage) => {
      if (lastPage.next_cursor && lastPage.next_cursor > 0) {
        return lastPage.next_cursor;
      }
      return undefined;
    },
  });

  const handlePullToRefresh = useCallback(async () => {
    setIsPullRefreshing(true);
    try {
      await refetch({ throwOnError: false, cancelRefetch: false });
    } finally {
      setIsPullRefreshing(false);
    }
  }, [refetch]);

  const announcements = data?.pages.flatMap((page) => page.announcements) || [];

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      {/* TopAppBar */}
      <View className="flex-row items-center justify-between px-6 py-4 w-full bg-[#f9f9f9] z-50 border-b border-surface-container-high">
        <View className="flex-row items-center gap-4">
          <Text className="font-['Inter'] font-bold text-lg tracking-tight text-[#1a1c1c]">
            Announcements
          </Text>
        </View>
        <View className="flex-row items-center gap-2">
          <Pressable className="p-2 rounded-full active:bg-[#f3f3f3] transition-colors">
            <MaterialIcons name="more-vert" size={24} color="#727687" />
          </Pressable>
        </View>
      </View>

      {/* Content Canvas */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#0050cb" />
        </View>
      ) : isError ? (
        <View className="flex-1 items-center justify-center px-6">
          <MaterialIcons name="error-outline" size={48} color="#ba1a1a" className="mb-4" />
          <Text className="text-on-surface font-bold text-lg text-center mb-2">Failed to load news</Text>
          <Text className="text-on-surface-variant text-center">{error?.message || "Something went wrong"}</Text>
        </View>
      ) : announcements.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <MaterialIcons name="campaign" size={48} color="#94a3b8" className="mb-4" />
          <Text className="text-on-surface font-bold text-lg text-center mb-2">No News Yet</Text>
          <Text className="text-on-surface-variant text-center">Check back later for updates</Text>
        </View>
      ) : (
        <FlatList
          data={announcements}
          keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
          renderItem={({ item }) => <AnnouncementCard announcement={item} />}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          refreshing={isPullRefreshing || (isRefetching && !isLoading)}
          onRefresh={handlePullToRefresh}
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
        />
      )}
    </SafeAreaView>
  );
}
