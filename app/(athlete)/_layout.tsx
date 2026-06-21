import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
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

function SessionBanner() {
  const { activeSession, clearSession } = useSession();
  const { colors } = useTheme();
  const { showAlert } = useAlert();
  const router = useRouter();

  if (!activeSession) return null;

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
    <TouchableOpacity
      style={[styles.banner, { backgroundColor: colors.accent }]}
      onPress={() => router.push({
        pathname: '/(athlete)/session',
        params: { planId: activeSession.planId, dayIndex: activeSession.dayIndex ?? '' },
      })}
      activeOpacity={0.85}
    >
      <Ionicons name="flash" size={16} color="#fff" />
      <Text style={styles.bannerText} numberOfLines={1}>
        Sessione in corso · {activeSession.planName}
      </Text>
      <TouchableOpacity onPress={handleDiscard} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Ionicons name="close" size={18} color="rgba(255,255,255,0.8)" />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

export default function AthleteLayout() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1 }}>
      <SessionBanner />
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
    </View>
  );
}

const styles = StyleSheet.create({
  avatarWrap: { borderRadius: 100, borderWidth: 1.5, overflow: 'hidden' },
  avatar: {},
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  bannerText: {
    flex: 1,
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
});
