// React Navigation
import { NavigationContainer } from "@react-navigation/native";
import {
  createBottomTabNavigator,
  BottomTabBarProps,
} from "@react-navigation/bottom-tabs";

// React
import { useEffect, useRef, type ReactNode } from "react";

// React Native
import {
  View,
  Text,
  Pressable,
  Animated,
  Easing,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Expo Icons
import { MaterialIcons, Ionicons } from "@expo/vector-icons";

// Páginas das tabs
import Home from "../pages/home/home";
import Grupos from "../pages/grupos/grupos";
import Atividade from "../pages/atividade/atividade";
import Perfil from "../pages/perfil/perfil";

// Temas
import { themas } from "../global/themes";

const TAB_COLORS = [themas.colors.hlblue, themas.colors.hlpink] as const;
const CARD_OVERLAP = 18;
const CARD_LIFT = 16;
const CARD_HEIGHT = 72;
const ICON_SIZE = 26;

type TabCardProps = {
  index: number;
  isFocused: boolean;
  cardWidth: number;
  cardHeight: number;
  label: string;
  icon: ReactNode;
  backgroundColor: string;
  onPress: () => void;
  onLongPress: () => void;
};

function TabCard({
  index,
  isFocused,
  cardWidth,
  cardHeight,
  label,
  icon,
  backgroundColor,
  onPress,
  onLongPress,
}: TabCardProps) {
  const liftAnim = useRef(new Animated.Value(isFocused ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(liftAnim, {
      toValue: isFocused ? 1 : 0,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [isFocused, liftAnim]);

  const translateY = liftAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -CARD_LIFT],
  });

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      accessibilityLabel={label}
      onPress={onPress}
      onLongPress={onLongPress}
      style={{
        width: cardWidth,
        height: cardHeight,
        marginLeft: index === 0 ? 0 : -CARD_OVERLAP,
        zIndex: index + 1,
      }}
    >
      <Animated.View
        className="flex-1 items-center justify-start rounded-t-lg pt-3 px-2"
        style={{
          backgroundColor,
          transform: [{ translateY }],
        }}
      >
        {icon}
        <Text
          className="text-[13px] font-extrabold mt-1 text-center px-1"
          style={{ color: themas.colors.secondary }}
          numberOfLines={1}
        >
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

function CardTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const tabCount = state.routes.length;
  const cardWidth = (width + CARD_OVERLAP * (tabCount - 1)) / tabCount;
  const navAreaHeight = Math.max(insets.bottom, 12);
  const cardHeight = CARD_HEIGHT + navAreaHeight;
  const barHeight = cardHeight + CARD_LIFT;

  return (
    <View
      className="w-full"
      style={{ height: barHeight, backgroundColor: themas.colors.secondary }}
    >
      <View className="flex-row items-end w-full" style={{ height: barHeight }}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;
          const label =
            typeof options.tabBarLabel === "string"
              ? options.tabBarLabel
              : (options.title ?? route.name);

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: "tabLongPress",
              target: route.key,
            });
          };

          const icon = options.tabBarIcon?.({
            focused: isFocused,
            color: themas.colors.secondary,
            size: ICON_SIZE,
          });

          const backgroundColor = isFocused
            ? themas.colors.primary
            : TAB_COLORS[index % TAB_COLORS.length];

          return (
            <TabCard
              key={route.key}
              index={index}
              isFocused={isFocused}
              cardWidth={cardWidth}
              cardHeight={cardHeight}
              label={label}
              icon={icon}
              backgroundColor={backgroundColor}
              onPress={onPress}
              onLongPress={onLongPress}
            />
          );
        })}
      </View>

      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          width: "100%",
          height: navAreaHeight,
          backgroundColor: themas.colors.blackapp,
          zIndex: 100,
        }}
      />
    </View>
  );
}

// Tab Navigator instance
const Tab = createBottomTabNavigator();

// TabNavigator | configura a navegação por abas da aplicação
export default function TabNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        tabBar={(props) => <CardTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          sceneStyle: { backgroundColor: themas.colors.secondary },
        }}
      >
        <Tab.Screen
          name="Home"
          component={Home}
          options={{
            tabBarLabel: "Home",
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons name="home" color={color} size={size} />
            ),
          }}
        />
        <Tab.Screen
          name="Grupos"
          component={Grupos}
          options={{
            tabBarLabel: "Meus Grupos",
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons name="group" color={color} size={size} />
            ),
          }}
        />
        <Tab.Screen
          name="Atividade"
          component={Atividade}
          options={{
            tabBarLabel: "Atividade",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="receipt-outline" color={color} size={size} />
            ),
          }}
        />
        <Tab.Screen
          name="Perfil"
          component={Perfil}
          options={{
            tabBarLabel: "Perfil",
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons name="person" color={color} size={size} />
            ),
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
