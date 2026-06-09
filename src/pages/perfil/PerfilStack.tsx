// React Navigation
import { createNativeStackNavigator } from "@react-navigation/native-stack";

// Temas
import { themas } from "../../global/themes";

// Telas
import Perfil from "./perfil";
import TermosDeUso from "./sons/TermosDeUso";
import PoliticaPrivacidade from "./sons/PoliticaPrivacidade";
import Sobre from "./sons/Sobre";
import Ajuda from "./sons/Ajuda";

export type PerfilStackParamList = {
  PerfilMain: undefined;
  TermosDeUso: undefined;
  PoliticaPrivacidade: undefined;
  Sobre: undefined;
  Ajuda: undefined;
};

const Stack = createNativeStackNavigator<PerfilStackParamList>();

// PerfilStack | stack da aba perfil com telas de detalhamento
export default function PerfilStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: themas.colors.secondary },
      }}
    >
      <Stack.Screen name="PerfilMain" component={Perfil} />
      <Stack.Screen name="TermosDeUso" component={TermosDeUso} />
      <Stack.Screen
        name="PoliticaPrivacidade"
        component={PoliticaPrivacidade}
      />
      <Stack.Screen name="Sobre" component={Sobre} />
      <Stack.Screen name="Ajuda" component={Ajuda} />
    </Stack.Navigator>
  );
}
