// Lucide
import { X, ImagePlus } from "lucide-react-native";

// React
import { useEffect, useRef, useState } from "react";

// React Native
import {
  View,
  Text,
  Modal,
  Pressable,
  TextInput,
  Animated,
  Easing,
  Image,
  Alert,
} from "react-native";

// Expo
import * as ImagePicker from "expo-image-picker";

// ExpenseService
import { createExpense } from "../../lib/ExpenseService";

// ErrorMessage
import { showErrorMessage } from "../interface/ErrorMessage";

// Temas
import { themas } from "../../global/themes";

// Responsividade
import {
  responsiveWidth,
  responsiveHeight,
} from "react-native-responsive-dimensions";

const DESCRIPTION_MAX_LENGTH = 250;

type AddExpenseFormProps = {
  visible: boolean;
  onClose: () => void;
  groupId: string;
  onSuccess?: () => void;
};

type AddExpenseFormState = {
  amount: string;
  description: string;
  receiptUri: string | null;
};

// formatCurrencyInput | Aplica máscara BRL enquanto o usuário digita
function formatCurrencyInput(rawDigits: string): string {
  const cents = parseInt(rawDigits.replace(/\D/g, "") || "0", 10);
  const value = cents / 100;

  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

// parseCurrencyInput | Converte valor mascarado para número
function parseCurrencyInput(formatted: string): number {
  const cents = parseInt(formatted.replace(/\D/g, "") || "0", 10);
  return cents / 100;
}

// getErrorMessage | Obtém mensagem de erro legível
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return "Não foi possível adicionar a despesa.";
}

// AddExpenseForm | Modal para adicionar nova despesa ao grupo
export default function AddExpenseForm({
  visible,
  onClose,
  groupId,
  onSuccess,
}: AddExpenseFormProps) {
  // sleep | Aguarda ms antes de fechar o modal
  const sleep = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  const [showXFlag, setXFlag] = useState(false);
  const pressAnim = useRef(new Animated.Value(0)).current;

  const [state, setState] = useState<AddExpenseFormState>({
    amount: formatCurrencyInput("0"),
    description: "",
    receiptUri: null,
  });

  // resetPressAnim | Restaura animação do botão fechar
  const resetPressAnim = () => {
    pressAnim.stopAnimation();
    pressAnim.setValue(0);
  };

  // resetForm | Limpa campos e animação ao abrir/fechar
  const resetForm = () => {
    resetPressAnim();
    setState({
      amount: formatCurrencyInput("0"),
      description: "",
      receiptUri: null,
    });
  };

  useEffect(() => {
    if (!visible) return;
    resetForm();
  }, [visible]);

  // handleClose | Fecha modal com delay para animação do X
  const handleClose = async () => {
    if (showXFlag) return;
    setXFlag(true);
    await sleep(200);
    resetForm();
    onClose();
    setXFlag(false);
  };

  // handleAmountChange | Atualiza valor com máscara BRL
  const handleAmountChange = (text: string) => {
    setState((prev) => ({
      ...prev,
      amount: formatCurrencyInput(text),
    }));
  };

  // handleDescriptionChange | Atualiza descrição respeitando limite
  const handleDescriptionChange = (text: string) => {
    if (text.length > DESCRIPTION_MAX_LENGTH) return;
    setState((prev) => ({ ...prev, description: text }));
  };

  // handlePickReceipt | Abre galeria e seleciona comprovante
  const handlePickReceipt = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== "granted") {
      Alert.alert("Permissão negada", "Precisamos de acesso à galeria.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled) {
      setState((prev) => ({ ...prev, receiptUri: result.assets[0].uri }));
    }
  };

  // handleSubmit | Valida e cria despesa via ExpenseService
  const handleSubmit = () => {
    const amount = parseCurrencyInput(state.amount);
    const description = state.description.trim();
    const receiptUri = state.receiptUri;

    if (amount <= 0) {
      showErrorMessage(
        "Informe um valor válido para a despesa.",
        "commonError",
      );
      return;
    }

    if (!description) {
      showErrorMessage("Informe uma descrição para a despesa.", "commonError");
      return;
    }

    resetForm();
    onClose();

    createExpense({
      groupId,
      description,
      amount,
      receiptUri,
    })
      .then((result) => {
        onSuccess?.();

        if (result.receiptUploadFailed) {
          showErrorMessage(
            "Despesa criada, mas o comprovante não pôde ser enviado.",
            "commonError",
          );
        }
      })
      .catch((err) => {
        showErrorMessage(getErrorMessage(err), "commonError");
      });
  };

  // onPressIn | Anima botão fechar para cor pressionada
  const onPressIn = () => {
    Animated.timing(pressAnim, {
      toValue: 1,
      duration: 180,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  };

  // onPressOut | Restaura cor do botão fechar
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

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <Pressable
        className="flex-1 items-center justify-center bg-black/40 z-[100]"
        onPress={handleClose}
      >
        <Pressable
          style={{
            width: responsiveWidth(90),
            paddingTop: responsiveHeight(1),
            gap: responsiveHeight(2),
          }}
          className="bg-white p-4 border-[12px] border-black relative flex flex-col items-stretch justify-start z-[101]"
          onPress={(event) => event.stopPropagation()}
        >
          {/* INICIO CABEÇALHO */}
          <Pressable
            onPress={handleClose}
            className="absolute top-4 right-4 z-50"
            onPressIn={onPressIn}
            onPressOut={onPressOut}
          >
            <Animated.View style={{ backgroundColor: bgColor }} className="p-2">
              <X size={32} color="#fff" />
            </Animated.View>
          </Pressable>

          <Text
            style={{
              paddingRight: responsiveWidth(14),
              paddingTop: responsiveHeight(1),
            }}
            className="text-3xl text-blackapp self-start font-black w-full z-30"
          >
            Nova Despesa
          </Text>
          {/* FIM CABEÇALHO */}

          {/* INICIO FORMULÁRIO */}
          <View
            style={{
              gap: responsiveHeight(2),
              paddingTop: responsiveHeight(1),
            }}
            className="flex flex-col w-full z-30"
          >
            <Text className="text-sm text-blprimary self-start font-semibold">
              Registre uma despesa do grupo. O valor será dividido entre os
              membros.
            </Text>

            <View className="w-full gap-1">
              <Text className="text-sm text-blackapp font-bold">Valor</Text>
              <TextInput
                placeholder="R$ 0,00"
                value={state.amount}
                onChangeText={handleAmountChange}
                keyboardType="numeric"
                className="border-[3px] border-blackapp p-2 text-blackapp text-base font-medium w-full"
              />
            </View>

            <View className="w-full gap-1">
              <View className="flex-row justify-between items-center">
                <Text className="text-sm text-blackapp font-bold">
                  Descrição
                </Text>
                <Text className="text-xs text-blackapp/60">
                  {state.description.length}/{DESCRIPTION_MAX_LENGTH}
                </Text>
              </View>
              <TextInput
                placeholder="Ex: Churrasco, Uber, Mercado..."
                value={state.description}
                onChangeText={handleDescriptionChange}
                maxLength={DESCRIPTION_MAX_LENGTH}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                style={{ minHeight: responsiveHeight(10) }}
                className="border-[3px] border-blackapp p-2 text-blackapp text-base font-medium w-full"
              />
            </View>

            <View className="w-full gap-2">
              <Text className="text-sm text-blackapp font-bold">
                Comprovante (opcional)
              </Text>
              <Pressable
                onPress={handlePickReceipt}
                style={{ height: responsiveHeight(18) }}
                className="w-full"
              >
                {state.receiptUri ? (
                  <View className="w-full h-full overflow-hidden border-[3px] border-blackapp bg-zinc-100">
                    <Image
                      source={{ uri: state.receiptUri }}
                      className="w-full h-full"
                      resizeMode="cover"
                    />
                  </View>
                ) : (
                  <View className="w-full h-full border-[3px] border-blackapp border-dashed items-center justify-center bg-zinc-100">
                    <ImagePlus size={36} color={themas.colors.blackapp} />
                    <Text className="text-sm text-blackapp/70 mt-2 text-center px-2">
                      Selecionar da galeria
                    </Text>
                  </View>
                )}
              </Pressable>
            </View>

            <Pressable
              className="bg-hlblue w-full py-3 items-center justify-center self-stretch"
              onPress={handleSubmit}
            >
              <Text className="text-xl text-white font-bold">ADICIONAR</Text>
            </Pressable>
          </View>
          {/* FIM FORMULÁRIO */}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
