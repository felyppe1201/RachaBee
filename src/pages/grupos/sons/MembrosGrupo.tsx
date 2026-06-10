// React Navigation
import { NativeStackScreenProps } from "@react-navigation/native-stack";

// React
import { useRef, useState, type ReactNode } from "react";

// React Native
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Image,
  Animated,
  Easing,
  ActivityIndicator,
  Share,
} from "react-native";

// Lucide
import { Undo2, Share2 } from "lucide-react-native";

// Responsividade
import {
  responsiveHeight,
  responsiveWidth,
} from "react-native-responsive-dimensions";

// Stack
import { GruposStackParamList } from "../GruposStack";

// Temas
import { themas } from "../../../global/themes";

// Context
import { useUser } from "../../../context/UserContext";

// GroupService
import {
  buildInviteShareMessage,
  createGroupInvite,
  type GroupMemberInfo,
} from "../../../lib/GroupService";

// ErrorMessage
import { showErrorMessage } from "../../../components/interface/ErrorMessage";

type Props = NativeStackScreenProps<GruposStackParamList, "MembrosGrupo">;

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

type MemberCardProps = {
  member: GroupMemberInfo;
};

// getErrorMessage | Obtém mensagem de erro legível
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return "Não foi possível criar o convite.";
}

// formatJoinedDate | Formata data de entrada no grupo
function formatJoinedDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

// formatCurrency | Formata valor monetário
function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
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
        style={{
          backgroundColor: bgColor,
          height,
          width,
        }}
        className={`flex flex-row items-center justify-center relative px-4 ${borderClassName}`}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}

// MemberCard | Cartão de membro com foto, dados e data de entrada
function MemberCard({ member }: MemberCardProps) {
  return (
    <View className="flex-row justify-between items-center gap-2 pr-4 py-3 border-b-[2px] border-blackapp/20">
      <View className="flex-row items-center gap-3 max-w-[70%] shrink">
        {member.avatar_url ? (
          <Image
            source={{ uri: member.avatar_url }}
            className="w-20 h-20 rounded-full bg-zinc-200 shrink-0"
          />
        ) : (
          <View className="w-20 h-20 rounded-full bg-zinc-300 items-center justify-center shrink-0">
            <Text className="text-blackapp font-bold text-sm">
              {member.name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}

        <View className="shrink h-20 justify-between py-2">
          <Text className="text-blackapp font-bold text-xl" numberOfLines={2}>
            {member.name}
          </Text>
          <Text className="text-hlpink text-xs mt-0.5" numberOfLines={1}>
            Deve: {formatCurrency(member.devendo)}
          </Text>
          <Text className="text-hlblue text-xs mt-0.5" numberOfLines={1}>
            Recebe: {formatCurrency(member.areceber)}
          </Text>
        </View>
      </View>

      <View className="max-w-[30%] items-end justify-center shrink pl-2">
        <Text className="text-mdprimary text-xs text-right" numberOfLines={3}>
          Membro desde {formatJoinedDate(member.joined_at)}
        </Text>
      </View>
    </View>
  );
}

// MembrosGrupo | Lista de membros recebida via navegação
export default function MembrosGrupo({ navigation, route }: Props) {
  const { groupId, groupName, members, createdBy } = route.params;
  const { profile } = useUser();
  const [loadingInvite, setLoadingInvite] = useState(false);

  const isCreator = profile?.id === createdBy;

  const handleShareInvite = async () => {
    if (!profile?.id || loadingInvite) return;

    setLoadingInvite(true);

    try {
      const inviteCode = await createGroupInvite(groupId, profile.id);

      await Share.share({
        message: buildInviteShareMessage(inviteCode, groupName),
        title: "Convite para o grupo",
      });
    } catch (err) {
      showErrorMessage(getErrorMessage(err), "commonError");
    } finally {
      setLoadingInvite(false);
    }
  };

  return (
    <View className="flex-1 flex flex-col">
      <View
        style={{
          height: responsiveHeight(5),
          width: responsiveWidth(100),
        }}
      />
      <View className="flex-1 border-t-[8px] border-b-[8px] border-blackapp">
        <ScrollView className="flex-1" contentContainerStyle={{}}>
          {members.map((member) => (
            <MemberCard key={member.user_id} member={member} />
          ))}
        </ScrollView>
      </View>

      <View style={{ width: responsiveWidth(100) }} className="pb-4">
        {isCreator ? (
          <AnimatedActionButton
            baseColor={themas.colors.hlpink}
            pressedColor={themas.colors.hlpinkmd}
            height={responsiveHeight(8)}
            width={responsiveWidth(100)}
            borderClassName="border-b-[4px] border-blackapp"
            onPress={handleShareInvite}
            disabled={loadingInvite}
          >
            {loadingInvite ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Share2 size={32} color="#fff" className="absolute left-6" />
                <Text className="text-base text-white font-bold text-center px-12">
                  CONVIDAR AMIGO
                </Text>
              </>
            )}
          </AnimatedActionButton>
        ) : null}

        <AnimatedActionButton
          baseColor={themas.colors.primary}
          pressedColor={themas.colors.mdprimary}
          height={responsiveHeight(8)}
          width={responsiveWidth(100)}
          borderClassName="border-b-[8px] border-blackapp"
          onPress={() => navigation.navigate("DetalheGrupo", { groupId })}
        >
          <Undo2 size={40} color="#fff" className="left-6 absolute mb-0.5" />
          <Text className="text-2xl text-white font-bold">VOLTAR</Text>
        </AnimatedActionButton>
      </View>
    </View>
  );
}
