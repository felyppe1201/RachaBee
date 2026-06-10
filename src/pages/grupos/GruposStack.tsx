// React Navigation
import { createNativeStackNavigator } from "@react-navigation/native-stack";

// Temas
import { themas } from "../../global/themes";

// Telas
import Grupos from "./grupos";
import DetalheGrupo from "./sons/DetalheGrupo";
import DetalheExpense from "./sons/DetalheExpense";
import MembrosGrupo from "./sons/MembrosGrupo";
import ConvidarGrupo from "./sons/ConvidarGrupo";
import type { GroupMemberInfo } from "../../lib/GroupService";

export type GruposStackParamList = {
  GruposMain: undefined;
  DetalheGrupo: { groupId: string };
  MembrosGrupo: {
    groupId: string;
    groupName: string;
    members: GroupMemberInfo[];
    createdBy: string;
  };
  DetalheExpense: { groupId: string; expenseId: string };
  ConvidarGrupo: { groupId: string };
  EntrarGrupo: { inviteCode?: string };
};

const Stack = createNativeStackNavigator<GruposStackParamList>();

// GruposStack | stack da aba grupos com telas de detalhamento
export default function GruposStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: themas.colors.secondary },
      }}
    >
      <Stack.Screen name="GruposMain" component={Grupos} />
      <Stack.Screen name="DetalheGrupo" component={DetalheGrupo} />
      <Stack.Screen name="DetalheExpense" component={DetalheExpense} />
      <Stack.Screen name="MembrosGrupo" component={MembrosGrupo} />
      <Stack.Screen name="ConvidarGrupo" component={ConvidarGrupo} />
    </Stack.Navigator>
  );
}
