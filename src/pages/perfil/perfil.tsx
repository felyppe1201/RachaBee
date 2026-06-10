// React
import { useCallback, useRef } from "react";

// Lucide
import { User } from "lucide-react-native";

// React Navigation
import { NativeStackScreenProps } from "@react-navigation/native-stack";

// React Native
import {
  Alert,
  Animated,
  Easing,
  Image,
  Pressable,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// responsividade
import {
  responsiveHeight,
  responsiveWidth,
} from "react-native-responsive-dimensions";

// Expo Icons
import { MaterialIcons } from "@expo/vector-icons";

// Context
import { useUser } from "../../context/UserContext";

// Auth
import { signOut } from "../../lib/authService";

// Temas
import { themas } from "../../global/themes";

// Stack
import { PerfilStackParamList } from "./PerfilStack";

type Props = NativeStackScreenProps<PerfilStackParamList, "PerfilMain">;

type MenuItem = {
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  onPress: () => void;
  destructive?: boolean;
};

const ZINC_300 = "#d4d4d8";

type AnimatedMenuItemProps = {
  item: MenuItem;
};

// AnimatedMenuItem | item do menu com feedback visual ao pressionar
function AnimatedMenuItem({ item }: AnimatedMenuItemProps) {
  const pressAnim = useRef(new Animated.Value(0)).current;

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
    outputRange: [themas.colors.secondary, ZINC_300],
  });

  return (
    <Pressable
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      onPress={item.onPress}
    >
      <Animated.View
        className="flex-row items-center py-3 w-72 px-2"
        style={{ backgroundColor: bgColor }}
      >
        <MaterialIcons
          name={item.icon}
          size={22}
          color={
            item.destructive ? themas.colors.hlpink : themas.colors.blackapp
          }
        />
        <Text
          className="ml-3 text-base font-semibold"
          style={{
            color: item.destructive
              ? themas.colors.hlpink
              : themas.colors.blackapp,
          }}
        >
          {item.label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

// formatMemberSince | formata created_at para exibicao em pt-BR
function formatMemberSince(dateStr: string): string {
  const date = new Date(dateStr);
  const formatted = date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  return `Hey! Estamos juntos desde ${formatted}, sabia?`;
}

export default function Perfil({ navigation }: Props) {
  const { profile } = useUser();
  const insets = useSafeAreaInsets();

  const handleLogout = useCallback(async () => {
    try {
      await signOut();
    } catch {
      Alert.alert("Erro", "Nao foi possivel sair da conta. Tente novamente.");
    }
  }, []);

  const menuItems: MenuItem[] = [
    {
      label: "Termos de Uso",
      icon: "description",
      onPress: () => navigation.navigate("TermosDeUso"),
    },
    {
      label: "Politica de Privacidade",
      icon: "privacy-tip",
      onPress: () => navigation.navigate("PoliticaPrivacidade"),
    },
    {
      label: "Sobre",
      icon: "info-outline",
      onPress: () => navigation.navigate("Sobre"),
    },
    {
      label: "Ajuda",
      icon: "help-outline",
      onPress: () => navigation.navigate("Ajuda"),
    },
    {
      label: "Sair",
      icon: "logout",
      onPress: handleLogout,
      destructive: true,
    },
  ];

  return (
    <View
      className="flex-1"
      style={{
        backgroundColor: themas.colors.secondary,
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
      }}
    >
      <View className="flex-1 items-center justify-start px-6 flex flex-col gap-12">
        <View
          style={{
            height: responsiveHeight(17),
            width: responsiveWidth(100),
            alignSelf: "center",
            zIndex: 1,
          }}
          className="relative flex-row items-stretch border-t-[8px] border-t-blackapp border-b-[8px] border-b-blackapp bg-blackapp"
        >
          {profile?.avatar_url ? (
            <Image
              source={{ uri: profile.avatar_url }}
              resizeMode="cover"
              style={{ height: "100%", aspectRatio: 1 }}
            />
          ) : (
            <View
              className="items-center justify-center"
              style={{
                height: "100%",
                aspectRatio: 1,
                backgroundColor: themas.colors.lightGray,
              }}
            >
              <MaterialIcons
                name="person"
                size={56}
                color={themas.colors.gray}
              />
            </View>
          )}
          <View className="bg-blackapp w-[8px] h-[100%] self-center" />
          <View
            className="flex-col overflow-hidden"
            style={{ flex: 1, minWidth: 0, minHeight: 0 }}
          >
            <View
              className="bg-hlpink border-b-[6px] pl-6 border-b-blackapp flex-row items-center gap-2 overflow-hidden"
              style={{ flex: 1, minHeight: 0 }}
            >
              <User size={36} color="#fff" />
              <Text
                className="font-bold text-3xl text-white"
                style={{ flex: 1, flexShrink: 1 }}
                numberOfLines={1}
              >
                {profile?.name ?? "Usuário"}
              </Text>
            </View>
            <View
              className="bg-hlblue items-start justify-center pl-6 relative"
              style={{ flex: 1, minHeight: 0, maxHeight: "40%" }}
            >
              <View
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  opacity: 0.4,
                  height: responsiveHeight(0.8),
                  backgroundColor: "#000",
                }}
              />
              <Text className="font-bold text-sm text-white">
                {profile?.email ?? ""}
              </Text>
            </View>
          </View>
          <View
            style={{
              position: "absolute",
              top: 20,
              left: 0,
              right: 0,
              opacity: 0.4,
              height: "100%",
              width: "100%",
              zIndex: -1,
              backgroundColor: "#000",
            }}
          />
        </View>
        {profile?.created_at ? (
          <Text className="text-sm text-blprimary text-center">
            {formatMemberSince(profile.created_at)}
          </Text>
        ) : null}
      </View>

      <View
        className="border-t px-4 py-3"
        style={{
          borderColor: themas.colors.mdprimary,
          height: responsiveHeight(30),
        }}
      >
        {menuItems.map((item) => (
          <AnimatedMenuItem key={item.label} item={item} />
        ))}
      </View>
    </View>
  );
}
