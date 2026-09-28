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
// (vive bajo src/template/, no bajo src/features/)
export type { Empresa } from '../../../template/companies/types';
export type { User, UserProfile } from '../../../template/user-profile/types';
export type { Service } from '../../../template/services-panel/types';

