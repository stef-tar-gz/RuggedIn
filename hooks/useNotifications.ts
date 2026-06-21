import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { supabase } from '@/lib/supabase';
import { useProfile } from './useProfile';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export function useNotifications() {
  const { profile } = useProfile();
  const tokenSavedRef = useRef(false);

  useEffect(() => {
    if (!profile?.id || tokenSavedRef.current) return;

    const register = async () => {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
        });
      }

      const { status: existing } = await Notifications.getPermissionsAsync();
      let finalStatus = existing;

      if (existing !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') return;

      const tokenData = await Notifications.getExpoPushTokenAsync();
      const token = tokenData.data;

      await supabase
        .from('profiles')
        .update({ push_token: token })
        .eq('id', profile.id);

      tokenSavedRef.current = true;
    };

    register();
  }, [profile?.id]);
}
