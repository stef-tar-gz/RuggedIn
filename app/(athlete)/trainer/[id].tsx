import { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { PhotoModal } from '@/components/PhotoModal';
import { InstagramButton } from '@/components/InstagramButton';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { useProfile } from '../../../hooks/useProfile';
import { useTheme } from '@/context/ThemeContext';
import { useAlert } from '@/context/AlertContext';

type TrainerProfile = {
  id: string;
  full_name: string;
  bio: string | null;
  avatar_url: string | null;
  instagram_handle: string | null;
};

type Status = 'loading' | 'linked' | 'pending' | 'none';

export default function TrainerPublicProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const { profile } = useProfile();
  const { showAlert } = useAlert();
  const s = makeStyles(colors);

  const [trainer, setTrainer] = useState<TrainerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<Status>('loading');
  const [sending, setSending] = useState(false);
  const [viewingPhoto, setViewingPhoto] = useState(false);

  const headerAnim = useRef(new Animated.Value(0)).current;
  const infoAnim = useRef(new Animated.Value(0)).current;
  const statusAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!loading) {
      Animated.stagger(120, [
        Animated.timing(headerAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(infoAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(statusAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    }
  }, [loading]);

  useEffect(() => {
    const fetchAll = async () => {
      const [trainerRes, linkedRes, pendingRes] = await Promise.all([
        supabase.from('profiles').select('id, full_name, bio, avatar_url, instagram_handle').eq('id', id).single(),
        supabase.from('trainer_athlete').select('trainer_id').eq('athlete_id', profile!.id).maybeSingle(),
        supabase.from('trainer_athlete_requests').select('id').eq('athlete_id', profile!.id).eq('trainer_id', id).eq('status', 'pending').maybeSingle(),
      ]);

      setTrainer(trainerRes.data);

      if (linkedRes.data?.trainer_id === id) setStatus('linked');
      else if (pendingRes.data) setStatus('pending');
      else setStatus('none');

      setLoading(false);
    };
    if (profile) fetchAll();
  }, [id, profile]);

  const handleRequest = () => {
    showAlert({
      title: 'Invia richiesta',
      message: `Vuoi inviare una richiesta a ${trainer?.full_name}?`,
      buttons: [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Invia',
          onPress: async () => {
            setSending(true);
            const { error } = await supabase.from('trainer_athlete_requests').insert({
              athlete_id: profile!.id,
              trainer_id: id,
            });
            setSending(false);
            if (error && error.code !== '23505') {
              showAlert({ title: 'Errore', message: error.message });
            } else {
              setStatus('pending');
            }
          },
        },
      ],
    });
  };

  if (loading) {
    return <View style={s.centered}><ActivityIndicator color={colors.accent} size="large" /></View>;
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>

      <Animated.View style={{ opacity: headerAnim, transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }] }}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="chevron-back" size={22} color={colors.accent} />
              <Text style={s.backText}>Indietro</Text>
            </View>
          </TouchableOpacity>
          <View style={s.titleWrap} pointerEvents="none">
            <Text style={s.title}>Profilo Trainer</Text>
          </View>
        </View>

        {trainer?.avatar_url && (
          <PhotoModal
            visible={viewingPhoto}
            uri={trainer.avatar_url}
            accentColor={colors.accent}
            onClose={() => setViewingPhoto(false)}
            readOnly
          />
        )}

        <View style={s.profileSection}>
          <TouchableOpacity onPress={() => trainer?.avatar_url && setViewingPhoto(true)} activeOpacity={trainer?.avatar_url ? 0.8 : 1}>
            {trainer?.avatar_url ? (
              <Image source={{ uri: trainer.avatar_url }} style={s.avatar} contentFit="cover" transition={200} />
            ) : (
              <View style={s.avatarPlaceholder}>
                <Text style={s.avatarInitial}>{trainer?.full_name.charAt(0).toUpperCase()}</Text>
              </View>
            )}
          </TouchableOpacity>
          <Text style={s.name}>{trainer?.full_name}</Text>
          <View style={s.roleRow}>
            <Text style={s.role}>Personal Trainer</Text>
            {trainer?.instagram_handle && (
              <InstagramButton handle={trainer.instagram_handle} size={28} showHandle />
            )}
          </View>
        </View>
      </Animated.View>

      <Animated.View style={{ opacity: infoAnim, transform: [{ translateY: infoAnim.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }] }}>
        {trainer?.bio && (
          <View style={s.card}>
            <Text style={s.cardLabel}>Bio</Text>
            <Text style={s.cardText}>{trainer.bio}</Text>
          </View>
        )}
      </Animated.View>

      <Animated.View style={{ opacity: statusAnim, transform: [{ translateY: statusAnim.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }] }}>
        {status === 'linked' && (
          <>
            <View style={s.statusBtn}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="checkmark" size={16} color={colors.accent} />
                <Text style={s.statusBtnText}>Già associato</Text>
              </View>
            </View>
            <TouchableOpacity
              style={s.chatBtn}
              onPress={() => router.push({ pathname: '/(athlete)/chat/[id]', params: { id: id as string, name: trainer?.full_name ?? '' } })}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="chatbubble-outline" size={18} color="#fff" />
                <Text style={s.chatBtnText}>Messaggia</Text>
              </View>
            </TouchableOpacity>
          </>
        )}

        {status === 'pending' && (
          <View style={[s.statusBtn, s.statusBtnPending]}>
            <Text style={[s.statusBtnText, s.statusBtnTextPending]}>Richiesta inviata</Text>
          </View>
        )}

        {status === 'none' && (
          <TouchableOpacity style={s.requestBtn} onPress={handleRequest} disabled={sending}>
            {sending
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.requestBtnText}>Invia richiesta</Text>
            }
          </TouchableOpacity>
        )}
      </Animated.View>

    </ScrollView>
  );
}

const makeStyles = (c: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  content: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 48 },
  centered: { flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 36 },
  backText: { color: c.accent, fontSize: 16 },
  titleWrap: { position: 'absolute', left: 0, right: 0 },
  title: { textAlign: 'center', fontSize: 20, fontWeight: '800', color: c.text },
  profileSection: { alignItems: 'center', marginBottom: 32 },
  avatar: { width: 110, height: 110, borderRadius: 55, borderWidth: 3, borderColor: c.accent, marginBottom: 16 },
  avatarPlaceholder: { width: 110, height: 110, borderRadius: 55, backgroundColor: c.accentBg, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: c.accentBorder, marginBottom: 16 },
  avatarInitial: { color: c.accent, fontSize: 44, fontWeight: '800' },
  name: { fontSize: 24, fontWeight: '800', color: c.text, marginBottom: 4 },
  role: { fontSize: 14, color: c.textSecondary, marginBottom: 0 },
  card: { backgroundColor: c.surface, borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: c.border },
  cardLabel: { color: c.accent, fontSize: 13, fontWeight: '700', marginBottom: 8 },
  cardText: { color: c.techniqueText, fontSize: 15, lineHeight: 22 },
  roleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  chatBtn: { marginTop: 10, backgroundColor: c.surface, borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: c.accent },
  chatBtnText: { color: c.accent, fontSize: 16, fontWeight: '700' },
  requestBtn: { marginTop: 12, backgroundColor: c.accent, borderRadius: 14, padding: 18, alignItems: 'center' },
  requestBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  statusBtn: { marginTop: 12, backgroundColor: c.surface, borderRadius: 14, padding: 18, alignItems: 'center', borderWidth: 1, borderColor: '#4CAF50' },
  statusBtnText: { color: '#4CAF50', fontSize: 16, fontWeight: '700' },
  statusBtnPending: { borderColor: c.border },
  statusBtnTextPending: { color: c.textMuted },
});
