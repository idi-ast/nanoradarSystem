// ============================================
// Tipos para User Store
// ============================================

export interface User {
  id: number;
  email: string;
  nombre: string;
  apellido: string;
  avatar?: string;
  rol: "admin" | "usuario" | "viewer";
  created_at: string;
}

export interface UserState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface UserActions {
  setUser: (user: User) => void;
  updateUser: (data: Partial<User>) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
}

export type UserStore = UserState & UserActions;

// ============================================
// Tipos para UI Store
// ============================================

export interface UIState {
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  theme: "light" | "dark" | "system";
  modalOpen: string | null;
}

export interface UIActions {
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setTheme: (theme: UIState["theme"]) => void;
  openModal: (modalId: string) => void;
  closeModal: () => void;
}

export type UIStore = UIState & UIActions;

// ============================================
// Tipos para Notification Store
// ============================================

export type NotificationType = "success" | "error" | "warning" | "info";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number;
}

export interface NotificationState {
  notifications: Notification[];
}

export interface NotificationActions {
  addNotification: (notification: Omit<Notification, "id">) => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

export type NotificationStore = NotificationState & NotificationActions;
