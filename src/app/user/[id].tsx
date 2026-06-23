import React, { useState, useEffect } from "react";
import { View, Text, Image, Pressable, FlatList, ActivityIndicator, LayoutAnimation, Platform, UIManager } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useInfiniteQuery, useMutation } from "@tanstack/react-query";
import { getUserProfile, UserProfileData, followUser, unfollowUser } from "../../lib/api/user";
import { ProfilePostCard, ProfilePostProps } from "../../components/profile/ProfilePostCard";
import { getFallbackAvatarUrl } from "../../lib/avatar-fallback";

function ProfileHeader({ 
  id, profile, company, industry, isFollowingProp 
}: { 
  id: string, profile?: UserProfileData, company?: string, industry?: string, isFollowingProp?: boolean
}) {
  const [isFollowing, setIsFollowing] = useState(isFollowingProp || false);
  const fullName = profile ? `${profile.firstName || ""} ${profile.lastName || ""}`.trim() : "Loading...";
  const fallbackAvatarUri = getFallbackAvatarUrl(id || fullName);
  const companyName = profile?.company_name || company;
  const rankText = profile?.rank?.trim();
  const identityText = rankText && companyName
    ? `${rankText} @ ${companyName}`
    : rankText || companyName || "";

  useEffect(() => {
    if (isFollowingProp !== undefined) {
      setIsFollowing(isFollowingProp);
    }
  }, [isFollowingProp]);

  const toggleFollowMutation = useMutation({
    mutationFn: async () => {
      if (isFollowing) {
        await unfollowUser(id);
      } else {
        await followUser(id);
      }
    },
    onSuccess: () => {
      setIsFollowing((prev) => !prev);
    },
    onError: (err) => {
      console.warn("Follow toggle failed (might be dummy API):", err);
    }
  });

  return (
    <View className="flex-col items-center pt-8 pb-6 px-6">
      <View className="mb-4">
        {profile?.profile_picture ? (
          <View className="w-28 h-28 rounded-full overflow-hidden border-4 border-surface-container-low shadow-sm bg-surface-container-high">
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
          <Text className="text-lg font-bold text-on-surface leading-none">
            {profile?.followers_count || 0}
          </Text>
          <Text className="text-[10px] uppercase tracking-widest text-on-surface-variant mt-1">Followers</Text>
        </View>
        <View className="flex-1 bg-surface-container-lowest py-3 items-center">
          <Text className="text-lg font-bold text-on-surface leading-none">
            {profile?.following_count || 0}
          </Text>
          <Text className="text-[10px] uppercase tracking-widest text-on-surface-variant mt-1">Following</Text>
        </View>
        <View className="flex-1 bg-surface-container-lowest py-3 items-center">
          <Text className="text-lg font-bold text-on-surface leading-none">
            {profile?.total_post_count || 0}
          </Text>
          <Text className="text-[10px] uppercase tracking-widest text-on-surface-variant mt-1">Posts</Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View className="flex-row items-center gap-3 mt-6 w-full">
        <Pressable 
          onPress={() => toggleFollowMutation.mutate()}
          disabled={toggleFollowMutation.isPending}
          className={`flex-1 py-3 rounded-full flex-row justify-center items-center active:scale-95 duration-200 transition-colors ${
            isFollowing 
              ? "bg-surface-container-high border border-outline-variant" 
              : "bg-primary active:bg-primary/90"
          }`}
        >
          {toggleFollowMutation.isPending ? (
            <ActivityIndicator size="small" color={isFollowing ? "#727687" : "#ffffff"} />
          ) : (
            <Text className={`font-bold text-sm text-center ${
              isFollowing ? "text-on-surface" : "text-on-primary"
            }`}>
              {isFollowing ? "Unfollow" : "Follow"}
            </Text>
          )}
        </Pressable>

        <Pressable 
          className="flex-1 py-3 rounded-full flex-row justify-center items-center bg-surface-container-high border border-outline-variant active:scale-95 duration-200 transition-colors"
        >
          <Text className="font-bold text-sm text-center text-on-surface">
            Message
          </Text>
        </Pressable>
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
  activeTab: "posts" | "reposts";
  onTabChange: (t: "posts" | "reposts") => void;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
}) {
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  return (
    <View
      className="flex-row border-b border-surface-container-high px-6 bg-surface/95"
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
    </View>
  );
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
};

const PROFILE_POSTS_PAGE_SIZE = 15;

export default function UserProfileScreen() {
  const router = useRouter();
  const { id, company, industry } = useLocalSearchParams<{
    id: string;
    company: string;
    industry: string;
  }>();

  const [activeTab, setActiveTab] = useState<"posts" | "reposts">("posts");
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);
  const [swipeStartPoint, setSwipeStartPoint] = useState<{ x: number; y: number } | null>(null);
  const profileTabsOrder: Array<"posts" | "reposts"> = ["posts", "reposts"];
  useEffect(() => {
    if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  const { data, isLoading, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['userProfile', id],
    enabled: Boolean(id),
    initialPageParam: undefined as number | undefined,
    queryFn: ({ pageParam }) =>
      getUserProfile(id, {
        limit: PROFILE_POSTS_PAGE_SIZE,
        page: pageParam,
      }),
    getNextPageParam: (lastPage) => (lastPage.cursor && lastPage.cursor > 0 ? lastPage.cursor : undefined),
  });

  const handleRefresh = async () => {
    setIsPullRefreshing(true);
    try {
      await refetch({ throwOnError: false, cancelRefetch: false });
    } finally {
      setIsPullRefreshing(false);
    }
  };

  const firstPage = data?.pages?.[0];
  const profile = firstPage?.user_profile;
  const isFollowing = firstPage?.is_following;

  const allPosts = (data?.pages || []).flatMap((page) => page.user_profile.posts || []);
  const uniquePosts = Array.from(new Map(allPosts.map((post) => [post.id, post])).values());

  const mappedPosts: ProfilePostProps[] = uniquePosts.map((p) => ({
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
  })) || [];

  const filteredPosts = mappedPosts.filter((post) => {
    const postType = post.postType?.toLowerCase();
    if (activeTab === "posts") return postType !== "repost";
    return postType === "repost";
  });

  const listData = [
    { type: 'header', id: 'header' },
    { type: 'tabs', id: 'tabs' },
    ...filteredPosts.map(p => ({ ...p, type: 'post' }))
  ];

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

  const handleTabChange = (nextTab: "posts" | "reposts") => {
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

    // Keep vertical scroll and pull-to-refresh unaffected.
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
          <Pressable onPress={() => router.back()} className="active:scale-95 duration-200">
            <MaterialIcons name="arrow-back" size={24} color="#0050cb" className="" />
          </Pressable>
          <Text className="font-['Inter'] font-bold text-lg tracking-tight text-on-surface">
            {profile ? `${profile.firstName || ""} ${profile.lastName || ""}`.trim() : "Profile"}
          </Text>
        </View>
        <Pressable className="p-2 rounded-full active:bg-surface-container-low transition-colors">
          <MaterialIcons name="more-vert" size={24} color="#1a1c1c" className="" />
        </Pressable>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#0050cb" />
        </View>
      ) : (
        <FlatList
          data={listData}
          keyExtractor={(item) => item.id}
          stickyHeaderIndices={[1]}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshing={isPullRefreshing}
          onRefresh={handleRefresh}
          onTouchStart={(event) =>
            handleListTouchStart(event.nativeEvent.pageX, event.nativeEvent.pageY)
          }
          onTouchEnd={(event) =>
            handleListTouchEnd(event.nativeEvent.pageX, event.nativeEvent.pageY)
          }
          onEndReached={() => {
            if (activeTab === "posts" && hasNextPage && !isFetchingNextPage) {
              fetchNextPage();
            }
          }}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            isFetchingNextPage ? (
              <View className="py-4 items-center">
                <ActivityIndicator size="small" color="#0050cb" />
              </View>
            ) : null
          }
          renderItem={({ item }) => {
            if (item.type === 'header') return <ProfileHeader id={id} profile={profile} company={company} industry={industry} isFollowingProp={isFollowing} />;
            if (item.type === 'tabs') return <ProfileTabs activeTab={activeTab} onTabChange={handleTabChange} onSwipeLeft={handleSwipeLeft} onSwipeRight={handleSwipeRight} />;
            
            return <ProfilePostCard post={item as ProfilePostProps} />;
          }}
          ListEmptyComponent={
            <View className="px-6 py-10 items-center">
              <Text className="text-on-surface-variant text-sm">
                {activeTab === "posts" ? "No posts yet." : "No reposts yet."}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
