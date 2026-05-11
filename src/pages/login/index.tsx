import React, { useState } from "react";
import {Image, Text, View} from "react-native"
import { style } from "./styles";
import Logo from "../../assets/logo.png";
import {MaterialIcons, Octicons} from '@expo/vector-icons';
import { themas } from "../../global/themes";
import { Input } from "../../components/Input/Index";
import { Button } from "../../components/Button/Index";

export default  function Login (){
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(true);

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
                />
                <Input
                    value={password}
                    onChangeText={setPassword}
                    title="SENHA"
                    IconRight={Octicons}
                    iconRightName={showPassword?"eye-closed":"eye"}
                    secureTextEntry={showPassword}
                    onIconRightPress={()=>setShowPassword(!showPassword)}
                />
            </View>
            <View style={style.boxBottom}>
                <Button text="Entrar" />
            </View>
            <Text style={style.textBottom}>Não tem conta?<Text style={{color:themas.colors.primary}}>Crie agora!</Text></Text>
        </View>
    )
}