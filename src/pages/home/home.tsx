import React, { useState } from "react";

// IMG's
import Logo from "../../assets/logo.png";

// React Native
import { View, Image, Text } from "react-native";
import Octagon from "../../components/interface/Octagon";

// Context
import { useUser } from "../../context/UserContext";

// responsividade
import {
  responsiveWidth,
  responsiveHeight,
} from "react-native-responsive-dimensions";

export default function Home() {
  const { profile, balance } = useUser();

  return (
    <View className="flex-1 flex flex-col items-center justify-start relative">
      {/*Logo simbolo*/}
      <View
        className="items-center justify-center absolute top-3 left-0 z-50"
        style={{ width: responsiveWidth(40), height: responsiveWidth(40) }}
      >
        {/* wrapper absoluto que cobre toda a view; Octagon fica em fluxo normal dentro dele */}
        <View className="absolute w-full h-full items-center justify-center z-0">
          <Octagon color="secondary" stroke="black" strokeWidth={4} />
        </View>
        <Image
          source={Logo}
          style={{ width: responsiveWidth(20), height: responsiveWidth(20) }}
          className=" z-20"
          resizeMode="contain"
        />
      </View>
      {/*Logo simbolo FIM*/}
      <View
        style={{ height: responsiveHeight(16) }}
        className="w-full bg-secondary z-40 border-b-[12px] border-black flex flex-row items-center justify-center pt-6 px-10"
      >
        <Text className="text-black text-2xl font-bold">
          Olá, {profile?.nome}!
        </Text>
      </View>
    </View>
  );
}
