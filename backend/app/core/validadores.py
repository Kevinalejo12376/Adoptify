"""Validadores compartidos de campos (backend = fuente de verdad).

Estas funciones se usan en los esquemas Pydantic para garantizar que las reglas
de negocio (nombres, correos, teléfonos, contraseñas, permisos) sean idénticas
en toda la API y nunca dependan únicamente de las validaciones del cliente.

Cada función devuelve el valor normalizado (o ``None`` si el campo es opcional
y viene vacío) y lanza ``ValueError`` con un mensaje específico cuando el valor
no es válido (Pydantic lo convierte en error 422).
"""
import re

# Solo letras (incluye tildes, ñ, ü) y apóstrofes; palabras separadas por UN espacio.
NOMBRE_REGEX = re.compile(r"^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ']+(?: [A-Za-zÁÉÍÓÚÜÑáéíóúüñ']+)*$")
EMAIL_REGEX = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


def _esta_vacio(valor) -> bool:
    return valor is None or str(valor).strip() == ""


def validar_nombre(valor, campo="nombre", requerido=False):
    """Normaliza (espacios) y valida un nombre/apellido.

    Reglas: sin números ni caracteres especiales (se permiten tildes y ñ),
    sin espacios al inicio/final, 2-60 caracteres. Con ``requerido=True`` el
    campo vacío lanza el error "El <campo> es obligatorio".
    """
    if _esta_vacio(valor):
        if requerido:
            raise ValueError(f"El {campo} es obligatorio")
        return None
    limpio = re.sub(r"\s+", " ", str(valor)).strip()
    if len(limpio) < 2:
        raise ValueError(f"El {campo} debe tener al menos 2 caracteres")
    if len(limpio) > 60:
        raise ValueError(f"El {campo} no puede superar los 60 caracteres")
    if not NOMBRE_REGEX.match(limpio):
        if re.search(r"\d", limpio):
            raise ValueError(f"El {campo} no puede contener números")
        raise ValueError(f"El {campo} solo puede contener letras (se permiten tildes y ñ)")
    return limpio


def validar_nombre_comercial(valor, campo="nombre"):
    """Valida nombres de entidades (tienda, refugio, producto).

    Admite letras y números, 2-100 caracteres; exige al menos una letra.
    """
    if _esta_vacio(valor):
        return None
    limpio = re.sub(r"\s+", " ", str(valor)).strip()
    if len(limpio) < 2:
        raise ValueError(f"El {campo} debe tener al menos 2 caracteres")
    if len(limpio) > 100:
        raise ValueError(f"El {campo} no puede superar los 100 caracteres")
    if not re.search(r"[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]", limpio):
        raise ValueError(f"El {campo} debe contener al menos una letra")
    return limpio


def validar_email(valor):
    """Normaliza (minúsculas, sin espacios) y valida un correo. """
    if _esta_vacio(valor):
        return None
    limpio = str(valor).strip().lower()
    if len(limpio) > 254:
        raise ValueError("El correo electrónico no puede superar los 254 caracteres")
    if not EMAIL_REGEX.match(limpio):
        raise ValueError("Ingresa un correo electrónico válido")
    return limpio


def validar_telefono(valor):
    """Valida un teléfono: solo números (7-15 dígitos), "+" opcional al inicio.

    Se ignoran separadores comunes (espacios, guiones, paréntesis) al contar
    los dígitos, pero no se permiten letras ni otros caracteres especiales.
    """
    if _esta_vacio(valor):
        return None
    sin_separadores = re.sub(r"[\s\-()]", "", str(valor).strip())
    sin_signo = sin_separadores[1:] if sin_separadores.startswith("+") else sin_separadores
    if not sin_signo.isdigit():
        raise ValueError("El teléfono solo puede contener números")
    if not (7 <= len(sin_signo) <= 15):
        raise ValueError("El teléfono debe tener entre 7 y 15 dígitos")
    return sin_separadores


def validar_telefono_admin(valor):
    """Teléfono de administrador: solo dígitos, entre 7 y 10 caracteres.

    No admite "+", espacios, guiones ni paréntesis; únicamente números.
    """
    if _esta_vacio(valor):
        raise ValueError("El teléfono es obligatorio")
    limpio = str(valor).strip()
    if not limpio.isdigit():
        raise ValueError("El teléfono solo puede contener números")
    if len(limpio) > 10:
        raise ValueError("El teléfono no puede superar los 10 dígitos")
    if len(limpio) < 7:
        raise ValueError("El teléfono debe tener al menos 7 dígitos")
    return limpio


def validar_password(valor):
    """Política de contraseña: 8-72 caracteres; mayúscula, minúscula, número
    y carácter especial."""
    if valor is None:
        return None
    if len(valor) < 8:
        raise ValueError("La contraseña debe tener al menos 8 caracteres")
    if len(valor) > 72:
        raise ValueError("La contraseña no puede superar los 72 caracteres")
    faltantes = []
    if not re.search(r"[A-Z]", valor):
        faltantes.append("una mayúscula")
    if not re.search(r"[a-z]", valor):
        faltantes.append("una minúscula")
    if not re.search(r"[0-9]", valor):
        faltantes.append("un número")
    if not re.search(r"[^A-Za-z0-9]", valor):
        faltantes.append("un carácter especial")
    if faltantes:
        raise ValueError("La contraseña debe contener al menos una mayúscula, una minúscula, un número y un carácter especial")
    return valor


def validar_telefono_empleado(valor):
    """Teléfono de empleado/refugio (Colombia): exactamente 10 dígitos, solo números.

    No admite letras, espacios, guiones ni símbolos. Es la regla estricta de
    los formularios del rol Refugio.
    """
    if _esta_vacio(valor):
        return None
    limpio = str(valor).strip()
    if not limpio.isdigit():
        raise ValueError("El teléfono solo puede contener números")
    if len(limpio) != 10:
        raise ValueError("El teléfono debe contener exactamente 10 números")
    return limpio


def validar_permisos(codigos, obligatorio=True):
    """Valida que se asigne al menos un permiso."""
    if codigos is None:
        if obligatorio:
            raise ValueError("Debes asignar al menos un permiso al administrador")
        return codigos
    if not codigos:
        raise ValueError("Debes asignar al menos un permiso al administrador")
    return list(dict.fromkeys(codigos))
