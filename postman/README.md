# Postman — Pasanaku Digital API REST

Este directorio contiene la colección oficial de **Postman** y el entorno de variables preconfigurado para pruebas manuales y automatizadas de toda la API REST de **Pasanaku Digital**.

---

## 📁 Archivos Disponibles

1. **`Pasanaku_Digital.postman_collection.json`:**
   Colección completa con todos los endpoints organizados en 5 módulos temáticos. Incluye autenticación Bearer por token a nivel de colección y scripts de prueba (`Tests`) que extraen automáticamente tokens e identificadores entre peticiones.
2. **`Pasanaku_Digital_Local.postman_environment.json`:**
   Entorno con variables para desarrollo local (`base_url: http://127.0.0.1:8000/api/v1`).

---

## 🚀 Cómo Importar en Postman

1. Abre **Postman**.
2. Haz clic en el botón **Import** (esquina superior izquierda).
3. Arrastra o selecciona ambos archivos (`.postman_collection.json` y `.postman_environment.json`).
4. En el selector de entornos (esquina superior derecha), selecciona **`Pasanaku Digital — Local (Development)`**.
5. ¡Listo! Ya puedes ejecutar las solicitudes.

---

## ⚙️ Variables Automáticas y Flujo Dinámico

La colección está configurada para que **no tengas que copiar y pegar tokens o IDs manualmente**:

| Variable | Descripción | Actualización Automática |
| :--- | :--- | :--- |
| `base_url` | URL raíz de la API (`http://127.0.0.1:8000/api/v1`) | Preconfigurada |
| `access_token` | Token JWT de autenticación | Se guarda automáticamente al hacer **Login** o **Registro** |
| `refresh_token` | Token JWT de renovación | Se guarda al hacer **Login** o **Registro** |
| `group_id` | ID del grupo de prueba | Se guarda automáticamente al **Crear Grupo** |
| `invite_code` | Código alfanumérico de invitación | Se actualiza al **Crear Grupo** o **Regenerar Código** |
| `round_id` | ID de la ronda activa | Se actualiza al **Iniciar Grupo** o **Cerrar Ronda** |
| `contribution_id` | ID de cuota individual | Se actualiza al consultar la ronda activa |
| `reminder_id` | ID de recordatorio interno | Se actualiza al consultar mis recordatorios |

---

## 🧭 Flujo Recomendado de Pruebas (Happy Path)

Sigue este orden secuencial para probar todo el ciclo de vida del Pasanaku:

```text
[01. Auth]
  ├── 01 - Registro de Usuario (Carlos - Admin)     --> Guarda access_token
  └── 02 - Registro de Usuario (Ana - Participante)

[02. Grupos]
  ├── 02 - Crear Grupo (Borrador con 2 cupos)       --> Guarda group_id e invite_code
  ├── 05 - Previsualizar Grupo por Código
  └── 06 - Unirse al Grupo (con Ana)               --> Grupo completado

[03. Turnos y Sorteo]
  ├── 02 - Sortear Turnos Automáticamente           --> Asigna turnos 1:1 aleatorios
  └── 04 - Iniciar Pasanaku                         --> Congela reglas y genera Ronda 1

[04. Rondas y Aportes]
  ├── 02 - Consultar Ronda Activa Actual            --> Guarda round_id y contribution_id
  ├── 05 - Reportar Pago de Cuota (Participante)
  ├── 06 - Validar Aporte como Pagado (Admin)
  └── 07 - Cerrar Ronda y Avanzar Turno             --> Bloqueo por deuda / Avance atómico

[05. Balance y Recordatorios]
  ├── 01 - Resumen Financiero y Lista de Deudores
  ├── 02 - Enviar Recordatorio a Deudores (Admin)
  └── 03 - Listar Mis Recordatorios Recibidos
```

---

## 🛡️ Pruebas de Reglas de Negocio Negativas

Para verificar las validaciones críticas del negocio, prueba estos casos:
1. **Aislamiento de Grupos:** Intenta consultar `GET /groups/{{group_id}}/` con un token de un usuario no perteneciente al grupo. Deberá retornar `403 Forbidden`.
2. **Inmutabilidad Post-Inicio:** Tras ejecutar `04 - Iniciar Pasanaku`, intenta ejecutar `PATCH /groups/{{group_id}}/`. El sistema rechazará el cambio porque el estado es `INICIADO`.
3. **Bloqueo por Deuda:** Intenta ejecutar `07 - Cerrar Ronda` cuando aún existe una cuota en estado `PENDIENTE`. El sistema responderá con error indicando que existen cuotas impagas.
