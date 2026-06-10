// React Navigation
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";

// React
import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";

// Lucide
import { Undo2, Siren, User, Plus, CircleUser } from "lucide-react-native";

// Stack
import { GruposStackParamList } from "../GruposStack";

// React Native
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  RefreshControl,
} from "react-native";

// Responsividade
import {
  responsiveHeight,
  responsiveWidth,
} from "react-native-responsive-dimensions";

// Temas
import { themas } from "../../../global/themes";

// Cache
import { areCacheEqual } from "../../../lib/cacheService";

// Context
import { useUser } from "../../../context/UserContext";

// Balance
import { invalidateGroupBalanceCache } from "../../../lib/BalanceService";

// GroupService
import {
  calculateGroupInfo,
  deleteGroup,
  leaveGroup,
  peekGroupInfo,
  type GroupExpenseInfo,
  type GroupInfo,
  type GroupMemberInfo,
} from "../../../lib/GroupService";

// Popups
import AddExpenseForm from "../../../components/popups/AddExpenseForm";

type Props = NativeStackScreenProps<GruposStackParamList, "DetalheGrupo">;

type LoadMode = "initial" | "silent" | "pull";

type ExpenseListVariant = "default" | "own" | "completed";

type ExpenseListItemProps = {
  expense: GroupExpenseInfo;
  payer: { name: string; avatar_url: string | null };
  variant: ExpenseListVariant;
  isOwnExpense: boolean;
  onPress: () => void;
};

type AnimatedActionButtonProps = {
  baseColor: string;
  pressedColor: string;
  height: number;
  width: number;
  onPress: () => void;
  disabled?: boolean;
  borderClassName?: string;
  children: ReactNode;
};

// AnimatedActionButton | Botão com animação para cor md ao pressionar
function AnimatedActionButton({
  baseColor,
  pressedColor,
  height,
  width,
  onPress,
  disabled = false,
  borderClassName = "border-b-[4px] border-blackapp",
  children,
}: AnimatedActionButtonProps) {
  const pressAnim = useRef(new Animated.Value(0)).current;

  const bgColor = pressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [baseColor, pressedColor],
  });

  // onPressIn | Anima botão para cor pressionada
  const onPressIn = () => {
    Animated.timing(pressAnim, {
      toValue: 1,
      duration: 180,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  };

  // onPressOut | Restaura cor do botão
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
      disabled={disabled}
      style={{ height, width }}
    >
      <Animated.View
        style={{
          backgroundColor: bgColor,
          height,
          width,
        }}
        className={`flex flex-row items-center justify-center relative ${borderClassName}`}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}

type AnimatedPlusButtonProps = {
  onPress: () => void;
  disabled?: boolean;
};

// AnimatedPlusButton | Botão + do cabeçalho com animação primary → mdprimary
function AnimatedPlusButton({
  onPress,
  disabled = false,
}: AnimatedPlusButtonProps) {
  const pressAnim = useRef(new Animated.Value(0)).current;

  const bgColor = pressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [themas.colors.primary, themas.colors.mdprimary],
  });

  // onPressIn | Anima botão + para cor pressionada
  const onPressIn = () => {
    Animated.timing(pressAnim, {
      toValue: 1,
      duration: 180,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  };

  // onPressOut | Restaura cor do botão +
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
      disabled={disabled}
      style={{ aspectRatio: 1 }}
      className="absolute left-0 h-[101%]"
    >
      <Animated.View
        style={{ backgroundColor: bgColor }}
        className="h-full w-full border-l-[6px] border-r-[6px] border-blackapp flex items-center justify-center"
      >
        <Plus size={40} color="#fff" />
      </Animated.View>
    </Pressable>
  );
}

// formatGroupDate | Formata data de criação para leitura
function formatGroupDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

// formatExpenseDate | Formata data da despesa
function formatExpenseDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// formatCurrency | Formata valor monetário
function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

// sortByCreatedAtDesc | Ordena despesas da mais recente para a mais antiga
function sortByCreatedAtDesc(
  left: GroupExpenseInfo,
  right: GroupExpenseInfo,
): number {
  return (
    new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
  );
}

// sortByCreatedAtAsc | Ordena despesas da mais antiga para a mais recente
function sortByCreatedAtAsc(
  left: GroupExpenseInfo,
  right: GroupExpenseInfo,
): number {
  return (
    new Date(left.created_at).getTime() - new Date(right.created_at).getTime()
  );
}

// filterVisibleExpenses | Oculta despesas anteriores à entrada do membro no grupo
function filterVisibleExpenses(
  expenses: GroupExpenseInfo[],
  members: GroupMemberInfo[],
  userId: string | undefined,
): GroupExpenseInfo[] {
  if (!userId) return expenses;

  const member = members.find((item) => item.user_id === userId);
  if (!member) return expenses;

  const joinedAt = new Date(member.joined_at).getTime();

  return expenses.filter(
    (expense) => new Date(expense.created_at).getTime() >= joinedAt,
  );
}

// sortGroupExpenses | Despesas alheias por data; próprias por último em ordem de criação
function sortGroupExpenses(
  expenses: GroupExpenseInfo[],
  userId: string | undefined,
): GroupExpenseInfo[] {
  const otherExpenses = expenses.filter(
    (expense) => expense.paid_by !== userId,
  );
  const ownExpenses = expenses.filter((expense) => expense.paid_by === userId);

  return [
    ...otherExpenses.sort(sortByCreatedAtDesc),
    ...ownExpenses.sort(sortByCreatedAtAsc),
  ];
}

// resolveExpenseListVariant | Define cor do item conforme dono e status de pagamento
function resolveExpenseListVariant(
  expense: GroupExpenseInfo,
  userId: string | undefined,
): ExpenseListVariant {
  if (expense.payments_faltantes === 0) return "completed";
  if (expense.paid_by === userId) return "own";
  return "default";
}

// resolvePayer | Obtém nome e avatar de quem pagou a despesa
function resolvePayer(
  paidBy: string,
  members: GroupMemberInfo[],
): { name: string; avatar_url: string | null } {
  const member = members.find((item) => item.user_id === paidBy);

  return {
    name: member?.name ?? "Desconhecido",
    avatar_url: member?.avatar_url ?? null,
  };
}

// ExpenseListItem | Botão de despesa na lista
function ExpenseListItem({
  expense,
  payer,
  variant,
  isOwnExpense,
  onPress,
}: ExpenseListItemProps) {
  const isColored = variant !== "default";
  const backgroundClassName =
    variant === "completed"
      ? "bg-gray-400"
      : variant === "own"
        ? "bg-mdprimary"
        : "bg-white";
  const titleClassName = isColored ? "text-white" : "text-blackapp";
  const subtitleClassName = isColored ? "text-white/90" : "text-blackapp";
  const metaClassName = isColored ? "text-white/80" : "text-blackapp/70";
  const dateClassName = isColored ? "text-white/70" : "text-blackapp/60";
  const valueClassName = isColored
    ? "text-white font-bold"
    : "text-hlblue font-bold";

  return (
    <Pressable
      onPress={onPress}
      className={`w-full flex-row items-center gap-3 px-4 py-5 pb-10 border-t-[2px] border-blackapp/20 ${backgroundClassName}`}
    >
      {payer.avatar_url ? (
        <Image
          source={{ uri: payer.avatar_url }}
          className="w-10 h-10 rounded-full bg-zinc-200"
        />
      ) : (
        <View className="w-10 h-10 rounded-full bg-zinc-300 items-center justify-center">
          <Text className="text-blackapp font-bold text-sm">
            {payer.name.charAt(0).toUpperCase()}
          </Text>
        </View>
      )}

      <View className="flex-1">
        <View className="flex-row items-center gap-1.5">
          <Text
            className={`${titleClassName} font-bold text-sm shrink`}
            numberOfLines={1}
          >
            {payer.name}
          </Text>
          {isOwnExpense ? (
            <CircleUser
              size={14}
              color={isColored ? "#fff" : themas.colors.blackapp}
            />
          ) : null}
        </View>
        <Text
          className={`${subtitleClassName} text-xs mt-0.5`}
          numberOfLines={1}
        >
          {expense.description}
        </Text>
        <Text className={`${valueClassName} text-xs mt-1`}>
          {formatCurrency(expense.val_por_participante)} / participante
        </Text>
        <Text className={`${metaClassName} text-xs mt-0.5`}>
          Pagos: {expense.payments_feitos} · Faltam:{" "}
          {expense.payments_faltantes}
        </Text>
        <Text className={`${dateClassName} text-xs mt-0.5`}>
          {formatExpenseDate(expense.created_at)}
        </Text>
      </View>
    </Pressable>
  );
}

// DetalheGrupo | Detalhes, despesas e ações do grupo
export default function DetalheGrupo({ navigation, route }: Props) {
  const { groupId } = route.params;
  const { profile } = useUser();
  const [groupInfo, setGroupInfo] = useState<GroupInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const hasVisited = useRef(false);

  const isCreator = groupInfo?.group.created_by === profile?.id;

  // fetchGroupInfo | Exibe cache imediato e sincroniza via calculateGroupInfo
  const fetchGroupInfo = useCallback(
    async (mode: LoadMode = "initial") => {
      if (mode === "pull") {
        setRefreshing(true);
      }

      const cached = await peekGroupInfo(groupId);

      if (mode === "initial") {
        if (cached) {
          setGroupInfo(cached);
          setLoading(false);
        } else {
          setLoading(true);
        }
      }

      if (mode !== "pull") {
        setError(null);
      }

      try {
        const fresh = await calculateGroupInfo(groupId);
        setGroupInfo((prev) => (areCacheEqual(prev, fresh) ? prev : fresh));
      } catch (err) {
        if (!cached) {
          setError(
            err instanceof Error
              ? err.message
              : "Não foi possível carregar as despesas.",
          );
        }
      } finally {
        setLoading(false);
        if (mode === "pull") {
          setRefreshing(false);
        }
      }
    },
    [groupId],
  );

  useFocusEffect(
    useCallback(() => {
      fetchGroupInfo(hasVisited.current ? "silent" : "initial");
      hasVisited.current = true;
    }, [fetchGroupInfo]),
  );

  const members = groupInfo?.members ?? [];
  const expenses = groupInfo?.expenses ?? [];
  const visibleExpenses = useMemo(
    () => filterVisibleExpenses(expenses, members, profile?.id),
    [expenses, members, profile?.id],
  );
  const sortedExpenses = useMemo(
    () => sortGroupExpenses(visibleExpenses, profile?.id),
    [visibleExpenses, profile?.id],
  );

  const refreshControl = (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={() => fetchGroupInfo("pull")}
      colors={[themas.colors.hlpink, themas.colors.hlblue]}
      tintColor={themas.colors.hlpink}
    />
  );

  const payerMap = useMemo(
    () =>
      Object.fromEntries(
        members.map((member) => [
          member.user_id,
          { name: member.name, avatar_url: member.avatar_url },
        ]),
      ),
    [members],
  );

  // handleLeaveOrDelete | Confirma e executa saída ou exclusão do grupo
  const handleLeaveOrDelete = () => {
    if (!groupInfo || actionLoading) return;

    const title = isCreator ? "Excluir grupo" : "Sair do grupo";
    const message = isCreator
      ? "Tem certeza que deseja excluir este grupo? Essa ação não pode ser desfeita."
      : "Tem certeza que deseja sair deste grupo?";
    const actionLabel = isCreator ? "Excluir" : "Sair";

    Alert.alert(title, message, [
      { text: "Cancelar", style: "cancel" },
      {
        text: actionLabel,
        style: "destructive",
        onPress: async () => {
          setActionLoading(true);

          try {
            if (isCreator) {
              await deleteGroup(groupId);
            } else {
              await leaveGroup(groupId);
            }

            await invalidateGroupBalanceCache(groupId);
            navigation.navigate("GruposMain");
          } catch (err) {
            Alert.alert(
              "Erro",
              err instanceof Error
                ? err.message
                : "Não foi possível concluir a ação.",
            );
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

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
      <View className="flex-1 w-full border-t-[8px] border-blackapp">
        <View className="h-full w-full flex flex-col items-stretch justify-start border-b-[8px] border-blackapp">
          {/* INICIO CABEÇALHO */}
          <View className="w-full border-b-[8px] border-blackapp flex items-end justify-center px-6 relative">
            {loading && !groupInfo ? (
              <ActivityIndicator size="small" color={themas.colors.hlpink} />
            ) : (
              <>
                <AnimatedPlusButton
                  onPress={() => setShowAddExpense(true)}
                  disabled={!groupInfo}
                />
                <Text className="font-bold text-2xl text-center pt-4">
                  {groupInfo?.group.name ?? "Grupo"}
                </Text>
                {groupInfo?.group.created_at ? (
                  <Text className="text-mdprimary text-sm mt-1 text-center pb-4">
                    Criado em {formatGroupDate(groupInfo.group.created_at)}
                  </Text>
                ) : null}
              </>
            )}
          </View>
          {/* FIM CABEÇALHO */}

          <View
            className="flex-1 w-full flex flex-col items-stretch justify-start"
            style={{ minHeight: 0 }}
          >
            {/* INICIO AÇÕES */}
            <AnimatedActionButton
              baseColor={themas.colors.hlblue}
              pressedColor={themas.colors.hlbluemd}
              height={responsiveHeight(10)}
              width={responsiveWidth(100)}
              onPress={() => {
                if (!groupInfo) return;
                navigation.navigate("MembrosGrupo", {
                  groupId,
                  groupName: groupInfo.group.name,
                  members,
                  createdBy: groupInfo.group.created_by,
                });
              }}
              disabled={!groupInfo}
            >
              <User size={40} color="#fff" className="absolute left-6 mb-1" />
              <Text className="text-xl text-white font-semibold">
                VER MEMBROS
              </Text>
            </AnimatedActionButton>

            <AnimatedActionButton
              baseColor={themas.colors.hlpink}
              pressedColor={themas.colors.hlpinkmd}
              height={responsiveHeight(10)}
              width={responsiveWidth(100)}
              onPress={handleLeaveOrDelete}
              disabled={!groupInfo || actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Siren
                    size={42}
                    color="#fff"
                    className="absolute left-6 mb-1"
                  />
                  <Text className="text-xl text-white font-semibold">
                    {isCreator ? "EXCLUIR GRUPO" : "SAIR DO GRUPO"}
                  </Text>
                </>
              )}
            </AnimatedActionButton>
            {/* FIM AÇÕES */}

            {/* INICIO LISTA DESPESAS */}
            {loading && !groupInfo ? (
              <View className="flex-1 w-full items-center justify-center">
                <ActivityIndicator size="large" color={themas.colors.primary} />
              </View>
            ) : error && !groupInfo ? (
              <ScrollView
                style={{ flex: 1, width: "100%" }}
                contentContainerStyle={{
                  flexGrow: 1,
                  justifyContent: "center",
                  width: "100%",
                }}
                refreshControl={refreshControl}
              >
                <Text className="text-blackapp text-center font-bold px-4">
                  {error}
                </Text>
              </ScrollView>
            ) : (
              <ScrollView
                style={{ flex: 1, width: "100%" }}
                contentContainerStyle={{
                  flexGrow: sortedExpenses.length === 0 ? 1 : undefined,
                  justifyContent:
                    sortedExpenses.length === 0 ? "center" : undefined,
                  width: "100%",
                }}
                refreshControl={refreshControl}
                showsVerticalScrollIndicator
              >
                {sortedExpenses.length === 0 ? (
                  <Text className="text-blackapp text-center font-bold py-8 px-4">
                    Nenhuma despesa registrada.
                  </Text>
                ) : (
                  sortedExpenses.map((expense) => (
                    <ExpenseListItem
                      key={expense.id}
                      expense={expense}
                      variant={resolveExpenseListVariant(expense, profile?.id)}
                      isOwnExpense={expense.paid_by === profile?.id}
                      payer={
                        payerMap[expense.paid_by] ??
                        resolvePayer(expense.paid_by, members)
                      }
                      onPress={() =>
                        navigation.navigate("DetalheExpense", {
                          groupId,
                          expenseId: expense.id,
                        })
                      }
                    />
                  ))
                )}
              </ScrollView>
            )}
            {/* FIM LISTA DESPESAS */}
          </View>
        </View>
      </View>
      {/* FIM CONTEÚDO */}

      {/* INICIO RODAPÉ */}
      <View
        style={{
          height: responsiveHeight(10),
          width: responsiveWidth(100),
        }}
      >
        <AnimatedActionButton
          baseColor={themas.colors.primary}
          pressedColor={themas.colors.mdprimary}
          height={responsiveHeight(8)}
          width={responsiveWidth(100)}
          borderClassName="border-b-[8px] border-blackapp"
          onPress={() => navigation.navigate("GruposMain")}
        >
          <Undo2 size={40} color="#fff" className="left-6 absolute mb-0.5" />
          <Text className="text-2xl text-white font-bold">VOLTAR</Text>
        </AnimatedActionButton>
      </View>
      {/* FIM RODAPÉ */}

      {/* INICIO POPUP */}
      <AddExpenseForm
        visible={showAddExpense}
        onClose={() => setShowAddExpense(false)}
        groupId={groupId}
        onSuccess={() => fetchGroupInfo("silent")}
      />
      {/* FIM POPUP */}
    </View>
  );
}
