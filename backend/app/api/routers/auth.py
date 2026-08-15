# pyrefly: ignore [missing-import]
import logging
# pyrefly: ignore [missing-import]
from datetime import timedelta, datetime, timezone
# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException, status
# pyrefly: ignore [missing-import]
from fastapi.security import OAuth2PasswordRequestForm
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session
# pyrefly: ignore [missing-import]
from pydantic import BaseModel, ValidationError
# pyrefly: ignore [missing-import]
from google.oauth2 import id_token
# pyrefly: ignore [missing-import]
from google.auth.transport import requests as google_requests

logger = logging.getLogger(__name__)

from app.db.database import get_db
from app.core.config import settings
from app.core.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    get_current_user,
)
from app.core.lookups import id_por_codigo
from app.core.notificaciones import notificar_admins, registrar_auditoria
from app.core.email import (
    enviar_correo_bienvenida,
    enviar_codigo_verificacion,
)
from app.models.usuario import Usuario
from app.models.refugio import Refugio, RefugioEmpleado, RefugioPermiso
from app.models.catalogos import Rol, TipoDocumento
from app.models.verificacion import CodigoVerificacion
from app.schemas.usuario import (
    UsuarioCreate,
    UsuarioResponse,
    ProfileUpdate,
    ProfileResponse,
    EnviarCodigoRequest,
    VerificarCodigoRequest,
    RegistrarConCodigoRequest,
    ResetPasswordRequest,
)
from app.schemas.token import Token
from app.schemas.serializers import serialize_usuario


class GoogleLoginRequest(BaseModel):
    credential: str

router = APIRouter()


def _slugify(texto: str) -> str:
    base = "".join(c.lower() if c.isalnum() else "-" for c in texto).strip("-")
    while "--" in base:
        base = base.replace("--", "-")
    return base or "refugio"


# ─── Helper: crear usuario en BD (reutilizado por register y verify-register) ───

def _crear_usuario(db: Session, payload: UsuarioCreate) -> Usuario:
    """Crea un usuario (y refugio si aplica) en la base de datos.
    No hace commit — la transacción debe ser manejada por el llamador.
    """
    # Resuelve el rol (por codigo o nombre); por defecto 'usuario'.
    rol_obj = (
        db.query(Rol)
        .filter((Rol.codigo == payload.rol) | (Rol.nombre.ilike(payload.rol)))
        .first()
    )
    if rol_obj is None or rol_obj.codigo not in ("usuario", "refugio"):
        rol_obj = db.query(Rol).filter(Rol.codigo == "usuario").first()
    if rol_obj is None:
        raise HTTPException(status_code=500, detail="Catalogo de roles no inicializado")

    tipo_doc_id = id_por_codigo(db, TipoDocumento, payload.tipo_documento)

    user = Usuario(
        nombre=payload.nombre,
        apellido=payload.apellido,
        tipo_documento_id=tipo_doc_id,
        numero_documento=payload.numero_documento,
        telefono=payload.telefono,
        email=payload.email,
        hashed_password=get_password_hash(payload.password),
        rol_id=rol_obj.id,
        ubicacion=payload.ubicacion,
    )
    db.add(user)
    db.flush()  # obtiene user.id sin cerrar la transaccion

    if rol_obj.codigo == "refugio":
        nombre_refugio = payload.nombre_refugio or f"{payload.nombre} {payload.apellido or ''}".strip()
        slug = _slugify(nombre_refugio)
        if db.query(Refugio).filter(Refugio.slug == slug).first():
            slug = f"{slug}-{user.id}"
        db.add(Refugio(
            usuario_id=user.id,
            nombre=nombre_refugio,
            slug=slug,
            telefono=payload.telefono,
            email=payload.email,
            ubicacion=payload.ubicacion,
        ))

    db.flush()

    # Notifica a los admins del nuevo registro
    tipo_notif = "nuevo_refugio" if rol_obj.codigo == "refugio" else "nuevo_usuario"
    etiqueta = "refugio" if rol_obj.codigo == "refugio" else "usuario"
    notificar_admins(
        db,
        tipo=tipo_notif,
        mensaje=f"Nuevo {etiqueta} registrado: {payload.nombre} {payload.apellido or ''}".strip(),
        enlace=f"/admin/{etiqueta}s",
    )
    registrar_auditoria(db, user.id, "registro", "usuarios", user.id, f"Registro como {etiqueta}")

    return user


# ─── Endpoint: Enviar código de verificación ─────────────────────────────────

@router.post("/send-code", status_code=status.HTTP_200_OK)
def enviar_codigo(payload: EnviarCodigoRequest, db: Session = Depends(get_db)):
    """Envía un código de verificación de 6 dígitos al correo electrónico.

    Para tipo 'registro': verifica que el email no esté ya registrado.
    Para tipo 'reset_password': verifica que el email SÍ exista en la BD.
    """
    email = payload.email.strip().lower()
    tipo = payload.tipo

    if tipo not in ("registro", "reset_password"):
        raise HTTPException(status_code=400, detail="Tipo de código inválido. Usa 'registro' o 'reset_password'")

    # Validar existencia del usuario según el tipo
    usuario_existente = db.query(Usuario).filter(Usuario.email == email).first()

    if tipo == "registro" and usuario_existente:
        raise HTTPException(status_code=400, detail="El correo ya está registrado")

    if tipo == "reset_password" and not usuario_existente:
        raise HTTPException(status_code=404, detail="No existe una cuenta con este correo electrónico")

    # Invalidar códigos anteriores no usados del mismo email y tipo
    # Así cada email tiene solo 1 código vigente a la vez
    now = datetime.now(timezone.utc)
    db.query(CodigoVerificacion).filter(
        CodigoVerificacion.email == email,
        CodigoVerificacion.tipo == tipo,
        CodigoVerificacion.usado == False,
        CodigoVerificacion.expira_en > now,
    ).update({"usado": True})
    db.flush()

    # Generar código de 6 dígitos
    import random
    codigo = "".join(random.choices("0123456789", k=6))

    # Guardar en BD (expira en 10 minutos)
    expiracion = datetime.now(timezone.utc) + timedelta(minutes=10)
    verif = CodigoVerificacion(
        email=email,
        codigo=codigo,
        tipo=tipo,
        usado=False,
        expira_en=expiracion,
    )
    db.add(verif)
    db.commit()

    # Enviar correo
    nombre_usuario = payload.nombre or (usuario_existente.nombre if usuario_existente else "")
    ok = enviar_codigo_verificacion(
        email_destino=email,
        codigo=codigo,
        tipo=tipo,
        nombre=nombre_usuario,
    )

    if not ok:
        logger.warning("Código generado pero NO se pudo enviar el correo a %s (Brevo no configurado?)", email)
        # Aún así devolvemos éxito, pero el frontend puede mostrar advertencia
        return {
            "mensaje": "Código generado pero no se pudo enviar el correo. Verifica la configuración de Brevo.",
            "enviado": False,
            "debug_codigo": codigo if not settings.BREVO_API_KEY else None,
        }

    return {
        "mensaje": f"Código de verificación enviado a {email}",
        "enviado": True,
    }


# ─── Endpoint: Verificar código (genérico) ───────────────────────────────────

@router.post("/verify-code", status_code=status.HTTP_200_OK)
def verificar_codigo(payload: VerificarCodigoRequest, db: Session = Depends(get_db)):
    """Verifica si un código de 6 dígitos es válido para el email dado.
    No consume el código (solo valida). El código se consume al registrar o resetear.
    """
    email = payload.email.strip().lower()
    codigo = payload.codigo.strip()

    now = datetime.now(timezone.utc)
    registro = (
        db.query(CodigoVerificacion)
        .filter(
            CodigoVerificacion.email == email,
            CodigoVerificacion.codigo == codigo,
            CodigoVerificacion.usado == False,
            CodigoVerificacion.expira_en > now,
        )
        .order_by(CodigoVerificacion.creado_en.desc())
        .first()
    )

    if not registro:
        raise HTTPException(status_code=400, detail="Código inválido o expirado")

    return {"valido": True, "mensaje": "Código válido"}


# ─── Endpoint: Registrar con código de verificación ──────────────────────────

@router.post("/register", response_model=UsuarioResponse, status_code=status.HTTP_201_CREATED)
def register_user(payload: UsuarioCreate, db: Session = Depends(get_db)):
    """Registro directo (sin verificación de código).
    Se mantiene por compatibilidad. Para registro con verificación, usar /verify-register.
    """
    existing = db.query(Usuario).filter(Usuario.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="El correo ya esta registrado")

    user = _crear_usuario(db, payload)
    db.commit()
    db.refresh(user)

    # Envia correo de bienvenida al usuario
    try:
        ok = enviar_correo_bienvenida(
            email_destino=user.email,
            nombre=payload.nombre,
            apellido=payload.apellido,
        )
        if ok:
            logger.info("Correo de bienvenida ENVIADO a %s", user.email)
        else:
            logger.warning("Correo de bienvenida NO enviado a %s (Brevo no configurado?)", user.email)
    except Exception as exc:
        logger.error("Error al enviar correo de bienvenida a %s: %s", user.email, exc)

    return serialize_usuario(user)


# ─── Endpoint: Registrar con verificación de código ──────────────────────────

@router.post("/verify-register", response_model=UsuarioResponse, status_code=status.HTTP_201_CREATED)
def verify_register(payload: RegistrarConCodigoRequest, db: Session = Depends(get_db)):
    """Registra un nuevo usuario después de verificar el código de 6 dígitos enviado al email."""
    email = payload.email.strip().lower()
    codigo = payload.codigo_verificacion.strip()

    # 1. Verificar que el email no esté ya registrado
    existing = db.query(Usuario).filter(Usuario.email == email).first()
    if existing:
        raise HTTPException(status_code=400, detail="El correo ya esta registrado")

    # 2. Validar el código de verificación
    now = datetime.now(timezone.utc)
    registro_codigo = (
        db.query(CodigoVerificacion)
        .filter(
            CodigoVerificacion.email == email,
            CodigoVerificacion.codigo == codigo,
            CodigoVerificacion.tipo == "registro",
            CodigoVerificacion.usado == False,
            CodigoVerificacion.expira_en > now,
        )
        .order_by(CodigoVerificacion.creado_en.desc())
        .first()
    )

    if not registro_codigo:
        raise HTTPException(
            status_code=400,
            detail="Código de verificación inválido o expirado. Solicita uno nuevo.",
        )

    # 3. Marcar código como usado
    registro_codigo.usado = True

    # 4. Crear el usuario
    user_payload = UsuarioCreate(
        nombre=payload.nombre,
        apellido=payload.apellido,
        email=email,
        password=payload.password,
        telefono=payload.telefono,
        tipo_documento=payload.tipo_documento,
        numero_documento=payload.numero_documento,
        rol=payload.rol,
        ubicacion=payload.ubicacion,
        nombre_refugio=payload.nombre_refugio,
    )
    user = _crear_usuario(db, user_payload)
    db.commit()
    db.refresh(user)

    # 5. Enviar correo de bienvenida
    try:
        ok = enviar_correo_bienvenida(
            email_destino=user.email,
            nombre=payload.nombre,
            apellido=payload.apellido,
        )
        if ok:
            logger.info("Correo de bienvenida ENVIADO a %s", user.email)
        else:
            logger.warning("Correo de bienvenida NO enviado a %s (Brevo no configurado?)", user.email)
    except Exception as exc:
        logger.error("Error al enviar correo de bienvenida a %s: %s", user.email, exc)

    return serialize_usuario(user)


# ─── Endpoint: Olvidé mi contraseña ──────────────────────────────────────────

@router.post("/forgot-password", status_code=status.HTTP_200_OK)
def forgot_password(payload: EnviarCodigoRequest, db: Session = Depends(get_db)):
    """Envía un código de 6 dígitos al correo para restablecer la contraseña.
    Es un alias de /send-code con tipo='reset_password'.
    """
    email = payload.email.strip().lower()

    # Validar que el usuario existe
    usuario_existente = db.query(Usuario).filter(Usuario.email == email).first()
    if not usuario_existente:
        raise HTTPException(status_code=404, detail="No existe una cuenta con este correo electrónico")

    # Invalidar códigos anteriores no usados del mismo email
    now = datetime.now(timezone.utc)
    db.query(CodigoVerificacion).filter(
        CodigoVerificacion.email == email,
        CodigoVerificacion.tipo == "reset_password",
        CodigoVerificacion.usado == False,
        CodigoVerificacion.expira_en > now,
    ).update({"usado": True})
    db.flush()

    # Generar código de 6 dígitos
    import random
    codigo = "".join(random.choices("0123456789", k=6))

    # Guardar en BD (expira en 10 minutos)
    expiracion = datetime.now(timezone.utc) + timedelta(minutes=10)
    verif = CodigoVerificacion(
        email=email,
        codigo=codigo,
        tipo="reset_password",
        usado=False,
        expira_en=expiracion,
    )
    db.add(verif)
    db.commit()

    logger.info("Código de recuperación generado para %s: %s", email, codigo)

    # Enviar correo
    ok = enviar_codigo_verificacion(
        email_destino=email,
        codigo=codigo,
        tipo="reset_password",
        nombre=usuario_existente.nombre,
    )

    if not ok:
        logger.error("Código generado pero FALLÓ el envío del correo a %s", email)
        return {
            "mensaje": "Código generado pero no se pudo enviar el correo. Verifica la configuración de Brevo.",
            "enviado": False,
        }

    logger.info("Correo de recuperación ENVIADO exitosamente a %s", email)
    return {
        "mensaje": f"Código de verificación enviado a {email}",
        "enviado": True,
    }


# ─── Endpoint: Restablecer contraseña con código ─────────────────────────────

@router.post("/reset-password", status_code=status.HTTP_200_OK)
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    """Restablece la contraseña usando un código de verificación de 6 dígitos."""
    email = payload.email.strip().lower()
    codigo = payload.codigo.strip()
    new_password = payload.new_password

    if len(new_password) < 6:
        raise HTTPException(status_code=400, detail="La contraseña debe tener al menos 6 caracteres")

    # 1. Buscar usuario
    user = db.query(Usuario).filter(Usuario.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="No existe una cuenta con este correo electrónico")

    # 2. Validar el código
    now = datetime.now(timezone.utc)
    registro_codigo = (
        db.query(CodigoVerificacion)
        .filter(
            CodigoVerificacion.email == email,
            CodigoVerificacion.codigo == codigo,
            CodigoVerificacion.tipo == "reset_password",
            CodigoVerificacion.usado == False,
            CodigoVerificacion.expira_en > now,
        )
        .order_by(CodigoVerificacion.creado_en.desc())
        .first()
    )

    if not registro_codigo:
        raise HTTPException(
            status_code=400,
            detail="Código de verificación inválido o expirado. Solicita uno nuevo.",
        )

    # 3. Marcar código como usado
    registro_codigo.usado = True

    # 4. Actualizar contraseña
    user.hashed_password = get_password_hash(new_password)
    db.commit()

    logger.info("Contraseña restablecida exitosamente para %s", email)
    return {"mensaje": "Contraseña restablecida exitosamente"}


# ─── Endpoint: Cambiar contraseña (estando autenticado) ──────────────────────

class CambiarPasswordRequest(BaseModel):
    password_actual: str
    password_nueva: str


@router.post("/change-password", status_code=status.HTTP_200_OK)
def change_password(
    payload: CambiarPasswordRequest,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Cambia la contraseña del usuario autenticado.
    Requiere la contraseña actual para verificar la identidad.
    """
    if not verify_password(payload.password_actual, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="La contraseña actual no es correcta")

    if len(payload.password_nueva) < 6:
        raise HTTPException(status_code=400, detail="La nueva contraseña debe tener al menos 6 caracteres")

    current_user.hashed_password = get_password_hash(payload.password_nueva)
    db.commit()

    logger.info("Contraseña cambiada exitosamente para usuario %s", current_user.email)
    return {"mensaje": "Contraseña cambiada exitosamente"}


# ─── Endpoints existentes (login, me, profile, google) ───────────────────────

@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # El campo "username" del formulario OAuth2 contiene el email.
    user = db.query(Usuario).filter(Usuario.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Correo o contrasena incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.activo:
        # Cuenta desactivada (soft delete): no puede iniciar sesión.
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tu cuenta está desactivada",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(
        data={"sub": user.email},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me")
def read_me(current_user: Usuario = Depends(get_current_user), db: Session = Depends(get_db)):
    """Devuelve el usuario autenticado con la forma que espera el frontend."""
    nombre_completo = f"{current_user.nombre} {current_user.apellido or ''}".strip()
    rol_codigo = current_user.rol_codigo
    data = {
        "id": current_user.id,
        "name": nombre_completo,
        "nombre": nombre_completo,
        "apellido": current_user.apellido,
        "email": current_user.email,
        "phone": current_user.telefono,
        "location": current_user.ubicacion,
        "role": rol_codigo,
        "rol": rol_codigo,
        "estado": "activo" if current_user.activo else "inactivo",
        "creado_en": current_user.creado_en.isoformat() if current_user.creado_en else None,
        "settings": {"storeEnabled": False},
    }
    # Para administradores, entrega los permisos que espera el panel admin.
    if rol_codigo in ("administrador", "administrador_principal"):
        todos = rol_codigo == "administrador_principal"
        data["permisos"] = {
            "usuarios": True, "refugios": True, "mascotas": True,
            "marketplace": todos, "pedidos": todos, "foro": True,
            "reportes": True, "pqrs": True, "estadisticas": todos,
            "administradores": todos, "configuracion": todos,
        }
    if rol_codigo in ("refugio", "empleado_refugio"):
        refugio = None
        es_representante = False
        if rol_codigo == "refugio":
            # Representante: el refugio es el que está vinculado a su cuenta.
            refugio = db.query(Refugio).filter(Refugio.usuario_id == current_user.id).first()
            es_representante = refugio is not None
        else:
            # Empleado de refugio: se busca su vínculo activo (refugio_empleados).
            vinculo = (
                db.query(RefugioEmpleado)
                .filter(
                    RefugioEmpleado.usuario_id == current_user.id,
                    RefugioEmpleado.activo == True,
                )
                .first()
            )
            if vinculo:
                refugio = vinculo.refugio
        if refugio:
            # El nombre mostrado en el avatar: para el representante es el nombre
            # del refugio; para el empleado es su propio nombre (el nombre del
            # refugio se expone aparte como shelterName).
            if not es_representante:
                data["name"] = nombre_completo
                data["shelterName"] = refugio.nombre
            else:
                data["name"] = refugio.nombre
            data["shelterId"] = refugio.id
            data["description"] = refugio.descripcion
            data["address"] = refugio.direccion
            data["location"] = refugio.ubicacion or current_user.ubicacion
            data["settings"] = {"storeEnabled": bool(refugio.tienda_habilitada)}
            data["es_representante"] = es_representante
            # Permisos reales desde la BD: el representante tiene todos los
            # activos; el empleado solo los que le asignó el representante.
            if es_representante:
                data["permisos"] = [
                    p.codigo
                    for p in db.query(RefugioPermiso)
                    .filter(RefugioPermiso.activo == True)
                    .all()
                ]
            else:
                data["permisos"] = [p.permiso.codigo for p in vinculo.permisos]
    if rol_codigo == "tienda_aliada":
        from app.models.tienda import Tienda
        tienda = db.query(Tienda).filter(Tienda.usuario_id == current_user.id).first()
        if tienda:
            data["name"] = tienda.nombre
            data["storeId"] = tienda.id
            data["storeName"] = tienda.nombre
            data["storeSlug"] = tienda.slug
            data["description"] = tienda.descripcion
            data["location"] = tienda.ciudad or tienda.ubicacion
            data["phone"] = tienda.telefono or current_user.telefono
            data["settings"] = {"storeEnabled": True}
    return data


@router.get("/profile", response_model=ProfileResponse)
def get_profile(current_user: Usuario = Depends(get_current_user), db: Session = Depends(get_db)):
    """Devuelve el perfil completo del usuario autenticado."""
    tipo_doc = current_user.tipo_documento.codigo if current_user.tipo_documento else None
    return ProfileResponse(
        id=current_user.id,
        nombre=current_user.nombre,
        apellido=current_user.apellido,
        email=current_user.email,
        telefono=current_user.telefono,
        tipo_documento=tipo_doc,
        numero_documento=current_user.numero_documento,
        ubicacion=current_user.ubicacion,
        bio=current_user.bio,
        website=current_user.website,
        avatar_url=current_user.avatar_url,
        cover_url=current_user.cover_url,
        twitter=current_user.twitter,
        instagram=current_user.instagram,
        perfil_completo=current_user.perfil_completo if hasattr(current_user, "perfil_completo") else False,
    )


@router.put("/profile", response_model=ProfileResponse)
def update_profile(
    payload: ProfileUpdate,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Actualiza los datos del perfil del usuario autenticado.

    Si el usuario completa todos los campos opcionales requeridos,
    se marca automaticamente como perfil_completo = True.
    """
    update_data = payload.model_dump(exclude_unset=True)

    # Actualizar solo los campos enviados
    for field, value in update_data.items():
        if value is not None:
            setattr(current_user, field, value)

    # Verificar si el perfil esta completo (campos minimos deseables)
    # Consideramos "completo" si tiene bio, telefono, ubicacion y al menos
    # uno de: website, twitter, instagram
    tiene_bio = bool(current_user.bio and current_user.bio.strip())
    tiene_telefono = bool(current_user.telefono and current_user.telefono.strip())
    tiene_ubicacion = bool(current_user.ubicacion and current_user.ubicacion.strip())
    tiene_social = bool(
        (current_user.website and current_user.website.strip())
        or (current_user.twitter and current_user.twitter.strip())
        or (current_user.instagram and current_user.instagram.strip())
    )

    if tiene_bio and tiene_telefono and tiene_ubicacion and tiene_social:
        current_user.perfil_completo = True
    else:
        current_user.perfil_completo = False

    db.commit()
    db.refresh(current_user)

    tipo_doc = current_user.tipo_documento.codigo if current_user.tipo_documento else None
    return ProfileResponse(
        id=current_user.id,
        nombre=current_user.nombre,
        apellido=current_user.apellido,
        email=current_user.email,
        telefono=current_user.telefono,
        tipo_documento=tipo_doc,
        numero_documento=current_user.numero_documento,
        ubicacion=current_user.ubicacion,
        bio=current_user.bio,
        website=current_user.website,
        avatar_url=current_user.avatar_url,
        cover_url=current_user.cover_url,
        twitter=current_user.twitter,
        instagram=current_user.instagram,
        perfil_completo=current_user.perfil_completo,
    )


@router.post("/google", response_model=Token)
def google_login(payload: GoogleLoginRequest, db: Session = Depends(get_db)):
    """Intercambia un credential token de Google Identity Services por un JWT de Adoptify.

    - Verifica el token con google-auth.
    - Si el email ya existe en la BD, vincula el google_id (si no lo está ya).
    - Si no existe, crea un usuario nuevo con los datos de Google.
    - Devuelve un access_token JWT estándar.
    """
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="El inicio de sesion con Google no esta configurado en el servidor",
        )

    try:
        # Verificar el token de Google usando google-auth
        info = id_token.verify_oauth2_token(
            payload.credential,
            google_requests.Request(),
            settings.GOOGLE_CLIENT_ID,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token de Google invalido: {exc}",
        )

    google_sub = info.get("sub")
    google_email = info.get("email", "")
    google_name = info.get("name", "")
    google_picture = info.get("picture", "")

    if not google_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google no proporciono un correo electronico",
        )

    # Dividir nombre completo en nombre y apellido
    parts = google_name.split(" ", 1)
    given_name = parts[0] if parts else google_email.split("@")[0]
    family_name = parts[1] if len(parts) > 1 else ""

    # Buscar por google_id primero, luego por email
    user = db.query(Usuario).filter(Usuario.google_id == google_sub).first()
    if not user:
        user = db.query(Usuario).filter(Usuario.email == google_email).first()
        if user:
            # Vincular google_id al usuario existente
            user.google_id = google_sub
            if google_picture:
                user.avatar_url = google_picture
            db.commit()
            db.refresh(user)
        else:
            # Crear usuario nuevo con datos de Google
            rol_obj = db.query(Rol).filter(Rol.codigo == "usuario").first()
            if rol_obj is None:
                raise HTTPException(status_code=500, detail="Catalogo de roles no inicializado")

            user = Usuario(
                nombre=given_name,
                apellido=family_name,
                email=google_email,
                hashed_password="",  # Sin password; solo autenticacion Google
                google_id=google_sub,
                avatar_url=google_picture,
                rol_id=rol_obj.id,
                activo=True,
            )
            db.add(user)
            db.flush()

            notificar_admins(
                db,
                tipo="nuevo_usuario",
                mensaje=f"Nuevo usuario registrado via Google: {google_name}",
                enlace="/admin/usuarios",
            )
            registrar_auditoria(db, user.id, "registro", "usuarios", user.id, "Registro via Google")
            db.commit()
            db.refresh(user)

            # Envia correo de bienvenida al usuario registrado con Google
            try:
                ok = enviar_correo_bienvenida(
                    email_destino=user.email,
                    nombre=given_name,
                    apellido=family_name,
                )
                if ok:
                    logger.info("Correo de bienvenida ENVIADO a %s (Google)", user.email)
                else:
                    logger.warning("Correo de bienvenida NO enviado a %s (Google - Brevo no configurado?)", user.email)
            except Exception as exc:
                logger.error("Error al enviar correo de bienvenida a %s (Google): %s", user.email, exc)

    # Generar JWT de Adoptify
    access_token = create_access_token(
        data={"sub": user.email},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return {"access_token": access_token, "token_type": "bearer"}
