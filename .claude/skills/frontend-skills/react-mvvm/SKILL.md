---
name: react-mvvm
description: Aplica y revisa la arquitectura MVVM del frontend de Pasanaku Digital con React, Vite y TypeScript. Usar al crear, modificar o refactorizar componentes, hooks, modelos o servicios del frontend.
---

# React MVVM — Pasanaku Digital

## Objetivo
Mantener una separación clara entre datos, lógica de presentación e interfaz. Esta skill cubre exclusivamente el frontend.

## Arquitectura obligatoria

- **Model:** tipos e interfaces en `src/models/` o `src/types/`. Representan los datos que utiliza la interfaz y los contratos que consume.
- **ViewModel:** custom hooks en `src/hooks/` o `src/features/<feature>/hooks/`. Gestionan estado de presentación, validaciones de UI, acciones, cálculos de presentación y mutaciones solicitadas por la interfaz.
- **View:** componentes funcionales en `src/components/` o `src/features/<feature>/components/`. Renderizan datos y exponen acciones a través de props o del ViewModel correspondiente.
- **API client y servicios:** código de acceso HTTP en `src/services/api/`. Los componentes visuales no realizan llamadas HTTP directamente.

## Reglas de implementación

1. Inspeccionar primero la estructura, los patrones y las dependencias existentes.
2. Usar TypeScript y los tipos existentes; evitar `any` salvo justificación explícita.
3. Mantener los componentes de presentación enfocados en renderizar.
4. No trasladar toda la lógica a un único hook o componente gigante.
5. Mantener el estado lo más cerca posible de la funcionalidad que lo necesita.
6. Evitar duplicar estado derivado; calcularlo a partir de los datos fuente cuando sea razonable.
7. Usar nombres descriptivos y consistentes para hooks (`use...`), componentes y tipos.
8. No crear capas, carpetas o abstracciones innecesarias.
9. No cambiar dependencias ni la configuración del proyecto sin necesidad justificada.
10. No modificar el backend ni inventar contratos de API desde esta skill.

## Organización por funcionalidad
Cuando el repositorio ya utilice módulos por funcionalidad, mantenerlos. Por ejemplo:

- `src/features/grupos/components/`
- `src/features/grupos/hooks/`
- `src/features/aportes/components/`
- `src/features/aportes/hooks/`
- `src/models/` o `src/types/`
- `src/services/api/`

Este ejemplo es orientativo: no mover archivos existentes solo para hacerlos coincidir si el proyecto ya tiene una organización coherente.

## Procedimiento antes de cambiar código

1. Identificar la funcionalidad y los archivos involucrados.
2. Revisar `CLAUDE.md` y las implementaciones relacionadas.
3. Determinar qué corresponde a Model, ViewModel, View y servicio.
4. Proponer cambios localizados y reutilizar código existente.
5. Implementar respetando la estructura y los contratos actuales.
6. Ejecutar las comprobaciones disponibles: TypeScript, lint y pruebas pertinentes.
7. Informar qué archivos se modificaron, qué se verificó y qué queda pendiente.

## Criterios de aceptación

- Las Views no contienen llamadas HTTP directas.
- La lógica de estado y presentación está en hooks/ViewModels.
- Los tipos reflejan los datos realmente utilizados.
- No se duplican innecesariamente lógica ni estado.
- La funcionalidad existente se conserva salvo que el cambio solicitado indique lo contrario.
- Las verificaciones ejecutadas y sus resultados se comunican sin afirmar pruebas que no se realizaron.
