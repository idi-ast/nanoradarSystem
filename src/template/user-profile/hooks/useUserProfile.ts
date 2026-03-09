import { useEffect, useState, useCallback } from 'react';
import { userProfileService } from '../services';
import type { UserProfile } from '../types';

interface UseUserProfileReturn {
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  loadProfile: () => Promise<void>;
}

export function useUserProfile(): UseUserProfileReturn {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      const data = await userProfileService.getUserProfile();
      setProfile(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Error al cargar perfil');
      console.error('Error loading profile:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  return {
    profile,
    loading,
    error,
    loadProfile,
  };
}
