# pyrefly: ignore [missing-import]
"""
Router de integracion con n8n / IA.

Expone:
1. Cola de tareas de IA (tareas_ia): n8n consume tareas pendientes, entrega
   resultados y reporta errores. La BD es la fuente de verdad (idempotente).
2. Chatbot con historial persistente: el backend guarda los mensajes, llama al
   workflow WF-3 de n8n y valida las acciones de navegacion contra una lista
   blanca (nunca acepta rutas arbitrarias del LLM).
3. Endpoints de servicio para n8n: contexto seguro de un usuario (pedidos) y
   preferencias de notificacion. Ambos protegidos con el token compartido.

Reglas de seguridad:
- Los endpoints de servicio se validan con el header X-N8N-Token.
- n8n NUNCA ejecuta SQL directo; toda consulta de datos pasa por esta API.
- Los codigos de verificacion/reset de contrasena NO pasan por aqui.
"""
# pyrefly: ignore [missing-import]
import json
import logging
from datetime import datetime, timedelta, timezone

# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, Header, HTTPException, status
# pyrefly: ignore [missing-import]
from pydantic import BaseModel, Field
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.webhooks import disparar_webhook, n8n_activo
from app.core.lookups import id_por_codigo
from app.db.database import get_db
from app.models.usuario import Usuario
from app.models.ia import TareaIA, ChatSesion, ChatMensaje
from app.models.interaccion import Configuracion
from app.models.pedido import Pedido
from app.models.solicitud import SolicitudAdopcion
from app.models.solicitud_refugio import SolicitudRefugio
from app.models.tienda import Tienda, TiendaUsuario
from app.schemas.serializers import serialize_pedido
from app.services.gemini import clasificar_contenido
from jose import jwt

logger = logging.getLogger(__name__)

router = APIRouter()


# =====================================================================
# Dependencias de seguridad
# =====================================================================

def verificar_token_n8n(x_n8n_token: str = Header(default="")):
    """Exige el token compartido backend <-> n8n (X-N8N-Token)."""
    if not settings.N8N_WEBHOOK_SECRET:
        raise HTTPException(status_code=503, detail="Integracion con n8n no configurada")
    if not x_n8n_token or x_n8n_token != settings.N8N_WEBHOOK_SECRET:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de servicio invalido",
        )
    return True


def get_current_user_opcional(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    """Resuelve el usuario autenticado si hay Bearer token; si no, devuelve None.

    Se usa en el chatbot para asociar la conversacion al usuario logueado
    (y asi poder responder sobre SUS pedidos) sin exigir autenticacion a
    visitantes anonimos.
    """
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization[7:].strip()
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email = payload.get("sub")
        if not email:
            return None
        return db.query(Usuario).filter(Usuario.email == email).first()
    except Exception:  # noqa: BLE001
        return None


# =====================================================================
# Helpers de tareas de IA (reutilizables por otros routers)
# =====================================================================

def crear_tarea_ia(db: Session, tipo: str, payload: dict) -> TareaIA:
    """Crea una tarea de IA pendiente (fuente de verdad para n8n).

    Se puede llamar desde cualquier router: db.add + commit + crear_tarea_ia.
    Si n8n no esta activo, la tarea se crea igual (quedara pendiente) pero no
    se dispara ningun webhook; el sistema sigue funcionando normal.
    """
    tarea = TareaIA(
        tipo=tipo,
        payload=json.dumps(payload, ensure_ascii=False),
        estado="pendiente",
    )
    db.add(tarea)
    db.flush()
    db.commit()
    db.refresh(tarea)
    return tarea


def _aplicar_resultado(db: Session, tarea: TareaIA):
    """Aplica los efectos secundarios de un resultado de IA (best effort).

    La IA solo "clasifica"; las acciones con consecuencias las ejecuta el
    backend y siempre de forma reversible/supervisable. Por ahora aplica:
    - moderar_post -> decision 'ocultar' => estado 'archived' (fuera del feed)
    El resto de tipos queda registrado en tarea.resultado para su revision.
    """
    try:
        resultado = json.loads(tarea.resultado or "{}")
        payload = json.loads(tarea.payload or "{}")
        decision = (resultado.get("decision") or "").lower()

        if tarea.tipo == "moderar_post" and decision == "ocultar":
            from app.models.foro import ForoPost
            from app.models.catalogos import EstadoPostForo
            from app.core.notificaciones import crear_notificacion
            from app.core.email import enviar_correo_contenido_inapropiado

            post = db.query(ForoPost).filter(ForoPost.id == payload.get("post_id")).first()
            if post:
                arch_id = id_por_codigo(db, EstadoPostForo, "archived")
                if arch_id:
                    post.estado_id = arch_id
                    db.commit()
                    logger.info("[ia] Post %s ocultado por moderacion.", post.id)

                # Avisa al autor: notificacion in-app + correo con motivo y sugerencias.
                motivo = str(resultado.get("motivo") or "Contenido inapropiado")[:500]
                sugerencias = str(resultado.get("sugerencias") or "")[:800]
                autor = post.autor
                if autor and autor.id:
                    try:
                        crear_notificacion(
                            db, autor.id, "moderacion",
                            f"Tu publicación \"{post.titulo}\" no se publicó. Motivo: {motivo}",
                            "/forum",
                        )
                        db.commit()
                    except Exception as exc:
                        logger.warning("[ia] No se pudo notificar al autor: %s", exc)
                    if autor.email:
                        try:
                            enviar_correo_contenido_inapropiado(
                                autor.email,
                                f"{autor.nombre} {autor.apellido or ''}".strip(),
                                "publicación del foro",
                                motivo,
                                sugerencias,
                            )
                        except Exception as exc:
                            logger.warning("[ia] No se pudo enviar correo de moderacion: %s", exc)
    except Exception as exc:  # noqa: BLE001
        db.rollback()
        logger.warning("[ia] No se pudo aplicar resultado de %s: %s", tarea.tipo, exc)


# =====================================================================
# Clasificacion / generacion con Gemini (llamada que hace n8n via API)
# =====================================================================

class ClasificarRequest(BaseModel):
    tipo: str = Field(..., min_length=1, max_length=60)
    texto: str = Field(..., min_length=1, max_length=12000)


@router.post("/clasificar")
async def clasificar(
    payload: ClasificarRequest,
    _: bool = Depends(verificar_token_n8n),
):
    """n8n pide al backend clasificar/generar contenido con Gemini.

    La orquestacion (consumir tarea, entregar resultado, enviar correos) la hace
    n8n, pero la llamada al LLM pasa por este endpoint para reutilizar el cliente
    de Gemini ya probado y la validacion de JSON (fiabilidad)."""
    try:
        resultado = await clasificar_contenido(payload.tipo, payload.texto)
        return {"ok": True, "resultado": resultado}
    except Exception as exc:  # noqa: BLE001
        logger.warning("[ia] Error clasificando '%s': %s", payload.tipo, exc)
        return {"ok": False, "error": str(exc)[:300]}


# =====================================================================
# Cola de tareas de IA (consumida por n8n)
# =====================================================================

@router.get("/tareas/siguiente")
def tarea_siguiente(
    tipos: str = "",
    _: bool = Depends(verificar_token_n8n),
    db: Session = Depends(get_db),
):
    """Devuelve la siguiente tarea pendiente (la mas antigua) y la marca como
    'procesando'. Idempotente: si ya hay una 'procesando' no la reentrega.

    Parametro opcional 'tipos': lista separada por comas de prefijos de tipo.
    Ej: "moderar,clasificar" devuelve tareas cuyo tipo empiece por esos prefijos.
    Vacio = cualquier tipo.
    """
    q = db.query(TareaIA).filter(TareaIA.estado == "pendiente")
    prefijos = [t.strip() for t in tipos.split(",") if t.strip()]
    if prefijos:
        from sqlalchemy import or_
        q = q.filter(or_(*[TareaIA.tipo.like(f"{p}%") for p in prefijos]))

    tarea = q.order_by(TareaIA.id.asc()).first()
    if not tarea:
        return {"tarea": None}
    tarea.estado = "procesando"
    tarea.intentos = (tarea.intentos or 0) + 1
    db.commit()
    return {
        "tarea": {
            "id": tarea.id,
            "tipo": tarea.tipo,
            "payload": json.loads(tarea.payload or "{}"),
        }
    }


@router.post("/tareas/{tarea_id}/resultado")
def tarea_resultado(
    tarea_id: int,
    body: dict,
    _: bool = Depends(verificar_token_n8n),
    db: Session = Depends(get_db),
):
    """n8n entrega el resultado de una tarea. Se valida, se aplican los efectos
    y se marca como completada."""
    tarea = db.query(TareaIA).filter(TareaIA.id == tarea_id).first()
    if not tarea:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")
    if tarea.estado == "completado":
        return {"ok": True, "ya_completada": True}

    tarea.resultado = json.dumps(body.get("resultado", body), ensure_ascii=False)
    tarea.estado = "completado"
    tarea.procesado_en = datetime.now(timezone.utc)
    db.commit()

    _aplicar_resultado(db, tarea)
    return {"ok": True}


@router.post("/tareas/{tarea_id}/error")
def tarea_error(
    tarea_id: int,
    body: dict,
    _: bool = Depends(verificar_token_n8n),
    db: Session = Depends(get_db),
):
    """n8n reporta un error al procesar una tarea. Se deja pendiente para
    reintentar (con tope de intentos) o en 'error' para revision humana."""
    tarea = db.query(TareaIA).filter(TareaIA.id == tarea_id).first()
    if not tarea:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")

    tarea.error = str(body.get("error", "Error desconocido"))[:2000]
    if (tarea.intentos or 0) >= 3:
        tarea.estado = "error"
    else:
        tarea.estado = "pendiente"
    db.commit()
    return {"ok": True}


# =====================================================================
# Chatbot (con historial persistente)
# =====================================================================

class ChatRequest(BaseModel):
    session_id: str = Field(..., min_length=8, max_length=64)
    mensaje: str = Field(..., min_length=1, max_length=2000)


class ChatSesionRequest(BaseModel):
    session_id: str = Field(..., min_length=8, max_length=64)


def _obtener_o_crear_sesion(db: Session, session_id: str, usuario: Usuario | None) -> ChatSesion:
    sesion = db.query(ChatSesion).filter(ChatSesion.session_id == session_id).first()
    if not sesion:
        sesion = ChatSesion(session_id=session_id, usuario_id=usuario.id if usuario else None)
        db.add(sesion)
        db.commit()
        db.refresh(sesion)
    elif usuario and not sesion.usuario_id:
        sesion.usuario_id = usuario.id
        db.commit()
    return sesion


@router.post("/chat/sesion")
def crear_sesion_chat(
    payload: ChatSesionRequest,
    db: Session = Depends(get_db),
    usuario: Usuario | None = Depends(get_current_user_opcional),
):
    """Crea o recupera una sesion de chat (la vincula al usuario si hay token)."""
    sesion = _obtener_o_crear_sesion(db, payload.session_id, usuario)
    return {"session_id": sesion.session_id, "usuario_id": sesion.usuario_id}


@router.get("/chat/historial")
def historial_chat(
    session_id: str,
    db: Session = Depends(get_db),
):
    """Devuelve los ultimos mensajes de la sesion (ventana CHAT_MAX_HISTORIAL)."""
    sesion = db.query(ChatSesion).filter(ChatSesion.session_id == session_id).first()
    if not sesion:
        return []
    mensajes = (
        db.query(ChatMensaje)
        .filter(ChatMensaje.sesion_id == sesion.id)
        .order_by(ChatMensaje.id.desc())
        .limit(settings.CHAT_MAX_HISTORIAL)
        .all()
    )
    mensajes.reverse()
    return [{"rol": m.rol, "contenido": m.contenido} for m in mensajes]


@router.post("/chat")
async def chat(
    payload: ChatRequest,
    db: Session = Depends(get_db),
    usuario: Usuario | None = Depends(get_current_user_opcional),
):
    """Procesa un mensaje del chatbot.

    Flujo: guarda el mensaje del usuario -> llama al workflow WF-3 de n8n
    (que responde via 'Respond to Webhook') -> valida la accion de navegacion
    contra la lista blanca -> guarda y devuelve la respuesta del bot.
    """
    sesion = _obtener_o_crear_sesion(db, payload.session_id, usuario)

    # 1. Guardar mensaje del usuario (actualiza la ultima actividad de la sesion
    #    para poder depurar sesiones abandonadas sin borrar historial valido).
    sesion.actualizado_en = datetime.now(timezone.utc)
    db.add(ChatMensaje(sesion_id=sesion.id, rol="user", contenido=payload.mensaje))
    db.commit()

    # 2. Cargar historial para contexto
    historial = (
        db.query(ChatMensaje)
        .filter(ChatMensaje.sesion_id == sesion.id)
        .order_by(ChatMensaje.id.desc())
        .limit(settings.CHAT_MAX_HISTORIAL)
        .all()
    )
    historial.reverse()
    contexto = [
        {"rol": m.rol, "contenido": m.contenido}
        for m in historial
    ]

    # 3. Construir contexto legible para la IA (historial + mensaje actual).
    contexto_texto = "\n".join(
        f"{'Usuario' if m['rol'] == 'user' else 'Bot'}: {m['contenido']}"
        for m in contexto
    )
    prompt_texto = (
        f"{contexto_texto}\n\nMENSAJE DEL USUARIO: {payload.mensaje}"
    )

    # 4. Obtener respuesta:
    #    a) n8n WF-3 (orquestado, contexto de pedidos).
    #    b) Si n8n no responde o no trae texto, Gemini directo (fallback local).
    #    c) Si todo falla, mensaje genérico (no solo un saludo).
    respuesta_bot = None
    accion = None
    if n8n_activo():
        resp = await disparar_webhook(
            "chatbot",
            {
                "session_id": sesion.session_id,
                "usuario_id": sesion.usuario_id,
                "mensaje": payload.mensaje,
                "historial": contexto,
            },
            esperar_respuesta=True,
        )
        if resp and (resp.get("respuesta") or resp.get("texto")):
            respuesta_bot = resp.get("respuesta") or resp.get("texto")
            accion_raw = resp.get("accion")
            if isinstance(accion_raw, dict):
                ruta = str(accion_raw.get("ruta") or "")
                if ruta in settings.get_rutas_permitidas:
                    accion = {"tipo": "navegar", "ruta": ruta}

    # Fallback local: Gemini directo (no depende del workflow de n8n).
    if not respuesta_bot:
        try:
            resultado = await clasificar_contenido("chatbot", prompt_texto)
            respuesta_bot = str(resultado.get("respuesta") or "").strip()
            accion_raw = resultado.get("accion")
            if isinstance(accion_raw, dict):
                ruta = str(accion_raw.get("ruta") or "")
                if ruta in settings.get_rutas_permitidas:
                    accion = {"tipo": "navegar", "ruta": ruta}
        except Exception as exc:  # noqa: BLE001
            logger.warning("[ia] Chatbot: fallback local con Gemini falló: %s", exc)

    if not respuesta_bot:
        respuesta_bot = (
            "¡Hola! Soy el asistente de Adoptify 🐾. Puedo ayudarte a conocer la "
            "plataforma, cómo adoptar, cómo registrar un refugio o tienda, y "
            "orientarte por la página. ¿En qué te ayudo?"
        )

    # 4. Guardar respuesta del bot (actualiza la ultima actividad de la sesion).
    db.add(ChatMensaje(sesion_id=sesion.id, rol="bot", contenido=str(respuesta_bot)))
    sesion.actualizado_en = datetime.now(timezone.utc)
    db.commit()

    return {"respuesta": respuesta_bot, "accion": accion}


# =====================================================================
# Endpoints de servicio para n8n (protegidos con token)
# =====================================================================


def _construir_contexto_usuario(db: Session, user: Usuario) -> dict:
    """Construye el contexto seguro de un usuario (rol + pedidos + adopciones +
    refugio/tienda segun rol). Defensivo: nunca lanza 500."""
    rol = user.rol_codigo or "usuario"

    pedidos_data = []
    try:
        pedidos = (
            db.query(Pedido)
            .filter(Pedido.usuario_id == user.id)
            .order_by(Pedido.creado_en.desc())
            .limit(5)
            .all()
        )
        pedidos_data = [serialize_pedido(p) for p in pedidos]
    except Exception as exc:  # noqa: BLE001
        logger.warning("[ia] contexto: error cargando pedidos: %s", exc)

    adopciones_data = []
    try:
        adopciones = (
            db.query(SolicitudAdopcion)
            .filter(SolicitudAdopcion.usuario_id == user.id)
            .order_by(SolicitudAdopcion.creada_en.desc())
            .limit(5)
            .all()
        )
        adopciones_data = [
            {
                "id": s.id,
                "mascota": s.mascota.nombre if s.mascota else "Mascota",
                "estado": s.estado.nombre if s.estado else "Pendiente",
                "progreso": s.progreso or 0,
                "creada_en": str(s.creada_en) if s.creada_en else None,
            }
            for s in adopciones
        ]
    except Exception as exc:  # noqa: BLE001
        logger.warning("[ia] contexto: error cargando adopciones: %s", exc)

    refugio_data = None
    try:
        if rol in ("refugio", "empleado_refugio"):
            ref = user.refugio if rol == "refugio" else None
            if not ref and user.refugio_empleado:
                ref = user.refugio_empleado.refugio
            if ref:
                refugio_data = {"id": ref.id, "nombre": ref.nombre}
    except Exception as exc:  # noqa: BLE001
        logger.warning("[ia] contexto: error cargando refugio: %s", exc)

    tienda_data = None
    try:
        if rol == "tienda_aliada":
            t = user.tienda  # backref del representante (uselist=False)
            if not t:
                tu = db.query(TiendaUsuario).filter(TiendaUsuario.usuario_id == user.id).first()
                if tu:
                    t = tu.tienda
            if t:
                tienda_data = {"id": t.id, "nombre": t.nombre, "estado": t.estado}
    except Exception as exc:  # noqa: BLE001
        logger.warning("[ia] contexto: error cargando tienda: %s", exc)

    return {
        "autenticado": True,
        "rol": rol,
        "usuario": {
            "id": user.id,
            "nombre": f"{user.nombre} {user.apellido or ''}".strip(),
            "email": user.email,
        },
        "pedidos": pedidos_data,
        "adopciones": adopciones_data,
        "refugio": refugio_data,
        "tienda": tienda_data,
    }


def _variantes_telefono(telefono: str) -> list:
    """Devuelve variantes de un telefono para buscarlo en la BD (formato flexible,
    soporta +57, con espacios/guiones, local o internacional)."""
    if not telefono:
        return []
    digitos = "".join(ch for ch in telefono if ch.isdigit())
    variantes = {digitos}
    if digitos.startswith("57") and len(digitos) == 12:
        variantes.add(digitos[2:])  # sin prefijo de pais
    if len(digitos) == 10 and not digitos.startswith("57"):
        variantes.add("57" + digitos)  # con prefijo de pais (Colombia)
    return list(variantes)


@router.get("/chat/{session_id}/contexto")
def contexto_chat_para_n8n(
    session_id: str,
    _: bool = Depends(verificar_token_n8n),
    db: Session = Depends(get_db),
):
    """Devuelve el contexto seguro de la sesion: si el usuario esta autenticado,
    su rol y SUS datos relevantes (pedidos, adopciones, refugio/tienda si aplica).
    n8n lo usa para responder sobre el estado de pedidos/adopciones y adaptar la
    respuesta segun el rol, sin tener acceso directo a la base de datos. Solo
    devuelve datos del usuario vinculado a la sesion; si es anonimo, no devuelve
    nada sensible. Cada seccion es defensiva: si una consulta falla (tabla
    faltante, relacion rara, etc.) se devuelve un valor seguro, NUNCA un 500."""
    vacio = {
        "autenticado": False,
        "rol": None,
        "usuario": None,
        "pedidos": [],
        "adopciones": [],
        "refugio": None,
        "tienda": None,
    }
    sesion = db.query(ChatSesion).filter(ChatSesion.session_id == session_id).first()
    if not sesion or not sesion.usuario_id:
        return vacio

    user = db.query(Usuario).filter(Usuario.id == sesion.usuario_id).first()
    if not user:
        return vacio

    return _construir_contexto_usuario(db, user)


@router.get("/whatsapp/contexto")
def contexto_whatsapp_para_n8n(
    telefono: str,
    _: bool = Depends(verificar_token_n8n),
    db: Session = Depends(get_db),
):
    """Identifica a un usuario por su telefono (WhatsApp) y devuelve su contexto
    (rol + pedidos + adopciones + refugio/tienda). n8n (WF-6) lo usa para saber
    quien pregunta y responder segun su rol, SIN acceso directo a la base de
    datos. Solo devuelve datos del usuario cuyo telefono coincide; si no esta
    registrado, autenticado=false."""
    no_registrado = {
        "autenticado": False,
        "rol": None,
        "usuario": None,
        "pedidos": [],
        "adopciones": [],
        "refugio": None,
        "tienda": None,
    }
    variantes = _variantes_telefono(telefono)
    user = None
    if variantes:
        user = (
            db.query(Usuario)
            .filter(Usuario.telefono.in_(variantes), Usuario.activo.is_(True))
            .first()
        )
    if not user:
        return no_registrado
    ctx = _construir_contexto_usuario(db, user)
    ctx["telefono"] = telefono
    return ctx


@router.get("/usuarios/{usuario_id}/preferencias")
def preferencias_para_n8n(
    usuario_id: int,
    _: bool = Depends(verificar_token_n8n),
    db: Session = Depends(get_db),
):
    """Preferencias de notificacion del usuario para que n8n decida el canal
    (correo / WhatsApp). Respeta el opt-in del usuario."""
    user = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    cfg = db.query(Configuracion).filter(Configuracion.usuario_id == usuario_id).first()
    return {
        "usuario_id": user.id,
        "nombre": f"{user.nombre} {user.apellido or ''}".strip(),
        "email": user.email,
        "telefono": user.telefono,
        "notif_email": bool(cfg.notif_email) if cfg else True,
        "notif_push": bool(cfg.notif_push) if cfg else True,
        "notif_whatsapp": bool(getattr(cfg, "notif_whatsapp", False)) if cfg else False,
    }


@router.get("/operaciones/sla-refugios")
def sla_refugios_pendientes(
    _: bool = Depends(verificar_token_n8n),
    db: Session = Depends(get_db),
):
    """Solicitudes de refugio pendientes de revision con mas de 72 horas.

    n8n (WF-5) consulta este endpoint en un Schedule y avisa a los admins
    para que ninguna solicitud quede sin revisar (SLA 24-72h)."""
    desde = datetime.now(timezone.utc) - timedelta(hours=72)
    filas = (
        db.query(SolicitudRefugio)
        .filter(
            SolicitudRefugio.estado.in_(["pendiente", "informacion_solicitada"]),
            SolicitudRefugio.creada_en < desde,
        )
        .order_by(SolicitudRefugio.creada_en.asc())
        .all()
    )
    return [
        {
            "id": s.id,
            "nombre_refugio": s.nombre_refugio,
            "ciudad": s.ciudad or s.municipio,
            "estado": s.estado,
            "creada_en": s.creada_en.isoformat() if s.creada_en else None,
            "email_contacto": s.email_contacto or s.representante_email,
        }
        for s in filas
    ]
