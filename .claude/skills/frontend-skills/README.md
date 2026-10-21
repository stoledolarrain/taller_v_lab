# Skills de frontend — Pasanaku Digital

Este paquete contiene skills de Claude Code enfocadas exclusivamente en el frontend React + Vite + TypeScript del proyecto.

## Contenido

- `react-mvvm`: separación Model, ViewModel, View y servicios de acceso a datos.
- `ui-design-system`: consistencia visual, estados y componentes.
- `groups-turns`: grupos, participantes, invitaciones y turnos.
- `contributions-rounds`: cuotas, aportes, rondas, beneficiarios e historial.
- `forms-feedback`: formularios, validación y mensajes de feedback.
- `frontend-testing`: pruebas de componentes, hooks y los siete escenarios E2E.
- `accessibility-responsive`: accesibilidad y diseño adaptable.

## Instalación

1. Descomprime el paquete en la raíz del repositorio.
2. Copia las carpetas de skills dentro de `.claude/skills/`.
3. Verifica que cada archivo quede como `.claude/skills/<nombre-skill>/SKILL.md`.
4. Revisa las rutas y los scripts reales del repositorio antes de ejecutar comandos o mover archivos.

## Alcance y decisiones

- Solo se definen prácticas del frontend.
- Las skills no implementan el backend ni definen endpoints.
- La UI debe consumir los contratos reales existentes; no debe inventarlos.
- El frontend puede mejorar la validación y la experiencia, pero no debe asumir que sustituye las reglas definitivas del sistema.
- El proyecto registra aportes realizados fuera de la plataforma; no procesa transferencias reales.
- Los requisitos de grupos, turnos, rondas, pagos, historial, recordatorios y los siete escenarios E2E se basan en el documento del proyecto Pasanaku Digital.

