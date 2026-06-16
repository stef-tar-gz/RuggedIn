import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useTheme } from '@/context/ThemeContext';

export default function RegisterScreen() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'trainer' | 'athlete' | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { colors } = useTheme();
  const s = makeStyles(colors);

  const handleRegister = async () => {
    if (!fullName || !email || !password || !role) {
      Alert.alert('Errore', 'Compila tutti i campi e seleziona un ruolo.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, role } },
    });
    if (error) Alert.alert('Errore', error.message);
    setLoading(false);
  };

  return (
    <View style={s.container}>
      <Text style={s.logo}>RuggedIn</Text>
      <Text style={s.subtitle}>Crea il tuo account</Text>

      <TextInput style={s.input} placeholder="Nome completo" placeholderTextColor={colors.textSecondary} value={fullName} onChangeText={setFullName} />
      <TextInput style={s.input} placeholder="Email" placeholderTextColor={colors.textSecondary} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      <TextInput style={s.input} placeholder="Password" placeholderTextColor={colors.textSecondary} value={password} onChangeText={setPassword} secureTextEntry />

      <Text style={s.roleLabel}>Sei un:</Text>
      <View style={s.roleRow}>
        <TouchableOpacity
          style={[s.roleButton, role === 'trainer' && s.roleButtonActive]}
          onPress={() => setRole('trainer')}
        >
          <Text style={[s.roleButtonText, role === 'trainer' && s.roleButtonTextActive]}>
            💪 Personal Trainer
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.roleButton, role === 'athlete' && s.roleButtonActive]}
          onPress={() => setRole('athlete')}
        >
          <Text style={[s.roleButtonText, role === 'athlete' && s.roleButtonTextActive]}>
            🏋️ Atleta
          </Text>
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
