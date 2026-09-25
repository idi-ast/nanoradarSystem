import { useEffect, useState, useCallback } from 'react';
import { apiSystem } from '@/apis/apiSystem';

export interface DashboardStats {
  total_users: number;
  total_companies: number;
  total_services: number;
  total_assignments: number;
  recent_users: number;
  users_by_company: {
    company_name: string;
    user_count: number;
  }[];
}

interface UseAdminDashboardReturn {
  stats: DashboardStats | null;
  loading: boolean;
  error: string | null;
  loadStats: () => Promise<void>;
}

export function useAdminDashboard(): UseAdminDashboardReturn {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiSystem.get<DashboardStats>('/companies/admin/dashboard-stats');
      setStats(response.data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Error al cargar estadísticas');
      console.error('Error loading stats:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return {
    stats,
    loading,
    error,
    loadStats,
  };
}