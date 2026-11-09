# Informe operativo de /historial

## Configuración

Generar informe usa un período propio por días completos en America/Santiago (desde/hasta incluidos). Por defecto propone ayer. No hereda fechas, horas, radar, zona, búsqueda por ID, favoritos, mínimos ni categorías ocultas del historial. La categoría y el mínimo de minutos se eligen dentro del diálogo del PDF. Las fechas y opciones del informe, incluidas las zonas críticas, se conservan al cerrar y volver a abrir el diálogo durante la sesión de la página. Para abarcar una noche completa de 21:00 a 07:00, selecciona tanto el día de inicio como el día siguiente. Los cambios de hora de Chile se respetan, incluyendo días de 23 o 25 horas.

Buscar por ID exacto en el historial consulta ese ID en todos los radares y fechas, con mínimo de un punto, ignorando zonas, favoritos, mínimos y visibilidad de categorías. Los filtros anteriores se conservan y vuelven a aplicarse al borrar el ID. El botón Crear informe PDF está disponible incluso sin resultados visibles.

- Franja nocturna predeterminada: 21:00-07:00, America/Santiago.
- Detecciones de embarcaciones: Lancha. Es posible elegir otra categoría o todas. La selección se aplica antes de solicitar posiciones y a todos los indicadores, mapas y tablas.
- Orden de recorrido: mayor distancia recorrida; también permite mayor tiempo de seguimiento o más puntos.
- Incluir mapa de calor: desactivado. Activa la sección de distribución geográfica.
- Opciones avanzadas plegadas, con proximidad al perímetro (100 m), hueco máximo para sumar tiempo (120 s) y mínimo de puntos por track (100).

El mínimo usa el `point_count` del resumen del período, no la cantidad de posiciones descargadas. Solo restringe la tabla de recorrido; los gráficos y mapas conservan todos los tracks de la categoría seleccionada.

## Orden del PDF

1. **02 / Vigilancia nocturna**: página principal con lectura ejecutiva, indicadores y gráfico de tracks distintos próximos a zonas críticas de noche. A continuación, mapas nocturnos con trazados e identificadores, en grupos de hasta ocho tracks para facilitar la lectura. El mapa de trazados siempre aparece y no depende del interruptor de mapa de calor.
2. **05 / Recorrido y seguimiento**: tabla agrupada por hora de inicio dentro del período, reuniendo todas las fechas y ordenando cada grupo según el criterio elegido. Cada fila muestra horario, track/radar, fecha y hora inicial, recorrido, trackeo, tiempo enlazado, puntos y base. Se resaltan en rojo los tracks con el mayor tiempo enlazado acumulado del listado, incluidos empates (solo valores positivos). Se conservan ceros y tracks sin trayectoria con N/D; no se limita la tabla a los primeros 100 tracks.
3. **03 / Distribución temporal**: calendario de minutos acumulados de trackeo por día y hora. Verde representa menor tiempo y rojo mayor tiempo. Cada página incluye hasta 28 fechas.
4. **04 / Distribución geográfica**: opcional, mapa de calor general y entorno de zonas críticas.

Se retiraron patrones de tránsito y todas las demás secciones del informe anterior. La opción de versión resumida se retiró del diálogo; los llamadores antiguos con `format: summary` usan la misma estructura operativa.

## Cálculos y límites

- Proximidad: distancia al perímetro de los polígonos actuales, con una proyección métrica local. Interior y borde equivalen a cero. Los gráficos nocturnos cuentan tracks distintos, no pulsos.
- Recorrido: suma geodésica entre posiciones consecutivas separadas por hasta el hueco máximo, sin unir interrupciones largas.
- Trackeo: primera a última detección, recortadas al período; puede incluir interrupciones.
- Tiempo enlazado: suma de intervalos válidos. Las posiciones estacionarias aportan tiempo aunque no aporten distancia.
- Base: Historial completo si el backend entrega métricas previas al muestreo con el mismo umbral; Muestra (~) si se calcula sobre posiciones descargadas; Sin trayectoria si no hay intervalos calculables.
- Calendario: suma los intervalos entre posiciones válidas y únicas del mismo track que no superen el hueco máximo. Reparte cada intervalo entre las horas atravesadas y convierte a horario de Chile, respetando cambios de hora y medianoche. Suma tracks simultáneos, de modo que una celda puede superar 60 minutos. Usa posiciones analizadas, sin extrapolar el tiempo durante huecos ni repartir métricas completas entre horas sin evidencia temporal. Un punto aislado aporta cero segundos.
- Los mapas de trazados se restringen a posiciones nocturnas y no unen huecos mayores al máximo. Son esquemas geográficos con escala, norte y polígonos, sin imagen satelital.

Las posiciones se cargan de hasta 160 tracks repartidos por el período, con un presupuesto aproximado de 60.000 posiciones y cuatro consultas simultáneas. Puede haber cobertura parcial o muestreada, declarada en el informe. Un track no identifica una embarcación física, matrícula ni propietario.

## Validación

Desde `frontend`:

```sh
node script/test-history-page-filters.mjs
node script/test-history-filters.mjs
node script/test-history-classification.mjs
node script/test-report-analytics.mjs
node script/generate-report-preview.mjs
npm run build
```

Las pruebas verifican conversiones horarias y DST, duplicados, distancias, huecos, carga y filtros, valores predeterminados, orden de secciones, mapa de calor opcional y tiempo observado repartido al cruzar medianoche.

El generador produce `output/pdf/informe-operativo-demostracion.pdf` con datos sintéticos, categoría Lancha y mapa de calor activado para revisar todas las secciones. Acepta una categoría opcional: `node script/generate-report-preview.mjs lancha`.

Estos cambios son del frontend; no requieren migraciones SQL. Las métricas completas de recorrido requieren un backend compatible con `sample=true`, `include_metrics=true` y `max_gap_seconds`.
