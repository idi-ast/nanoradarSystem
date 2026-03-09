# Slim Select

Select/Dropdown personalizable y ligero.

## Características

-  Búsqueda integrada
-  Multi-select
-  Creación de opciones
-  Grupos de opciones
-  Customizable con CSS

## Uso Básico

```tsx
import { Select, MultiSelect } from "@/libs/slim-select";

function Form() {
  const [value, setValue] = useState("");

  return (
    <Select
      value={value}
      onChange={setValue}
      options={[
        { value: "1", text: "Opción 1" },
        { value: "2", text: "Opción 2" },
        { value: "3", text: "Opción 3" },
      ]}
      placeholder="Selecciona una opción"
    />
  );
}
```

## Multi Select

```tsx
import { MultiSelect } from "@/libs/slim-select";

function Tags() {
  const [values, setValues] = useState<string[]>([]);

  return (
    <MultiSelect
      values={values}
      onChange={setValues}
      options={[
        { value: "react", text: "React" },
        { value: "vue", text: "Vue" },
        { value: "angular", text: "Angular" },
      ]}
      placeholder="Selecciona tecnologías"
      allowCreate={true}
    />
  );
}
```

## Con Hook

```tsx
import { useSelect } from "@/libs/slim-select";

function CustomSelect() {
  const { ref, value, setValue, options, setOptions } = useSelect({
    placeholder: "Buscar...",
    searchable: true,
  });

  return <div ref={ref} />;
}
```

## Props Comunes

| Prop | Tipo | Descripción |
|------|------|-------------|
| `options` | `Option[]` | Array de opciones |
| `placeholder` | `string` | Texto placeholder |
| `searchable` | `boolean` | Habilitar búsqueda |
| `allowCreate` | `boolean` | Permitir crear opciones |
| `disabled` | `boolean` | Deshabilitar select |
| `closeOnSelect` | `boolean` | Cerrar al seleccionar |
