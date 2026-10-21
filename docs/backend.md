# Backend — Guía de Configuración, Ejecución y Resolución de Problemas

Guía técnica para el despliegue local, configuración y diagnóstico del backend de **Pasanaku Digital** (Django REST Framework).

---

## 1. Diagnóstico: ¿Por qué no levantaba el backend?

Al intentar iniciar el servidor con `python manage.py runserver` o ejecutar cualquier comando de gestión (`python manage.py check`, `python manage.py migrate`), el sistema fallaba inmediatamente arrojando la siguiente excepción:

```text
ModuleNotFoundError: No module named 'rest_framework_simplejwt'
```

### Causa Raíz
1. **Dependencia Faltante en `requirements.txt`:**
   En `backend/config/settings.py` se tenían registradas las aplicaciones y configuraciones de JWT:
   - `'rest_framework_simplejwt'` en `INSTALLED_APPS`.
   - `rest_framework_simplejwt.authentication.JWTAuthentication` en `REST_FRAMEWORK['DEFAULT_AUTHENTICATION_CLASSES']`.
   - Bloque de configuración `SIMPLE_JWT = { ... }`.
   - Importaciones directas en `apps/authentication/urls.py` (`from rest_framework_simplejwt.views import TokenRefreshView`).
   Sin embargo, el paquete `djangorestframework-simplejwt` **no estaba incluido** en el archivo `backend/requirements.txt`.
2. **Entorno Virtual Incompleto:**
   Al crear o reinstalar el entorno virtual siguiendo `pip install -r requirements.txt`, el paquete `djangorestframework-simplejwt` nunca era instalado, provocando el fallo en tiempo de carga (`django.setup()`).
3. **Migraciones Pendientes:**
   Al no haber levantado el entorno, la base de datos (PostgreSQL o SQLite fallback) no tenía aplicadas las migraciones de las apps `authentication` ni `groups`.
4. **Configuración de Pytest:**
   Al ejecutar `pytest`, fallaba la detección del módulo de settings de Django (`DJANGO_SETTINGS_MODULE`), requiriendo un archivo `pytest.ini`.

### Solución Aplicada
1. Se agregó `djangorestframework-simplejwt>=5.3.0` a `backend/requirements.txt`.
2. Se instaló el paquete en el entorno virtual (`pip install djangorestframework-simplejwt`).
3. Se aplicaron todas las migraciones (`python manage.py migrate`).
4. Se creó el archivo de configuración `backend/pytest.ini` para que los tests con `pytest` corran directamente sin parámetros adicionales.

---

## 2. Requisitos Previos

- **Python:** 3.12+ (recomendado Python 3.15)
- **Pip:** Actualizado a la última versión
- **Base de Datos:**
  - Desarrollo local rápido: SQLite (incluido por defecto mediante fallback automático si no hay variables de PostgreSQL configuradas).
  - Desarrollo con PostgreSQL / Producción: PostgreSQL 15+ con credenciales configuradas en variables de entorno o archivo `.env`.

---

## 3. Instalación Paso a Paso

### 3.1. Navegar al directorio del backend
```bash
cd backend
```

### 3.2. Crear y activar el entorno virtual
- **Windows (PowerShell):**
  ```powershell
  python -m venv .venv
  .\.venv\Scripts\Activate.ps1
  ```
- **Linux / macOS:**
  ```bash
  python3 -m venv .venv
  source .venv/bin/activate
  ```

### 3.3. Instalar dependencias
```bash
pip install -r requirements.txt
```

---

## 4. Configuración de Base de Datos

El archivo `backend/config/settings.py` detecta automáticamente si existen credenciales de PostgreSQL. Si no están definidas, usa **SQLite** (`backend/db.sqlite3`):

```python
if DB_NAME and DB_USER:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': DB_NAME,
            'USER': DB_USER,
            'PASSWORD': DB_PASSWORD,
            'HOST': DB_HOST,
            'PORT': DB_PORT,
        }
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }
```

---

## 5. Ejecución del Servidor

### 5.1. Aplicar migraciones
```bash
python manage.py migrate
```

### 5.2. Iniciar el servidor de desarrollo
```bash
python manage.py runserver
```
El backend estará disponible en: **`http://127.0.0.1:8000/`**

---

## 6. Catálogo Completo de Endpoints REST

### 6.1. Autenticación (`/api/v1/auth/`)
- `POST /api/v1/auth/register/` — Registro de nuevo integrante (con CI boliviano y teléfono).
- `POST /api/v1/auth/login/` — Inicio de sesión y obtención de tokens JWT (`access` y `refresh`).
- `POST /api/v1/auth/token/refresh/` — Renovación del token de acceso expirado.
- `GET /api/v1/auth/me/` — Datos del usuario autenticado.

### 6.2. Grupos y Membresías (`/api/v1/groups/`)
- `GET /api/v1/groups/` — Listar grupos donde participa el usuario autenticado.
- `POST /api/v1/groups/` — Crear grupo de pasanaku en estado `BORRADOR`.
- `GET /api/v1/groups/<id>/` — Detalle del grupo (con lista de integrantes, cupos y turnos).
- `PATCH /api/v1/groups/<id>/` — Editar configuración (solo en `BORRADOR` por el admin).
- `GET /api/v1/groups/preview/?code=XXXX` — Previsualizar grupo antes de unirse.
- `POST /api/v1/groups/join/` — Unirse al grupo mediante código de invitación.
- `POST /api/v1/groups/<id>/regenerate-code/` — Regenerar código de invitación (admin).
- `POST /api/v1/groups/<id>/leave/` — Abandonar grupo (solo en `BORRADOR`).
- `POST /api/v1/groups/<id>/remove-member/` — Expulsar integrante en borrador (admin).

### 6.3. Turnos y Sorteo (`/api/v1/groups/<id>/turns/` y `/start/`)
- `GET /api/v1/groups/<id>/turns/` — Listar orden de turnos asignados (1 a N).
- `POST /api/v1/groups/<id>/turns/manual/` — Asignar turnos manualmente (1:1 estricto).
- `POST /api/v1/groups/<id>/turns/raffle/` — Sorteo automático aleatorio de turnos.
- `POST /api/v1/groups/<id>/start/` — Iniciar pasanaku (valida cupos llenos y turnos, genera Ronda 1).

### 6.4. Rondas y Cuotas (`/api/v1/rounds/` y `/contributions/`)
- `GET /api/v1/groups/<id>/rounds/` — Historial de rondas del grupo.
- `GET /api/v1/groups/<id>/rounds/current/` — Ronda activa actual con sus cuotas.
- `GET /api/v1/rounds/<id>/` — Detalle de una ronda y sus aportes.
- `GET /api/v1/rounds/<id>/contributions/` — Listar cuotas de una ronda.
- `POST /api/v1/contributions/<id>/pay/` — Reportar pago de cuota por el participante.
- `POST /api/v1/contributions/<id>/validate/` — Validar cuota como `PAGADA` por el admin.
- `POST /api/v1/rounds/<id>/close/` — Cerrar ronda con **bloqueo por deuda**, confirmar entrega a beneficiario y avanzar turno de forma atómica.
- `GET /api/v1/users/me/contributions/` — Mis cuotas pendientes y pagadas a través de mis grupos.

### 6.5. Métricas y Recordatorios Internos
- `GET /api/v1/groups/<id>/summary/` — Balance financiero global, estado de ronda y lista de deudores.
- `POST /api/v1/groups/<id>/reminders/` — Enviar recordatorios internos a los deudores de la ronda activa.
- `GET /api/v1/users/me/reminders/` — Ver mis recordatorios recibidos.
- `POST /api/v1/reminders/<id>/read/` — Marcar recordatorio como leído.

---

## 7. Ejecución de Pruebas Automatizadas

```bash
# Con Django Test Runner:
python manage.py test

# Con Pytest:
pytest
```
