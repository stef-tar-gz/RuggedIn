import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { supabase } from '../lib/supabase';

const PRESENCE_CHANNEL = 'app_presence';

export function usePresence(myId: string | undefined) {
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!myId) return;

    const channel = supabase.channel(PRESENCE_CHANNEL);
    channelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<{ user_id: string }>();
        const ids = new Set(
          Object.values(state)
            .flat()
            .map((p) => p.user_id)
        );
        setOnlineIds(ids);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ user_id: myId });
        }
      });

    // Quando l'app va in background aggiorna last_seen e smette di tracciare
    const sub = AppState.addEventListener('change', async (state) => {
      if (state === 'background' || state === 'inactive') {
        await supabase
          .from('profiles')
          .update({ last_seen: new Date().toISOString() })
          .eq('id', myId);
        await channel.untrack();
      } else if (state === 'active') {
        await channel.track({ user_id: myId });
      }
    });

    return () => {
      supabase
        .from('profiles')
        .update({ last_seen: new Date().toISOString() })
        .eq('id', myId)
        .then(() => supabase.removeChannel(channel));
      sub.remove();
    };
  }, [myId]);

  const isOnline = (userId: string) => onlineIds.has(userId);

  return { isOnline };
}
