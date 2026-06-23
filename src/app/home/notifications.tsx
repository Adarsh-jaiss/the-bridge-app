import React, { useCallback, useState } from "react";
import { View, Text, FlatList, Image, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

interface NotificationActivity {
  id: string;
  actorName: string;
  actorAvatarUrl: string;
  actionText: string;
  targetText?: string;
  timeLabel: string;
  section: "Today" | "This week" | "Earlier";
  unread?: boolean;
  postThumbnailUrl?: string;
  ctaLabel?: "Follow" | "Following";
}

const DUMMY_NOTIFICATIONS: NotificationActivity[] = [
  {
    id: "1",
    actorName: "Bridge Ops",
    actorAvatarUrl:
      "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=256&q=80",
    actionText: "mentioned you in a comment:",
    targetText: "\"Great point on the port weather update.\"",
    timeLabel: "3m",
    section: "Today",
    unread: true,
    postThumbnailUrl:
      "https://images.unsplash.com/photo-1569263979104-865ab7cd8d13?auto=format&fit=crop&w=300&q=80",
  },
  {
    id: "2",
    actorName: "Captain Arjun",
    actorAvatarUrl:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80",
    actionText: "started following you",
    timeLabel: "22m",
    section: "Today",
    unread: true,
    ctaLabel: "Follow",
  },
  {
    id: "3",
    actorName: "Fleet Insights",
    actorAvatarUrl:
      "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=256&q=80",
    actionText: "liked your post",
    timeLabel: "1h",
    section: "Today",
    postThumbnailUrl:
      "https://images.unsplash.com/photo-1473448912268-2022ce9509d8?auto=format&fit=crop&w=300&q=80",
  },
  {
    id: "4",
    actorName: "Harbor Community",
    actorAvatarUrl:
      "https://images.unsplash.com/photo-1551836022-4c4c79ecde51?auto=format&fit=crop&w=256&q=80",
    actionText: "reposted your update",
    timeLabel: "2d",
    section: "This week",
    postThumbnailUrl:
      "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=300&q=80",
  },
  {
    id: "5",
    actorName: "Rina Dsouza",
    actorAvatarUrl:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=256&q=80",
    actionText: "started following you",
    timeLabel: "4d",
    section: "This week",
    ctaLabel: "Following",
  },
  {
    id: "6",
    actorName: "The Bridge",
    actorAvatarUrl:
      "https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=256&q=80",
    actionText: "shared a new product update",
    targetText: "Smarter voyage planning is now available.",
    timeLabel: "1w",
    section: "Earlier",
  },
];

function NotificationRow({ item }: { item: NotificationActivity }) {
  return (
    <View className="px-4 py-3.5">
      <View className="flex-row items-start">
        <Image
          source={{ uri: item.actorAvatarUrl }}
          className="w-11 h-11 rounded-full bg-surface-container-high"
        />
        <View className="flex-1 ml-3 pr-2">
          <Text className="text-[14px] leading-5 text-on-surface">
            <Text className="font-semibold">{item.actorName} </Text>
            <Text className="text-on-surface-variant">{item.actionText}</Text>
            {!!item.targetText && (
              <Text className="text-on-surface"> {item.targetText}</Text>
            )}
            <Text className="text-outline">  {item.timeLabel}</Text>
          </Text>
        </View>

        {item.postThumbnailUrl ? (
          <Image source={{ uri: item.postThumbnailUrl }} className="w-12 h-12 rounded-lg" resizeMode="cover" />
        ) : item.ctaLabel ? (
          <Pressable
            className={`px-3 py-1.5 rounded-full border ${
              item.ctaLabel === "Follow"
                ? "bg-primary border-primary"
                : "bg-surface-container-low border-outline-variant"
            }`}
          >
            <Text
              className={`text-xs font-semibold ${
                item.ctaLabel === "Follow"
                  ? "text-on-primary"
                  : "text-on-surface"
              }`}
            >
              {item.ctaLabel}
            </Text>
          </Pressable>
        ) : null}

        {item.unread && <View className="w-2 h-2 rounded-full bg-primary ml-2 mt-2" />}
      </View>
    </View>
  );
}

function NotificationSection({
  title,
  items,
}: {
  title: "Today" | "This week" | "Earlier";
  items: NotificationActivity[];
}) {
  return (
    <View className="mb-2">
      <Text className="px-4 pt-2 pb-1 text-sm font-semibold text-on-surface">
        {title}
      </Text>
      <View>
        {items.map((item, index) => (
          <View key={item.id}>
            <NotificationRow item={item} />
            {index < items.length - 1 && (
              <View className="h-px ml-[72px] mr-4 bg-surface-container-high" />
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

export default function NotificationsScreen() {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 650));
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  const todayItems = DUMMY_NOTIFICATIONS.filter((item) => item.section === "Today");
  const weekItems = DUMMY_NOTIFICATIONS.filter((item) => item.section === "This week");
  const earlierItems = DUMMY_NOTIFICATIONS.filter((item) => item.section === "Earlier");

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <View className="flex-row items-center justify-between px-6 py-4 w-full bg-surface border-b border-surface-container-high">
        <View className="flex-row items-center gap-3">
          <Pressable
            onPress={() => router.back()}
            className="p-2 -ml-2 rounded-full active:bg-surface-container-low"
          >
            <MaterialIcons name="arrow-back" size={24} color="#0050cb" />
          </Pressable>
          <Text className="font-['Inter'] font-bold text-lg tracking-tight text-on-surface">
            Notifications
          </Text>
        </View>
        <Pressable className="p-2 rounded-full active:bg-surface-container-low">
          <MaterialIcons name="more-vert" size={22} color="#727687" />
        </Pressable>
      </View>

      <FlatList
        data={[{ id: "activity-feed" }]}
        keyExtractor={(item) => item.id}
        renderItem={() => (
          <View className="pt-2">
            <NotificationSection title="Today" items={todayItems} />
            <NotificationSection title="This week" items={weekItems} />
            <NotificationSection title="Earlier" items={earlierItems} />
          </View>
        )}
        contentContainerStyle={{ paddingBottom: 110 }}
        showsVerticalScrollIndicator={false}
        refreshing={isRefreshing}
        onRefresh={handleRefresh}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center px-6 pt-16">
            <MaterialIcons name="notifications-none" size={46} color="#94a3b8" />
            <Text className="text-on-surface font-bold text-lg text-center mt-4 mb-2">
              No notifications yet
            </Text>
            <Text className="text-on-surface-variant text-center">
              You will see important updates here.
            </Text>
          </View>
        }
        ListHeaderComponent={
          <View className="px-4 pt-3 pb-2">
            {/* <Text className="text-sm text-on-surface-variant">
              Recent activity on your account
            </Text> */}
          </View>
        }
      />
    </SafeAreaView>
  );
}
