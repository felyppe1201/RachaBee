import React, { useCallback, useRef, useState } from "react";

// React Navigation
import { useFocusEffect } from "@react-navigation/native";

// IMG's
import Logo from "../../assets/logo.png";
import PaiaSticker from "../../assets/stickers/paia.webp";
import PoggersSticker from "../../assets/stickers/poggers.webp";

// React Native
import {
  View,
  Image,
  Text,
  Button,
  ScrollView,
  Pressable,
  Animated,
  Easing,
  RefreshControl,
} from "react-native";
import Octagon from "../../components/interface/Octagon";

// Context
import { useUser } from "../../context/UserContext";

// authService
import { signOut } from "../../lib/authService";

// Popups
import CreateGroupForm from "../../components/popups/CreateGroupForm";
import JoinGroupForm from "../../components/popups/JoinGroupForm";

// Balance
import { peekBalance } from "../../lib/BalanceService";

// Temas
import { themas } from "../../global/themes";

// responsividade
import {
  responsiveWidth,
  responsiveHeight,
} from "react-native-responsive-dimensions";

import { moderateScale } from "react-native-size-matters";

type LoadMode = "initial" | "silent" | "pull";

export default function Home() {
  const { profile, balance, refreshBalance } = useUser();
  const [showPopupCreateGroup, setShowPopupCreateGroup] = useState(false);
  const [showPopupJoinGroup, setShowPopupJoinGroup] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasVisited = useRef(false);
  console.log("balance", balance);

  const pressAnim = useRef(new Animated.Value(0)).current;
  const joinPressAnim = useRef(new Animated.Value(0)).current;

  const onPressIn = () => {
    Animated.timing(pressAnim, {
      toValue: 1,
      duration: 180,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  };

  const onPressOut = () => {
    Animated.timing(pressAnim, {
      toValue: 0,
      duration: 200,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  };

  const bgColor = pressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [themas.colors.hlpink, themas.colors.hlpinkmd],
  });

  const onJoinPressIn = () => {
    Animated.timing(joinPressAnim, {
      toValue: 1,
      duration: 180,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  };

  const onJoinPressOut = () => {
    Animated.timing(joinPressAnim, {
      toValue: 0,
      duration: 200,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  };

  const joinBgColor = joinPressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [themas.colors.hlblue, themas.colors.hlbluemd],
  });

  // fetchBalance | Exibe cache imediato e sincroniza via calculateBalance
  const fetchBalance = useCallback(
    async (mode: LoadMode = "initial") => {
      if (mode === "pull") {
        setRefreshing(true);
      }

      const cached = await peekBalance();

      if (mode !== "pull") {
        setError(null);
      }

      try {
        await refreshBalance();
      } catch (err) {
        if (!cached) {
          setError(
            err instanceof Error
              ? err.message
              : "Não foi possível carregar o saldo.",
          );
        }
      } finally {
        if (mode === "pull") {
          setRefreshing(false);
        }
      }
    },
    [refreshBalance],
  );

  useFocusEffect(
    useCallback(() => {
      fetchBalance(hasVisited.current ? "silent" : "initial");
      hasVisited.current = true;
    }, [fetchBalance]),
  );

  const refreshControl = (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={() => fetchBalance("pull")}
      colors={[themas.colors.hlpink, themas.colors.hlblue]}
      tintColor={themas.colors.hlpink}
    />
  );

  return (
    <>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          flexDirection: "column",
          alignItems: "center",
          flexGrow: 1,
        }}
        refreshControl={refreshControl}
        showsVerticalScrollIndicator
      >
        {/* INICIO HEADER */}
        {/*Logo simbolo*/}
        <View
          className="items-center justify-center absolute top-6 left-0 z-50"
          style={{ width: responsiveWidth(40), height: responsiveWidth(40) }}
        >
          {/* wrapper absoluto que cobre toda a view; Octagon fica em fluxo normal dentro dele */}
          <View className="absolute w-full h-full items-center justify-center z-0">
            <Octagon color="secondary" stroke="blackapp" strokeWidth={4} />
          </View>
          <Image
            source={Logo}
            style={{ width: responsiveWidth(20), height: responsiveWidth(20) }}
            className=" z-20"
            resizeMode="contain"
          />
        </View>
        {/*Logo simbolo FIM*/}
        {/*Fita de Inicio*/}
        <View
          style={{ height: responsiveHeight(16) }}
          className="w-full bg-secondary z-40 border-b-[12px] border-blackapp flex flex-row items-end justify-end pt-10 pb-5 px-10"
        >
          <Text className="text-blackapp text-2xl font-bold max-w-[60%] max-h-full w-fit">
            Olá, {profile?.name}!
          </Text>
        </View>
        {/*Fita de Inicio FIM*/}
        {/*Fita de Email*/}
        <View
          style={{ width: "100%", height: responsiveHeight(4) }}
          className="z-30"
        >
          {/* sombra sólida simulada — offset preto atrás do elemento */}
          <View
            style={{
              position: "absolute",
              top: 13,
              left: 0,
              right: 0,
              opacity: 0.4,
              height: responsiveHeight(4),
              backgroundColor: "#000",
            }}
          />

          <View
            style={{ height: responsiveHeight(4) }}
            className="w-full bg-hlpink border-b-[6px] border-blackapp flex items-end justify-center px-4"
          >
            <View
              style={{
                position: "absolute",
                top: -26,
                left: 0,
                right: 0,
                opacity: 0.4,
                height: responsiveHeight(4),
                backgroundColor: "#000",
              }}
            />
            <Text className="text-white text-ms font-extrabold">
              {profile?.email}
            </Text>
          </View>
        </View>
        {/*Fita de Email FIM*/}
        {/* FIM HEADER */}
        {/* INICIO CONTEÚDO */}
        {error ? (
          <Text className="text-blackapp text-center font-bold px-4 py-2">
            {error}
          </Text>
        ) : null}
        <View className="w-full h-fitz-20">
          {/* Zona Superior */}
          <View
            style={{ height: responsiveHeight(60) }}
            className="w-full flex flex-row"
          >
            <View className="w-[85%] h-full flex flex-col">
              <View
                style={{
                  position: "absolute",
                  top: 0,
                  right: 0,
                  opacity: 0.4,
                  width: responsiveWidth(2),
                  height: responsiveHeight(30),
                  backgroundColor: "#000",
                }}
                className="z-20"
              />
              {/* Quadrado topo*/}
              <View className="w-full h-[50%] flex flex-row items-center justify-center">
                {/* Area recorte do card do saldo */}
                <View
                  style={{
                    height: responsiveHeight(22),
                    width: responsiveWidth(70),
                  }}
                  className=" overflow-visible"
                >
                  {/* Card do saldo */}
                  <View
                    className="bg-white h-full w-full flex flex-col border-[6px] z-30 border-blackapp
                                  items-center justify-center px-4"
                  >
                    <View className="flex h-[50%] w-full flex-col items-start gap-1 py-4 pt-3">
                      <Text className="text-hlpink font-bold text-sm">
                        O quanto deve aos seus amigos !!!
                      </Text>
                      <Text className="text-hlpink font-bold text-2xl bg-zinc-200 py-[2px] px-[10px] relative">
                        {balance.devendo.toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })}
                      </Text>
                      <View
                        style={{
                          height: responsiveHeight(5),
                          width: responsiveHeight(5),
                        }}
                        className="absolute right-2.5 bottom-2 rotate-12"
                      >
                        <Image
                          source={PaiaSticker}
                          style={{ width: "100%", height: "100%" }}
                          resizeMode="contain"
                        />
                      </View>
                    </View>
                    <View className="h-[2px] flex w-full bg-blackapp/20" />
                    <View className="flex h-[50%] w-full flex-col items-start gap-1 py-3 pt-4">
                      <Text className="text-hlblue font-bold text-sm">
                        O quanto eles te devem...
                      </Text>
                      <Text className="text-hlblue font-bold text-2xl bg-zinc-200 py-[2px] px-[10px] relative">
                        {balance.areceber.toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })}
                      </Text>
                      <View
                        style={{
                          height: responsiveHeight(6),
                          width: responsiveHeight(6),
                        }}
                        className="absolute right-4 bottom-2 -rotate-6"
                      >
                        <Image
                          source={PoggersSticker}
                          style={{ width: "100%", height: "100%" }}
                          resizeMode="contain"
                        />
                      </View>
                    </View>
                  </View>
                  {/* Card do saldo FIM */}
                  <View
                    style={{
                      position: "absolute",
                      top: 12,
                      left: 10,
                      right: 0,
                      opacity: 0.4,
                      backgroundColor: "#000",
                    }}
                    className="z-20 w-full h-full"
                  />
                </View>
                {/* Area recorte do card do saldo FIM*/}
              </View>
              {/* Quadrado topo FIM*/}
              {/* Quadrado Meio | Botão Criar grupo*/}
              <View className="justify-center items-center w-full h-[50%] flex flex-row border-t-[10px] border-blackapp">
                <Pressable
                  onPressIn={onPressIn}
                  onPressOut={onPressOut}
                  style={{ width: "100%" }}
                  onPress={() => {
                    setShowPopupCreateGroup(true);
                  }}
                >
                  <Animated.View
                    style={{
                      backgroundColor: bgColor,
                      paddingVertical: 10,
                      paddingHorizontal: 40,
                      width: "100%",
                      alignItems: "center",
                      justifyContent: "center",
                      flexDirection: "row",
                    }}
                    className="border-b-[10px] border-blackapp relative"
                  >
                    <Text
                      style={{
                        fontSize: moderateScale(30),
                        height: responsiveHeight(10),
                        textAlign: "center",
                        textAlignVertical: "center",
                        color: "#fff",
                        fontWeight: "700",
                      }}
                    >
                      CRIAR GRUPO
                    </Text>
                  </Animated.View>
                </Pressable>
              </View>
              {/* Quadrado Meio | Botão Criar grupo FIM*/}
            </View>
            {/* Barra direita*/}
            <View className="w-[15%] h-full flex flex-col border-l-[10px] border-blackapp" />
            {/* Barra direita FIM*/}
          </View>
          {/* Zona Supeior FIM */}
          {/* Zona inferior */}
          <View
            style={{ height: responsiveHeight(20) }}
            className="w-full flex flex-row items-start justify-center border-t-[10px] border-blackapp"
          >
            <Pressable
              onPressIn={onJoinPressIn}
              onPressOut={onJoinPressOut}
              style={{ width: "100%" }}
              onPress={() => {
                setShowPopupJoinGroup(true);
              }}
            >
              <Animated.View
                style={{
                  backgroundColor: joinBgColor,
                  paddingVertical: 10,
                  paddingHorizontal: 40,
                  width: "100%",
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "row",
                }}
                className="border-b-[10px] border-blackapp relative"
              >
                <Text
                  style={{
                    fontSize: moderateScale(30),
                    height: responsiveHeight(10),
                    textAlign: "center",
                    textAlignVertical: "center",
                    color: "#fff",
                    fontWeight: "700",
                  }}
                >
                  ACEITAR CONVITE
                </Text>
              </Animated.View>
            </Pressable>
          </View>
          {/* Zona inferior FIM */}
        </View>
        {/* FIM CONTEÚDO */}
      </ScrollView>
      <CreateGroupForm
        visible={showPopupCreateGroup}
        onClose={() => setShowPopupCreateGroup(false)}
      />
      <JoinGroupForm
        visible={showPopupJoinGroup}
        onClose={() => setShowPopupJoinGroup(false)}
      />
    </>
  );
}
