import { Text, View, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

export default function Login() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-surface items-center justify-center relative px-8">
      <Text className="text-2xl font-extrabold text-on-surface mb-2">Login Placeholder</Text>
      <Text className="text-base text-on-surface-variant text-center mb-8">
        You have successfully completed the onboarding flow!
      </Text>

      <Pressable 
        onPress={() => router.push("/")}
        className="w-full h-14 bg-primary-container rounded-full items-center justify-center active:opacity-80"
      >
        <Text className="text-on-primary-container font-bold text-base">Restart Onboarding</Text>
      </Pressable>
    </SafeAreaView>
  );
}
