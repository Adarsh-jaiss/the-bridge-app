import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { requestOTP } from "../../lib/api/auth";

export default function Login() {
  const router = useRouter();
  const { email: prefilledEmail } = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(prefilledEmail || "");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleNext = async () => {
    // if (email.trim()) {
    //   router.push("/auth/otp");

    const trimmedEmail = email.trim();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!trimmedEmail) {
      setError("Please enter your email address.");
      return;
    }

    if (!emailRegex.test(trimmedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (isLoading) return;

    try {
      setIsLoading(true);
      const response = await requestOTP(email.trim());
      if (response.success) {
        router.push({ pathname: "/auth/otp", params: { email: email.trim() } });
      }
    } catch (err: any) {
      console.log("Error in login", err);
      setError(err.response?.data?.error?.message || "Failed to send OTP. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-surface relative">
      <View className="absolute top-[-10%] -left-[20%] w-[80%] h-[40%] rounded-full bg-primary-fixed-dim opacity-10 blur-3xl pointer-events-none" />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1 px-8 justify-start mt-[40px]"
      >
        {/* Abstract Icon/Logo */}
        <View className="w-16 h-16 bg-surface-container-low rounded-2xl items-center justify-center mb-8 border border-outline-variant/20 shadow-sm">
          <MaterialIcons name="alternate-email" size={28} color="#0050cb" />
        </View>

        <View className="w-full mb-10">
          <Text className="text-[13px] font-medium text-on-surface-variant mb-2 ml-1">
            Enter your Email Address
          </Text>
          <View className="w-full h-14 bg-surface-container-low rounded-xl px-4 flex-row items-center border border-transparent focus-within:border-primary/50 transition-colors">
            <MaterialIcons name="mail-outline" size={20} color="#727687" />
            <TextInput
              className="flex-1 h-full text-[15px] text-on-surface ml-3"
              placeholder="jack@gmail.com"
              placeholderTextColor="#727687"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={true}
              value={email}
              onChangeText={(val) => {
                setEmail(val);
                if (error) setError("");
              }}
              editable={!isLoading}
            />
          </View>
          {error ? (
            <Text className="text-error text-xs mt-2 ml-1">{error}</Text>
          ) : null}
        </View>

        <Pressable
          onPress={handleNext}
          disabled={!email.trim() || isLoading}
          className={`w-full h-14 rounded-full flex-row items-center justify-center shadow-sm active:opacity-80 transition-opacity mb-10 ${email.trim() ? "bg-primary-container" : "bg-surface-container-highest"
            }`}
        >
          {isLoading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <Text className={`font-bold text-base mr-2 ${email.trim() ? "text-on-primary-container" : "text-on-surface-variant/50"
                }`}>
                Request OTP
              </Text>
              <MaterialIcons name="arrow-forward" size={20} color={email.trim() ? "#ffffff" : "#a0aab5"} />
            </>
          )}
        </Pressable>

        <View className="items-center">
          <Text className="text-[13px] text-on-surface-variant">
            New to The Bridge?{" "}
            <Text
              className="text-primary font-semibold"
              onPress={() => router.push("./register")}
            >
              Register here
            </Text>
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
