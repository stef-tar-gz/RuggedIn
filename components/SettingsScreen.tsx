import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/context/ThemeContext';
import { useAlert } from '@/context/AlertContext';

type Props = {
  backLabel: string;
  notificationSubtitle: string;
  privacyLabel: string;
  privacySubtitle: string;
  deleteMessage: string;
  profileName?: string;
  profileRole?: string;
};

export function SettingsScreen({
  backLabel,
  notificationSubtitle,
  privacyLabel,
  privacySubtitle,
  deleteMessage,
  profileName,
  profileRole,
}: Props) {
  const router = useRouter();
  const { colors, isDark, toggleTheme } = useTheme();
  const { showAlert } = useAlert();
  const s = makeStyles(colors);

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [profileVisible, setProfileVisible] = useState(true);

  const version = Constants.expoConfig?.version ?? '1.0.0';

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

  const handleDeleteAccount = () => {
    showAlert({
      title: 'Elimina account',
      message: deleteMessage,
      buttons: [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Elimina', style: 'destructive',
          onPress: () => showAlert({
            title: 'Sei sicuro?',
            message: "Conferma l'eliminazione definitiva del tuo account.",
            buttons: [
              { text: 'Annulla', style: 'cancel' },
              { text: 'Sì, elimina', style: 'destructive', onPress: () => supabase.auth.signOut() },
            ],
          }),
        },
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

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.accent} />
          <Text style={s.backText}>{backLabel}</Text>
        </TouchableOpacity>
        <View style={s.titleWrap} pointerEvents="none">
          <Text style={s.title}>Impostazioni</Text>
        </View>
      </View>

      {/* Aspetto */}
      <Text style={s.groupLabel}>Aspetto</Text>
      <View style={s.group}>
        <TouchableOpacity style={s.row} onPress={toggleTheme} activeOpacity={0.7}>
          <View style={s.rowIconWrap}>
            <Ionicons name={isDark ? 'moon-outline' : 'sunny-outline'} size={22} color={colors.textSecondary} />
          </View>
          <View style={s.rowBody}>
            <Text style={s.rowLabel}>Tema</Text>
            <Text style={s.rowSub}>{isDark ? 'Scuro' : 'Chiaro'}</Text>
          </View>
          <View style={[s.dot, { backgroundColor: isDark ? colors.textMuted : colors.accent }]} />
        </TouchableOpacity>
      </View>

      {/* Notifiche */}
      <Text style={s.groupLabel}>Notifiche</Text>
      <View style={s.group}>
        <View style={s.row}>
          <View style={s.rowIconWrap}>
            <Ionicons name="notifications-outline" size={22} color={colors.textSecondary} />
          </View>
          <View style={s.rowBody}>
            <Text style={s.rowLabel}>Notifiche push</Text>
            <Text style={s.rowSub}>{notificationSubtitle}</Text>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
            trackColor={{ false: colors.border, true: colors.accent + '66' }}
            thumbColor={notificationsEnabled ? colors.accent : colors.textMuted}
          />
        </View>
      </View>

      {/* Privacy */}
      <Text style={s.groupLabel}>Privacy</Text>
      <View style={s.group}>
        <View style={s.row}>
          <View style={s.rowIconWrap}>
            <Ionicons name="eye-outline" size={22} color={colors.textSecondary} />
          </View>
          <View style={s.rowBody}>
            <Text style={s.rowLabel}>{privacyLabel}</Text>
            <Text style={s.rowSub}>{privacySubtitle}</Text>
          </View>
          <Switch
            value={profileVisible}
            onValueChange={setProfileVisible}
            trackColor={{ false: colors.border, true: colors.accent + '66' }}
            thumbColor={profileVisible ? colors.accent : colors.textMuted}
          />
        </View>
      </View>

      {/* Account */}
      <Text style={s.groupLabel}>Account</Text>
      <View style={s.group}>
        {profileName && (
          <>
            <View style={s.row}>
              <View style={s.rowIconWrap}>
                <Ionicons name="person-outline" size={22} color={colors.textSecondary} />
              </View>
              <View style={s.rowBody}>
                <Text style={s.rowLabel}>{profileName}</Text>
                {profileRole && <Text style={s.rowSub}>{profileRole}</Text>}
              </View>
            </View>
            <View style={s.separator} />
          </>
        )}
        <TouchableOpacity style={s.row} activeOpacity={0.7} onPress={handleChangePassword}>
          <View style={s.rowIconWrap}>
            <Ionicons name="key-outline" size={22} color={colors.textSecondary} />
          </View>
          <View style={s.rowBody}>
            <Text style={s.rowLabel}>Cambia password</Text>
            <Text style={s.rowSub}>Ricevi un link via email</Text>
          </View>
          <Text style={s.rowChevron}>›</Text>
        </TouchableOpacity>
        <View style={s.separator} />
        <TouchableOpacity style={s.row} activeOpacity={0.7} onPress={handleLogout}>
          <View style={s.rowIconWrap}>
            <Ionicons name="log-out-outline" size={22} color={colors.textSecondary} />
          </View>
          <View style={s.rowBody}>
            <Text style={s.rowLabel}>Disconnetti</Text>
          </View>
        </TouchableOpacity>
        <View style={s.separator} />
        <TouchableOpacity style={s.row} activeOpacity={0.7} onPress={handleDeleteAccount}>
          <View style={s.rowIconWrap}>
            <Ionicons name="trash-outline" size={20} color="#ef4444" />
          </View>
          <View style={s.rowBody}>
            <Text style={[s.rowLabel, { color: '#ef4444' }]}>Elimina account</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Info */}
      <Text style={s.groupLabel}>Info</Text>
      <View style={s.group}>
        <View style={s.row}>
          <View style={s.rowIconWrap}>
            <Ionicons name="phone-portrait-outline" size={22} color={colors.textSecondary} />
          </View>
          <View style={s.rowBody}>
            <Text style={s.rowLabel}>Versione app</Text>
            <Text style={s.rowSub}>{version}</Text>
          </View>
        </View>
        <View style={s.separator} />
        <TouchableOpacity style={s.row} activeOpacity={0.7} onPress={() => showAlert({ title: 'Contatti', message: 'Per supporto scrivi a support@ruggedin.app' })}>
          <View style={s.rowIconWrap}>
            <Ionicons name="mail-outline" size={22} color={colors.textSecondary} />
          </View>
          <View style={s.rowBody}>
            <Text style={s.rowLabel}>Contatta il supporto</Text>
          </View>
          <Text style={s.rowChevron}>›</Text>
        </TouchableOpacity>
        <View style={s.separator} />
        <TouchableOpacity style={s.row} activeOpacity={0.7} onPress={() => showAlert({ title: 'Privacy Policy', message: 'Consulta la nostra privacy policy su ruggedin.app/privacy' })}>
          <View style={s.rowIconWrap}>
            <Ionicons name="lock-closed-outline" size={22} color={colors.textSecondary} />
          </View>
          <View style={s.rowBody}>
            <Text style={s.rowLabel}>Privacy Policy</Text>
          </View>
          <Text style={s.rowChevron}>›</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const makeStyles = (c: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  content: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 48 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 32 },
  backBtn: { flexDirection: 'row', alignItems: 'center', width: 80 },
  backText: { color: c.accent, fontSize: 16 },
  titleWrap: { position: 'absolute', left: 0, right: 0 },
  title: { textAlign: 'center', fontSize: 20, fontWeight: '900', color: c.text, letterSpacing: -0.3 },
  groupLabel: { fontSize: 11, fontWeight: '800', color: c.textMuted, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 10, marginLeft: 4 },
  group: { backgroundColor: c.surface, borderRadius: 20, borderWidth: 1, borderColor: c.border, marginBottom: 28, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', padding: 18, gap: 14 },
  separator: { height: 1, backgroundColor: c.border, marginHorizontal: 18 },
  rowIconWrap: { width: 32, alignItems: 'center', justifyContent: 'center' },
  rowBody: { flex: 1 },
  rowLabel: { fontSize: 15, fontWeight: '600', color: c.text },
  rowSub: { fontSize: 12, color: c.textMuted, marginTop: 2 },
  rowChevron: { color: c.textMuted, fontSize: 24 },
  dot: { width: 12, height: 12, borderRadius: 6 },
});
