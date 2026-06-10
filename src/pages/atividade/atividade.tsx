import React, { useCallback, useRef, useState } from "react";

// React Navigation
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

// React Native
import {
  Text,
  View,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from "react-native";

// Lucide
import { HandCoins, Receipt } from "lucide-react-native";

// Responsividade
import {
  responsiveWidth,
  responsiveHeight,
} from "react-native-responsive-dimensions";

// Temas
import { themas } from "../../global/themes";

// Cache
import { areCacheEqual } from "../../lib/cacheService";

// ActivityService
import {
  buildActivityList,
  calculateActivityFeed,
  peekActivityFeed,
  type ActivityListItem,
  type GroupNameMap,
} from "../../lib/ActivityService";

// GroupService
import { calculateGroupsList, peekGroupsList } from "../../lib/GroupService";

// Stack
import { AtividadeStackParamList } from "./AtividadeStack";

type NavigationProp = NativeStackNavigationProp<
  AtividadeStackParamList,
  "AtividadeMain"
>;

type LoadMode = "initial" | "silent" | "pull";

type ActivityListItemProps = {
  item: ActivityListItem;
  onPress: () => void;
};

// buildGroupNameMap | Monta mapa id -> nome a partir da listagem de grupos
function buildGroupNameMap(
  groups: { id: string; name: string }[],
): GroupNameMap {
  return Object.fromEntries(groups.map((group) => [group.id, group.name]));
}

// formatCurrency | Formata valor monetário
function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

// formatActivityListDate | Formata data para exibição na lista
function formatActivityListDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// ActivityListItemRow | Item de atividade com ícone, valor, data e grupo
function ActivityListItemRow({ item, onPress }: ActivityListItemProps) {
  const isExpense = item.type === "expense";

  return (
    <Pressable
      onPress={onPress}
      className="w-full flex-row items-center gap-3 px-4 py-3 border-b-[3px] border-blackapp/20 bg-white"
    >
      <View
        className={`w-10 h-10 rounded-full items-center justify-center shrink-0 ${
          isExpense ? "bg-hlpink" : "bg-hlblue"
        }`}
      >
        {isExpense ? (
          <Receipt size={20} color="#fff" />
        ) : (
          <HandCoins size={20} color="#fff" />
        )}
      </View>

      <View className="flex-1">
        <Text className="text-hlblue font-bold text-sm">
          {formatCurrency(item.amount)}
        </Text>
        <Text className="text-blackapp/60 text-xs mt-0.5">
          {isExpense ? "Despesa" : "Pagamento"} ·{" "}
          {formatActivityListDate(item.created_at)}
        </Text>
      </View>

      <Text
        className="text-blackapp font-bold text-xs text-right max-w-[38%]"
        numberOfLines={2}
      >
        {item.group_name}
      </Text>
    </Pressable>
  );
}

// Atividade | Feed de despesas e pagamentos recentes do usuário
export default function Atividade() {
  const navigation = useNavigation<NavigationProp>();
  const [activities, setActivities] = useState<ActivityListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasVisited = useRef(false);

  // resolveGroupNames | Obtém nomes dos grupos do cache ou da rede no pull
  const resolveGroupNames = useCallback(
    async (mode: LoadMode): Promise<GroupNameMap> => {
      const cachedGroups = await peekGroupsList();
      let groupNames = buildGroupNameMap(cachedGroups ?? []);

      if (mode === "pull") {
        try {
          const freshGroups = await calculateGroupsList();
          groupNames = buildGroupNameMap(freshGroups);
        } catch {
          // Mantém nomes do cache se a sincronização de grupos falhar
        }
      }

      return groupNames;
    },
    [],
  );

  // fetchActivities | Exibe cache imediato e sincroniza via calculateActivityFeed
  const fetchActivities = useCallback(
    async (mode: LoadMode = "initial") => {
      if (mode === "pull") {
        setRefreshing(true);
      }

      const [cached, groupNames] = await Promise.all([
        peekActivityFeed(),
        resolveGroupNames(mode),
      ]);
      const cachedList = cached ? buildActivityList(cached, groupNames) : null;

      if (mode === "initial") {
        if (cachedList) {
          setActivities(cachedList);
          setLoading(false);
        } else {
          setLoading(true);
        }
      }

      if (mode !== "pull") {
        setError(null);
      }

      try {
        const fresh = await calculateActivityFeed();
        const freshGroupNames = await resolveGroupNames(mode);
        const freshList = buildActivityList(fresh, freshGroupNames);
        setActivities((prev) =>
          areCacheEqual(prev, freshList) ? prev : freshList,
        );
      } catch (err) {
        if (!cachedList?.length) {
          setError(
            err instanceof Error
              ? err.message
              : "Não foi possível carregar as atividades.",
          );
        }
      } finally {
        setLoading(false);
        if (mode === "pull") {
          setRefreshing(false);
        }
      }
    },
    [resolveGroupNames],
  );

  useFocusEffect(
    useCallback(() => {
      fetchActivities(hasVisited.current ? "silent" : "initial");
      hasVisited.current = true;
    }, [fetchActivities]),
  );

  const refreshControl = (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={() => fetchActivities("pull")}
      colors={[themas.colors.hlpink, themas.colors.hlblue]}
      tintColor={themas.colors.hlpink}
    />
  );

  const showInitialLoader = loading && activities.length === 0 && !error;

  return (
    <View className="flex-1 flex flex-col items-center justify-center">
      {/* INICIO ESPAÇAMENTO SUPERIOR */}
      <View
        style={{
          height: responsiveHeight(5),
          width: responsiveWidth(100),
        }}
      />
      {/* FIM ESPAÇAMENTO SUPERIOR */}
      {/* INICIO CONTEÚDO */}
      <View className="flex-1 flex flex-row items-center justify-center border-t-[8px] border-blackapp">
        <View
          style={{ width: responsiveWidth(20) }}
          className="h-full border-r-[8px] border-b-[8px] border-blackapp"
        />
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
          <View className="flex-1 w-full flex flex-col items-center justify-start">
            <ScrollView
              className="flex-1 w-full"
              contentContainerStyle={{
                flexGrow: 1,
                justifyContent:
                  showInitialLoader || (error && activities.length === 0)
                    ? "center"
                    : activities.length === 0
                      ? "center"
                      : undefined,
              }}
              refreshControl={refreshControl}
              showsVerticalScrollIndicator
            >
              {showInitialLoader ? (
                <ActivityIndicator size="large" color={themas.colors.primary} />
              ) : error && activities.length === 0 ? (
                <Text className="text-blackapp text-center font-bold px-4">
                  {error}
                </Text>
              ) : activities.length === 0 ? (
                <Text className="text-blackapp text-center font-bold py-8 px-4">
                  Nenhuma atividade recente.
                </Text>
              ) : (
                activities.map((item) => (
                  <ActivityListItemRow
                    key={`${item.type}-${item.id}`}
                    item={item}
                    onPress={() =>
                      navigation.navigate("DetalheAtividade", {
                        activityId: item.id,
                        activityType: item.type,
                      })
                    }
                  />
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </View>
      {/* FIM CONTEÚDO */}
      {/* INICIO ESPAÇAMENTO INFERIOR */}
      <View
        style={{
          height: responsiveHeight(5),
          width: responsiveWidth(100),
        }}
      />
      {/* FIM ESPAÇAMENTO INFERIOR */}
    </View>
  );
}
