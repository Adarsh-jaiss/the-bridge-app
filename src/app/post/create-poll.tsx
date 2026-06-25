import React, { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, TextInput, ActivityIndicator, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import { createPost } from "../../lib/api/posts";
import { TransientSnackbar } from "../../components/common/TransientSnackbar";

export default function CreatePollScreen() {
  const router = useRouter();
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [showSnackbar, setShowSnackbar] = useState(false);

  const validOptions = options.map((option) => option.trim()).filter(Boolean);
  const canSubmit = useMemo(() => question.trim().length > 0 && validOptions.length >= 2, [question, validOptions.length]);

  const createPollMutation = useMutation({
    mutationFn: async () => {
      await createPost({
        content: question.trim(),
        is_post_poll: true,
        poll_options: validOptions,
      });
    },
    onSuccess: () => {
      setShowSnackbar(true);
    },
  });

  useEffect(() => {
    if (!showSnackbar) return;
    const timeout = setTimeout(() => {
      setShowSnackbar(false);
      router.replace("/home");
    }, 900);
    return () => clearTimeout(timeout);
  }, [router, showSnackbar]);

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={["top"]}>
      <View className="flex-row items-center justify-between px-6 py-4 border-b border-surface-container-high">
        <View className="flex-row items-center gap-3">
          <Pressable onPress={() => router.back()} className="p-2 -ml-2 rounded-full active:bg-surface-container-low">
            <MaterialIcons name="arrow-back" size={24} color="#0050cb" />
          </Pressable>
          <Text className="text-lg font-bold text-on-surface">Create Poll</Text>
        </View>
        <Pressable
          onPress={() => createPollMutation.mutate()}
          disabled={!canSubmit || createPollMutation.isPending}
          className={`px-4 py-2 rounded-full ${canSubmit && !createPollMutation.isPending ? "bg-primary" : "bg-surface-container-high"}`}
        >
          {createPollMutation.isPending ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text className={`font-semibold ${canSubmit ? "text-on-primary" : "text-on-surface-variant"}`}>Publish</Text>
          )}
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <Text className="text-sm font-semibold text-on-surface mb-2">Poll Question</Text>
        <TextInput
          value={question}
          onChangeText={setQuestion}
          placeholder="Ask your poll question..."
          placeholderTextColor="#727687"
          multiline
          textAlignVertical="top"
          className="min-h-[120px] p-4 rounded-2xl border border-surface-container-high bg-surface-container-low text-on-surface mb-5"
        />

        <Text className="text-sm font-semibold text-on-surface mb-2">Options</Text>
        <View className="gap-3">
          {options.map((option, index) => (
            <View key={`option-${index}`} className="flex-row items-center gap-2">
              <View className="w-7 h-7 rounded-full bg-surface-container-high items-center justify-center">
                <Text className="text-xs font-bold text-on-surface-variant">{index + 1}</Text>
              </View>
              <TextInput
                value={option}
                onChangeText={(text) => {
                  setOptions((prev) => prev.map((value, i) => (i === index ? text : value)));
                }}
                placeholder={`Option ${index + 1}`}
                placeholderTextColor="#727687"
                className="flex-1 h-12 px-4 rounded-xl border border-surface-container-high bg-surface-container-low text-on-surface"
              />
              {options.length > 2 && (
                <Pressable
                  onPress={() => setOptions((prev) => prev.filter((_, i) => i !== index))}
                  className="w-8 h-8 rounded-full bg-surface-container-high items-center justify-center"
                >
                  <MaterialIcons name="remove" size={18} color="#727687" />
                </Pressable>
              )}
            </View>
          ))}
        </View>

        <Pressable
          onPress={() => setOptions((prev) => (prev.length < 4 ? [...prev, ""] : prev))}
          disabled={options.length >= 4}
          className={`mt-4 py-3 rounded-xl border border-dashed items-center ${options.length >= 4 ? "border-surface-container-high" : "border-outline-variant"}`}
        >
          <Text className="text-sm font-medium text-on-surface-variant">
            Add option ({options.length}/4)
          </Text>
        </Pressable>

        {createPollMutation.isError && (
          <Text className="text-xs text-red-600 mt-4">
            {(createPollMutation.error as Error)?.message || "Failed to create poll. Please try again."}
          </Text>
        )}
      </ScrollView>
      <TransientSnackbar visible={showSnackbar} message="Poll published" />
    </SafeAreaView>
  );
}
