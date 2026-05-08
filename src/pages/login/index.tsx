import React, { useState } from "react";
import {Image, Text, TextInput, TouchableOpacity, View} from "react-native"
import { style } from "./styles";
import Logo from "../../assets/logo.png";
import {MaterialIcons} from '@expo/vector-icons';
import { themas } from "../../global/themes";

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
                <Text style={style.titleInput}>ENDEREÇO E-MAIL</Text>
                <View style={style.boxInput}>
                    <TextInput
                        style={style.input}
                        value={email}
                        onChangeText={setEmail}
                    />
                    <MaterialIcons 
                        name='email'
                        size={20}
                        color={themas.colors.primary}
                    />
                </View>
                <Text style={style.titleInput}>SENHA</Text>
                <View style={style.boxInput}>
                    <TextInput
                        style={style.input}
                        value={password}
                        onChangeText={setPassword}
                    />
                    <MaterialIcons 
                        name='remove-red-eye'
                        size={20}
                        color={themas.colors.primary}
                    />
                </View>
            </View>
            <View style={style.boxBottom}>
                <TouchableOpacity style={style.button}>
                    <Text>Entrar</Text>
                </TouchableOpacity>
            </View>
            <Text style={style.textBottom}>Não tem conta?<Text style={{color:themas.colors.primary}}>Crie agora!</Text></Text>
        </View>
    )
}