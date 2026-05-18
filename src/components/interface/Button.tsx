import React from "react";
import {
  ActivityIndicator,
  Text,
  TouchableHighlightProps,
  TouchableOpacity,
} from "react-native";
import { themas } from "../../global/themes";

type Props = TouchableHighlightProps & {
  text: string;
  loading?: boolean;
};

export function Button({ ...rest }: Props) {
  return (
    <TouchableOpacity
      className="w-[220px] h-[50px] items-center justify-center rounded-full shadow-lg"
      style={{ backgroundColor: themas.colors.primary }}
      {...rest}
      activeOpacity={0.6}
    >
      {rest.loading ? (
        <ActivityIndicator color={themas.colors.secondary} />
      ) : (
        <Text
          className="text-base font-bold"
          style={{ color: themas.colors.secondary }}
        >
          {rest.text}
        </Text>
      )}
    </TouchableOpacity>
  );
}
