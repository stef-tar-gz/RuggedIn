import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator,
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
    <View style={s.container}>
      <Text style={s.logo}>RuggedIn</Text>
      <Text style={s.subtitle}>Crea il tuo account</Text>

      <TextInput style={s.input} placeholder="Nome completo" placeholderTextColor={colors.textSecondary} value={fullName} onChangeText={setFullName} />
      <TextInput style={s.input} placeholder="Email" placeholderTextColor={colors.textSecondary} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />

      <View style={s.passwordWrap}>
        <TextInput
          style={s.passwordInput}
          placeholder="Password"
          placeholderTextColor={colors.textSecondary}
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
        />
        <TouchableOpacity style={s.eyeBtn} onPress={() => setShowPassword(v => !v)}>
          <Text style={s.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
        </TouchableOpacity>
      </View>

      <Text style={s.roleLabel}>Sei un:</Text>
      <View style={s.roleRow}>
        <TouchableOpacity style={[s.roleButton, role === 'trainer' && s.roleButtonActive]} onPress={() => setRole('trainer')}>
          <Text style={[s.roleButtonText, role === 'trainer' && s.roleButtonTextActive]}>💪 Personal Trainer</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.roleButton, role === 'athlete' && s.roleButtonActive]} onPress={() => setRole('athlete')}>
          <Text style={[s.roleButtonText, role === 'athlete' && s.roleButtonTextActive]}>🏋️ Atleta</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={s.button} onPress={handleRegister} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.buttonText}>Registrati</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
        <Text style={s.link}>Hai già un account? Accedi</Text>
      </TouchableOpacity>
    </View>
  );
}

const makeStyles = (c: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center', padding: 24 },
  logo: { fontSize: 40, fontWeight: '800', color: c.accent, letterSpacing: 2, marginBottom: 8 },
  subtitle: { fontSize: 14, color: c.textSecondary, marginBottom: 32 },
  input: { width: '100%', backgroundColor: c.surface, borderRadius: 10, padding: 16, color: c.text, fontSize: 16, marginBottom: 12, borderWidth: 1, borderColor: c.border },
  passwordWrap: { width: '100%', flexDirection: 'row', alignItems: 'center', backgroundColor: c.surface, borderRadius: 10, borderWidth: 1, borderColor: c.border, marginBottom: 12 },
  passwordInput: { flex: 1, padding: 16, color: c.text, fontSize: 16 },
  eyeBtn: { paddingHorizontal: 14 },
  eyeIcon: { fontSize: 18 },
  roleLabel: { color: c.textSecondary, fontSize: 14, alignSelf: 'flex-start', marginBottom: 10, marginTop: 4 },
  roleRow: { flexDirection: 'row', gap: 12, width: '100%', marginBottom: 24 },
  roleButton: { flex: 1, backgroundColor: c.surface, borderRadius: 10, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: c.border },
  roleButtonActive: { borderColor: c.accent, backgroundColor: c.accentActiveBg },
  roleButtonText: { color: c.textSecondary, fontSize: 14, fontWeight: '600' },
  roleButtonTextActive: { color: c.accent },
  button: { width: '100%', backgroundColor: c.accent, borderRadius: 10, padding: 16, alignItems: 'center', marginBottom: 24 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  link: { color: c.accent, fontSize: 14 },
});
