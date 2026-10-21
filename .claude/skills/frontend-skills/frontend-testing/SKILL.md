---
name: frontend-testing
description: Diseña, ejecuta y revisa pruebas del frontend React de Pasanaku Digital, incluidas pruebas de componentes, hooks y recorridos E2E de los siete escenarios del proyecto. Usar al implementar o revisar funcionalidad de interfaz.
---

# Frontend Testing — Pasanaku Digital

## Objetivo
Verificar que la interfaz real refleja los flujos y restricciones del proyecto. Las pruebas deben comprobar comportamientos significativos, no limitarse a comprobar que un componente se renderiza.

## Reglas generales

- Inspeccionar el framework de pruebas y los comandos ya configurados antes de añadir herramientas.
- Reutilizar dependencias existentes.
- Mantener las pruebas deterministas y repetibles.
- Usar datos de prueba explícitos y no depender de información real de usuarios.
- Comprobar tanto casos positivos como negativos.
- No afirmar que una prueba se ejecutó si solo se escribió.
- No debilitar o eliminar una prueba para hacer que la suite pase sin explicar el motivo.
- Mantener las pruebas E2E conectadas a la interfaz real de la aplicación.

## Pruebas unitarias de frontend
Cuando existan funciones puras o ViewModels que las requieran, comprobar:
- Cálculo del total esperado: monto de cuota × cantidad de participantes.
- Presentación correcta de turnos y beneficiarios.
- Validaciones de monto y fecha.
- Detección de participantes duplicados en la experiencia de interfaz.
- Presentación de cuotas pendientes y pagadas.
- Disponibilidad de acciones según rol y estado recibido.
- Bloqueo visual de acciones cuando existan cuotas pendientes.
- Manejo de carga, error, vacío y éxito.

No duplicar en frontend una suite de pruebas de reglas de negocio que pertenezca a otra capa. Aquí se prueba el comportamiento del frontend y su representación de los datos.

## Pruebas de componentes y hooks
Verificar:
- Formularios con entradas válidas e inválidas.
- Mensajes de error y conservación de datos.
- Prevención de doble envío.
- Tablas/listados con datos, lista vacía y errores.
- Visibilidad de acciones para participante y administrador.
- Cambios de estado solo después de una respuesta confirmada.
- Accesibilidad básica: etiquetas, nombres accesibles y navegación por teclado cuando aplique.

## Recorridos E2E obligatorios del proyecto
Asegurar que las pruebas de interfaz cubran los siguientes escenarios definidos en los requisitos:

1. **E2E 01 — Crear pasanaku:** iniciar sesión como administrador, crear grupo, configurar cuota y periodicidad, invitar participantes y completar el grupo.
2. **E2E 02 — Definir turnos:** abrir el grupo, asignar o sortear el orden, verificar un turno por participante e iniciar el pasanaku.
3. **E2E 03 — Registrar aportes:** participante consulta cuota y reporta pago; administrador valida; la interfaz muestra el estado confirmado como `PAGADA`.
4. **E2E 04 — Bloqueo por deuda:** intentar cerrar una ronda con al menos una cuota pendiente; la interfaz refleja el rechazo y no muestra un cierre exitoso.
5. **E2E 05 — Cerrar ronda:** con todas las cuotas pagadas, confirmar la entrega, cerrar la ronda y comprobar que la interfaz refleja la siguiente ronda habilitada.
6. **E2E 06 — Historial:** participante consulta turnos, aportes, pendientes y beneficiarios anteriores.
7. **E2E 07 — Control de acceso:** usuario que no pertenece al grupo intenta acceder y la interfaz muestra el bloqueo correspondiente.

## Estrategia para errores y respuestas
- Simular fallos de red, errores de validación y respuestas no autorizadas cuando el framework lo permita.
- Verificar que un fallo no cambie la UI a un estado de éxito.
- Comprobar estados de carga y reintento.
- Asegurar que un resultado antiguo no sobrescriba una acción más reciente cuando sea relevante.

## Procedimiento
1. Inspeccionar los scripts disponibles en `package.json` y la configuración de pruebas.
2. Localizar componentes, hooks y recorridos relacionados con el cambio.
3. Añadir o actualizar pruebas para comportamiento observable.
4. Ejecutar primero las pruebas específicas y después las comprobaciones globales razonables.
5. Informar comandos ejecutados, resultados y limitaciones.

## Criterios de aceptación
- Los siete escenarios E2E están contemplados en la suite o se informa con precisión cuáles faltan.
- Se prueban resultados exitosos y rechazos importantes.
- Las pruebas interactúan con la interfaz y verifican lo que el usuario ve.
- Los comandos y resultados informados corresponden a ejecuciones reales.
