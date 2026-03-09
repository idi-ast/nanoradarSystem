export interface Service {
  id: number;
  name: string;
  db_name?: string;
  description?: string;
  website?: string;
  code?: string;
  status: boolean;
  company_id?: number;
  company_name?: string;
  color_theme?: string;
  url_image?: string;
  assigned_at?: string;
}
