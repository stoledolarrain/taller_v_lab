---
name: django-transactions-integrity
description: Keep multi-step business operations consistent under errors and concurrent requests.
---

# Skill: Transacciones e integridad

## Objetivo
Evitar estados parciales en operaciones críticas, especialmente iniciar un pasanaku, generar turnos/cuotas, validar aportes y cerrar una ronda.

## Reglas obligatorias
1. Identificar operaciones que modifican varios registros relacionados.
2. Usar `transaction.atomic()` cuando varios cambios deban confirmarse o revertirse juntos.
3. No asumir que `atomic()` por sí solo evita todos los problemas de concurrencia.
4. Para operaciones que puedan ejecutarse simultáneamente, evaluar `select_for_update()` y restricciones de base de datos.
5. Mantener las validaciones de estado dentro de la operación transaccional cuando el estado pueda cambiar entre la comprobación y la escritura.
6. Protegerse contra dobles clics, reintentos HTTP y solicitudes duplicadas. Usar estados, restricciones de unicidad o claves de idempotencia cuando la arquitectura lo justifique.
7. No marcar una ronda como cerrada antes de confirmar todas las condiciones necesarias.
8. La creación/habilitación de la ronda siguiente debe formar parte de la misma operación consistente que el cierre, cuando el diseño lo requiera.
9. Si la operación falla, devolver un error claro y asegurar que los cambios de la transacción se reviertan.
10. No enviar correos ni ejecutar efectos externos irreversibles dentro de una transacción antes de confirmar la base de datos. Si se necesitan efectos externos, evaluar `transaction.on_commit()`.
11. Confirmar las capacidades del motor de base de datos utilizado; el comportamiento de bloqueos puede variar por motor.
12. Añadir pruebas para fallos y solicitudes repetidas.

## Ejemplo conceptual de cierre
```python
from django.db import transaction
from django.core.exceptions import ValidationError

@transaction.atomic
def cerrar_ronda(ronda_id, administrador):
    # Obtener y bloquear la ronda cuando el motor lo soporte.
    # Volver a validar permiso, estado y cuotas dentro de la transacción.
    # Si hay cuotas pendientes, lanzar ValidationError.
    # Confirmar entrega al beneficiario según el flujo.
    # Cerrar la ronda y habilitar/crear la siguiente.
    # Las consultas y nombres reales dependen de los modelos.
    ...
```
No copiar este ejemplo como implementación completa: completar las consultas y reglas usando los modelos reales del proyecto.

## Casos que deben manejarse
- Dos peticiones intentan cerrar la misma ronda a la vez.
- El administrador hace doble clic en “Cerrar”.
- Falla la creación de la siguiente ronda.
- Se intenta validar dos veces el mismo aporte.
- Dos peticiones intentan unir al mismo usuario al mismo grupo.
- Dos procesos intentan generar turnos para el mismo pasanaku.
- La base de datos rechaza una restricción de unicidad.

## Buenas prácticas
- Usar restricciones únicas como última barrera de integridad.
- Capturar excepciones de integridad en el límite apropiado y convertirlas en respuestas comprensibles.
- Mantener transacciones lo más cortas posible.
- Evitar llamadas lentas a servicios externos dentro de transacciones.
- Probar transacciones con herramientas y clases de prueba adecuadas; en Django, algunos escenarios de bloqueo requieren `TransactionTestCase` y un motor que soporte esos bloqueos.
- No prometer bloqueo/concurrencia correcta sin probarlo en el motor de base de datos real.
