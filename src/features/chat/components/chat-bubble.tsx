import React from "react";
import { Pressable, View, Text } from "react-native";
import { CheckCheck } from "lucide-react-native";

interface ChatBubbleProps {
    message: string;
    timestamp: string;
    isSent: boolean;
    isRead?: boolean;
    onLongPress?: () => void;
}

export const ChatBubble = ({ message, timestamp, isSent, isRead = false, onLongPress }: ChatBubbleProps) => {
    if (isSent) {
        return (
            <Pressable
                onLongPress={onLongPress}
                disabled={!onLongPress}
                delayLongPress={300}
                className="flex-col items-end self-end max-w-[82%] active:opacity-80"
            >
                <View className="px-4 py-2.5 rounded-2xl rounded-br-md bg-primary shadow-sm">
                    <Text className="text-[15px] leading-6 text-on-primary">
                        {message}
                    </Text>
                </View>
                <View className="flex-row items-center gap-1 mt-1 pr-1">
                    <Text className="text-[10px] text-on-surface-variant">
                        {timestamp}
                    </Text>
                    {isRead ? (
                        <CheckCheck size={13} color="#0050cb" />
                    ) : (
                        <CheckCheck size={13} color="#727687" />
                    )}
                </View>
            </Pressable>
        );
    }

    return (
        <View className="flex-col items-start max-w-[82%]">
            <View className="px-4 py-2.5 rounded-2xl rounded-bl-md bg-surface-container-high shadow-sm">
                <Text className="text-[15px] leading-6 text-on-surface">
                    {message}
                </Text>
            </View>
            <Text className="text-[10px] mt-1 pl-1 text-on-surface-variant">
                {timestamp}
            </Text>
        </View>
    );
};
