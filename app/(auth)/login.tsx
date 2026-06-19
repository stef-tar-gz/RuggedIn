import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useTheme } from '@/context/ThemeContext';
import { useAlert } from '@/context/AlertContext';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { colors } = useTheme();
  const { showAlert } = useAlert();
  const s = makeStyles(colors);

  const handleLogin = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) showAlert({ title: 'Errore', message: error.message });
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={s.hero}>
          <Text style={s.logo}>RuggedIn</Text>
          <Text style={s.subtitle}>Il tuo partner di allenamento</Text>
        </View>

        <View style={s.card}>
          <Text style={s.cardLabel}>ACCEDI AL TUO ACCOUNT</Text>

          <TextInput
            style={s.input}
            placeholder="Email"
            placeholderTextColor={colors.textMuted}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <View style={s.passwordWrap}>
            <TextInput
              style={s.passwordInput}
              placeholder="Password"
              placeholderTextColor={colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity style={s.eyeBtn} onPress={() => setShowPassword(v => !v)}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={s.button} onPress={handleLogin} disabled={loading} activeOpacity={0.85}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.buttonText}>Accedi</Text>}
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => router.push('/(auth)/register')} activeOpacity={0.7}>
          <Text style={s.link}>Non hai un account? <Text style={s.linkBold}>Registrati</Text></Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (c: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  scroll: { flexGrow: 1 },
  hero: { paddingTop: 80, paddingHorizontal: 28, paddingBottom: 40 },
  logo: { fontSize: 42, fontWeight: '900', color: c.accent, letterSpacing: 3 },
  subtitle: { fontSize: 15, color: c.textSecondary, marginTop: 6 },
  card: {
    marginHorizontal: 20, backgroundColor: c.surface, borderRadius: 24,
    borderWidth: 1, borderColor: c.border, padding: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15, shadowRadius: 20, elevation: 8,
  },
  cardLabel: { fontSize: 13, fontWeight: '800', color: c.textMuted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 16 },
  input: {
    backgroundColor: c.surfaceElevated, borderRadius: 14, height: 54,
    paddingHorizontal: 18, color: c.text, fontSize: 15,
    borderWidth: 1, borderColor: c.border, marginBottom: 12,
  },
  passwordWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: c.surfaceElevated, borderRadius: 14, height: 54,
    borderWidth: 1, borderColor: c.border, marginBottom: 12,
  },
  passwordInput: { flex: 1, paddingHorizontal: 18, color: c.text, fontSize: 15 },
  eyeBtn: { paddingHorizontal: 16 },
  button: {
    backgroundColor: c.accent, borderRadius: 14, height: 56,
    alignItems: 'center', justifyContent: 'center', marginTop: 8,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },
  link: { color: c.textSecondary, fontSize: 14, textAlign: 'center', marginTop: 24 },
  linkBold: { color: c.accent, fontWeight: '700' },
});
