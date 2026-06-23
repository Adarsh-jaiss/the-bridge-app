import React, { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, TextInput, ActivityIndicator, Image, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useMutation } from "@tanstack/react-query";
import { createPost } from "../../lib/api/posts";
import { TransientSnackbar } from "../../components/common/TransientSnackbar";

const MAX_ATTACHMENTS = 4;

export default function CreatePostScreen() {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [showSnackbar, setShowSnackbar] = useState(false);

  const canSubmit = useMemo(() => content.trim().length > 0, [content]);

  const createPostMutation = useMutation({
    mutationFn: async () => {
      await createPost({
        content: content.trim(),
        is_post_poll: false,
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

  const handlePickImages = async () => {
    if (selectedImages.length >= MAX_ATTACHMENTS) return;

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const availableSlots = MAX_ATTACHMENTS - selectedImages.length;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: availableSlots,
      quality: 0.85,
    });

    if (!result.canceled) {
      const uris = result.assets.map((asset) => asset.uri).slice(0, availableSlots);
      setSelectedImages((prev) => [...prev, ...uris].slice(0, MAX_ATTACHMENTS));
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={["top"]}>
      <View className="flex-row items-center justify-between px-6 py-4 border-b border-surface-container-high">
        <View className="flex-row items-center gap-3">
          <Pressable onPress={() => router.back()} className="p-2 -ml-2 rounded-full active:bg-surface-container-low">
            <MaterialIcons name="arrow-back" size={24} color="#0050cb" />
          </Pressable>
          <Text className="text-lg font-bold text-on-surface">Create Post</Text>
        </View>
        <Pressable
          onPress={() => createPostMutation.mutate()}
          disabled={!canSubmit || createPostMutation.isPending}
          className={`px-4 py-2 rounded-full ${canSubmit && !createPostMutation.isPending ? "bg-primary" : "bg-surface-container-high"}`}
        >
          {createPostMutation.isPending ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text className={`font-semibold ${canSubmit ? "text-on-primary" : "text-on-surface-variant"}`}>Post</Text>
          )}
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <TextInput
          value={content}
          onChangeText={setContent}
          placeholder="Share an update with your network..."
          placeholderTextColor="#727687"
          multiline
          textAlignVertical="top"
          className="min-h-[160px] p-4 rounded-2xl border border-surface-container-high bg-surface-container-low text-on-surface"
        />

        <View className="mt-4">
          <Pressable
            onPress={handlePickImages}
            disabled={selectedImages.length >= MAX_ATTACHMENTS}
            className="flex-row items-center justify-center gap-2 border border-dashed border-outline-variant rounded-xl py-3 active:opacity-80"
          >
            <MaterialIcons name="image" size={20} color="#727687" />
            <Text className="text-sm font-medium text-on-surface-variant">
              Attach images ({selectedImages.length}/{MAX_ATTACHMENTS})
            </Text>
          </Pressable>
          <Text className="text-xs text-on-surface-variant mt-2">
            Selected images are preview-only for now and are not sent in API payload yet.
          </Text>
        </View>

        {selectedImages.length > 0 && (
          <View className="flex-row flex-wrap mt-4 gap-3">
            {selectedImages.map((uri, index) => (
              <View key={`${uri}-${index}`} className="relative">
                <Image source={{ uri }} className="w-20 h-20 rounded-lg" resizeMode="cover" />
                <Pressable
                  onPress={() => setSelectedImages((prev) => prev.filter((_, i) => i !== index))}
                  className="absolute -top-2 -right-2 bg-black/70 rounded-full p-1"
                >
                  <MaterialIcons name="close" size={14} color="#fff" />
                </Pressable>
              </View>
            ))}
          </View>
        )}

        {createPostMutation.isError && (
          <Text className="text-xs text-red-600 mt-4">
            {(createPostMutation.error as Error)?.message || "Failed to create post. Please try again."}
          </Text>
        )}
      </ScrollView>
      <TransientSnackbar visible={showSnackbar} message="Post published" />
    </SafeAreaView>
  );
}
