// Lucide
import { X } from "lucide-react-native";

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
} from "react-native";

// GroupService
import { joinGroup } from "../../lib/GroupService";

// ErrorMessage
import { showErrorMessage } from "../interface/ErrorMessage";

// Temas
import { themas } from "../../global/themes";

// Responsividade
import {
  responsiveWidth,
  responsiveHeight,
} from "react-native-responsive-dimensions";

type JoinGroupFormProps = {
  visible: boolean;
  onClose: () => void;
  initialInviteCode?: string;
};

type JoinGroupFormState = {
  inviteCode: string;
};

// getErrorMessage | Obtém mensagem de erro legível
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return "Não foi possível entrar no grupo.";
}

// JoinGroupForm | Modal para aceitar convite e entrar em um grupo
export default function JoinGroupForm({
  visible,
  onClose,
  initialInviteCode,
}: JoinGroupFormProps) {
  // sleep | Aguarda ms antes de fechar o modal
  const sleep = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  const [showXFlag, setXFlag] = useState(false);
  const [loading, setLoading] = useState(false);
  const pressAnim = useRef(new Animated.Value(0)).current;

  const [state, setState] = useState<JoinGroupFormState>({
    inviteCode: "",
  });

  // resetPressAnim | Restaura animação do botão fechar
  const resetPressAnim = () => {
    pressAnim.stopAnimation();
    pressAnim.setValue(0);
  };

  // resetForm | Limpa campos e animação ao abrir/fechar
  const resetForm = () => {
    resetPressAnim();
    setLoading(false);
    setState({ inviteCode: initialInviteCode ?? "" });
  };

  useEffect(() => {
    if (!visible) return;
    resetForm();
  }, [visible, initialInviteCode]);

  // handleClose | Fecha modal com delay para animação do X
  const handleClose = async () => {
    if (showXFlag || loading) return;
    setXFlag(true);
    await sleep(200);
    resetForm();
    onClose();
    setXFlag(false);
  };

  // handleInviteCodeChange | Atualiza código do convite no estado
  const handleInviteCodeChange = (text: string) => {
    setState((prev) => ({ ...prev, inviteCode: text }));
  };

  // handleJoin | Valida e entra no grupo via GroupService
  const handleJoin = async () => {
    if (loading) return;

    const inviteCode = state.inviteCode.trim();
    if (!inviteCode) {
      showErrorMessage("Cole o código do convite.", "commonError");
      return;
    }

    setLoading(true);

    try {
      await joinGroup(inviteCode);
      resetForm();
      onClose();
    } catch (err) {
      showErrorMessage(getErrorMessage(err), "commonError");
    } finally {
      setLoading(false);
    }
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
            disabled={loading}
          >
            <Animated.View style={{ backgroundColor: bgColor }} className="p-2">
              <X size={32} color="#fff" />
            </Animated.View>
          </Pressable>

          <Text
            style={{ paddingRight: responsiveWidth(14) }}
            className="text-4xl text-blackapp self-start font-black w-full z-30"
          >
            Aceitar Convite
          </Text>
          {/* FIM CABEÇALHO */}

          {/* INICIO FORMULÁRIO */}
          <View
            style={{ gap: responsiveHeight(2) }}
            className="flex flex-col items-stretch w-full z-30"
          >
            <Text className="text-sm text-blprimary self-start font-semibold">
              Cole o código do convite que você recebeu para entrar no grupo.
            </Text>
            <TextInput
              placeholder="Cole o código aqui"
              value={state.inviteCode}
              onChangeText={handleInviteCodeChange}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              style={{ minHeight: responsiveHeight(10) }}
              className="border-[3px] border-blackapp p-2 text-blackapp text-base font-medium w-full"
            />
            <Pressable
              className="bg-hlblue w-full py-3 items-center justify-center self-stretch"
              onPress={handleJoin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-xl text-white font-bold">
                  ENTRAR NO GRUPO
                </Text>
              )}
            </Pressable>
          </View>
          {/* FIM FORMULÁRIO */}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
