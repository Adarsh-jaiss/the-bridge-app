import { useState, useRef } from "react";
import { Text, View, Pressable, TextInput, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";

export default function OTP() {
  const router = useRouter();
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const inputs = useRef<TextInput[]>([]);

  const handleOtpChange = (value: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-advance when typing
    if (value && index < 5) {
      inputs.current[index + 1].focus();
    }
    
    // Auto-retreat when deleting a character
    if (!value && index > 0) {
      inputs.current[index - 1].focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    // Handle backspace when the box is ALREADY empty
    if (e.nativeEvent.key === "Backspace" && !otp[index] && index > 0) {
      inputs.current[index - 1].focus();
    }
  };

  const isComplete = otp.every((val) => val.trim() !== "");

  const handleVerify = () => {
    if (isComplete) {
      router.push("/feed");
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-surface dark:bg-slate-950 relative">
      <View className="absolute top-[-10%] -left-[20%] w-[80%] h-[40%] rounded-full bg-primary-fixed-dim opacity-10 dark:opacity-5 blur-3xl pointer-events-none" />
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1 px-8 justify-start mt-[40px]"
      >
        {/* Abstract Icon/Logo matching Login */}
        <View className="w-16 h-16 bg-surface-container-low dark:bg-slate-900 rounded-2xl items-center justify-center mb-8 border border-outline-variant/20 dark:border-slate-800 shadow-sm">
          <MaterialIcons name="vpn-key" size={28} color="#0050cb" />
        </View>

        <View className="w-full mb-10">
          <Text className="text-[13px] font-medium text-on-surface-variant dark:text-slate-400 mb-2 ml-1">
            Enter the 6-digit OTP sent to your email
          </Text>
          
          <View className="flex-row justify-between w-full">
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => {
                  if (ref) inputs.current[index] = ref;
                }}
                // Added p-0 for centering, and border-outline-variant/20 for the default border
                className="w-12 h-14 p-0 bg-surface-container-low dark:bg-slate-900 rounded-xl text-center text-[20px] font-medium text-on-surface dark:text-slate-50 border border-outline-variant/20 dark:border-slate-800 focus:border-primary/50 dark:focus:border-primary/50 transition-colors shadow-sm"
                keyboardType="number-pad"
                maxLength={1}
                value={digit}
                textAlign="center"
                caretHidden={true} // Hides the blinking cursor
                onChangeText={(val) => handleOtpChange(val, index)}
                onKeyPress={(e) => handleKeyPress(e, index)}
              />
            ))}
          </View>
        </View>

        {/* Button matching Login layout */}
        <Pressable 
          onPress={handleVerify}
          disabled={!isComplete}
          className={`w-full h-14 rounded-full flex-row items-center justify-center shadow-sm active:opacity-80 transition-opacity mb-10 ${
            isComplete ? "bg-primary-container dark:bg-primary" : "bg-surface-container-highest dark:bg-slate-800"
          }`}
        >
          <Text className={`font-bold text-base mr-2 ${
            isComplete ? "text-on-primary-container dark:text-white" : "text-on-surface-variant/50 dark:text-slate-500"
          }`}>
            Confirm Identity
          </Text>
          <MaterialIcons name="check" size={20} color={isComplete ? "#ffffff" : "#a0aab5"} />
        </Pressable>

        <View className="items-center absolute bottom-12 left-0 right-0">
          <Pressable className="flex-row items-center p-2 active:opacity-60">
            <Text className="text-[13px] font-medium text-primary dark:text-primary">
              Resend OTP
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}