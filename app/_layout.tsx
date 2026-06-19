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
      const inAdmin   = segments[0] === '(admin)';

      if (inTrainer || inAthlete || inAdmin) return;

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role, is_admin, is_banned')
        .eq('auth_user_id', session.user.id)
        .single();

      // Se la query fallisce (es. colonna non ancora migrata) prova senza i campi opzionali
      if (error || !profile) {
        const { data: fallback } = await supabase
          .from('profiles')
          .select('role')
          .eq('auth_user_id', session.user.id)
          .single();
        if (fallback?.role === 'trainer') router.replace('/(trainer)/dashboard');
        else if (fallback?.role === 'athlete') router.replace('/(athlete)/dashboard');
        return;
      }

      if (profile?.is_banned) {
        await supabase.auth.signOut();
        return;
      }

      if (profile?.is_admin) {
        router.replace('/(admin)/dashboard');
      } else if (profile?.role === 'trainer') {
        router.replace('/(trainer)/dashboard');
      } else if (profile?.role === 'athlete') {
        router.replace('/(athlete)/dashboard');
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
