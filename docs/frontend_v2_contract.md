# Contrato Backend v2 para el Equipo Frontend — Pasanaku Digital

Resumen de todos los cambios y endpoints nuevos listos en `backend/` (WebSockets, Paginación, Reputación, Pasanakus Públicos, Solicitudes, QR de Ingreso y QR de Pago en vivo).

---

## 1. Paginación de Grupos
- `GET /api/v1/groups/?page=1&page_size=6` (propios)
- `GET /api/v1/groups/public/?page=1&page_size=6&min_reputation=ALTA` (públicos disponibles)
- **Respuesta estándar DRF:**
  ```json
  { "count": 12, "next": "...?page=2", "previous": null, "results": [ ... ] }
  ```
- **Acción en Frontend:** leer `.results` y usar `count` / `next` / `previous` para los controles de paginación.

---

## 2. Reputación / Trust Factor (`User.reputation`)
- Valores: `"BAJA" | "MEDIA" | "ALTA"` (default `"MEDIA"`, **solo lectura**).
- Ya viene incluido dentro de `user.reputation` en `/auth/register/`, `/auth/login/`, `/auth/me/` y en cada miembro/turno/aporte del grupo.

---

## 3. Pasanakus Públicos, Filtro por Reputación y Solicitudes
- Al crear/editar grupo (`POST /api/v1/groups/` o `PATCH /api/v1/groups/<id>/`):
  - Campos opcionales nuevos: `is_public: boolean` (default `false`) y `min_reputation: "BAJA" | "MEDIA" | "ALTA"`.
  - Si el creador tiene reputación `ALTA` y no manda `min_reputation`, el backend asigna `ALTA` automáticamente.
- **Unirse a grupo público o por código:**
  - `POST /api/v1/groups/<id>/join-public/` (body opcional `{ "message": "..." }`)
  - `POST /api/v1/groups/join/` (body `{ "invite_code": "...", "message": "..." }`)
  - **Respuesta `200 OK`:** reputación suficiente → entró directo (`{ message, group }`).
  - **Respuesta `202 Accepted`:** reputación insuficiente → se creó solicitud pendiente (`{ message, status: "PENDING_APPROVAL", join_request }`) + evento WebSocket `join_request_created` al grupo.
- **Gestión del Admin:**
  - `GET /api/v1/groups/<id>/join-requests/`
  - `POST /api/v1/groups/join-requests/<request_id>/approve/` → agrega al socio + WS `member_joined` (grupo) y `join_request_reviewed` (usuario).
  - `POST /api/v1/groups/join-requests/<request_id>/reject/` → rechaza + WS `join_request_reviewed` (usuario).

---

## 4. Unirse al Grupo Escaneando Código QR (misma red LAN)
- En `GET /api/v1/groups/<id>/` (solo miembros/admin) viene `group.qr_token`.
- El frontend dibuja un QR con la URL de red local: `http://<IP_LOCAL>:3000/#/unirse-qr/<qr_token>`.
- Al abrir esa ruta desde el celular (con usuario logueado), el frontend llama a:
  - **`POST /api/v1/groups/join-qr/`** con `{ "qr_token": "<qr_token>" }`
  - **Omite reputación y aprobación previa**, entra directo (`200 OK`) y dispara WebSocket `member_joined` a la laptop del Admin.

---

## 5. Selector Efectivo / QR y Simulación de Pago QR en Vivo
- En `Contribution`, ahora existen `payment_method` (`"EFECTIVO" | "QR"`) y `qr_reference`.
- **Si el usuario elige `EFECTIVO`:**
  - `POST /api/v1/contributions/<id>/pay/` con `{ "payment_method": "EFECTIVO", "notes": "..." }` (sigue esperando validación manual del Admin).
- **Si el usuario elige `QR` (flujo en vivo desde celular):**
  1. En la laptop (autenticado): **`POST /api/v1/contributions/<id>/qr/generate/`** → devuelve `{ qr_reference, amount, currency, group_name, round_number, payer_name, status }`.
  2. La laptop dibuja un QR apuntando a: `http://<IP_LOCAL>:3000/#/pagar-qr/<qr_reference>`.
  3. El celular escanea el QR (**sin necesitar login JWT**):
     - Pantalla consulta **`GET /api/v1/payments/qr/<qr_reference>/`** (`AllowAny`) y muestra monto + grupo + botón **"Confirmar Pago"**.
     - Al presionar el botón llama a **`POST /api/v1/payments/qr/<qr_reference>/confirm/`** (`AllowAny`).
  4. El backend marca la cuota como **`PAGADA`** y dispara **`contribution_validated`** por WebSocket → la laptop del socio y del Admin se actualizan al instante sin recargar.
