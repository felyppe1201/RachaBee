// React Native
import { Pressable, Text, View } from "react-native";

// Temas
import { themas } from "../../global/themes";

type Props = {
  title: string;
  navigation: { goBack: () => void };
};

// StackPlaceholderScreen | tela basica de stack com titulo e botao voltar
export default function StackPlaceholderScreen({ title, navigation }: Props) {
  return (
    <View
      className="flex-1 items-center justify-center px-6"
      style={{ backgroundColor: themas.colors.secondary }}
    >
      <Text className="font-bold text-lg text-center">{title}</Text>

      <Pressable
        className="mt-8 px-6 py-3 rounded-lg"
        style={{ backgroundColor: themas.colors.blackapp }}
        onPress={() => navigation.goBack()}
      >
        <Text className="font-bold" style={{ color: themas.colors.secondary }}>
          Voltar
        </Text>
      </Pressable>
    </View>
  );
}
