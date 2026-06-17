import { TouchableOpacity, Text, Linking, Alert, StyleSheet, View } from 'react-native';
import Svg, { Rect, Circle } from 'react-native-svg';

type Props = {
  handle: string;
  size?: number;
  showHandle?: boolean;
};

export function InstagramButton({ handle, size = 36, showHandle = false }: Props) {
  const open = () => {
    const username = handle.replace('@', '');
    Linking.openURL(`https://instagram.com/${username}`).catch(() =>
      Alert.alert('Errore', 'Impossibile aprire Instagram.')
    );
  };

  const iconSize = size * 0.55;

  return (
    <TouchableOpacity
      style={[s.btn, { borderRadius: size / 2, paddingHorizontal: showHandle ? 12 : 0, width: showHandle ? undefined : size, height: size }]}
      onPress={open}
      activeOpacity={0.8}
    >
      <Svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none">
        <Rect x="2" y="2" width="20" height="20" rx="6" ry="6" stroke="#fff" strokeWidth="2" />
        <Circle cx="12" cy="12" r="4.5" stroke="#fff" strokeWidth="2" />
        <Circle cx="17.5" cy="6.5" r="1.2" fill="#fff" />
      </Svg>
      {showHandle && (
        <Text style={[s.handle, { fontSize: size * 0.38 }]}>@{handle.replace('@', '')}</Text>
      )}
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  btn: {
    backgroundColor: '#C13584',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  handle: {
    color: '#fff',
    fontWeight: '700',
  },
});
