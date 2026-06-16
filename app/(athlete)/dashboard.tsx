import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator, Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useProfile } from '../../hooks/useProfile';

type Athlete = {
  id: string;
  full_name: string;
  athlete_id: string;
};

export default function TrainerDashboard() {
  const { profile, loading: profileLoading } = useProfile();
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (profile) fetchAthletes();
  }, [profile]);

  const fetchAthletes = async () => {
    const { data, error } = await supabase.rpc('get_my_athletes');
    if (error) {
      Alert.alert('Errore', error.message);
    } else {
      setAthletes(data || []);
    }
    setLoading(false);
  };

  const handleAddAthlete = async () => {
    Alert.prompt(
      'Aggiungi Atleta',
      'Inserisci l\'email dell\'atleta',
      async (email) => {
        if (!email) return;

        const { data: authData, error: authError } = await supabase
          .rpc('get_profile_by_email', { p_email: email });

        if (authError || !authData || authData.length === 0) {
          Alert.alert('Errore', 'Atleta non trovato. Verifica l\'email.');
          return;
        }

        const athlete = authData[0];

        const { error } = await supabase
          .from('trainer_athlete')
          .insert({
            trainer_id: profile!.id,
            athlete_id: athlete.id,
          });

        if (error) {
          Alert.alert('Errore', error.message);
        } else {
          Alert.alert('Successo', `${athlete.full_name} aggiunto!`);
          fetchAthletes();
        }
      },
      'plain-text'
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Sei sicuro di voler uscire?',
      [
        { text: 'Annulla', style: 'cancel' },
        { text: 'Esci', style: 'destructive', onPress: () => supabase.auth.signOut() }
      ]
    );
  };

  if (profileLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#E8533A" size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Ciao,</Text>
          <Text style={styles.name}>{profile?.full_name} 💪</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => router.push('/(trainer)/profile')}
          >
            <Text style={styles.profileButtonText}>👤</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout}>
            <Text style={styles.logout}>Esci</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>I tuoi atleti</Text>
          <TouchableOpacity style={styles.addButton} onPress={handleAddAthlete}>
            <Text style={styles.addButtonText}>+ Aggiungi</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator color="#E8533A" style={{ marginTop: 24 }} />
        ) : athletes.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Nessun atleta ancora.</Text>
            <Text style={styles.emptySubtext}>Aggiungi il tuo primo atleta!</Text>
          </View>
        ) : (
          <FlatList
            data={athletes}
            keyExtractor={(item) => item.athlete_id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.athleteCard}
                onPress={() => router.push({
                  pathname: '/(trainer)/athlete/[id]',
                  params: { id: item.athlete_id }
                })}
              >
                <View style={styles.athleteAvatar}>
                  <Text style={styles.athleteAvatarText}>
                    {item.full_name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.athleteName}>{item.full_name}</Text>
                  <Text style={styles.athleteSub}>Tocca per vedere il profilo</Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>
            )}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f', paddingTop: 60, paddingHorizontal: 24 },
  centered: { flex: 1, backgroundColor: '#0f0f0f', alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 36 },
  greeting: { fontSize: 14, color: '#888' },
  name: { fontSize: 24, fontWeight: '800', color: '#fff' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  profileButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  profileButtonText: { fontSize: 16 },
  logout: { color: '#E8533A', fontSize: 14, fontWeight: '600' },
  section: { flex: 1 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  addButton: { backgroundColor: '#E8533A', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  addButtonText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 4 },
  emptySubtext: { color: '#888', fontSize: 14 },
  athleteCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  athleteAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E8533A22',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  athleteAvatarText: { color: '#E8533A', fontSize: 18, fontWeight: '800' },
  athleteName: { color: '#fff', fontSize: 16, fontWeight: '600' },
  athleteSub: { color: '#888', fontSize: 12, marginTop: 2 },
  chevron: { color: '#888', fontSize: 24 },
});