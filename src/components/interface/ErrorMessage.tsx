// Lucide
import { TriangleAlert, type LucideIcon } from "lucide-react-native";

// React
import React, { useEffect, useRef, useState } from "react";

// React Native
import { View, Text, Pressable, StyleSheet } from "react-native";

// Responsividade
import {
  responsiveWidth,
  responsiveHeight,
} from "react-native-responsive-dimensions";

const DISPLAY_DURATION_MS = 8000;

export type ErrorMessageType = "commonError";

type ErrorPayload = {
  message: string;
  type: ErrorMessageType;
};

const ERROR_ICONS: Record<ErrorMessageType, LucideIcon> = {
  commonError: TriangleAlert,
};

let showErrorCallback: ((payload: ErrorPayload) => void) | null = null;

/*
OBJECTIVE:
Exibe mensagem de erro global de forma imperativa.

CONTEXT:
Pode ser chamada de qualquer tela ou modal sem precisar de estado local.

IMPACT:
Requer ErrorMessageProvider montado na raiz do app.
*/
export function showErrorMessage(
  message: string,
  type: ErrorMessageType = "commonError"
): void {
  showErrorCallback?.({ message, type });
}

type ErrorMessageBannerProps = {
  message: string;
  type: ErrorMessageType;
};

function ErrorMessageBanner({ message, type }: ErrorMessageBannerProps) {
  const Icon = ERROR_ICONS[type];

  return (
    <Pressable
      style={styles.banner}
      className="bg-hlpink border-[4px] border-black"
      onPress={(event) => event.stopPropagation()}
    >
      <View className="p-2 items-center justify-center shrink-0">
        <Icon size={44} color="#fff" />
      </View>
      <View style={styles.textContainer} className="py-2">
        <Text
          className="text-white font-bold text-base"
          numberOfLines={4}
          ellipsizeMode="tail"
        >
          {message}
        </Text>
      </View>
    </Pressable>
  );
}

/*
OBJECTIVE:
Provê o banner de erro na raiz da aplicação.

CONTEXT:
Montado em App.tsx para sobrepor modals e navegação.

IMPACT:
Sem este provider, showErrorMessage não exibe nada.
*/
export function ErrorMessageProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [error, setError] = useState<ErrorPayload | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    showErrorCallback = (payload) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      setError(payload);
      timerRef.current = setTimeout(() => {
        setError(null);
        timerRef.current = null;
      }, DISPLAY_DURATION_MS);
    };

    return () => {
      showErrorCallback = null;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <>
      {children}
      {error ? (
        <View style={styles.overlay} pointerEvents="box-none">
          <ErrorMessageBanner message={error.message} type={error.type} />
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    elevation: 9999,
    justifyContent: "flex-end",
  },
  banner: {
    position: "absolute",
    bottom: responsiveHeight(3),
    left: responsiveWidth(4),
    width: responsiveWidth(92),
    height: responsiveHeight(12),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    paddingHorizontal: 16,
    gap: 16,
  },
  textContainer: {
    flex: 1,
    justifyContent: "center",
  },
});
