import { MaterialIcons } from "@expo/vector-icons";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Image, LayoutAnimation, Platform, Pressable, Text, UIManager, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ProfilePostCard, ProfilePostProps } from "../../components/profile/ProfilePostCard";
import { getBookmarkedPosts, getRepostedPosts } from "../../lib/api/posts";
import { getMyProfile, UserProfileData } from "../../lib/api/user";
import { getFallbackAvatarUrl } from "../../lib/avatar-fallback";

const PROFILE_POSTS_PAGE_SIZE = 15;

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  if (diffMinutes < 1) return "now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
};

function ProfileHeader({ profile }: { profile?: UserProfileData }) {
  const fullName = profile ? `${profile.firstName || ""} ${profile.lastName || ""}`.trim() : "Profile";
  const fallbackAvatarUri = getFallbackAvatarUrl(fullName);
  const companyName = profile?.company_name;
  const rankText = profile?.rank?.trim();
  const identityText = rankText && companyName
    ? `${rankText} @ ${companyName}`
    : rankText || companyName || "";

  return (
    <View className="flex-col items-center pt-8 pb-6 px-6">
      <View className="mb-4">
        {profile?.profile_picture ? (
          <View className="w-28 h-28 rounded-full overflow-hidden border-4 border-surface-container-low shadow-sm">
            <Image
              source={{ uri: profile.profile_picture }}
              className="w-full h-full"
              resizeMode="cover"
            />
          </View>
        ) : (
          <View className="w-28 h-28 rounded-full overflow-hidden border-4 border-surface-container-low shadow-sm bg-primary-container items-center justify-center">
            <Image
              source={{ uri: fallbackAvatarUri }}
              className="w-full h-full"
              resizeMode="cover"
            />
          </View>
        )}
      </View>
      
      <Text className="text-[24px] font-bold text-on-surface tracking-tight text-center">
        {fullName}
      </Text>
      
      {!!identityText && (
        <View className="mt-2 flex-row items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-high">
          <MaterialIcons name="business" size={14} color="#727687" />
          <Text className="text-xs font-semibold text-on-surface-variant">
            {identityText}
          </Text>
        </View>
      )}

      {!!profile?.bio && (
        <Text className="mt-4 text-center text-on-surface text-[15px] leading-relaxed">
          {profile.bio}
        </Text>
      )}

      {/* Stats Row */}
      <View className="flex-row w-full mt-8 bg-surface-container-low rounded-2xl overflow-hidden p-1 gap-0.5">
        <View className="flex-1 bg-surface-container-lowest py-3 items-center">
          <Text className="text-lg font-bold text-on-surface leading-none">{profile?.followers_count || 0}</Text>
          <Text className="text-[10px] uppercase tracking-widest text-on-surface-variant mt-1">Followers</Text>
        </View>
        <View className="flex-1 bg-surface-container-lowest py-3 items-center">
          <Text className="text-lg font-bold text-on-surface leading-none">{profile?.following_count || 0}</Text>
          <Text className="text-[10px] uppercase tracking-widest text-on-surface-variant mt-1">Following</Text>
        </View>
        <View className="flex-1 bg-surface-container-lowest py-3 items-center">
          <Text className="text-lg font-bold text-on-surface leading-none">{profile?.total_post_count || 0}</Text>
          <Text className="text-[10px] uppercase tracking-widest text-on-surface-variant mt-1">Posts</Text>
        </View>
      </View>
    </View>
  );
}

function ProfileTabs({
  activeTab,
  onTabChange,
  onSwipeLeft,
  onSwipeRight,
}: {
  activeTab: "posts" | "reposts" | "bookmarks";
  onTabChange: (t: "posts" | "reposts" | "bookmarks") => void;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
}) {
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  return (
    <View
      className="flex-row border-b border-surface-container-high px-4 bg-surface/95"
      onTouchStart={(event) => setTouchStartX(event.nativeEvent.pageX)}
      onTouchEnd={(event) => {
        if (touchStartX === null) return;
        const deltaX = event.nativeEvent.pageX - touchStartX;
        if (deltaX <= -40) onSwipeLeft();
        if (deltaX >= 40) onSwipeRight();
        setTouchStartX(null);
      }}
    >
      <Pressable 
        onPress={() => onTabChange("posts")}
        className={`flex-1 py-4 border-b-2 ${activeTab === "posts" ? "border-primary" : "border-transparent"}`}
      >
        <Text className={`text-center text-sm ${activeTab === "posts" ? "font-bold text-primary" : "font-medium text-on-surface-variant"}`}>
          Posts
        </Text>
      </Pressable>
      <Pressable 
        onPress={() => onTabChange("reposts")}
        className={`flex-1 py-4 border-b-2 ${activeTab === "reposts" ? "border-primary" : "border-transparent"}`}
      >
        <Text className={`text-center text-sm ${activeTab === "reposts" ? "font-bold text-primary" : "font-medium text-on-surface-variant"}`}>
          Reposts
        </Text>
      </Pressable>
      <Pressable
        onPress={() => onTabChange("bookmarks")}
        className={`flex-1 py-4 border-b-2 ${activeTab === "bookmarks" ? "border-primary" : "border-transparent"}`}
      >
        <Text className={`text-center text-sm ${activeTab === "bookmarks" ? "font-bold text-primary" : "font-medium text-on-surface-variant"}`}>
          Bookmarks
        </Text>
      </Pressable>
    </View>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"posts" | "reposts" | "bookmarks">("posts");
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);
  const [swipeStartPoint, setSwipeStartPoint] = useState<{ x: number; y: number } | null>(null);
  const profileTabsOrder: Array<"posts" | "reposts" | "bookmarks"> = ["posts", "reposts", "bookmarks"];
  useEffect(() => {
    if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["myProfile"],
    initialPageParam: undefined as number | undefined,
    queryFn: ({ pageParam }) =>
      getMyProfile({
        limit: PROFILE_POSTS_PAGE_SIZE,
        cursor: pageParam,
      }),
    getNextPageParam: (lastPage) => (lastPage.cursor && lastPage.cursor > 0 ? lastPage.cursor : undefined),
  });
  const repostsQuery = useInfiniteQuery({
    queryKey: ["myRepostedPosts"],
    enabled: activeTab === "reposts",
    initialPageParam: undefined as string | number | undefined,
    queryFn: ({ pageParam }) =>
      getRepostedPosts({
        limit: PROFILE_POSTS_PAGE_SIZE,
        cursor: pageParam,
      }),
    getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
  });
  const bookmarksQuery = useInfiniteQuery({
    queryKey: ["myBookmarkedPosts"],
    enabled: activeTab === "bookmarks",
    initialPageParam: undefined as string | number | undefined,
    queryFn: ({ pageParam }) =>
      getBookmarkedPosts({
        limit: PROFILE_POSTS_PAGE_SIZE,
        cursor: pageParam,
      }),
    getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
  });

  const firstPage = data?.pages?.[0];
  const profile = firstPage?.user_profile;

  const mapToProfilePost = (p: any): ProfilePostProps => ({
      id: p.id.toString(),
      authorName: `${p.author_first_name || ""} ${p.author_last_name || ""}`.trim(),
      authorProfilePicture: p.author_profile_picture || undefined,
      authorPublicId: p.author_public_id || undefined,
      timeAgo: formatDate(p.created_at),
      content: p.content,
      postType: p.post_type,
      pollOptions: p.poll_options,
      hasVoted: p.has_voted || false,
      userVotedOptionId: p.user_voted_option_id ?? null,
      imageUrl: p.attachments?.[0] || null,
      commentsCount: p.comments_count || 0,
      repostsCount: p.repost_count || 0,
      likesCount: p.likes_count || 0,
      isLiked: p.is_liked || false,
      bookmarksCount: p.bookmarks_count || 0,
      isBookmarked: p.is_bookmarked || false,
      isReposted: p.is_reposted || false,
    });

  const mappedPosts: ProfilePostProps[] = useMemo(() => {
    if (activeTab === "reposts") {
      const allReposts = (repostsQuery.data?.pages || []).flatMap((page) => page.posts || []);
      const uniqueReposts = Array.from(new Map(allReposts.map((post) => [post.id, post])).values());
      return uniqueReposts.map(mapToProfilePost);
    }
    if (activeTab === "bookmarks") {
      const allBookmarks = (bookmarksQuery.data?.pages || []).flatMap((page) => page.posts || []);
      const uniqueBookmarks = Array.from(new Map(allBookmarks.map((post) => [post.id, post])).values());
      return uniqueBookmarks.map(mapToProfilePost);
    }
    const allPosts = (data?.pages || []).flatMap((page) => page.user_profile.posts || []);
    const uniquePosts = Array.from(new Map(allPosts.map((post) => [post.id, post])).values());
    return uniquePosts.map(mapToProfilePost);
  }, [activeTab, bookmarksQuery.data?.pages, data?.pages, repostsQuery.data?.pages]);

  const listData = [
    { type: 'header', id: 'header' },
    { type: 'tabs', id: 'tabs' },
    ...mappedPosts.map((p) => ({ ...p, type: "post" })),
  ];

  const activeTabLoading =
    activeTab === "posts"
      ? isLoading
      : activeTab === "reposts"
        ? repostsQuery.isLoading
        : bookmarksQuery.isLoading;

  const activeTabError =
    activeTab === "posts"
      ? isError
      : activeTab === "reposts"
        ? repostsQuery.isError
        : bookmarksQuery.isError;

  const activeTabErrorObj =
    activeTab === "posts"
      ? error
      : activeTab === "reposts"
        ? repostsQuery.error
        : bookmarksQuery.error;

  const activeHasNextPage =
    activeTab === "posts"
      ? hasNextPage
      : activeTab === "reposts"
        ? repostsQuery.hasNextPage
        : bookmarksQuery.hasNextPage;

  const activeIsFetchingNextPage =
    activeTab === "posts"
      ? isFetchingNextPage
      : activeTab === "reposts"
        ? repostsQuery.isFetchingNextPage
        : bookmarksQuery.isFetchingNextPage;

  const handleTabRefresh = async () => {
    setIsPullRefreshing(true);
    try {
      if (activeTab === "bookmarks") {
        await Promise.all([
          refetch({ throwOnError: false, cancelRefetch: false }),
          bookmarksQuery.refetch({ throwOnError: false, cancelRefetch: false }),
        ]);
        return;
      }
      if (activeTab === "reposts") {
        await Promise.all([
          refetch({ throwOnError: false, cancelRefetch: false }),
          repostsQuery.refetch({ throwOnError: false, cancelRefetch: false }),
        ]);
        return;
      }
      await refetch({ throwOnError: false, cancelRefetch: false });
    } finally {
      setIsPullRefreshing(false);
    }
  };

  const handleFetchNextPage = () => {
    if (!activeHasNextPage || activeIsFetchingNextPage) return;
    if (activeTab === "posts") {
      fetchNextPage();
      return;
    }
    if (activeTab === "reposts") {
      repostsQuery.fetchNextPage();
      return;
    }
    bookmarksQuery.fetchNextPage();
  };

  const handleSwipeLeft = () => {
    const index = profileTabsOrder.indexOf(activeTab);
    if (index < profileTabsOrder.length - 1) {
      handleTabChange(profileTabsOrder[index + 1]);
    }
  };

  const handleSwipeRight = () => {
    const index = profileTabsOrder.indexOf(activeTab);
    if (index > 0) {
      handleTabChange(profileTabsOrder[index - 1]);
    }
  };

  const handleTabChange = (nextTab: "posts" | "reposts" | "bookmarks") => {
    if (nextTab === activeTab) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setActiveTab(nextTab);
  };

  const handleListTouchStart = (x: number, y: number) => {
    setSwipeStartPoint({ x, y });
  };

  const handleListTouchEnd = (x: number, y: number) => {
    if (!swipeStartPoint) return;
    const deltaX = x - swipeStartPoint.x;
    const deltaY = y - swipeStartPoint.y;
    setSwipeStartPoint(null);

    // Only switch tabs for mostly horizontal gestures to avoid conflicting with vertical scroll/pull refresh.
    if (Math.abs(deltaX) < 50 || Math.abs(deltaY) > 30) return;
    if (deltaX < 0) {
      handleSwipeLeft();
      return;
    }
    handleSwipeRight();
  };

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      {/* TopAppBar */}
      <View className="flex-row items-center justify-between px-6 py-4 w-full bg-surface z-50">
        <View className="flex-row items-center gap-4">
          <Pressable className="active:scale-95 duration-200">
            <MaterialIcons name="arrow-back" size={24} color="#0050cb" className="" />
          </Pressable>
          <Text className="font-['Inter'] font-bold text-lg tracking-tight text-on-surface">
            The Bridge
          </Text>
        </View>
        <Pressable
          className="p-2 rounded-full active:bg-surface-container-low transition-colors"
          onPress={() => router.push("../profile/account-center")}
        >
          <MaterialIcons name="settings" size={24} color="#1a1c1c" className="" />
        </Pressable>
      </View>

      {isLoading && !profile ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#0050cb" />
        </View>
      ) : activeTabError && !profile ? (
        <View className="flex-1 items-center justify-center px-6">
          <MaterialIcons name="error-outline" size={48} color="#ba1a1a" />
          <Text className="text-on-surface font-bold text-lg text-center mt-4 mb-2">Failed to load profile</Text>
          <Text className="text-on-surface-variant text-center mb-4">
            {(activeTabErrorObj as Error)?.message || "Something went wrong"}
          </Text>
          <Pressable onPress={handleTabRefresh} className="px-4 py-2 bg-primary rounded-full active:bg-primary/80">
            <Text className="text-on-primary font-bold">Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={listData}
          keyExtractor={(item) => item.id}
          stickyHeaderIndices={[1]}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshing={isPullRefreshing}
          onRefresh={handleTabRefresh}
          onTouchStart={(event) =>
            handleListTouchStart(event.nativeEvent.pageX, event.nativeEvent.pageY)
          }
          onTouchEnd={(event) =>
            handleListTouchEnd(event.nativeEvent.pageX, event.nativeEvent.pageY)
          }
          onEndReached={handleFetchNextPage}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            activeIsFetchingNextPage ? (
              <View className="py-4 items-center">
                <ActivityIndicator size="small" color="#0050cb" />
              </View>
            ) : null
          }
          renderItem={({ item }) => {
            if (item.type === 'header') return <ProfileHeader profile={profile} />;
            if (item.type === 'tabs') return <ProfileTabs activeTab={activeTab} onTabChange={handleTabChange} onSwipeLeft={handleSwipeLeft} onSwipeRight={handleSwipeRight} />;
            
            return (
              <ProfilePostCard
                post={item as ProfilePostProps}
                showDeleteAction
                showReportAction={false}
                onPostStateChange={() => {
                  refetch();
                  repostsQuery.refetch();
                  bookmarksQuery.refetch();
                }}
                onDeleteSuccess={() => {
                  refetch();
                }}
              />
            );
          }}
          ListEmptyComponent={
            <View className="px-6 py-10 items-center">
              {activeTabLoading ? (
                <View className="items-center">
                  <ActivityIndicator size="small" color="#0050cb" />
                  <Text className="text-on-surface-variant text-sm mt-3">
                    Loading {activeTab}...
                  </Text>
                </View>
              ) : activeTabError ? (
                <View className="items-center">
                  <Text className="text-on-surface-variant text-sm text-center">
                    {(activeTabErrorObj as Error)?.message || "Failed to load this tab."}
                  </Text>
                  <Pressable onPress={handleTabRefresh} className="mt-3 px-4 py-2 bg-primary rounded-full active:bg-primary/80">
                    <Text className="text-on-primary font-bold text-xs">Retry</Text>
                  </Pressable>
                </View>
              ) : (
                <Text className="text-on-surface-variant text-sm">
                  {activeTab === "posts"
                    ? "No posts yet."
                    : activeTab === "reposts"
                      ? "No reposts yet."
                      : "No bookmarks available yet."}
                </Text>
              )}
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
