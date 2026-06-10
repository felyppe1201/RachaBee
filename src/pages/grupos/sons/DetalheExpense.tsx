// React Navigation
import { NativeStackScreenProps } from "@react-navigation/native-stack";

// Componentes
import StackPlaceholderScreen from "../../../components/interface/StackPlaceholderScreen";

// Stack
import { GruposStackParamList } from "../GruposStack";

type Props = NativeStackScreenProps<GruposStackParamList, "DetalheExpense">;

// DetalheExpense | Placeholder da despesa até implementação completa
export default function DetalheExpense({ navigation }: Props) {
  return (
    <StackPlaceholderScreen
      title="Detalhe da Despesa"
      navigation={navigation}
    />
  );
}
