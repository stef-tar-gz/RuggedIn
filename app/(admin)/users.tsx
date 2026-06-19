import { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../context/ThemeContext';
import { useAlert } from '../../context/AlertContext';

type UserRow = {
  id: string;
  full_name: string;
  role: 'trainer' | 'athlete';
  avatar_url: string | null;
  created_at: string;
  is_admin: boolean;
  is_banned: boolean;
};

export default function AdminUsers() {
  const { colors } = useTheme();
  const { showAlert } = useAlert();
  const router = useRouter();
  const s = makeStyles(colors);

  const [users, setUsers] = useState<UserRow[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionUserId, setActionUserId] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, role, avatar_url, created_at, is_admin, is_banned')
      .order('created_at', { ascending: false });
    setUsers((data as UserRow[]) ?? []);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { fetchUsers(); }, [fetchUsers]));

  const filtered = users.filter(u =>
    u.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  const handleBan = (user: UserRow) => {
    if (user.is_admin) {
      showAlert({ title: 'Operazione non consentita', message: 'Non puoi bannare un account admin.' });
      return;
    }
    const banning = !user.is_banned;
    showAlert({
      title: banning ? 'Banna utente' : 'Rimuovi ban',
      message: banning
        ? `"${user.full_name}" verrà disconnesso e non potrà più accedere.`
        : `"${user.full_name}" potrà di nuovo accedere all'app.`,
      buttons: [
        { text: 'Annulla', style: 'cancel' },
        {
          text: banning ? 'Banna' : 'Rimuovi ban',
          style: banning ? 'destructive' : 'default',
          onPress: async () => {
            setActionUserId(user.id);
            await supabase.rpc('admin_set_ban', { p_profile_id: user.id, p_banned: banning });
            setActionUserId(null);
            setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_banned: banning } : u));
          },
        },
      ],
    });
  };

  const handleDelete = (user: UserRow) => {
    if (user.is_admin) {
      showAlert({ title: 'Operazione non consentita', message: 'Non puoi eliminare un account admin.' });
      return;
    }
    showAlert({
      title: 'Elimina utente',
      message: `Vuoi eliminare "${user.full_name}"? Tutti i dati verranno rimossi in modo permanente.`,
      buttons: [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Elimina', style: 'destructive', onPress: async () => {
            setActionUserId(user.id);
            await supabase.rpc('admin_delete_user', { p_profile_id: user.id });
            setActionUserId(null);
            setUsers(prev => prev.filter(u => u.id !== user.id));
          },
        },
      ],
    });
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
  };

  const renderItem = ({ item }: { item: UserRow }) => (
    <View style={[s.row, item.is_banned && s.rowBanned]}>
      {item.avatar_url ? (
        <Image source={{ uri: item.avatar_url }} style={[s.avatar, item.is_banned && s.avatarBanned]} />
      ) : (
        <View style={[s.avatar, s.avatarFallback, item.is_banned && s.avatarBanned]}>
          <Text style={s.avatarInitial}>{item.full_name?.[0]?.toUpperCase()}</Text>
        </View>
      )}
      <View style={s.rowInfo}>
        <Text style={[s.rowName, item.is_banned && s.rowNameBanned]}>{item.full_name}</Text>
        <View style={s.rowMeta}>
          <View style={[s.badge, item.role === 'trainer' ? s.badgeTrainer : s.badgeAthlete]}>
            <Text style={s.badgeText}>{item.role === 'trainer' ? 'Trainer' : 'Atleta'}</Text>
          </View>
          {item.is_admin && (
            <View style={s.badgeAdmin}>
              <Text style={s.badgeText}>Admin</Text>
            </View>
          )}
          {item.is_banned && (
            <View style={s.badgeBanned}>
              <Text style={s.badgeBannedText}>Bannato</Text>
            </View>
          )}
          <Text style={s.rowDate}>{formatDate(item.created_at)}</Text>
        </View>
      </View>
      {actionUserId === item.id ? (
        <ActivityIndicator color={colors.accent} size="small" style={{ width: 76 }} />
      ) : (
        <View style={s.actions}>
          <TouchableOpacity
            style={[s.actionBtn, item.is_banned ? s.unbanBtn : s.banBtn]}
            onPress={() => handleBan(item)}
            activeOpacity={0.7}
          >
            <Ionicons name={item.is_banned ? 'checkmark' : 'ban-outline'} size={16} color={item.is_banned ? '#4CAF50' : colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity style={s.deleteBtn} onPress={() => handleDelete(item)} activeOpacity={0.7}>
            <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.accent} />
        </TouchableOpacity>
        <Text style={s.title}>Utenti</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={s.searchWrapper}>
        <TextInput
          style={s.search}
          placeholder="Cerca per nome..."
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator color={colors.accent} /></View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={s.list}
          ListEmptyComponent={<Text style={s.empty}>Nessun utente trovato</Text>}
          ItemSeparatorComponent={() => <View style={s.separator} />}
        />
      )}
    </View>
  );
}

const makeStyles = (c: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 60, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: c.border,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 30, color: c.text, lineHeight: 34 },
  title: { fontSize: 18, fontWeight: '800', color: c.text },
  searchWrapper: { padding: 16 },
  search: {
    backgroundColor: c.surface, borderRadius: 12, borderWidth: 1, borderColor: c.border,
    paddingHorizontal: 16, paddingVertical: 12, color: c.text, fontSize: 15,
  },
  list: { paddingHorizontal: 16, paddingBottom: 40 },
  separator: { height: 1, backgroundColor: c.border },
  empty: { color: c.textSecondary, textAlign: 'center', marginTop: 40, fontSize: 15 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 12 },
  rowBanned: { opacity: 0.6 },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarBanned: { opacity: 0.5 },
  avatarFallback: { backgroundColor: c.accentBg, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { color: c.accent, fontWeight: '800', fontSize: 18 },
  rowInfo: { flex: 1, gap: 4 },
  rowName: { fontSize: 15, fontWeight: '700', color: c.text },
  rowNameBanned: { textDecorationLine: 'line-through', color: c.textMuted },
  rowMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  badgeTrainer: { backgroundColor: c.accentBg },
  badgeAthlete: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
  badgeAdmin: { backgroundColor: '#2a1a5e', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  badgeBanned: { backgroundColor: '#3a1010', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 11, fontWeight: '700', color: c.textSecondary },
  badgeBannedText: { fontSize: 11, fontWeight: '700', color: '#ef4444' },
  rowDate: { fontSize: 12, color: c.textMuted },
  actions: { flexDirection: 'row', gap: 8 },
  actionBtn: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  banBtn: { backgroundColor: '#2a2010' },
  banBtnText: { fontSize: 14 },
  unbanBtn: { backgroundColor: '#1a3a1a', borderWidth: 1, borderColor: '#22c55e44' },
  unbanBtnText: { fontSize: 14, fontWeight: '800', color: '#22c55e' },
  deleteBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#3a1515', alignItems: 'center', justifyContent: 'center' },
  deleteBtnText: { color: '#ef4444', fontSize: 14, fontWeight: '700' },
});
