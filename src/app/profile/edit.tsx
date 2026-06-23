import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { getMyProfile, updateMyProfile } from "../../lib/api/user";
import { queryClient } from "../../lib/api/client";
import * as ImagePicker from "expo-image-picker";
import { getFallbackAvatarUrl } from "../../lib/avatar-fallback";

export default function EditProfileScreen() {
  const router = useRouter();
  const [profilePicture, setProfilePicture] = useState("");
  const [bio, setBio] = useState("");
  const [initialProfilePicture, setInitialProfilePicture] = useState("");
  const [initialBio, setInitialBio] = useState("");

  const profileQuery = useQuery({
    queryKey: ["myProfileEdit"],
    queryFn: () => getMyProfile({ limit: 1 }),
  });

  useEffect(() => {
    const profile = profileQuery.data?.user_profile;
    if (!profile) return;

    const nextPicture = profile.profile_picture || "";
    const nextBio = profile.bio || "";

    setProfilePicture(nextPicture);
    setBio(nextBio);
    setInitialProfilePicture(nextPicture);
    setInitialBio(nextBio);
  }, [profileQuery.data?.user_profile]);

  const canSubmit = useMemo(() => {
    return (
      bio.trim() !== initialBio.trim() ||
      profilePicture.trim() !== initialProfilePicture.trim()
    );
  }, [bio, initialBio, profilePicture, initialProfilePicture]);

  const handlePickProfilePicture = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: false,
      quality: 0.85,
    });

    if (!result.canceled && result.assets.length > 0) {
      setProfilePicture(result.assets[0].uri);
    }
  };

  const updateMutation = useMutation({
    mutationFn: async () => {
      await updateMyProfile({
        bio: bio.trim(),
        profile_picture: profilePicture.trim() || undefined,
      });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["myProfile"] }),
        queryClient.invalidateQueries({ queryKey: ["myProfileEdit"] }),
      ]);
      router.back();
    },
  });

  if (profileQuery.isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-surface" edges={["top"]}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#0050cb" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={["top"]}>
      <View className="flex-row items-center justify-between px-6 py-4 border-b border-surface-container-high">
        <View className="flex-row items-center gap-3">
          <Pressable
            onPress={() => router.back()}
            className="p-2 -ml-2 rounded-full active:bg-surface-container-low"
          >
            <MaterialIcons name="arrow-back" size={24} color="#0050cb" />
          </Pressable>
          <Text className="text-lg font-bold text-on-surface">Edit Profile</Text>
        </View>
        <Pressable
          onPress={() => updateMutation.mutate()}
          disabled={!canSubmit || updateMutation.isPending}
          className={`px-4 py-2 rounded-full ${
            canSubmit && !updateMutation.isPending ? "bg-primary" : "bg-surface-container-high"
          }`}
        >
          {updateMutation.isPending ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text
              className={`font-semibold ${
                canSubmit ? "text-on-primary" : "text-on-surface-variant"
              }`}
            >
              Save
            </Text>
          )}
        </Pressable>
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{ padding: 24, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
        >
          <View className="gap-4">
            <View>
              <Text className="text-xs font-semibold text-on-surface-variant mb-3">
                Profile Picture
              </Text>
              <Pressable
                onPress={handlePickProfilePicture}
                className="self-start active:opacity-80"
              >
                <View className="relative">
                  <Image
                    source={{
                      uri:
                        profilePicture ||
                        getFallbackAvatarUrl(
                          `${profileQuery.data?.user_profile?.firstName || ""} ${profileQuery.data?.user_profile?.lastName || ""}`.trim() ||
                            "Profile"
                        ),
                    }}
                    className="w-24 h-24 rounded-full border-2 border-surface-container-high bg-surface-container-low"
                    resizeMode="cover"
                  />
                  <View className="absolute -right-1 -bottom-1 w-8 h-8 rounded-full bg-primary items-center justify-center border-2 border-surface">
                    <MaterialIcons name="photo-camera" size={16} color="#ffffff" />
                  </View>
                </View>
              </Pressable>
              <Text className="text-xs text-on-surface-variant mt-2">
                Tap image to change
              </Text>
            </View>

            <View>
              <Text className="text-xs font-semibold text-on-surface-variant mb-2">
                Bio
              </Text>
              <TextInput
                value={bio}
                onChangeText={setBio}
                placeholder="Tell people about yourself"
                placeholderTextColor="#727687"
                multiline
                textAlignVertical="top"
                className="min-h-[120px] px-4 py-3 rounded-xl border border-surface-container-high bg-surface-container-low text-on-surface"
              />
            </View>
          </View>

          {profileQuery.isError && (
            <Text className="text-xs text-red-600 mt-4">
              {(profileQuery.error as Error)?.message || "Failed to load profile details."}
            </Text>
          )}

          {updateMutation.isError && (
            <Text className="text-xs text-red-600 mt-4">
              {(updateMutation.error as Error)?.message || "Failed to update profile. Please try again."}
            </Text>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
