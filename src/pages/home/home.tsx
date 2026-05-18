import React, { useState } from "react";
import Logo from "../../assets/logo.png";
import { View, Image, Text } from "react-native";

export default function Home() {
  return (
    <View className="flex-1 items-center justify-center">
      <View className="h-1/3 w-full items-center justify-center">
        <Image source={Logo} className="w-40 h-40" resizeMode="contain" />
        <Text className="font-bold mt-5 text-lg">MENU</Text>
      </View>
    </View>
  );
}
