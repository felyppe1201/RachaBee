// Lucide
import { X } from "lucide-react-native";

// React
import React, { useState, useRef, useEffect } from "react";

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
import { createNewGroup } from "../../lib/GroupService";

// ErrorMessage
import { showErrorMessage } from "../interface/ErrorMessage";

// Temas
import { themas } from "../../global/themes";

// responsividade
import {
  responsiveWidth,
  responsiveHeight,
} from "react-native-responsive-dimensions";

type CreateGroupFormProps = {
  visible: boolean;
  onClose: () => void;
};

type CreateGroupFormState = {
  groupName: string;
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return "Não foi possível criar o grupo.";
}

export default function CreateGroupForm({
  visible,
  onClose,
}: CreateGroupFormProps) {
  const sleep = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  const [showXFlag, setXFlag] = useState(false);
  const [loading, setLoading] = useState(false);

  const pressAnim = useRef(new Animated.Value(0)).current;

  const [state, setState] = useState<CreateGroupFormState>({
    groupName: "",
  });

  const resetPressAnim = () => {
    pressAnim.stopAnimation();
    pressAnim.setValue(0);
  };

  const resetForm = () => {
    resetPressAnim();
    setState({ groupName: "" });
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

  const handleGroupNameChange = (text: string) => {
    setState((prev) => ({ ...prev, groupName: text }));
  };

  const handleCreate = async () => {
    if (loading) return;

    const trimmedName = state.groupName.trim();
    if (!trimmedName) {
      showErrorMessage("Informe um nome para o grupo.", "commonError");
      return;
    }

    setLoading(true);

    try {
      await createNewGroup(trimmedName);
      resetForm();
      onClose();
    } catch (err) {
      showErrorMessage(getErrorMessage(err), "commonError");
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
        className="flex-1 items-center justify-center bg-black/40"
        onPress={handleClose}
      >
        <Pressable
          style={{
            width: responsiveWidth(90),
            minHeight: responsiveHeight(34),
            maxHeight: responsiveHeight(40),
          }}
          className="bg-white p-4 border-[12px] border-black relative flex flex-col items-center justify-start"
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
              style={{
                backgroundColor: bgColor,
              }}
              className="p-2"
            >
              <X size={32} color="#fff" />
            </Animated.View>
          </Pressable>

          <Text className="text-4xl text-blackapp self-start top-2 font-black w-full z-30">
            Criar Grupo
          </Text>

          <View className="flex flex-col items-center justify-center gap-4 top-8 w-full z-30">
            <Text className="text-sm text-blprimary self-start font-semibold">
              Crie um grupo para controlar a divisão de despesas com seus
              amigos!
            </Text>
            <TextInput
              placeholder="Nome de grupo bacana"
              value={state.groupName}
              onChangeText={handleGroupNameChange}
              editable={!loading}
              className="border-[3px] border-blackapp p-2 text-blackapp text-base font-medium w-full"
            />
            <Pressable
              className={`bg-hlblue w-[100%] py-2 pb-3 items-center flex-row justify-center gap-2 ${loading ? "opacity-70" : ""}`}
              onPress={handleCreate}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-xl text-white font-bold">CRIAR</Text>
              )}
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
