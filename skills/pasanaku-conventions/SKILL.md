---
name: pasanaku-conventions
description: Convenciones de arquitectura (MVVM en React + Service Layer en Django), estándares de código y reglas críticas de negocio para el proyecto Pasanaku Digital. Use when desarrollando o refactorizando código del pasanaku.
---

# Convenciones y Buenas Prácticas · Pasanaku Digital

## 1. Arquitectura General (MVVM)

### Frontend (React + Vite + TypeScript)
- **Model:** Tipos e interfaces en `src/models/` o `src/types/`. Clientes HTTP en `src/services/api/`.
- **ViewModel:** Custom hooks (`src/hooks/` o `src/features/<feature>/hooks/`). Toda la lógica de estado, validación de UI y mutaciones reside en custom hooks.
- **View:** Componentes funcionales en `src/components/` o `src/features/<feature>/components/`. Deben ser puros, consumiendo el ViewModel sin llamadas HTTP directas.

### Backend (Django REST Framework + PostgreSQL)
- **Model:** Modelos de Django ORM con validaciones a nivel de modelo y restricciones de unicidad (`unique_together` o `UniqueConstraint`).
- **Services (Capa de Negocio / Mutaciones):** Siguiendo el *HackSoftware Django Styleguide*, toda operación de escritura/cambio de estado reside en `services.py` decorada con `@transaction.atomic`.
- **Selectors (Capa de Lectura / Queries):** Consultas complejas residen en `selectors.py`.
- **Views & Serializers:** Las vistas (`APIView` o `ViewSet`) solo validan la entrada vía Serializers y delegan la ejecución al servicio correspondiente.

---

## 2. Reglas de Negocio Críticas (Enforcement Obligatorio)

1. **Inmutabilidad post-inicio:** Una vez que el grupo pasa a estado `INICIADO`, ningún endpoint debe permitir modificar monto, periodicidad ni cupo de turnos.
2. **Participantes únicos:** Un usuario no puede estar dos veces en el mismo grupo.
3. **Turnos únicos:** Cada miembro debe tener exactamente un turno como beneficiario en la ronda completa.
4. **Bloqueo por deuda:** Prohibido cerrar una ronda o avanzar al siguiente turno si hay cuotas con estado `PENDIENTE`.
5. **Transaccionalidad atómica:** El cierre de ronda, la confirmación de entrega al beneficiario y la apertura de la siguiente ronda deben ocurrir dentro de una misma transacción.

---

## 3. Estándares de Testing

- **Unitarios:** Pruebas de reglas puras de cálculo de montos esperados, generador de turnos, y validaciones de estado.
- **Integración:** Pruebas contra la base de datos (PostgreSQL/SQLite) verificando persistencia, endpoints y permisos (`IsAuthenticated`, solo admin puede validar/cerrar).
- **E2E:** 7 escenarios obligatorios (E2E 01 a E2E 07) cubriendo la interfaz completa.
