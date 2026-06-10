// React Navigation
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";

// React
import { useCallback, useRef, useState, type ReactNode } from "react";

// Lucide
import { Undo2, X, Check, ImagePlus } from "lucide-react-native";

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
  Modal,
} from "react-native";

// Expo
import * as ImagePicker from "expo-image-picker";

// Responsividade
import {
  responsiveHeight,
  responsiveWidth,
} from "react-native-responsive-dimensions";

// Stack
import { GruposStackParamList } from "../GruposStack";

// Temas
import { themas } from "../../../global/themes";

// Cache
import { areCacheEqual } from "../../../lib/cacheService";

// Context
import { useUser } from "../../../context/UserContext";

// GroupService
import {
  calculateGroupInfo,
  getPaymentsByExpense,
  peekGroupInfo,
  type ExpensePayment,
  type GroupExpenseInfo,
  type GroupInfo,
  type GroupMemberInfo,
} from "../../../lib/GroupService";

// ExpenseService
import { createPayment, deleteExpense } from "../../../lib/ExpenseService";

type Props = NativeStackScreenProps<GruposStackParamList, "DetalheExpense">;

type LoadMode = "initial" | "silent";

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

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatExpenseDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function resolveExpense(
  groupInfo: GroupInfo | null,
  expenseId: string,
): GroupExpenseInfo | null {
  return groupInfo?.expenses.find((item) => item.id === expenseId) ?? null;
}

function resolvePayer(
  paidBy: string,
  members: GroupMemberInfo[],
): { name: string; avatar_url: string | null } {
  const member = members.find((m) => m.user_id === paidBy);
  return { name: member?.name ?? "Desconhecido", avatar_url: member?.avatar_url ?? null };
}

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
      disabled={disabled}
      style={{ height, width }}
    >
      <Animated.View
        style={{ backgroundColor: bgColor, height, width }}
        className={`flex flex-row items-center justify-center relative ${borderClassName}`}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}

type ExpenseDetailFieldProps = { label: string; value: string };

function ExpenseDetailField({ label, value }: ExpenseDetailFieldProps) {
  return (
    <View className="w-full gap-1">
      <Text className="text-sm text-blackapp font-bold">{label}</Text>
      <Text className="text-base text-blackapp font-medium border-[3px] border-blackapp p-2">
        {value}
      </Text>
    </View>
  );
}

type ReceiptThumbnailProps = { receiptUrl: string; onPress: () => void };

function ReceiptThumbnail({ receiptUrl, onPress }: ReceiptThumbnailProps) {
  const thumbnailSize = responsiveWidth(28);
  return (
    <Pressable onPress={onPress} className="self-start">
      <View
        style={{ width: thumbnailSize, height: thumbnailSize }}
        className="border-[3px] border-blackapp overflow-hidden bg-zinc-100"
      >
        <Image
          source={{ uri: receiptUrl }}
          style={{ width: "100%", height: "100%" }}
          resizeMode="cover"
        />
      </View>
      <Text className="text-xs text-blackapp/70 mt-1">Toque para ampliar</Text>
    </Pressable>
  );
}

export default function DetalheExpense({ navigation, route }: Props) {
  const { groupId, expenseId } = route.params;
  const { profile } = useUser();
  const [groupInfo, setGroupInfo] = useState<GroupInfo | null>(null);
  const [payments, setPayments] = useState<ExpensePayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showFullscreenReceipt, setShowFullscreenReceipt] = useState(false);
  const hasVisited = useRef(false);

  const expense = resolveExpense(groupInfo, expenseId);
  const members = groupInfo?.members ?? [];
  const payer = expense ? resolvePayer(expense.paid_by, members) : null;

  const isCreator = Boolean(profile?.id && expense?.paid_by === profile.id);
  const hasCurrentUserPaid = payments.some((p) => p.paid_by === profile?.id);
  const allPaid = expense ? expense.payments_faltantes === 0 : false;
  const showCloseButton = isCreator && allPaid && Boolean(expense);
  const showPayButton = !isCreator && !hasCurrentUserPaid && Boolean(expense);
  const showExtraButton = showCloseButton || showPayButton;

  const fetchGroupInfo = useCallback(
    async (mode: LoadMode = "initial") => {
      const cached = await peekGroupInfo(groupId);

      if (mode === "initial") {
        if (cached) {
          setGroupInfo(cached);
          setLoading(false);
        } else {
          setLoading(true);
        }
      }

      try {
        const fresh = await calculateGroupInfo(groupId);
        setGroupInfo((prev) => (areCacheEqual(prev, fresh) ? prev : fresh));
      } finally {
        setLoading(false);
      }
    },
    [groupId],
  );

  const fetchPayments = useCallback(async () => {
    try {
      const fresh = await getPaymentsByExpense(expenseId);
      setPayments(fresh);
    } catch {
      // RPC pode não existir ainda no Supabase
    }
  }, [expenseId]);

  useFocusEffect(
    useCallback(() => {
      const mode = hasVisited.current ? "silent" : "initial";
      fetchGroupInfo(mode);
      fetchPayments();
      hasVisited.current = true;
    }, [fetchGroupInfo, fetchPayments]),
  );

  const handlePickAndPay = async () => {
    if (actionLoading) return;

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permissão negada", "Precisamos de acesso à galeria para enviar o comprovante.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
    });

    if (result.canceled) return;

    setActionLoading(true);
    try {
      await createPayment({
        expenseId,
        groupId,
        description: expense?.description ?? "Pagamento",
        transferReceiptUri: result.assets[0].uri,
      });
      const [freshGroup, freshPayments] = await Promise.all([
        calculateGroupInfo(groupId),
        getPaymentsByExpense(expenseId),
      ]);
      setGroupInfo(freshGroup);
      setPayments(freshPayments);
    } catch (err) {
      Alert.alert(
        "Erro",
        err instanceof Error ? err.message : "Não foi possível registrar o pagamento.",
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteExpense = () => {
    if (actionLoading) return;

    Alert.alert(
      "Encerrar despesa",
      "Todos os membros pagaram. Deseja encerrar esta despesa?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Encerrar",
          style: "destructive",
          onPress: async () => {
            setActionLoading(true);
            try {
              await deleteExpense(expenseId, groupId);
              navigation.goBack();
            } catch (err) {
              Alert.alert(
                "Erro",
                err instanceof Error ? err.message : "Não foi possível encerrar a despesa.",
              );
            } finally {
              setActionLoading(false);
            }
          },
        },
      ],
    );
  };

  return (
    <View className="flex-1 flex flex-col items-center justify-center">
      <View style={{ height: responsiveHeight(5), width: responsiveWidth(100) }} />

      <View className="flex-1 flex flex-row items-center justify-center border-t-[8px] border-blackapp">
        <View
          style={{ width: responsiveWidth(100) }}
          className="h-full flex flex-col items-center justify-start border-b-[8px] border-blackapp"
        >
          <View
            style={{ width: responsiveWidth(100) }}
            className="border-b-[8px] border-blackapp flex items-end justify-center px-6 py-4"
          >
            {loading && !expense ? (
              <ActivityIndicator size="small" color={themas.colors.hlpink} />
            ) : (
              <Text className="font-bold text-2xl text-center" numberOfLines={2}>
                {expense?.description ?? "Despesa"}
              </Text>
            )}
          </View>

          <ScrollView
            className="flex-1 w-full"
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingVertical: 20,
              gap: 16,
              flexGrow: 1,
            }}
            showsVerticalScrollIndicator
          >
            {loading && !expense ? (
              <View className="flex-1 items-center justify-center py-8">
                <ActivityIndicator size="large" color={themas.colors.primary} />
              </View>
            ) : !expense ? (
              <Text className="text-blackapp text-center font-bold px-4 py-8">
                Despesa não encontrada.
              </Text>
            ) : (
              <>
                <ExpenseDetailField label="Descrição" value={expense.description} />
                <ExpenseDetailField label="Pago por" value={payer?.name ?? "Desconhecido"} />
                <ExpenseDetailField label="Valor total" value={formatCurrency(expense.amount)} />
                <ExpenseDetailField label="Participantes" value={String(expense.total_members)} />
                <ExpenseDetailField
                  label="Valor por participante"
                  value={formatCurrency(expense.val_por_participante)}
                />
                <ExpenseDetailField
                  label="Pagamentos realizados"
                  value={`${expense.payments_feitos} de ${expense.total_members - 1}`}
                />
                <ExpenseDetailField
                  label="Data de criação"
                  value={formatExpenseDate(expense.created_at)}
                />

                {payments.length > 0 ? (
                  <View className="w-full gap-2">
                    <Text className="text-sm text-blackapp font-bold">Quem já pagou</Text>
                    {payments.map((p) => (
                      <View
                        key={p.id}
                        className="flex-row items-center gap-3 py-2 border-b-[2px] border-blackapp/10"
                      >
                        {p.payer_avatar_url ? (
                          <Image
                            source={{ uri: p.payer_avatar_url }}
                            className="w-9 h-9 rounded-full bg-zinc-200 shrink-0"
                          />
                        ) : (
                          <View className="w-9 h-9 rounded-full bg-hlblue items-center justify-center shrink-0">
                            <Text className="text-white font-bold text-sm">
                              {p.payer_name.charAt(0).toUpperCase()}
                            </Text>
                          </View>
                        )}
                        <View className="flex-1">
                          <Text className="text-blackapp font-bold text-sm" numberOfLines={1}>
                            {p.payer_name}
                          </Text>
                          <Text className="text-blackapp/60 text-xs mt-0.5">
                            {formatExpenseDate(p.created_at)}
                          </Text>
                        </View>
                        <Text className="text-hlblue font-bold text-sm">
                          {formatCurrency(p.amount)}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : null}

                {expense.receipt_url ? (
                  <View className="w-full gap-1">
                    <Text className="text-sm text-blackapp font-bold">Comprovante da despesa</Text>
                    <ReceiptThumbnail
                      receiptUrl={expense.receipt_url}
                      onPress={() => setShowFullscreenReceipt(true)}
                    />
                  </View>
                ) : null}
              </>
            )}
          </ScrollView>
        </View>
      </View>

      <View
        style={{
          height: responsiveHeight(showExtraButton ? 18 : 10),
          width: responsiveWidth(100),
        }}
      >
        {showCloseButton ? (
          <AnimatedActionButton
            baseColor={themas.colors.hlpink}
            pressedColor={themas.colors.hlpinkmd}
            height={responsiveHeight(8)}
            width={responsiveWidth(100)}
            borderClassName="border-b-[4px] border-blackapp"
            onPress={handleDeleteExpense}
            disabled={actionLoading}
          >
            {actionLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Check size={32} color="#fff" className="absolute left-6" />
                <Text className="text-xl text-white font-bold text-center px-12">
                  ENCERRAR DESPESA
                </Text>
              </>
            )}
          </AnimatedActionButton>
        ) : showPayButton ? (
          <AnimatedActionButton
            baseColor={themas.colors.hlpink}
            pressedColor={themas.colors.hlpinkmd}
            height={responsiveHeight(8)}
            width={responsiveWidth(100)}
            borderClassName="border-b-[4px] border-blackapp"
            onPress={handlePickAndPay}
            disabled={actionLoading}
          >
            {actionLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <ImagePlus size={32} color="#fff" className="absolute left-6" />
                <Text className="text-xl text-white font-bold text-center px-12">
                  ENVIAR COMPROVANTE
                </Text>
              </>
            )}
          </AnimatedActionButton>
        ) : null}

        <AnimatedActionButton
          baseColor={themas.colors.primary}
          pressedColor={themas.colors.mdprimary}
          height={responsiveHeight(8)}
          width={responsiveWidth(100)}
          borderClassName="border-b-[8px] border-blackapp"
          onPress={() => navigation.goBack()}
          disabled={actionLoading}
        >
          <Undo2 size={40} color="#fff" className="left-6 absolute mb-0.5" />
          <Text className="text-2xl text-white font-bold">VOLTAR</Text>
        </AnimatedActionButton>
      </View>

      {expense?.receipt_url ? (
        <Modal
          visible={showFullscreenReceipt}
          transparent
          animationType="fade"
          onRequestClose={() => setShowFullscreenReceipt(false)}
        >
          <Pressable
            className="flex-1 bg-black/90 items-center justify-center"
            onPress={() => setShowFullscreenReceipt(false)}
          >
            <Pressable
              className="absolute top-12 right-6 z-50 p-2 bg-blackapp"
              onPress={() => setShowFullscreenReceipt(false)}
            >
              <X size={28} color="#fff" />
            </Pressable>
            <Image
              source={{ uri: expense.receipt_url }}
              style={{
                width: responsiveWidth(92),
                height: responsiveHeight(70),
              }}
              resizeMode="contain"
            />
          </Pressable>
        </Modal>
      ) : null}
    </View>
  );
}
