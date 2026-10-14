"""
Plantilla de referencia para la creación de un servicio en Django.
Ubicación típica: apps/<modulo>/services.py
"""
from typing import Any, Dict
from django.db import transaction
from rest_framework.exceptions import ValidationError, PermissionDenied
from apps.authentication.models import User


@transaction.atomic
def ejemplo_service(
    *,
    user: User,
    parametro_requerido: str,
    monto: float = 0.0
) -> Dict[str, Any]:
    """
    Descripción clara de la acción de negocio.
    """
    # 1. Validaciones previas de negocio
    if monto <= 0:
        raise ValidationError({'monto': 'El monto debe ser estrictamente mayor a 0.'})

    # 2. Mutaciones en la base de datos dentro de la transacción atómica
    # objeto = Modelo.objects.create(...)
    
    # 3. Retorno del objeto o datos resultantes
    return {
        'status': 'success',
        'resultado': parametro_requerido
    }
