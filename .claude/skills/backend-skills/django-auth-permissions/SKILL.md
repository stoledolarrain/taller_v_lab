---
name: django-auth-permissions
description: Implement authentication, group membership checks, and role-based authorization for Pasanaku Digital.
---

# Skill: Autenticación y permisos

## Objetivo
Garantizar que cada persona acceda a su cuenta y que solo pueda ver y modificar los recursos autorizados. En Pasanaku Digital, los roles funcionales principales son participante y administrador del grupo.

## Conceptos que no se deben confundir
- **Autenticación:** comprobar quién es el usuario.
- **Autorización:** comprobar qué puede hacer ese usuario.
- **Pertenencia:** comprobar que el usuario es miembro del pasanaku específico.
- **Rol dentro del grupo:** comprobar si es administrador o participante de ese grupo.

Un usuario puede administrar un grupo y ser participante en otro. No asumir que existe un único rol global para todos los grupos.

## Reglas obligatorias
1. Usar el sistema de usuarios de Django o una configuración de usuario personalizada bien justificada. No crear un sistema de contraseñas casero.
2. Nunca almacenar contraseñas en texto plano ni implementar hash propio. Usar las herramientas de autenticación de Django.
3. Definir claramente el mecanismo de autenticación de la API (por ejemplo, sesión o token/JWT según la arquitectura acordada) y mantenerlo consistente.
4. Todas las operaciones privadas requieren autenticación.
5. Comprobar en el servidor la membresía del usuario en el grupo al que intenta acceder.
6. Solo el administrador de ese grupo puede configurar el grupo, administrar turnos, validar aportes y cerrar rondas, según los requisitos.
7. Un participante puede consultar sus cuotas, reportar un aporte y consultar turnos e historial permitidos, pero no validar su propio aporte ni cerrar rondas.
8. Un usuario que no pertenece al grupo no puede leer sus participantes, turnos, cuotas, aportes ni historial privado.
9. No confiar en `is_admin`, `role`, `user_id` ni `owner_id` enviados desde el frontend. Derivar la identidad del usuario autenticado y comprobar el rol guardado en base de datos.
10. Evitar IDOR (acceso a objetos cambiando el ID de la URL). Verificar permisos sobre cada objeto, no solo al iniciar sesión.
11. La creación de un grupo debe asignar al creador el rol de administrador de ese grupo desde el servidor.
12. No permitir que un usuario se agregue a sí mismo como administrador enviando un campo en el JSON.
13. Las respuestas no deben filtrar correos, datos personales ni registros privados que no sean necesarios.
14. Añadir pruebas que intenten realizar acciones permitidas y prohibidas con distintos usuarios.

## Matriz de permisos orientativa
| Acción | Administrador del grupo | Participante del grupo | Usuario ajeno |
|---|---|---|---|
| Ver información privada del grupo | Sí | Sí | No |
| Configurar grupo en BORRADOR | Sí | No | No |
| Invitar o gestionar miembros | Sí | Según reglas definidas | No |
| Definir/sortear turnos | Sí | No | No |
| Reportar su aporte | Sí, si participa | Sí | No |
| Validar aportes | Sí | No | No |
| Cerrar ronda | Sí, con reglas cumplidas | No | No |
| Ver sus cuotas e historial | Sí, si participa | Sí | No |

Ajustar la matriz si el equipo define reglas adicionales, sin contradecir los requisitos del proyecto.

## Ejemplo de permiso
```python
from rest_framework.permissions import BasePermission

class EsAdministradorDelPasanaku(BasePermission):
    def has_object_permission(self, request, view, obj):
        # Adaptar a los nombres reales de las relaciones.
        return obj.participantes.filter(
            usuario=request.user,
            rol="ADMIN"
        ).exists()
```
Este ejemplo presupone una relación y un campo de rol ilustrativos. Verificar el modelo real antes de usarlo. En acciones sobre cuotas o rondas, comprobar el grupo relacionado con el objeto.

## Casos de prueba obligatorios
- Usuario no autenticado intenta acceder a un endpoint privado.
- Usuario A intenta consultar el grupo de usuario B.
- Participante intenta validar un aporte.
- Participante intenta cerrar una ronda.
- Usuario cambia el ID de una cuota para acceder a una cuota de otro grupo.
- Administrador de un grupo intenta administrar otro grupo del que no es administrador.
- El creador del grupo queda asignado como administrador.
- Un participante sí puede consultar sus propias cuotas.

## Buenas prácticas
- Reutilizar permisos y funciones de autorización.
- Filtrar querysets por membresía cuando corresponda y aplicar permisos de objeto.
- Mantener pruebas para cada rol y grupo.
- Usar mensajes de error que no revelen datos de recursos privados.
