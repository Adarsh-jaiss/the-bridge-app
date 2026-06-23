import { useMutation } from "@tanstack/react-query";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import {
  Bookmark,
  CircleCheck,
  Ellipsis,
  Flag,
  Heart,
  MessageCircle,
  Repeat2,
  Share2,
  TriangleAlert,
} from "lucide-react-native";
import { cssInterop } from "nativewind";
import React, { useMemo, useState } from "react";
import { Animated, Modal, Pressable, Text, View } from "react-native";
import { removeBookmark, removeRepost, toggleBookmark, togglePostLike, toggleRepost, votePollOption } from "../../lib/api/posts";
import { getFallbackAvatarUrl } from "../../lib/avatar-fallback";
import { MentionText } from "../common/MentionText";

// expo-image isn't a core RN component, so register it with NativeWind once
// here so Tailwind `className` sizing/rounding applies to it.
cssInterop(Image, { className: "style" });

export interface PollOption {
  id: string | number;
  text: string;
  votes: number;
}

export interface PostProps {
  id: string;
  type: "standard" | "alert";
  postType?: "post" | "poll";
  author?: {
    name: string;
    role: string;
    avatarUrl: string;
    publicId?: string;
  };
  metaInfo?: string;
  content?: string;
  imageUrl?: string | null;
  pollOptions?: PollOption[];
  hasVoted?: boolean;
  userVotedOptionId?: string | number | null;
  likesCount?: number;
  isLiked?: boolean;
  commentsCount?: number;
  repostsCount?: number;
  isReposted?: boolean;
  bookmarksCount?: number;
  isBookmarked?: boolean;
  alertType?: string;
  title?: string;
  description?: string;
  latestComment?: {
    id: string;
    content: string;
    createdAt: string;
    publicId?: string;
    firstName?: string;
    lastName?: string;
    profilePicture?: string;
  };
  showLatestCommentPreview?: boolean;
}

const LOVE_COLOR = "#e0245e";
const MUTED_ICON_COLOR = "#727687";
const PRIMARY_COLOR = "#0050cb";
const CONTENT_PREVIEW_WORDS = 36;

function truncateByWordCount(content: string, maxWords: number) {
  const words = content.trim().split(/\s+/);
  if (words.length <= maxWords) {
    return { text: content, isTruncated: false };
  }
  return {
    text: `${words.slice(0, maxWords).join(" ")}...`,
    isTruncated: true,
  };
}

function PollBlock({ post }: { post: PostProps }) {
  const [selectedId, setSelectedId] = useState<string | null>(
    post.userVotedOptionId !== undefined && post.userVotedOptionId !== null
      ? String(post.userVotedOptionId)
      : null
  );
  const [pollResults, setPollResults] = useState<Record<string, number>>(() =>
    (post.pollOptions || []).reduce<Record<string, number>>((acc, option) => {
      acc[String(option.id)] = option.votes || 0;
      return acc;
    }, {})
  );
  const [hasVoted, setHasVoted] = useState(Boolean(post.hasVoted));

  const voteMutation = useMutation({
    mutationFn: async (pollOptionId: number) => votePollOption(pollOptionId),
    onSuccess: (response, pollOptionId) => {
      setSelectedId(String(pollOptionId));
      setHasVoted(true);
      const mapped = response.poll_options_result.reduce<Record<string, number>>((acc, option) => {
        acc[String(option.option_id)] = option.votes_count;
        return acc;
      }, {});
      setPollResults(mapped);
    },
  });

  const totalVotes = useMemo(() => {
    if (!hasVoted) return (post.pollOptions ?? []).reduce((sum, o) => sum + (o.votes || 0), 0);
    return Object.values(pollResults).reduce((sum, count) => sum + (count || 0), 0);
  }, [hasVoted, pollResults, post.pollOptions]);

  if (!post.pollOptions || post.pollOptions.length === 0) return null;

  return (
    <View className="mb-4 gap-2">
      {post.pollOptions.map((option) => {
        const optionKey = String(option.id);
        const votes = hasVoted ? pollResults[optionKey] ?? option.votes : option.votes;
        const percentage = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
        const isSelected = selectedId === optionKey;

        return (
          <View
            key={`${post.id}-poll-${option.id}`}
            className="rounded-xl overflow-hidden border border-surface-container-high"
          >
            {hasVoted && (
              <View
                className={`absolute left-0 top-0 bottom-0 ${
                  isSelected ? "bg-primary/25" : "bg-surface-container-low"
                }`}
                style={{ width: `${Math.max(percentage, 6)}%` }}
              />
            )}
            <Pressable
              disabled={hasVoted || voteMutation.isPending}
              onPress={() => {
                const numericId = Number(option.id);
                if (Number.isFinite(numericId) && numericId > 0) {
                  voteMutation.mutate(numericId);
                }
              }}
              className={`px-3 py-2.5 ${
                hasVoted ? "bg-transparent" : "bg-surface-container-low active:opacity-80"
              }`}
            >
              <View className="flex-row items-center justify-between">
                <Text className="text-sm font-medium text-on-surface flex-1 pr-3">
                  {option.text}
                </Text>
                {hasVoted ? (
                  <View className="flex-row items-center gap-1.5">
                    {isSelected && (
                      <CircleCheck size={16} color={PRIMARY_COLOR} />
                    )}
                    <Text className="text-xs font-semibold text-on-surface-variant">
                      {percentage}%
                    </Text>
                  </View>
                ) : null}
              </View>
            </Pressable>
          </View>
        );
      })}
      <Text className="text-[11px] text-outline font-medium mt-0.5">
        {totalVotes.toLocaleString()} {totalVotes === 1 ? "vote" : "votes"}
        {hasVoted ? " • You voted" : " • Tap an option to vote"}
      </Text>
      {voteMutation.isError && (
        <Text className="text-xs text-red-600 mt-1">
          Failed to submit vote. Please try again.
        </Text>
      )}
    </View>
  );
}

export function PostCard({ post }: { post: PostProps }) {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [liked, setLiked] = useState(Boolean(post.isLiked));
  const [likesCount, setLikesCount] = useState(post.likesCount ?? 0);
  const [bookmarked, setBookmarked] = useState(Boolean(post.isBookmarked));
  const [bookmarksCount, setBookmarksCount] = useState(post.bookmarksCount ?? 0);
  const [reposted, setReposted] = useState(Boolean(post.isReposted));
  const [repostsCount, setRepostsCount] = useState(post.repostsCount ?? 0);
  const commentCountScale = React.useRef(new Animated.Value(1)).current;
  const previousCommentCountRef = React.useRef(post.commentsCount ?? 0);
  const isPoll = post.postType === "poll";
  const hasImageAttachment =
    typeof post.imageUrl === "string" &&
    post.imageUrl.trim().length > 0 &&
    /^https?:\/\//i.test(post.imageUrl.trim());
  const fallbackAvatar = getFallbackAvatarUrl(post.id);
  const numericPostId = Number(post.id);
  const openPostDetails = () => {
    if (!Number.isFinite(numericPostId) || numericPostId <= 0) return;
    router.push(`/post/${post.id}` as any);
  };
  const fullContent = post.content?.trim() || "";
  const contentPreview = truncateByWordCount(fullContent, CONTENT_PREVIEW_WORDS);

  // Keep local UI state aligned with latest API data after refetch.
  React.useEffect(() => {
    setLiked(Boolean(post.isLiked));
    setLikesCount(post.likesCount ?? 0);
    setBookmarked(Boolean(post.isBookmarked));
    setBookmarksCount(post.bookmarksCount ?? 0);
    setReposted(Boolean(post.isReposted));
    setRepostsCount(post.repostsCount ?? 0);
  }, [
    post.isLiked,
    post.likesCount,
    post.isBookmarked,
    post.bookmarksCount,
    post.isReposted,
    post.repostsCount,
  ]);

  React.useEffect(() => {
    const nextCount = post.commentsCount ?? 0;
    if (nextCount > previousCommentCountRef.current) {
      Animated.sequence([
        Animated.timing(commentCountScale, {
          toValue: 1.2,
          duration: 170,
          useNativeDriver: true,
        }),
        Animated.timing(commentCountScale, {
          toValue: 1,
          duration: 170,
          useNativeDriver: true,
        }),
      ]).start();
    }
    previousCommentCountRef.current = nextCount;
  }, [commentCountScale, post.commentsCount]);

  const likeMutation = useMutation({
    mutationFn: async () => {
      if (!Number.isFinite(numericPostId) || numericPostId <= 0) throw new Error("Invalid post id");
      await togglePostLike(numericPostId);
    },
    onSuccess: () => {
      setLiked((prev) => {
        const next = !prev;
        setLikesCount((count) => (next ? count + 1 : Math.max(count - 1, 0)));
        return next;
      });
    },
  });

  const bookmarkMutation = useMutation({
    mutationFn: async () => {
      if (!Number.isFinite(numericPostId) || numericPostId <= 0) throw new Error("Invalid post id");
      if (bookmarked) {
        await removeBookmark(numericPostId);
      } else {
        await toggleBookmark(numericPostId);
      }
    },
    onSuccess: () => {
      setBookmarked((prev) => {
        const next = !prev;
        setBookmarksCount((count) => (next ? count + 1 : Math.max(count - 1, 0)));
        return next;
      });
    },
  });

  const repostMutation = useMutation({
    mutationFn: async () => {
      if (!Number.isFinite(numericPostId) || numericPostId <= 0) throw new Error("Invalid post id");
      if (reposted) {
        await removeRepost(numericPostId);
      } else {
        await toggleRepost(numericPostId);
      }
    },
    onSuccess: () => {
      setReposted((prev) => {
        const next = !prev;
        setRepostsCount((count) => (next ? count + 1 : Math.max(count - 1, 0)));
        return next;
      });
    },
  });

  if (post.type === "alert") {
    return (
      <View className="bg-primary p-6 rounded-xl relative overflow-hidden mb-4 shadow-sm">
        <View className="relative z-10">
          <Text className="text-[10px] font-bold uppercase tracking-[0.2em] text-white opacity-80 mb-2">
            {post.alertType}
          </Text>
          <Text className="text-xl font-bold text-white mb-2">
            {post.title}
          </Text>
          <Text className="text-sm text-white opacity-90 max-w-[80%] mb-4">
            {post.description}
          </Text>
          <Pressable className="px-4 py-2 bg-white rounded-full items-center justify-center self-start active:opacity-80 transition-opacity">
            <Text className="text-primary text-xs font-bold uppercase tracking-wider">
              Full Advisory
            </Text>
          </Pressable>
        </View>
        <View className="absolute right-[-20px] bottom-[-20px] opacity-10 pointer-events-none">
          <TriangleAlert size={120} color="#ffffff" />
        </View>
      </View>
    );
  }

  const hasReplyPreview = Boolean(post.showLatestCommentPreview && post.latestComment);
  const commenterName = post.latestComment
    ? `${post.latestComment.firstName || "Someone"} ${post.latestComment.lastName || ""}`.trim()
    : "";

  return (
    <View className="bg-surface border-b border-surface-container-high overflow-hidden relative">
      <Pressable className="px-4 pt-4 active:opacity-95" onPress={openPostDetails}>
        <View className="flex-row">
          {/* Left gutter: author avatar + the thread line that connects down to
              the reply avatar (only rendered when there's a reply to connect to). */}
          <View className="w-10 items-center mr-3">
            <Pressable
              onPress={(event) => {
                event.stopPropagation();
                if (post.author?.publicId) {
                  router.push(`/user/${post.author.publicId}` as any);
                }
              }}
              disabled={!post.author?.publicId}
              className="active:opacity-80"
            >
              <Image
                source={{ uri: post.author?.avatarUrl || fallbackAvatar }}
                className="w-10 h-10 rounded-full bg-surface-container-high"
              />
            </Pressable>
            {hasReplyPreview && (
              <View className="w-[2px] flex-1 mt-1 rounded-full bg-surface-container-high" />
            )}
          </View>

          {/* Right column: header, content and any poll/image attachment. */}
          <View className={`flex-1 ${hasReplyPreview ? "pb-3" : ""}`}>
            <View className="flex-row items-start justify-between">
              <View className="flex-1 pr-2">
                <Text className="font-bold text-[15px] text-on-surface" numberOfLines={1}>
                  {post.author?.name}
                </Text>
                <Text className="text-xs text-outline font-medium mt-0.5">
                  {post.metaInfo}
                </Text>
              </View>
              <Pressable
                className="-mr-1 -mt-1 p-1 active:opacity-50"
                onPress={(event) => {
                  event.stopPropagation();
                  setIsMenuOpen(true);
                }}
              >
                <Ellipsis size={20} color={MUTED_ICON_COLOR} />
              </Pressable>
            </View>

            {/* Content */}
            {!!fullContent && (
              <View className="mt-1.5">
                <Text className="text-[14px] leading-relaxed text-on-surface">
                  {contentPreview.text}
                </Text>
                {contentPreview.isTruncated && (
                  <Pressable onPress={openPostDetails} className="mt-1.5 self-start active:opacity-70">
                    <Text className="text-xs font-semibold text-primary">Show more</Text>
                  </Pressable>
                )}
              </View>
            )}

            {/* Poll options (poll posts only) */}
            {isPoll && (
              <View className="mt-3">
                <PollBlock post={post} />
              </View>
            )}

            {/* Image (non-poll posts) */}
            {!isPoll && hasImageAttachment && (
              <Pressable
                className="rounded-2xl overflow-hidden mt-3 aspect-video bg-surface-container-high w-full active:opacity-90"
                onPress={openPostDetails}
              >
                <Image
                  source={{ uri: post.imageUrl!.trim() }}
                  className="w-full h-full"
                  contentFit="cover"
                  transition={150}
                />
              </Pressable>
            )}
          </View>
        </View>
      </Pressable>

      {/* Threaded reply preview — the commenter avatar sits directly under the
          author avatar and the thread line above visually joins them. */}
      {hasReplyPreview && post.latestComment && (
        <Pressable className="flex-row px-4 active:opacity-90" onPress={openPostDetails}>
          <View className="w-10 items-center mr-3">
            <Pressable
              onPress={(event) => {
                event.stopPropagation();
                if (post.latestComment?.publicId) {
                  router.push(`/user/${post.latestComment.publicId}` as any);
                }
              }}
              disabled={!post.latestComment.publicId}
              className="active:opacity-70"
            >
              <Image
                source={{
                  uri: post.latestComment.profilePicture || getFallbackAvatarUrl(post.latestComment.id),
                }}
                className="w-8 h-8 rounded-full bg-surface-container-high"
              />
            </Pressable>
          </View>
          <View className="flex-1 pb-1">
            <View className="flex-row items-center gap-1.5">
              <Pressable
                onPress={(event) => {
                  event.stopPropagation();
                  if (post.latestComment?.publicId) {
                    router.push(`/user/${post.latestComment.publicId}` as any);
                  }
                }}
                disabled={!post.latestComment.publicId}
                className="active:opacity-70 shrink"
              >
                <Text className="font-semibold text-[13px] text-on-surface" numberOfLines={1}>
                  {commenterName || "Someone"}
                </Text>
              </Pressable>
              <Text className="text-[12px] text-outline">replied</Text>
            </View>
            <MentionText
              content={post.latestComment.content}
              className="text-[13px] text-on-surface-variant leading-5 mt-0.5"
              numberOfLines={2}
              onPressUser={(publicId) => router.push(`/user/${publicId}` as any)}
            />
          </View>
        </Pressable>
      )}

      {/* Actions — indented under the content (past the avatar gutter) and
          spread evenly across the width, Twitter-style. */}
      <View className="flex-row px-4 pb-3 pt-2">
        <View className="w-10 mr-3" />
        <View className="flex-1 flex-row items-center justify-between">
          <Pressable className="flex-row items-center gap-1.5 active:opacity-50" onPress={openPostDetails}>
            <Animated.View style={{ transform: [{ scale: commentCountScale }] }} className="flex-row items-center gap-1.5">
              <MessageCircle size={19} color={MUTED_ICON_COLOR} />
              <Text className="text-xs font-medium text-outline">
                {post.commentsCount?.toLocaleString()}
              </Text>
            </Animated.View>
          </Pressable>
          <Pressable
            className="flex-row items-center gap-1.5 active:opacity-50"
            onPress={() => repostMutation.mutate()}
            disabled={repostMutation.isPending}
          >
            <Repeat2 size={21} color={reposted ? PRIMARY_COLOR : MUTED_ICON_COLOR} />
            <Text className={`text-xs font-medium ${reposted ? "text-primary" : "text-outline"}`}>
              {repostsCount.toLocaleString()}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => likeMutation.mutate()}
            disabled={likeMutation.isPending}
            className="flex-row items-center gap-1.5 active:opacity-50"
          >
            <Heart
              size={20}
              color={liked ? LOVE_COLOR : MUTED_ICON_COLOR}
              fill={liked ? LOVE_COLOR : "transparent"}
            />
            <Text
              className={`text-xs font-bold ${
                liked ? "text-[#e0245e]" : "text-on-surface"
              }`}
            >
              {likesCount.toLocaleString()}
            </Text>
          </Pressable>
          <Pressable className="flex-row items-center gap-1.5 active:opacity-50" onPress={() => bookmarkMutation.mutate()} disabled={bookmarkMutation.isPending}>
            <Bookmark
              size={20}
              color={bookmarked ? PRIMARY_COLOR : MUTED_ICON_COLOR}
              fill={bookmarked ? PRIMARY_COLOR : "transparent"}
            />
            <Text className={`text-xs font-medium ${bookmarked ? "text-primary" : "text-outline"}`}>
              {bookmarksCount.toLocaleString()}
            </Text>
          </Pressable>
          <Pressable className="active:opacity-50">
            <Share2 size={19} color={MUTED_ICON_COLOR} />
          </Pressable>
        </View>
      </View>
      <Modal
        visible={isMenuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsMenuOpen(false)}
      >
        <Pressable className="flex-1 bg-black/40 justify-end" onPress={() => setIsMenuOpen(false)}>
          <View className="bg-surface rounded-t-3xl p-5 border-t border-surface-container-high">
            <Pressable
              className="flex-row items-center gap-3 px-2 py-3 active:opacity-70"
              onPress={() => {
                setIsMenuOpen(false);
                router.push({ pathname: "/report/[postId]", params: { postId: post.id } } as any);
              }}
            >
              <Flag size={20} color="#ba1a1a" />
              <Text className="text-base font-semibold text-error">Report post</Text>
            </Pressable>
            <Pressable
              className="mt-2 py-3 rounded-full bg-surface-container-high items-center"
              onPress={() => setIsMenuOpen(false)}
            >
              <Text className="font-semibold text-on-surface">Cancel</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
