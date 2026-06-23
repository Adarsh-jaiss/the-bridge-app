import { Image } from "expo-image";
import { MessageCircle } from "lucide-react-native";
import { cssInterop } from "nativewind";
import React from "react";
import { Pressable, Text, View } from "react-native";
import { PostComment } from "../../lib/api/posts";
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
  onPress,
  onPressUser,
}: {
  comment: PostComment;
  onPress: () => void;
  onPressUser: (comment: PostComment) => void;
}) {
  const name = `${comment.first_name || ""} ${comment.last_name || ""}`.trim() || "User";
  const fallbackAvatar = getFallbackAvatarUrl(comment.public_id || String(comment.id));
  const replyCount = comment.child_comments?.length || 0;
  const hasMore = (comment.next_child_cursor || 0) > 0;

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
          <View className="flex-row items-center gap-1.5 flex-wrap">
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
    </Pressable>
  );
}
