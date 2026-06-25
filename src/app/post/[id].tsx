import { useMutation, useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, Bookmark, Heart, MessageCircle, Repeat2, Share2, TriangleAlert } from "lucide-react-native";
import { cssInterop } from "nativewind";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CommentComposer, MentionCandidate } from "../../components/comments/CommentComposer";
import { CommentRow } from "../../components/comments/CommentRow";
import { MentionText } from "../../components/common/MentionText";
import { TransientSnackbar } from "../../components/common/TransientSnackbar";
import { queryClient } from "../../lib/api/client";
import {
  PostComment,
  getPostDetails,
  removeBookmark,
  removeRepost,
  toggleBookmark,
  togglePostLike,
  toggleRepost,
} from "../../lib/api/posts";
import { getFallbackAvatarUrl } from "../../lib/avatar-fallback";

cssInterop(Image, { className: "style" });

const LOVE_COLOR = "#e0245e";
const MUTED_COLOR = "#727687";
const PRIMARY_COLOR = "#0050cb";

const formatTimestamp = (dateString: string) => {
  const date = new Date(dateString);
  const time = date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const day = date.toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });
  return `${time} · ${day}`;
};

export default function PostDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const postId = Number(id);
  const [parentComments, setParentComments] = useState<PostComment[]>([]);
  const [localCommentDelta, setLocalCommentDelta] = useState(0);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("Comment posted");

  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [bookmarked, setBookmarked] = useState(false);
  const [bookmarksCount, setBookmarksCount] = useState(0);
  const [reposted, setReposted] = useState(false);
  const [repostsCount, setRepostsCount] = useState(0);

  const postDetailsQuery = useQuery({
    queryKey: ["postDetails", postId],
    enabled: Number.isFinite(postId) && postId > 0,
    queryFn: () => getPostDetails(postId),
  });

  const post = postDetailsQuery.data?.post;

  useEffect(() => {
    setParentComments(postDetailsQuery.data?.parent_comments || []);
    setLocalCommentDelta(0);
  }, [postDetailsQuery.data?.parent_comments]);

  useEffect(() => {
    if (!post) return;
    setLiked(Boolean(post.is_liked));
    setLikesCount(post.likes_count ?? 0);
    setBookmarked(Boolean(post.is_bookmarked));
    setBookmarksCount(post.bookmarks_count ?? 0);
    setReposted(Boolean(post.is_reposted));
    setRepostsCount(post.repost_count ?? 0);
  }, [post]);

  useEffect(() => {
    if (!showToast) return;
    const timeout = setTimeout(() => setShowToast(false), 1400);
    return () => clearTimeout(timeout);
  }, [showToast]);

  const likeMutation = useMutation({
    mutationFn: async () => togglePostLike(postId),
    onSuccess: () =>
      setLiked((prev) => {
        const next = !prev;
        setLikesCount((count) => (next ? count + 1 : Math.max(count - 1, 0)));
        return next;
      }),
  });

  const bookmarkMutation = useMutation({
    mutationFn: async () => (bookmarked ? removeBookmark(postId) : toggleBookmark(postId)),
    onSuccess: () =>
      setBookmarked((prev) => {
        const next = !prev;
        setBookmarksCount((count) => (next ? count + 1 : Math.max(count - 1, 0)));
        return next;
      }),
  });

  const repostMutation = useMutation({
    mutationFn: async () => (reposted ? removeRepost(postId) : toggleRepost(postId)),
    onSuccess: () =>
      setReposted((prev) => {
        const next = !prev;
        setRepostsCount((count) => (next ? count + 1 : Math.max(count - 1, 0)));
        return next;
      }),
  });

  const authorName = post
    ? `${post.author_first_name || ""} ${post.author_last_name || ""}`.trim() || "User"
    : "";
  const fallbackAvatar = getFallbackAvatarUrl(post?.author_public_id || String(postId));
  const postImage = post?.attachments?.[0];
  const commentsCount = (post?.comments_count || 0) + localCommentDelta;

  const mentionCandidates = useMemo<MentionCandidate[]>(() => {
    const candidates = new Map<string, MentionCandidate>();
    // The post author is taggable first, then everyone in the thread.
    if (post?.author_public_id) {
      candidates.set(post.author_public_id, {
        publicId: post.author_public_id,
        firstName: post.author_first_name || "",
        lastName: post.author_last_name || "",
        fullName: authorName,
        profilePicture: post.author_profile_picture || undefined,
      });
    }
    const add = (c: PostComment) => {
      const publicId = c.public_id?.trim();
      if (!publicId) return;
      const firstName = c.first_name || "";
      const lastName = c.last_name || "";
      candidates.set(publicId, {
        publicId,
        firstName,
        lastName,
        fullName: `${firstName} ${lastName}`.trim() || "User",
        profilePicture: c.profile_picture || undefined,
      });
    };
    parentComments.forEach((parent) => {
      add(parent);
      (parent.child_comments || []).forEach(add);
    });
    return Array.from(candidates.values());
  }, [parentComments, post, authorName]);

  const openUserProfile = (publicId?: string) => {
    if (publicId) router.push(`/user/${publicId}` as any);
  };

  const openCommentUserProfile = (comment: PostComment) => {
    if (comment.public_id) {
      router.push(`/user/${comment.public_id}` as any);
      return;
    }
    const isLocalSelfComment = comment.id < 0 || (comment.first_name || "").toLowerCase() === "you";
    if (isLocalSelfComment) router.push("/home/profile");
  };

  const openThread = (comment: PostComment) => {
    queryClient.setQueryData(["comment", comment.id], comment);
    if (post?.author_public_id) {
      queryClient.setQueryData(["postAuthor", postId], {
        publicId: post.author_public_id,
        firstName: post.author_first_name || "",
        lastName: post.author_last_name || "",
        fullName: authorName,
        profilePicture: post.author_profile_picture || undefined,
      });
    }
    router.push({
      pathname: "/comment/[id]",
      params: { id: String(comment.id), postId: String(postId) },
    } as any);
  };

  const handlePosted = ({ content }: { content: string; parentCommentId: number | null }) => {
    const localComment: PostComment = {
      id: -Date.now(),
      content,
      first_name: "You",
      last_name: "",
      created_at: new Date().toISOString(),
      child_comments: [],
      next_child_cursor: 0,
    };
    setParentComments((prev) => [localComment, ...prev]);
    setLocalCommentDelta((prev) => prev + 1);
    setToastMessage("Comment posted");
    setShowToast(true);
  };

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={["top"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
        className="flex-1"
      >
        <View className="flex-row items-center gap-3 px-4 py-3 border-b border-surface-container-high">
          <Pressable
            onPress={() => router.back()}
            className="p-2 -ml-2 rounded-full active:bg-surface-container-low"
          >
            <ArrowLeft size={22} color={PRIMARY_COLOR} />
          </Pressable>
          <Text className="text-[17px] font-bold text-on-surface">Post</Text>
        </View>

        {postDetailsQuery.isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color={PRIMARY_COLOR} />
          </View>
        ) : postDetailsQuery.isError || !post ? (
          <View className="flex-1 items-center justify-center px-6">
            <TriangleAlert size={44} color="#ba1a1a" />
            <Text className="text-on-surface font-bold text-lg text-center mt-4 mb-2">
              Failed to load post
            </Text>
            <Text className="text-on-surface-variant text-center mb-4">
              {(postDetailsQuery.error as Error)?.message || "Something went wrong"}
            </Text>
            <Pressable
              onPress={() => postDetailsQuery.refetch()}
              className="px-4 py-2 bg-primary rounded-full active:bg-primary/80"
            >
              <Text className="text-on-primary font-bold">Retry</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={parentComments}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={{ paddingBottom: 24 }}
            refreshing={postDetailsQuery.isRefetching}
            onRefresh={() => postDetailsQuery.refetch({ throwOnError: false, cancelRefetch: false })}
            renderItem={({ item }) => (
              <CommentRow
                comment={item}
                postId={postId}
                onPress={() => openThread(item)}
                onPressUser={openCommentUserProfile}
                onDeleteSuccess={(deletedCommentId) => {
                  setParentComments((prev) => prev.filter((c) => c.id !== deletedCommentId));
                  setLocalCommentDelta((prev) => prev - 1);
                }}
              />
            )}
            ListHeaderComponent={
              <View className="px-4 pt-4 border-b border-surface-container-high">
                {/* Author */}
                <View className="flex-row items-center gap-3">
                  <Pressable onPress={() => openUserProfile(post.author_public_id)} className="active:opacity-70">
                    <Image
                      source={{ uri: post.author_profile_picture || fallbackAvatar }}
                      className="w-11 h-11 rounded-full bg-surface-container-high"
                    />
                  </Pressable>
                  <Pressable onPress={() => openUserProfile(post.author_public_id)} className="active:opacity-70">
                    <Text className="text-[15px] font-bold text-on-surface">{authorName}</Text>
                  </Pressable>
                </View>

                {/* Content */}
                <MentionText
                  content={post.content || ""}
                  className="mt-3 text-[16px] leading-6 text-on-surface"
                  onPressUser={openUserProfile}
                />

                {/* Image */}
                {!!postImage && (
                  <View className="mt-3 rounded-2xl overflow-hidden bg-surface-container-high aspect-video">
                    <Image source={{ uri: postImage }} className="w-full h-full" contentFit="cover" transition={150} />
                  </View>
                )}

                {/* Timestamp */}
                <Text className="text-[13px] text-outline mt-3">{formatTimestamp(post.created_at)}</Text>

                {/* Stats */}
                <View className="flex-row items-center gap-4 mt-3 pt-3 border-t border-surface-container-high">
                  <Text className="text-[13px] text-on-surface-variant">
                    <Text className="font-bold text-on-surface">{repostsCount.toLocaleString()}</Text> Reposts
                  </Text>
                  <Text className="text-[13px] text-on-surface-variant">
                    <Text className="font-bold text-on-surface">{likesCount.toLocaleString()}</Text> Likes
                  </Text>
                  <Text className="text-[13px] text-on-surface-variant">
                    <Text className="font-bold text-on-surface">{bookmarksCount.toLocaleString()}</Text> Bookmarks
                  </Text>
                </View>

                {/* Action bar */}
                <View className="flex-row items-center justify-between py-2.5 border-t border-b border-surface-container-high mt-3">
                  <View className="flex-row items-center gap-1.5">
                    <MessageCircle size={20} color={MUTED_COLOR} />
                    <Text className="text-[13px] text-outline">{commentsCount.toLocaleString()}</Text>
                  </View>
                  <Pressable
                    onPress={() => repostMutation.mutate()}
                    disabled={repostMutation.isPending}
                    className="flex-row items-center gap-1.5 active:opacity-50"
                  >
                    <Repeat2 size={21} color={reposted ? PRIMARY_COLOR : MUTED_COLOR} />
                    <Text className={`text-[13px] ${reposted ? "text-primary" : "text-outline"}`}>
                      {repostsCount.toLocaleString()}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => likeMutation.mutate()}
                    disabled={likeMutation.isPending}
                    className="flex-row items-center gap-1.5 active:opacity-50"
                  >
                    <Heart size={20} color={liked ? LOVE_COLOR : MUTED_COLOR} fill={liked ? LOVE_COLOR : "transparent"} />
                    <Text className={`text-[13px] font-medium ${liked ? "text-[#e0245e]" : "text-outline"}`}>
                      {likesCount.toLocaleString()}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => bookmarkMutation.mutate()}
                    disabled={bookmarkMutation.isPending}
                    className="flex-row items-center gap-1.5 active:opacity-50"
                  >
                    <Bookmark size={20} color={bookmarked ? PRIMARY_COLOR : MUTED_COLOR} fill={bookmarked ? PRIMARY_COLOR : "transparent"} />
                    <Text className={`text-[13px] ${bookmarked ? "text-primary" : "text-outline"}`}>
                      {bookmarksCount.toLocaleString()}
                    </Text>
                  </Pressable>
                  <Pressable className="active:opacity-50">
                    <Share2 size={19} color={MUTED_COLOR} />
                  </Pressable>
                </View>
              </View>
            }
            ListEmptyComponent={
              <View className="px-4 py-8 items-center">
                <Text className="text-sm text-on-surface-variant">
                  No comments yet. Be the first to comment.
                </Text>
              </View>
            }
          />
        )}

        <CommentComposer
          postId={postId}
          mentionCandidates={mentionCandidates}
          placeholder="Post your reply..."
          onPosted={handlePosted}
        />
        <TransientSnackbar visible={showToast} message={toastMessage} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
