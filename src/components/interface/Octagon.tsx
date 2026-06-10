// React
import React, { useState } from "react";

// React Native
import { View, StyleSheet, ViewStyle, LayoutChangeEvent } from "react-native";

// SVG
import Svg, { Polygon, Defs, Filter, FeDropShadow } from "react-native-svg";

// Temas
import { themas } from "../../global/themes";

type Props = {
  /** cor pode ser chave do tema (ex: 'primary') ou valor literal ('#ff0000') */
  color?: string;
  stroke?: string;
  strokeWidth?: number;
  style?: ViewStyle;
  /** pontos customizados do polígono (opcional) */
  points?: string;
};

// Octagon | Forma octogonal SVG com sombra e cores do tema
export const Octagon: React.FC<Props> = ({
  color = "primary",
  stroke,
  strokeWidth = 0,
  style,
  points,
}) => {
  const [size, setSize] = useState({ width: 0, height: 0 });

  const colors: any = (themas && (themas as any).colors) || {};

  // resolve | Converte chave do tema ou retorna valor literal
  const resolve = (c?: string) => {
    if (!c) return undefined;
    return colors[c] ?? c;
  };

  const fill = resolve(color);
  const strokeColor = resolve(stroke);

  // computeRegularOctagon | Gera pontos de octógono regular no viewBox
  const computeRegularOctagon = (
    radius = 45,
    cx = 50,
    cy = 50,
    rotationDeg = 22.5,
  ) => {
    const ptsArr: string[] = [];
    const start = -90 + rotationDeg;
    for (let i = 0; i < 8; i++) {
      const angleDeg = start + i * 45;
      const angle = (angleDeg * Math.PI) / 180;
      const x = cx + radius * Math.cos(angle);
      const y = cy + radius * Math.sin(angle);
      ptsArr.push(`${x.toFixed(3)},${y.toFixed(3)}`);
    }
    return ptsArr.join(" ");
  };

  const strokeOffset = strokeWidth ? Math.min(strokeWidth, 6) : 0;
  const pts = points ?? computeRegularOctagon(45 - strokeOffset);

  // handleLayout | Captura dimensões do container para renderizar o SVG
  const handleLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ width, height });
  };

  return (
    <View style={[styles.container, style]} onLayout={handleLayout}>
      {size.width > 0 && (
        <Svg
          width={size.width}
          height={size.height}
          viewBox="-2 -2 104 104"
          preserveAspectRatio="xMidYMid meet"
          overflow="visible"
        >
          <Defs>
            <Filter id="hardShadow">
              <FeDropShadow
                dx="6"
                dy="6"
                stdDeviation="1"
                floodColor="black"
                floodOpacity="0.65"
              />
            </Filter>
          </Defs>
          <Polygon
            points={pts}
            fill={fill}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            filter="url(#hardShadow)"
          />
        </Svg>
      )}
    </View>
  );
};

export default Octagon;

const styles = StyleSheet.create({
  container: {
    height: "100%",
    width: "100%",
  },
});
