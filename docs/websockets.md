# Contrato de WebSockets en Tiempo Real — Pasanaku Digital

Esta guía documenta los endpoints WebSocket del backend (**Django Channels + Uvicorn ASGI + Redis**) para que el equipo de **Frontend** pueda integrarlos fácilmente en los hooks de React.

---

## 1. Endpoints Disponibles y Autenticación

Las conexiones WebSocket se autentican usando el mismo **`access_token` de SimpleJWT** que ya usa la API REST, pasado como query parameter `?token=<access_token>` (estándar en navegadores porque `new WebSocket()` no permite headers `Authorization`).

| Canal | URL en Docker (`localhost:3000`) | URL en Dev local (`localhost:5173`) | Permisos |
| :--- | :--- | :--- | :--- |
| **Sala de Grupo** | `ws://localhost:3000/ws/groups/<group_id>/?token=<JWT>` | `ws://localhost:5173/ws/groups/<group_id>/?token=<JWT>` | Solo miembros del grupo (y staff). |
| **Notificaciones Personales** | `ws://localhost:3000/ws/users/me/?token=<JWT>` | `ws://localhost:5173/ws/users/me/?token=<JWT>` | Cualquier usuario autenticado. |

> **Nota:** Tanto `frontend/nginx.conf` (Docker en puerto `3000`) como `frontend/vite.config.ts` (Vite dev en puerto `5173`) ya tienen configurado el proxy `/ws/` hacia el backend en puerto `8000`. En el frontend basta construir la URL dinámicamente a partir de `window.location`.

### Códigos de Cierre de Seguridad
- **`4001` (Unauthorized):** Token ausente, expirado o inválido.
- **`4003` (Forbidden):** Usuario autenticado, pero **no pertenece** al grupo solicitado (misma regla de aislamiento que la API REST).

---

## 2. Catálogo de Eventos Emitidos por el Backend

Todos los mensajes llegan en formato JSON con una clave `event`. Los eventos solo se emiten después de que la transacción de base de datos hace `COMMIT` (`transaction.on_commit`), garantizando consistencia ACID.

### A. Eventos en `/ws/groups/<group_id>/`

| `event` | Cuándo se dispara | Payload `data` | Acción sugerida en Frontend |
| :--- | :--- | :--- | :--- |
| `connection_established` | Al conectar exitosamente | `{ group_id, user_id }` *(en raíz)* | Confirmar conexión activa |
| `pong` | Respuesta a `{"type": "ping"}` | — | Keep-alive / heartbeat |
| `group_updated` | Admin edita config en `BORRADOR` | `{ name, quota_amount, total_members }` | Refrescar detalle del grupo |
| `member_joined` | Un socio se une con `invite_code` | `{ user_id, username, remaining_slots, is_full }` | Refrescar miembros y habilitar botón sortear/iniciar |
| `member_left` | Un socio abandona en `BORRADOR` | `{ user_id, username }` | Refrescar miembros |
| `member_removed` | Admin remueve a un socio en `BORRADOR` | `{ user_id }` | Refrescar miembros |
| `turns_updated` | Sorteo o asignación manual de turnos | `{ mode: "raffle" \| "manual", total_turns }` | Refrescar lista de turnos |
| `group_started` | Admin inicia el pasanaku | `{ status: "INICIADO", round_id, round_number: 1, beneficiary_id }` | Refrescar grupo + cargar Ronda 1 |
| `contribution_reported` | Un socio reporta pago QR | `{ contribution_id, round_id, user_id, notes }` | Refrescar tabla de aportes de la ronda |
| `contribution_validated` | Admin valida un pago (`PAGADA`) | `{ contribution_id, round_id, user_id, validated_by, status }` | Refrescar ronda actual + resumen financiero |
| `round_closed` | Admin cierra ronda y entrega pozo | `{ closed_round_id, closed_round_number, next_round_id, next_round_number, is_finished, group_status }` | Refrescar ronda actual, historial y estado del grupo |

### B. Eventos en `/ws/users/me/`

| `event` | Cuándo se dispara | Payload `data` | Acción sugerida en Frontend |
| :--- | :--- | :--- | :--- |
| `connection_established` | Al conectar exitosamente | `{ user_id }` *(en raíz)* | Confirmar canal personal activo |
| `reminder_received` | Admin envía recordatorio de deuda | `{ reminder_id, group_id, group_name, round_number, message }` | Mostrar *toast* + refrescar bandeja de recordatorios |

---

## 3. Ejemplo de Hook para el Equipo Frontend (React + TypeScript)

```ts
import { useEffect } from 'react';

export interface GroupWsMessage {
  event: string;
  group_id?: number;
  data?: Record<string, unknown>;
}

export function useGroupWebSocket(
  groupId: number | null,
  accessToken: string | null,
  onEvent: (msg: GroupWsMessage) => void
) {
  useEffect(() => {
    if (!groupId || !accessToken) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${protocol}//${window.location.host}/ws/groups/${groupId}/?token=${encodeURIComponent(accessToken)}`;
    const ws = new WebSocket(url);

    ws.onmessage = (evt) => {
      try {
        const parsed: GroupWsMessage = JSON.parse(evt.data);
        if (parsed.event !== 'connection_established' && parsed.event !== 'pong') {
          onEvent(parsed);
        }
      } catch {
        // Ignorar frames no JSON
      }
    };

    const pingInterval = window.setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30_000);

    return () => {
      window.clearInterval(pingInterval);
      ws.close();
    };
  }, [groupId, accessToken, onEvent]);
}
```

---

## 4. Cómo Levantarlo con Docker Compose

```bash
docker compose up --build -d
```

Esto levanta 4 contenedores: `pasanaku_db` (PostgreSQL), `pasanaku_redis` (Redis 7 para Channels), `pasanaku_backend` (Uvicorn ASGI en puerto `8000`) y `pasanaku_frontend` (Nginx con proxy `/api/` y `/ws/` en puerto `3000`).
