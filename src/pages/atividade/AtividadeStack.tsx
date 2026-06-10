// React Navigation
import { createNativeStackNavigator } from "@react-navigation/native-stack";

// Temas
import { themas } from "../../global/themes";

// Telas
import Atividade from "./atividade";
import DetalheAtividade from "./sons/DetalheAtividade";

export type AtividadeStackParamList = {
  AtividadeMain: undefined;
  DetalheAtividade: { activityId: string };
};

const Stack = createNativeStackNavigator<AtividadeStackParamList>();

// AtividadeStack | stack da aba atividade com tela de detalhamento
export default function AtividadeStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: themas.colors.secondary },
      }}
    >
      <Stack.Screen name="AtividadeMain" component={Atividade} />
      <Stack.Screen name="DetalheAtividade" component={DetalheAtividade} />
    </Stack.Navigator>
  );
}
