import { useMutation } from "@tanstack/react-query";
import { Image } from "expo-image";
import { Ellipsis, MessageCircle, Trash2 } from "lucide-react-native";
import { cssInterop } from "nativewind";
import React, { useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { PostComment, deleteComment } from "../../lib/api/posts";
import { getFallbackAvatarUrl } from "../../lib/avatar-fallback";
import { MentionText } from "../common/MentionText";

cssInterop(Image, { className: "style" });

const MUTED_COLOR = "#727687";

function formatDate(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
  if (diffMinutes < 1) return "now";
  if (diffMinutes < 60) return `${diffMinutes}m`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h`;
  return `${Math.floor(diffHours / 24)}d`;
}

export function CommentRow({
  comment,
  postId,
  onPress,
  onPressUser,
  onDeleteSuccess,
}: {
  comment: PostComment;
  postId: number;
  onPress: () => void;
  onPressUser: (comment: PostComment) => void;
  onDeleteSuccess?: (commentId: number) => void;
}) {
  const name = `${comment.first_name || ""} ${comment.last_name || ""}`.trim() || "User";
  const fallbackAvatar = getFallbackAvatarUrl(comment.public_id || String(comment.id));
  const replyCount = comment.child_comments?.length || 0;
  const hasMore = (comment.next_child_cursor || 0) > 0;

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const deleteMutation = useMutation({
    mutationFn: async () => {
      await deleteComment(postId, comment.id);
    },
    onSuccess: () => {
      setIsMenuOpen(false);
      onDeleteSuccess?.(comment.id);
    },
  });

  return (
    <Pressable
      onPress={onPress}
      className="px-4 py-3 border-b border-surface-container-low active:bg-surface-container-low"
    >
      <View className="flex-row gap-3">
        <Pressable
          onPress={(event) => {
            event.stopPropagation();
            onPressUser(comment);
          }}
          className="active:opacity-70"
        >
          <Image
            source={{ uri: comment.profile_picture || fallbackAvatar }}
            className="w-10 h-10 rounded-full bg-surface-container-high"
          />
        </Pressable>
        <View className="flex-1">
          <View className="flex-row items-start justify-between">
            <View className="flex-row items-center gap-1.5 flex-wrap flex-1 pr-2">
              <Pressable
                onPress={(event) => {
                  event.stopPropagation();
                  onPressUser(comment);
                }}
                className="active:opacity-70 shrink"
              >
                <Text className="text-[14px] font-semibold text-on-surface" numberOfLines={1}>
                  {name}
                </Text>
              </Pressable>
              {!!comment.username && (
                <Text className="text-[13px] text-outline" numberOfLines={1}>
                  @{comment.username}
                </Text>
              )}
              <Text className="text-[13px] text-outline">· {formatDate(comment.created_at)}</Text>
            </View>
            <Pressable
              className="-mr-1 -mt-1 p-1 active:opacity-50"
              onPress={(event) => {
                event.stopPropagation();
                setIsMenuOpen(true);
              }}
            >
              <Ellipsis size={20} color={MUTED_COLOR} />
            </Pressable>
          </View>
          <MentionText
            content={comment.content}
            className="text-[14px] text-on-surface mt-0.5 leading-5"
            onPressUser={(publicId) => onPressUser({ ...comment, public_id: publicId })}
          />
          <View className="flex-row items-center gap-1.5 mt-2">
            <MessageCircle size={15} color={MUTED_COLOR} />
            <Text className="text-[12px] text-outline">
              {replyCount > 0
                ? `View ${replyCount}${hasMore ? "+" : ""} ${replyCount === 1 && !hasMore ? "reply" : "replies"}`
                : "Reply"}
            </Text>
          </View>
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
              onPress={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              <Trash2 size={20} color="#ba1a1a" />
              <Text className="text-base font-semibold text-error">
                {deleteMutation.isPending ? "Deleting..." : "Delete comment"}
              </Text>
            </Pressable>
            <Pressable
              className="mt-2 py-3 rounded-full bg-surface-container-high items-center"
              onPress={() => setIsMenuOpen(false)}
            >
              <Text className="font-semibold text-on-surface">Cancel</Text>
            </Pressable>
            {deleteMutation.isError && (
              <Text className="text-xs text-red-600 mt-2 text-center">
                Failed to delete comment. Please try again.
              </Text>
            )}
          </View>
        </Pressable>
      </Modal>
    </Pressable>
  );
}
