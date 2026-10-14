# Arquitectura y Diseño del Sistema — Pasanaku Digital

## 1. Visión General
Pasanaku Digital es una plataforma web para digitalizar la organización y trazabilidad del ahorro rotativo tradicional en Bolivia, asegurando inmutabilidad en las rondas, bloqueo por deuda y transparencia.

## 2. Diagrama de Estados del Grupo de Pasanaku

```text
 [BORRADOR] ───────────────> [INICIADO] ───────────────> [FINALIZADO]
 (Configuración editable,    (Reglas congeladas,         (Todos los turnos
  inscripción de miembros)    turnos fijados,             fueron cobrados y
                              rondas en curso)            rondas cerradas)
```

## 3. Modelo de Entidades Principales
- **User:** Integrante del sistema con C.I. y teléfono para contacto.
- **PasanakuGroup:** Grupo con cuota en Bs, periodicidad (semanal, quincenal, mensual) y cupos.
- **GroupMembership:** Relación unívoca entre un Usuario y un Grupo con rol (`ADMIN` o `PARTICIPANTE`).
- **PasanakuTurn (Módulo 3):** Asignación estricta de turno a cada miembro.
- **Round (Módulo 4 y 5):** Ciclo periódico de recaudación con un beneficiario asignado.
- **Contribution (Módulo 4 y 5):** Cuota individual por miembro (`PENDIENTE` o `PAGADA`).

## 4. Reglas Críticas del Negocio
1. Monto de cuota siempre mayor a 0.
2. Cupo mínimo de 2 integrantes.
3. Un usuario no puede estar duplicado en el mismo grupo.
4. Un beneficiario por turno (sin vacíos ni repetidos).
5. Prohibido cerrar una ronda con cuotas pendientes.
6. Aislamiento de seguridad: usuarios no miembros reciben `403 Forbidden` al consultar información del grupo.
