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
- **Backend:** Django 5.x + Django REST Framework (Capa de Servicios y Selectores)
- **Base de Datos:** PostgreSQL
- **Testing:** Pytest / DRF APITestCase + Vitest / Playwright (Unitario, Integración y E2E)

---

## 📁 Estructura del Repositorio

```text
├── backend/                  # Proyecto Django REST Framework
│   ├── config/               # Configuración central (settings, urls, wsgi, asgi)
│   ├── manage.py
│   └── requirements.txt
├── frontend/                 # Proyecto React + Vite + TypeScript
│   ├── src/                  # Componentes, vistas, hooks y servicios
│   ├── package.json
│   └── vite.config.ts
├── skills/                   # Skills y directrices para asistentes de desarrollo IA
│   └── pasanaku-conventions/ # Guía de arquitectura y reglas del pasanaku
├── proyecto_final_taller_v_pasanaku_digital.pdf # Requerimientos oficiales
└── README.md
```

---

## 🚀 Primeros Pasos

### Backend (Django)
```bash
cd backend
python -m venv .venv
# Activar entorno virtual
# En Windows: .venv\Scripts\activate
# En Linux/macOS: source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

### Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev
```
