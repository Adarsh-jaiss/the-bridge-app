import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { cssInterop } from "nativewind";
import React, { useMemo, useState } from "react";
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CommentComposer, MentionCandidate } from "../../components/comments/CommentComposer";
import { MentionText } from "../../components/common/MentionText";
import { TransientSnackbar } from "../../components/common/TransientSnackbar";
import { queryClient } from "../../lib/api/client";
import { PostComment, getCommentReplies } from "../../lib/api/posts";
import { getFallbackAvatarUrl } from "../../lib/avatar-fallback";

cssInterop(Image, { className: "style" });

const PRIMARY_COLOR = "#0050cb";

const formatTimestamp = (dateString: string) => {
  const date = new Date(dateString);
  const time = date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const day = date.toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });
  return `${time} · ${day}`;
};

const displayName = (c: Pick<PostComment, "first_name" | "last_name">) =>
  `${c.first_name || ""} ${c.last_name || ""}`.trim() || "User";

function ReplyItem({
  reply,
  onPressUser,
}: {
  reply: PostComment;
  onPressUser: (comment: PostComment) => void;
}) {
  const fallbackAvatar = getFallbackAvatarUrl(reply.public_id || String(reply.id));
  const relativeTime = (() => {
    const diffMin = Math.floor((Date.now() - new Date(reply.created_at).getTime()) / 60000);
    if (diffMin < 1) return "now";
    if (diffMin < 60) return `${diffMin}m`;
    if (diffMin < 1440) return `${Math.floor(diffMin / 60)}h`;
    return `${Math.floor(diffMin / 1440)}d`;
  })();

  return (
    <View className="px-4 py-3 border-b border-surface-container-low">
      <View className="flex-row gap-3">
        <Pressable onPress={() => onPressUser(reply)} className="active:opacity-70">
          <Image
            source={{ uri: reply.profile_picture || fallbackAvatar }}
            className="w-9 h-9 rounded-full bg-surface-container-high"
          />
        </Pressable>
        <View className="flex-1">
          <View className="flex-row items-center gap-1.5 flex-wrap">
            <Pressable onPress={() => onPressUser(reply)} className="active:opacity-70 shrink">
              <Text className="text-[14px] font-semibold text-on-surface" numberOfLines={1}>
                {displayName(reply)}
              </Text>
            </Pressable>
            {!!reply.username && (
              <Text className="text-[13px] text-outline" numberOfLines={1}>
                @{reply.username}
              </Text>
            )}
            <Text className="text-[13px] text-outline">· {relativeTime}</Text>
          </View>
          <MentionText
            content={reply.content}
            className="text-[14px] text-on-surface mt-0.5 leading-5"
            onPressUser={(publicId) => onPressUser({ ...reply, public_id: publicId })}
          />
        </View>
      </View>
    </View>
  );
}

export default function CommentThreadScreen() {
  const router = useRouter();
  const { id, postId } = useLocalSearchParams<{ id: string; postId: string }>();
  const commentId = Number(id);
  const numericPostId = Number(postId);

  const focalComment = queryClient.getQueryData<PostComment>(["comment", commentId]);

  const [replies, setReplies] = useState<PostComment[]>(focalComment?.child_comments || []);
  const [nextCursor, setNextCursor] = useState<number>(focalComment?.next_child_cursor || 0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const focalName = focalComment ? displayName(focalComment) : "this comment";

  const postAuthor = queryClient.getQueryData<MentionCandidate>(["postAuthor", numericPostId]);

  const mentionCandidates = useMemo<MentionCandidate[]>(() => {
    const candidates = new Map<string, MentionCandidate>();
    if (postAuthor?.publicId) candidates.set(postAuthor.publicId, postAuthor);
    const add = (c?: PostComment) => {
      const publicId = c?.public_id?.trim();
      if (!c || !publicId) return;
      candidates.set(publicId, {
        publicId,
        firstName: c.first_name || "",
        lastName: c.last_name || "",
        fullName: displayName(c),
        profilePicture: c.profile_picture || undefined,
      });
    };
    add(focalComment);
    replies.forEach(add);
    return Array.from(candidates.values());
  }, [focalComment, replies, postAuthor]);

  const openUserProfile = (comment: PostComment) => {
    if (comment.public_id) {
      router.push(`/user/${comment.public_id}` as any);
      return;
    }
    const isSelf = comment.id < 0 || (comment.first_name || "").toLowerCase() === "you";
    if (isSelf) router.push("/home/profile");
  };

  const handleLoadMore = async () => {
    if (!nextCursor || nextCursor <= 0 || loadingMore) return;
    setLoadingMore(true);
    try {
      const response = await getCommentReplies(commentId, nextCursor);
      setReplies((prev) => {
        const merged = [...prev, ...(response.replies || [])];
        return Array.from(new Map(merged.map((r) => [r.id, r])).values());
      });
      setNextCursor(response.next_cursor ?? 0);
    } finally {
      setLoadingMore(false);
    }
  };

  const handlePosted = ({ content }: { content: string; parentCommentId: number | null }) => {
    const localReply: PostComment = {
      id: -Date.now(),
      content,
      first_name: "You",
      last_name: "",
      created_at: new Date().toISOString(),
      child_comments: [],
      next_child_cursor: 0,
    };
    setReplies((prev) => [localReply, ...prev]);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 1400);
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
          <Text className="text-[17px] font-bold text-on-surface">Thread</Text>
        </View>

        <FlatList
          data={replies}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ paddingBottom: 24 }}
          renderItem={({ item }) => <ReplyItem reply={item} onPressUser={openUserProfile} />}
          ListHeaderComponent={
            <View className="px-4 pt-4 pb-3 border-b border-surface-container-high">
              {focalComment ? (
                <>
                  <View className="flex-row items-center gap-3">
                    <Pressable onPress={() => openUserProfile(focalComment)} className="active:opacity-70">
                      <Image
                        source={{
                          uri:
                            focalComment.profile_picture ||
                            getFallbackAvatarUrl(focalComment.public_id || String(focalComment.id)),
                        }}
                        className="w-11 h-11 rounded-full bg-surface-container-high"
                      />
                    </Pressable>
                    <View className="flex-1">
                      <Pressable onPress={() => openUserProfile(focalComment)} className="active:opacity-70 self-start">
                        <Text className="text-[15px] font-bold text-on-surface" numberOfLines={1}>
                          {focalName}
                        </Text>
                      </Pressable>
                      {!!focalComment.username && (
                        <Text className="text-[13px] text-outline" numberOfLines={1}>
                          @{focalComment.username}
                        </Text>
                      )}
                    </View>
                  </View>

                  <MentionText
                    content={focalComment.content}
                    className="mt-3 text-[16px] leading-6 text-on-surface"
                    onPressUser={(publicId) => openUserProfile({ ...focalComment, public_id: publicId })}
                  />

                  <Text className="text-[13px] text-outline mt-3">
                    {formatTimestamp(focalComment.created_at)}
                  </Text>
                </>
              ) : (
                <Text className="text-[15px] font-bold text-on-surface">Replies</Text>
              )}

              <Text className="text-[13px] text-on-surface-variant mt-3 pt-3 border-t border-surface-container-high">
                {replies.length > 0
                  ? `${replies.length}${nextCursor > 0 ? "+" : ""} ${replies.length === 1 && nextCursor <= 0 ? "reply" : "replies"}`
                  : "No replies yet"}
              </Text>
            </View>
          }
          ListFooterComponent={
            nextCursor > 0 ? (
              <Pressable
                onPress={handleLoadMore}
                disabled={loadingMore}
                className="px-4 py-3 active:opacity-70 flex-row items-center gap-2"
              >
                {loadingMore && <ActivityIndicator size="small" color={PRIMARY_COLOR} />}
                <Text className="text-[13px] font-medium text-primary">
                  {loadingMore ? "Loading replies..." : "Show more replies"}
                </Text>
              </Pressable>
            ) : null
          }
          ListEmptyComponent={
            <View className="px-4 py-8 items-center">
              <Text className="text-sm text-on-surface-variant">Be the first to reply.</Text>
            </View>
          }
        />

        <CommentComposer
          postId={numericPostId}
          mentionCandidates={mentionCandidates}
          replyTarget={{ commentId, name: focalName }}
          placeholder="Post your reply..."
          onPosted={handlePosted}
        />
        <TransientSnackbar visible={showToast} message="Reply posted" />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
