import { StyleSheet } from "react-native";
import { themas } from "../../global/themes";

export const style = StyleSheet.create({
    button:{
        backgroundColor:themas.colors.primary,
        width:220,
        height:50,
        alignItems:'center',
        justifyContent:'center',
        borderRadius:40,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 12,
        },
        shadowOpacity: 0.58,
        shadowRadius: 16.00,
        elevation: 24,
    },
    textButton:{
        fontSize:16,
        fontWeight:'bold',
        color:themas.colors.secondary
    },
})