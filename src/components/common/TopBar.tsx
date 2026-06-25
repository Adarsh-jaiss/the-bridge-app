import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { getUnreadNotificationsCount } from "../../lib/api/notifications";

export function TopBar() {
  const router = useRouter();
  const { data } = useQuery({
    queryKey: ["unreadNotificationsCount"],
    queryFn: getUnreadNotificationsCount,
  });
  const unreadCount = data?.count || 0;

  return (
    <View className="w-full bg-surface px-4 py-2 border-b border-surface-container-high">
      <View className="flex-row items-center justify-between py-2">
        <View className="flex-row items-center gap-2">
          <Text className="font-['Inter'] font-bold text-xl tracking-tight text-on-surface">
            The Bridge
          </Text>
        </View>
        <View className="flex-row items-center gap-1">
          <Pressable
            className="p-2 rounded-full active:bg-surface-container-low transition-colors relative"
            onPress={() => router.push("/home/notifications")}
          >
            <MaterialIcons name={unreadCount > 0 ? "notifications" : "notifications-none"} size={24} color="#0050cb" />
            {unreadCount > 0 && (
              <View className="absolute top-1 right-1.5 min-w-[16px] h-[16px] px-1 rounded-full bg-red-500 items-center justify-center border border-surface">
                <Text className="text-[9px] font-bold text-white leading-none">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            )}
          </Pressable>
          <Pressable className="p-2 rounded-full active:bg-surface-container-low transition-colors">
            <MaterialIcons name="send" size={24} color="#0050cb" className="" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}
