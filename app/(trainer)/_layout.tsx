import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Image, Animated } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/lib/supabase';

function RequestsTabIcon({ color, size, count }: { color: string; size: number; count: number }) {
  const { colors } = useTheme();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (count > 0) {
      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.4, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      );
      anim.start();
      return () => anim.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [count]);

  return (
    <View style={{ width: size + 8, height: size + 8, alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name="people-outline" size={size} color={color} />
      {count > 0 && (
        <Animated.View style={[styles.badge, { transform: [{ scale: pulseAnim }] }]}>
          <Text style={styles.badgeText}>{count > 99 ? '99+' : count}</Text>
        </Animated.View>
      )}
    </View>
  );
}

function ProfileTabIcon({ color, size }: { color: string; size: number }) {
  const { profile } = useProfile();
  const { colors } = useTheme();

  if (profile?.avatar_url) {
    return (
      <View style={[styles.avatarWrap, { borderColor: colors.accent }]}>
        <Image
          source={{ uri: profile.avatar_url }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
          resizeMode="cover"
        />
      </View>
    );
  }

  return <Ionicons name="person-outline" size={size} color={color} />;
}

export default function TrainerLayout() {
  const { colors } = useTheme();
  const { profile } = useProfile();
  const insets = useSafeAreaInsets();
  const [requestCount, setRequestCount] = useState(0);

  useEffect(() => {
    if (!profile?.id) return;

    const fetchCount = () =>
      supabase
        .from('trainer_athlete_requests')
        .select('id', { count: 'exact', head: true })
        .eq('trainer_id', profile.id)
        .eq('status', 'pending')
        .then(({ count: c }) => setRequestCount(c ?? 0));

    fetchCount();
    const interval = setInterval(fetchCount, 5000);

    const channel = supabase
      .channel(`trainer_requests_${profile.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'trainer_athlete_requests',
        filter: `trainer_id=eq.${profile.id}`,
      }, fetchCount)
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [profile?.id]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 60 + insets.bottom,
          paddingBottom: 8 + insets.bottom,
          paddingTop: 6,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
        tabBarIconStyle: { marginBottom: 2 },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="requests"
        options={{
          title: 'Richieste',
          tabBarIcon: ({ color, size }) => <RequestsTabIcon color={color} size={size} count={requestCount} />,
        }}
      />
      <Tabs.Screen
        name="exercises"
        options={{
          title: 'Esercizi',
          tabBarIcon: ({ color, size }) => <Ionicons name="barbell-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profilo',
          tabBarIcon: ({ color, size }) => <ProfileTabIcon color={color} size={size} />,
        }}
      />
      {/* Schermate accessibili ma senza tab */}
      <Tabs.Screen name="settings" options={{ href: null }} />
      <Tabs.Screen name="athlete/[id]" options={{ href: null }} />
      <Tabs.Screen name="athlete/progress/[id]" options={{ href: null }} />
      <Tabs.Screen name="workout/create" options={{ href: null }} />
      <Tabs.Screen name="workout/[id]" options={{ href: null }} />
      <Tabs.Screen name="workout/edit/[id]" options={{ href: null }} />
      <Tabs.Screen name="chat/[id]" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  avatarWrap: {
    borderRadius: 100,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    lineHeight: 12,
  },
});
