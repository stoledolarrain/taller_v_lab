# Taller de Actualización V

Este repositorio contiene el código y la documentación de la materia desarrollado para la asignatura de Taller de Actualización V.

## Información Académica

* **Asignatura:** Taller de Actualización V
* **Docente:** Ing. Gary Franco
* **Carrera:** Ingeniería en Sistemas

## Equipo de Desarrollo

* Daniel Morales
* Adrian Vaca
* Natalia Vargas
* Samir Toledo

# Pasanaku Digital 🪙

Plataforma web para organizar, controlar y dar trazabilidad al ahorro grupal rotativo (**pasanaku**) en Bolivia. Proyecto final para la materia **Taller de Actualización V**.

---

## 🛠 Stack Tecnológico

- **Frontend:** React 19 + Vite + TypeScript (Arquitectura MVVM con Custom Hooks)
- **Backend:** Django 5.x + Django REST Framework + SimpleJWT (Capa de Servicios y Selectores)
- **Base de Datos:** PostgreSQL (con fallback automático a SQLite para desarrollo local)
- **Testing:** Pytest / DRF APITestCase + Vitest / Playwright (Unitario, Integración y E2E)

---

## 📁 Estructura del Repositorio

```text
├── backend/                  # Proyecto Django REST Framework
│   ├── apps/                 # Apps modulares (authentication, groups)
│   ├── config/               # Configuración central (settings, urls, wsgi, asgi)
│   ├── manage.py
│   ├── pytest.ini            # Configuración de pruebas para Pytest
│   └── requirements.txt      # Dependencias del backend (incluye simplejwt)
├── docs/                     # Documentación técnica y arquitectura
│   ├── arquitectura.md       # Reglas de negocio y modelo del pasanaku
│   └── backend.md            # Guía detallada del backend, resolución de problemas y tests
├── frontend/                 # Proyecto React + Vite + TypeScript
│   ├── src/                  # Componentes, vistas, hooks y servicios
│   ├── package.json
│   └── vite.config.ts
├── postman/                  # Colección oficial de Postman y variables de entorno
│   ├── Pasanaku_Digital.postman_collection.json
│   ├── Pasanaku_Digital_Local.postman_environment.json
│   └── README.md
├── proyecto_final_taller_v_pasanaku_digital.pdf # Requerimientos oficiales
└── README.md
```

---

## 🚀 Despliegue Rápido con Docker (Recomendado)

Puedes levantar la base de datos PostgreSQL, el backend Django y el frontend React con un solo comando:

```bash
docker compose up --build
```

- **Frontend:** [http://localhost:3000](http://localhost:3000)
- **API REST Backend:** [http://localhost:8000/api/v1/](http://localhost:8000/api/v1/)
- **Panel de Administración:** [http://localhost:8000/admin/](http://localhost:8000/admin/)

Consulta la [Guía completa de Docker](docs/docker.md) para más detalles, comandos de administración y pruebas dentro de contenedores.

---

## 💻 Desarrollo Local (Sin Docker)

### Backend (Django)
```bash
cd backend
python -m venv .venv

# Activar entorno virtual
# En Windows (PowerShell):
.\.venv\Scripts\Activate.ps1
# En Linux/macOS:
source .venv/bin/activate

# Instalar dependencias
pip install -r requirements.txt

# Aplicar migraciones iniciales a la base de datos
python manage.py migrate

# Iniciar servidor de desarrollo (http://127.0.0.1:8000/)
python manage.py runserver
```

> **Nota / Solución de problemas:** Para detalles de configuración de base de datos (PostgreSQL vs SQLite) o diagnóstico de errores de arranque (como dependencias JWT faltantes), consulta la [Guía del Backend](docs/backend.md).

#### Ejecutar pruebas del Backend
```bash
# Con runner nativo de Django:
python manage.py test

# O con Pytest:
pytest
```

### Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev
```
El frontend se levantará en: **`http://localhost:5173/`**

### Pruebas de API con Postman
En la carpeta [`postman/`](postman/README.md) se encuentra la colección oficial `Pasanaku_Digital.postman_collection.json` y el archivo de entorno `Pasanaku_Digital_Local.postman_environment.json` listos para importar y probar el ciclo completo de la API. Consulta la [Guía de Postman](postman/README.md) para detalles del flujo de pruebas.
