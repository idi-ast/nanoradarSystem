# Revisión de memoria del navegador

Fecha: 2026-11-03. Revisión del código de `frontend` y pruebas locales controladas.
No se pudo inspeccionar una pestaña de producción: el acceso conectado al navegador no estaba disponible. No hay mediciones de RAM ni de ocupación real del almacenamiento de esa sesión.

## Qué se conserva

| Datos | Ubicación | Observación |
| --- | --- | --- |
| Autenticación y usuario (`access_token`, `refresh_token`, `auth_*`, `user-storage`) | localStorage | Se mantienen las claves y el comportamiento de autenticación. No se imprimieron sus valores durante esta revisión. |
| Preferencias (`target-visual-prefs`, `radar-visual-prefs`, `zone-style-prefs`, `camera-activity-prefs`, `ui-storage`, `theme`) | localStorage | Configuración pequeña. El viewport actual no se persiste, pero antes sus actualizaciones volvían a escribir las demás preferencias. |
| Sonidos personalizados (`wiradar-custom-sounds`) | localStorage | Lista con rutas y nombres; los archivos se suben al servidor, no se guardan como audio base64. Límite configurado: 10 sonidos. |
| Notificaciones del módulo de plantilla (`notification-storage`) | localStorage y RAM | Su lista no tiene un límite de registros únicos. No se aplicó un truncado automático: podría eliminar notificaciones que solo existan localmente. La suscripción en tiempo real de ese módulo es actualmente un placeholder. |
| Objetivos en vivo y sus posiciones | RAM del estado React | Se conserva el límite configurado de 1.500 puntos por objetivo. Los objetivos caducan según la configuración existente. |
| Historial consultado al backend | RAM de TanStack Query | Hasta 5.000 puntos por respuesta por defecto del backend. Ahora se comparte la entrada durante ventanas de 30 s y las entradas inactivas caducan después de 60 s. La petición sigue enviando la referencia temporal exacta; se separan ventanas de días distintos. |
| Reproducción de trayectorias | RAM del reproductor y de TanStack Query | Peticiones de hasta 20.000 puntos por track. Las trayectorias seleccionadas siguen en el estado del reproductor; las copias de caché inactivas caducan en 60 s en vez de 10 min. |
| Estados cinemáticos | RAM de cada instancia del radar | Ya no se comparten globalmente. Caducan tras 120 s de inactividad, con revisión cada 15 s, incluso sin mensajes nuevos. Se liberan al cerrar la conexión. |
| Video WebRTC | Recursos de navegador/decodificador | Al cerrar o reemplazar la sesión se aborta la negociación, se detienen tracks, se desconectan handlers y se limpia `srcObject`. El cambio a pantalla completa conserva el stream compartido. |
| Motor PDF y fuentes | Módulos JavaScript | Ahora se descargan y evalúan al generar el primer informe. Después quedan cargados, como otros módulos JavaScript. |

## Cambios aplicados

- Se dejó de crear una caché de historial por cada nueva posición del objetivo seleccionado. Antes podía cambiar la clave unas cinco veces por segundo y conservar las entradas inactivas durante 30 minutos.
- Se acortó la retención de consultas pesadas inactivas a 60 s, sin cambiar la retención global de otros datos de la aplicación.
- Las actualizaciones de preferencias que serializan exactamente el mismo contenido no vuelven a escribir localStorage. Se conserva el formato y la versión existentes.
- Los historiales se actualizan copiando solo el tramo que se conservará. El primer lote Magos también respeta el límite de 1.500 puntos; antes podía superarlo.
- Los mensajes de cámaras sin posiciones de radar no copian el mapa de objetivos. La limpieza de objetivos solo lo copia cuando necesita eliminar uno.
- Se liberan buffers y handlers al cerrar WebSocket. El lote de reproducción deja de programar nuevas descargas al salir de la página; las peticiones que ya comenzaron pueden terminar.
- Iniciar repetidamente el polling de notificaciones ya no deja intervalos adicionales activos.
- PDF y fuentes dejan de formar parte del JavaScript inicial: el archivo principal pasó de 5.496,90 kB a 3.241,66 kB; el informe se entrega en un chunk de 2.231,34 kB bajo demanda. Es una reducción aproximada del 41% del archivo inicial, no una medición del ahorro de RAM.

No se borraron claves de autenticación, preferencias, favoritos ni datos del servidor. No se redujo el límite configurado de las trazas en vivo.

## Verificación

Desde `frontend`:

```sh
node script/test-browser-memory.mjs
node script/test-boat-renderer.mjs
```

Las pruebas cubren equivalencia de historiales acotados sin mutaciones, 2.000 actualizaciones de viewport sin escrituras adicionales, persistencia/rehidratación de preferencias, reutilización y eliminación de consultas con QueryObserver real, separación entre días, limpieza de estados y sockets, conservación de video durante la transición a fullscreen, cierre idempotente de ambas implementaciones de cámara, cancelación de nuevas descargas al desmontar el reproductor y polling sin intervalos duplicados. Las pruebas de video usan dobles controlados; no verifican un decodificador/GPU ni una cámara física.

ESLint de los archivos cambiados en esta revisión y `vite build` pasaron. La comparación de diagnósticos TypeScript con HEAD encontró los mismos 23 errores previos, sin errores nuevos. Por ello `tsc -b` y el comando completo `npm run build` siguen bloqueados por esos errores existentes.

## Medición en el equipo afectado

`script/browser-memory-snapshot.js` puede ejecutarse en la consola de DevTools de la aplicación. Solo lee tamaños aproximados y conteos: no modifica datos ni imprime valores de tokens o preferencias. El tamaño de localStorage se estima como texto UTF-16 y no equivale a la cuota exacta del navegador. El heap JavaScript, cuando está disponible, tampoco incluye toda la memoria gráfica o del decodificador.

Para verificar una sesión prolongada:

1. Tomar una captura inicial de tamaños/conteos y usar Performance/Memory de DevTools para el heap.
2. Seleccionar un objetivo en vivo durante al menos cinco minutos y cambiar de objetivo varias veces.
3. Abrir/cerrar cámaras y alternar maximizado/pantalla completa; confirmar que el video sigue reproduciéndose y que al cerrar una cámara termina su conexión.
4. Entrar al historial, cargar varias trayectorias, salir y esperar al menos 60 s. Comparar el heap después de una recolección de basura desde DevTools.
5. Generar un PDF y comprobar el archivo descargado. La primera generación incorpora la descarga del módulo de informes.

Las cachés de mapas y los recursos gráficos del navegador pueden conservar memoria reutilizable. Para determinar una fuga hay que observar crecimiento sostenido al repetir el mismo recorrido, no exigir que el proceso vuelva inmediatamente al mismo número de MB.
