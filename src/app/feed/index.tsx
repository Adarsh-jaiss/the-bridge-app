import { Text, View, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";

export default function Feed() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-surface dark:bg-slate-950 items-center justify-center relative px-8">
      <View className="absolute top-[-10%] -left-[20%] w-[80%] h-[40%] rounded-full bg-primary-fixed-dim opacity-10 dark:opacity-5 blur-3xl pointer-events-none" />
      
      <View className="w-16 h-16 bg-surface-container-low dark:bg-slate-900 rounded-2xl items-center justify-center mb-8 border border-outline-variant/20 dark:border-slate-800 shadow-sm">
        <MaterialIcons name="dashboard" size={28} color="#0050cb" />
      </View>

      <Text className="text-2xl font-extrabold text-on-surface dark:text-slate-50 mb-2">Feed Dashboard</Text>
      <Text className="text-base text-on-surface-variant dark:text-slate-400 text-center mb-8">
        Welcome to The Bridge! You have successfully verified your email.
      </Text>

      <Pressable 
        onPress={() => router.replace("/auth/login")}
        className="w-full h-14 bg-surface-container-highest dark:bg-slate-800 rounded-full items-center justify-center active:opacity-80 border border-outline-variant/20 dark:border-slate-700"
      >
        <Text className="text-on-surface-variant dark:text-slate-300 font-bold text-base">Sign Out</Text>
      </Pressable>
    </SafeAreaView>
  );
}
