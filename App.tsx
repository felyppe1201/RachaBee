import "./global.css";

// React
import { useEffect } from "react";

// React Native
import { ActivityIndicator, View } from "react-native";

// Páginas
import Login from "./src/pages/login";

// Navegação
import TabNavigator from "./src/navigation/TabNavigator";

// Hooks
import { useAuth } from "./src/hooks/useAuth";

// Context
import { UserProvider, useUser } from "./src/context/UserContext";

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
  }, [session, loading]);

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
  return (
    <UserProvider>
      <AppContent />
    </UserProvider>
  );
}
