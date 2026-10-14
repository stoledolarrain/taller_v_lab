# Backend — Contexto Específico (Django REST Framework)

Este subdirectorio contiene la API REST y la lógica de negocio central de **Pasanaku Digital**.

## 🛠 Stack y Herramientas
- **Lenguaje:** Python 3.15
- **Framework:** Django 6.x + Django REST Framework
- **Autenticación:** JSON Web Tokens (`djangorestframework-simplejwt`)
- **Base de Datos:** PostgreSQL (con SQLite como fallback de desarrollo)
- **Testing:** Django TestCase / Pytest

---

## 🏛 Arquitectura: Service Layer Pattern (HackSoftware)
Cada app dentro de `backend/apps/` debe estructurarse estrictamente así:

```text
apps/<nombre_app>/
├── models.py        # Definición de tablas, campos y constraints de BD
├── services.py      # Mutaciones, lógica de negocio y transacciones (@transaction.atomic)
├── selectors.py     # Lecturas, queries complejas y reglas de aislamiento de datos
├── serializers.py   # Serializadores de entrada (InputSerializer) y salida
├── views.py         # Vistas APIView delgadas (solo coordinan serializer + servicio)
├── urls.py          # Enrutamiento de la app
└── tests/           # Pruebas unitarias y de integración
```

---

## 📋 Apps Actuales del Backend
1. **`apps.authentication`:**
   - Modelo de usuario extendido (`User` con `email` único, `ci` boliviano y `phone_number`).
   - Endpoints: `/api/v1/auth/register/`, `/api/v1/auth/login/`, `/api/v1/auth/me/`, `/api/v1/auth/token/refresh/`.
2. **`apps.groups`:**
   - Modelos `PasanakuGroup` y `GroupMembership`.
   - Control de inmutabilidad (solo editable en `BORRADOR`).
   - Códigos de invitación únicos y no duplicidad de integrantes.
   - Endpoints: `/api/v1/groups/`, `/api/v1/groups/join/`, `/api/v1/groups/<id>/`, `/api/v1/groups/<id>/regenerate-code/`, `/api/v1/groups/<id>/leave/`.

---

## 🧪 Pruebas
Para ejecutar las pruebas del backend:
```bash
python manage.py test apps.authentication
python manage.py test apps.groups
# O todas las pruebas:
python manage.py test
```
