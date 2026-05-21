// React Navigation
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

// Expo Icons
import { MaterialIcons, Ionicons } from "@expo/vector-icons";

// Páginas das tabs
import Home from "../pages/home/home";
import Grupos from "../pages/grupos/grupos";
import Atividade from "../pages/atividade/atividade";
import Perfil from "../pages/perfil/perfil";

// Temas
import { themas } from "../global/themes";

// Tab Navigator instance
const Tab = createBottomTabNavigator();

// TabNavigator | configura a navegação por abas da aplicação
export default function TabNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: themas.colors.mdprimary,
          tabBarInactiveTintColor: themas.colors.gray,
          tabBarStyle: { backgroundColor: themas.colors.secondary },
        }}
      >
        <Tab.Screen
          name="Home"
          component={Home}
          options={{
            tabBarLabel: "Home",
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons name="home" color={color} size={size} />
            ),
          }}
        />
        <Tab.Screen
          name="Grupos"
          component={Grupos}
          options={{
            tabBarLabel: "Meus Grupos",
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons name="group" color={color} size={size} />
            ),
          }}
        />
        <Tab.Screen
          name="Atividade"
          component={Atividade}
          options={{
            tabBarLabel: "Atividade",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="receipt-outline" color={color} size={size} />
            ),
          }}
        />
        <Tab.Screen
          name="Perfil"
          component={Perfil}
          options={{
            tabBarLabel: "Perfil",
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons name="person" color={color} size={size} />
            ),
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
