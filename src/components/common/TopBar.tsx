import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";

export function TopBar() {
  const router = useRouter();

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
            className="p-2 rounded-full active:bg-surface-container-low transition-colors"
            onPress={() => router.push("/home/notifications")}
          >
            <MaterialIcons name="notifications-none" size={24} color="#0050cb" className="" />
          </Pressable>
          <Pressable className="p-2 rounded-full active:bg-surface-container-low transition-colors">
            <MaterialIcons name="send" size={24} color="#0050cb" className="" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}
