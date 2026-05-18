import "./global.css";

// React Native
import { ActivityIndicator, View } from "react-native";

// Páginas
import Login from "./src/pages/login";

// Hooks
import { useAuth } from "./src/hooks/useAuth";

export default function App() {
  const { session, loading } = useAuth();

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

  // Render raiz do app
  return <Login />;
}
