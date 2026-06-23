import React, { useMemo, useState } from "react";
import { View, Text, Pressable, TextInput, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import { reportPost } from "../../lib/api/posts";

const REPORT_REASONS = [
  "Spam",
  "Harassment or bullying",
  "Hate speech",
  "Violence or dangerous content",
  "Misinformation",
  "Nudity or sexual content",
  "Other",
];

export default function ReportPostScreen() {
  const router = useRouter();
  const { postId } = useLocalSearchParams<{ postId: string }>();
  const numericPostId = Number(postId);

  const [selectedReason, setSelectedReason] = useState<string>("");
  const [otherReason, setOtherReason] = useState("");

  const finalReason = useMemo(() => {
    if (!selectedReason) return "";
    if (selectedReason === "Other") return otherReason.trim();
    return selectedReason;
  }, [otherReason, selectedReason]);

  const reportMutation = useMutation({
    mutationFn: async () => {
      if (!Number.isFinite(numericPostId) || numericPostId <= 0) {
        throw new Error("Invalid post id.");
      }
      await reportPost(numericPostId, { reason: finalReason });
    },
    onSuccess: () => {
      router.replace("/home");
    },
  });

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={["top"]}>
      <View className="flex-row items-center px-6 py-4 border-b border-surface-container-high">
        <Pressable
          onPress={() => router.back()}
          className="mr-3 p-2 -ml-2 rounded-full active:bg-surface-container-low"
        >
          <MaterialIcons name="arrow-back" size={24} color="#0050cb" />
        </Pressable>
        <Text className="text-lg font-bold text-on-surface">Report Post</Text>
      </View>

      <View className="px-6 py-5">
        <Text className="text-base font-semibold text-on-surface mb-2">
          Why are you reporting this post?
        </Text>
        <Text className="text-sm text-on-surface-variant mb-5">
          Your report is confidential and helps keep the community safe.
        </Text>

        <View className="gap-2">
          {REPORT_REASONS.map((reason) => {
            const active = selectedReason === reason;
            return (
              <Pressable
                key={reason}
                onPress={() => setSelectedReason(reason)}
                className={`px-4 py-3 rounded-xl border ${
                  active
                    ? "bg-primary/10 border-primary"
                    : "bg-surface-container-low border-surface-container-high"
                }`}
              >
                <Text
                  className={`text-sm font-medium ${
                    active
                      ? "text-primary"
                      : "text-on-surface"
                  }`}
                >
                  {reason}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {selectedReason === "Other" && (
          <View className="mt-4">
            <Text className="text-sm font-semibold text-on-surface mb-2">
              Describe the issue
            </Text>
            <TextInput
              value={otherReason}
              onChangeText={setOtherReason}
              placeholder="Tell us what is wrong with this post"
              placeholderTextColor="#727687"
              multiline
              textAlignVertical="top"
              className="min-h-[110px] px-4 py-3 rounded-xl border border-surface-container-high bg-surface-container-low text-on-surface"
            />
          </View>
        )}

        {reportMutation.isError && (
          <Text className="text-xs text-error mt-3">
            {(reportMutation.error as Error)?.message || "Failed to submit report. Please try again."}
          </Text>
        )}

        <Pressable
          disabled={!finalReason || reportMutation.isPending}
          onPress={() => reportMutation.mutate()}
          className={`mt-6 py-3 rounded-full items-center ${
            !finalReason || reportMutation.isPending
              ? "bg-surface-container-high"
              : "bg-primary"
          }`}
        >
          {reportMutation.isPending ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text
              className={`font-bold ${
                !finalReason ? "text-on-surface-variant" : "text-on-primary"
              }`}
            >
              Submit Report
            </Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
