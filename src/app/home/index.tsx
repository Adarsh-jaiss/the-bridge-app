import { MaterialIcons } from "@expo/vector-icons";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, BackHandler, FlatList, Pressable, Text, ToastAndroid, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { TopBar } from "../../components/common/TopBar";
import { PostCard, PostProps } from "../../components/feed/PostCard";
import { queryClient } from "../../lib/api/client";
import { FeedPost, getFeed } from "../../lib/api/posts";

const FEED_PAGE_SIZE = 15;
const NEW_POSTS_POLL_MS = 18000;

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
  if (diffHours < 24) return `${Math.max(diffHours, 1)}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
};

const dedupePostsById = (posts: FeedPost[]) =>
  Array.from(new Map(posts.map((post) => [post.id, post])).values());

const mergePostsById = (basePosts: FeedPost[], incomingPosts: FeedPost[]) => {
  const incomingMap = new Map(incomingPosts.map((post) => [post.id, post]));
  return basePosts.map((post) => incomingMap.get(post.id) || post);
};

const mapFeedPostToCard = (post: FeedPost): PostProps => ({
  id: String(post.id),
  type: "standard",
  postType: post.post_type === "poll" ? "poll" : "post",
  author: {
    name: `${post.author_first_name || ""} ${post.author_last_name || ""}`.trim(),
    role: "",
    avatarUrl: post.author_profile_picture || "",
    publicId: post.author_public_id || undefined,
  },
  metaInfo: `${formatDate(post.created_at)}`,
  content: post.content,
  imageUrl: post.attachments?.[0] || null,
  pollOptions: (post.poll_options || []).map((option) => ({
    id: option.id,
    text: option.option_text,
    votes: option.votes_count || 0,
  })),
  hasVoted: post.has_voted || false,
  userVotedOptionId: post.user_voted_option_id ?? null,
  likesCount: post.likes_count || 0,
  isLiked: post.is_liked || false,
  commentsCount: post.comments_count || 0,
  repostsCount: post.repost_count || 0,
  isReposted: post.is_reposted || false,
  bookmarksCount: post.bookmarks_count || 0,
  isBookmarked: post.is_bookmarked || false,
  latestComment: post.latest_comment
    ? {
      id: String(post.latest_comment.id),
      content: post.latest_comment.content || "",
      createdAt: post.latest_comment.created_at || "",
      publicId: post.latest_comment.public_id || undefined,
      firstName: post.latest_comment.first_name || "",
      lastName: post.latest_comment.last_name || "",
      profilePicture: post.latest_comment.profile_picture || "",
    }
    : undefined,
  showLatestCommentPreview: Boolean(post.latest_comment?.content),
});

export default function Feed() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [isFabOpen, setIsFabOpen] = useState(false);
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);
  const [pendingTopPosts, setPendingTopPosts] = useState<FeedPost[]>([]);
  const [insertedTopPosts, setInsertedTopPosts] = useState<FeedPost[]>([]);
  const flatListRef = React.useRef<FlatList<PostProps>>(null);
  const lastBackPressRef = React.useRef(0);
  const knownPostIdsRef = React.useRef<Set<number>>(new Set());
  const { data, isLoading, isError, error, refetch, isRefetching, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ["feed"],
      initialPageParam: undefined as string | number | undefined,
      queryFn: ({ pageParam }) =>
        getFeed({
          limit: FEED_PAGE_SIZE,
          cursor: pageParam,
        }),
      getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
    });

  const handlePullToRefresh = useCallback(async () => {
    setIsPullRefreshing(true);
    try {
      await refetch({ throwOnError: false, cancelRefetch: false });
    } finally {
      setIsPullRefreshing(false);
    }
  }, [refetch]);

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        const now = Date.now();
        const elapsed = now - lastBackPressRef.current;

        if (elapsed < 1800) {
          return false; // Let default Android behavior close the app.
        }

        lastBackPressRef.current = now;
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
        handlePullToRefresh();
        ToastAndroid.show("Feed refreshed. Press back again to exit.", ToastAndroid.SHORT);
        return true;
      };

      const subscription = BackHandler.addEventListener("hardwareBackPress", onBackPress);
      return () => subscription.remove();
    }, [handlePullToRefresh])
  );

  const basePosts = useMemo(
    () => dedupePostsById((data?.pages || []).flatMap((page) => page.posts || [])),
    [data?.pages]
  );
  const mergedPosts = useMemo(
    () => dedupePostsById([...insertedTopPosts, ...basePosts]),
    [basePosts, insertedTopPosts]
  );
  const posts: PostProps[] = useMemo(() => mergedPosts.map(mapFeedPostToCard), [mergedPosts]);
  const hasPosts = posts.length > 0;

  useEffect(() => {
    const knownIds = new Set<number>();
    [...basePosts, ...insertedTopPosts, ...pendingTopPosts].forEach((post) => {
      knownIds.add(post.id);
    });
    knownPostIdsRef.current = knownIds;
  }, [basePosts, insertedTopPosts, pendingTopPosts]);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      const interval = setInterval(async () => {
        try {
          const latestFeed = await getFeed({ limit: FEED_PAGE_SIZE });
          if (!mounted) return;
          const latestPosts = latestFeed.posts || [];
          if (latestPosts.length === 0) return;

          queryClient.setQueryData(["feed"], (oldData: any) => {
            if (!oldData?.pages) return oldData;
            return {
              ...oldData,
              pages: oldData.pages.map((page: any) => ({
                ...page,
                posts: mergePostsById(page.posts || [], latestPosts),
              })),
            };
          });

          setInsertedTopPosts((prev) => mergePostsById(prev, latestPosts));
          setPendingTopPosts((prev) => mergePostsById(prev, latestPosts));

          const newPosts = latestPosts.filter((post) => !knownPostIdsRef.current.has(post.id));
          if (newPosts.length === 0) return;
          setPendingTopPosts((prev) => dedupePostsById([...newPosts, ...prev]));
        } catch {
          // Silent fail for background polling.
        }
      }, NEW_POSTS_POLL_MS);

      return () => {
        mounted = false;
        clearInterval(interval);
      };
    }, [])
  );

  const handleShowNewPosts = useCallback(() => {
    if (pendingTopPosts.length === 0) return;
    setInsertedTopPosts((prev) => dedupePostsById([...pendingTopPosts, ...prev]));
    setPendingTopPosts([]);
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, [pendingTopPosts]);

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <TopBar />
      {isLoading && !hasPosts ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#0050cb" />
        </View>
      ) : isError && !hasPosts ? (
        <View className="flex-1 items-center justify-center px-6">
          <MaterialIcons name="error-outline" size={48} color="#ba1a1a" />
          <Text className="text-on-surface font-bold text-lg text-center mt-4 mb-2">Failed to load feed</Text>
          <Text className="text-on-surface-variant text-center mb-4">
            {(error as Error)?.message || "Something went wrong"}
          </Text>
          <Pressable onPress={() => refetch()} className="px-4 py-2 bg-primary rounded-full active:bg-primary/80">
            <Text className="text-on-primary font-bold">Retry</Text>
          </Pressable>
        </View>
      ) : (
        <View className="flex-1">
          {pendingTopPosts.length > 0 && (
            <View className="absolute top-3 self-center z-50">
              <Pressable
                onPress={handleShowNewPosts}
                className="bg-primary px-4 py-2 rounded-full shadow-sm active:opacity-85"
              >
                <Text className="text-white text-xs font-bold">posted</Text>
              </Pressable>
            </View>
          )}
          {isError && hasPosts && (
            <View className="px-4 pt-2">
              <Text className="text-xs text-red-600">
                Refresh failed, showing last loaded posts.
              </Text>
            </View>
          )}
          <FlatList
            ref={flatListRef}
            data={posts}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <PostCard post={item} />}
            contentContainerStyle={{ paddingBottom: 140 + insets.bottom }}
            showsVerticalScrollIndicator={false}
            refreshing={isPullRefreshing || isRefetching}
            onRefresh={handlePullToRefresh}
            onEndReached={() => {
              if (hasNextPage && !isFetchingNextPage) {
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
          />
        </View>
      )}

      {isFabOpen && (
        <View
          className="absolute right-6 items-end gap-3"
          style={{ bottom: 96 + insets.bottom }}
        >
          <Pressable
            className="bg-surface-container-high px-5 py-3 rounded-full flex-row items-center gap-2.5 shadow-sm active:scale-95"
            style={{ minWidth: 160, maxWidth: "90%" }}
            onPress={() => {
              setIsFabOpen(false);
              router.push("/post/create");
            }}
          >
            <MaterialIcons name="post-add" size={20} color="#0050cb" />
            <Text className="text-on-surface font-semibold text-[15px]">Create Post</Text>
          </Pressable>
          <Pressable
            className="bg-surface-container-high px-5 py-3 rounded-full flex-row items-center gap-2.5 shadow-sm active:scale-95"
            style={{ minWidth: 160, maxWidth: "90%" }}
            onPress={() => {
              setIsFabOpen(false);
              router.push("/post/create-poll");
            }}
          >
            <MaterialIcons name="poll" size={20} color="#0050cb" />
            <Text className="text-on-surface font-semibold text-[15px]">Create Poll</Text>
          </Pressable>
        </View>
      )}

      <Pressable
        className="absolute right-6 w-16 h-16 rounded-full bg-primary items-center justify-center shadow-sm active:scale-95"
        style={{ bottom: 8 + insets.bottom }}
        onPress={() => setIsFabOpen((prev) => !prev)}
      >
        <MaterialIcons name={isFabOpen ? "close" : "add"} size={32} color="#ffffff" />
      </Pressable>
    </SafeAreaView>
  );
}
