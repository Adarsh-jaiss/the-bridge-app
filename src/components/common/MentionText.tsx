import React from "react";
import { Text } from "react-native";

// Matches markdown-style mentions stored in comment/post text, e.g.
// "[@Jane Doe](user:7a1b-...)" — see "Mentions and profile links.md".
const MENTION_REGEX = /\[@([^\]]+)\]\(user:([^)]+)\)/g;

type Segment =
  | { type: "text"; value: string }
  | { type: "mention"; value: string; publicId: string };

export function MentionText({
  content,
  className,
  numberOfLines,
  onPressUser,
}: {
  content: string;
  className: string;
  numberOfLines?: number;
  onPressUser?: (publicId: string) => void;
}) {
  const segments: Segment[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;

  MENTION_REGEX.lastIndex = 0;
  while ((match = MENTION_REGEX.exec(content)) !== null) {
    const [fullMatch, name, publicId] = match;
    if (match.index > cursor) {
      segments.push({ type: "text", value: content.slice(cursor, match.index) });
    }
    segments.push({ type: "mention", value: `@${name}`, publicId });
    cursor = match.index + fullMatch.length;
  }
  if (cursor < content.length) {
    segments.push({ type: "text", value: content.slice(cursor) });
  }
  if (segments.length === 0) {
    segments.push({ type: "text", value: content });
  }

  return (
    <Text className={className} numberOfLines={numberOfLines}>
      {segments.map((segment, index) =>
        segment.type === "text" ? (
          <React.Fragment key={`text-${index}`}>{segment.value}</React.Fragment>
        ) : (
          <Text
            key={`mention-${segment.publicId}-${index}`}
            className="text-primary"
            onPress={onPressUser ? () => onPressUser(segment.publicId) : undefined}
          >
            {segment.value}
          </Text>
        )
      )}
    </Text>
  );
}
