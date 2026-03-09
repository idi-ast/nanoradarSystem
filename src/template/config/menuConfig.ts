
import { 
  IconUser, 
  IconBuilding, 
  IconApps,
  IconChartBar,
  IconSettings,
  IconLogout
} from "@tabler/icons-react";
import type { ComponentType } from "react";

export interface TemplateMenuItem {
  id: string;
  name: string;
  link: string;
  icon: ComponentType<{ size?: number; stroke?: number }>;
  description?: string;
  divider?: boolean;
}

// Menú del usuario (dropdown en header)
export const USER_MENU_ITEMS: TemplateMenuItem[] = [
  {
    id: 'profile',
    name: 'Mi Perfil',
    link: '/template/perfil',
    icon: IconUser,
    description: 'Ver y editar tu perfil',
  },
  {
    id: 'companies',
    name: 'Mis Compañías',
    link: '/template/companias',
    icon: IconBuilding,
    description: 'Compañías asociadas',
  },
  {
    id: 'services',
    name: 'Mis Servicios',
    link: '/template/servicios',
    icon: IconApps,
    description: 'Servicios disponibles',
  },
];

// Menú de administración (solo para superusuarios)
export const ADMIN_MENU_ITEMS: TemplateMenuItem[] = [
  {
    id: 'admin-dashboard',
    name: 'Panel Admin',
    link: '/template/admin',
    icon: IconChartBar,
    description: 'Estadísticas del sistema',
  },
  {
    id: 'settings',
    name: 'Configuración',
    link: '/template/configuracion',
    icon: IconSettings,
    description: 'Ajustes del sistema',
  },
];

// Acción de cerrar sesión
export const LOGOUT_ITEM: TemplateMenuItem = {
  id: 'logout',
  name: 'Cerrar Sesión',
  link: '#logout',
  icon: IconLogout,
  divider: true,
};
