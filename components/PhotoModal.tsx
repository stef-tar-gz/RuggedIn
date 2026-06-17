import { Modal, View, TouchableOpacity, Text, StyleSheet, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SW, height: SH } = Dimensions.get('window');

type Props = {
  visible: boolean;
  uri: string;
  accentColor: string;
  onClose: () => void;
  onChange?: () => void;
  readOnly?: boolean;
};

export function PhotoModal({ visible, uri, accentColor, onClose, onChange, readOnly = false }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill}>

        {/* Vignette: 4 gradienti dal bordo verso il centro */}
        <LinearGradient
          colors={['rgba(0,0,0,0.85)', 'transparent']}
          style={[s.vignette, { top: 0, left: 0, right: 0, height: SH * 0.55 }]}
          start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }}
        />
        <LinearGradient
          colors={['rgba(0,0,0,0.85)', 'transparent']}
          style={[s.vignette, { bottom: 0, left: 0, right: 0, height: SH * 0.55 }]}
          start={{ x: 0.5, y: 1 }} end={{ x: 0.5, y: 0 }}
        />
        <LinearGradient
          colors={['rgba(0,0,0,0.7)', 'transparent']}
          style={[s.vignette, { top: 0, bottom: 0, left: 0, width: SW * 0.55 }]}
          start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }}
        />
        <LinearGradient
          colors={['rgba(0,0,0,0.7)', 'transparent']}
          style={[s.vignette, { top: 0, bottom: 0, right: 0, width: SW * 0.55 }]}
          start={{ x: 1, y: 0.5 }} end={{ x: 0, y: 0.5 }}
        />

        {/* Contenuto centrato */}
        <View style={s.content}>
          <View style={s.frame}>
            <Image source={{ uri }} style={s.image} contentFit="cover" />
          </View>

          <View style={s.actions}>
            {!readOnly && (
              <TouchableOpacity
                style={[s.btn, { backgroundColor: accentColor }]}
                onPress={onChange}
              >
                <Text style={s.btnText}>Cambia</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[s.btn, s.btnClose]}
              onPress={onClose}
            >
              <Text style={s.btnText}>Chiudi</Text>
            </TouchableOpacity>
          </View>
        </View>

      </BlurView>
    </Modal>
  );
}

const s = StyleSheet.create({
  vignette: { position: 'absolute' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  frame: {
    width: 280, height: 280, borderRadius: 140,
    overflow: 'hidden',
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.25)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8, shadowRadius: 40, elevation: 24,
  },
  image: { width: '100%', height: '100%' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 36 },
  btn: { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  btnClose: { backgroundColor: 'rgba(255,255,255,0.15)' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
