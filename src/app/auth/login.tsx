import { useState } from "react";
import { Text, View, Pressable, TextInput, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");

  const handleNext = () => {
    if (email.trim()) {
      router.push("/auth/otp");
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-surface dark:bg-slate-950 relative">
      <View className="absolute top-[-10%] -left-[20%] w-[80%] h-[40%] rounded-full bg-primary-fixed-dim opacity-10 dark:opacity-5 blur-3xl pointer-events-none" />
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1 px-8 justify-start mt-[40px]"
      >
        {/* Abstract Icon/Logo */}
        <View className="w-16 h-16 bg-surface-container-low dark:bg-slate-900 rounded-2xl items-center justify-center mb-8 border border-outline-variant/20 dark:border-slate-800 shadow-sm">
          <MaterialIcons name="alternate-email" size={28} color="#0050cb" />
        </View>

        <View className="w-full mb-10">
          <Text className="text-[13px] font-medium text-on-surface-variant dark:text-slate-400 mb-2 ml-1">
            Enter your Email Address
          </Text>
          <View className="w-full h-14 bg-surface-container-low dark:bg-slate-900 rounded-xl px-4 flex-row items-center border border-transparent focus-within:border-primary/50 transition-colors">
            <MaterialIcons name="mail-outline" size={20} color="#727687" />
            <TextInput
              className="flex-1 h-full text-[15px] text-on-surface dark:text-slate-50 ml-3"
              placeholder="jack@gmail.com"
              placeholderTextColor="#727687"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={true}
              value={email}
              onChangeText={setEmail}
            />
          </View>
        </View>

        <Pressable 
          onPress={handleNext}
          disabled={!email.trim()}
          className={`w-full h-14 rounded-full flex-row items-center justify-center shadow-sm active:opacity-80 transition-opacity mb-10 ${
            email.trim() ? "bg-primary-container dark:bg-primary" : "bg-surface-container-highest dark:bg-slate-800"
          }`}
        >
          <Text className={`font-bold text-base mr-2 ${
            email.trim() ? "text-on-primary-container dark:text-white" : "text-on-surface-variant/50 dark:text-slate-500"
          }`}>
            Request OTP
          </Text>
          <MaterialIcons name="arrow-forward" size={20} color={email.trim() ? "#ffffff" : "#a0aab5"} />
        </Pressable>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
