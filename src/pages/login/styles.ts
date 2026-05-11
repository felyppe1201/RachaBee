import { Dimensions, StyleSheet } from "react-native";
import { themas } from "../../global/themes";

export const style = StyleSheet.create({
    container:{
        flex:1,
        alignItems: 'center',
        justifyContent: 'center'
    },
    boxTop:{
        height:Dimensions.get("window").height/3,
        width:'100%',
        // backgroundColor:'red',
        alignItems:'center',
        justifyContent:'center'
    },
    boxMid:{
        height:Dimensions.get("window").height/4,
        width:'100%',
        // backgroundColor:'green',
        paddingHorizontal:37
    },
    boxBottom:{
        height:Dimensions.get("window").height/3,
        width:'100%',
        // backgroundColor:'blue',
        alignItems:'center',
        justifyContent:'center'
    },
    logo:{
        width:160,
        height:160
    },
    text:{
        fontWeight:'bold',
        marginTop:20,
        fontSize:18
    },
    textBottom:{
        fontSize:16,
        color:themas.colors.gray,
        marginBottom:40,
    },
});
