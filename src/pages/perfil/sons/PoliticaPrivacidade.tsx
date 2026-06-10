// React Navigation
import { NativeStackScreenProps } from "@react-navigation/native-stack";

// Componentes
import StackPlaceholderScreen from "../../../components/interface/StackPlaceholderScreen";

// Stack
import { PerfilStackParamList } from "../PerfilStack";

type Props = NativeStackScreenProps<PerfilStackParamList, "PoliticaPrivacidade">;

// PoliticaPrivacidade | Tela placeholder da política de privacidade
export default function PoliticaPrivacidade({ navigation }: Props) {
  return (
    <StackPlaceholderScreen
      title="Politica de Privacidade"
      navigation={navigation}
    />
  );
}
