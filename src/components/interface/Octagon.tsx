import React, { useState } from "react";
import { View, StyleSheet, ViewStyle, LayoutChangeEvent } from "react-native";
import Svg, { Polygon } from "react-native-svg";
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

export const Octagon: React.FC<Props> = ({
  color = "primary",
  stroke,
  strokeWidth = 0,
  style,
  points,
}) => {
  // dimensões reais do container em pixels
  const [size, setSize] = useState({ width: 0, height: 0 });

  const colors: any = (themas && (themas as any).colors) || {};
  const resolve = (c?: string) => {
    if (!c) return undefined;
    return colors[c] ?? c;
  };

  const fill = resolve(color);
  const strokeColor = resolve(stroke);

  const computeRegularOctagon = (
    radius = 45,
    cx = 50,
    cy = 50,
    rotationDeg = 22.5,
  ) => {
    // rotationDeg default 22.5 so bottom becomes a flat edge
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

  // reduce radius a bit if stroke exists to avoid clipping
  const strokeOffset = strokeWidth ? Math.min(strokeWidth, 6) : 0;
  const pts = points ?? computeRegularOctagon(45 - strokeOffset);

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
        >
          <Polygon
            points={pts}
            fill={fill}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
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
