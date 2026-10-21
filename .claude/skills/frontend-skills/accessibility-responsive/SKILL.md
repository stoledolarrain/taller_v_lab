---
name: accessibility-responsive
description: Revisa y mejora la accesibilidad, navegación por teclado y comportamiento adaptable del frontend de Pasanaku Digital. Usar al crear o modificar vistas, formularios, tablas y navegación.
---

# Accesibilidad y diseño responsive

## Objetivo
Garantizar que los flujos de Pasanaku se puedan utilizar de forma clara en escritorio y móvil, y que los controles principales sean accesibles.

## Reglas

### Estructura y semántica
- Usar elementos semánticos adecuados: encabezados, formularios, botones, enlaces, listas y tablas.
- Mantener una jerarquía de encabezados lógica.
- Los botones ejecutan acciones; los enlaces navegan.
- No usar elementos `div` o `span` como controles interactivos sin necesidad y sin soporte accesible.

### Teclado y foco
- Los controles interactivos deben poder operarse con teclado.
- Mantener un indicador de foco visible.
- No crear trampas de teclado.
- Al abrir un modal, gestionar el foco y permitir cerrarlo según el comportamiento esperado.
- Tras un error de formulario o una acción importante, ofrecer feedback perceptible.

### Formularios
- Etiquetas asociadas a cada campo.
- Instrucciones y errores accesibles.
- No depender solo de placeholders para explicar el propósito del campo.
- Indicar los campos obligatorios de forma clara.

### Estados y alertas
- Comunicar estados como `PENDIENTE`, `PAGADA`, `INICIADO` y `FINALIZADO` mediante texto además de color.
- Los cambios importantes deben ser perceptibles sin depender exclusivamente de una animación.
- Evitar parpadeos y animaciones innecesarias.

### Diseño responsive
- Comprobar los flujos clave en móvil, tablet y escritorio.
- Evitar que montos, fechas, nombres o acciones importantes queden cortados.
- Asegurar que formularios y modales quepan en pantallas pequeñas.
- Las tablas de historial deben seguir siendo legibles, mediante adaptación o desplazamiento horizontal controlado.
- Mantener las acciones críticas localizables y distinguirlas de las secundarias.

## Flujos prioritarios
- Registro e inicio de sesión.
- Crear un pasanaku y completar sus datos.
- Unirse mediante invitación/código.
- Consultar turnos y beneficiario.
- Reportar y validar aportes.
- Consultar pendientes e historial.
- Confirmar cierre de ronda.

## Procedimiento
1. Revisar la implementación existente antes de cambiarla.
2. Comprobar semántica, etiquetas, teclado, foco y mensajes.
3. Revisar desbordamientos y distribución en tamaños de pantalla habituales.
4. Reutilizar los estilos y componentes existentes.
5. Ejecutar las herramientas de lint, pruebas o auditoría disponibles.

## Criterios de aceptación
Los flujos clave funcionan con teclado, tienen etiquetas y mensajes comprensibles, no dependen solo del color y se mantienen legibles en pantallas pequeñas.
