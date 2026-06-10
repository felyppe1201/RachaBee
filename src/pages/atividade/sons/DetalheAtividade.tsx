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
import { AtividadeStackParamList } from "../AtividadeStack";

// Temas
import { themas } from "../../../global/themes";

// Cache
import { areCacheEqual } from "../../../lib/cacheService";

// ActivityService
import {
  calculateActivityFeed,
  peekActivityFeed,
  resolveActivityExpense,
  resolveActivityPayment,
  type ActivityFeed,
} from "../../../lib/ActivityService";

// GroupService
import { peekGroupsList } from "../../../lib/GroupService";

type Props = NativeStackScreenProps<AtividadeStackParamList, "DetalheAtividade">;

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

// formatActivityDate | Formata data para leitura no detalhe
function formatActivityDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
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

type ActivityDetailFieldProps = {
  label: string;
  value: string;
};

// ActivityDetailField | Rótulo e valor de um campo da atividade
function ActivityDetailField({ label, value }: ActivityDetailFieldProps) {
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

// DetalheAtividade | Detalhes da atividade a partir do cache do feed
export default function DetalheAtividade({ navigation, route }: Props) {
  const { activityId, activityType } = route.params;
  const [activityFeed, setActivityFeed] = useState<ActivityFeed | null>(null);
  const [groupName, setGroupName] = useState("Grupo");
  const [loading, setLoading] = useState(true);
  const [showFullscreenReceipt, setShowFullscreenReceipt] = useState(false);
  const hasVisited = useRef(false);

  const expense =
    activityType === "expense"
      ? resolveActivityExpense(activityFeed, activityId)
      : null;

  const payment =
    activityType === "payment"
      ? resolveActivityPayment(activityFeed, activityId)
      : null;

  const receiptUrl =
    expense?.receipt_url ?? payment?.transfer_receipt_url ?? null;

  const headerTitle = expense ? "Despesa" : payment ? "Pagamento" : "Atividade";

  // resolveGroupName | Obtém nome do grupo pelo id
  const resolveGroupName = useCallback(async (groupId: string | undefined) => {
    if (!groupId) {
      setGroupName("Grupo");
      return;
    }

    const groups = await peekGroupsList();
    const match = groups?.find((group) => group.id === groupId);
    setGroupName(match?.name ?? "Grupo");
  }, []);

  // fetchActivityFeed | Exibe cache imediato e sincroniza via calculateActivityFeed
  const fetchActivityFeed = useCallback(
    async (mode: LoadMode = "initial") => {
      const cached = await peekActivityFeed();

      if (mode === "initial") {
        if (cached) {
          setActivityFeed(cached);
          const cachedItem =
            activityType === "expense"
              ? resolveActivityExpense(cached, activityId)
              : resolveActivityPayment(cached, activityId);
          await resolveGroupName(cachedItem?.group_id);
          setLoading(false);
        } else {
          setLoading(true);
        }
      }

      try {
        const fresh = await calculateActivityFeed();
        setActivityFeed((prev) => (areCacheEqual(prev, fresh) ? prev : fresh));
        const freshItem =
          activityType === "expense"
            ? resolveActivityExpense(fresh, activityId)
            : resolveActivityPayment(fresh, activityId);
        await resolveGroupName(freshItem?.group_id);
      } finally {
        setLoading(false);
      }
    },
    [activityId, activityType, resolveGroupName]
  );

  useFocusEffect(
    useCallback(() => {
      fetchActivityFeed(hasVisited.current ? "silent" : "initial");
      hasVisited.current = true;
    }, [fetchActivityFeed])
  );

  const hasActivity = Boolean(expense ?? payment);

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
          style={{ width: responsiveWidth(100) }}
          className="h-full flex flex-col items-center justify-start border-b-[8px] border-blackapp"
        >
          {/* INICIO CABEÇALHO */}
          <View
            style={{ width: responsiveWidth(100) }}
            className="border-b-[8px] border-blackapp flex items-end justify-center px-6 py-4"
          >
            {loading && !hasActivity ? (
              <ActivityIndicator size="small" color={themas.colors.hlpink} />
            ) : (
              <Text
                className="font-bold text-2xl text-center"
                numberOfLines={2}
              >
                {headerTitle}
              </Text>
            )}
          </View>
          {/* FIM CABEÇALHO */}

          {/* INICIO DETALHES */}
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
            {loading && !hasActivity ? (
              <View className="flex-1 items-center justify-center py-8">
                <ActivityIndicator
                  size="large"
                  color={themas.colors.primary}
                />
              </View>
            ) : !hasActivity ? (
              <Text className="text-blackapp text-center font-bold px-4 py-8">
                Atividade não encontrada.
              </Text>
            ) : expense ? (
              <>
                <ActivityDetailField
                  label="Valor"
                  value={formatCurrency(expense.amount)}
                />
                <ActivityDetailField
                  label="Data"
                  value={formatActivityDate(expense.created_at)}
                />
                <ActivityDetailField label="Grupo" value={groupName} />
                <ActivityDetailField
                  label="Descrição"
                  value={expense.description}
                />
                <ActivityDetailField
                  label="Pagamentos"
                  value={`Feitos: ${expense.payments_feitos} · Faltantes: ${expense.payments_faltantes}`}
                />
                {expense.receipt_url ? (
                  <View className="w-full gap-1">
                    <Text className="text-sm text-blackapp font-bold">
                      Imagem
                    </Text>
                    <ReceiptThumbnail
                      receiptUrl={expense.receipt_url}
                      onPress={() => setShowFullscreenReceipt(true)}
                    />
                  </View>
                ) : null}
              </>
            ) : payment ? (
              <>
                <ActivityDetailField
                  label="Valor"
                  value={formatCurrency(payment.amount)}
                />
                <ActivityDetailField
                  label="Data"
                  value={formatActivityDate(payment.created_at)}
                />
                <ActivityDetailField label="Grupo" value={groupName} />
                <ActivityDetailField
                  label="Descrição"
                  value={payment.description}
                />
                {payment.transfer_receipt_url ? (
                  <View className="w-full gap-1">
                    <Text className="text-sm text-blackapp font-bold">
                      Imagem
                    </Text>
                    <ReceiptThumbnail
                      receiptUrl={payment.transfer_receipt_url}
                      onPress={() => setShowFullscreenReceipt(true)}
                    />
                  </View>
                ) : null}
              </>
            ) : null}
          </ScrollView>
          {/* FIM DETALHES */}
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
          onPress={() => navigation.goBack()}
        >
          <Undo2 size={40} color="#fff" className="left-6 absolute mb-0.5" />
          <Text className="text-2xl text-white font-bold">VOLTAR</Text>
        </AnimatedActionButton>
      </View>
      {/* FIM RODAPÉ */}

      {/* INICIO MODAL COMPROVANTE */}
      {receiptUrl ? (
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
              source={{ uri: receiptUrl }}
              style={{
                width: responsiveWidth(92),
                height: responsiveHeight(70),
              }}
              resizeMode="contain"
            />
          </Pressable>
        </Modal>
      ) : null}
      {/* FIM MODAL COMPROVANTE */}
    </View>
  );
}
