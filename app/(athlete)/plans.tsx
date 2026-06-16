import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  ActivityIndicator, TouchableOpacity
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useProfile } from '../../hooks/useProfile';
import { useTheme } from '@/context/ThemeContext';

type WorkoutPlan = {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  exercise_count: number;
};

export default function PlansScreen() {
  const { profile } = useProfile();
  const { colors } = useTheme();
  const [plans, setPlans] = useState<WorkoutPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const s = makeStyles(colors);

  useEffect(() => {
    if (profile) fetchPlans();
  }, [profile]);

  const fetchPlans = async () => {
    const { data } = await supabase
      .from('workout_plans')
      .select('id, name, description, is_active, created_at, exercises(id)')
      .eq('athlete_id', profile!.id)
      .order('created_at', { ascending: false });

    setPlans((data || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      is_active: p.is_active,
      created_at: p.created_at,
      exercise_count: p.exercises?.length ?? 0,
    })));
    setLoading(false);
  };

  if (loading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>

      <View style={s.header}>
        <Text style={s.title}>RuggedIn</Text>
        <TouchableOpacity style={s.profileButton} onPress={() => router.push('/(athlete)/profile')}>
          <Text style={s.profileButtonText}>👤</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={s.menuCard} onPress={() => router.push('/(athlete)/progress')}>
        <View style={[s.menuCardIcon, { backgroundColor: '#4CAF5022' }]}>
          <Text style={s.menuCardEmoji}>📈</Text>
        </View>
        <View style={s.menuCardBody}>
          <Text style={s.menuCardTitle}>I miei progressi</Text>
          <Text style={s.menuCardSub}>Storico allenamenti e carichi</Text>
        </View>
        <Text style={s.chevron}>›</Text>
      </TouchableOpacity>

      <Text style={s.sectionTitle}>Le mie schede</Text>

      {plans.length === 0 ? (
        <View style={s.emptyCard}>
          <Text style={s.emptyText}>Nessuna scheda ancora.</Text>
          <Text style={s.emptySubtext}>Il tuo trainer la creerà presto.</Text>
        </View>
      ) : (
        plans.map((plan) => (
          <TouchableOpacity
            key={plan.id}
            style={s.planCard}
            onPress={() => router.push({ pathname: '/(athlete)/plan/[id]', params: { id: plan.id } })}
          >
            <View style={s.planTop}>
              <View style={s.planTitleRow}>
                <Text style={s.planName}>{plan.name}</Text>
                <View style={[s.statusBadge, { backgroundColor: plan.is_active ? colors.successBg : colors.surface }]}>
                  <View style={[s.statusDot, { backgroundColor: plan.is_active ? '#4CAF50' : colors.textMuted }]} />
                  <Text style={[s.statusText, { color: plan.is_active ? '#4CAF50' : colors.textMuted }]}>
                    {plan.is_active ? 'Attiva' : 'Inattiva'}
                  </Text>
                </View>
              </View>
              {plan.description && <Text style={s.planDesc}>{plan.description}</Text>}
            </View>
            <View style={s.planBottom}>
              <Text style={s.planMeta}>📅 {new Date(plan.created_at).toLocaleDateString('it-IT')}</Text>
              <Text style={s.planMeta}>💪 {plan.exercise_count} esercizi</Text>
              <Text style={s.chevron}>›</Text>
            </View>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
}

const makeStyles = (c: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  content: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 48 },
  centered: { flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 },
  title: { fontSize: 28, fontWeight: '800', color: c.accent, letterSpacing: 1 },
  profileButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: c.border },
  profileButtonText: { fontSize: 16 },
  menuCard: { backgroundColor: c.surface, borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 24, borderWidth: 1, borderColor: c.border },
  menuCardIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  menuCardEmoji: { fontSize: 20 },
  menuCardBody: { flex: 1 },
  menuCardTitle: { color: c.text, fontSize: 16, fontWeight: '700' },
  menuCardSub: { color: c.textSecondary, fontSize: 13, marginTop: 2 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: c.text, marginBottom: 16 },
  emptyCard: { backgroundColor: c.surface, borderRadius: 12, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: c.border },
  emptyText: { color: c.text, fontSize: 15, fontWeight: '600', marginBottom: 4 },
  emptySubtext: { color: c.textMuted, fontSize: 13 },
  planCard: { backgroundColor: c.surface, borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: c.border },
  planTop: { marginBottom: 12 },
  planTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  planName: { color: c.text, fontSize: 17, fontWeight: '700', flex: 1, marginRight: 8 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, gap: 5 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 12, fontWeight: '600' },
  planDesc: { color: c.textSecondary, fontSize: 13, lineHeight: 18 },
  planBottom: { flexDirection: 'row', alignItems: 'center', gap: 16, borderTopWidth: 1, borderTopColor: c.border, paddingTop: 12 },
  planMeta: { color: c.textMuted, fontSize: 13 },
  chevron: { color: c.textSecondary, fontSize: 22, marginLeft: 'auto' },
});
