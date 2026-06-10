// React Navigation
import { NativeStackScreenProps } from "@react-navigation/native-stack";

// Componentes
import StackPlaceholderScreen from "../../../components/interface/StackPlaceholderScreen";

// Stack
import { AtividadeStackParamList } from "../AtividadeStack";

type Props = NativeStackScreenProps<AtividadeStackParamList, "DetalheAtividade">;

export default function DetalheAtividade({ navigation }: Props) {
  return (
    <StackPlaceholderScreen
      title="Detalhe da Atividade"
      navigation={navigation}
    />
  );
}
