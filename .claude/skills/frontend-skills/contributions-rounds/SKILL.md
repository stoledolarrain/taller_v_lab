---
name: contributions-rounds
description: Implementa la experiencia frontend de cuotas, aportes, validación visual de pagos, rondas, beneficiarios, cierre e historial en Pasanaku Digital. Usar al trabajar con pagos, rondas o avance de turnos.
---

# Cuotas, aportes y rondas

## Objetivo
Crear una interfaz fiable para consultar cuotas, reportar aportes, revisar su estado y mostrar el ciclo de cada ronda. La plataforma registra pagos realizados fuera del sistema: no es un banco ni ejecuta transferencias reales.

## Funcionalidades contempladas
- Consultar cuotas pendientes y pagadas del participante.
- Reportar un aporte realizado fuera de la plataforma, usando los campos que realmente admita la aplicación.
- Mostrar al administrador los aportes pendientes de validación.
- Mostrar monto, fecha y usuario relacionados con cada aporte, según los datos disponibles.
- Presentar el beneficiario de cada ronda y el total esperado, total registrado y monto pendiente.
- Mostrar el historial de aportes por participante y el historial de rondas y beneficiarios.
- Presentar recordatorios internos para cuotas pendientes si esa funcionalidad está implementada.

## Reglas críticas de presentación

1. La interfaz debe diferenciar `PENDIENTE` y `PAGADA` con etiqueta textual y un tratamiento visual consistente.
2. No mostrar una cuota como pagada hasta que la operación correspondiente haya sido confirmada por el sistema.
3. No presentar un reporte de aporte del participante como una validación del administrador.
4. Las acciones de validar aportes, confirmar entrega al beneficiario y cerrar rondas deben aparecer solo para el rol autorizado según el contexto de sesión y los datos de permisos disponibles.
5. Antes de una acción crítica, mostrar un resumen claro y solicitar confirmación cuando corresponda.
6. No ofrecer el cierre de una ronda como una acción disponible si hay cuotas pendientes según los datos actuales.
7. Si el sistema rechaza el cierre por cuotas pendientes, mostrar el motivo recibido y actualizar la vista cuando corresponda.
8. Una ronda cerrada debe mostrarse como no editable para operaciones ordinarias de aportes.
9. Mostrar la siguiente ronda/turno como habilitada solo después de recibir confirmación de la operación correspondiente.
10. Mostrar el pasanaku como `FINALIZADO` únicamente cuando ese estado esté confirmado por el sistema.
11. El historial debe distinguir fechas de pago y de validación si ambas están disponibles.
12. No afirmar que hubo transferencia bancaria; el alcance del proyecto es registrar y controlar pagos efectuados fuera de la plataforma.

## Cálculos de presentación
- El total esperado de la ronda se calcula con la cuota acordada multiplicada por la cantidad de participantes; ejemplo del proyecto: 5 participantes × Bs 200 = Bs 1.000.
- Preferir datos calculados por el sistema cuando estén disponibles y mantener coherencia con las reglas compartidas.
- Si el frontend calcula un total para previsualización, usar una función tipada y comprobable, y no tratar ese cálculo como prueba de que los pagos se realizaron.
- No usar números de ejemplo como datos reales de un grupo.

## Arquitectura
- Tipos e interfaces en `src/models/` o `src/types/`.
- Estado, validación de UI y acciones en custom hooks/ViewModels.
- Componentes visuales sin llamadas HTTP directas.
- Comunicación mediante servicios existentes en `src/services/api/`.
- No inventar endpoints, campos o estados que no estén en el contrato real del proyecto.

## Procedimiento
1. Revisar tipos y flujos actuales de cuotas, aportes, rondas y beneficiarios.
2. Confirmar estados y datos disponibles antes de diseñar la pantalla.
3. Separar las acciones del participante de las del administrador.
4. Implementar estados de carga, vacío, error, éxito y acción en curso.
5. Proteger la interfaz frente a doble envío y resultados obsoletos.
6. Verificar los escenarios: cuota pendiente, aporte reportado, aporte validado, intento de cierre con deuda, cierre correcto, historial y pasanaku finalizado.
7. Ejecutar las pruebas pertinentes y documentar cualquier caso no cubierto.

## Criterios de aceptación
- Se distingue con claridad lo pendiente, reportado, validado y pagado según los estados reales disponibles.
- No se simulan pagos ni cierres exitosos.
- El cierre y el avance se reflejan solo tras confirmación.
- Los importes, beneficiarios, fechas e historiales se muestran de forma consistente.
- La aplicación deja claro que no procesa transferencias reales.
