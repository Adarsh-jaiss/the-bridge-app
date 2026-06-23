import { useState, useRef } from "react";
import { Text, View, Pressable, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { verifyOTP, requestOTP } from "../../lib/api/auth";
import * as SecureStore from "expo-secure-store";

const OTP_LENGTH = 6;

export default function OTP() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();
  
  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(""));
  const inputs = useRef<TextInput[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendLoading, setResendLoading] = useState(false);

  const focusInput = (index: number) => {
    if (index < 0 || index >= OTP_LENGTH) return;
    inputs.current[index]?.focus();
  };

  const handleOtpChange = (value: string, index: number) => {
    const digits = value.replace(/\D/g, "");
    const nextOtp = [...otp];

    if (!digits) {
      nextOtp[index] = "";
      setOtp(nextOtp);
      if (error) setError("");
      return;
    }

    let writeIndex = index;
    for (const digit of digits) {
      if (writeIndex >= OTP_LENGTH) break;
      nextOtp[writeIndex] = digit;
      writeIndex += 1;
    }

    setOtp(nextOtp);
    if (error) setError("");

    if (writeIndex < OTP_LENGTH) {
      focusInput(writeIndex);
    } else {
      inputs.current[OTP_LENGTH - 1]?.blur();
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key !== "Backspace") return;

    const nextOtp = [...otp];

    // One press clears current value.
    if (nextOtp[index]) {
      nextOtp[index] = "";
      setOtp(nextOtp);
      if (error) setError("");
      return;
    }

    // If already empty, move left and clear previous.
    if (index > 0) {
      nextOtp[index - 1] = "";
      setOtp(nextOtp);
      focusInput(index - 1);
      if (error) setError("");
    }
  };

  const isComplete = otp.every((val) => val.trim() !== "");

  const handleVerify = async () => {
    if (isComplete && !isLoading) {
      setError("");
      setIsLoading(true);
      const otpString = otp.join("");
      
      try {
        const response = await verifyOTP(email || "", otpString);
        if (response.success && response.data) {
          if (response.data.is_verified === false) {
            await SecureStore.setItemAsync("access_token", response.data.access_token);
            if (response.data.refresh_token) {
              await SecureStore.setItemAsync("refresh_token", response.data.refresh_token);
            }
            Alert.alert(
              "Account Not Found",
              "No account is associated with this email. Please register.",
              [
                {
                  text: "OK",
                  onPress: () =>
                    router.replace({
                      pathname: "./register",
                      params: { email: email || "" },
                    }),
                },
              ]
            );
            return;
          }

          await SecureStore.setItemAsync("access_token", response.data.access_token);
          if (response.data.refresh_token) {
            await SecureStore.setItemAsync("refresh_token", response.data.refresh_token);
          }
          router.replace("/home");
        }
      } catch (err: any) {
        setError(err.response?.data?.error?.message || "Invalid or expired OTP. Please try again.");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleResend = async () => {
    if (!email || resendLoading) return;
    setResendLoading(true);
    setError("");
    try {
      await requestOTP(email);
      // We could add a toast here for success
    } catch (err: any) {
      setError(err.response?.data?.error?.message || "Failed to resend OTP.");
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-surface relative">
      <View className="absolute top-[-10%] -left-[20%] w-[80%] h-[40%] rounded-full bg-primary-fixed-dim opacity-10 blur-3xl pointer-events-none" />
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1 px-8 justify-start mt-[40px]"
      >
        {/* Abstract Icon/Logo matching Login */}
        <View className="w-16 h-16 bg-surface-container-low rounded-2xl items-center justify-center mb-8 border border-outline-variant/20 shadow-sm">
          <MaterialIcons name="vpn-key" size={28} color="#0050cb" />
        </View>

        <View className="w-full mb-10">
          <Text className="text-[13px] font-medium text-on-surface-variant mb-2 ml-1">
            Enter the 6-digit OTP sent to {email || "your email"}
          </Text>
          
          <View className="flex-row justify-between w-full">
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => {
                  if (ref) inputs.current[index] = ref;
                }}
                className="w-12 h-14 p-0 bg-surface-container-low rounded-xl text-center text-[20px] font-medium text-on-surface border border-outline-variant/20 focus:border-primary/50 transition-colors shadow-sm"
                keyboardType="number-pad"
                maxLength={OTP_LENGTH}
                value={digit}
                textAlign="center"
                selectTextOnFocus
                autoComplete={Platform.select({ ios: "one-time-code", android: "sms-otp", default: "one-time-code" })}
                textContentType="oneTimeCode"
                editable={!isLoading}
                onChangeText={(val) => handleOtpChange(val, index)}
                onKeyPress={(e) => handleKeyPress(e.nativeEvent.key, index)}
              />
            ))}
          </View>
          {error ? (
            <Text className="text-error text-xs mt-4 ml-1 text-center">{error}</Text>
          ) : null}
        </View>

        {/* Button matching Login layout */}
        <Pressable 
          onPress={handleVerify}
          disabled={!isComplete || isLoading}
          className={`w-full h-14 rounded-full flex-row items-center justify-center shadow-sm active:opacity-80 transition-opacity mb-10 ${
            isComplete ? "bg-primary-container" : "bg-surface-container-highest"
          }`}
        >
          {isLoading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <Text className={`font-bold text-base mr-2 ${
                isComplete ? "text-on-primary-container" : "text-on-surface-variant/50"
              }`}>
                Confirm Identity
              </Text>
              <MaterialIcons name="check" size={20} color={isComplete ? "#ffffff" : "#a0aab5"} />
            </>
          )}
        </Pressable>

        <View className="items-center absolute bottom-12 left-0 right-0">
          <Pressable onPress={handleResend} disabled={resendLoading} className="flex-row items-center p-2 active:opacity-60">
            {resendLoading ? (
              <ActivityIndicator size="small" color="#0050cb" />
            ) : (
              <Text className="text-[13px] font-medium text-primary">
                Resend OTP
              </Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}