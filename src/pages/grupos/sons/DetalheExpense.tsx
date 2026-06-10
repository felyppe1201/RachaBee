// React Navigation
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";

// React
import { useCallback, useRef, useState, type ReactNode } from "react";

// Lucide
import { Undo2, X } from "lucide-react-native";

// React Native
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Image,
  ActivityIndicator,
  Animated,
  Easing,
  Modal,
} from "react-native";

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

// GroupService
import {
  calculateGroupInfo,
  peekGroupInfo,
  type GroupExpenseInfo,
  type GroupInfo,
} from "../../../lib/GroupService";

type Props = NativeStackScreenProps<GruposStackParamList, "DetalheExpense">;

type LoadMode = "initial" | "silent" | "pull";

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

// formatCurrency | Formata valor monetário
function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

// formatExpenseDate | Formata data da despesa para leitura
function formatExpenseDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

// resolveExpense | Localiza despesa no retorno de GetGroupInfoByUUID
function resolveExpense(
  groupInfo: GroupInfo | null,
  expenseId: string,
): GroupExpenseInfo | null {
  return groupInfo?.expenses.find((item) => item.id === expenseId) ?? null;
}

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

type ExpenseDetailFieldProps = {
  label: string;
  value: string;
};

// ExpenseDetailField | Rótulo e valor de um campo da despesa
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

type ReceiptThumbnailProps = {
  receiptUrl: string;
  onPress: () => void;
};

// ReceiptThumbnail | Preview quadrado do comprovante
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

// DetalheExpense | Detalhes da despesa a partir do cache do grupo
export default function DetalheExpense({ navigation, route }: Props) {
  const { groupId, expenseId } = route.params;
  const [groupInfo, setGroupInfo] = useState<GroupInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFullscreenReceipt, setShowFullscreenReceipt] = useState(false);
  const hasVisited = useRef(false);

  const expense = resolveExpense(groupInfo, expenseId);

  // fetchGroupInfo | Exibe cache imediato e sincroniza via calculateGroupInfo
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

  useFocusEffect(
    useCallback(() => {
      fetchGroupInfo(hasVisited.current ? "silent" : "initial");
      hasVisited.current = true;
    }, [fetchGroupInfo]),
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
              <Text
                className="font-bold text-2xl text-center"
                numberOfLines={2}
              >
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
                <ActivityIndicator
                  size="large"
                  color={themas.colors.primary}
                />
              </View>
            ) : !expense ? (
              <Text className="text-blackapp text-center font-bold px-4 py-8">
                Despesa não encontrada.
              </Text>
            ) : (
              <>
                <ExpenseDetailField
                  label="Valor"
                  value={formatCurrency(expense.amount)}
                />
                <ExpenseDetailField
                  label="Descrição"
                  value={expense.description}
                />
                <ExpenseDetailField
                  label="Data de criação"
                  value={formatExpenseDate(expense.created_at)}
                />
                {expense.receipt_url ? (
                  <View className="w-full gap-1">
                    <Text className="text-sm text-blackapp font-bold">
                      Comprovante
                    </Text>
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
          onPress={() => navigation.goBack()}
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
