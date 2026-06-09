// React Navigation
import { NativeStackScreenProps } from "@react-navigation/native-stack";

// Componentes
import StackPlaceholderScreen from "../../../components/interface/StackPlaceholderScreen";

// Stack
import { PerfilStackParamList } from "../PerfilStack";

type Props = NativeStackScreenProps<PerfilStackParamList, "TermosDeUso">;

export default function TermosDeUso({ navigation }: Props) {
  return (
    <StackPlaceholderScreen title="Termos de Uso" navigation={navigation} />
  );
}
