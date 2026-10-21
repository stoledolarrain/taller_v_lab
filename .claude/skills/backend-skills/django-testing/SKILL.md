---
name: django-testing
description: Write meaningful unit and integration tests for Pasanaku Digital using Django and Django REST Framework test tools.
---

---
name: django-testing
description: Apply a complete testing strategy to Pasanaku Digital using Django, Django REST Framework, unit tests, integration tests, API tests, and End-to-End tests. Prioritize business rules, test pyramid, maintainability, isolation, and reproducible evaluation.
---

# Skill: Testing profesional con Django para Pasanaku Digital

## 1. Objetivo

Desarrollar una estrategia de testing completa para Pasanaku Digital, verificando que el backend cumpla los requisitos funcionales, de seguridad, integridad de datos y reglas del negocio.

El proyecto debe contar con pruebas unitarias, pruebas de integración, pruebas de API y pruebas End-to-End (E2E) cuando corresponda.

Las pruebas deben comprobar comportamientos reales y no limitarse a verificar getters, setters, respuestas triviales o que una función simplemente se ejecute sin errores.

El testing es un requisito principal del proyecto y debe diseñarse desde el inicio, no agregarse únicamente al final del desarrollo.

## 2. Principios obligatorios de testing

1. Antes de escribir pruebas, leer los requisitos funcionales y no funcionales del proyecto.
2. Inspeccionar la arquitectura, modelos, servicios, vistas, serializers, permisos y endpoints existentes.
3. Identificar qué regla o comportamiento debe verificarse antes de elegir el tipo de prueba.
4. Cada prueba debe comprobar un resultado observable y tener un propósito claro.
5. Incluir casos positivos, negativos, límites y situaciones excepcionales.
6. No depender del orden de ejecución de las pruebas.
7. No utilizar datos de producción ni modificar información real.
8. Las pruebas deben poder ejecutarse repetidamente y producir resultados consistentes.
9. No eliminar, desactivar ni modificar una prueba únicamente para conseguir que la suite pase.
10. No modificar una expectativa correcta para ocultar un error de implementación.
11. Utilizar mocks y stubs únicamente cuando tengan una justificación.
12. No simular la misma lógica de negocio que la prueba pretende verificar.
13. Mantener las pruebas organizadas y con nombres descriptivos.
14. Ejecutar las pruebas después de modificar reglas de negocio, modelos, permisos, serializers, servicios o endpoints.
15. No afirmar que las pruebas pasan si no se han ejecutado realmente.
16. Si una prueba falla, investigar la causa y distinguir entre error de implementación, error de la prueba o problema del entorno.
17. No considerar que un porcentaje alto de cobertura garantiza por sí solo que el software sea correcto.
18. Priorizar la detección de errores que puedan producir pagos incorrectos, turnos duplicados, cierres inválidos o accesos no autorizados.

## 3. Pirámide de testing

Aplicar la pirámide de testing como guía para distribuir las pruebas del proyecto.

### 3.1. Pruebas unitarias

Son pruebas rápidas y aisladas que verifican una función, método o regla individual.

Deben constituir la mayor parte de las pruebas automatizadas del backend.

Ejemplos para Pasanaku Digital:

- Calcular el total esperado de una ronda.
- Validar que una cuota sea mayor que cero.
- Comprobar las reglas de asignación de turnos.
- Determinar si existen cuotas pendientes.
- Verificar si una ronda cumple las condiciones para cerrarse.
- Determinar si todas las rondas están cerradas y el pasanaku puede finalizarse.

Las pruebas unitarias deben evitar depender de la base de datos, de la red o de servicios externos cuando no sea necesario.

Herramientas posibles:
- `unittest`
- `SimpleTestCase` de Django.
- `pytest` cuando esté configurado en el proyecto.

### 3.2. Pruebas de integración

Verifican que varios componentes funcionen correctamente juntos.

Pueden involucrar modelos, base de datos, servicios, serializers, permisos y lógica de negocio.

Ejemplos:

- Crear un usuario y verificar que se persista correctamente.
- Crear un pasanaku y recuperar su configuración.
- Asociar participantes a un grupo.
- Generar turnos y verificar que queden almacenados.
- Crear las cuotas correspondientes a una ronda.
- Registrar y validar un aporte.
- Cerrar una ronda completa y verificar que la siguiente quede habilitada.
- Comprobar que las restricciones de unicidad impidan duplicados.

Estas pruebas pueden utilizar la base de datos de prueba de Django.

Herramientas posibles:
- `TestCase`
- `TransactionTestCase` cuando se deban comprobar transacciones o concurrencia real.
- `pytest-django` si el equipo utiliza pytest.

### 3.3. Pruebas de API

Verifican el comportamiento de los endpoints HTTP de la API REST.

Comprueban tanto las respuestas como la autenticación, autorización, validación de entradas y efectos sobre los datos.

Ejemplos:

- Crear un pasanaku mediante una petición POST.
- Consultar los grupos de un usuario autenticado.
- Enviar un monto negativo y comprobar que la API lo rechace.
- Intentar cerrar una ronda con cuotas pendientes.
- Verificar que un participante no pueda validar un aporte.
- Intentar consultar un grupo privado desde otra cuenta.
- Comprobar los códigos HTTP y la estructura de los errores.

Las pruebas de API pueden clasificarse como pruebas de integración cuando verifican el endpoint junto con los componentes que utiliza. No deben tratarse necesariamente como un nivel independiente de la pirámide.

Herramientas posibles:
- `APITestCase`
- `APIClient`
- `APIRequestFactory` para casos específicos.
- `pytest` y `pytest-django` si están configurados.

### 3.4. Pruebas End-to-End (E2E)

Verifican un flujo completo del sistema desde la perspectiva del usuario, utilizando la interfaz real y los componentes necesarios para completar el proceso.

Ejemplos:

- Iniciar sesión y crear un pasanaku.
- Invitar participantes y completar el grupo.
- Definir los turnos e iniciar el pasanaku.
- Reportar un aporte y validarlo desde la cuenta del administrador.
- Intentar cerrar una ronda con cuotas pendientes y verificar el bloqueo.
- Completar los aportes, cerrar una ronda y comprobar que avance a la siguiente.
- Consultar el historial de aportes y beneficiarios.

Las pruebas E2E deben ser menos numerosas que las unitarias y centrarse en los flujos críticos.

Herramientas posibles:
- Playwright.
- Selenium.

No considerar una prueba que llama únicamente a un endpoint mediante `APIClient` como E2E de la interfaz real. Esa prueba corresponde al nivel de API o integración.

Si la evaluación exige E2E sobre la interfaz real, se debe configurar una herramienta de navegador que interactúe con el frontend.

## 4. Cómo decidir qué tipo de prueba utilizar

Antes de implementar una prueba, responder estas preguntas:

1. ¿Solo necesito verificar una regla o cálculo aislado? Utilizar una prueba unitaria.
2. ¿Necesito comprobar que varios componentes o la base de datos funcionan juntos? Utilizar una prueba de integración.
3. ¿Necesito verificar un endpoint HTTP, sus permisos y su respuesta? Utilizar una prueba de API.
4. ¿Necesito demostrar que un usuario puede completar un proceso real a través de la interfaz? Utilizar una prueba E2E.

No duplicar el mismo caso de prueba en todos los niveles sin una razón.

Una regla crítica puede verificarse en varios niveles cuando cada prueba aporta una garantía diferente. Por ejemplo, la regla de no cerrar una ronda incompleta puede probarse unitariamente en el servicio, mediante integración con la base de datos y mediante un flujo E2E de bloqueo.

## 5. Patrón Arrange–Act–Assert (AAA)

Organizar las pruebas siguiendo el patrón AAA:

- **Arrange:** preparar los datos y el estado inicial.
- **Act:** ejecutar la acción que se desea probar.
- **Assert:** verificar el resultado esperado.

Ejemplo:

```python
from decimal import Decimal
from django.test import SimpleTestCase


class CalculoRondaTests(SimpleTestCase):

    def test_total_esperado_de_cinco_participantes(self):
        # Arrange
        monto_cuota = Decimal("200.00")
        cantidad_participantes = 5

        # Act
        total = monto_cuota * cantidad_participantes

        # Assert
        self.assertEqual(total, Decimal("1000.00"))
```

Este ejemplo ilustra el patrón AAA. Cuando exista una función real para calcular el total de una ronda, la prueba debe llamar a esa función en lugar de repetir la fórmula dentro del test.

## 6. Pruebas unitarias de las reglas del negocio

Las reglas de negocio deben poder probarse sin necesidad de ejecutar toda la aplicación.

Cuando sea apropiado, ubicar la lógica reutilizable en funciones o servicios que puedan probarse de manera aislada.

### Casos unitarios obligatorios

#### Cálculos

- Calcular correctamente el total esperado de una ronda.
- Verificar el cálculo con uno, varios y muchos participantes.
- Comprobar que los cálculos monetarios utilicen `Decimal` y no `float`.
- Verificar los totales registrados y pendientes cuando exista una función que los calcule.

#### Validación de participantes

- Rechazar participantes duplicados.
- Verificar que no se pueda iniciar un grupo incompleto.
- Comprobar que el número de participantes y turnos sea coherente.

#### Generación de turnos

- Generar exactamente la cantidad de turnos requerida.
- Comprobar que cada participante aparezca exactamente una vez como beneficiario.
- Rechazar posiciones duplicadas.
- Rechazar turnos sin beneficiario.
- Verificar que el orden generado se mantenga después de guardarlo.

#### Cuotas y aportes

- Rechazar montos inválidos.
- Determinar correctamente si hay cuotas pendientes.
- Comprobar el cálculo del total esperado.
- Verificar que una cuota solo cambie a `PAGADA` después de la validación requerida.
- Comprobar que no se duplique un aporte por reintentos o solicitudes repetidas.

#### Cierre de rondas

- Rechazar el cierre cuando haya cuotas pendientes.
- Permitir el cierre cuando se cumplan todas las condiciones.
- Impedir el cierre repetido de una ronda ya cerrada.
- Impedir avanzar al siguiente turno antes del cierre correcto.
- Verificar que la finalización solo ocurra cuando todos los turnos y rondas estén completados.

#### Modificación de grupos

- Permitir modificar la configuración mientras el grupo esté en `BORRADOR`, según los permisos definidos.
- Rechazar modificaciones prohibidas después del inicio.
- Comprobar las transiciones de estado permitidas.

## 7. Pruebas de integración con la base de datos

Las pruebas de integración deben comprobar que los componentes funcionan juntos y que los datos quedan persistidos correctamente.

### Casos obligatorios

1. Crear un usuario y verificar su persistencia.
2. Crear un pasanaku y recuperar sus campos.
3. Registrar una membresía y verificar la relación con el usuario y el grupo.
4. Intentar crear una membresía duplicada.
5. Crear una invitación y comprobar que se asocia al grupo correcto.
6. Aceptar una invitación válida y persistir la membresía.
7. Generar turnos y verificar que todos estén almacenados.
8. Crear una ronda y sus cuotas.
9. Reportar un aporte y recuperar sus datos.
10. Validar un aporte y comprobar la actualización de la cuota.
11. Intentar cerrar una ronda incompleta y verificar que no se cierre.
12. Cerrar una ronda completa y verificar que la siguiente se habilite correctamente.
13. Comprobar que un usuario ajeno no pueda consultar datos privados.
14. Comprobar que las restricciones de la base de datos protejan la integridad de los datos.

Las pruebas deben utilizar la base de datos de prueba de Django y no la base de datos de producción.

## 8. Pruebas de API con Django REST Framework

Utilizar `APITestCase` o `APIClient` para probar los endpoints.

Para cada endpoint importante, cubrir:

- Petición correcta.
- Campos obligatorios ausentes.
- Datos con formato incorrecto.
- Valores fuera de rango.
- Usuario no autenticado.
- Usuario autenticado sin permiso.
- Recurso inexistente.
- Recurso de otro grupo.
- Estado del recurso incompatible con la operación.
- Persistencia o ausencia de cambios según el resultado.

### Ejemplo de prueba de API

La URL debe adaptarse a las rutas reales del proyecto.

```python
from rest_framework import status
from rest_framework.test import APITestCase


class AccesoPrivadoTests(APITestCase):

    def test_usuario_no_autenticado_no_accede_a_grupo_privado(self):
        response = self.client.get("/api/pasanakus/1/")

        self.assertIn(
            response.status_code,
            [
                status.HTTP_401_UNAUTHORIZED,
                status.HTTP_403_FORBIDDEN,
            ],
        )
```

Esta prueba ilustra cómo comprobar el acceso privado. En el proyecto real, verificar que el recurso exista y configurar el resultado esperado de acuerdo con el mecanismo de autenticación utilizado.

### Comprobaciones adicionales

- Verificar el código HTTP correcto.
- Verificar los campos de la respuesta JSON.
- Comprobar que no se expongan contraseñas, tokens ni datos privados.
- Verificar que una petición rechazada no modifique registros.
- Comprobar que el cliente no pueda asignarse un rol administrativo enviando un campo en el JSON.
- Comprobar que no pueda modificar directamente el estado de un pasanaku a `FINALIZADO`.

## 9. Pruebas de autenticación y autorización

La autenticación y autorización deben comprobarse con diferentes usuarios y roles.

Preparar, como mínimo:

- Un usuario administrador del grupo A.
- Un participante del grupo A.
- Un usuario que no pertenece al grupo A.
- Cuando sea necesario, un administrador de otro grupo.

### Casos obligatorios

1. Usuario no autenticado intenta acceder a un recurso privado.
2. Participante consulta sus propias cuotas.
3. Participante intenta validar un aporte.
4. Participante intenta cerrar una ronda.
5. Usuario ajeno intenta consultar participantes o historial.
6. Usuario cambia el ID de la URL para acceder a una cuota de otro grupo.
7. Administrador del grupo A intenta administrar el grupo B sin tener permisos.
8. Un usuario intenta modificar su rol enviando `rol: "ADMIN"`.
9. Un usuario intenta crear un grupo como si ya estuviera iniciado o finalizado.
10. El creador del grupo queda asignado como administrador según las reglas del proyecto.

Verificar que los permisos se apliquen en el servidor y no dependan únicamente de que el frontend oculte botones.

## 10. Uso de fixtures, mocks y stubs

### Fixtures

Las fixtures permiten preparar datos reutilizables para las pruebas.

Pueden incluir usuarios, grupos, participantes, turnos, rondas y cuotas.

Buenas prácticas:

- Crear solo los datos necesarios para cada prueba.
- Evitar fixtures enormes que hagan difícil comprender el escenario.
- Mantener los datos de prueba coherentes con las reglas del negocio.
- No depender de un archivo de fixtures compartido si una fábrica o función de creación resulta más clara.
- Utilizar los mecanismos de aislamiento de Django para que las pruebas no contaminen unas a otras.

### Mocks

Los mocks simulan una dependencia y permiten verificar interacciones específicas.

Utilizarlos cuando una prueba necesite aislar una dependencia externa, como un servicio de correo electrónico.

Ejemplo conceptual:

```python
from unittest.mock import patch


@patch("mi_app.services.enviar_correo")
def test_notificacion_usa_servicio_de_correo(self, mock_correo):
    # Preparar el escenario.
    # Ejecutar la acción.
    # Comprobar que el servicio se invocó cuando correspondía.
    ...
```

El módulo y la función son ilustrativos. El parche debe aplicarse en el lugar donde la dependencia se utiliza realmente.

### Stubs

Un stub devuelve una respuesta controlada para una dependencia.

Puede utilizarse, por ejemplo, para simular un servicio externo que devuelve un resultado específico.

### Reglas para mocks y stubs

1. No simular la función que se pretende probar.
2. No simular la base de datos en una prueba cuyo objetivo sea comprobar persistencia real.
3. No usar mocks para evitar comprobar reglas esenciales del negocio.
4. No comprobar llamadas internas irrelevantes si basta con verificar el resultado observable.
5. Usarlos para aislar dependencias externas, controlar escenarios difíciles de reproducir o comprobar efectos secundarios.
6. Mantener una cantidad razonable de mocks para evitar pruebas demasiado acopladas a la implementación.

## 11. Pruebas de errores, límites y casos negativos

No basta con comprobar que el sistema funciona cuando recibe datos correctos.

También deben verificarse las condiciones que impiden operaciones inválidas.

### Ejemplos para Pasanaku Digital

- Cuota igual a cero.
- Cuota negativa.
- Fecha inválida.
- Periodicidad no admitida.
- Usuario repetido en un grupo.
- Número insuficiente de participantes.
- Turnos duplicados.
- Turno sin beneficiario.
- Código de invitación inválido o vencido, si se implementa vencimiento.
- Reporte de aporte con monto inválido.
- Validación de un aporte por un usuario sin permiso.
- Cierre con cuotas pendientes.
- Cierre repetido.
- Intento de modificar una ronda cerrada.
- Intento de avanzar sin cerrar la ronda anterior.
- Intento de finalizar el pasanaku antes de completar todos los turnos.
- Intento de acceder a recursos de otro grupo.
- Solicitudes duplicadas que puedan generar registros repetidos.

Para cada caso negativo, verificar tanto el rechazo como la ausencia de cambios indebidos en la base de datos.

## 12. Pruebas de transacciones e integridad

Las operaciones que modifican varios registros deben probarse para verificar que no dejan estados parciales.

Operaciones críticas:

- Iniciar un pasanaku y generar sus turnos o cuotas.
- Validar un aporte y actualizar el estado de la cuota.
- Cerrar una ronda y habilitar la siguiente.
- Generar turnos sin duplicados.
- Unir un participante a un grupo.

### Casos de prueba

1. Simular un fallo durante una operación que deba ser atómica.
2. Comprobar que no queden cambios parciales.
3. Intentar cerrar dos veces la misma ronda.
4. Comprobar que no se creen dos rondas siguientes por una solicitud repetida.
5. Intentar crear dos membresías idénticas.
6. Comprobar las restricciones de unicidad de la base de datos.

Para escenarios de concurrencia o bloqueos reales, utilizar las herramientas de prueba adecuadas y un motor de base de datos compatible. Algunas comprobaciones requieren `TransactionTestCase` y no deben darse por verificadas solo mediante una prueba ordinaria con transacciones aisladas.

## 13. Pruebas End-to-End (E2E)

Las pruebas E2E deben recorrer procesos reales a través de la interfaz del usuario.

Si el proyecto utiliza un frontend separado del backend Django, configurar la herramienta E2E para interactuar con el frontend y verificar el comportamiento de la aplicación completa.

### E2E 01: Crear pasanaku

1. Iniciar sesión como administrador.
2. Crear un grupo.
3. Configurar una cuota de Bs 200 y periodicidad mensual.
4. Invitar a los participantes.
5. Completar los participantes necesarios.
6. Verificar que el grupo quede preparado para iniciar.

### E2E 02: Definir turnos

1. Abrir el grupo.
2. Asignar manualmente o sortear el orden.
3. Verificar que todos los participantes tengan exactamente un turno.
4. Iniciar el pasanaku.
5. Comprobar que el grupo ya no permita modificaciones prohibidas.

### E2E 03: Reportar y validar aportes

1. Iniciar sesión como participante.
2. Consultar su cuota pendiente.
3. Reportar el aporte.
4. Iniciar sesión como administrador.
5. Validar el aporte.
6. Verificar que el estado se actualice correctamente.

### E2E 04: Bloquear una ronda incompleta

1. Iniciar sesión como administrador.
2. Abrir una ronda que tenga al menos una cuota pendiente.
3. Intentar cerrar la ronda.
4. Verificar que la operación sea rechazada.
5. Comprobar que la ronda siga abierta y que no se haya habilitado la siguiente.

### E2E 05: Cerrar una ronda correctamente

1. Asegurar que todas las cuotas estén pagadas y validadas.
2. Confirmar la entrega del fondo al beneficiario según el flujo implementado.
3. Cerrar la ronda.
4. Verificar que quede cerrada.
5. Verificar que se habilite la siguiente ronda.
6. Comprobar que no existan rondas duplicadas.

### E2E 06: Consultar historial

1. Iniciar sesión como participante.
2. Abrir el pasanaku.
3. Consultar turnos, beneficiarios, aportes realizados y cuotas pendientes.
4. Verificar que los datos mostrados correspondan al grupo correcto.

### E2E 07: Control de acceso

1. Iniciar sesión con un usuario que no pertenece al grupo.
2. Intentar acceder a la URL privada del grupo.
3. Intentar consultar su historial.
4. Verificar que el sistema bloquee el acceso.
5. Confirmar que no se muestren datos privados.

Las pruebas E2E deben utilizar datos de prueba controlados y poder ejecutarse de nuevo sin dejar registros que interfieran con la siguiente ejecución.

## 14. Cobertura de código

La cobertura permite identificar qué partes del código se ejecutan durante las pruebas.

Puede utilizarse `coverage.py` o `pytest-cov`, dependiendo de las herramientas instaladas.

Ejemplo de comandos con coverage.py:

```bash
coverage run manage.py test
coverage report -m
coverage html
```

Si el proyecto utiliza pytest y pytest-cov, se pueden emplear comandos equivalentes según su configuración.

### Reglas de cobertura

1. Revisar la cobertura de servicios, reglas críticas, permisos y validaciones.
2. No perseguir únicamente un porcentaje global.
3. Priorizar el código que controla estados, cuotas, turnos y cierre de rondas.
4. Comprobar que los casos negativos también ejecuten las ramas de error.
5. Revisar líneas y ramas importantes que no estén cubiertas.
6. No excluir código del informe únicamente para aumentar artificialmente el porcentaje.
7. Documentar las áreas críticas que aún no tengan pruebas suficientes.

La cobertura de líneas indica qué código se ejecutó, pero no garantiza que las pruebas hayan verificado correctamente su comportamiento.

## 15. Pruebas de regresión

Una prueba de regresión comprueba que un error ya corregido no vuelva a aparecer después de cambios futuros.

Reglas:

1. Cuando se corrija un error, añadir una prueba que lo reproduzca.
2. Verificar que la prueba falle antes de la corrección cuando sea posible.
3. Corregir el problema.
4. Comprobar que la nueva prueba pase.
5. Ejecutar las pruebas relacionadas para detectar efectos secundarios.

Ejemplos:

- Si se descubre que una ronda se cierra con una cuota pendiente, añadir una prueba que impida ese comportamiento.
- Si un participante puede acceder a un grupo ajeno cambiando el ID, añadir una prueba de autorización.
- Si se duplican rondas al cerrar dos veces, añadir una prueba de idempotencia y, si corresponde, de concurrencia.

## 16. Organización de los archivos de prueba

Seguir la organización existente del proyecto. Si todavía no hay una estructura definida, puede utilizarse una organización como esta:

```text
backend/
  apps/
    pasanakus/
      models.py
      serializers.py
      views.py
      services.py
      permissions.py
      tests/
        __init__.py
        test_models.py
        test_services.py
        test_api.py
        test_permissions.py
        test_transactions.py
    aportes/
      models.py
      serializers.py
      views.py
      services.py
      tests/
        __init__.py
        test_models.py
        test_services.py
        test_api.py
```

Esta estructura es orientativa. No crear aplicaciones ni duplicar archivos solo para seguir el ejemplo si el proyecto ya tiene una organización coherente.

### Convenciones de nombres

Usar nombres que expliquen el comportamiento esperado.

Ejemplos:

```python
def test_no_permite_cerrar_ronda_con_cuotas_pendientes():
    ...

def test_rechaza_participante_duplicado():
    ...

def test_participante_no_puede_validar_aporte():
    ...
```

Evitar nombres ambiguos como `test_1`, `test_funcion` o `test_correcto`.

## 17. Ejecución de las pruebas

Si el proyecto utiliza el sistema de pruebas de Django:

```bash
python manage.py test
```

Para ejecutar las pruebas de una aplicación:

```bash
python manage.py test apps.pasanakus
```

El módulo exacto dependerá de la estructura real del proyecto.

Si se utiliza pytest:

```bash
pytest
```

No instalar simultáneamente herramientas alternativas sin necesidad. El equipo debe elegir una configuración principal y documentar cómo ejecutar la suite.

Antes de entregar una funcionalidad:

1. Ejecutar las pruebas afectadas.
2. Ejecutar las pruebas de la aplicación correspondiente.
3. Ejecutar la suite completa cuando sea posible.
4. Revisar los errores y advertencias relevantes.
5. Verificar que las pruebas no dependan de datos previos.
6. Registrar los resultados reales de la ejecución.

## 18. Buenas prácticas de calidad

- Mantener las pruebas pequeñas, legibles y específicas.
- Preferir pruebas deterministas.
- Evitar dependencias de servicios externos.
- Usar nombres descriptivos.
- No incluir lógica compleja innecesaria en las pruebas.
- No duplicar excesivamente la preparación de datos.
- Reutilizar factories o helpers cuando simplifiquen los escenarios.
- No probar detalles internos que puedan cambiar sin alterar el comportamiento esperado.
- Probar restricciones tanto a nivel de aplicación como de base de datos cuando sea necesario.
- Separar las pruebas unitarias de las que requieren acceso a la base de datos.
- Verificar los efectos secundarios de operaciones críticas.
- Mantener los datos de prueba independientes.
- No dejar pruebas incompletas o con `pass` presentadas como pruebas terminadas.
- No utilizar esperas arbitrarias largas en E2E; preferir las esperas explícitas de la herramienta.
- No ocultar fallos de las pruebas en la configuración de integración continua.

## 19. Checklist de evaluación del proyecto

### Pruebas unitarias

- [ ] Se prueban reglas reales del negocio.
- [ ] Se calcula correctamente el total esperado de una ronda.
- [ ] Se verifica la generación de turnos.
- [ ] Se impiden participantes duplicados.
- [ ] Se comprueban aportes con montos inválidos.
- [ ] Se detectan cuotas pendientes.
- [ ] Se impide cerrar rondas incompletas.
- [ ] Se impide avanzar antes del cierre correcto.
- [ ] Se comprueba la finalización del pasanaku.
- [ ] Se validan las modificaciones permitidas según el estado del grupo.

### Pruebas de integración

- [ ] Se comprueba la persistencia de usuarios y grupos.
- [ ] Se prueban las relaciones entre participantes y grupos.
- [ ] Se prueban invitaciones y uniones.
- [ ] Se generan y persisten turnos.
- [ ] Se generan cuotas.
- [ ] Se reportan y validan aportes.
- [ ] Se comprueba el cierre y avance de rondas.
- [ ] Se verifican las restricciones de integridad.

### Pruebas de API y seguridad

- [ ] Se prueban endpoints con datos válidos e inválidos.
- [ ] Se verifican los códigos HTTP.
- [ ] Se comprueba la autenticación.
- [ ] Se comprueban los permisos por grupo y rol.
- [ ] Se impide el acceso a grupos privados por usuarios ajenos.
- [ ] Se verifica que las operaciones rechazadas no modifiquen los datos.
- [ ] Se evita la exposición de información privada.

### Pruebas E2E

- [ ] Se prueba la creación de un pasanaku.
- [ ] Se prueba la definición de turnos.
- [ ] Se prueba el reporte y validación de aportes.
- [ ] Se prueba el bloqueo de rondas incompletas.
- [ ] Se prueba el cierre y avance a la siguiente ronda.
- [ ] Se prueba la consulta del historial.
- [ ] Se prueba el control de acceso desde la interfaz real.

### Calidad y ejecución

- [ ] Las pruebas tienen nombres descriptivos.
- [ ] Se aplica Arrange–Act–Assert cuando sea útil.
- [ ] Se utilizan mocks y stubs con criterio.
- [ ] Se revisa la cobertura de las reglas críticas.
- [ ] Se añaden pruebas de regresión para errores corregidos.
- [ ] Las pruebas pueden ejecutarse repetidamente.
- [ ] Existe un comando documentado para ejecutar la suite.
- [ ] Los resultados informados corresponden a pruebas realmente ejecutadas.

## 20. Instrucción final para la IA

Al desarrollar o modificar el backend de Pasanaku Digital:

1. Identificar qué requisito se está implementando.
2. Determinar qué nivel o niveles de prueba corresponden.
3. Implementar la funcionalidad respetando la arquitectura existente.
4. Crear pruebas unitarias para las reglas aisladas.
5. Crear pruebas de integración para persistencia y colaboración entre componentes.
6. Crear pruebas de API para endpoints, validaciones y permisos.
7. Crear o actualizar pruebas E2E para los flujos críticos de usuario cuando la infraestructura esté disponible.
8. Incluir casos positivos, negativos y límites.
9. Ejecutar las pruebas y corregir los errores encontrados.
10. Informar qué pruebas se ejecutaron, cuáles pasaron, cuáles fallaron y cuáles quedan pendientes.

No inventar resultados de ejecución ni afirmar que la estrategia de testing está completa si existen niveles requeridos que todavía no se han implementado.

La prioridad es demostrar que las reglas del negocio funcionan correctamente, que los datos mantienen su integridad y que cada usuario solo puede realizar las acciones que le corresponden.
