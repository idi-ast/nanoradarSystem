# Socket.IO Client

Integracion de Socket.IO para comunicacion en tiempo real via WebSocket.

---

## Estructura

```
socket-io/
  config/
    socketClient.ts   # Instancia singleton y funciones connect/disconnect
  hooks/
    useSocket.ts      # Estado de conexion y control del ciclo de vida
    useSocketEvent.ts # Suscripcion a eventos del servidor
    useSocketEmit.ts  # Emision de eventos hacia el servidor
  types/
    socket.types.ts   # Tipos e interfaces
  utils/
    socketHelpers.ts  # Helpers: labels, colores, logger
```

---

## Variable de entorno

Agrega la URL del servidor Socket.IO en tu archivo `.env`:

```env
VITE_SOCKET_URL=http://localhost:3000
```

Si no se define, el cliente usa `http://localhost:3000` por defecto.

---

## Hooks disponibles

| Hook | Descripcion |
|---|---|
| `useSocket` | Estado de conexion, connect y disconnect |
| `useSocketEvent` | Suscribirse a eventos que llegan del servidor |
| `useSocketEmit` | Emitir eventos hacia el servidor |

---

## Uso: `useSocket`

Gestiona la conexion. La instancia es un singleton, por lo que conectarse en un componente afecta a todos los que usan el hook.

```tsx
import { useSocket } from "@/libs/socket-io";

function StatusBar() {
  const { status, isConnected, socketId, connect, disconnect } = useSocket({
    autoConnect: true,
    onConnect: () => console.log("Conectado"),
    onDisconnect: (reason) => console.log("Desconectado:", reason),
    onError: (error) => console.error("Error:", error),
  });

  return (
    <div>
      <span>Estado: {status}</span>
      <span>ID: {socketId}</span>

      {isConnected ? (
        <button onClick={disconnect}>Desconectar</button>
      ) : (
        <button onClick={connect}>Conectar</button>
      )}
    </div>
  );
}
```

### Opciones de `useSocket`

| Opcion | Tipo | Por defecto | Descripcion |
|---|---|---|---|
| `autoConnect` | `boolean` | `false` | Conecta al montar el componente |
| `onConnect` | `() => void` | — | Callback al establecer conexion |
| `onDisconnect` | `(reason: string) => void` | — | Callback al perder conexion |
| `onError` | `(error: Error) => void` | — | Callback en error de conexion |
| `onReconnect` | `(attempt: number) => void` | — | Callback en cada intento de reconexion |

---

## Uso: `useSocketEvent`

Suscribirse a eventos que el servidor emite. El listener se registra al montar y se limpia al desmontar automaticamente.

```tsx
import { useSocketEvent } from "@/libs/socket-io";

interface SensorReading {
  sensorId: number;
  value: number;
  timestamp: string;
}

function SensorMonitor() {
  const [reading, setReading] = useState<SensorReading | null>(null);

  // Escuchar el evento "sensor:update" del servidor
  useSocketEvent<SensorReading>({
    event: "sensor:update",
    handler: (data) => setReading(data),
    enabled: true, // opcional, true por defecto
  });

  return <div>{reading?.value}</div>;
}
```

### Opciones de `useSocketEvent`

| Opcion | Tipo | Requerido | Descripcion |
|---|---|---|---|
| `event` | `string` | Si | Nombre del evento a escuchar |
| `handler` | `(data: T) => void` | Si | Funcion ejecutada al recibir el evento |
| `enabled` | `boolean` | No | Activa o desactiva el listener |

---

## Uso: `useSocketEmit`

Emitir eventos hacia el servidor. Devuelve `emit` para envio inmediato y `emitWithAck` para esperar confirmacion del servidor.

```tsx
import { useSocketEmit } from "@/libs/socket-io";

interface ChatMessage {
  roomId: string;
  text: string;
}

function ChatInput() {
  const { emit, emitWithAck, isSending } = useSocketEmit<ChatMessage>({
    event: "chat:message",
  });

  const handleSend = () => {
    // Envio sin esperar confirmacion
    const result = emit({ roomId: "general", text: "Hola mundo" });

    if (!result.success) {
      console.error(result.error);
    }
  };

  const handleSendWithAck = async () => {
    // Envio con ACK del servidor
    const result = await emitWithAck({ roomId: "general", text: "Hola con ACK" });

    if (result.success) {
      console.log("Servidor confirmo la recepcion");
    }
  };

  return (
    <div>
      <button onClick={handleSend} disabled={isSending}>Enviar</button>
      <button onClick={handleSendWithAck} disabled={isSending}>Enviar con ACK</button>
    </div>
  );
}
```

### Retorno de `useSocketEmit`

| Propiedad | Tipo | Descripcion |
|---|---|---|
| `emit` | `(payload?) => EmitResult` | Emite el evento de forma sincrona |
| `emitWithAck` | `(payload?) => Promise<EmitResult>` | Emite y espera ACK del servidor |
| `isSending` | `boolean` | Indica si el socket esta procesando el envio |

---

## Helpers: `socketHelpers`

```tsx
import {
  getConnectionLabel,
  getConnectionColor,
  buildEventName,
  socketLogger,
} from "@/libs/socket-io";

// "Conectado" | "Conectando..." | "Desconectado" | "Error de conexion"
getConnectionLabel("connected");

// Color CSS para indicador visual
getConnectionColor("connected"); // "#22c55e"

// Construir nombres de eventos por convencion "recurso:accion"
buildEventName("sensor", "update"); // "sensor:update"

// Logger que solo imprime en desarrollo
socketLogger("sensor:update", { id: 1, value: 23.5 });
```

---

## Uso del singleton directamente

Si necesitas acceder al socket fuera de un componente React (ej. en un servicio):

```ts
import { socketClient, connectSocket, disconnectSocket } from "@/libs/socket-io";

// Conectar desde un servicio
connectSocket();

// Emitir desde un servicio
socketClient.emit("sensor:command", { sensorId: 1, action: "reset" });

// Escuchar desde un servicio
socketClient.on("sensor:ack", (data) => {
  console.log("ACK del server:", data);
});

// Desconectar
disconnectSocket();
```

---

## Estados de conexion

| Estado | Descripcion |
|---|---|
| `disconnected` | Sin conexion activa |
| `connecting` | Intentando conectar o reconectar |
| `connected` | Conexion activa y estable |
| `error` | Fallo en el ultimo intento de conexion |
