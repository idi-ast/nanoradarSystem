# Analítica interactiva: /analisis

La página está registrada como **Análisis** en el menú lateral, dentro de las rutas protegidas existentes. La URL es `/analisis`; `/analisi` redirige a esa ruta. Solo admin (rol 2) y superadmin (rol 1) ven el acceso en el menú y pueden montar la página. El cliente (rol 3) y un rol ausente se redirigen al inicio, sin cargar el panel de análisis.

## Uso

- Se abre con las últimas 24 horas. Permite elegir fechas y horas, radar, mínimo de puntos (100 por defecto) y distancia de proximidad, además de accesos rápidos a 24 horas, 7 días o 30 días.
- Fechas y gráficos usan **America/Santiago**, aunque el navegador esté configurado en otra zona horaria. Se respetan los cambios de horario: una hora inexistente se rechaza y un borde ambiguo incluye las dos ocurrencias.
- La selección inicial es Lancha; también permite ver todos los tracks o todas las embarcaciones clasificadas. La zona crítica predeterminada es el polígono llamado `modulo`, ignorando mayúsculas y acentos. También se pueden elegir otras zonas o todas.
- Hay indicadores de volumen, embarcaciones clasificadas, presencia nocturna y proximidad nocturna; horas pico; gráficos por hora y fecha; matriz fecha/hora; composición por clasificación; actividad interior por zona; y ranking de acercamientos.
- La tabla de recorrido agrupa por hora de inicio y ordena por mayor distancia por defecto, con búsqueda y paginación. Muestra recorrido, trackeo, tiempo enlazado acumulado, puntos y base de cálculo. Se resaltan en rojo los tracks con el máximo tiempo enlazado positivo, incluidos los empates. Los tracks sin trayectoria permanecen visibles con N/D.
- Al pulsar el ID, un trazado o Ver en mapa se aísla el track y aparece su detalle: métricas, horarios, clasificación, velocidades, interrupciones, zonas, proximidad y últimas posiciones con coordenadas. Se solicita una muestra ampliada de hasta 10.000 posiciones en el rango del track y del análisis, con métricas previas al muestreo cuando el backend las soporta.
- El calendario representa minutos acumulados por hora con escala verde-rojo. Suma intervalos válidos y los reparte entre horas; los tracks simultáneos suman sus tiempos y una celda puede superar 60 minutos. No cuenta embarcaciones.
- El mapa abre con trazados nocturnos y el mapa de calor desactivado. Al seleccionar un track muestra su período completo. Cada trazado tiene color e ID; no une huecos mayores al umbral. El mapa permite alternar todo el período o solo la noche, navegar sobre el fondo satelital, consultar celdas y localizar registros del ranking. Si no carga el fondo, puede usarse el esquema geográfico sin recursos externos.
- La tabla de acercamientos se puede buscar, ordenar por distancia o prioridad y paginar. `Ver en mapa` abre la ubicación del mínimo observado y el detalle del track. La matriz se pagina en bloques de 31 fechas para evitar miles de elementos simultáneos.

## Consistencia y cobertura

Se reutiliza `computeOperationalAnalysis`, el mismo cálculo empleado por el PDF. Los datos llegan en dos etapas: `GET /analysis/activity?include_points=false` entrega los resúmenes y `POST /analysis/activity/points` carga las trayectorias seleccionadas sin repetir la agregación. Los indicadores generales aparecen con los resúmenes; los indicadores espaciales quedan pendientes hasta recibir las posiciones. Una falla de la segunda etapa conserva los resúmenes y permite reintentar. Las reglas operativas de noche siguen siendo 21:00-07:00 y el hueco máximo para sumar tiempo es de 120 s por defecto, editable en Opciones avanzadas (desplegadas). El umbral de proximidad es editable.

Los inicios por hora usan los resúmenes; la presencia nocturna, los acercamientos y el mapa usan posiciones analizadas. La página muestra cuántos resúmenes e historiales se cargaron, qué datos faltaron, si hubo recortes y si el servidor confirmó muestreo uniforme. Si faltan posiciones o una zona válida, los indicadores espaciales muestran N/D en lugar de afirmar ausencia de actividad.

El muestreo conserva los límites del informe: hasta 160 tracks repartidos en el período, hasta 2.000 posiciones por track y 60.000 posiciones en total. Conserva los extremos de cada trayectoria. Los resúmenes tienen un tope de 10.000 registros con cobertura explícita. Las dos peticiones HTTP ejecutan en total una consulta SQL de resúmenes y otra de posiciones, sin repetir conteos por página ni enviar una petición por track. El ranking expresa distancias mínimas observadas; no garantiza el mínimo real entre posiciones muestreadas. Los IDs de radar no equivalen a embarcaciones físicas identificadas.

La respuesta incluye `timings` (resúmenes, posiciones, total en milisegundos) y el encabezado `Server-Timing` para medir desde Network del navegador. Estos tiempos son del servidor; la transferencia, deserialización y cálculo de gráficos agregan tiempo. Se requiere actualizar backend y frontend juntos. No se necesita una migración nueva; conviene verificar en la base real los índices ya definidos en las migraciones 009 y 013. Ver `backend/docs/activity-analysis-performance.md`.

## Memoria y ciclo de vida

- La ruta se carga bajo demanda con Suspense y tiene un límite de errores local. Los gráficos y el explorador de tracks se descargan por separado. La carga de datos muestra un aviso dentro de la página y permite seguir usando los filtros.
- El cálculo operativo usa un Web Worker con las mismas reglas del PDF; un cambio de filtros termina el cálculo anterior e ignora respuestas tardías. Si el navegador no permite iniciar el worker, se conserva el cálculo local como respaldo.
- No hay nuevos datos persistidos en localStorage ni sessionStorage.
- La consulta de analítica conserva el último resultado durante 60 segundos en memoria para volver a la vista sin repetir una carga reciente. Al cambiar período/radar se eliminan otros resultados inactivos. Desactiva comparación profunda y recarga al enfocar la ventana; no guarda estos datos en almacenamiento persistente.
- La petición HTTP recibe AbortSignal: dejar la página o cambiar de período cancela la descarga. El backend comprueba desconexión antes de iniciar las trayectorias; una consulta SQL ya iniciada puede terminar en el servidor.
- Para el mapa de calor se agrupan las posiciones en una cuadrícula adaptable con hasta 8.000 celdas, conservando el total de posiciones. Hay un único mapa activo, sin reutilizar contextos gráficos desmontados.
- Los trazados conservan posiciones y separan huecos; solo se marcan comienzos y finales de segmentos para limitar el trabajo gráfico. El esquema general limita las etiquetas a ocho, conservando todos los trazados. La selección de la tabla permite aislar cualquier track también en el esquema.
- La consulta del detalle usa `gcTime: 0`, consume AbortSignal en la petición HTTP y se libera al cambiar de track o salir de la página.

## Verificación

```sh
node script/test-analysis-dashboard.mjs
node script/test-analysis-worker.mjs
node script/test-report-analytics.mjs
node script/test-browser-memory.mjs
```

Las pruebas verifican conversión horaria de verano/invierno y DST de Chile, validación de filtros, conservación de conteos en la cuadrícula acotada, filtro nocturno, cancelación y parámetros de la consulta, configuración de caché y renderizado estático de estados con datos, sin datos, cargando y con error.

La prueba de render usa los componentes de la página y del detalle con consultas controladas y un sustituto de Mapbox para Node. Comprueba las métricas de posiciones ampliadas del track, además de separación de huecos, duplicados e identidad por radar. Se revisó la vista inicial en navegador con datos sintéticos; estas comprobaciones no verifican Mapbox con GPU ni la integración con el servidor de producción.

Para comprobar en navegador: abrir `/analisis`, cambiar período/radar, alternar clasificación y zona, revisar tooltips y calendario, alternar noche en el mapa, pulsar una celda y usar Ver en mapa. Confirmar también que un período sin registros muestra ausencia de datos, que una fecha inválida no ejecuta consultas y que salir de la página detiene nuevas cargas.

## Acceso por rol

`NavigationItem.allowedRoles` oculta Análisis en el menú de escritorio y móvil para otros roles. `ActivityAnalysisRoute` valida el rol al abrir la URL directamente. El backend exige `get_current_admin_user` en `/api-system/analysis/activity` y `/api-system/analysis/activity/points`: devuelve 401 sin sesión válida y 403 a otros roles, antes de ejecutar consultas. Los endpoints compartidos de historial e informes conservan su acceso anterior. Desplegar frontend y backend juntos para aplicar todas las restricciones.

Validación: `node script/test-analysis-access.mjs` y, desde backend, `python -m unittest discover -s tests -p test_analysis_access.py -v`.
