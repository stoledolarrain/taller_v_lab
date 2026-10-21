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

Las dependencias principales son:
- `django>=5.1,<6.0`: Framework web principal.
- `djangorestframework>=3.15.0`: Toolkit para construir la API REST.
- `djangorestframework-simplejwt>=5.3.0`: Autenticación basada en JSON Web Tokens (JWT).
- `django-cors-headers>=4.4.0`: Manejo de CORS para comunicación con el frontend Vite/React.
- `psycopg2-binary>=2.9.9`: Driver para PostgreSQL.
- `python-dotenv>=1.0.1`: Carga de variables de entorno desde `.env`.
- `pytest` y `pytest-django`: Framework y plugin para pruebas automatizadas.

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

Para usar PostgreSQL en desarrollo local, crea un archivo `.env` dentro de `backend/` con:
```env
DB_NAME=pasanaku_db
DB_USER=postgres
DB_PASSWORD=tu_password
DB_HOST=localhost
DB_PORT=5432
DJANGO_DEBUG=True
DJANGO_SECRET_KEY=clave-secreta-desarrollo
```

---

## 5. Ejecución del Servidor

### 5.1. Aplicar migraciones
```bash
python manage.py migrate
```

### 5.2. Crear superusuario (opcional para acceder a `/admin/`)
```bash
python manage.py createsuperuser
```

### 5.3. Iniciar el servidor de desarrollo
```bash
python manage.py runserver
```
El backend estará disponible en: **`http://127.0.0.1:8000/`**

Endpoints principales expuestos:
- **Autenticación:**
  - `POST /api/v1/auth/register/` — Registro de nuevo usuario (requiere `ci`, `phone_number`, `email`, `password`).
  - `POST /api/v1/auth/login/` — Inicio de sesión y obtención de tokens JWT (`access` y `refresh`).
  - `POST /api/v1/auth/token/refresh/` — Renovación del token de acceso expirado.
  - `GET /api/v1/auth/me/` — Datos del usuario autenticado (requiere header `Authorization: Bearer <token>`).
- **Grupos:**
  - `GET / POST /api/v1/groups/` — Listar y crear grupos de pasanaku.
  - `GET /api/v1/groups/<id>/` — Detalle del grupo (con control de acceso a miembros).
  - `POST /api/v1/groups/join/` — Unirse mediante código de invitación.
- **Administración:**
  - `http://127.0.0.1:8000/admin/` — Panel de administración de Django.

---

## 6. Ejecución de Pruebas Automatizadas

El proyecto soporta tanto el runner nativo de Django como `pytest`:

### Con Django Test Runner:
```bash
python manage.py test
```

### Con Pytest:
Gracias al archivo `backend/pytest.ini`:
```bash
pytest
```
Ambos métodos deben reportar todas las suites en verde (16 tests pasando entre modelos, servicios y endpoints de autenticación y grupos).
