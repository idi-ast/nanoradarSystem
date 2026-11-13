# Informe operativo de /historial

## Configuración

Generar informe usa fechas propias en America/Santiago (desde/hasta incluidos) y aplica el horario elegido a **todo el PDF**: indicadores, puntos, recorridos, tiempos, rankings, calendario y mapas. Las fechas delimitan los días consultados; no autorizan incluir horas fuera de la franja. Por defecto propone ayer. No hereda fechas, horas, radar, zona, búsqueda por ID, favoritos, mínimos ni categorías ocultas del historial. La categoría y el mínimo de minutos se eligen dentro del diálogo del PDF. Las fechas y opciones del informe, incluidas las zonas críticas, se conservan al cerrar y volver a abrir el diálogo durante la sesión de la página. Para abarcar una noche completa de 21:00 a 07:00, selecciona tanto el día de inicio como el día siguiente. Los cambios de hora de Chile se respetan, incluyendo días de 23 o 25 horas.

Buscar por ID exacto en el historial consulta ese ID en todos los radares y fechas, con mínimo de un punto, ignorando zonas, favoritos, mínimos y visibilidad de categorías. Los filtros anteriores se conservan y vuelven a aplicarse al borrar el ID. El botón Crear informe PDF está disponible incluso sin resultados visibles.

- Horario predeterminado del informe: 21:00-07:00, America/Santiago. El inicio se incluye y el fin se excluye: 21:00 y 06:59:59 se incluyen; 07:00 y 14:00 se excluyen. Se respeta el cruce de medianoche y el cambio de hora de Chile. Un track iniciado a las 14:00 que continúa por la noche se resume desde su primera observación dentro de la franja.
- Detecciones de embarcaciones: Lancha. Es posible elegir otra categoría o todas. La selección se aplica antes de solicitar posiciones y a todos los indicadores, mapas y tablas.
- Orden de recorrido: mayor distancia recorrida; también permite mayor tiempo de seguimiento o más puntos.
- Incluir mapa de calor: desactivado. Activa la sección de distribución geográfica.
- Opciones avanzadas plegadas, con proximidad al perímetro (100 m), hueco máximo para sumar tiempo (120 s) y mínimo de puntos por track (100).

El mínimo usa el `point_count` del resumen del período **y horario solicitados**, no la cantidad de posiciones descargadas. Se aplica a la tabla de recorrido y a los mapas de tracks para que usen la misma selección. Los indicadores y gráficos de actividad conservan todos los tracks de la categoría seleccionada.

## Enlaces de IDs al historial

Las IDs de la tabla, la lista del mapa general, los avisos de tracks sin mapa y los títulos de detalles individuales incluyen hipervínculos al sitio que genera el PDF. El enlace usa el origen del frontend (incluido su puerto) y la ruta `/historial?track=<ID codificada>`; no copia tokens ni otros parámetros de la página actual. Los textos dentro de capturas o esquemas de imagen no son enlaces; sus IDs equivalentes en los títulos y listas sí lo son.

Al abrir el enlace, el historial busca automáticamente la ID exacta y omite los demás filtros, como en una búsqueda manual por ID. También responde a cambios de ID en la URL sin desmontar la página; editar o borrar la búsqueda actualiza ese parámetro. Si es necesario iniciar sesión, se conserva la ruta completa con sus parámetros para volver al track después del login. Se mantienen los controles normales de acceso al sitio.

En generación fuera del navegador se puede proporcionar `historyBaseUrl` explícitamente; sin un origen HTTP/HTTPS válido las IDs quedan como texto normal. La vista previa admite el origen como cuarto argumento de su ejecutable compilado para verificar enlaces con un dominio de prueba.

## Orden del PDF

1. **02 / Vigilancia nocturna**: página principal con lectura ejecutiva, indicadores y gráfico de tracks distintos observados por hora (azul) junto con los próximos a zonas críticas (ámbar). La actividad sigue visible aunque ninguna posición de la muestra esté a la distancia configurada; proximidad cero no equivale a ausencia de tracks. A continuación, mapas nocturnos con trazados e identificadores, en un único mapa general que contiene todos los tracks con posiciones disponibles. El mapa de trazados siempre aparece y no depende del interruptor de mapa de calor. Conserva todos los puntos del recorrido como geometría de líneas y dibuja únicamente dos marcadores por track: Inicio y Fin (uno combinado si hay una sola posición). Los cortes superiores al hueco máximo se conservan, sin marcadores en cada corte ni puntos intermedios. El mapa general asigna un color a cada track y conserva todos los recorridos en una sola vista, sin dividirlos en grupos de ocho. Los detalles individuales se colocan al final de todo el PDF, después de la tabla, calendario y mapa de calor opcional, en páginas de hasta cuatro paneles, con el mismo color que el mapa general, para distinguir recorridos superpuestos. Cada mapa enumera los IDs que contiene; la tabla indica el número de mapa de cada track. Si faltan posiciones, se indica la cantidad representada frente al total de filas y se identifica cada track sin mapa con su motivo. Las líneas de la captura satelital son continuas dentro de cada segmento observado.
2. **05 / Recorrido y seguimiento**: tabla agrupada por hora de inicio dentro del período, reuniendo todas las fechas y ordenando cada grupo según el criterio elegido. Cada fila muestra horario, track/radar, fecha y hora inicial, recorrido, trackeo, tiempo enlazado, puntos y base. Se resaltan en rojo los tracks con el mayor tiempo enlazado acumulado del listado, incluidos empates (solo valores positivos). Se conservan ceros y tracks sin trayectoria con N/D; no se limita la tabla a los primeros 100 tracks.
3. **03 / Distribución temporal**: calendario de minutos acumulados de trackeo por día y hora. Verde representa menor tiempo y rojo mayor tiempo. Cada página incluye hasta 28 fechas.
4. **04 / Distribución geográfica**: opcional, mapa de calor general y entorno de zonas críticas.

Se retiraron patrones de tránsito y todas las demás secciones del informe anterior. La opción de versión resumida se retiró del diálogo; los llamadores antiguos con `format: summary` usan la misma estructura operativa.

## Cálculos y límites

- Proximidad: distancia al perímetro de los polígonos actuales, con una proyección métrica local. Interior y borde equivalen a cero. El gráfico muestra por separado presencia y proximidad, contando tracks distintos, no pulsos. La lectura ejecutiva informa la actividad observada y su hora pico incluso con proximidad cero. Si faltan posiciones o polígonos críticos válidos, indica que la proximidad no se pudo calcular; si la muestra no registra acercamientos, no concluye ausencia fuera de esa muestra.
- Recorrido: suma geodésica entre posiciones consecutivas separadas por hasta el hueco máximo, sin unir interrupciones largas.
- Trackeo: tiempo entre primera y última detección de la franja, recortado al período y sin sumar horas fuera del horario elegido; puede incluir interrupciones dentro de la franja.
- Tiempo enlazado: suma de intervalos válidos. Las posiciones estacionarias aportan tiempo aunque no aporten distancia.
- Base: Historial completo si el backend entrega métricas previas al muestreo con el mismo umbral; Muestra (~) si se calcula sobre posiciones descargadas; Sin trayectoria si no hay intervalos calculables.
- Calendario: suma los intervalos entre posiciones válidas y únicas del mismo track que no superen el hueco máximo. Reparte cada intervalo entre las horas atravesadas y convierte a horario de Chile, respetando cambios de hora y medianoche. Suma tracks simultáneos, de modo que una celda puede superar 60 minutos. Usa posiciones analizadas, sin extrapolar el tiempo durante huecos ni repartir métricas completas entre horas sin evidencia temporal. Un punto aislado aporta cero segundos.
- Los mapas de trazados se restringen al horario del informe y no unen huecos mayores al máximo. Usan captura satelital cuando está disponible; la alternativa esquemática también conserva las líneas y solo marca inicio y fin.

Las posiciones se cargan de hasta 160 tracks, priorizando los elegibles para la tabla y mapas y repartiendo la selección restante por el período, con un presupuesto aproximado de 60.000 posiciones y cuatro consultas simultáneas. Las consultas fallidas por red, 408, 429 o errores 5xx se reintentan una vez en el informe, manteniendo cuatro consultas simultáneas como máximo. No se reintentan errores permanentes como 404 ni confirmaciones de horario incompatibles. Puede haber cobertura parcial o muestreada, declarada en el informe y por track (disponible, sin posiciones válidas, consulta fallida o fuera del límite de análisis). No se inventan trayectorias para completar los mapas. Un track no identifica una embarcación física, matrícula ni propietario.

## Validación

Desde `frontend`:

```sh
node script/test-track-link-auth.mjs
node script/test-history-page-filters.mjs
node script/test-history-filters.mjs
node script/test-history-classification.mjs
node script/test-report-analytics.mjs
node script/generate-report-preview.mjs
npm run build
```

Las pruebas verifican conversiones horarias y DST, duplicados, distancias, huecos, carga y filtros, valores predeterminados, orden de secciones, mapa de calor opcional y tiempo observado repartido al cruzar medianoche.

El generador produce `output/pdf/informe-operativo-demostracion.pdf` con datos sintéticos, categoría Lancha y mapa de calor activado para revisar todas las secciones. Acepta una categoría opcional: `node script/generate-report-preview.mjs lancha`.

Este filtro requiere desplegar frontend y backend juntos; no requiere migraciones SQL. `/tracks` y `/tracks/{id}/history` aceptan `hour_start`, `hour_end` y `time_zone`, aplicados antes de agregados, mínimos, clasificación, paginación, muestreo y métricas. Las respuestas confirman el horario en `time_window`. Si el backend no lo confirma, el frontend no genera un PDF que pueda mezclar datos diurnos. Las consultas normales del historial y el panel de análisis, sin estos parámetros, conservan todo el período. Las métricas completas de recorrido requieren un backend compatible con `sample=true`, `include_metrics=true` y `max_gap_seconds`.
