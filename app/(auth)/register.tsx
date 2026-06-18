import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useTheme } from '@/context/ThemeContext';
import { useAlert } from '@/context/AlertContext';

export default function RegisterScreen() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<'trainer' | 'athlete' | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { colors } = useTheme();
  const { showAlert } = useAlert();
  const s = makeStyles(colors);

  const handleRegister = async () => {
    if (!fullName || !email || !password || !role) {
      showAlert({ title: 'Errore', message: 'Compila tutti i campi e seleziona un ruolo.' });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, role } },
    });
    if (error) showAlert({ title: 'Errore', message: error.message });
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={s.hero}>
          <Text style={s.logo}>RuggedIn</Text>
          <Text style={s.subtitle}>Crea il tuo account</Text>
        </View>

        <View style={s.card}>
          <Text style={s.cardLabel}>NUOVO ACCOUNT</Text>

          <TextInput
            style={s.input}
            placeholder="Nome completo"
            placeholderTextColor={colors.textMuted}
            value={fullName}
            onChangeText={setFullName}
          />
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
              <Text style={s.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
            </TouchableOpacity>
          </View>

          <Text style={s.roleLabel}>SEI UN</Text>
          <View style={s.roleRow}>
            <TouchableOpacity
              style={[s.roleButton, role === 'trainer' && s.roleButtonActive]}
              onPress={() => setRole('trainer')}
              activeOpacity={0.8}
            >
              <Text style={s.roleIcon}>💪</Text>
              <Text style={[s.roleButtonText, role === 'trainer' && s.roleButtonTextActive]}>Personal Trainer</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.roleButton, role === 'athlete' && s.roleButtonActive]}
              onPress={() => setRole('athlete')}
              activeOpacity={0.8}
            >
              <Text style={s.roleIcon}>🏋️</Text>
              <Text style={[s.roleButtonText, role === 'athlete' && s.roleButtonTextActive]}>Atleta</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={s.button} onPress={handleRegister} disabled={loading} activeOpacity={0.85}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.buttonText}>Registrati</Text>}
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => router.push('/(auth)/login')} activeOpacity={0.7}>
          <Text style={s.link}>Hai già un account? <Text style={s.linkBold}>Accedi</Text></Text>
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
  eyeIcon: { fontSize: 18 },
  roleLabel: { fontSize: 13, fontWeight: '800', color: c.textMuted, letterSpacing: 1, textTransform: 'uppercase', marginTop: 4, marginBottom: 12 },
  roleRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  roleButton: {
    flex: 1, backgroundColor: c.surfaceElevated, borderRadius: 14, paddingVertical: 14,
    alignItems: 'center', borderWidth: 1, borderColor: c.border, gap: 6,
  },
  roleButtonActive: { borderColor: c.accent, backgroundColor: c.accentActiveBg },
  roleIcon: { fontSize: 22 },
  roleButtonText: { color: c.textSecondary, fontSize: 13, fontWeight: '600' },
  roleButtonTextActive: { color: c.accent, fontWeight: '700' },
  button: {
    backgroundColor: c.accent, borderRadius: 14, height: 56,
    alignItems: 'center', justifyContent: 'center', marginTop: 8,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },
  link: { color: c.textSecondary, fontSize: 14, textAlign: 'center', marginTop: 24, marginBottom: 40 },
  linkBold: { color: c.accent, fontWeight: '700' },
});
