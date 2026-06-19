import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export type Profile = {
  id: string;
  auth_user_id: string;
  full_name: string;
  role: 'trainer' | 'athlete';
  avatar_url: string | null;
  is_admin: boolean;
  is_banned: boolean;
  last_seen: string | null;
  goal: string | null;
  bio: string | null;
  notes: string | null;
  about_me: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  experience_level: string | null;
  days_per_week: number | null;
  instagram_handle: string | null;
};

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('auth_user_id', user.id)
      .single();

    setProfile(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  return { profile, loading, refetch: fetchProfile };
}