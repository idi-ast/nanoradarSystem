# Template Wisensor

> **Autor:** @Camilo Lehue dev  
> **Para:** AST Technology Networks  
> **Versión:** 1.0.0  
> **Última actualización:** Enero 2026

Template oficial para proyectos de I+D Wisensor. Proporciona una arquitectura estandarizada con librerías preconfiguradas.

---

## Inicio Rápido

```bash
# Clonar el template
git clone https://github.com/idi-ast/template-wisensor.git mi-nuevo-proyecto

# Instalar dependencias
cd mi-nuevo-proyecto && bun install

# Configurar variables de entorno
cp .env.example .env

# Iniciar desarrollo
bun dev
```

---

## Estructura del Proyecto

```
template-wisensor/
│
├── Lock - libs/                 # Librerías core (NO MODIFICAR)
├── Lock - src/layouts/          # Layouts base (NO MODIFICAR)
├── Lock - src/context/          # Contextos globales (NO MODIFICAR)
├── Lock - src/apis/             # Cliente API base (NO MODIFICAR)
│
├── Configurar - src/config/           # Configuración (Solo valores)
├── Configurar - .env                  # Variables de entorno
│
├── Editable -  src/features/         # TUS features de proyecto
├── Editable -  src/components/       # TUS componentes
├── Editable -  src/assets/           # TUS assets
└── Editable -  public/               # Archivos públicos
```

>  Ver [.templatelock](.templatelock) para lista completa de archivos protegidos.

---

##  Reglas para el equipo de I+D

###  Restricciones

| Regla | Descripción |
|-------|-------------|
| **No editar `/libs`** | Las librerías core **NO deben ser modificadas** localmente |
| **No editar layouts base** | La estructura de `Template.tsx`, `header/`, `sidebar/` es inmutable |
| **No modificar configs base** | `vite.config.ts`, `tsconfig.json`, `eslint.config.js` |

### Qué SÍ puedes hacer

- Crear nuevas features en `src/features/`
- Agregar componentes en `src/components/`
- Modificar `NAVIGATION_DATA` en `ConfigServer.tsx`
- Agregar dependencias al `package.json`
- Crear tus propios hooks, utils, services

---

##  Sincronización con el Template Principal

### Configuración inicial (una sola vez)

```bash
# Agregar el template como remote
git remote add template https://github.com/idi-ast/template-wisensor.git
```

### Actualizar cuando hay cambios en el template

```bash
# Obtener cambios del template
git fetch template

# Mergear cambios (archivos protegidos se sobrescriben automáticamente)
git merge template/main --allow-unrelated-histories -X theirs

# Resolver conflictos SOLO en tus archivos editables si los hay
git add .
git commit -m "chore: sync with template v1.x.x"
```

###  Estrategia anti-conflictos

Para evitar conflictos al hacer pull:

1. **Nunca modifiques archivos en `/libs`** - Se sobrescriben automáticamente
2. **Usa `-X theirs` en merge** - Da prioridad al template en archivos protegidos
3. **Mantén tus cambios en zonas editables** - `features/`, `components/`, `assets/`

---

##  Librerías Incluidas

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

---

##  Proceso de Cambios en el Template

Si necesitas proponer cambios al template principal:

1. **Solicita recomendación** → Contacta a @Camilo Lehue antes de proponer cambios
2. **Fork + Pull Request** → Haz cambios en un fork y crea un PR al repo principal
3. **Review y merge** → Una vez aprobado, se mergea al template
4. **Notificación** → Se notifica a todos los equipos para que actualicen
5. **Sync obligatorio** → Todos los proyectos deben ejecutar el proceso de sincronización

---

##  Licencia

Uso interno - Wisensor I+D
