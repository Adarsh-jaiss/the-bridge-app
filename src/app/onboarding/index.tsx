import { useState, useRef } from "react";
import { Text, View, Pressable, ScrollView, Dimensions, NativeSyntheticEvent, NativeScrollEvent } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import "../../../global.css";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const SLIDES = [
  {
    key: "step1",
    icon: "anchor",
    title: "Welcome to The Bridge",
    description: "The professional network for the global maritime community.",
  },
  {
    key:"step2",
    icon:"verified",
    title:"Verified Authenticity",
    description:"Every profile goes through strict verification, ensuring a community of real seafarers with no noise or impersonation. Your network is authentic."
  },
  {
    key: "step3",
    icon: "groups",
    title: "Connect with Peers",
    description: "Find and network with maritime professionals worldwide.",
  },
  {
    key: "step4",
    icon: "explore",
    title: "Discover Opportunities",
    description: "Access exclusive career opportunities and industry insights.",
  },
];

export default function Onboarding() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const handleSkip = async () => {
    await AsyncStorage.setItem("onboardingShown", "true");
    router.push("/auth/login");
  };

  const handleNext = async () => {
    if (currentIndex < SLIDES.length - 1) {
      scrollRef.current?.scrollTo({ x: SCREEN_WIDTH * (currentIndex + 1), animated: true });
    } else {
      await AsyncStorage.setItem("onboardingShown", "true");
      router.push("/auth/login");
    }
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const index = Math.round(x / SCREEN_WIDTH);
    if (index !== currentIndex && index >= 0 && index < SLIDES.length) {
      setCurrentIndex(index);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-surface dark:bg-slate-950 relative">
      {/* Decorative Subtle Background Grain/Tones */}
      <View className="absolute top-[10%] -left-[20%] w-[60%] h-[40%] rounded-full bg-primary-fixed-dim opacity-20 dark:opacity-5 blur-3xl pointer-events-none" />
      <View className="absolute bottom-[10%] -right-[20%] w-[60%] h-[40%] rounded-full bg-secondary-fixed-dim opacity-20 dark:opacity-5 blur-3xl pointer-events-none" />

      {/* Header Actions: Skip */}
      <View className="w-full flex-row justify-end px-8 py-4 z-50">
        <Pressable onPress={handleSkip}>
          <Text className="text-on-surface-variant dark:text-slate-400 font-medium text-sm">Skip</Text>
        </Pressable>
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onMomentumScrollEnd={onScroll}
        scrollEventThrottle={16}
        className="flex-1"
      >
        {SLIDES.map((slide) => (
          <View key={slide.key} style={{ width: SCREEN_WIDTH }} className="flex-1 items-center justify-center mt-[-100px]">
            {/* Abstract Nautical Illustration */}
            <View className="relative w-64 h-64 flex items-center justify-center mb-10">
              <View className="absolute inset-0 bg-surface-container-low dark:bg-slate-900 rounded-xl scale-95 opacity-50 dark:opacity-100" />
              <View className="relative z-10 p-12 bg-surface-container-lowest dark:bg-slate-900 rounded-xl shadow-sm border border-outline-variant/10 dark:border-slate-800">
                <MaterialIcons name={slide.icon as any} size={100} color="rgba(0, 80, 203, 0.4)" />
                {/* Decorative Minimal Elements */}
                <View className="absolute -top-4 -right-4 w-12 h-12 border-t-2 border-r-2 border-primary/10 dark:border-primary/20 rounded-tr-lg" />
                <View className="absolute -bottom-4 -left-4 w-12 h-12 border-b-2 border-l-2 border-primary/10 dark:border-primary/20 rounded-bl-lg" />
              </View>
            </View>

            {/* Typography Content */}
            <View className="px-8 items-center">
              <Text className="text-[28px] font-extrabold tracking-tight text-on-surface dark:text-slate-50 text-center leading-tight mb-4">
                {slide.title}
              </Text>
              <Text className="text-[15px] leading-relaxed text-on-surface-variant dark:text-slate-400 text-center max-w-[380px]">
                {slide.description}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Footer Actions */}
      <View className="w-full px-8 pb-12 pt-8 flex-col items-center absolute bottom-0">
        {/* Progress Dots */}
        <View className="flex-row items-center mb-8">
          {SLIDES.map((_, index) => (
            <View
              key={index}
              className={`h-1.5 rounded-full mr-2 ${
                currentIndex === index ? "w-6 bg-primary dark:bg-primary" : "w-1.5 bg-surface-container-highest dark:bg-slate-800"
              }`}
            />
          ))}
        </View>

        {/* Primary Action Button */}
        <Pressable onPress={handleNext} className="w-full h-14 bg-primary-container dark:bg-primary rounded-full shadow-sm flex-row items-center justify-center active:opacity-80">
          <Text className="text-on-primary-container dark:text-white font-bold text-base mr-2">
            {currentIndex === SLIDES.length - 1 ? "Get Started" : "Next"}
          </Text>
          <MaterialIcons name={currentIndex === SLIDES.length - 1 ? "check" : "arrow-forward"} size={20} color="#f8f7ff" />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
