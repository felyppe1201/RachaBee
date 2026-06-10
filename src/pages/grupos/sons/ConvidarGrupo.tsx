// React Navigation
import { NativeStackScreenProps } from "@react-navigation/native-stack";

// Componentes
import StackPlaceholderScreen from "../../../components/interface/StackPlaceholderScreen";

// Stack
import { GruposStackParamList } from "../GruposStack";

type Props = NativeStackScreenProps<GruposStackParamList, "ConvidarGrupo">;

// ConvidarGrupo | Tela placeholder de convite ao grupo
export default function ConvidarGrupo({ navigation }: Props) {
  return (
    <StackPlaceholderScreen title="Convidar para o Grupo" navigation={navigation} />
  );
}
