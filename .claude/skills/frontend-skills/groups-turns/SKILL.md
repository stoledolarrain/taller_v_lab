---
name: groups-turns
description: Implementa la experiencia frontend para crear y consultar grupos de Pasanaku, gestionar participantes, invitaciones y turnos. Usar al trabajar en flujos de grupos, membresías o asignación de beneficiarios.
---

# Grupos, participantes y turnos

## Objetivo
Implementar las pantallas y la lógica de presentación para administrar un pasanaku, siguiendo los requisitos funcionales del proyecto y la arquitectura MVVM.

## Funcionalidades contempladas
- Crear un grupo con nombre, descripción opcional, monto de cuota, moneda en bolivianos, periodicidad, fecha de inicio y cantidad de participantes.
- Consultar los datos y el estado del grupo.
- Generar o mostrar invitaciones/códigos y permitir al usuario introducirlos para unirse.
- Mostrar participantes y plazas disponibles cuando esos datos estén disponibles.
- Definir turnos manualmente o mostrar el resultado del sorteo automático ofrecido por la aplicación.
- Consultar el orden de beneficiarios y el turno actual.

## Reglas de interfaz derivadas de los requisitos

1. El formulario de configuración debe permitir edición únicamente cuando el grupo esté en `BORRADOR`, de acuerdo con el estado recibido.
2. Para un grupo iniciado, mostrar la configuración como solo lectura y no ofrecer controles para modificar monto, periodicidad o cantidad de turnos.
3. No permitir desde la interfaz que un mismo usuario aparezca dos veces en la lista local de participantes.
4. Mostrar claramente plazas ocupadas y pendientes, si los datos están disponibles.
5. La acción de iniciar debe presentar una confirmación/resumen y reflejar los requisitos de participantes y turnos que el sistema indique.
6. No mostrar un turno como válido si no tiene beneficiario confirmado.
7. La lista de turnos debe permitir comprobar visualmente que cada participante aparece exactamente una vez en la ronda completa.
8. Si se ofrece sorteo, mostrar el orden devuelto por la operación real; no generar un resultado visual ficticio.
9. Si una acción es rechazada, mostrar un mensaje útil y conservar la información del formulario cuando sea seguro hacerlo.
10. Las validaciones del frontend mejoran la experiencia, pero no sustituyen las reglas de autoridad del sistema.

## Montos y periodicidad
- Mostrar la moneda como bolivianos (`Bs`) de manera consistente con los datos recibidos.
- La periodicidad contemplada en el documento es semanal, quincenal o mensual.
- Validar en la interfaz que el monto sea mayor que cero y que las fechas tengan un formato válido.
- No recalcular ni alterar silenciosamente los valores confirmados por el sistema.
- Presentar claramente el número de participantes y el total esperado cuando los datos necesarios estén disponibles.

## Arquitectura

- Modelos/tipos: estructuras de grupo, participante, invitación y turno en `src/models/` o `src/types/`.
- ViewModels: hooks en `src/features/<feature>/hooks/` o `src/hooks/`.
- Views: componentes en `src/features/<feature>/components/` o `src/components/`.
- Acceso a datos: servicios existentes en `src/services/api/`.
- No realizar llamadas HTTP desde los componentes visuales.

## Procedimiento

1. Revisar tipos, servicios, hooks y componentes existentes relacionados con grupos.
2. Confirmar los estados y formatos reales que devuelve la API.
3. Identificar los permisos y acciones visibles para participante y administrador del grupo.
4. Implementar el flujo con estados de carga, error, vacío y éxito.
5. Evitar cambios de configuración después del inicio en la experiencia de usuario.
6. Probar escenarios positivos y negativos, incluidos duplicados, plazas incompletas y edición de un grupo iniciado.
7. Verificar que las pruebas de interfaz disponibles sigan funcionando.

## Criterios de aceptación
- El formulario cubre los campos requeridos.
- El usuario entiende el estado del grupo y qué acciones puede realizar.
- La interfaz no ofrece edición de parámetros bloqueados tras el inicio.
- La asignación de turnos se presenta de forma clara y verificable.
- Errores y rechazos se muestran sin falsear el resultado de una operación.
