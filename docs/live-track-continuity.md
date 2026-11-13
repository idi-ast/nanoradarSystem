# Continuidad de tracks en la vista general

El backend transmite actualizaciones incrementales por barrido de radar. El frontend procesa su buffer cada 200 ms. Reemplazar el buffer completo con cada mensaje descartaba los barridos anteriores: un mensaje vacío o de otro radar podía borrar actualizaciones de una embarcación activa antes de procesarlas. Tras suficientes pérdidas, la limpieza veía una última actualización antigua y eliminaba el track, aunque el WebSocket hubiera recibido detecciones reales. Un barrido posterior lo recreaba sin su traza anterior.

El buffer ahora agrupa las detecciones por ID. Los barridos de otros tracks y los arrays vacíos no eliminan actualizaciones pendientes. Para Magos se acumulan las posiciones por track, con el límite de historial existente; para Nano y Spotter se conserva la última detección pendiente de cada ID. El buffer se libera al procesar, limpiar o desmontar la conexión.

Las posiciones Magos con coordenadas no numéricas, fuera de rango o timestamp no numérico se descartan antes de modificar el estado cinemático. Así no contaminan el suavizado persistente. Un mensaje inválido no cuenta como una detección nueva ni prolonga la vida del track.

La preferencia de inactividad tenía un valor inicial de 5 segundos, mientras que la ventana de detección activa es de 10 segundos. Esto permitía eliminar del mapa y del listado un track todavía activo entre barridos separados por 7 segundos. La eliminación ahora respeta como mínimo `TRACKING_ACTIVE_MS`, incluso cuando el navegador conserva la preferencia antigua de 5 segundos. Los tiempos configurados mayores y el valor de sistema se conservan. El panel muestra el mínimo efectivo y obtiene el tiempo de sistema de la instancia, en vez de mostrar un valor fijo de 70 segundos.

No cambian los filtros explícitos de zonas, categorías o dispositivos. Tampoco se renueva `lastUpdate` sin una detección real ni se generan posiciones durante los intervalos sin señal.

## Verificación local

```sh
node script/test-live-track-continuity.mjs
node script/test-browser-memory.mjs
node script/test-session-connection.mjs
node script/test-boat-renderer.mjs
```

La prueba de continuidad fallaba con el buffer anterior. Verifica además cuatro barridos separados por 7 segundos, ejecutando limpieza antes de recibir cada nuevo barrido: el track conserva su ID e historial dentro de la ventana activa. Este caso fallaba con la preferencia anterior de 5 segundos. Verifica barridos intercalados antes del procesamiento, mensajes vacíos, varias posiciones del mismo track, Nano/Spotter, seis minutos de detecciones continuas con limpieza activa, límite de historial, coordenadas inválidas, recuperación posterior y eliminación por inactividad real. Usa un WebSocket y reloj controlados; la comprobación con un radar en vivo requiere ejecutar el frontend actualizado en el entorno operativo.

## Identidad única tras fusionar reflejos

Los tracks Magos incluyen `mergedTrackIds`, con hasta 128 IDs absorbidos por el track principal. El servidor repite esos IDs en los barridos posteriores. Al procesar un lote, el frontend retira los IDs absorbidos del mapa y del estado cinemático, incluyendo actualizaciones antiguas todavía pendientes en el mismo lote. Conserva la traza del track principal; si ese ID aún no estaba en caché, recupera la traza disponible de un ID absorbido.

Las consultas PTZ que todavía mencionen un ID absorbido se asocian al track principal. Los tracks guardados bajo vigilancia también cambian al ID principal, con la observación real y sin crear una segunda embarcación. Si el track principal entra a una zona de exclusión, el servidor transmite la retirada de sus aliases y filtra el estado PTZ usando la zona actual del ID principal.

Las pruebas `test-live-track-continuity.mjs`, `test-ptz-tracking.mjs` y `test-track-surveillance.mjs` cubren la retirada de duplicados, actualizaciones pendientes en ambos órdenes, consultas PTZ antiguas, traslado de vigilancia y recarga.
