---
name: pasanaku-business-rules
description: Enforce the functional rules and lifecycle of Pasanaku Digital, the Bolivian rotating savings group platform.
---

# Skill: Reglas del negocio de Pasanaku Digital

## Objetivo
Aplicar las reglas funcionales definidas en el enunciado del proyecto. Estas reglas son la fuente principal de verdad para las operaciones de negocio; no sustituirlas por decisiones improvisadas.

## Contexto y alcance
Pasanaku Digital registra y controla aportes realizados fuera del sistema. La plataforma no es un banco y esta versión no realiza transferencias reales de dinero. No afirmar que un aporte fue transferido automáticamente: el sistema registra el reporte, la validación y la confirmación de entrega según las acciones del usuario autorizado.

## Grupo de pasanaku
1. Al crear un grupo, exigir como mínimo nombre, monto de cuota, moneda en bolivianos, periodicidad, fecha de inicio y cantidad de participantes; descripción opcional.
2. El monto de cuota debe ser mayor que cero.
3. Periodicidad permitida: semanal, quincenal o mensual.
4. Mientras esté en `BORRADOR`, el administrador puede modificar la configuración.
5. Una vez iniciado, no permitir cambios arbitrarios del monto, periodicidad o cantidad de turnos.
6. El creador debe quedar asociado al grupo con el rol de administrador.
7. Un usuario no puede pertenecer dos veces al mismo grupo.
8. El grupo no puede iniciarse si faltan participantes o posiciones necesarias.
9. Después de iniciado, impedir que alguien se retire libremente si eso rompe la secuencia de turnos. Definir una política explícita de salida/excepción si el equipo la necesita.

## Invitaciones y miembros
1. La invitación/código debe asociarse al grupo correcto.
2. Validar que el código exista, esté vigente y sea utilizable según la política del proyecto.
3. No permitir membresías duplicadas.
4. Evitar que la aceptación de una invitación permita entrar en un grupo distinto del asociado al código.
5. No revelar detalles privados del grupo a personas que no sean miembros.

## Turnos
1. Antes de iniciar, el administrador define el orden manualmente o usa un sorteo automático.
2. Cada participante debe aparecer exactamente una vez como beneficiario en una secuencia completa.
3. No debe existir turno sin beneficiario.
4. No puede asignarse dos veces el mismo participante dentro de una secuencia completa.
5. El sorteo debe generar un orden completo y persistirlo; no mostrar un resultado que luego no se guarda.
6. Una vez iniciado el pasanaku, proteger la secuencia de cambios arbitrarios.

## Rondas y cuotas
1. Cada período corresponde a una ronda.
2. Crear la cuota que corresponde a cada participante en esa ronda.
3. La cuota tiene estado `PENDIENTE` o `PAGADA`, según el enunciado. Si se agrega un estado intermedio como `REPORTADA`, documentar por qué y no confundirlo con una cuota validada.
4. Registrar monto, fecha y usuario relacionado con el aporte.
5. Total esperado de ronda = monto de cuota × cantidad de participantes que deben aportar.
6. Mostrar total esperado, total registrado y monto pendiente de manera coherente.
7. No marcar una cuota como `PAGADA` hasta que el administrador autorizado la valide, si el flujo de reporte y validación está implementado.
8. Si se permiten pagos parciales, definir cómo afectan el estado y los totales antes de implementarlos; no asumirlo sin acuerdo.

## Cierre y avance de ronda
1. Una ronda no puede completarse si existe al menos una cuota pendiente.
2. Cada ronda tiene un único beneficiario según el orden establecido.
3. El administrador puede confirmar que el monto reunido fue entregado al beneficiario.
4. Una ronda cerrada no admite modificaciones ordinarias en sus aportes.
5. Solo después de un cierre válido se habilita o crea la siguiente ronda.
6. Cerrar la ronda y habilitar la siguiente debe ser una operación consistente: si falla una parte, no debe quedar la ronda cerrada sin que el estado relacionado se actualice correctamente.
7. Cuando todos los participantes hayan recibido su turno y todas las rondas estén cerradas, el pasanaku cambia a `FINALIZADO`.
8. No permitir cerrar dos veces una misma ronda ni crear dos rondas siguientes por reintentos concurrentes.

## Historial y recordatorios
- Mantener historial de aportes por participante.
- Mantener historial de rondas y beneficiarios.
- Registrar fecha de pago/reporte y fecha de validación según el flujo acordado.
- Mostrar participantes con cuotas pendientes.
- Los recordatorios internos de cuotas pendientes son suficientes para el alcance básico; correo o WhatsApp son opcionales.
- No borrar o reescribir silenciosamente eventos históricos importantes.

## Ejemplo de validación de cierre
```python
def puede_cerrar_ronda(ronda):
    return not ronda.cuotas.filter(estado="PENDIENTE").exists()
```
El ejemplo solo expresa una condición básica. La implementación real debe comprobar también permisos, estado actual de la ronda, confirmación de entrega si es obligatoria y consistencia transaccional.

## Errores que deben rechazarse
- Crear un grupo con monto cero o negativo.
- Iniciar un grupo incompleto.
- Añadir dos veces al mismo usuario.
- Crear turnos duplicados o incompletos.
- Reportar un aporte con monto inválido.
- Marcar pagada una cuota sin validación cuando la validación sea obligatoria.
- Cerrar una ronda con cuotas pendientes.
- Modificar aportes ordinariamente después del cierre.
- Avanzar al siguiente turno antes del cierre válido.
- Marcar finalizado un pasanaku con rondas sin cerrar.
