// React
import React, { useState } from "react";

// React Native
import { Alert, Image, Text, View } from "react-native";

// Expo Icons
import { MaterialIcons, Octicons } from "@expo/vector-icons";

// Assets
import Logo from "../../assets/logo.png";

// Supabase
import { supabase } from "../../lib/supabase";

// Interface
import { Input } from "../../components/interface/Input";
import { Button } from "../../components/interface/Button";

// Modals
import { RegisterModal } from "../../components/modals/RegisterModal";

// Temas
import { themas } from "../../global/themes";

// Login | Tela de autenticação com opção de cadastro
export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showRegister, setShowRegister] = useState(false);

  // handleLogin | Autentica usuário via e-mail e senha
  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Atenção", "Preencha o e-mail e a senha.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (error) {
      Alert.alert("Erro ao entrar", "E-mail ou senha incorretos.");
    }
  };

  return (
    <View className="flex-1 items-center justify-center">
      {/* INICIO MODAL CADASTRO */}
      <RegisterModal
        visible={showRegister}
        onClose={() => setShowRegister(false)}
      />
      {/* FIM MODAL CADASTRO */}

      {/* INICIO HEADER */}
      <View className="h-1/3 w-full items-center justify-center">
        <Image source={Logo} className="w-40 h-40" resizeMode="contain" />
        <Text className="font-bold mt-5 text-lg">Bem vindo de volta!</Text>
      </View>
      {/* FIM HEADER */}

      {/* INICIO FORMULÁRIO */}
      <View className="h-1/4 w-full px-9">
        <Input
          value={email}
          onChangeText={setEmail}
          title="ENDEREÇO DE E-MAIL"
          IconRight={MaterialIcons}
          iconRightName="email"
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Input
          value={password}
          onChangeText={setPassword}
          title="SENHA"
          IconRight={Octicons}
          iconRightName={showPassword ? "eye-closed" : "eye"}
          secureTextEntry={showPassword}
          onIconRightPress={() => setShowPassword(!showPassword)}
        />
      </View>
      {/* FIM FORMULÁRIO */}

      {/* INICIO AÇÃO */}
      <View className="h-1/3 w-full items-center justify-center">
        <Button text="Entrar" loading={loading} onPress={handleLogin} />
      </View>
      {/* FIM AÇÃO */}

      {/* INICIO RODAPÉ */}
      <Text className="text-base mb-10" style={{ color: themas.colors.gray }}>
        Não tem conta?{" "}
        <Text
          style={{ color: themas.colors.primary }}
          onPress={() => setShowRegister(true)}
        >
          Crie agora!
        </Text>
      </Text>
      {/* FIM RODAPÉ */}
    </View>
  );
}
