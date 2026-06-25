import { useMutation } from "@tanstack/react-query";
import { Image } from "expo-image";
import { cssInterop } from "nativewind";
import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Keyboard,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { queryClient } from "../../lib/api/client";
import { addComment } from "../../lib/api/posts";
import { getFallbackAvatarUrl } from "../../lib/avatar-fallback";

cssInterop(Image, { className: "style" });

export interface MentionCandidate {
  publicId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  profilePicture?: string;
}

// A mention the user has inserted: shown in the input as the plain display
// string ("@Jane Doe") and only serialized to markdown ("[@Jane Doe](user:id)")
// when the comment is submitted.
interface ActiveMention {
  display: string;
  publicId: string;
}

function tokenizeMentions(text: string, mentions: ActiveMention[]) {
  const displays = Array.from(new Set(mentions.map((m) => m.display)))
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);
  if (displays.length === 0) return [{ text, isMention: false }];

  const escaped = displays.map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const re = new RegExp(`(${escaped.join("|")})`, "g");
  const tokens: { text: string; isMention: boolean }[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) tokens.push({ text: text.slice(last, match.index), isMention: false });
    tokens.push({ text: match[0], isMention: true });
    last = match.index + match[0].length;
  }
  if (last < text.length) tokens.push({ text: text.slice(last), isMention: false });
  return tokens.length ? tokens : [{ text, isMention: false }];
}

function toStorageText(text: string, mentions: ActiveMention[]) {
  const byDisplay = new Map(mentions.map((m) => [m.display, m.publicId]));
  return tokenizeMentions(text, mentions)
    .map((token) =>
      token.isMention && byDisplay.has(token.text)
        ? `[${token.text}](user:${byDisplay.get(token.text)})`
        : token.text
    )
    .join("");
}

export interface CommentComposerHandle {
  focus: () => void;
}

export interface ReplyTarget {
  commentId: number;
  name: string;
}

interface CommentComposerProps {
  postId: number;
  mentionCandidates: MentionCandidate[];
  /** When set, the comment is posted as a reply to this comment. */
  replyTarget?: ReplyTarget | null;
  onClearReplyTarget?: () => void;
  placeholder?: string;
  /** Fired after a successful post so the screen can update its local list. */
  onPosted: (info: { content: string; parentCommentId: number | null }) => void;
}

export const CommentComposer = forwardRef<CommentComposerHandle, CommentComposerProps>(
  function CommentComposer(
    { postId, mentionCandidates, replyTarget, onClearReplyTarget, placeholder, onPosted },
    ref
  ) {
    const insets = useSafeAreaInsets();
    const inputRef = useRef<TextInput>(null);
    const [commentText, setCommentText] = useState("");
    const [composerSelection, setComposerSelection] = useState({ start: 0, end: 0 });
    const [activeMentions, setActiveMentions] = useState<ActiveMention[]>([]);
    const [keyboardHeight, setKeyboardHeight] = useState(0);

    useImperativeHandle(ref, () => ({ focus: () => inputRef.current?.focus() }));

    useEffect(() => {
      if (Platform.OS !== "android") return;
      const showSub = Keyboard.addListener("keyboardDidShow", (event) => {
        setKeyboardHeight(event.endCoordinates.height || 0);
      });
      const hideSub = Keyboard.addListener("keyboardDidHide", () => setKeyboardHeight(0));
      return () => {
        showSub.remove();
        hideSub.remove();
      };
    }, []);

    const mutation = useMutation({
      mutationFn: async () => {
        if (!commentText.trim()) throw new Error("Please enter a comment.");
        const storageText = toStorageText(commentText, activeMentions).trim();
        await addComment(postId, {
          comment: storageText,
          ...(replyTarget ? { parent_comment_id: replyTarget.commentId } : {}),
        });
        return storageText;
      },
      onSuccess: (storageText) => {
        queryClient.setQueryData(["feed"], (oldData: any) => {
          if (!oldData?.pages) return oldData;
          return {
            ...oldData,
            pages: oldData.pages.map((page: any) => ({
              ...page,
              posts: (page.posts || []).map((feedPost: any) =>
                Number(feedPost?.id) === postId
                  ? { ...feedPost, comments_count: (feedPost.comments_count || 0) + 1 }
                  : feedPost
              ),
            })),
          };
        });
        onPosted({ content: storageText, parentCommentId: replyTarget?.commentId ?? null });
        setCommentText("");
        setActiveMentions([]);
        setComposerSelection({ start: 0, end: 0 });
        onClearReplyTarget?.();
      },
    });

    const canSubmit = commentText.trim().length > 0 && !mutation.isPending;

    const mentionContext = useMemo(() => {
      const cursor = composerSelection.start;
      const textBeforeCursor = commentText.slice(0, cursor);
      const mentionMatch = /(^|\s)@([a-zA-Z0-9._-]*)$/.exec(textBeforeCursor);
      if (!mentionMatch) return null;
      const query = mentionMatch[2] || "";
      const mentionStartIndex = textBeforeCursor.length - query.length - 1;
      if (mentionStartIndex < 0) return null;
      return { query: query.toLowerCase(), mentionStartIndex, cursor };
    }, [commentText, composerSelection.start]);

    const visibleMentionCandidates = useMemo(() => {
      if (!mentionContext) return [];
      const query = mentionContext.query.trim();
      if (!query) return mentionCandidates.slice(0, 6);
      return mentionCandidates
        .filter((candidate) => candidate.fullName.toLowerCase().includes(query))
        .slice(0, 6);
    }, [mentionCandidates, mentionContext]);

    const handlePickMention = (candidate: MentionCandidate) => {
      if (!mentionContext) return;
      const beforeMention = commentText.slice(0, mentionContext.mentionStartIndex);
      const afterCursor = commentText.slice(mentionContext.cursor);
      const display = `@${candidate.fullName}`;
      // Insert the readable name (not the markdown) so the user sees a clean,
      // highlighted mention; the markdown is rebuilt on submit.
      const insertion = `${display} `;
      const nextCommentText = `${beforeMention}${insertion}${afterCursor}`;
      const nextCaret = beforeMention.length + insertion.length;
      setCommentText(nextCommentText);
      setActiveMentions((prev) => {
        if (prev.some((m) => m.display === display && m.publicId === candidate.publicId)) return prev;
        return [...prev, { display, publicId: candidate.publicId }];
      });
      setComposerSelection({ start: nextCaret, end: nextCaret });
      setTimeout(() => inputRef.current?.focus(), 0);
    };

    const inputSegments = useMemo(
      () => tokenizeMentions(commentText, activeMentions),
      [commentText, activeMentions]
    );

    return (
      <View
        className="border-t border-surface-container-high bg-surface px-3 pt-3"
        style={{
          paddingBottom:
            Math.max(insets.bottom, 10) + (Platform.OS === "android" ? keyboardHeight + 10 : 0),
        }}
      >
        {!!replyTarget && (
          <View className="flex-row items-center justify-between px-1 mb-2">
            <Text className="text-[12px] text-on-surface-variant">
              Replying to {replyTarget.name}
            </Text>
            {!!onClearReplyTarget && (
              <Pressable onPress={onClearReplyTarget} className="active:opacity-70">
                <Text className="text-[12px] font-medium text-primary">Cancel</Text>
              </Pressable>
            )}
          </View>
        )}
        <View className="flex-row items-end gap-2">
          {visibleMentionCandidates.length > 0 && (
            <View className="absolute left-0 right-0 bottom-16 rounded-xl border border-surface-container-high bg-surface overflow-hidden">
              {visibleMentionCandidates.map((candidate) => (
                <Pressable
                  key={candidate.publicId}
                  onPress={() => handlePickMention(candidate)}
                  className="px-3 py-2.5 border-b border-surface-container-low active:bg-surface-container-low flex-row items-center gap-2.5"
                >
                  <Image
                    source={{ uri: candidate.profilePicture || getFallbackAvatarUrl(candidate.publicId) }}
                    className="w-7 h-7 rounded-full bg-surface-container-high"
                  />
                  <View className="flex-1">
                    <Text className="text-[13px] font-semibold text-on-surface" numberOfLines={1}>
                      {candidate.fullName}
                    </Text>
                    <Text className="text-[11px] text-on-surface-variant" numberOfLines={1}>
                      @{candidate.firstName || "user"}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          )}
          <TextInput
            ref={inputRef}
            onChangeText={setCommentText}
            selection={composerSelection}
            onSelectionChange={(event) => setComposerSelection(event.nativeEvent.selection)}
            placeholder={placeholder || (replyTarget ? "Write a reply..." : "Add a comment...")}
            placeholderTextColor="#727687"
            multiline
            className="flex-1 max-h-32 min-h-14 px-4 py-3 rounded-3xl bg-surface-container-low text-on-surface text-[15px]"
          >
            {/* Render the text as styled segments so mentions appear highlighted
                (blue) by name, while the raw markdown stays hidden until submit.
                Only when there's text, so the placeholder still shows when empty. */}
            {commentText.length > 0 ? (
              <Text className="text-[15px] text-on-surface">
                {inputSegments.map((segment, index) =>
                  segment.isMention ? (
                    <Text key={`m-${index}`} className="text-primary font-medium">
                      {segment.text}
                    </Text>
                  ) : (
                    <Text key={`t-${index}`}>{segment.text}</Text>
                  )
                )}
              </Text>
            ) : null}
          </TextInput>
          <Pressable
            onPress={() => mutation.mutate()}
            disabled={!canSubmit}
            className={`h-12 px-4 rounded-3xl items-center justify-center ${
              canSubmit ? "bg-primary" : "bg-surface-container-high"
            }`}
          >
            {mutation.isPending ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text
                className={`font-semibold text-sm ${
                  canSubmit ? "text-white" : "text-on-surface-variant"
                }`}
              >
                {replyTarget ? "Reply" : "Post"}
              </Text>
            )}
          </Pressable>
        </View>
        {mutation.isError && (
          <Text className="text-xs text-red-600 mt-2 px-1">
            {(mutation.error as Error)?.message || "Failed to post. Please try again."}
          </Text>
        )}
      </View>
    );
  }
);
