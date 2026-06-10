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

// ExpenseService
import {
  calculateExpensePayments,
  peekExpensePayments,
  resolveExpensePayment,
  type ExpensePayment,
} from "../../../lib/ExpenseService";

type Props = NativeStackScreenProps<GruposStackParamList, "DetalhePayment">;

type LoadMode = "initial" | "silent";

const CONTENT_HORIZONTAL_PADDING = responsiveWidth(6);

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

// formatPaymentDate | Formata data do pagamento
function formatPaymentDate(iso: string): string {
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
        style={{ backgroundColor: bgColor, height, width }}
        className={`flex flex-row items-center justify-center relative ${borderClassName}`}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}

type PaymentDetailFieldProps = { label: string; value: string };

// PaymentDetailField | Rótulo e valor de um campo do pagamento
function PaymentDetailField({ label, value }: PaymentDetailFieldProps) {
  return (
    <View className="w-full gap-1">
      <Text className="text-sm text-blackapp font-bold">{label}</Text>
      <Text className="text-base text-blackapp font-medium border-[3px] border-blackapp p-2">
        {value}
      </Text>
    </View>
  );
}

type PaymentOwnerCardProps = {
  name: string;
  avatarUrl: string | null;
  createdAt: string;
};

// PaymentOwnerCard | Card de quem registrou o pagamento
function PaymentOwnerCard({ name, avatarUrl, createdAt }: PaymentOwnerCardProps) {
  const avatarSize = responsiveWidth(16);

  return (
    <View className="w-full flex-row items-center gap-3 border-[3px] border-blackapp p-3">
      {avatarUrl ? (
        <Image
          source={{ uri: avatarUrl }}
          style={{ width: avatarSize, height: avatarSize }}
          className="rounded-full bg-zinc-200 shrink-0"
        />
      ) : (
        <View
          style={{ width: avatarSize, height: avatarSize }}
          className="rounded-full bg-zinc-300 items-center justify-center shrink-0"
        >
          <Text className="text-blackapp font-bold text-lg">
            {name.charAt(0).toUpperCase()}
          </Text>
        </View>
      )}

      <View className="flex-1 shrink">
        <Text className="text-xs text-blackapp/70 font-bold">Pago por</Text>
        <Text className="text-lg text-blackapp font-bold" numberOfLines={2}>
          {name}
        </Text>
        <Text className="text-sm text-hlblue mt-0.5" numberOfLines={1}>
          {formatPaymentDate(createdAt)}
        </Text>
      </View>
    </View>
  );
}

type PaymentDescriptionFieldProps = {
  description: string;
  receiptUrl: string | null;
  onReceiptPress: () => void;
};

// PaymentDescriptionField | Descrição com thumbnail opcional do comprovante
function PaymentDescriptionField({
  description,
  receiptUrl,
  onReceiptPress,
}: PaymentDescriptionFieldProps) {
  return (
    <View className="w-full gap-1">
      <Text className="text-sm text-blackapp font-bold">Descrição</Text>
      <View className="border-[3px] border-blackapp p-2 gap-3">
        <Text className="text-base text-blackapp font-medium">{description}</Text>
        {receiptUrl ? (
          <ReceiptThumbnail
            receiptUrl={receiptUrl}
            onPress={onReceiptPress}
          />
        ) : null}
      </View>
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

// DetalhePayment | Detalhes de um pagamento da despesa
export default function DetalhePayment({ navigation, route }: Props) {
  const { expenseId, paymentId } = route.params;
  const [expensePayments, setExpensePayments] = useState<ExpensePayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFullscreenReceipt, setShowFullscreenReceipt] = useState(false);
  const hasVisited = useRef(false);

  const payment = resolveExpensePayment(expensePayments, paymentId);

  // fetchExpensePayments | Exibe cache imediato e sincroniza via calculateExpensePayments
  const fetchExpensePayments = useCallback(
    async (mode: LoadMode = "initial") => {
      if (mode === "initial") {
        const cached = await peekExpensePayments(expenseId);
        if (cached) {
          setExpensePayments(cached);
          setLoading(false);
        } else {
          setLoading(true);
        }
      }

      try {
        const fresh = await calculateExpensePayments(expenseId);
        setExpensePayments((prev) => (areCacheEqual(prev, fresh) ? prev : fresh));
      } catch {
        if (mode === "initial" && !(await peekExpensePayments(expenseId))) {
          setExpensePayments([]);
        }
      } finally {
        setLoading(false);
      }
    },
    [expenseId],
  );

  useFocusEffect(
    useCallback(() => {
      fetchExpensePayments(hasVisited.current ? "silent" : "initial");
      hasVisited.current = true;
    }, [fetchExpensePayments]),
  );

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
          <View
            style={{ paddingHorizontal: CONTENT_HORIZONTAL_PADDING }}
            className="w-full border-b-[8px] border-blackapp flex items-end justify-center relative"
          >
            {loading && !payment ? (
              <ActivityIndicator
                size="small"
                color={themas.colors.hlpink}
                style={{ paddingVertical: responsiveHeight(2) }}
              />
            ) : (
              <Text
                className="font-bold text-2xl text-center pt-4 pb-4"
                numberOfLines={2}
              >
                {payment?.description ?? "Pagamento"}
              </Text>
            )}
          </View>
          {/* FIM CABEÇALHO */}

          {/* INICIO DETALHES */}
          <ScrollView
            style={{ flex: 1, width: "100%" }}
            contentContainerStyle={{
              paddingHorizontal: CONTENT_HORIZONTAL_PADDING,
              paddingVertical: responsiveHeight(2.5),
              gap: responsiveHeight(2),
              flexGrow: 1,
              width: "100%",
              alignItems: "stretch",
            }}
            showsVerticalScrollIndicator
          >
            {loading && !payment ? (
              <View
                style={{ minHeight: responsiveHeight(30) }}
                className="flex-1 items-center justify-center"
              >
                <ActivityIndicator
                  size="large"
                  color={themas.colors.primary}
                />
              </View>
            ) : !payment ? (
              <Text className="text-blackapp text-center font-bold px-4 py-8">
                Pagamento não encontrado.
              </Text>
            ) : (
              <>
                <PaymentOwnerCard
                  name={payment.payer_name}
                  avatarUrl={payment.payer_avatar_url}
                  createdAt={payment.created_at}
                />
                <PaymentDetailField
                  label="Valor"
                  value={formatCurrency(payment.amount)}
                />
                <PaymentDescriptionField
                  description={payment.description}
                  receiptUrl={payment.transfer_receipt_url}
                  onReceiptPress={() => setShowFullscreenReceipt(true)}
                />
              </>
            )}
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
      {payment?.transfer_receipt_url ? (
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
              source={{ uri: payment.transfer_receipt_url }}
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
