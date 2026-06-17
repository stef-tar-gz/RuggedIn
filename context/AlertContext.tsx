import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet, Dimensions
} from 'react-native';
import { useTheme } from './ThemeContext';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SW, height: SH } = Dimensions.get('window');

type AlertButton = {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
};

type AlertConfig = {
  title: string;
  message?: string;
  buttons?: AlertButton[];
};

type AlertContextValue = {
  showAlert: (config: AlertConfig) => void;
};

const AlertContext = createContext<AlertContextValue>({ showAlert: () => {} });

export function AlertProvider({ children }: { children: ReactNode }) {
  const { colors, isDark } = useTheme();
  const [config, setConfig] = useState<AlertConfig | null>(null);
  const s = makeStyles(colors);

  const showAlert = useCallback((cfg: AlertConfig) => {
    setConfig(cfg);
  }, []);

  const dismiss = (btn?: AlertButton) => {
    setConfig(null);
    btn?.onPress?.();
  };

  const buttons = config?.buttons ?? [{ text: 'OK' }];

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
      <Modal visible={!!config} transparent animationType="fade" onRequestClose={() => dismiss()}>
        <BlurView intensity={40} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill}>
          <LinearGradient
            colors={['rgba(0,0,0,0.72)', 'transparent']}
            style={[s.vignette, { top: 0, left: 0, right: 0, height: SH * 0.5 }]}
            start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }}
          />
          <LinearGradient
            colors={['rgba(0,0,0,0.72)', 'transparent']}
            style={[s.vignette, { bottom: 0, left: 0, right: 0, height: SH * 0.5 }]}
            start={{ x: 0.5, y: 1 }} end={{ x: 0.5, y: 0 }}
          />
          <LinearGradient
            colors={['rgba(0,0,0,0.5)', 'transparent']}
            style={[s.vignette, { top: 0, bottom: 0, left: 0, width: SW * 0.5 }]}
            start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }}
          />
          <LinearGradient
            colors={['rgba(0,0,0,0.5)', 'transparent']}
            style={[s.vignette, { top: 0, bottom: 0, right: 0, width: SW * 0.5 }]}
            start={{ x: 1, y: 0.5 }} end={{ x: 0, y: 0.5 }}
          />
          <View style={s.overlay}>
          <View style={s.box}>
            {config?.title && <Text style={s.title}>{config.title}</Text>}
            {config?.message && <Text style={s.message}>{config.message}</Text>}

            <View style={[s.btnRow, buttons.length > 2 && s.btnCol]}>
              {buttons.map((btn, i) => (
                <TouchableOpacity
                  key={i}
                  style={[
                    s.btn,
                    buttons.length === 1 && s.btnFull,
                    buttons.length > 2 && s.btnFullCol,
                    btn.style === 'cancel' && s.btnCancel,
                    btn.style === 'destructive' && s.btnDestructive,
                    i > 0 && buttons.length <= 2 && s.btnBorderLeft,
                    i > 0 && buttons.length > 2 && s.btnBorderTop,
                  ]}
                  onPress={() => dismiss(btn)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    s.btnText,
                    btn.style === 'cancel' && s.btnTextCancel,
                    btn.style === 'destructive' && s.btnTextDestructive,
                    (!btn.style || btn.style === 'default') && i === buttons.length - 1 && s.btnTextPrimary,
                  ]}>
                    {btn.text}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          </View>
        </BlurView>
      </Modal>
    </AlertContext.Provider>
  );
}

export const useAlert = () => useContext(AlertContext);

const makeStyles = (c: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  vignette: { position: 'absolute' },
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  box: {
    width: '100%', backgroundColor: c.surface, borderRadius: 20,
    overflow: 'hidden', borderWidth: 1, borderColor: c.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25, shadowRadius: 24, elevation: 20,
  },
  title: { fontSize: 17, fontWeight: '800', color: c.text, textAlign: 'center', paddingHorizontal: 24, paddingTop: 24, paddingBottom: 6 },
  message: { fontSize: 14, color: c.textSecondary, textAlign: 'center', paddingHorizontal: 24, paddingBottom: 20, lineHeight: 20 },
  btnRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: c.border },
  btnCol: { flexDirection: 'column' },
  btn: { flex: 1, paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  btnFull: { flex: 1 },
  btnFullCol: { flex: undefined },
  btnCancel: { backgroundColor: c.surfaceElevated },
  btnDestructive: {},
  btnBorderLeft: { borderLeftWidth: 1, borderLeftColor: c.border },
  btnBorderTop: { borderTopWidth: 1, borderTopColor: c.border },
  btnText: { fontSize: 15, fontWeight: '600', color: c.textSecondary },
  btnTextCancel: { color: c.textSecondary },
  btnTextDestructive: { color: '#ef4444' },
  btnTextPrimary: { color: c.accent, fontWeight: '800' },
});
