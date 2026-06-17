import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
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
    <View style={s.container}>
      <Text style={s.logo}>RuggedIn</Text>
      <Text style={s.subtitle}>Il tuo partner di allenamento</Text>

      <TextInput
        style={s.input}
        placeholder="Email"
        placeholderTextColor={colors.textSecondary}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />

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

      <TouchableOpacity style={s.button} onPress={handleLogin} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.buttonText}>Accedi</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
        <Text style={s.link}>Non hai un account? Registrati</Text>
      </TouchableOpacity>
    </View>
  );
}

const makeStyles = (c: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center', padding: 24 },
  logo: { fontSize: 40, fontWeight: '800', color: c.accent, letterSpacing: 2, marginBottom: 8 },
  subtitle: { fontSize: 14, color: c.textSecondary, marginBottom: 48 },
  input: { width: '100%', backgroundColor: c.surface, borderRadius: 10, padding: 16, color: c.text, fontSize: 16, marginBottom: 12, borderWidth: 1, borderColor: c.border },
  passwordWrap: { width: '100%', flexDirection: 'row', alignItems: 'center', backgroundColor: c.surface, borderRadius: 10, borderWidth: 1, borderColor: c.border, marginBottom: 12 },
  passwordInput: { flex: 1, padding: 16, color: c.text, fontSize: 16 },
  eyeBtn: { paddingHorizontal: 14 },
  eyeIcon: { fontSize: 18 },
  button: { width: '100%', backgroundColor: c.accent, borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 8, marginBottom: 24 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  link: { color: c.accent, fontSize: 14 },
});
