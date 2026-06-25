import React, { useState, useEffect } from "react";
import { View, Text, Pressable, TextInput, Modal, TouchableWithoutFeedback, KeyboardAvoidingView, Platform, FlatList, ActivityIndicator, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { Filter } from "lucide-react-native";
import { useQuery } from "@tanstack/react-query";
import { searchUsers, SearchUserRequest, SearchUserResponse } from "../../lib/api/search";
import { useRouter } from "expo-router";
import { getFallbackAvatarUrl } from "../../lib/avatar-fallback";

export default function SearchScreen() {
  const router = useRouter();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  
  // Local state for the form
  const [searchQuery, setSearchQuery] = useState("");
  const [rank, setRank] = useState("");
  const [company, setCompany] = useState("");
  const [city, setCity] = useState("");

  // Applied state that drives the query
  const [appliedFilters, setAppliedFilters] = useState<SearchUserRequest>({
    name: "",
    rank: "",
    company: "",
  });

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setAppliedFilters(prev => ({ ...prev, name: searchQuery }));
    }, 500);

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery]);

  const handleApply = () => {
    setIsSheetOpen(false);
    setAppliedFilters({
      name: searchQuery,
      rank: rank,
      company: company,
      // API currently doesn't support city, but we keep it in UI state
    });
  };

  const handleClear = () => {
    setRank("");
    setCompany("");
    setCity("");
    setIsSheetOpen(false);
    setAppliedFilters({
      name: searchQuery,
      rank: "",
      company: ""
    });
  };

  const handleSearchSubmit = () => {
    setAppliedFilters(prev => ({ ...prev, name: searchQuery }));
  };

  const { data: users, isLoading, isError, error } = useQuery({
    queryKey: ['searchUsers', appliedFilters],
    queryFn: () => searchUsers(appliedFilters),
    enabled: !!(appliedFilters.name || appliedFilters.rank || appliedFilters.company),
  });

  const renderUser = ({ item }: { item: SearchUserResponse }) => (
    <Pressable 
      onPress={() => {
        router.push({
          pathname: `/user/[id]`,
          params: { 
            id: item.public_id || Math.random().toString(),
            firstName: item.first_name || "",
            lastName: item.last_name || "",
            company: item.company_name || "",
            industry: "",
            bio: "",
            rank: item.rank || "",
            city: "",
            country: "",
            email: "",
            mobile: ""
          }
        });
      }}
      className="bg-surface-container-lowest p-4 mb-3 rounded-2xl border border-surface-container-low flex-row items-center active:scale-[0.98] transition-transform"
    >
      <View className="w-12 h-12 rounded-full bg-primary-container items-center justify-center mr-4 overflow-hidden">
        <Image
          source={{
            uri:
              item.profile_picture ||
              getFallbackAvatarUrl(item.public_id || `${item.first_name || ""}-${item.last_name || ""}`),
          }}
          className="w-full h-full"
          resizeMode="cover"
        />
      </View>
      <View className="flex-1">
        <Text className="text-base font-bold text-on-surface">
          {item.first_name} {item.last_name}
        </Text>
        <Text className="text-sm text-on-surface-variant">
          {item.rank || "Professional"} {item.company_name ? `• ${item.company_name}` : ""}
        </Text>
      </View>
      <MaterialIcons name="chevron-right" size={24} color="#94a3b8" />
    </Pressable>
  );

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      {/* Header & Search Bar Row */}
      <View className="px-4 pt-2 pb-4 border-b border-surface-container-high">
        {/* <Text className="font-['Inter'] font-bold text-2xl text-on-surface mb-4">
          Search Users
        </Text> */}
        <View className="flex-row items-center gap-3 pt-2">
          <View className="flex-1 h-12 bg-surface-container-low rounded-xl px-4 flex-row items-center border border-transparent focus-within:border-primary/50 transition-colors">
            <MaterialIcons name="search" size={20} color="#727687" />
            <TextInput
              className="flex-1 h-full text-[15px] text-on-surface ml-3"
              placeholder="Search by name..."
              placeholderTextColor="#727687"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearchSubmit}
              returnKeyType="search"
            />
          </View>
          <Pressable 
            onPress={() => setIsSheetOpen(true)}
            className="h-12 w-12 bg-surface-container-low rounded-xl items-center justify-center active:bg-surface-container-high transition-colors relative"
          >
            {(appliedFilters.rank || appliedFilters.company) && (
              <View className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-primary border-2 border-surface z-10" />
            )}
            <Filter size={20} color="#0050cb" />
          </Pressable>
        </View>
      </View>

      {/* Results Area */}
      <View className="flex-1">
        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#0050cb" />
          </View>
        ) : isError ? (
          <View className="flex-1 items-center justify-center px-6">
            <MaterialIcons name="error-outline" size={48} color="#ba1a1a" className="mb-4" />
            <Text className="text-on-surface font-bold text-lg text-center mb-2">Search Failed</Text>
            <Text className="text-on-surface-variant text-center">{error?.message || "Something went wrong"}</Text>
          </View>
        ) : !appliedFilters.name && !appliedFilters.rank && !appliedFilters.company ? (
          <View className="flex-1 items-center justify-center px-6">
            <MaterialIcons name="search" size={48} color="#94a3b8" className="mb-4" />
            <Text className="text-on-surface font-bold text-lg text-center mb-2">Find Professionals</Text>
            <Text className="text-on-surface-variant text-center">Search by name, or use filters to find people by rank and company.</Text>
          </View>
        ) : users?.length === 0 ? (
          <View className="flex-1 items-center justify-center px-6">
            <MaterialIcons name="person-search" size={48} color="#94a3b8" className="mb-4" />
            <Text className="text-on-surface font-bold text-lg text-center mb-2">No Users Found</Text>
            <Text className="text-on-surface-variant text-center">Try adjusting your search terms or filters.</Text>
          </View>
        ) : (
          <FlatList
            data={users || []}
            keyExtractor={(item) => item.public_id || `${item.first_name || ""}-${item.last_name || ""}`}
            renderItem={renderUser}
            contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          />
        )}
      </View>

      {/* Bottom Sheet Modal for Filters */}
      <Modal
        visible={isSheetOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsSheetOpen(false)}
      >
        <TouchableWithoutFeedback onPress={() => setIsSheetOpen(false)}>
          <View className="flex-1 justify-end bg-black/50">
            <TouchableWithoutFeedback>
              <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                className="bg-surface rounded-t-3xl p-6"
              >
                {/* Drag Handle */}
                <View className="items-center mb-6">
                  <View className="w-12 h-1.5 bg-surface-container-highest rounded-full" />
                </View>

                <Text className="text-xl font-bold text-on-surface mb-6">Filters</Text>

                {/* Form */}
                <View className="gap-5">
                  <View>
                    <Text className="text-sm font-bold text-on-surface-variant mb-2">Rank</Text>
                    <View className="h-12 bg-surface-container-lowest border border-surface-container-high rounded-xl px-4 justify-center">
                      <TextInput
                        className="text-base text-on-surface flex-1"
                        placeholder="e.g. Master Mariner"
                        placeholderTextColor="#94a3b8"
                        value={rank}
                        onChangeText={setRank}
                      />
                    </View>
                  </View>

                  <View>
                    <Text className="text-sm font-bold text-on-surface-variant mb-2">Company Name</Text>
                    <View className="h-12 bg-surface-container-lowest border border-surface-container-high rounded-xl px-4 justify-center">
                      <TextInput
                        className="text-base text-on-surface flex-1"
                        placeholder="e.g. Maersk"
                        placeholderTextColor="#94a3b8"
                        value={company}
                        onChangeText={setCompany}
                      />
                    </View>
                  </View>

                  <View>
                    <Text className="text-sm font-bold text-on-surface-variant mb-2">City</Text>
                    <View className="h-12 bg-surface-container-lowest border border-surface-container-high rounded-xl px-4 justify-center">
                      <TextInput
                        className="text-base text-on-surface flex-1"
                        placeholder="e.g. Singapore"
                        placeholderTextColor="#94a3b8"
                        value={city}
                        onChangeText={setCity}
                      />
                    </View>
                  </View>
                </View>

                {/* Actions */}
                <View className="flex-row gap-4 mt-8 mb-4">
                  <Pressable 
                    onPress={handleClear}
                    className="flex-1 py-4 rounded-full items-center border border-outline-variant active:bg-surface-container-low"
                  >
                    <Text className="font-bold text-on-surface">Clear</Text>
                  </Pressable>
                  <Pressable 
                    onPress={handleApply}
                    className="flex-1 bg-primary py-4 rounded-full items-center active:bg-primary/90"
                  >
                    <Text className="font-bold text-on-primary">Apply Filters</Text>
                  </Pressable>
                </View>
              </KeyboardAvoidingView>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
}
