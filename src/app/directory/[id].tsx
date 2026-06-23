import React, { useMemo } from "react";
import { View, Text, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DirectoryResponse, ContactResponse, getDirectoryContacts } from "../../lib/api/directory";
import { Linking } from "react-native";
import { Image } from "react-native";
import { getFallbackAvatarUrl } from "../../lib/avatar-fallback";
export default function ContactDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();

  const makeCall = (phoneNumber: string) => {
    Linking.openURL(`tel:${phoneNumber}`);
  }

  const sendEmail = (email: string) => {
    Linking.openURL(`mailto:${email}`);
  }

  // Try retrieving the contact from any cached directory query variant.
  const contact = useMemo(() => {
    if (!id) return null;

    const cachedDirectoryQueries = queryClient.getQueriesData<{ pages: DirectoryResponse[] }>({
      queryKey: ["directory"],
    });

    for (const [, data] of cachedDirectoryQueries) {
      if (!data?.pages) continue;
      for (const page of data.pages) {
        if (page && page.contacts) {
          const found = page.contacts.find((c: ContactResponse) => c.id?.toString() === id);
          if (found) return found;
        }
      }
    }

    return null;
  }, [id, queryClient]);

  const {
    data: fetchedContact,
    isLoading: isFetchingContact,
    isError: isFetchError,
    refetch,
  } = useQuery({
    queryKey: ["directoryContact", id],
    enabled: Boolean(id) && !contact,
    queryFn: async (): Promise<ContactResponse> => {
      let cursor_id: number | undefined;
      let cursor_distance: number | undefined;
      const maxPagesToScan = 20;

      for (let pageIndex = 0; pageIndex < maxPagesToScan; pageIndex += 1) {
        const response = await getDirectoryContacts({
          cursor_id,
          cursor_distance,
          limit: 15,
        });

        const match = response.contacts.find((c) => c.id?.toString() === id);
        if (match) return match;

        if (!response.next_cursor_id || response.next_cursor_id <= 0) break;
        cursor_id = response.next_cursor_id;
        cursor_distance = response.next_cursor_distance;
      }

      throw new Error("Contact not found");
    },
  });

  const resolvedContact = contact ?? fetchedContact ?? null;
  const avatarSeed =
    resolvedContact?.public_id ||
    resolvedContact?.id?.toString() ||
    `${resolvedContact?.first_name || ""}-${resolvedContact?.last_name || ""}`;
  const avatarUri = resolvedContact?.profile_picture || getFallbackAvatarUrl(avatarSeed);

  if (!resolvedContact && isFetchingContact) {
    return (
      <SafeAreaView className="flex-1 bg-surface items-center justify-center">
        <ActivityIndicator size="large" color="#0050cb" />
        <Text className="text-on-surface-variant mt-3">
          Loading contact details...
        </Text>
      </SafeAreaView>
    );
  }

  if (!resolvedContact) {
    return (
      <SafeAreaView className="flex-1 bg-surface items-center justify-center">
        <Text className="text-on-surface">
          {isFetchError ? "Contact not found." : "Contact not found in cache."}
        </Text>
        <View className="flex-row gap-3 mt-4">
          <Pressable
            onPress={() => refetch()}
            className="px-4 py-2 bg-surface-container-high rounded-full active:opacity-80"
          >
            <Text className="text-on-surface font-bold">Retry</Text>
          </Pressable>
          <Pressable onPress={() => router.back()} className="px-4 py-2 bg-primary rounded-full active:bg-primary/80">
            <Text className="text-on-primary font-bold">Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center px-6 py-4 bg-surface border-b border-surface-container-high z-50">
        <Pressable onPress={() => router.back()} className="mr-4 active:scale-95 transition-transform p-2 -ml-2 rounded-full active:bg-surface-container-low">
          <MaterialIcons name="arrow-back" size={24} color="#0050cb" className="" />
        </Pressable>
        <Text className="font-['Inter'] font-bold text-lg text-on-surface flex-1">
          Profile
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {/* Avatar Section */}
        <View className="items-center mb-6">
          <View className="w-24 h-24 rounded-full bg-primary-container items-center justify-center mb-4 border-4 border-surface-container-lowest shadow-sm overflow-hidden">
            <Image source={{ uri: avatarUri }} className="w-full h-full" resizeMode="cover" />
          </View>
          <Text className="text-2xl font-bold text-on-surface text-center">
            {resolvedContact.first_name} {resolvedContact.last_name}
          </Text>
          {resolvedContact.industry && (
            <Text className="text-primary font-semibold text-base mt-1 text-center capitalize">
              {resolvedContact.industry}
            </Text>
          )}
        </View>

        {/* Action Buttons */}
        <View className="flex-row gap-4 mb-8">
          <Pressable onPress={() => makeCall(resolvedContact.mobile_number || '')} className="flex-1 bg-primary py-3.5 rounded-full items-center active:bg-primary/90 transition-colors">
            <Text className="text-on-primary font-bold text-sm">Call</Text>
          </Pressable>
          <Pressable onPress={() => sendEmail(resolvedContact.email || '')} className="flex-1 bg-surface-container-highest py-3.5 rounded-full items-center active:bg-outline-variant/30 transition-colors">
            <Text className="text-on-surface font-bold text-sm">Send Email</Text>
          </Pressable>
        </View>

        {/* Details Cards */}
        <View className="bg-surface-container-lowest rounded-2xl p-5 mb-4 border border-surface-container-low shadow-sm">
          <Text className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-4">Contact Info</Text>
          
          {resolvedContact.email && (
            <View className="flex-row items-center mb-4">
              <View className="w-10 h-10 rounded-full bg-surface-container-low items-center justify-center mr-4">
                <MaterialIcons name="email" size={20} color="#727687" />
              </View>
              <View className="flex-1">
                <Text className="text-xs text-on-surface-variant">Email</Text>
                <Text className="text-sm font-medium text-on-surface">{resolvedContact.email}</Text>
              </View>
            </View>
          )}
          
          {resolvedContact.mobile_number && (
            <View className="flex-row items-center mb-4">
              <View className="w-10 h-10 rounded-full bg-surface-container-low items-center justify-center mr-4">
                <MaterialIcons name="phone" size={20} color="#727687" />
              </View>
              <View className="flex-1">
                <Text className="text-xs text-on-surface-variant">Mobile</Text>
                <Text className="text-sm font-medium text-on-surface">{resolvedContact.mobile_number}</Text>
              </View>
            </View>
          )}

          {(resolvedContact.city || resolvedContact.country || resolvedContact.address_line_1) && (
            <View className="flex-row items-center">
              <View className="w-10 h-10 rounded-full bg-surface-container-low items-center justify-center mr-4">
                <MaterialIcons name="location-on" size={20} color="#727687" />
              </View>
              <View className="flex-1">
                <Text className="text-xs text-on-surface-variant">Location</Text>
                {resolvedContact.address_line_1 && (
                  <Text className="text-sm font-medium text-on-surface">
                    {resolvedContact.address_line_1}{resolvedContact.address_line_2 ? `, ${resolvedContact.address_line_2}` : ''}
                  </Text>
                )}
                <Text className="text-sm font-medium text-on-surface">
                  {[resolvedContact.city, resolvedContact.state, resolvedContact.country].filter(Boolean).join(", ")}
                </Text>
                {resolvedContact.postal_code && (
                  <Text className="text-sm font-medium text-on-surface">{resolvedContact.postal_code}</Text>
                )}
                {resolvedContact.distance !== undefined && resolvedContact.distance > 0 && (
                  <Text className="text-xs text-primary font-medium mt-0.5">{resolvedContact.distance.toFixed(1)} km away</Text>
                )}
              </View>
            </View>
          )}
        </View>
        
        {(resolvedContact.industry || resolvedContact.service) && (
          <View className="bg-surface-container-lowest rounded-2xl p-5 border border-surface-container-low shadow-sm">
            <Text className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-4">Professional Details</Text>
            
            {resolvedContact.industry && (
              <View className="flex-row items-center mb-4">
                <View className="w-10 h-10 rounded-full bg-surface-container-low items-center justify-center mr-4">
                  <MaterialIcons name="work" size={20} color="#727687" />
                </View>
                <View className="flex-1">
                  <Text className="text-xs text-on-surface-variant">Industry</Text>
                  <Text className="text-sm font-medium text-on-surface capitalize">{resolvedContact.industry}</Text>
                </View>
              </View>
            )}
            
            {resolvedContact.service && (
              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-full bg-surface-container-low items-center justify-center mr-4">
                  <MaterialIcons name="build" size={20} color="#727687" />
                </View>
                <View className="flex-1">
                  <Text className="text-xs text-on-surface-variant">Service</Text>
                  <Text className="text-sm font-medium text-on-surface capitalize">{resolvedContact.service}</Text>
                </View>
              </View>
            )}
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}
