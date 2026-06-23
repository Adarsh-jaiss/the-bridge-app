import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { colorScheme } from "nativewind";
import "../../global.css";
import { queryClient } from "../lib/api/client";

// Force a light theme app-wide (synchronously, before first paint) so the UI
// never follows the device's dark mode.
colorScheme.set("light");

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <Stack screenOptions={{ headerShown: false }} />
    </QueryClientProvider>
  );
}
