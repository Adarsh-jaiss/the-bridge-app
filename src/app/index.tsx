import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    const decideInitialRoute = async () => {
      const accessToken = await SecureStore.getItemAsync("access_token");
      if (accessToken) {
        router.replace("/home");
        return;
      }

      const onboardingShown = await AsyncStorage.getItem("onboardingShown");
      if (onboardingShown === "true") {
        router.replace("/auth/login");
        return;
      }

      router.replace("/onboarding");
    };

    decideInitialRoute();
  }, [router]);

  return (
    <View className="flex-1 bg-surface items-center justify-center">
      <ActivityIndicator size="large" color="#0050cb" />
    </View>
  );
}
