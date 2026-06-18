import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../context/ThemeContext';
import { useAlert } from '../../context/AlertContext';
import { useProfile } from '../../hooks/useProfile';

export default function AdminSettings() {
  const router = useRouter();
  const { colors, isDark, toggleTheme } = useTheme();
  const { showAlert } = useAlert();
  const { profile } = useProfile();
  const s = makeStyles(colors);

  const handleLogout = () => {
    showAlert({
      title: 'Disconnetti',
      message: 'Sei sicuro di voler uscire?',
      buttons: [
        { text: 'Annulla', style: 'cancel' },
        { text: 'Disconnetti', style: 'destructive', onPress: () => supabase.auth.signOut() },
      ],
    });
  };

  const handleChangePassword = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) return;
    const { error } = await supabase.auth.resetPasswordForEmail(user.email);
    if (error) {
      showAlert({ title: 'Errore', message: error.message });
    } else {
      showAlert({ title: 'Email inviata', message: `Controlla la tua casella: ${user.email}` });
    }
  };

  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.backText}>‹ Dashboard</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }} pointerEvents="none">
          <Text style={s.title}>Impostazioni</Text>
        </View>
        <View style={{ width: 80 }} />
      </View>

      {/* Aspetto */}
      <Text style={s.groupLabel}>Aspetto</Text>
      <View style={s.group}>
        <TouchableOpacity style={s.row} onPress={toggleTheme} activeOpacity={0.7}>
          <Text style={s.rowIcon}>{isDark ? '🌙' : '☀️'}</Text>
          <View style={s.rowBody}>
            <Text style={s.rowLabel}>Tema</Text>
            <Text style={s.rowSub}>{isDark ? 'Scuro' : 'Chiaro'}</Text>
          </View>
          <View style={[s.dot, { backgroundColor: isDark ? colors.textMuted : colors.accent }]} />
        </TouchableOpacity>
      </View>

      {/* Account */}
      <Text style={s.groupLabel}>Account</Text>
      <View style={s.group}>
        <View style={s.row}>
          <Text style={s.rowIcon}>👤</Text>
          <View style={s.rowBody}>
            <Text style={s.rowLabel}>{profile?.full_name}</Text>
            <Text style={s.rowSub}>Amministratore</Text>
          </View>
        </View>
        <View style={s.separator} />
        <TouchableOpacity style={s.row} activeOpacity={0.7} onPress={handleChangePassword}>
          <Text style={s.rowIcon}>🔑</Text>
          <View style={s.rowBody}>
            <Text style={s.rowLabel}>Cambia password</Text>
            <Text style={s.rowSub}>Ricevi un link via email</Text>
          </View>
          <Text style={s.rowChevron}>›</Text>
        </TouchableOpacity>
        <View style={s.separator} />
        <TouchableOpacity style={s.row} activeOpacity={0.7} onPress={handleLogout}>
          <Text style={s.rowIcon}>🚪</Text>
          <View style={s.rowBody}>
            <Text style={[s.rowLabel, { color: '#ef4444' }]}>Logout</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Info app */}
      <Text style={s.groupLabel}>Info</Text>
      <View style={s.group}>
        <View style={s.row}>
          <Text style={s.rowIcon}>📱</Text>
          <View style={s.rowBody}>
            <Text style={s.rowLabel}>Versione app</Text>
            <Text style={s.rowSub}>{version}</Text>
          </View>
        </View>
        <View style={s.separator} />
        <View style={s.row}>
          <Text style={s.rowIcon}>🔧</Text>
          <View style={s.rowBody}>
            <Text style={s.rowLabel}>Ambiente</Text>
            <Text style={s.rowSub}>Supabase · ruggedin</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const makeStyles = (c: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  content: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 48 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 32 },
  backText: { color: c.accent, fontSize: 16, width: 80 },
  title: { flex: 1, textAlign: 'center', fontSize: 20, fontWeight: '800', color: c.text },
  groupLabel: { fontSize: 11, fontWeight: '700', color: c.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, marginLeft: 4 },
  group: { backgroundColor: c.surface, borderRadius: 14, borderWidth: 1, borderColor: c.border, marginBottom: 28, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  separator: { height: 1, backgroundColor: c.border, marginHorizontal: 16 },
  rowIcon: { fontSize: 20, width: 28, textAlign: 'center' },
  rowBody: { flex: 1 },
  rowLabel: { fontSize: 15, fontWeight: '600', color: c.text },
  rowSub: { fontSize: 12, color: c.textMuted, marginTop: 2 },
  rowChevron: { color: c.textMuted, fontSize: 20 },
  dot: { width: 12, height: 12, borderRadius: 6 },
});
