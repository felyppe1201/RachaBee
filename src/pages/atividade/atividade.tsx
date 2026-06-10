import React from "react";

// React Native
import { Text, View } from "react-native";

// responsividade
import {
  responsiveWidth,
  responsiveHeight,
} from "react-native-responsive-dimensions";

export default function Atividade() {
  return (
    <View className="flex-1 flex flex-col items-center justify-center ">
      <View
        style={{
          height: responsiveHeight(5),
          width: responsiveWidth(100),
        }}
        className=""
      ></View>
      <View className="flex-1 flex flex-row items-center justify-center border-t-[8px] border-blackapp">
        <View
          style={{ width: responsiveWidth(20) }}
          className="h-full border-r-[8px] border-b-[8px] border-blackapp"
        ></View>
        <View
          style={{
            width: responsiveWidth(80),
          }}
          className="h-full flex flex-col items-center justify-start border-b-[8px] border-blackapp"
        >
          <View
            style={{
              width: responsiveWidth(80),
              height: responsiveHeight(10),
            }}
            className="border-b-[8px] border-blackapp"
          ></View>
          <View className="h-full w-full flex flex-col items-center justify-start">
            {/* Aqui vai a lista de atividades recentes aqui */}
          </View>
        </View>
      </View>
      <View
        style={{
          height: responsiveHeight(5),
          width: responsiveWidth(100),
        }}
        className=""
      ></View>
    </View>
  );
}
