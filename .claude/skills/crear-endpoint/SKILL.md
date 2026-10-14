---
name: crear-endpoint
description: Guía paso a paso para crear un nuevo endpoint en el backend Django siguiendo el HackSoftware Styleguide (Model, Service/Selector, Serializer, View, URL). Use when se agregue una nueva funcionalidad o endpoint a la API.
---

# Skill: Crear Endpoint en Django (HackSoftware Styleguide)

Al agregar un nuevo endpoint al backend de **Pasanaku Digital**, sigue estrictamente este flujo de 5 capas:

## 1. Modelo (`models.py`)
- Define el modelo con tipos estrictos y validadores (`MinValueValidator`, etc.).
- Agrega restricciones de unicidad explícitas si aplica (`UniqueConstraint`).
- Registra métodos de propiedad para cálculos frecuentes.

## 2. Capa de Lógica de Negocio
- **Mutaciones / Escrituras (`services.py`):**
  - Todas las operaciones que crean, modifican o borran registros van en `services.py`.
  - Decora con `@transaction.atomic` cualquier operación con múltiples escrituras o transiciones de estado.
  - Lanza `ValidationError({'campo': 'mensaje'})` o `PermissionDenied('mensaje')` ante violaciones de negocio.
- **Consultas / Lecturas (`selectors.py`):**
  - Todas las consultas complejas y filtrados van en `selectors.py`.
  - Aplica aquí el aislamiento de datos (verificar que el usuario pertenezca al grupo).

## 3. Serializadores (`serializers.py`)
- `InputSerializer`: Valida estrictamente los datos de entrada recibidos en el payload (`data=request.data`).
- `OutputSerializer` o `ModelSerializer`: Formatea la respuesta enviada al cliente.

## 4. Vista API (`views.py`)
- Extiende de `APIView` o `GenericAPIView`.
- Define `permission_classes = [IsAuthenticated]`.
- Llama a `serializer.is_valid(raise_exception=True)`.
- Invoca la función correspondiente en `services.py` o `selectors.py`.
- Retorna `Response(data, status=HTTP_...)`.

## 5. Rutas (`urls.py`)
- Registra el endpoint en `urls.py` de la app con un `name` representativo.
