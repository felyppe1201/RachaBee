import "./global.css";

// React
import { useEffect } from "react";

// React Native
import { ActivityIndicator, Platform, View } from "react-native";

// Expo
import * as NavigationBar from "expo-navigation-bar";
import { StatusBar } from "expo-status-bar";

// Páginas
import Login from "./src/pages/login";

// Navegação
import TabNavigator from "./src/navigation/TabNavigator";

// Hooks
import { useAuth } from "./src/hooks/useAuth";

// Context
import { UserProvider, useUser } from "./src/context/UserContext";

// ErrorMessage
import { ErrorMessageProvider } from "./src/components/interface/ErrorMessage";

// Temas
import { themas } from "./src/global/themes";

function useAndroidNavigationBar() {
  useEffect(() => {
    if (Platform.OS !== "android") return;

    NavigationBar.setBackgroundColorAsync(themas.colors.blprimary);
    NavigationBar.setButtonStyleAsync("light");
  }, []);
}

// AppContent | separado do App para poder consumir o UserProvider
function AppContent() {
  const { session, loading } = useAuth();
  const { loadUser, clearUser } = useUser();

  useEffect(() => {
    if (loading) return;
    if (session) {
      loadUser(session.user.id);
    } else {
      clearUser();
    }
  }, [session, loading, loadUser, clearUser]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!session) {
    return <Login />;
  }

  // Menu principal da aplicação
  return <TabNavigator />;
}

export default function App() {
  useAndroidNavigationBar();

  return (
    <>
      <StatusBar style="dark" />
      <UserProvider>
        <ErrorMessageProvider>
          <AppContent />
        </ErrorMessageProvider>
      </UserProvider>
    </>
  );
}
