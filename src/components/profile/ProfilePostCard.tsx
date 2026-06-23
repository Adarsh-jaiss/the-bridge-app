import { useMutation } from "@tanstack/react-query";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Bookmark, CircleCheck, Ellipsis, Flag, Heart, MessageCircle, Repeat2, Share2, Trash2 } from "lucide-react-native";
import { cssInterop } from "nativewind";
import { useMemo, useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { deletePost, removeBookmark, removeRepost, toggleBookmark, togglePostLike, toggleRepost, votePollOption } from "../../lib/api/posts";
import { getFallbackAvatarUrl } from "../../lib/avatar-fallback";

cssInterop(Image, { className: "style" });

const LOVE_COLOR = "#e0245e";
const MUTED_ICON_COLOR = "#727687";
const PRIMARY_COLOR = "#0050cb";
const CONTENT_PREVIEW_WORDS = 36;

function truncateByWordCount(content: string, maxWords: number) {
  const words = content.trim().split(/\s+/);
  if (words.length <= maxWords) return { text: content, isTruncated: false };
  return { text: `${words.slice(0, maxWords).join(" ")}...`, isTruncated: true };
}

export interface ProfilePollOption {
  id?: number;
  option_id?: number;
  name?: string;
  option_text?: string;
  text?: string;
  position?: number;
  votes_count?: number;
  vote_count?: number;
}

export interface ProfilePostProps {
  id: string;
  authorName: string;
  authorProfilePicture?: string;
  authorPublicId?: string;
  timeAgo: string;
  content: string;
  postType?: string;
  pollOptions?: ProfilePollOption[];
  hasVoted?: boolean;
  userVotedOptionId?: number | null;
  imageUrl?: string | null;
  commentsCount: number;
  repostsCount: number;
  likesCount: number;
  isLiked?: boolean;
  isReposted?: boolean;
  bookmarksCount?: number;
  isBookmarked?: boolean;
}

export function ProfilePostCard({
  post,
  showDeleteAction = false,
  showReportAction = true,
  onPostStateChange,
  onDeleteSuccess,
}: {
  post: ProfilePostProps;
  showDeleteAction?: boolean;
  showReportAction?: boolean;
  onPostStateChange?: () => void;
  onDeleteSuccess?: (postId: string) => void;
}) {
  const router = useRouter();
  const isPollPost = post.postType?.toLowerCase() === "poll";
  const numericPostId = Number(post.id);
  const openPostDetails = () => {
    if (!Number.isFinite(numericPostId) || numericPostId <= 0) return;
    router.push(`/post/${post.id}` as any);
  };
  const fallbackAvatar = getFallbackAvatarUrl(post.authorPublicId || post.id);
  const hasImageAttachment =
    typeof post.imageUrl === "string" &&
    post.imageUrl.trim().length > 0 &&
    /^https?:\/\//i.test(post.imageUrl.trim());
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLiked, setIsLiked] = useState(Boolean(post.isLiked));
  const [likedCount, setLikedCount] = useState(post.likesCount || 0);
  const [isBookmarked, setIsBookmarked] = useState(Boolean(post.isBookmarked));
  const [bookmarksCount, setBookmarksCount] = useState(post.bookmarksCount || 0);
  const [isReposted, setIsReposted] = useState(Boolean(post.isReposted));
  const [repostsCount, setRepostsCount] = useState(post.repostsCount || 0);
  const [selectedPollOptionId, setSelectedPollOptionId] = useState<number | null>(
    post.userVotedOptionId ?? null
  );
  const [pollResults, setPollResults] = useState<Record<number, number>>(() =>
    (post.pollOptions || []).reduce<Record<number, number>>((acc, option) => {
      const optionId = option.option_id ?? option.id;
      if (optionId !== undefined) {
        acc[optionId] = option.votes_count ?? option.vote_count ?? 0;
      }
      return acc;
    }, {})
  );
  const [hasPollResults, setHasPollResults] = useState(Boolean(post.hasVoted));

  const totalVotes = useMemo(
    () => Object.values(pollResults).reduce((sum, count) => sum + count, 0),
    [pollResults]
  );

  const voteMutation = useMutation({
    mutationFn: (pollOptionId: number) => votePollOption(pollOptionId),
    onSuccess: (response, pollOptionId) => {
      setSelectedPollOptionId(pollOptionId);
      setHasPollResults(true);
      const mappedResults = response.poll_options_result.reduce<Record<number, number>>(
        (acc, option) => {
          acc[option.option_id] = option.votes_count;
          return acc;
        },
        {}
      );
      setPollResults(mappedResults);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const numericPostId = Number(post.id);
      if (!Number.isFinite(numericPostId) || numericPostId <= 0) {
        throw new Error("Invalid post id");
      }
      await deletePost(numericPostId);
    },
    onSuccess: () => {
      setIsMenuOpen(false);
      onDeleteSuccess?.(post.id);
    },
  });

  const likeMutation = useMutation({
    mutationFn: async () => {
      const numericPostId = Number(post.id);
      if (!Number.isFinite(numericPostId) || numericPostId <= 0) {
        throw new Error("Invalid post id");
      }
      await togglePostLike(numericPostId);
    },
    onSuccess: () => {
      setIsLiked((prev) => {
        const next = !prev;
        setLikedCount((current) => (next ? current + 1 : Math.max(current - 1, 0)));
        return next;
      });
      onPostStateChange?.();
    },
  });

  const bookmarkMutation = useMutation({
    mutationFn: async () => {
      const numericPostId = Number(post.id);
      if (!Number.isFinite(numericPostId) || numericPostId <= 0) {
        throw new Error("Invalid post id");
      }
      if (isBookmarked) {
        await removeBookmark(numericPostId);
      } else {
        await toggleBookmark(numericPostId);
      }
    },
    onSuccess: () => {
      setIsBookmarked((prev) => {
        const next = !prev;
        setBookmarksCount((count) => (next ? count + 1 : Math.max(count - 1, 0)));
        return next;
      });
      onPostStateChange?.();
    },
  });

  const repostMutation = useMutation({
    mutationFn: async () => {
      const numericPostId = Number(post.id);
      if (!Number.isFinite(numericPostId) || numericPostId <= 0) {
        throw new Error("Invalid post id");
      }
      if (isReposted) {
        await removeRepost(numericPostId);
      } else {
        await toggleRepost(numericPostId);
      }
    },
    onSuccess: () => {
      setIsReposted((prev) => {
        const next = !prev;
        setRepostsCount((count) => (next ? count + 1 : Math.max(count - 1, 0)));
        return next;
      });
      onPostStateChange?.();
    },
  });

  const fullContent = post.content?.trim() || "";
  const contentPreview = truncateByWordCount(fullContent, CONTENT_PREVIEW_WORDS);

  return (
    <View className="bg-surface border-b border-surface-container-high overflow-hidden relative">
      <Pressable className="px-4 pt-4 active:opacity-95" onPress={openPostDetails}>
        <View className="flex-row">
          {/* Avatar gutter */}
          <View className="w-10 items-center mr-3">
            <Pressable
              onPress={(event) => {
                event.stopPropagation();
                if (post.authorPublicId) router.push(`/user/${post.authorPublicId}` as any);
              }}
              disabled={!post.authorPublicId}
              className="active:opacity-80"
            >
              <Image
                source={{ uri: post.authorProfilePicture || fallbackAvatar }}
                className="w-10 h-10 rounded-full bg-surface-container-high"
              />
            </Pressable>
          </View>

          {/* Right column */}
          <View className="flex-1">
            {/* Header */}
            <View className="flex-row items-start justify-between">
              <View className="flex-1 pr-2">
                <Text className="font-bold text-[15px] text-on-surface" numberOfLines={1}>
                  {post.authorName}
                </Text>
                <Text className="text-xs text-outline font-medium mt-0.5">{post.timeAgo}</Text>
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

            {/* Image */}
            {hasImageAttachment && (
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

            {isPollPost && post.pollOptions && post.pollOptions.length > 0 && (
              <View className="mt-3 gap-2">
            {post.pollOptions.map((option, index) => {
              const optionId = option.option_id ?? option.id;
              const label = option.name || option.option_text || option.text || `Option ${index + 1}`;
              const fallbackVotes = option.votes_count ?? option.vote_count ?? 0;
              const votes = optionId !== undefined ? pollResults[optionId] ?? fallbackVotes : fallbackVotes;
              const percentage = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
              const isSelected = optionId !== undefined && selectedPollOptionId === optionId;
              const canVote = !hasPollResults && optionId !== undefined && !voteMutation.isPending;

              return (
                <View
                  key={`${post.id}-poll-${optionId ?? index}`}
                  className="rounded-xl overflow-hidden border border-surface-container-high"
                >
                  {hasPollResults && (
                    <View
                      className={`absolute left-0 top-0 bottom-0 ${
                        isSelected ? "bg-primary/25" : "bg-surface-container-low"
                      }`}
                      style={{ width: `${Math.max(percentage, 6)}%` }}
                    />
                  )}
                  <Pressable
                    disabled={!canVote}
                    onPress={(event) => {
                      event.stopPropagation();
                      if (optionId !== undefined) {
                        voteMutation.mutate(optionId);
                      }
                    }}
                    className={`px-3 py-2 ${
                      canVote ? "bg-surface-container-low active:opacity-80" : "bg-transparent"
                    }`}
                  >
                    <View className="flex-row items-center justify-between">
                      <Text className="text-sm font-medium text-on-surface flex-1 pr-3">
                        {label}
                      </Text>
                      {hasPollResults ? (
                        <Text className="text-xs font-semibold text-on-surface-variant">
                          {percentage}% ({votes.toLocaleString()})
                        </Text>
                      ) : isSelected ? (
                        <CircleCheck size={18} color={PRIMARY_COLOR} />
                      ) : null}
                    </View>
                  </Pressable>
                </View>
              );
            })}
            {voteMutation.isError && (
              <Text className="text-xs text-red-600 mt-1">
                Failed to submit vote. Please try again.
              </Text>
            )}
              </View>
            )}
          </View>
        </View>
      </Pressable>

      {/* Actions */}
      <View className="flex-row px-4 pb-3 pt-2">
        <View className="w-10 mr-3" />
        <View className="flex-1 flex-row items-center justify-between">
          <Pressable className="flex-row items-center active:opacity-50" onPress={openPostDetails}>
            <MessageCircle size={18} color={MUTED_ICON_COLOR} />
            <Text className="text-xs font-medium text-on-surface-variant ml-1.5">
              {post.commentsCount?.toLocaleString()}
            </Text>
          </Pressable>

          <Pressable
            className="flex-row items-center active:opacity-50"
            onPress={() => repostMutation.mutate()}
            disabled={repostMutation.isPending}
          >
            <Repeat2 size={19} color={isReposted ? PRIMARY_COLOR : MUTED_ICON_COLOR} />
            <Text className={`text-xs font-medium ml-1.5 ${isReposted ? "text-primary" : "text-on-surface-variant"}`}>
              {repostsCount.toLocaleString()}
            </Text>
          </Pressable>

          <Pressable
            className="flex-row items-center active:opacity-50"
            onPress={() => likeMutation.mutate()}
            disabled={likeMutation.isPending}
          >
            <Heart size={18} color={isLiked ? LOVE_COLOR : MUTED_ICON_COLOR} fill={isLiked ? LOVE_COLOR : "transparent"} />
            <Text className={`text-xs font-medium ml-1.5 ${isLiked ? "text-[#e0245e]" : "text-on-surface-variant"}`}>
              {likedCount.toLocaleString()}
            </Text>
          </Pressable>

          <Pressable
            className="flex-row items-center active:opacity-50"
            onPress={() => bookmarkMutation.mutate()}
            disabled={bookmarkMutation.isPending}
          >
            <Bookmark size={18} color={isBookmarked ? PRIMARY_COLOR : MUTED_ICON_COLOR} fill={isBookmarked ? PRIMARY_COLOR : "transparent"} />
            <Text className={`text-xs font-medium ml-1.5 ${isBookmarked ? "text-primary" : "text-on-surface-variant"}`}>
              {bookmarksCount.toLocaleString()}
            </Text>
          </Pressable>

          <Pressable className="flex-row items-center active:opacity-50">
            <Share2 size={18} color={MUTED_ICON_COLOR} />
          </Pressable>
        </View>
      </View>
      {(likeMutation.isError || bookmarkMutation.isError || repostMutation.isError) && (
        <Text className="text-xs text-red-600 px-4 pb-2">
          Failed to update. Please try again.
        </Text>
      )}

      <Modal
        visible={isMenuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsMenuOpen(false)}
      >
        <Pressable className="flex-1 bg-black/40 justify-end" onPress={() => setIsMenuOpen(false)}>
          <View className="bg-surface rounded-t-3xl p-5 border-t border-surface-container-high">
            {showDeleteAction && (
              <Pressable
                className="flex-row items-center gap-3 px-2 py-3 active:opacity-70"
                onPress={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
              >
                <Trash2 size={20} color="#ba1a1a" />
                <Text className="text-base font-semibold text-error">
                  {deleteMutation.isPending ? "Deleting..." : "Delete post"}
                </Text>
              </Pressable>
            )}
            {showReportAction && (
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
            )}
            <Pressable className="mt-2 py-3 rounded-full bg-surface-container-high items-center" onPress={() => setIsMenuOpen(false)}>
              <Text className="font-semibold text-on-surface">Cancel</Text>
            </Pressable>
            {deleteMutation.isError && (
              <Text className="text-xs text-red-600 mt-2 text-center">
                Failed to delete post. Please try again.
              </Text>
            )}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
