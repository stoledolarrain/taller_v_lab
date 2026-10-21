---
name: django-testing
description: Write meaningful unit and integration tests for Pasanaku Digital using Django and Django REST Framework test tools.
---

# Skill: Pruebas unitarias y de integración

## Objetivo
Proteger las reglas reales del negocio y cumplir el criterio de evaluación del proyecto. Las pruebas no deben limitarse a getters, setters o comprobar que una vista responde 200.

## Herramientas
- Usar el framework de pruebas integrado de Django o pytest si ya forma parte del proyecto.
- Para endpoints DRF, usar `APIClient` o herramientas equivalentes.
- Usar datos de prueba explícitos y aislados.
- Usar mocks/stubs solo cuando convenga sustituir una dependencia externa; no simular la lógica de negocio que se pretende verificar.

## Reglas
1. Cada prueba debe comprobar un comportamiento observable.
2. Incluir casos positivos, negativos, límites y permisos.
3. No depender del orden en que se ejecutan las pruebas.
4. No depender de datos reales ni de una base de datos de producción.
5. Evitar pruebas que solo replican la implementación interna; probar resultados y efectos persistidos.
6. Dar nombres descriptivos a las pruebas.
7. No desactivar una prueba fallida para hacer pasar la suite.
8. Ejecutar las pruebas después de cambios de modelos, servicios, permisos y endpoints.
9. Si una prueba falla, encontrar la causa y corregirla; no cambiar la expectativa sin justificarlo.
10. Mantener instrucciones reproducibles para ejecutar pruebas.

## Pruebas unitarias requeridas por el proyecto
- Calcular total esperado de ronda correctamente.
- Generar la cantidad correcta de turnos.
- Impedir participantes duplicados.
- Comprobar que cada participante tenga exactamente un turno.
- Impedir aportes con montos inválidos.
- Determinar correctamente si hay cuotas pendientes.
- Impedir cerrar una ronda incompleta.
- Impedir avanzar al siguiente turno antes del cierre.
- Determinar cuándo el pasanaku puede finalizarse.
- Impedir modificaciones no permitidas después de iniciar el grupo.

## Pruebas de integración requeridas
- Crear usuario y verificar persistencia.
- Crear grupo y recuperar configuración.
- Unir participantes mediante código/invitación.
- Generar y persistir turnos.
- Crear cuotas para una ronda.
- Reportar y validar un aporte.
- Consultar participantes con pagos pendientes.
- Intentar cerrar ronda incompleta y verificar rechazo.
- Cerrar ronda completa y comprobar la habilitación/creación de la siguiente.
- Comprobar que un participante no puede ejecutar operaciones de administrador.
- Comprobar que un usuario ajeno no puede consultar un grupo privado.

## Ejemplo de prueba unitaria
```python
from decimal import Decimal
from django.test import SimpleTestCase

class CalculoRondaTests(SimpleTestCase):
    def test_total_esperado_es_cuota_por_participantes(self):
        monto_cuota = Decimal("200.00")
        participantes = 5
        total = monto_cuota * participantes
        self.assertEqual(total, Decimal("1000.00"))
```
Este ejemplo prueba el cálculo aritmético básico. Cuando exista una función de dominio real, la prueba debe llamar a esa función en vez de repetir la fórmula dentro del test.

## Ejemplo de prueba de API
```python
from rest_framework.test import APITestCase
from rest_framework import status

class AccesoPrivadoTests(APITestCase):
    def test_usuario_no_autenticado_no_accede_a_recurso_privado(self):
        response = self.client.get("/api/pasanakus/1/")
        self.assertIn(
            response.status_code,
            [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN],
        )
```
La URL y el código esperado deben coincidir con la configuración real de autenticación del proyecto.

## Cobertura y reporte
- Priorizar cobertura de reglas críticas y rutas de error.
- La cobertura porcentual puede ayudar, pero no demuestra por sí sola que el comportamiento sea correcto.
- Reportar qué pruebas se ejecutaron, cuántas pasaron y cuáles fallaron.
- No afirmar que todas pasan si no se ejecutaron.

## Comandos orientativos
```bash
python manage.py test
```
Si el proyecto usa pytest, utilizar la configuración y comandos acordados por el equipo.
