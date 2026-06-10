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
  ActivityIndicator,
  Image,
  Alert,
  ScrollView,
} from "react-native";

// Expo
import * as ImagePicker from "expo-image-picker";

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

// AddExpenseForm | Modal placeholder para adicionar nova despesa
export default function AddExpenseForm({
  visible,
  onClose,
  groupId,
}: AddExpenseFormProps) {
  const sleep = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  const [showXFlag, setXFlag] = useState(false);
  const [loading, setLoading] = useState(false);
  const pressAnim = useRef(new Animated.Value(0)).current;

  const [state, setState] = useState<AddExpenseFormState>({
    amount: formatCurrencyInput("0"),
    description: "",
    receiptUri: null,
  });

  const resetPressAnim = () => {
    pressAnim.stopAnimation();
    pressAnim.setValue(0);
  };

  const resetForm = () => {
    resetPressAnim();
    setState({
      amount: formatCurrencyInput("0"),
      description: "",
      receiptUri: null,
    });
    setLoading(false);
  };

  useEffect(() => {
    if (!visible) return;
    resetForm();
  }, [visible]);

  const handleClose = async () => {
    if (showXFlag || loading) return;
    setXFlag(true);
    await sleep(200);
    resetForm();
    onClose();
    setXFlag(false);
  };

  const handleAmountChange = (text: string) => {
    setState((prev) => ({
      ...prev,
      amount: formatCurrencyInput(text),
    }));
  };

  const handleDescriptionChange = (text: string) => {
    if (text.length > DESCRIPTION_MAX_LENGTH) return;
    setState((prev) => ({ ...prev, description: text }));
  };

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

  const handleSubmit = async () => {
    if (loading) return;

    const amount = parseCurrencyInput(state.amount);
    const description = state.description.trim();

    if (amount <= 0) {
      showErrorMessage("Informe um valor válido para a despesa.", "commonError");
      return;
    }

    if (!description) {
      showErrorMessage("Informe uma descrição para a despesa.", "commonError");
      return;
    }

    setLoading(true);

    try {
      console.log("[AddExpenseForm:placeholder]", {
        groupId,
        amount,
        description,
        receiptUri: state.receiptUri,
      });

      Alert.alert(
        "Em breve",
        "O cadastro de despesas será implementado em breve."
      );
      resetForm();
      onClose();
    } finally {
      setLoading(false);
    }
  };

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
            minHeight: responsiveHeight(42),
            maxHeight: responsiveHeight(52),
          }}
          className="bg-white p-4 border-[12px] border-black relative flex flex-col items-center justify-start z-[101]"
          onPress={(event) => event.stopPropagation()}
        >
          <Pressable
            onPress={handleClose}
            className="absolute top-4 right-4 z-50"
            onPressIn={onPressIn}
            onPressOut={onPressOut}
            disabled={loading}
          >
            <Animated.View
              style={{ backgroundColor: bgColor }}
              className="p-2"
            >
              <X size={32} color="#fff" />
            </Animated.View>
          </Pressable>

          <Text className="text-3xl text-blackapp self-start top-2 font-black w-full z-30 pr-12">
            Nova Despesa
          </Text>

          <ScrollView
            className="w-full top-8 z-30"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ gap: 16, paddingBottom: 8 }}
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
                editable={!loading}
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
                editable={!loading}
                maxLength={DESCRIPTION_MAX_LENGTH}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                className="border-[3px] border-blackapp p-2 text-blackapp text-base font-medium w-full min-h-[80px]"
              />
            </View>

            <View className="w-full gap-2">
              <Text className="text-sm text-blackapp font-bold">
                Comprovante (opcional)
              </Text>
              <Pressable
                onPress={handlePickReceipt}
                disabled={loading}
                className="self-start"
              >
                {state.receiptUri ? (
                  <View className="w-28 h-28 overflow-hidden border-[3px] border-blackapp bg-zinc-100">
                    <Image
                      source={{ uri: state.receiptUri }}
                      className="w-full h-full"
                      resizeMode="cover"
                    />
                  </View>
                ) : (
                  <View className="w-28 h-28 border-[3px] border-blackapp border-dashed items-center justify-center bg-zinc-100">
                    <ImagePlus size={32} color={themas.colors.blackapp} />
                    <Text className="text-xs text-blackapp/70 mt-2 text-center px-2">
                      Galeria
                    </Text>
                  </View>
                )}
              </Pressable>
            </View>

            <Pressable
              className={`bg-hlblue w-full py-2 pr-2 pb-4 items-center flex-row justify-center gap-2 ${loading ? "opacity-70" : ""}`}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-xl text-white font-bold">ADICIONAR</Text>
              )}
            </Pressable>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
