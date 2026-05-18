import React, { useState } from "react";
import { Alert, Image, Text, TouchableOpacity, View } from "react-native";
import Logo from "../../assets/logo.png";
import { MaterialIcons, Octicons } from "@expo/vector-icons";
import { themas } from "../../global/themes";
import { supabase } from "../../lib/supabase";
import { Input } from "../../components/interface/Input";
import { Button } from "../../components/interface/Button";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(true);
  const [loading, setLoading] = useState(false);

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
      <View className="h-1/3 w-full items-center justify-center">
        <Image source={Logo} className="w-40 h-40" resizeMode="contain" />
        <Text className="font-bold mt-5 text-lg">Bem vindo de volta!</Text>
      </View>

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

      <View className="h-1/3 w-full items-center justify-center">
        <Button text="Entrar" loading={loading} onPress={handleLogin} />
      </View>

      <Text className="text-base mb-10" style={{ color: themas.colors.gray }}>
        Não tem conta?{" "}
        <Text style={{ color: themas.colors.primary }}>Crie agora!</Text>
      </Text>
    </View>
  );
}
