---
name: django-backend-architecture
description: Define and maintain the architecture and code organization of the Django backend for Pasanaku Digital.
---

# Skill: Arquitectura del backend Django

## Objetivo
Construir un backend Django ordenado, entendible, fácil de probar y consistente con los requisitos de Pasanaku Digital. La IA debe seguir la arquitectura existente del repositorio y no reestructurarla sin una razón concreta.

## Reglas obligatorias
1. Antes de modificar código, inspeccionar la estructura existente, `settings.py`, `urls.py`, dependencias y modelos. No asumir que el proyecto empieza desde cero.
2. Usar Django y, si el proyecto necesita una API REST separada del frontend, Django REST Framework (DRF).
3. Separar responsabilidades:
   - `models.py`: entidades, relaciones y restricciones persistentes.
   - `serializers.py`: validación y representación de datos de entrada/salida de la API.
   - `views.py` o `views/`: coordinación HTTP, permisos y respuesta.
   - `services.py` o `services/`: operaciones de negocio con varios pasos o reglas críticas.
   - `permissions.py`: permisos reutilizables.
   - `urls.py`: rutas.
   - `tests.py` o `tests/`: pruebas.
4. No crear capas, archivos o abstracciones innecesarias para operaciones triviales. La arquitectura debe ser clara para un estudiante que tendrá que explicarla.
5. Si el proyecto ya usa una convención distinta y coherente, mantenerla en vez de imponer esta estructura.
6. Mantener los nombres y convenciones del código existentes. Usar nombres descriptivos en español o inglés de forma consistente; no mezclar estilos arbitrariamente.
7. No duplicar reglas de negocio en múltiples vistas. Centralizar las reglas críticas en funciones o servicios reutilizables y validar también en el servidor.
8. Mantener secretos fuera del código: usar variables de entorno para claves, contraseñas y configuración sensible. Incluir un `.env.example` sin secretos reales si corresponde.
9. No registrar tokens, contraseñas, datos de autenticación ni información sensible en logs.
10. No instalar dependencias sin justificar su necesidad. Actualizar el archivo de dependencias del proyecto cuando se agregue una librería.
11. No cambiar contratos de API, nombres de campos o rutas sin revisar los usos del frontend y documentar el cambio.
12. Ante una modificación, entregar una solución completa y coherente con imports, rutas, pruebas y migraciones necesarias; no dejar pseudocódigo presentado como código funcional.

## Organización sugerida
```text
backend/
  config/
    settings.py
    urls.py
  apps/
    usuarios/
      models.py
      serializers.py
      views.py
      urls.py
      tests/
    pasanakus/
      models.py
      serializers.py
      views.py
      services.py
      permissions.py
      urls.py
      tests/
    aportes/
      models.py
      serializers.py
      views.py
      services.py
      urls.py
      tests/
```
Esta estructura es orientativa; adaptarla al repositorio real.

## Flujo recomendado para implementar una función
1. Confirmar requisito y reglas.
2. Identificar modelos y permisos afectados.
3. Implementar validación del servidor.
4. Implementar operación de negocio.
5. Exponer el endpoint y definir su respuesta.
6. Añadir pruebas positivas, negativas y de permisos.
7. Ejecutar pruebas y migraciones necesarias.
8. Resumir archivos cambiados y cómo verificar el resultado.

## Ejemplo de separación
```python
# services.py
from django.db import transaction

@transaction.atomic
def registrar_aporte(*, cuota, monto, usuario):
    # La regla completa se implementa aquí o en validadores compartidos.
    # No confiar únicamente en que el frontend envíe datos válidos.
    ...
```

La vista debe encargarse de HTTP y permisos, y delegar la operación de negocio al servicio cuando la operación sea crítica o involucre varios pasos.

## Buenas prácticas
- Mantener funciones pequeñas y con nombres descriptivos.
- Evitar consultas repetidas dentro de bucles; evaluar `select_related()` y `prefetch_related()` cuando haga falta.
- Usar migraciones de Django para cambios del esquema.
- No editar manualmente migraciones ya aplicadas en entornos compartidos sin coordinarlo.
- Mantener respuestas de error consistentes.
- Preferir el ORM de Django a SQL construido mediante concatenación.
- No afirmar que una funcionalidad está terminada sin ejecutar o describir las pruebas pertinentes.

## Evitar
- Toda la lógica en una única vista.
- `except Exception: pass`.
- Contraseñas guardadas en texto plano.
- Reglas de autorización únicamente en JavaScript.
- Cambiar muchas partes del proyecto para resolver un error localizado.
