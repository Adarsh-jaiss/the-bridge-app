import { MaterialIcons } from "@expo/vector-icons";
import { useInfiniteQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Image, Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ContactResponse, getDirectoryContacts } from "../../lib/api/directory";
import { getFallbackAvatarUrl } from "../../lib/avatar-fallback";


function DirectoryContactCard({ contact }: { contact: ContactResponse }) {
  const avatarSeed =
    contact.public_id ||
    contact.id?.toString() ||
    `${contact.first_name || ""}-${contact.last_name || ""}`;
  const avatarUri = contact.profile_picture || getFallbackAvatarUrl(avatarSeed);

  return (
    <Pressable 
      onPress={() => {
        if (contact.id) {
          router.push(`/directory/${contact.id}` as any);
        }
      }}
      className="bg-surface-container-lowest rounded-2xl p-4 mb-3 border border-surface-container-low shadow-sm flex-row items-center active:scale-[0.98] transition-transform"
    >
      <View className="w-12 h-12 rounded-full bg-primary-container items-center justify-center mr-4 overflow-hidden">
        <Image source={{ uri: avatarUri }} className="w-full h-full" resizeMode="cover" />
      </View>
      <View className="flex-1">
        <Text className="text-on-surface font-bold text-base mb-0.5">
          {contact.first_name} {contact.last_name}
        </Text>
        {contact.industry && (
          <Text className="text-on-surface-variant text-sm font-medium">
            {contact.industry}
          </Text>
        )}
        {(contact.city || contact.country) && (
          <View className="flex-row items-center mt-1">
            <MaterialIcons name="location-on" size={14} color="#727687" />
            <Text className="text-outline text-xs ml-1">
              {[contact.city, contact.country].filter(Boolean).join(", ")}
            </Text>
          </View>
        )}
      </View>
      {/* // TODO : SHOW DISTANCE LATER */}
      {/* {contact.distance !== undefined && (
        <View className="items-end">
          <Text className="text-primary font-bold text-sm">
            {contact.distance.toFixed(1)} km
          </Text>
        </View>
      )} */}
    </Pressable>
  );
}

type DirectoryFilterState = {
  industry: string;
};

const DEFAULT_FILTERS: DirectoryFilterState = {
  industry: "",
};

export default function DirectoryScreen() {
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [filters, setFilters] = useState<DirectoryFilterState>(DEFAULT_FILTERS);
  const [draftFilters, setDraftFilters] = useState<DirectoryFilterState>(DEFAULT_FILTERS);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useInfiniteQuery({
    queryKey: ['directory', filters],
    queryFn: ({ pageParam }) => getDirectoryContacts({ 
      industry: filters.industry.trim() || undefined,
      // latitude: hasValidCoordinates ? parsedLatitude : undefined,
      // longitude: hasValidCoordinates ? parsedLongitude : undefined,
      cursor_id: pageParam?.cursor_id,
      cursor_distance: pageParam?.cursor_distance,
      limit: 15,
    }),
    initialPageParam: undefined as { cursor_id?: number; cursor_distance?: number } | undefined,
    getNextPageParam: (lastPage) => {
      if (lastPage.next_cursor_id && lastPage.next_cursor_id > 0) {
        return {
          cursor_id: lastPage.next_cursor_id,
          cursor_distance: lastPage.next_cursor_distance,
        };
      }
      return undefined;
    },
  });

  const contacts = data?.pages.flatMap((page) => page.contacts) || [];
  const industryOptions = useMemo(() => {
    const known = [
      "Shipping",
      "Marine",
      "Logistics",
      "Oil & Gas",
      "Port Operations",
      "Naval",
      "Engineering",
    ];
    const fromResponse = contacts
      .map((contact) => contact.industry?.trim())
      .filter((industry): industry is string => Boolean(industry));
    return Array.from(new Set([...known, ...fromResponse])).slice(0, 12);
  }, [contacts]);

  const activeFiltersCount = [
    filters.industry.trim().length > 0,
  ].filter(Boolean).length;

  const applyFilters = () => {
    setFilters(draftFilters);
    setIsFilterModalOpen(false);
  };

  const clearFilters = () => {
    setDraftFilters(DEFAULT_FILTERS);
    setFilters(DEFAULT_FILTERS);
    setIsFilterModalOpen(false);
  };

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      {/* Header */}
      <View className="px-6 py-4 bg-surface border-b border-surface-container-high flex-row items-center justify-between">
        <View>
          <Text className="font-['Inter'] font-bold text-2xl text-on-surface">
            Directory
          </Text>
          <Text className="text-xs mt-1 text-on-surface-variant">
            Discover people with smart filters
          </Text>
        </View>
        <Pressable
          onPress={() => {
            setDraftFilters(filters);
            setIsFilterModalOpen(true);
          }}
          className="relative w-11 h-11 rounded-full bg-surface-container-high items-center justify-center"
        >
          <MaterialIcons name="tune" size={22} color="#0050cb" />
          {activeFiltersCount > 0 && (
            <View className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-primary items-center justify-center">
              <Text className="text-[10px] font-bold text-on-primary">{activeFiltersCount}</Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* Content */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#0050cb" />
        </View>
      ) : isError ? (
        <View className="flex-1 items-center justify-center px-6">
          <MaterialIcons name="error-outline" size={48} color="#ba1a1a" className="mb-4" />
          <Text className="text-on-surface font-bold text-lg text-center mb-2">Failed to load directory</Text>
          <Text className="text-on-surface-variant text-center">{error?.message || "Something went wrong"}</Text>
        </View>
      ) : (
        <FlatList
          data={contacts}
          keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
          renderItem={({ item }) => <DirectoryContactCard contact={item} />}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          refreshing={isRefetching}
          onRefresh={refetch}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) {
              fetchNextPage();
            }
          }}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            isFetchingNextPage ? (
              <View className="py-4 items-center">
                <ActivityIndicator size="small" color="#0050cb" />
              </View>
            ) : null
          }
        />
      )}

      <Modal
        visible={isFilterModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsFilterModalOpen(false)}
      >
        <View className="flex-1 bg-black/40 justify-end">
          <View className="bg-surface rounded-t-3xl p-6 max-h-[85%]">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-xl font-bold text-on-surface">Filter People</Text>
              <Pressable onPress={() => setIsFilterModalOpen(false)}>
                <MaterialIcons name="close" size={24} color="#727687" />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text className="text-sm font-semibold text-on-surface mb-2">Industry</Text>
              <TextInput
                value={draftFilters.industry}
                onChangeText={(text) => setDraftFilters((prev) => ({ ...prev, industry: text }))}
                placeholder="Type industry (e.g. Marine, Logistics)"
                placeholderTextColor="#727687"
                className="bg-surface-container-low border border-surface-container-high rounded-xl px-4 py-3 text-on-surface"
              />

              <View className="flex-row flex-wrap mt-3 mb-6">
                {industryOptions.map((industry) => (
                  <Pressable
                    key={industry}
                    onPress={() => setDraftFilters((prev) => ({ ...prev, industry }))}
                    className={`mr-2 mb-2 px-3 py-2 rounded-full border ${
                      draftFilters.industry === industry
                        ? "bg-primary border-primary"
                        : "bg-surface-container-low border-outline-variant"
                    }`}
                  >
                    <Text className={`text-xs font-semibold ${draftFilters.industry === industry ? "text-on-primary" : "text-on-surface"}`}>
                      {industry}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* <Text className="text-sm font-semibold text-on-surface mb-2">Location (for distance sorting)</Text>
              <TextInput
                value={draftFilters.latitude}
                onChangeText={(text) => setDraftFilters((prev) => ({ ...prev, latitude: text }))}
                placeholder="Latitude"
                keyboardType="decimal-pad"
                placeholderTextColor="#727687"
                className="bg-surface-container-low border border-surface-container-high rounded-xl px-4 py-3 text-on-surface mb-2"
              />
              <TextInput
                value={draftFilters.longitude}
                onChangeText={(text) => setDraftFilters((prev) => ({ ...prev, longitude: text }))}
                placeholder="Longitude"
                keyboardType="decimal-pad"
                placeholderTextColor="#727687"
                className="bg-surface-container-low border border-surface-container-high rounded-xl px-4 py-3 text-on-surface"
              />
              <Text className="text-xs text-on-surface-variant mt-2 mb-6">
                Add both values to enable nearest-first sorting.
              </Text> */}
            </ScrollView>

            <View className="flex-row gap-3">
              <Pressable onPress={clearFilters} className="flex-1 py-3 rounded-full bg-surface-container-high items-center">
                <Text className="font-semibold text-on-surface">Clear</Text>
              </Pressable>
              <Pressable onPress={applyFilters} className="flex-1 py-3 rounded-full bg-primary items-center">
                <Text className="font-semibold text-on-primary">Apply Filters</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
