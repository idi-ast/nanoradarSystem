# Librerías del Proyecto

> **Autor:** @Camilo Lehue dev  
> **Última actualización:** Enero 2026

---

##  Importante - Reglas para el equipo de I+D

Esta carpeta contiene las **librerías core** del template-wisensor. Estas librerías están diseñadas para mantener consistencia y estandarización entre todos los proyectos.

###  Restricciones

| Regla | Descripción |
|-------|-------------|
| **No editar directamente** | Los archivos dentro de `/libs` **NO deben ser modificados** en tu proyecto local. Esto garantiza la integridad de la infraestructura compartida. |
| **Solo lectura** | Utiliza estas librerías como consumidor, importándolas según la documentación de cada una. |

###  Proceso de cambios

Si necesitas realizar modificaciones o agregar nuevas funcionalidades:

1. **Solicita recomendación** → Contacta al equipo responsable antes de proponer cambios.
2. **Realiza cambios en el repositorio oficial** → Las modificaciones solo se aceptan en el repositorio principal `template-wisensor`.
3. **Notifica al equipo** → Una vez aprobados los cambios, informa a los demás desarrolladores.
4. **Pull obligatorio** → Todos los proyectos que usan este template deben hacer `git pull` para obtener las actualizaciones.

###  Sincronización

```bash
# Desde tu proyecto, actualiza los cambios del template
git pull origin main
```

> **Nota:** Si deseas integrar una nueva librería, debe seguir el mismo formato y estructura establecida. Revisa las librerías existentes como referencia.

---

Esta carpeta contiene la documentación, configuración y ejemplos de uso de las librerías principales del proyecto.

## Contenido

| Librería | Descripción | Documentación |
|----------|-------------|---------------|
| **Zustand** | Estado global ligero | [Ver docs](./zustand/README.md) |
| **Better Auth** | Autenticación moderna | [Ver docs](./better-auth/README.md) |
| **Tanstack Query** | Gestión de datos async | [Ver docs](./tanstack-query/README.md) |
| **Tanstack Table** | Tablas con sorting, filtros y paginación | [Ver docs](./tanstack-table/README.md) |
| **Slim Select** | Select personalizable | [Ver docs](./slim-select/README.md) |
| **React Hook Form** | Formularios con validación | [Ver docs](./react-hook-form/README.md) |
| **Zod** | Validación de esquemas | [Ver docs](./zod/README.md) |
| **GSAP** | Animaciones avanzadas | [Ver docs](./gsap/README.md) |
| **Recharts** | Gráficos y visualización | [Ver docs](./recharts/README.md) |
| **Date-fns** | Utilidades de fechas | [Ver docs](./date-fns/README.md) |
| **CLSX** | Utilidades para clases CSS | [Ver docs](./clsx/README.md) |
| **Sonner** | Notificaciones toast | [Ver docs](./sonner/README.md) |

## Estructura

```
libs/
├── zustand/           # Estado global
│   ├── stores/        # Stores de Zustand
│   ├── hooks/         # Hooks personalizados
│   └── types/         # Tipos TypeScript
│
├── better-auth/       # Autenticación
│   ├── config/        # Configuración del cliente
│   ├── hooks/         # Hooks de auth
│   ├── context/       # Contexto de auth
│   ├── components/    # Componentes (ProtectedRoute)
│   └── types/         # Tipos TypeScript
│
├── tanstack-query/    # Data fetching
│   ├── config/        # QueryClient config
│   ├── hooks/         # Query hooks
│   └── types/         # Tipos TypeScript
│
├── tanstack-table/    # Tablas avanzadas
│   ├── hooks/         # Hooks de tabla
│   ├── utils/         # Utilidades
│   └── types/         # Tipos TypeScript
│
├── slim-select/       # Select component
│   ├── components/    # Componentes wrapper
│   ├── hooks/         # Hooks personalizados
│   ├── styles/        # Estilos CSS
│   └── types/         # Tipos TypeScript
│
├── react-hook-form/   # Formularios
│   ├── hooks/         # Hooks (useFormWithZod)
│   ├── utils/         # Helpers de formulario
│   └── types/         # Tipos TypeScript
│
├── zod/               # Validación de esquemas
│   ├── schemas/       # Esquemas predefinidos
│   ├── utils/         # Utilidades
│   └── types/         # Tipos TypeScript
│
├── gsap/              # Animaciones
│   ├── hooks/         # Hooks de animación
│   ├── utils/         # Presets de animación
│   └── types/         # Tipos TypeScript
│
├── recharts/          # Gráficos
│   ├── components/    # Wrappers de gráficos
│   ├── hooks/         # Hooks de datos
│   ├── utils/         # Helpers
│   └── types/         # Tipos TypeScript
│
├── date-fns/          # Utilidades de fechas
│   ├── hooks/         # Hooks de formato
│   ├── utils/         # Helpers de fecha
│   └── types/         # Tipos TypeScript
│
├── clsx/              # Clases CSS
│   └── utils/         # Helpers de clases
│
└── sonner/            # Notificaciones
    ├── components/    # Componentes toast
    ├── hooks/         # Hooks personalizados
    └── types/         # Tipos TypeScript
```

## Instalación base

```bash
bun add zustand better-auth @tanstack/react-query @tanstack/react-table slim-select react-hook-form zod gsap recharts date-fns clsx sonner
```
