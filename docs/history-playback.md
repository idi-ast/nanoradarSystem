# Selección y reproducción de tracks en /historial

Mostrar todos carga las trayectorias del listado. Los tracks visibles y el track activo son estados separados: seleccionar un trazado, un punto o una etiqueta de la leyenda no elimina las otras trayectorias ni vuelve a descargarlas.

Al seleccionar un track:

- Su trazado y marcadores se destacan, y sus capas se colocan sobre las demás.
- Los otros tracks siguen visibles con menor opacidad y conservan su posición.
- La reproducción se pausa. Los controles inferiores muestran el ID, radar, categoría, recorrido, duración, puntos y datos de la posición actual (hora de Chile, velocidad, zona y coordenadas).
- Reproducir, pausar y desplazar el cursor actúan solo sobre el track seleccionado. El límite del cursor corresponde a sus propios puntos.
- Cada track conserva su avance al cambiar de selección. Reproducir desde el final reinicia ese track.
- El mapa identifica el track seleccionado con una tarjeta. Los tracks de una sola posición también son seleccionables.

Reproducir todos restaura los controles conjuntos y reinicia el cursor común. Cerrar todos los tracks limpia el mapa y la selección. Si se retira del listado el track activo, se restaura el control conjunto de los restantes.

El recorrido del reproductor se calcula sobre las posiciones cargadas. La duración conjunta abarca desde la primera hasta la última posición de las trayectorias visibles; la individual usa solo las del track activo. Los identificadores incluyen el tipo de radar para distinguir IDs iguales de radares distintos.

## Validación

```sh
node script/test-history-playback.mjs
node script/test-browser-memory.mjs
```

Las pruebas ejercitan el hook con cambios de selección, reproducción y temporizadores, avance independiente y reanudación, límites de cursor, retorno al grupo, eliminación del track activo y ausencia de descargas adicionales. También ejecutan los manejadores de clic de líneas y puntos, verifican opacidades/capas y renderizan la información del reproductor. No requieren backend ni servicios de Mapbox.
