import { View, Text, StyleSheet, Image, TouchableOpacity, Animated } from 'react-native';
import { useRef, useEffect } from 'react';
import { Tabs, useRouter, useSegments } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useProfile } from '@/hooks/useProfile';
import { useSession } from '@/context/SessionContext';
import { useAlert } from '@/context/AlertContext';

function ProfileTabIcon({ color, size }: { color: string; size: number }) {
  const { profile } = useProfile();
  const { colors } = useTheme();

  if (profile?.avatar_url) {
    return (
      <View style={[styles.avatarWrap, { borderColor: colors.accent }]}>
        <Image
          source={{ uri: profile.avatar_url }}
          style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}
          resizeMode="cover"
        />
      </View>
    );
  }

  return <Ionicons name="person-outline" size={size} color={color} />;
}

function SessionPill() {
  const { activeSession, clearSession } = useSession();
  const { colors } = useTheme();
  const { showAlert } = useAlert();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const segments = useSegments();
  const isOnSession = segments.includes('session' as never);
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    if (activeSession && !isOnSession) {
      scaleAnim.setValue(0.6);
      translateY.setValue(16);
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, damping: 14, stiffness: 200 }),
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, damping: 14, stiffness: 200 }),
      ]).start();
    }
  }, [activeSession, isOnSession]);

  if (!activeSession || isOnSession) return null;

  const TAB_BAR_HEIGHT = 60 + insets.bottom;

  const handleDiscard = () => {
    showAlert({
      title: 'Abbandona sessione',
      message: 'Sei sicuro? Tutti i dati della sessione in corso andranno persi.',
      buttons: [
        { text: 'Continua', style: 'cancel' },
        { text: 'Abbandona', style: 'destructive', onPress: clearSession },
      ],
    });
  };

  return (
    <Animated.View style={[styles.pillWrap, { bottom: TAB_BAR_HEIGHT + 10, transform: [{ scale: scaleAnim }, { translateY }] }]}>
    <TouchableOpacity
      style={[styles.pill, { backgroundColor: colors.accent }]}
      onPress={() => router.push({
        pathname: '/(athlete)/session',
        params: { planId: activeSession.planId, dayIndex: activeSession.dayIndex ?? '' },
      })}
      activeOpacity={0.9}
    >
      <Ionicons name="flash" size={14} color="#fff" />
      <Text style={styles.pillText} numberOfLines={1}>
        {activeSession.planName}{activeSession.dayIndex ? ` · Giorno ${Number(activeSession.dayIndex) + 1}` : ''}
      </Text>
      <TouchableOpacity onPress={handleDiscard} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
        <Ionicons name="close" size={16} color="rgba(255,255,255,0.75)" />
      </TouchableOpacity>
    </TouchableOpacity>
    </Animated.View>
  );
}

export default function AthleteLayout() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1 }}>
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
          name="plans"
          options={{
            title: 'Schede',
            tabBarIcon: ({ color, size }) => <Ionicons name="barbell-outline" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="progress"
          options={{
            title: 'Progressi',
            tabBarIcon: ({ color, size }) => <Ionicons name="stats-chart-outline" size={size} color={color} />,
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
        <Tabs.Screen name="session" options={{ href: null, tabBarStyle: { display: 'none' } }} />
        <Tabs.Screen name="find-trainer" options={{ href: null }} />
        <Tabs.Screen name="settings" options={{ href: null }} />
        <Tabs.Screen name="plan/[id]" options={{ href: null }} />
        <Tabs.Screen name="trainer/[id]" options={{ href: null }} />
        <Tabs.Screen name="chat/[id]" options={{ href: null }} />
      </Tabs>
      <SessionPill />
    </View>
  );
}

const styles = StyleSheet.create({
  avatarWrap: { borderRadius: 100, borderWidth: 1.5, overflow: 'hidden' },
  avatar: {},
  pillWrap: {
    position: 'absolute',
    alignSelf: 'center',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    maxWidth: '80%',
  },
  pillText: {
    flex: 1,
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
});
