# Pasanaku Digital — Contexto General del Proyecto

Plataforma web para organizar, controlar y dar trazabilidad al ahorro grupal rotativo (**pasanaku**) en Bolivia. Proyecto final de la materia **Taller de Actualización V**.

## 🛠 Stack Tecnológico General
- **Backend:** Python 3.15 + Django 5.x + Django REST Framework + SimpleJWT (`djangorestframework-simplejwt`).
- **Frontend:** React 19 + TypeScript + Vite.
- **Base de Datos:** PostgreSQL (con fallback local a SQLite en desarrollo).
- **Testing:** Pytest / Django TestCase (Backend) + Vitest / Playwright (Frontend/E2E).

---

## 🏛 Arquitectura General
El proyecto se organiza como un monorepo desacoplado:
- `/backend`: API REST construida bajo el patrón **Service Layer** (*HackSoftware Django Styleguide*).
- `/frontend`: SPA construida bajo el patrón **MVVM** (Model: types/api, ViewModel: hooks/context, View: componentes).
- `/.claude`: Configuración, skills, agentes y comandos compartidos con el equipo.
- `/docs`: Documentación técnica y reglas del negocio (ver `docs/backend.md` para detalles del backend).

---

## 🌿 Flujo de Trabajo con Git y Autorizaciones (Reglas Obligatorias)
1. **Autorización Manual Obligatoria:** No se pueden hacer directamente commits ni pushes luego de terminar un nuevo feature o cambio al código; **se requiere autorización manual previa** del usuario, siguiendo las mejores prácticas de trabajo con IA y Git.
2. **Uso Exclusivo de Ramas (Branches):** Cada nueva feature, refactorización, test o cambio **obligatoriamente debe ser realizado en una nueva rama** temática (`feat/...`, `test/...`, `fix/...`).
3. **Merge a `main` vía Pull Request:** Queda terminantemente prohibido commitear o pushear directamente a `main`. Todo cambio debe pasar por un Pull Request (PR) y ser aprobado con un merge commit a la rama `main` tras validar los chequeos automáticos de CI.

---

## ⚖️ Reglas de Negocio Críticas del Pasanaku
Cualquier código nuevo o refactorización DEBE respetar obligatoriamente estas invariantes del negocio:
1. **Inmutabilidad Post-Inicio:** En estado `BORRADOR` se puede modificar monto, fecha, periodicidad y cupos. Una vez en `INICIADO`, **está estrictamente prohibido alterar arbitrariamente la configuración o turnos**.
2. **Participantes Únicos:** Un usuario no puede pertenecer dos veces al mismo grupo (`unique_user_in_group`).
3. **Turnos Únicos:** Cada integrante debe aparecer exactamente una vez como beneficiario dentro de la ronda completa.
4. **Bloqueo por Deuda:** Una ronda no puede marcarse como completada ni avanzar al siguiente turno mientras existan aportes en estado `PENDIENTE`.
5. **Transaccionalidad Atómica:** El cierre de ronda, la entrega del fondo al beneficiario y la apertura de la siguiente ronda deben ejecutarse de forma atómica (`@transaction.atomic`).
6. **Aislamiento de Grupos:** Usuarios ajenos a un grupo no pueden consultar su información privada (`403 Forbidden`).

---

## 💻 Comandos Globales de Utilidad

### Backend (Django)
```bash
cd backend
.\.venv\Scripts\Activate.ps1        # Windows
# source .venv/bin/activate         # Linux/macOS
pip install -r requirements.txt     # Instalar dependencias (incluye simplejwt)
python manage.py migrate            # Aplicar migraciones
python manage.py runserver          # Servidor en http://127.0.0.1:8000/
python manage.py test               # Correr suite de pruebas Django
pytest                              # Correr suite con Pytest (vía pytest.ini)
```

### Frontend (React + Vite)
```bash
cd frontend
npm run dev                         # Servidor en http://localhost:5173/
npm run build                       # Compilación TypeScript y empaquetado de producción
```
