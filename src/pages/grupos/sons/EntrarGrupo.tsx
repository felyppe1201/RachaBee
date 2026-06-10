// React Navigation
import { NativeStackScreenProps } from "@react-navigation/native-stack";

// React
import { useRef, useState, type ReactNode } from "react";

// Lucide
import { Undo2 } from "lucide-react-native";

// React Native
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
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

// GroupService
import { joinGroup } from "../../../lib/GroupService";

type Props = NativeStackScreenProps<GruposStackParamList, "EntrarGrupo">;

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

export default function EntrarGrupo({ navigation, route }: Props) {
  const [inviteCode, setInviteCode] = useState(route.params?.inviteCode ?? "");
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    if (loading) return;

    const code = inviteCode.trim();
    if (!code) {
      Alert.alert("Código inválido", "Cole o código do convite para continuar.");
      return;
    }

    setLoading(true);
    try {
      await joinGroup(code);
      navigation.navigate("GruposMain");
    } catch (err) {
      Alert.alert(
        "Erro",
        err instanceof Error ? err.message : "Não foi possível entrar no grupo.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 flex flex-col">
      <View style={{ height: responsiveHeight(5), width: responsiveWidth(100) }} />

      <View className="flex-1 border-t-[8px] border-blackapp">
        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingVertical: 32,
            gap: 24,
            flexGrow: 1,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="gap-2">
            <Text className="text-3xl font-black text-blackapp">
              Aceitar Convite
            </Text>
            <Text className="text-sm text-blackapp/60 font-medium">
              Cole o código do convite que você recebeu para entrar no grupo.
            </Text>
          </View>

          <View className="gap-2">
            <Text className="text-sm font-bold text-blackapp">
              Código do convite
            </Text>
            <TextInput
              value={inviteCode}
              onChangeText={setInviteCode}
              placeholder="Cole o código aqui"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              className="border-[3px] border-blackapp p-3 text-blackapp text-sm font-medium min-h-[100px]"
            />
          </View>

          <AnimatedActionButton
            baseColor={themas.colors.hlblue}
            pressedColor={themas.colors.hlbluemd}
            height={responsiveHeight(7)}
            width={responsiveWidth(100) - 48}
            borderClassName="border-b-[6px] border-blackapp"
            onPress={handleJoin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-xl text-white font-bold">ENTRAR NO GRUPO</Text>
            )}
          </AnimatedActionButton>
        </ScrollView>
      </View>

      <View style={{ height: responsiveHeight(10), width: responsiveWidth(100) }}>
        <AnimatedActionButton
          baseColor={themas.colors.primary}
          pressedColor={themas.colors.mdprimary}
          height={responsiveHeight(8)}
          width={responsiveWidth(100)}
          borderClassName="border-b-[8px] border-blackapp"
          onPress={() => navigation.navigate("GruposMain")}
          disabled={loading}
        >
          <Undo2 size={40} color="#fff" className="left-6 absolute mb-0.5" />
          <Text className="text-2xl text-white font-bold">VOLTAR</Text>
        </AnimatedActionButton>
      </View>
    </View>
  );
}
