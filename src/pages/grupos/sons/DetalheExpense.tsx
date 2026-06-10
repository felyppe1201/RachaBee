// React Navigation
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";

// React
import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";

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

// Context
import { useUser } from "../../../context/UserContext";

// GroupService
import {
  calculateGroupInfo,
  peekGroupInfo,
  type GroupExpenseInfo,
  type GroupInfo,
  type GroupMemberInfo,
  type GroupPaymentInfo,
} from "../../../lib/GroupService";

// Popups
import CreatePaymentForm from "../../../components/popups/CreatePaymentForm";

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

// resolveExpensePayments | Filtra pagamentos da despesa no retorno do grupo
function resolveExpensePayments(
  groupInfo: GroupInfo | null,
  expenseId: string,
): GroupPaymentInfo[] {
  return (groupInfo?.payments ?? []).filter(
    (payment) => payment.expense_id === expenseId,
  );
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

// canUserRegisterPayment | Verifica se o usuário pode registrar pagamento
function canUserRegisterPayment(
  userId: string | undefined,
  expense: GroupExpenseInfo,
  members: GroupMemberInfo[],
  payments: GroupPaymentInfo[],
): boolean {
  if (!userId) return false;

  const member = members.find((item) => item.user_id === userId);
  if (!member) return false;

  if (new Date(member.joined_at) > new Date(expense.created_at)) return false;
  if (expense.paid_by === userId) return false;
  if (payments.some((payment) => payment.paid_by === userId)) return false;

  return true;
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

type ExpenseOwnerCardProps = {
  name: string;
  avatarUrl: string | null;
  createdAt: string;
};

// ExpenseOwnerCard | Card básico de quem criou a despesa
function ExpenseOwnerCard({ name, avatarUrl, createdAt }: ExpenseOwnerCardProps) {
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
        <Text className="text-xs text-blackapp/70 font-bold">Criado por</Text>
        <Text className="text-lg text-blackapp font-bold" numberOfLines={2}>
          {name}
        </Text>
        <Text className="text-sm text-hlblue mt-0.5" numberOfLines={1}>
          {formatExpenseDate(createdAt)}
        </Text>
      </View>
    </View>
  );
}

type ExpenseDescriptionFieldProps = {
  description: string;
  receiptUrl: string | null;
  onReceiptPress: () => void;
};

// ExpenseDescriptionField | Descrição com thumbnail opcional do comprovante
function ExpenseDescriptionField({
  description,
  receiptUrl,
  onReceiptPress,
}: ExpenseDescriptionFieldProps) {
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

type ExpenseParticipantsInfoProps = {
  totalMembers: number;
  valPorParticipante: number;
};

// ExpenseParticipantsInfo | Total de membros e valor por participante
function ExpenseParticipantsInfo({
  totalMembers,
  valPorParticipante,
}: ExpenseParticipantsInfoProps) {
  return (
    <View className="w-full gap-1">
      <Text className="text-sm text-blackapp font-bold">Participantes</Text>
      <View className="border-[3px] border-blackapp p-2 gap-1">
        <Text className="text-base text-blackapp font-medium">
          {totalMembers} {totalMembers === 1 ? "membro" : "membros"} participantes
        </Text>
        <Text className="text-base text-hlblue font-bold">
          {formatCurrency(valPorParticipante)} por participante
        </Text>
      </View>
    </View>
  );
}

type PaymentListItemProps = {
  payment: GroupPaymentInfo;
  payerName: string;
};

// PaymentListItem | Item da lista de pagamentos da despesa
function PaymentListItem({ payment, payerName }: PaymentListItemProps) {
  return (
    <View className="border-[3px] border-blackapp border-t-0 px-3 py-3 gap-1">
      <Text className="text-sm text-blackapp font-bold" numberOfLines={1}>
        {payerName}
      </Text>
      <Text className="text-base text-hlblue font-bold">
        {formatCurrency(payment.amount)}
      </Text>
      <Text className="text-sm text-blackapp font-medium" numberOfLines={2}>
        {payment.description}
      </Text>
      <Text className="text-xs text-blackapp/70">
        {formatExpenseDate(payment.created_at)}
      </Text>
    </View>
  );
}

type ExpensePaymentsSectionProps = {
  paymentsFeitos: number;
  paymentsFaltantes: number;
  payments: GroupPaymentInfo[];
  members: GroupMemberInfo[];
  canRegisterPayment: boolean;
  onRegisterPayment: () => void;
};

// ExpensePaymentsSection | Header, lista de pagamentos e ação de registro
function ExpensePaymentsSection({
  paymentsFeitos,
  paymentsFaltantes,
  payments,
  members,
  canRegisterPayment,
  onRegisterPayment,
}: ExpensePaymentsSectionProps) {
  return (
    <View className="w-full gap-2">
      <Text className="text-sm text-blackapp font-bold">Pagamentos</Text>
      <View className="w-full">
        <View className="flex-row justify-between items-center border-[3px] border-blackapp px-3 py-2">
          <Text className="text-sm text-blackapp font-bold">
            Feitos: {paymentsFeitos}
          </Text>
          <Text className="text-sm text-blackapp font-bold">
            Faltam: {paymentsFaltantes}
          </Text>
        </View>

        {payments.length === 0 ? (
          <View className="border-[3px] border-blackapp border-t-0 px-3 py-4">
            <Text className="text-sm text-blackapp/70 text-center font-medium">
              Nenhum pagamento registrado.
            </Text>
          </View>
        ) : (
          payments.map((payment) => (
            <PaymentListItem
              key={payment.id}
              payment={payment}
              payerName={resolvePayer(payment.paid_by, members).name}
            />
          ))
        )}
      </View>

      {canRegisterPayment ? (
        <Pressable
          onPress={onRegisterPayment}
          className="bg-hlblue w-full py-2 pr-2 pb-4 items-center flex-row justify-center"
        >
          <Text className="text-xl text-white font-bold">REGISTRAR PAGAMENTO</Text>
        </Pressable>
      ) : null}
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
  const { profile } = useUser();
  const [groupInfo, setGroupInfo] = useState<GroupInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFullscreenReceipt, setShowFullscreenReceipt] = useState(false);
  const [showCreatePayment, setShowCreatePayment] = useState(false);
  const hasVisited = useRef(false);

  const expense = resolveExpense(groupInfo, expenseId);
  const expensePayments = useMemo(
    () => resolveExpensePayments(groupInfo, expenseId),
    [groupInfo, expenseId],
  );
  const members = groupInfo?.members ?? [];
  const payer = expense
    ? resolvePayer(expense.paid_by, members)
    : null;
  const canRegisterPayment = expense
    ? canUserRegisterPayment(
        profile?.id,
        expense,
        members,
        expensePayments,
      )
    : false;

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
            style={{
              width: responsiveWidth(100),
              paddingHorizontal: responsiveWidth(6),
            }}
            className="border-b-[8px] border-blackapp flex items-end justify-center relative"
          >
            {loading && !expense ? (
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
                {expense?.description ?? "Despesa"}
              </Text>
            )}
          </View>
          {/* FIM CABEÇALHO */}

          {/* INICIO DETALHES */}
          <ScrollView
            style={{ width: responsiveWidth(100) }}
            contentContainerStyle={{
              paddingHorizontal: responsiveWidth(4),
              paddingVertical: responsiveHeight(2.5),
              gap: responsiveHeight(2),
              flexGrow: 1,
            }}
            showsVerticalScrollIndicator
          >
            {loading && !expense ? (
              <View
                style={{ minHeight: responsiveHeight(30) }}
                className="flex-1 items-center justify-center"
              >
                <ActivityIndicator
                  size="large"
                  color={themas.colors.primary}
                />
              </View>
            ) : !expense ? (
              <Text className="text-blackapp text-center font-bold px-4 py-8">
                Despesa não encontrada.
              </Text>
            ) : payer ? (
              <>
                <ExpenseOwnerCard
                  name={payer.name}
                  avatarUrl={payer.avatar_url}
                  createdAt={expense.created_at}
                />
                <ExpenseDetailField
                  label="Valor"
                  value={formatCurrency(expense.amount)}
                />
                <ExpenseDescriptionField
                  description={expense.description}
                  receiptUrl={expense.receipt_url}
                  onReceiptPress={() => setShowFullscreenReceipt(true)}
                />
                <ExpenseParticipantsInfo
                  totalMembers={expense.total_members}
                  valPorParticipante={expense.val_por_participante}
                />
                <ExpensePaymentsSection
                  paymentsFeitos={expense.payments_feitos}
                  paymentsFaltantes={expense.payments_faltantes}
                  payments={expensePayments}
                  members={members}
                  canRegisterPayment={canRegisterPayment}
                  onRegisterPayment={() => setShowCreatePayment(true)}
                />
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
      {/* FIM MODAL COMPROVANTE */}

      {/* INICIO POPUP */}
      <CreatePaymentForm
        visible={showCreatePayment}
        onClose={() => setShowCreatePayment(false)}
        groupId={groupId}
        expenseId={expenseId}
        onSuccess={() => fetchGroupInfo("silent")}
      />
      {/* FIM POPUP */}
    </View>
  );
}
