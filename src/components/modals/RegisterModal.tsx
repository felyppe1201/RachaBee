import React, { useState } from "react";
import {
  Alert,
  Image,
  Modal,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { MaterialIcons, Octicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import { themas } from "../../global/themes";
import { Input } from "../interface/Input";
import { Button } from "../interface/Button";

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function RegisterModal({ visible, onClose }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(true);
  const [showConfirmPassword, setShowConfirmPassword] = useState(true);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permissão negada", "Precisamos de acesso à galeria.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const uploadAvatar = async (userId: string): Promise<string | null> => {
    if (!avatarUri) return null;

    try {
      const fileName = `${userId}.jpg`;
      const response = await fetch(avatarUri);
      const blob = await response.blob();
      const arrayBuffer = await new Response(blob).arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, uint8Array, {
          contentType: "image/jpeg",
          upsert: true,
        });

      if (uploadError) {
        console.log("Erro no upload:", uploadError.message);
        return null;
      }

      const { data } = supabase.storage.from("avatars").getPublicUrl(fileName);
      return data.publicUrl;
    } catch (err) {
      console.log("Erro inesperado no upload:", err);
      return null;
    }
  };

  const handleRegister = async () => {
    if (!name || !email || !password || !confirmPassword) {
      Alert.alert("Atenção", "Preencha todos os campos.");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Atenção", "As senhas não coincidem.");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Atenção", "A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    setLoading(true);

    let avatarUrl: string | null = null;
    if (avatarUri) {
      const tempId = `temp_${Date.now()}`;
      avatarUrl = await uploadAvatar(tempId);
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          avatar_url: avatarUrl,
        },
      },
    });

    setLoading(false);

    if (error) {
      Alert.alert("Erro ao cadastrar", error.message);
      return;
    }

    Alert.alert(
      "Cadastro realizado!",
      "Enviamos um e-mail de confirmação. Confirme para acessar o app.",
      [{ text: "OK", onPress: handleClose }]
    );
  };

  const handleClose = () => {
    setName("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setAvatarUri(null);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-white rounded-t-3xl px-6 pt-6 pb-10">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-xl font-bold">Criar conta</Text>
            <TouchableOpacity onPress={handleClose}>
              <MaterialIcons name="close" size={24} color={themas.colors.gray} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <TouchableOpacity className="self-center mb-4" onPress={handlePickImage}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} className="w-24 h-24 rounded-full" />
              ) : (
                <View
                  className="w-24 h-24 rounded-full items-center justify-center"
                  style={{ backgroundColor: themas.colors.lightGray }}
                >
                  <MaterialIcons name="add-a-photo" size={32} color={themas.colors.gray} />
                </View>
              )}
              <Text className="text-center text-xs mt-1" style={{ color: themas.colors.gray }}>
                Foto de perfil
              </Text>
            </TouchableOpacity>

            <Input
              value={name}
              onChangeText={setName}
              title="NOME"
              IconRight={MaterialIcons}
              iconRightName="person"
            />
            <Input
              value={email}
              onChangeText={setEmail}
              title="E-MAIL"
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
            <Input
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              title="CONFIRMAR SENHA"
              IconRight={Octicons}
              iconRightName={showConfirmPassword ? "eye-closed" : "eye"}
              secureTextEntry={showConfirmPassword}
              onIconRightPress={() => setShowConfirmPassword(!showConfirmPassword)}
            />

            <View className="items-center mt-6">
              <Button text="Criar conta" loading={loading} onPress={handleRegister} />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}