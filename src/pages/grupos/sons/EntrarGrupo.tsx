// React Navigation
import { NativeStackScreenProps } from "@react-navigation/native-stack";

// Componentes
import StackPlaceholderScreen from "../../../components/interface/StackPlaceholderScreen";

// Stack
import { GruposStackParamList } from "../GruposStack";

type Props = NativeStackScreenProps<GruposStackParamList, "EntrarGrupo">;

export default function EntrarGrupo({ navigation }: Props) {
  return (
    <StackPlaceholderScreen title="Entrar em um Grupo" navigation={navigation} />
  );
}
