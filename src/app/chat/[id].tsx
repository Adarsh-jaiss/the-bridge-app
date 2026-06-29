import { Stack, useLocalSearchParams } from "expo-router";
import { ChatScreen } from "../../features/chat/screens/chat-screen";

export default function ChatScreenRoute() {
    const { id, name, avatar } = useLocalSearchParams();

    // Fallbacks if not provided in router query params
    const otherUserId = parseInt(id as string, 10);
    const otherUserName = (name as string) || "User";
    const otherUserAvatar = avatar as string | undefined;

    if (isNaN(otherUserId)) {
        return null; // Or some error state
    }

    return (
        <>
            <Stack.Screen options={{ headerShown: false }} />
            <ChatScreen
                otherUserId={otherUserId}
                otherUserName={otherUserName}
                otherUserAvatar={otherUserAvatar}
            />
        </>
    );
}
