import React from "react";
import { View, Text } from "react-native";

interface TransientSnackbarProps {
  visible: boolean;
  message: string;
}

export function TransientSnackbar({ visible, message }: TransientSnackbarProps) {
  if (!visible || !message) return null;

  return (
    <View className="absolute left-6 right-6 top-14 bg-primary px-4 py-3 rounded-xl shadow-sm">
      <Text className="text-center text-sm font-semibold text-white">
        {message}
      </Text>
    </View>
  );
}
