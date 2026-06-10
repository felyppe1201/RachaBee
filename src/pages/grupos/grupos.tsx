import React, { useCallback, useEffect, useRef, useState } from "react";

// React Navigation
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

// React Native
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Animated,
  Easing,
  ActivityIndicator,
  RefreshControl,
} from "react-native";

// Lucide
import { Users } from "lucide-react-native";

// Responsividade
import {
  responsiveWidth,
  responsiveHeight,
} from "react-native-responsive-dimensions";

// Temas
import { themas } from "../../global/themes";

// Cache
import { areCacheEqual } from "../../lib/cacheService";

// Balance
import {
  calculateGroupBalance,
  peekGroupBalance,
} from "../../lib/BalanceService";

// Context
import type { UserBalance } from "../../context/UserContext";

// GroupService
import {
  calculateGroupsList,
  peekGroupsList,
  type GroupWithCreator,
} from "../../lib/GroupService";

// Stack
import { GruposStackParamList } from "./GruposStack";

type NavigationProp = NativeStackNavigationProp<
  GruposStackParamList,
  "GruposMain"
>;

type LoadMode = "initial" | "silent" | "pull";

type GroupListButtonProps = {
  group: GroupWithCreator;
  index: number;
  syncToken: number;
  onPress: () => void;
};

// formatBalanceValue | Formata valor monetário compacto para o badge
function formatBalanceValue(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

type GroupBalanceBadgeProps = {
  groupId: string;
  syncToken: number;
};

// GroupBalanceBadge | Exibe balance do grupo com peek + calculate
function GroupBalanceBadge({ groupId, syncToken }: GroupBalanceBadgeProps) {
  const [balance, setBalance] = useState<UserBalance>({
    devendo: 0,
    areceber: 0,
  });

  useEffect(() => {
    let cancelled = false;

    async function loadBalance() {
      const cached = await peekGroupBalance(groupId);
      if (cached && !cancelled) {
        setBalance(cached);
      }

      const fresh = await calculateGroupBalance(groupId);
      if (!cancelled) {
        setBalance((prev) => (areCacheEqual(prev, fresh) ? prev : fresh));
      }
    }

    loadBalance();

    return () => {
      cancelled = true;
    };
  }, [groupId, syncToken]);

  return (
    <View className="w-36 h-12 shadow-black shadow-inner bg-white/90 place-self-end justify-between items-center px-4 flex flex-row">
      <Text
        className="text-red-500 text-[11px] font-extrabold leading-tight mr-1"
        numberOfLines={1}
      >
        - {formatBalanceValue(balance.devendo)}
      </Text>
      <Text
        className="text-green-500 text-[11px] font-extrabold leading-tight ml-1"
        numberOfLines={1}
      >
        + {formatBalanceValue(balance.areceber)}
      </Text>
    </View>
  );
}

// GroupListButton | Item da lista com cor alternada e efeito de pressão
function GroupListButton({
  group,
  index,
  syncToken,
  onPress,
}: GroupListButtonProps) {
  const pressAnim = useRef(new Animated.Value(0)).current;
  const isPink = index % 2 === 0;

  const bgColor = pressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [
      isPink ? themas.colors.hlpink : themas.colors.hlblue,
      isPink ? themas.colors.hlpinkmd : themas.colors.hlbluemd,
    ],
  });

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

  return (
    <Pressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={{ width: "100%" }}
    >
      <Animated.View
        style={{ backgroundColor: bgColor }}
        className="w-full flex flex-row px-4 py-3 border-b-[4px] border-blackapp"
      >
        <View className="flex-1 flex flex-col">
          <Text className="text-white font-bold text-base" numberOfLines={1}>
            {group.name}
          </Text>
          <Text className="text-white text-sm mt-1" numberOfLines={1}>
            Criado por {group.creatorName}
          </Text>
        </View>
        <GroupBalanceBadge groupId={group.id} syncToken={syncToken} />
      </Animated.View>
    </Pressable>
  );
}

// Grupos | Lista de grupos do usuário autenticado
export default function Grupos() {
  const navigation = useNavigation<NavigationProp>();
  const [groups, setGroups] = useState<GroupWithCreator[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncToken, setSyncToken] = useState(0);
  const hasVisited = useRef(false);

  // fetchGroups | Exibe cache imediato e sincroniza via calculateGroupsList
  const fetchGroups = useCallback(async (mode: LoadMode = "initial") => {
    if (mode === "pull") {
      setRefreshing(true);
    }

    const cached = await peekGroupsList();

    if (mode === "initial") {
      if (cached) {
        setGroups(cached);
        setLoading(false);
      } else {
        setLoading(true);
      }
    }

    if (mode !== "pull") {
      setError(null);
    }

    try {
      const fresh = await calculateGroupsList();
      setGroups((prev) => (areCacheEqual(prev, fresh) ? prev : fresh));
    } catch (err) {
      if (!cached?.length) {
        setError(
          err instanceof Error
            ? err.message
            : "Não foi possível carregar os grupos.",
        );
      }
    } finally {
      setLoading(false);
      setSyncToken((prev) => prev + 1);
      if (mode === "pull") {
        setRefreshing(false);
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchGroups(hasVisited.current ? "silent" : "initial");
      hasVisited.current = true;
    }, [fetchGroups]),
  );

  const refreshControl = (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={() => fetchGroups("pull")}
      colors={[themas.colors.hlpink, themas.colors.hlblue]}
      tintColor={themas.colors.hlpink}
    />
  );

  return (
    <View className="flex-1 flex flex-col items-center justify-center">
      <View
        style={{
          height: responsiveHeight(5),
          width: responsiveWidth(100),
        }}
      />
      <View className="flex-1 flex flex-row items-center justify-center border-t-[8px] border-blackapp">
        <View
          style={{ width: responsiveWidth(80) }}
          className="h-full flex flex-col items-center justify-start border-b-[8px] border-blackapp"
        >
          <View
            style={{
              width: responsiveWidth(80),
              height: responsiveHeight(10),
            }}
            className="border-b-[8px] border-blackapp"
          />
          <View className="flex-1 w-full">
            {loading && groups.length === 0 ? (
              <View className="flex-1 items-center justify-center">
                <ActivityIndicator size="large" color={themas.colors.primary} />
              </View>
            ) : error && groups.length === 0 ? (
              <ScrollView
                className="flex-1 w-full"
                contentContainerStyle={{
                  flexGrow: 1,
                  justifyContent: "center",
                }}
                refreshControl={refreshControl}
              >
                <Text className="text-blackapp text-center font-bold px-4">
                  {error}
                </Text>
              </ScrollView>
            ) : (
              <ScrollView
                className="flex-1 w-full"
                contentContainerStyle={{
                  gap: 8,
                  paddingVertical: 8,
                  flexGrow: groups.length === 0 ? 1 : undefined,
                  justifyContent: groups.length === 0 ? "center" : undefined,
                }}
                refreshControl={refreshControl}
                showsVerticalScrollIndicator
              >
                {groups.length === 0 ? (
                  <View className="flex-1 items-center justify-center flex-col gap-4">
                    <Users size={64} color={themas.colors.blackapp} />
                    <Text className="text-blackapp text-xl text-center font-bold px-4">
                      Nenhum grupo encontrado
                    </Text>
                  </View>
                ) : (
                  groups.map((group, index) => (
                    <GroupListButton
                      key={group.id}
                      group={group}
                      index={index}
                      syncToken={syncToken}
                      onPress={() =>
                        navigation.navigate("DetalheGrupo", {
                          groupId: group.id,
                        })
                      }
                    />
                  ))
                )}
              </ScrollView>
            )}
          </View>
        </View>
        <View
          style={{ width: responsiveWidth(20) }}
          className="h-full border-l-[8px] border-b-[8px] border-blackapp"
        />
      </View>
      <View
        style={{
          height: responsiveHeight(5),
          width: responsiveWidth(100),
        }}
      />
    </View>
  );
}
