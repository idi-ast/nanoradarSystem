# Zonas: /zonas

La ruta protegida `/zonas` aparece como Zonas en el menú lateral. Utiliza los registros de `GET /api-system/zonas`; no mantiene un catálogo paralelo.

## Consulta y creación

- Listado con búsqueda por nombre o ID de base de datos / `MG-ID`.
- Mapa satelital y esquema sin dependencia de recursos externos. Seleccionar una zona encuadra su polígono; sus vértices están numerados.
- Tabla de latitud, longitud y altitud, conservando la precisión de los números recibidos. El cierre del polígono se identifica como repetición del punto 1.
- Crear zona permite dibujar mediante clics, arrastrar puntos en el mapa satelital o introducir coordenadas manualmente. Se pueden corregir o quitar vértices antes de guardar; Centrar dibujo encuadra los puntos introducidos.
- La creación usa los tipos de alerta disponibles del servidor. La nueva zona se guarda con `POST /api-system/zonas`. Solo después se usa su ID y nombre devueltos por la BD y se actualiza la consulta compartida con Historial y Análisis.
- El adaptador `createRadarZone` extrae el registro de `response.data.data`, de acuerdo con la respuesta existente del backend.

## Exportación de una o varias zonas

Las casillas del listado determinan qué zonas se incluyen en el JSON. Seleccionar visibles añade las zonas válidas del filtro; Limpiar selección vacía el conjunto. El contador muestra cuántas zonas se copiarán. Consultar el detalle de una zona o cambiar la búsqueda no elimina zonas ya marcadas explícitamente. El mapa encuadra las marcadas y permite seguir consultando los vértices de la zona enfocada.

El campo JSON es de solo lectura y tiene un botón Copiar / Copiar N zonas. Tanto la copia individual como la conjunta usan exactamente este contenedor:

```json
{
    "result": {
        "alert": {}
    }
}
```

`alert` contiene una entrada por zona marcada, con clave e ID `MG-{id_zona_bd}`. No se copian los UUID de las zonas de ejemplo; se utilizan los IDs reales del sistema.

El archivo final suministrado contiene dos configuraciones, conservadas literalmente como plantillas Exterior e Interior en `src/features/zones/zoneExportTemplate.json`. Cada zona marcada permite elegir una de ellas; Exterior es la predeterminada. Esto elige una configuración completa del archivo, sin editar sus campos. Ambas mantienen sus cuatro acciones originales, filtros `boats`, UUID, `enabled: true` y `active: false`; Exterior conserva `#fbff1f` y `custom: true`, e Interior `#000000` y `custom: false`.

Dentro de cada entrada únicamente se completan:

1. La clave raíz de la zona y `id`, con `MG-{id_zona_bd}`.
2. `name`, con el nombre guardado en la base de datos.
3. `vertices`, con objetos `{ latitude, longitude, altitude: 0 }` en el orden de la zona. Se repite el primero al final si todavía no está cerrado.

Todos los demás campos de la plantilla elegida permanecen idénticos al archivo final. No se agregan campos de nuestro registro ni se sustituyen sus valores por las preferencias locales de alerta o color.

Se aceptan vértices en arrays u objetos indexados, sin invertir coordenadas ni redondearlas. Un punto inválido, un ID faltante, IDs duplicados o menos de tres vértices distintos impiden construir la exportación: no se omiten zonas o puntos silenciosamente. Sin zonas marcadas, el botón Copiar queda deshabilitado. Si una zona marcada desaparece durante una actualización, se solicita revisar la selección antes de copiar.

El botón copia exactamente el contenido del campo mediante Clipboard API. Si no está disponible, intenta copiar el texto seleccionado con la alternativa del navegador. Si ambos mecanismos fallan, deja el texto seleccionado e indica usar Ctrl+C / Cmd+C, sin informar éxito.

## Validación

```sh
node script/test-zones-page.mjs
npx eslint src/features/zones src/features/devices/services/radarService.ts src/config/ConfigServer.tsx
```

Las pruebas comprueban el contenedor result.alert, las dos plantillas completas y sus cuatro acciones, selección/copia de varias zonas sin perderlas al filtrar, precisión y cierre, entradas inválidas, inmutabilidad de la plantilla, respuesta del servicio, creación desde coordenadas, recuperación ante errores, uso del ID/nombre devueltos por BD, copia y alternativa bloqueada, y render del esquema. Usan servicios controlados y no crean zonas en una base real.

No requiere migración ni cambios de endpoints del backend.
