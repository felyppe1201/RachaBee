import React, { forwardRef, Fragment, LegacyRef } from "react";
import { View, TextInput, Text, type TextInputProps, TouchableOpacity } from "react-native";
import { MaterialIcons, FontAwesome, Octicons } from '@expo/vector-icons';
import { themas } from "../global/themes";

type IconComponent = React.ComponentType<React.ComponentProps<typeof MaterialIcons>> |
                     React.ComponentType<React.ComponentProps<typeof FontAwesome>> |
                     React.ComponentType<React.ComponentProps<typeof Octicons>>;

type Props = TextInputProps & {
    IconLeft?: IconComponent,
    IconRight?: IconComponent,
    iconLeftName?: string,
    iconRightName?: string,
    title?: string,
    onIconLeftPress?: () => void,
    onIconRightPress?: () => void,
}

export const Input = forwardRef((Props: Props, ref: LegacyRef<TextInput> | null) => {

    const { IconLeft, IconRight, iconLeftName, iconRightName, title, onIconLeftPress, onIconRightPress, ...rest } = Props

    const getInputWidth = () => {
        if (IconLeft && IconRight) return 'w-[80%]'
        if (IconLeft || IconRight) return 'w-[90%]'
        return 'w-full'
    }

    const getPaddingLeft = () => {
        if (IconLeft && IconRight) return 'pl-[10px]'
        if (IconLeft || IconRight) return 'pl-[15px]'
        return 'pl-[20px]'
    }

    return (
        <Fragment>
            {title && <Text className="ml-1 text-gray-500 mt-5">{title}</Text>}
            <View className={`w-full h-10 border rounded-full mt-2 flex-row items-center px-1 bg-[#eceeec] border-[#eceeec] ${getPaddingLeft()}`}>
                {IconLeft && iconLeftName && (
                    <TouchableOpacity onPress={onIconLeftPress} className="w-[10%]">
                        <IconLeft name={iconLeftName as any} size={20} color={themas.colors.primary} />
                    </TouchableOpacity>
                )}
                <TextInput
                    className={`h-full rounded-full pl-1 ${getInputWidth()}`}
                    ref={ref}
                    {...rest}
                />
                {IconRight && iconRightName && (
                    <TouchableOpacity onPress={onIconRightPress} className="w-[10%]">
                        <IconRight name={iconRightName as any} size={20} color={themas.colors.primary} />
                    </TouchableOpacity>
                )}
            </View>
        </Fragment>
    )
})