# Informe operativo de /historial

## Uso

En Historial, selecciona el período y los filtros y abre Generar informe. El diálogo permite seleccionar zonas críticas (preselecciona el nombre `modulo`, ignorando acentos y mayúsculas), franja nocturna (21:00-07:00 por defecto), proximidad al perímetro (100 m por defecto) y hueco máximo entre posiciones para sumar tiempo (120 s). Las horas del PDF se interpretan en `America/Santiago`.

El PDF contiene resumen ejecutivo; gráficos horarios con ejes, valores y leyendas; conteos generales y de embarcaciones clasificadas; actividad nocturna; matriz fecha/hora y perfil semanal para períodos cortos; mapas geográficos con polígonos, escala, norte y leyenda de intensidad; ranking completo de distancias observadas a los módulos; episodios y tiempos observados; tráfico interior por zona; hasta 12 casos prioritarios con coordenadas y fecha; clasificación, velocidades, cobertura, reglas y metodología.

El botón sigue respetando filtros y favoritos. El informe de favoritos se restringe además al período elegido. Las posiciones no se guardan en localStorage ni en una caché permanente del informe. Es posible cancelar la carga; salir de la página impide programar más descargas o iniciar la descarga del PDF, aunque las peticiones HTTP ya iniciadas pueden terminar.

## Qué se calcula

- Los inicios por hora usan la primera detección de cada resumen dentro del período. La tasa divide por las horas de calendario realmente incluidas, con cambios de hora de Chile. No se dispone de disponibilidad del sensor para calcular una tasa por hora de funcionamiento.
- La presencia por hora cuenta identificadores distintos en posiciones analizadas, no registros individuales. Un mismo track puede aparecer en varias horas.
- Los acercamientos se calculan al segmento más cercano del perímetro, usando una aproximación métrica local. Interior y borde tienen distancia cero. El ranking incluye todos los pares track-zona crítica analizados; las zonas superpuestas se evalúan por separado.
- Solo se suman tiempos entre posiciones consecutivas próximas, con separaciones de hasta el hueco configurado. Huecos mayores abren otro episodio y no se interpolan. La duración observada no es permanencia total garantizada.
- La prioridad Alta requiere proximidad nocturna y posición interior nocturna, dos episodios o al menos cinco minutos enlazables. Media requiere proximidad nocturna o posición interior. Las reglas son para revisar datos, no para concluir un robo, identificar una embarcación física o inferir autorizaciones.
- Las embarcaciones se distinguen por la categoría del sistema (`lancha`, `barco`, `embarcacion`, `bote`, `boat`, `vessel`). Los demás tracks continúan visibles con su clasificación.

## Cobertura y límites explícitos

El listado descarga páginas de 200 resúmenes, hasta 50 páginas (10.000 registros), y declara si el servidor informa más resultados. No se presenta un recorte de paginación como listado completo.

Las posiciones se cargan de hasta 160 tracks repartidos por el período, con un presupuesto de aproximadamente 60.000 posiciones y cuatro consultas simultáneas. Si hay menos tracks, se conservan hasta 2.000 posiciones por track. El PDF incluye cobertura, recortes, descartes y fallos. El mínimo espacial es el mínimo observado en las posiciones cargadas; puede omitir un acercamiento breve entre puntos. No se asignan intervalos de confianza estadísticos a esta selección.

El endpoint de historial añade `sample=true`. Este modo devuelve una muestra uniforme a lo largo de todo el intervalo filtrado, incluye ambos extremos cuando el límite es mayor que uno e informa `total_points` y `sampled`. Sin `sample`, mantiene el comportamiento anterior. Si el frontend se conecta a un backend antiguo, el PDF informa que el muestreo uniforme no está confirmado.

La agregación de resúmenes del backend también conserva ahora los filtros al calcular métricas para los IDs de la página: antes esa segunda consulta podía incluir registros de fechas fuera del período.

Los polígonos usados son los actuales; no hay versionado histórico de zonas en este informe. Densidad de posiciones no equivale a densidad de embarcaciones físicas. No se deducen matrículas o propietarios de un ID de radar.

## Implementación y despliegue

- `reportAnalytics.ts`: cálculos puros y reglas trazables.
- `reportCharts.ts`: gráficos SVG con texto real, ejes y leyendas, compatibles con pdfmake. Se eliminaron los falsos elementos `canvas.type = text` que no renderizaban rótulos.
- `report.ts`: composición paginada del documento y carga correcta de las fuentes VFS.
- `analysis.ts` y `api.ts`: carga acotada, identidad de tracks, rango exacto y cobertura.
- `ReportSettingsDialog.tsx` y `HistoryPage.tsx`: configuración y progreso.
- Backend: `routes/TrackHistory.py` y `schemas/TrackHistory.py`.

Hay cambios en frontend y backend: deben actualizarse ambos para disponer del muestreo uniforme y de la corrección de agregación temporal. No se requiere migración de base de datos.

## Validación

Desde frontend:

```sh
node script/test-report-analytics.mjs
../backend/.venv/bin/python -m unittest discover -s ../backend/tests -p 'test_history_report_sampling.py'
```

El test analítico verifica límites de noche, conversión horaria y DST, conteo por track, distancia a borde/interior, duplicados, huecos entre episodios, datos ausentes, fallos de carga y filtrado temporal. El test SQL ejecuta el muestreador con SQLite y funciones equivalentes, cubriendo límites 1-2-3-10-100-500-2000, conservación de extremos, uniformidad y filtros. No sustituye una prueba de carga sobre PostgreSQL de producción.

`script/generate-report-preview.ts` genera una muestra marcada como datos sintéticos, usando el mismo generador de PDF. Para ejecutarlo: `node script/generate-report-preview.mjs`. El PDF de muestra se entrega en `output/pdf/informe-operativo-demostracion.pdf`; sus cifras no corresponden a un centro real. Se renderizó y revisó visualmente; también se verificó que los rótulos se extraigan del PDF y que el texto quede dentro de página.

Referencias metodológicas incluidas en el informe: Cope et al. (2022), *Coastal radar as a tool for continuous and fine-scale monitoring of vessel activities...*, y US Coast Guard, *AIS Frequently Asked Questions*. Las reglas de prioridad son propias del informe, no umbrales normativos derivados de esas fuentes.
