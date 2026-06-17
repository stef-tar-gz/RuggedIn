import { useRef } from 'react';
import { Animated, Pressable, StyleProp, ViewStyle } from 'react-native';

type Props = {
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
};

export function ScalePressable({ onPress, style, children }: Props) {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () =>
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 40, bounciness: 4 }).start();

  const onPressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 6 }).start();

  return (
    <Pressable onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut}>
      <Animated.View style={[style, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}
