# Continuidad de tracks en la vista general

El backend transmite actualizaciones incrementales por barrido de radar. El frontend procesa su buffer cada 200 ms. Reemplazar el buffer completo con cada mensaje descartaba los barridos anteriores: un mensaje vacío o de otro radar podía borrar actualizaciones de una embarcación activa antes de procesarlas. Tras suficientes pérdidas, la limpieza veía una última actualización antigua y eliminaba el track, aunque el WebSocket hubiera recibido detecciones reales. Un barrido posterior lo recreaba sin su traza anterior.

El buffer ahora agrupa las detecciones por ID. Los barridos de otros tracks y los arrays vacíos no eliminan actualizaciones pendientes. Para Magos se acumulan las posiciones por track, con el límite de historial existente; para Nano y Spotter se conserva la última detección pendiente de cada ID. El buffer se libera al procesar, limpiar o desmontar la conexión.

Las posiciones Magos con coordenadas no numéricas, fuera de rango o timestamp no numérico se descartan antes de modificar el estado cinemático. Así no contaminan el suavizado persistente. Un mensaje inválido no cuenta como una detección nueva ni prolonga la vida del track.

No cambia el tiempo de inactividad configurado ni los filtros explícitos de zonas, categorías o dispositivos.

## Verificación local

```sh
node script/test-live-track-continuity.mjs
node script/test-browser-memory.mjs
node script/test-session-connection.mjs
node script/test-boat-renderer.mjs
```

La prueba de continuidad fallaba con el buffer anterior. Verifica barridos intercalados antes del procesamiento, mensajes vacíos, varias posiciones del mismo track, Nano/Spotter, seis minutos de detecciones continuas con limpieza activa, límite de historial, coordenadas inválidas, recuperación posterior y eliminación por inactividad real. Usa un WebSocket y reloj controlados; la comprobación con un radar en vivo requiere ejecutar el frontend actualizado en el entorno operativo.
