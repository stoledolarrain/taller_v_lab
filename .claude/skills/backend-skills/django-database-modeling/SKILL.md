---
name: django-database-modeling
description: Design Django ORM models and relational constraints for the Pasanaku Digital domain.
---

# Skill: Modelado de datos y ORM

## Objetivo
Representar el dominio de Pasanaku Digital con relaciones claras, restricciones de integridad y migraciones reproducibles.

## Entidades mínimas del dominio
Adaptar los nombres al código real:
- Usuario.
- Pasanaku o GrupoPasanaku.
- Membresía/Participante, con rol dentro del grupo.
- Invitación o código de invitación.
- Turno, con posición y beneficiario.
- Ronda, asociada al pasanaku y a un período.
- Cuota, que identifica qué participante debe aportar en una ronda.
- Aporte o registro de pago, con monto, fecha, estado y quién reportó/validó.
- Historial o auditoría de eventos importantes, si el diseño lo requiere.

No crear modelos duplicados si ya existe una entidad equivalente.

## Reglas de integridad
1. Usar claves foráneas y relaciones explícitas.
2. Impedir que el mismo usuario pertenezca dos veces al mismo pasanaku mediante una restricción de unicidad en base de datos, no solo validación de formulario.
3. Impedir posiciones de turno duplicadas dentro del mismo pasanaku.
4. Garantizar un único beneficiario por turno/ronda según el modelo elegido.
5. Evitar cuotas duplicadas para la misma combinación de ronda y participante.
6. Usar `DecimalField` para dinero, nunca `float` para cálculos monetarios.
7. Validar que el monto sea mayor que cero en el servidor y, cuando sea apropiado, con validadores o restricciones de base de datos.
8. Usar elecciones/estados definidos y documentados, por ejemplo `BORRADOR`, `ACTIVO`, `FINALIZADO`; cuotas `PENDIENTE`, `PAGADA`. Definir transiciones válidas.
9. Guardar las fechas con tipos adecuados y configurar correctamente la zona horaria del proyecto.
10. Definir `on_delete` conscientemente. No borrar en cascada historiales de pagos sin evaluar las consecuencias.
11. Usar `PROTECT` o restricciones cuando borrar una entidad pueda romper un historial importante.
12. Usar migraciones para todos los cambios del esquema.

## Modelo conceptual orientativo
```python
from django.conf import settings
from django.db import models

class Membresia(models.Model):
    usuario = models.ForeignKey(settings.AUTH_USER_MODEL,
                                on_delete=models.PROTECT)
    pasanaku = models.ForeignKey("Pasanaku",
                                 on_delete=models.PROTECT)
    rol = models.CharField(max_length=20)
    fecha_union = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["usuario", "pasanaku"],
                name="uq_usuario_pasanaku",
            )
        ]
```
Es un fragmento ilustrativo. Adaptar nombres, reglas de borrado y campos al diseño real.

## Dinero y cálculos
- `monto_cuota`: DecimalField con precisión apropiada.
- Total esperado de una ronda = monto de cuota × número de participantes activos que corresponden a esa ronda.
- Usar `Decimal` para cálculos.
- Definir si el monto del aporte debe coincidir exactamente con la cuota o si se permiten pagos parciales. No inventar esa regla: seguir el requisito acordado.
- Registrar fechas de reporte y validación cuando corresponda.

## Consultas y rendimiento
- Usar `select_related()` para relaciones ForeignKey/OneToOne cuando se necesiten en una consulta.
- Usar `prefetch_related()` para relaciones inversas y ManyToMany.
- Evitar consultar la base de datos repetidamente dentro de bucles.
- Añadir índices solo cuando exista una necesidad razonable de consulta; no añadirlos indiscriminadamente.

## Migraciones
- Después de modificar modelos, crear y revisar migraciones.
- No borrar datos de producción para resolver una migración.
- No editar una migración ya compartida/aplicada sin coordinar y comprender el efecto.
- Probar migraciones en la base de datos de desarrollo.
- No asumir qué motor usa el proyecto: confirmar configuración. El requisito pide una base de datos persistente, pero el motor concreto debe decidirse por el equipo.

## Checklist
- [ ] Relaciones correctas.
- [ ] Unicidad y restricciones críticas en la base de datos.
- [ ] Dinero representado con DecimalField.
- [ ] Estados y transiciones documentados.
- [ ] Migraciones creadas y probadas.
- [ ] Pruebas de duplicados e integridad.
