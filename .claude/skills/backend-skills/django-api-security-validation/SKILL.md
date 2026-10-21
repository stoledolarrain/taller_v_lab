---
name: django-api-security-validation
description: Validate API input and protect Pasanaku Digital against common authorization, data exposure, and configuration errors.
---

# Skill: Seguridad y validación de API

## Objetivo
Reducir errores de entrada y accesos indebidos sin agregar complejidad innecesaria al proyecto académico.

## Validación
1. Validar siempre en el servidor, aunque el frontend también valide.
2. Rechazar montos cero o negativos.
3. Validar opciones permitidas de periodicidad y estados.
4. Validar fechas y transiciones de estado.
5. Comprobar que las cantidades e identificadores estén dentro de rangos razonables.
6. Rechazar campos inesperados o de solo lectura cuando puedan alterar permisos, propietario, estado, fechas de validación o cierre.
7. Normalizar y validar códigos de invitación de forma consistente.
8. Devolver errores por campo cuando sea útil, sin incluir trazas internas.

## Autorización y privacidad
1. Requerir autenticación en endpoints privados.
2. Aplicar permisos por recurso y por membresía.
3. No confiar en que ocultar botones en el frontend protege la API.
4. Evitar exposición masiva de datos personales o financieros del grupo.
5. No incluir contraseñas, hashes, tokens o secretos en respuestas.
6. Revisar que los listados e historiales solo devuelvan datos que el usuario está autorizado a ver.
7. Evitar IDOR: cambiar un ID en la URL no debe permitir acceder a objetos de otro usuario/grupo.
8. No revelar si existe un recurso privado cuando eso facilite enumeración; seguir una política coherente de 403/404.

## Configuración segura
- Mantener `SECRET_KEY`, credenciales y claves fuera del repositorio.
- Usar variables de entorno y un archivo de ejemplo sin valores secretos.
- En producción, desactivar `DEBUG`, configurar `ALLOWED_HOSTS` y revisar CORS/CSRF según el mecanismo de autenticación.
- Usar HTTPS en despliegue.
- Mantener dependencias actualizadas de forma controlada.
- No activar CORS para cualquier origen sin una necesidad documentada.
- No guardar tokens en logs ni imprimir credenciales durante depuración.
- No ejecutar migraciones destructivas o comandos que borren datos sin confirmar el entorno y el impacto.

## Manejo de errores
- Capturar excepciones esperadas y devolver respuestas claras.
- No usar `except Exception` para ocultar fallos.
- No devolver traceback, rutas del servidor, consultas SQL ni variables de entorno.
- Registrar errores técnicos de forma segura, sin secretos ni datos personales innecesarios.

## Casos de seguridad para probar
- Sin token/sesión, acceder a endpoint privado.
- Token inválido o expirado, si aplica.
- Participante intenta validar un aporte.
- Participante intenta cerrar una ronda.
- Usuario ajeno intenta leer historial.
- Usuario cambia el ID de un objeto para acceder a otro grupo.
- Enviar `rol: "ADMIN"` al registrarse o unirse a un grupo.
- Enviar `estado: "FINALIZADO"` al crear un pasanaku.
- Enviar monto negativo o una periodicidad no admitida.
- Repetir una solicitud crítica para detectar duplicados.

## Buenas prácticas
- Revisar seguridad en cada endpoint nuevo, no solo al final.
- Mantener dependencias mínimas.
- No exponer errores internos al usuario final.
- Añadir pruebas de regresión para cada vulnerabilidad corregida.
