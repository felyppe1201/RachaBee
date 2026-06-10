// React Navigation
import { NativeStackScreenProps } from "@react-navigation/native-stack";

// Componentes
import StackPlaceholderScreen from "../../../components/interface/StackPlaceholderScreen";

// Stack
import { PerfilStackParamList } from "../PerfilStack";

type Props = NativeStackScreenProps<PerfilStackParamList, "Sobre">;

// Sobre | Tela placeholder sobre o aplicativo
export default function Sobre({ navigation }: Props) {
  return <StackPlaceholderScreen title="Sobre" navigation={navigation} />;
}
