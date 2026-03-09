// ============================================
// Tipos de Opciones
// ============================================

export interface SelectOption {
  value: string;
  text: string;
  disabled?: boolean;
  selected?: boolean;
  data?: Record<string, unknown>;
}

export interface SelectOptionGroup {
  label: string;
  options: SelectOption[];
}

export type SelectData = SelectOption | SelectOptionGroup;

// ============================================
// Tipos de Configuración
// ============================================

export interface SelectConfig {
  placeholder?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  allowCreate?: boolean;
  closeOnSelect?: boolean;
  disabled?: boolean;
  maxSelected?: number;
  minSelected?: number;
}

// ============================================
// Tipos de Props para Componentes
// ============================================

export interface SelectProps extends SelectConfig {
  value?: string;
  onChange?: (value: string) => void;
  options: SelectOption[];
  className?: string;
  id?: string;
  name?: string;
}

export interface MultiSelectProps extends SelectConfig {
  values?: string[];
  onChange?: (values: string[]) => void;
  options: SelectOption[];
  className?: string;
  id?: string;
  name?: string;
}

// ============================================
// Tipos para Hook
// ============================================

export interface UseSelectOptions extends SelectConfig {
  options?: SelectOption[];
  defaultValue?: string;
  defaultValues?: string[];
}

export interface UseSelectReturn {
  ref: React.RefObject<HTMLDivElement>;
  value: string;
  values: string[];
  setValue: (value: string) => void;
  setValues: (values: string[]) => void;
  options: SelectOption[];
  setOptions: (options: SelectOption[]) => void;
  open: () => void;
  close: () => void;
  destroy: () => void;
}
