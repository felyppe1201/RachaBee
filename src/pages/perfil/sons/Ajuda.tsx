// React Navigation
import { NativeStackScreenProps } from "@react-navigation/native-stack";

// Componentes
import StackPlaceholderScreen from "../../../components/interface/StackPlaceholderScreen";

// Stack
import { PerfilStackParamList } from "../PerfilStack";

type Props = NativeStackScreenProps<PerfilStackParamList, "Ajuda">;

export default function Ajuda({ navigation }: Props) {
  return <StackPlaceholderScreen title="Ajuda" navigation={navigation} />;
}
