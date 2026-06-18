import { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
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
};

export default function AdminUsers() {
  const { colors } = useTheme();
  const { showAlert } = useAlert();
  const router = useRouter();
  const s = makeStyles(colors);

  const [users, setUsers] = useState<UserRow[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const query = supabase
      .from('profiles')
      .select('id, full_name, role, avatar_url, created_at, is_admin')
      .order('created_at', { ascending: false });

    const { data } = await query;
    setUsers((data as UserRow[]) ?? []);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { fetchUsers(); }, [fetchUsers]));

  const filtered = users.filter(u =>
    u.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = (user: UserRow) => {
    if (user.is_admin) {
      showAlert({ title: 'Operazione non consentita', message: 'Non puoi eliminare un account admin.' });
      return;
    }
    showAlert({
      title: 'Elimina utente',
      message: `Vuoi eliminare "${user.full_name}"? Questa azione è irreversibile.`,
      buttons: [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Elimina', style: 'destructive', onPress: async () => {
            setDeleting(user.id);
            await supabase.rpc('admin_delete_user', { p_profile_id: user.id });
            setDeleting(null);
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
    <View style={s.row}>
      {item.avatar_url ? (
        <Image source={{ uri: item.avatar_url }} style={s.avatar} />
      ) : (
        <View style={[s.avatar, s.avatarFallback]}>
          <Text style={s.avatarInitial}>{item.full_name?.[0]?.toUpperCase()}</Text>
        </View>
      )}
      <View style={s.rowInfo}>
        <Text style={s.rowName}>{item.full_name}</Text>
        <View style={s.rowMeta}>
          <View style={[s.badge, item.role === 'trainer' ? s.badgeTrainer : s.badgeAthlete]}>
            <Text style={s.badgeText}>{item.role === 'trainer' ? 'Trainer' : 'Atleta'}</Text>
          </View>
          {item.is_admin && (
            <View style={s.badgeAdmin}>
              <Text style={s.badgeText}>Admin</Text>
            </View>
          )}
          <Text style={s.rowDate}>{formatDate(item.created_at)}</Text>
        </View>
      </View>
      {deleting === item.id ? (
        <ActivityIndicator color={colors.accent} size="small" />
      ) : (
        <TouchableOpacity style={s.deleteBtn} onPress={() => handleDelete(item)} activeOpacity={0.7}>
          <Text style={s.deleteBtnText}>✕</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backText}>‹</Text>
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
  row: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 12,
  },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarFallback: { backgroundColor: c.accentBg, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { color: c.accent, fontWeight: '800', fontSize: 18 },
  rowInfo: { flex: 1, gap: 4 },
  rowName: { fontSize: 15, fontWeight: '700', color: c.text },
  rowMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  badgeTrainer: { backgroundColor: c.accentBg },
  badgeAthlete: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
  badgeAdmin: { backgroundColor: '#2a1a5e', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 11, fontWeight: '700', color: c.textSecondary },
  rowDate: { fontSize: 12, color: c.textMuted },
  deleteBtn: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: '#3a1515', alignItems: 'center', justifyContent: 'center',
  },
  deleteBtnText: { color: '#ef4444', fontSize: 14, fontWeight: '700' },
});
