---
name: django-rest-api
description: Build consistent REST endpoints with Django REST Framework for Pasanaku Digital.
---

# Skill: API REST con Django REST Framework

## Objetivo
Diseñar una API JSON predecible para que el frontend gestione usuarios, grupos de pasanaku, participantes, invitaciones, turnos, rondas, cuotas, aportes e historial.

## Reglas obligatorias
1. Inspeccionar las rutas y convenciones existentes antes de añadir endpoints.
2. Usar DRF si está instalado o si se acuerda usarlo; no mezclar innecesariamente vistas Django tradicionales y DRF.
3. Mantener una responsabilidad clara por endpoint y recurso.
4. Usar serializers para validar entradas y controlar qué campos se exponen. Nunca serializar indiscriminadamente campos privados.
5. No confiar en identificadores enviados por el cliente: comprobar en servidor que el usuario puede acceder al recurso y realizar la acción.
6. No aceptar del cliente campos que debe controlar el servidor, como propietario, rol administrativo, fecha de validación o estado de cierre, sin una regla explícita.
7. Usar códigos HTTP apropiados:
   - `200 OK`: consulta o acción exitosa con respuesta.
   - `201 Created`: recurso creado.
   - `204 No Content`: operación exitosa sin cuerpo.
   - `400 Bad Request`: entrada inválida o regla de negocio incumplida.
   - `401 Unauthorized`: falta autenticación válida.
   - `403 Forbidden`: usuario autenticado sin permiso.
   - `404 Not Found`: recurso inexistente o que no debe revelarse.
   - `409 Conflict`: conflicto con el estado actual, si la convención de la API lo adopta.
8. Mantener un formato coherente de errores y respuestas. Documentar cualquier convención especial.
9. Usar paginación en listados que puedan crecer; no devolver historiales ilimitados por defecto.
10. No cambiar el contrato de la API sin actualizar documentación, pruebas y frontend.

## Recursos y rutas sugeridos
Adaptar nombres a las convenciones existentes. Por ejemplo:
```text
/api/auth/registro/
/api/auth/login/
/api/pasanakus/
/api/pasanakus/{id}/
/api/pasanakus/{id}/participantes/
/api/pasanakus/{id}/invitaciones/
/api/pasanakus/{id}/turnos/
/api/pasanakus/{id}/iniciar/
/api/pasanakus/{id}/rondas/
/api/rondas/{id}/cuotas/
/api/cuotas/{id}/reportar-aporte/
/api/aportes/{id}/validar/
/api/rondas/{id}/cerrar/
/api/pasanakus/{id}/historial/
```
Estas son rutas ilustrativas, no rutas obligatorias si el proyecto ya define otras.

## Ejemplo de serializer
```python
from rest_framework import serializers
from .models import Pasanaku

class PasanakuSerializer(serializers.ModelSerializer):
    class Meta:
        model = Pasanaku
        fields = [
            "id", "nombre", "descripcion", "monto_cuota",
            "periodicidad", "fecha_inicio", "estado",
        ]
        read_only_fields = ["id", "estado"]
```
La lista de campos debe ajustarse a los nombres reales del modelo. No copiar el ejemplo sin verificar el proyecto.

## Ejemplo de vista con permiso
```python
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response

class MisPasanakusView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Filtrar desde la consulta por los grupos a los que pertenece
        # el usuario. No obtener todos y filtrar solamente en el frontend.
        ...
```

## Validación y errores
- Validar tipos, campos obligatorios, rangos, fechas y estados en el servidor.
- Los montos de cuota deben ser mayores que cero.
- La periodicidad solo puede ser una opción permitida: semanal, quincenal o mensual, de acuerdo con los requisitos.
- No permitir que un cliente defina arbitrariamente el estado `FINALIZADO`.
- No devolver trazas de Python ni detalles internos en producción.
- No usar `print()` para depuración permanente.

## Buenas prácticas
- Definir filtros de queryset que limiten los recursos al usuario autorizado.
- Mantener nombres de campos y tipos estables.
- Usar `get_object_or_404` o mecanismos equivalentes cuando corresponda, junto con autorización.
- Probar cada endpoint con autenticación, datos válidos, datos inválidos y usuarios sin permiso.
- Documentar método, URL, autenticación, cuerpo de petición, respuesta y errores.

## Checklist de endpoint
- [ ] Ruta y método HTTP apropiados.
- [ ] Autenticación y permisos configurados.
- [ ] Serializer valida entradas y limita campos.
- [ ] Queryset no filtra datos de otros grupos.
- [ ] Respuestas y errores coherentes.
- [ ] Pruebas positivas y negativas.
