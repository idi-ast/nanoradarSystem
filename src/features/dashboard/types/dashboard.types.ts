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

// Re-exports desde carpetas específicas
export type { Company, User } from '../../companies/types';
export type { UserProfile } from '../../user-profile/types';
export type { Service } from '../../services-panel/types';

