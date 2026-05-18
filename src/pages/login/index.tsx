import React, { useState } from "react";
import { Alert, Image, Text, View } from "react-native"
import { style } from "./styles";
import Logo from "../../assets/logo.png";
import { MaterialIcons, Octicons } from '@expo/vector-icons';
import { themas } from "../../global/themes";
import { supabase } from "../../lib/supabase";
import { Input } from "../../components/Input.tsx"
import { Button } from "../../components/Button.tsx";

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(true);
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Atenção', 'Preencha o e-mail e a senha.');
            return;
        }

        setLoading(true);
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        setLoading(false);

        if (error) {
            Alert.alert('Erro ao entrar', 'E-mail ou senha incorretos.');
        }
    }

    return (
        <View style={style.container}>
            <View style={style.boxTop}>
                <Image
                    source={Logo}
                    style={style.logo}
                    resizeMode="contain"
                />
                <Text style={style.text}>Bem vindo de volta!</Text>
            </View>
            <View style={style.boxMid}>
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
            <View style={style.boxBottom}>
                <Button text="Entrar" loading={loading} onPress={handleLogin} />
            </View>
            <Text style={style.textBottom}>
                Não tem conta? <Text style={{ color: themas.colors.primary }}>Crie agora!</Text>
            </Text>
        </View>
    )
}