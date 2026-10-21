---
name: forms-feedback
description: Construye formularios, validaciones de interfaz, confirmaciones y mensajes de feedback accesibles para Pasanaku Digital. Usar al implementar registro, inicio de sesión, grupos, invitaciones o aportes.
---

# Formularios y feedback de interfaz

## Objetivo
Hacer que los formularios del frontend sean comprensibles, accesibles y resistentes a errores, sin sustituir las validaciones definitivas del sistema.

## Alcance
Puede aplicarse a registro e inicio de sesión, creación de grupos, invitaciones, configuración de turnos y reporte de aportes, según los formularios existentes en el proyecto.

## Reglas de validación

1. Validar los campos obligatorios y los formatos antes de enviar.
2. El monto de cuota debe ser mayor que cero.
3. Las fechas deben ser válidas y presentarse en un formato comprensible.
4. La cantidad de participantes debe ser válida según las reglas y los controles disponibles en el proyecto.
5. No permitir duplicar localmente un participante en un mismo grupo.
6. Mostrar errores junto al campo correspondiente y resumirlos cuando el formulario sea extenso.
7. No borrar todos los datos ingresados cuando una operación falla, salvo que exista una razón de seguridad.
8. Mostrar los mensajes de validación que devuelva la operación real, adaptándolos a un lenguaje claro sin cambiar su significado.
9. Evitar depender únicamente de validación HTML nativa si se necesita feedback específico de la aplicación.
10. Mantener las validaciones de negocio críticas sincronizadas con las convenciones del proyecto.

## Envíos y feedback

- Deshabilitar el botón de envío mientras una solicitud está en curso para evitar envíos repetidos.
- Mostrar un indicador de carga cuando la espera no sea inmediata.
- Mostrar confirmación solo después de una respuesta exitosa real.
- Mostrar errores de red, permisos o validación sin revelar detalles internos sensibles.
- Para acciones irreversibles o importantes —iniciar el pasanaku, validar aportes o cerrar rondas— presentar el resumen pertinente y una confirmación cuando corresponda.
- No tratar un clic, una animación o el cierre de un modal como prueba de éxito.
- Permitir reintentar cuando la operación sea recuperable y sea seguro hacerlo.

## Accesibilidad

- Cada campo debe tener una etiqueta visible y asociada.
- Los errores deben identificarse mediante texto y asociarse al campo correspondiente.
- El foco debe dirigirse de forma razonable al primer error o al mensaje de resultado cuando corresponda.
- Los controles deben funcionar con teclado.
- No usar solo color para indicar errores o éxito.

## Arquitectura

- La validación y el estado del formulario deben residir en el ViewModel/custom hook cuando corresponda.
- La View debe limitarse a presentar valores, errores, estados y acciones.
- Los servicios existentes gestionan las peticiones HTTP.
- Reutilizar la biblioteca de formularios o validación ya instalada; no añadir otra sin justificación.

## Procedimiento
1. Revisar formularios y convenciones existentes.
2. Identificar campos obligatorios y reglas de UI.
3. Implementar validaciones tipadas y mensajes claros.
4. Cubrir carga, éxito, error, errores por campo y prevención de doble envío.
5. Probar entradas válidas, inválidas, vacías y errores devueltos por la API.
6. Confirmar que el formulario sea usable con teclado y en pantallas pequeñas.

## Criterios de aceptación
- Los errores se explican de manera clara.
- No se envían datos claramente inválidos desde la interfaz.
- La UI no presenta éxito antes de la confirmación.
- Los datos se conservan cuando corresponde.
- El formulario es accesible y sigue la arquitectura MVVM.
