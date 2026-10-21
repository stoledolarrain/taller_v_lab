---
name: ui-design-system
description: Define y aplica consistencia visual, componentes de interfaz, estados y diseño adaptable en el frontend de Pasanaku Digital. Usar al diseñar o modificar pantallas y componentes visuales.
---

# UI Design System — Pasanaku Digital

## Objetivo
Mantener una interfaz clara, consistente, accesible y adecuada para una plataforma de ahorro grupal rotativo. Esta skill solo define la experiencia y la presentación del frontend.

## Principios visuales

- Priorizar claridad y confianza: montos, fechas, estados de cuota y beneficiarios deben entenderse sin ambigüedad.
- Usar jerarquía visual coherente entre títulos, subtítulos, contenido, acciones principales y acciones secundarias.
- Reutilizar las variables CSS, tokens, componentes y estilos ya existentes.
- No inventar una paleta, tipografía o biblioteca si el proyecto ya tiene una definida.
- Evitar decoraciones que compitan con información operativa importante.
- Usar español consistente en etiquetas y mensajes, salvo que el proyecto defina otra convención.

## Componentes que deben mantener consistencia
- Botones principales, secundarios, deshabilitados y de peligro.
- Campos de texto, selectores, fechas, validaciones y ayudas.
- Tarjetas de grupos y participantes.
- Indicadores de estado del pasanaku, ronda y cuota.
- Tablas/listados de aportes e historial.
- Modales y confirmaciones para acciones importantes.
- Alertas, notificaciones internas, estados vacíos, carga y error.
- Navegación, encabezados, menús y paginación, si existe.

## Estados y significado

Representar de forma consistente, con texto visible y no solo con color, como mínimo:
- Grupo: `BORRADOR`, `INICIADO`, `FINALIZADO` y cualquier otro estado que realmente exista en los tipos del proyecto.
- Cuota: `PENDIENTE` y `PAGADA`.
- Carga, éxito, error, lista vacía y acción no disponible.

No inventar estados de negocio adicionales. Confirmar los valores reales en los tipos/modelos existentes. Para distinguir estados, combinar color con texto, icono o etiqueta accesible.

## Diseño adaptable

- Revisar uso en escritorio, tablet y móvil.
- Evitar desbordamiento horizontal en formularios, tarjetas, tablas y diálogos.
- En pantallas pequeñas, convertir tablas anchas en una presentación legible o permitir desplazamiento controlado.
- Mantener controles táctiles cómodos y acciones importantes visibles.
- No ocultar información crítica de cuotas, turnos, fechas o beneficiarios en móvil.

## Accesibilidad

- Asociar etiquetas con sus campos.
- Mantener orden lógico de tabulación y foco visible.
- Usar botones para acciones y enlaces para navegación.
- Añadir nombres accesibles a controles que solo tengan iconos.
- No usar el color como único indicador de estado.
- Mantener contraste legible y mensajes de error identificables.

## Procedimiento

1. Inspeccionar estilos y componentes existentes.
2. Reutilizar tokens y componentes compartidos antes de crear otros.
3. Aplicar el cambio a la pantalla solicitada y revisar consistencia con pantallas relacionadas.
4. Revisar estados normal, carga, vacío, error, deshabilitado y confirmación cuando correspondan.
5. Verificar visualmente el diseño en los tamaños de pantalla disponibles.
6. Ejecutar las comprobaciones del proyecto que correspondan.

## Restricciones
- No rediseñar toda la aplicación por una petición localizada.
- No añadir bibliotecas visuales sin justificación y autorización.
- No representar como completado un pago, cierre o entrega solo por cambiar el estilo de un botón.
- No ocultar información relevante para simplificar una pantalla.

## Criterios de aceptación
La pantalla es consistente con el sistema visual existente, legible en móvil y escritorio, accesible, y comunica claramente los estados y las acciones disponibles.
