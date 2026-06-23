import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, Text, View, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as SecureStore from "expo-secure-store";
import { queryClient } from "../../lib/api/client";

export default function AccountCenterScreen() {
  const router = useRouter();

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await SecureStore.deleteItemAsync("access_token");
          await SecureStore.deleteItemAsync("refresh_token");
          await queryClient.clear();
          router.replace("/auth/login");
        },
      },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={["top"]}>
      <View className="flex-row items-center justify-between px-6 py-4 border-b border-surface-container-high">
        <View className="flex-row items-center gap-3">
          <Pressable
            onPress={() => router.back()}
            className="p-2 -ml-2 rounded-full active:bg-surface-container-low"
          >
            <MaterialIcons name="arrow-back" size={24} color="#0050cb" />
          </Pressable>
          <Text className="text-lg font-bold text-on-surface">Account Center</Text>
        </View>
      </View>

      <View className="px-6 py-6">
        <View className="rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-5">
          <Text className="text-on-surface text-base font-bold mb-1">Account Center</Text>
          <Text className="text-on-surface-variant text-sm mb-4">
            Manage your profile and account preferences.
          </Text>

          <Pressable
            onPress={() => router.push("/profile/edit")}
            className="flex-row items-center justify-between rounded-xl px-4 py-3 bg-surface-container-low active:opacity-80"
          >
            <View className="flex-row items-center gap-3">
              <MaterialIcons name="person-outline" size={20} color="#0050cb" />
              <Text className="text-on-surface font-medium">Edit Profile</Text>
            </View>
            <MaterialIcons name="chevron-right" size={22} color="#727687" />
          </Pressable>
        </View>

        <Pressable
          onPress={handleLogout}
          className="mt-8 rounded-full border border-red-300 bg-red-50 py-3.5 items-center active:opacity-80"
        >
          <Text className="text-red-700 font-bold">Logout</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
