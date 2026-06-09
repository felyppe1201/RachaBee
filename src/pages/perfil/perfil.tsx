// React
import { useCallback } from "react";

// React Navigation
import { NativeStackScreenProps } from "@react-navigation/native-stack";

// React Native
import { Alert, Image, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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

// formatMemberSince | formata created_at para exibicao em pt-BR
function formatMemberSince(dateStr: string): string {
  const date = new Date(dateStr);
  const formatted = date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  return `Membro desde ${formatted}`;
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
      <View className="flex-1 items-center justify-center px-6">
        {profile?.avatar_url ? (
          <Image
            source={{ uri: profile.avatar_url }}
            className="w-28 h-28 rounded-full mb-4"
          />
        ) : (
          <View
            className="w-28 h-28 rounded-full mb-4 items-center justify-center"
            style={{ backgroundColor: themas.colors.lightGray }}
          >
            <MaterialIcons
              name="person"
              size={56}
              color={themas.colors.gray}
            />
          </View>
        )}

        <Text className="font-bold text-xl text-center">
          {profile?.name ?? "Usuario"}
        </Text>
        <Text className="text-base mt-1 text-center" style={{ color: themas.colors.gray }}>
          {profile?.email ?? ""}
        </Text>
        {profile?.created_at ? (
          <Text
            className="text-sm mt-2 text-center"
            style={{ color: themas.colors.gray }}
          >
            {formatMemberSince(profile.created_at)}
          </Text>
        ) : null}
      </View>

      <View
        className="border-t px-4 py-3"
        style={{ borderColor: themas.colors.lightGray }}
      >
        {menuItems.map((item) => (
          <Pressable
            key={item.label}
            className="flex-row items-center py-3"
            onPress={item.onPress}
          >
            <MaterialIcons
              name={item.icon}
              size={22}
              color={item.destructive ? themas.colors.hlpink : themas.colors.blackapp}
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
          </Pressable>
        ))}
      </View>
    </View>
  );
}
