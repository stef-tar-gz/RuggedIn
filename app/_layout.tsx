import { useEffect } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { supabase } from '../lib/supabase';
import { ThemeProvider } from '../context/ThemeContext';
import { AlertProvider } from '../context/AlertContext';

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    const redirectByRole = async (session: any) => {
      if (!session) {
        if (segments[0] === '(auth)') return;
        router.replace('/(auth)/login');
        return;
      }

      const inTrainer = segments[0] === '(trainer)';
      const inAthlete = segments[0] === '(athlete)';

      if (inTrainer || inAthlete) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('auth_user_id', session.user.id)
        .single();

      if (profile?.role === 'trainer') {
        router.replace('/(trainer)/dashboard');
      } else if (profile?.role === 'athlete') {
        router.replace('/(athlete)/plans');
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      redirectByRole(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      redirectByRole(session);
    });

    return () => subscription.unsubscribe();
  }, [segments]);

  return (
    <ThemeProvider>
      <AlertProvider>
        <Slot />
      </AlertProvider>
    </ThemeProvider>
  );
}
