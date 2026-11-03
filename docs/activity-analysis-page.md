# Analítica interactiva: /analisi

La página está registrada como **Análisis** en el menú lateral, dentro de las rutas protegidas existentes. La URL solicitada es `/analisi`.

## Uso

- Se abre con las últimas 24 horas. Permite elegir fechas y horas, radar, mínimo de puntos y distancia de proximidad, además de accesos rápidos a 24 horas, 7 días o 30 días.
- Fechas y gráficos usan **America/Santiago**, aunque el navegador esté configurado en otra zona horaria. Se respetan los cambios de horario: una hora inexistente se rechaza y un borde ambiguo incluye las dos ocurrencias.
- La selección de clasificación permite ver todos los tracks o solo las embarcaciones clasificadas. La zona crítica predeterminada es el polígono llamado `modulo`, ignorando mayúsculas y acentos. También se pueden elegir otras zonas o todas.
- Hay indicadores de volumen, embarcaciones clasificadas, presencia nocturna y proximidad nocturna; horas pico; gráficos por hora y fecha; matriz fecha/hora; composición por clasificación; actividad interior por zona; y ranking de acercamientos.
- El mapa permite alternar todo el período o solo la noche, navegar sobre el fondo satelital, consultar celdas y localizar registros del ranking. Si no carga el fondo, puede usarse el esquema geográfico sin recursos externos.
- La tabla de acercamientos se puede buscar, ordenar por distancia o prioridad y paginar. `Ver en mapa` abre la ubicación del mínimo observado. La matriz se pagina en bloques de 31 fechas para evitar miles de elementos simultáneos.

## Consistencia y cobertura

Se reutiliza `computeOperationalAnalysis`, el mismo cálculo empleado por el PDF. Los datos de la página ahora llegan por `GET /analysis/activity`, que agrupa resúmenes una sola vez y muestrea trayectorias por lotes. Las reglas operativas de noche siguen siendo 21:00-07:00 y el hueco máximo para sumar tiempo es de 120 s. El umbral de proximidad es editable.

Los inicios por hora usan los resúmenes; la presencia nocturna, los acercamientos y el mapa usan posiciones analizadas. La página muestra cuántos resúmenes e historiales se cargaron, qué datos faltaron, si hubo recortes y si el servidor confirmó muestreo uniforme. Si faltan posiciones o una zona válida, los indicadores espaciales muestran N/D en lugar de afirmar ausencia de actividad.

El muestreo conserva los límites del informe: hasta 160 tracks repartidos en el período, hasta 2.000 posiciones por track y 60.000 posiciones en total. Conserva los extremos de cada trayectoria. Los resúmenes tienen un tope de 10.000 registros con cobertura explícita. Una petición HTTP ejecuta una consulta SQL de resúmenes y otra de posiciones, sin repetir conteos por página ni enviar una petición por track. El ranking expresa distancias mínimas observadas; no garantiza el mínimo real entre posiciones muestreadas. Los IDs de radar no equivalen a embarcaciones físicas identificadas.

La respuesta incluye `timings` (resúmenes, posiciones, total en milisegundos) y el encabezado `Server-Timing` para medir desde Network del navegador. Estos tiempos son del servidor; la transferencia, deserialización y cálculo de gráficos agregan tiempo. Se requiere actualizar backend y frontend juntos. No se necesita una migración nueva; conviene verificar en la base real los índices ya definidos en las migraciones 009 y 013. Ver `backend/docs/activity-analysis-performance.md`.

## Memoria y ciclo de vida

- La nueva ruta se carga bajo demanda con Suspense y tiene un límite de errores local.
- No hay nuevos datos persistidos en localStorage ni sessionStorage.
- La consulta de analítica usa `gcTime: 0`, desactiva comparación profunda de datos y no se repite automáticamente al volver a la ventana. Los conjuntos inactivos se liberan al cambiar de consulta o salir de la página.
- La petición HTTP recibe AbortSignal: dejar la página o cambiar de período cancela la descarga. El backend comprueba desconexión antes de iniciar las trayectorias; una consulta SQL ya iniciada puede terminar en el servidor.
- Para el mapa se agrupan las posiciones en una cuadrícula adaptable con hasta 8.000 celdas, conservando el total de posiciones. Hay un único mapa activo, sin reutilizar contextos gráficos desmontados.
- El esquema geográfico usa las mismas posiciones filtradas que el mapa; no sustituye cada celda por un único registro ni pierde su ponderación.

## Verificación

```sh
node script/test-analysis-dashboard.mjs
node script/test-report-analytics.mjs
node script/test-browser-memory.mjs
```

Las pruebas verifican conversión horaria de verano/invierno y DST de Chile, validación de filtros, conservación de conteos en la cuadrícula acotada, filtro nocturno, cancelación y parámetros de la consulta, configuración de caché y renderizado estático de estados con datos, sin datos, cargando y con error.

La prueba de render usa los componentes de la página con consultas controladas y un sustituto de Mapbox para Node. No verifica una GPU ni interacciones reales del navegador. La herramienta de revisión visual del navegador agotó su tiempo de espera en esta sesión; queda pendiente una comprobación visual interactiva en el equipo del usuario.

Para comprobar en navegador: abrir `/analisi`, cambiar período/radar, alternar clasificación y zona, revisar tooltips y calendario, alternar noche en el mapa, pulsar una celda y usar Ver en mapa. Confirmar también que un período sin registros muestra ausencia de datos, que una fecha inválida no ejecuta consultas y que salir de la página detiene nuevas cargas.
