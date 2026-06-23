import { MaterialIcons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function HomeLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#ffffff",
          borderTopWidth: 1,
          borderTopColor: "#f3f3f3",
          height: 64 + insets.bottom, // Adjust height for safe area
          paddingBottom: 8 + insets.bottom, // Adjust padding for safe area
          paddingTop: 8,
          elevation: 4,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -1 },
          shadowOpacity: 0.03,
          shadowRadius: 4,
        },
        tabBarActiveTintColor: "#0050cb",
        tabBarInactiveTintColor: "#94a3b8", // slate-400
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View className={`items-center justify-center transition-all duration-300 ease-in-out ${focused ? 'scale-110' : ''}`}>
              <MaterialIcons name="home" size={28} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View className={`items-center justify-center transition-all duration-300 ease-in-out ${focused ? 'scale-110' : ''}`}>
              <MaterialIcons name="search" size={28} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="announcement"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View className={`items-center justify-center transition-all duration-300 ease-in-out ${focused ? 'scale-110' : ''}`}>
              <MaterialIcons name="announcement" size={28} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="directory"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View className={`items-center justify-center transition-all duration-300 ease-in-out ${focused ? 'scale-110' : ''}`}>
              <MaterialIcons name="contacts" size={28} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View className={`items-center justify-center transition-all duration-300 ease-in-out ${focused ? 'scale-110' : ''}`}>
              <MaterialIcons name="person" size={28} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
