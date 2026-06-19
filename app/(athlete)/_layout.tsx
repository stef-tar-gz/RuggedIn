import { View, StyleSheet, Image } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useProfile } from '@/hooks/useProfile';

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

export default function AthleteLayout() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

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
          tabBarIcon: ({ color, size }) => (
            <ProfileTabIcon color={color} size={size} />
          ),
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
  );
}

const styles = StyleSheet.create({
  avatarWrap: {
    borderRadius: 100,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  avatar: {},
});
