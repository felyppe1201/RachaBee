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
}: JoinGroupFormProps) {
  const sleep = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  const [showXFlag, setXFlag] = useState(false);
  const pressAnim = useRef(new Animated.Value(0)).current;

  const [state, setState] = useState<JoinGroupFormState>({
    inviteCode: "",
  });

  const resetPressAnim = () => {
    pressAnim.stopAnimation();
    pressAnim.setValue(0);
  };

  const resetForm = () => {
    resetPressAnim();
    setState({ inviteCode: "" });
  };

  useEffect(() => {
    if (!visible) return;
    resetForm();
  }, [visible]);

  const handleClose = async () => {
    if (showXFlag) return;
    setXFlag(true);
    await sleep(200);
    resetForm();
    onClose();
    setXFlag(false);
  };

  const handleInviteCodeChange = (text: string) => {
    setState((prev) => ({ ...prev, inviteCode: text }));
  };

  const handleJoin = () => {
    const inviteCode = state.inviteCode.trim();
    if (!inviteCode) {
      showErrorMessage("Cole o código do convite.", "commonError");
      return;
    }

    resetForm();
    onClose();

    joinGroup(inviteCode).catch((err) => {
      showErrorMessage(getErrorMessage(err), "commonError");
    });
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
            paddingTop: responsiveHeight(1),
            gap: responsiveHeight(2),
          }}
          className="bg-white p-4 border-[12px] border-black relative flex flex-col items-stretch justify-start z-[101]"
          onPress={(event) => event.stopPropagation()}
        >
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
            style={{ paddingRight: responsiveWidth(14) }}
            className="text-4xl text-blackapp self-start font-black w-full z-30"
          >
            Entrar em um Grupo
          </Text>

          <View
            style={{ gap: responsiveHeight(2) }}
            className="flex flex-col items-stretch w-full z-30"
          >
            <Text className="text-sm text-blprimary self-start font-semibold">
              Cole o código do convite que você recebeu para entrar no grupo.
            </Text>
            <TextInput
              placeholder="Código do convite"
              value={state.inviteCode}
              onChangeText={handleInviteCodeChange}
              autoCapitalize="none"
              autoCorrect={false}
              className="border-[3px] border-blackapp p-2 text-blackapp text-base font-medium w-full"
            />
            <Pressable
              className="bg-hlblue w-full py-3 items-center justify-center self-stretch"
              onPress={handleJoin}
            >
              <Text className="text-xl text-white font-bold">ENTRAR</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
