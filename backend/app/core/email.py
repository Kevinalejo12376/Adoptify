"""Servicio de envío de correos electrónicos.

Método principal: la API de Brevo (Sendinblue) — correos transaccionales.
Si Brevo no está configurado (BREVO_API_KEY vacío), se intenta como fallback
el workflow "enviar_correo" de n8n (solo si N8N_ENABLED=true).
"""
import logging
import random
import httpx
from app.core.config import settings
from app.core.webhooks import n8n_activo, disparar_webhook_sync

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Identidad visual de Adoptify (misma del frontend, adaptada a correos)
# ---------------------------------------------------------------------------
LOGO_URL = (
    "https://res.cloudinary.com/kj0wube2/image/upload/"
    "v1786743743/frontend-assets/logo/logo.png"
)
COLOR_ROSA = "#F43F5E"  # rose-500 (primario de la marca)
COLOR_AMBAR = "#F59E0B"  # amber-500 (acento de la marca)
COLOR_ROSA_OSCURO = "#9F1239"  # rose-800 (títulos y jerarquía)
COLOR_ROSA_SUAVE = "#FFF1F2"  # rose-50 (fondos suaves)
COLOR_AMBAR_SUAVE = "#FFFBEB"  # amber-50 (fondos suaves)
COLOR_TEXTO = "#374151"  # gray-700
COLOR_TEXTO_SUAVE = "#9CA3AF"  # gray-400


def _generar_codigo(longitud: int = 6) -> str:
    """Genera un código numérico aleatorio de la longitud especificada."""
    return "".join(random.choices("0123456789", k=longitud))


def _plantilla_base(titulo: str, contenido_html: str, subtitulo_html: str = "") -> str:
    """Envuelve el cuerpo de un correo en el diseño base de Adoptify.

    Estructura: logo + título en el encabezado, barra de gradiente de la marca,
    contenido y pie con enlaces. El CSS usa estilos en cascada (compatibles con
    Gmail/Outlook) y media queries para una correcta vista en celular.
    """
    subtitulo = (
        f'<p style="margin:10px 0 0;font-size:14px;color:#6B7280;'
        f'font-weight:400;line-height:1.5;">{subtitulo_html}</p>'
        if subtitulo_html
        else ""
    )
    return f"""<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="x-apple-disable-message-reformatting">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>{titulo}</title>
    <style>
        body {{
            margin: 0;
            padding: 0;
            background-color: #f6f4f2;
            -webkit-text-size-adjust: 100%;
            -ms-text-size-adjust: 100%;
        }}
        table {{ border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }}
        img {{ border: 0; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }}
        h1, h2, p {{ margin: 0; }}
        .btn {{
            display: inline-block;
            padding: 14px 34px;
            border-radius: 12px;
            font-size: 15px;
            font-weight: 700;
            letter-spacing: 0.2px;
            color: #ffffff !important;
            text-decoration: none;
            background-color: {COLOR_ROSA};
            background-image: linear-gradient(90deg, {COLOR_ROSA}, {COLOR_AMBAR});
            box-shadow: 0 6px 18px rgba(244, 63, 94, 0.25);
        }}
        .caja {{
            background: linear-gradient(135deg, {COLOR_ROSA_SUAVE}, {COLOR_AMBAR_SUAVE});
            border: 1px solid #FCE3E6;
            border-left: 4px solid {COLOR_ROSA};
            border-radius: 12px;
            padding: 20px 22px;
            margin: 20px 0;
        }}
        .caja strong {{ color: #BE185D; }}
        .footnote {{ font-size: 13px; color: #9CA3AF; line-height: 1.6; word-break: break-all; }}
        .codigo-box {{
            background: linear-gradient(135deg, {COLOR_ROSA_SUAVE}, {COLOR_AMBAR_SUAVE});
            border: 2px dashed #FDA4AF;
            border-radius: 14px;
            padding: 28px 24px;
            margin: 24px 0;
            text-align: center;
        }}
        .codigo-box .codigo {{
            font-size: 38px;
            font-weight: 800;
            color: #BE185D;
            letter-spacing: 10px;
            font-family: 'Courier New', monospace;
            user-select: all;
            -webkit-user-select: all;
        }}
        .codigo-box .validez {{ font-size: 13px; color: #8A8686; margin-top: 14px; }}
        .aviso {{
            background-color: {COLOR_AMBAR_SUAVE};
            border: 1px solid #FDE68A;
            border-radius: 10px;
            padding: 14px 18px;
            font-size: 13px;
            color: #92400E;
            margin: 20px 0;
            line-height: 1.6;
        }}
        @media only screen and (max-width: 480px) {{
            .header {{ padding: 26px 18px 20px !important; }}
            .content {{ padding: 28px 18px !important; }}
            .footer {{ padding: 22px 18px !important; }}
            .btn {{ display: block !important; text-align: center !important; padding: 14px 20px !important; }}
            .codigo-box .codigo {{ font-size: 30px; letter-spacing: 6px; }}
            .header-titulo {{ font-size: 20px !important; }}
        }}
    </style>
</head>
<body style="margin:0;padding:0;background-color:#f6f4f2;">
    <center role="article" aria-roledescription="email">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
               style="background-color:#f6f4f2;padding:24px 12px;">
            <tr>
                <td align="center">
                    <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" border="0"
                           style="width:100%;max-width:600px;background-color:#ffffff;border-radius:16px;
                                  overflow:hidden;box-shadow:0 8px 30px rgba(31,41,55,0.08);">
                        <!-- Encabezado: logo + título -->
                        <tr>
                            <td class="header" align="center"
                                style="padding:34px 32px 26px;background-color:#ffffff;">
                                <img src="{LOGO_URL}" alt="Adoptify" width="168"
                                     style="display:inline-block;width:168px;max-width:168px;height:auto;
                                            border:0;outline:none;text-decoration:none;">
                                <h1 class="header-titulo"
                                    style="margin:20px 0 0;font-size:24px;line-height:1.25;color:{COLOR_ROSA_OSCURO};
                                           font-weight:800;font-family:'Plus Jakarta Sans','Segoe UI',Arial,sans-serif;">
                                    {titulo}
                                </h1>
                                {subtitulo}
                            </td>
                        </tr>
                        <!-- Barra de gradiente de la marca -->
                        <tr>
                            <td style="height:6px;font-size:0;line-height:0;background-color:{COLOR_ROSA};
                                       background-image:linear-gradient(90deg,{COLOR_ROSA},{COLOR_AMBAR});">
                                &nbsp;
                            </td>
                        </tr>
                        <!-- Contenido -->
                        <tr>
                            <td class="content"
                                style="padding:36px 32px;color:{COLOR_TEXTO};font-size:15px;line-height:1.7;
                                       font-family:'Plus Jakarta Sans','Segoe UI',Arial,sans-serif;">
                                {contenido_html}
                            </td>
                        </tr>
                        <!-- Pie -->
                        <tr>
                            <td class="footer" align="center"
                                style="background-color:#FAF9F8;padding:28px 32px;text-align:center;
                                       color:{COLOR_TEXTO_SUAVE};font-size:12px;line-height:1.7;
                                       border-top:1px solid #F1EEEC;font-family:Arial,sans-serif;">
                                <p style="margin:0 0 6px;">&copy; 2026 Adoptify. Todos los derechos reservados.</p>
                                <p style="margin:0 0 6px;">
                                    <a href="{settings.FRONTEND_URL}" target="_blank"
                                       style="color:{COLOR_ROSA};text-decoration:none;font-weight:600;">Ir a Adoptify</a>
                                    &nbsp;&bull;&nbsp;
                                    <a href="{settings.FRONTEND_URL}/privacy" target="_blank"
                                       style="color:{COLOR_ROSA};text-decoration:none;">Privacidad</a>
                                    &nbsp;&bull;&nbsp;
                                    <a href="{settings.FRONTEND_URL}/terms" target="_blank"
                                       style="color:{COLOR_ROSA};text-decoration:none;">T&eacute;rminos</a>
                                </p>
                                <p style="margin:0;font-size:11px;color:#B4AEAD;">
                                    Este correo fue enviado autom&aacute;ticamente. Por favor no respondas a este mensaje.
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </center>
</body>
</html>"""


def _build_welcome_html(nombre: str, apellido: str | None = None) -> str:
    """Construye el HTML del correo de bienvenida con la identidad de Adoptify."""
    nombre_completo = f"{nombre} {apellido or ''}".strip()
    contenido = f"""
        <h2 style="margin:0 0 8px;font-size:20px;line-height:1.3;color:{COLOR_ROSA_OSCURO};font-weight:800;">
            &iexcl;Hola, {nombre_completo}! 👋
        </h2>

        <p>
            Gracias por registrarte en <strong>Adoptify</strong>, la plataforma que conecta
            mascotas en busca de un hogar con personas amorosas como t&uacute;.
        </p>

        <p>Estamos emocionados de tenerte en nuestra comunidad. Con tu nueva cuenta puedes:</p>

        <div class="caja">
            <ul style="margin:0;padding-left:20px;">
                <li>🐶 <strong>Explorar mascotas</strong> disponibles para adopci&oacute;n cerca de ti</li>
                <li>🏪 <strong>Visitar tiendas aliadas</strong> y encontrar productos para tu mascota</li>
                <li>💬 <strong>Participar en el foro</strong> y compartir experiencias con otros amantes de los animales</li>
                <li>❤️ <strong>Guardar tus favoritos</strong> y dar el primer paso hacia una adopci&oacute;n</li>
            </ul>
        </div>

        <p style="text-align:center;">
            <a href="{settings.FRONTEND_URL}" class="btn" target="_blank">Explorar Adoptify</a>
        </p>

        <p>
            Si tienes alguna pregunta o necesitas ayuda, no dudes en contactarnos.
            &iexcl;Estamos aqu&iacute; para ayudarte!
        </p>

        <p style="margin-top:26px;">
            Con cari&ntilde;o,<br><strong style="color:#BE185D;">El equipo de Adoptify</strong>
        </p>
    """
    return _plantilla_base(
        "¡Bienvenido a la familia!",
        contenido,
        "Un hogar para cada mascota",
    )


def _build_codigo_html(codigo: str, tipo: str, nombre: str = "") -> str:
    """Construye el HTML para un correo con código de verificación."""
    es_registro = tipo == "registro"
    titulo = "Verifica tu correo electrónico" if es_registro else "Recuperación de contraseña"
    mensaje_principal = (
        "Has solicitado crear una cuenta en <strong>Adoptify</strong>. "
        "Para confirmar que este correo te pertenece, ingresa el siguiente código:"
        if es_registro else
        "Has solicitado restablecer tu contraseña en <strong>Adoptify</strong>. "
        "Ingresa el siguiente código para continuar:"
    )
    nombre_saludo = f"{nombre}, " if nombre else ""

    contenido = f"""
        <h2 style="margin:0 0 8px;font-size:20px;line-height:1.3;color:{COLOR_ROSA_OSCURO};font-weight:800;">
            &iexcl;Hola{', ' + nombre_saludo if nombre_saludo else '!'} 👋
        </h2>

        <p>{mensaje_principal}</p>

        <div class="codigo-box">
            <div class="codigo">{codigo}</div>
            <div class="validez">Este c&oacute;digo es v&aacute;lido por 10 minutos</div>
        </div>

        <div class="aviso">
            ⚠️ Si no solicitaste este c&oacute;digo, ignora este mensaje.
            Nunca compartas este c&oacute;digo con nadie.
        </div>

        <p>Si tienes alguna pregunta, no dudes en contactarnos.</p>

        <p style="margin-top:26px;">
            Con cari&ntilde;o,<br><strong style="color:#BE185D;">El equipo de Adoptify</strong>
        </p>
    """
    return _plantilla_base(titulo, contenido)


def _enviar_correo(email_destino: str, asunto: str, html: str) -> bool:
    """Envía un correo electrónico.

    Si la integración con n8n está habilitada (N8N_ENABLED=true), el correo se
    enruta al workflow "enviar_correo" de n8n (WF-1) y se ESPERA su respuesta
    (WF-1 responde después de enviar). Si n8n no responde o falla, se usa Brevo
    (Sendinblue) como respaldo; si tampoco está configurado Brevo, se devuelve False.
    """
    # 1. Método preferido: workflow "enviar_correo" de n8n (si está habilitado).
    if n8n_activo():
        ok = disparar_webhook_sync(
            "enviar_correo",
            {
                "to": email_destino,
                "asunto": asunto,
                "html": html,
            },
            timeout=settings.N8N_WEBHOOK_TIMEOUT,
        )
        if ok:
            logger.info(
                "✓ Correo enrutado a n8n (WF-1) para %s — Asunto: %s",
                email_destino,
                asunto,
            )
            return True
        logger.warning(
            "n8n no respondió para %s — se intenta enviar con Brevo.",
            email_destino,
        )

    # 2. Método de respaldo: API de Brevo (Sendinblue).
    if settings.BREVO_API_KEY:
        url = "https://api.brevo.com/v3/smtp/email"
        headers = {
            "api-key": settings.BREVO_API_KEY,
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
        payload = {
            "sender": {"name": settings.BREVO_FROM_NAME, "email": settings.BREVO_FROM_EMAIL},
            "to": [{"email": email_destino}],
            "subject": asunto,
            "htmlContent": html,
        }

        try:
            resp = httpx.post(url, json=payload, headers=headers, timeout=30)
            if resp.status_code == 201:
                data = resp.json()
                logger.info(
                    "✓ Correo enviado EXITOSAMENTE vía Brevo a %s — Asunto: %s | ID: %s",
                    email_destino,
                    asunto,
                    data.get("messageId"),
                )
                return True
            logger.error(
                "✗ Brevo respondió %s al enviar a %s: %s",
                resp.status_code,
                email_destino,
                resp.text,
            )
            return False
        except Exception as exc:
            logger.error("✗ Error inesperado al enviar correo a %s: %s", email_destino, exc)
            return False

    logger.error(
        "No se pudo enviar correo a %s (n8n no disponible y Brevo no configurado)",
        email_destino,
    )
    return False


def enviar_correo_bienvenida(email_destino: str, nombre: str, apellido: str | None = None) -> bool:
    """Envía el correo de bienvenida al usuario recién registrado.

    Args:
        email_destino: Dirección de correo del destinatario.
        nombre: Nombre del usuario.
        apellido: Apellido del usuario (opcional).

    Returns:
        True si se envió correctamente, False en caso contrario.
    """
    html = _build_welcome_html(nombre, apellido)
    asunto = "🐾 ¡Bienvenido a Adoptify! Estamos felices de tenerte"
    return _enviar_correo(email_destino, asunto, html)


def enviar_codigo_verificacion(
    email_destino: str,
    codigo: str,
    tipo: str,
    nombre: str = "",
) -> bool:
    """Envía un código de verificación de 6 dígitos al correo del usuario.

    Args:
        email_destino: Dirección de correo del destinatario.
        codigo: Código de 6 dígitos a enviar.
        tipo: 'registro' para verificación de registro, 'reset_password' para recuperación.
        nombre: Nombre del usuario (opcional, para personalizar el saludo).

    Returns:
        True si se envió correctamente, False en caso contrario.
    """
    html = _build_codigo_html(codigo, tipo, nombre)
    if tipo == "registro":
        asunto = f"🔐 Verifica tu correo — Código: {codigo}"
    else:
        asunto = f"🔑 Recupera tu contraseña — Código: {codigo}"
    return _enviar_correo(email_destino, asunto, html)


# ============================================================
# Plantillas de correo para el flujo de Solicitudes de Refugios
# ============================================================

def _build_base_html(titulo: str, contenido_html: str) -> str:
    """Envuelve un contenido en el diseño base de Adoptify (rosa/ámbar)."""
    return _plantilla_base(titulo, contenido_html)


def enviar_correo_aprobacion_refugio(
    email_destino: str,
    nombre_refugio: str,
    username: str,
    enlace_crear_password: str,
) -> bool:
    """Correo de aprobación: bienvenida + usuario generado + enlace para crear contraseña."""
    asunto = f"🎉 ¡Bienvenido a Adoptify, {nombre_refugio}! Tu solicitud fue aprobada"
    contenido = f"""
        <p>¡Hola, <strong>{nombre_refugio}</strong>! 🎉</p>
        <p>¡Excelentes noticias! Tu solicitud de registro ha sido <strong>aprobada</strong>
        y tu refugio ya forma parte de la comunidad Adoptify.</p>

        <div class="caja">
            <p style="margin:0 0 6px;">Tu cuenta fue creada con el siguiente <strong>usuario</strong>:</p>
            <p style="margin:0; font-size:22px; font-weight:800; color:#BE185D; letter-spacing:1px;">{username}</p>
        </div>

        <p>Para terminar de activar tu cuenta, crea tu contraseña con el siguiente botón.
        El enlace es <strong>seguro y expira en 24 horas</strong>.</p>

        <p style="text-align:center;">
            <a href="{enlace_crear_password}" class="btn" target="_blank">Crear mi contraseña</a>
        </p>

        <p class="footnote">
            Si el botón no funciona, copia y pega este enlace en tu navegador:<br>
            {enlace_crear_password}
        </p>
        <p>Con cariño,<br><strong style="color:#BE185D;">El equipo de Adoptify</strong></p>
    """
    return _enviar_correo(email_destino, asunto, _build_base_html("¡Solicitud aprobada!", contenido))


def enviar_correo_cuenta_creada(
    email_destino: str,
    nombre: str,
    enlace_crear_password: str,
    rol: str = "",
) -> bool:
    """Correo informando que la cuenta fue creada, con enlace seguro (24 h)
    para que el usuario establezca su contraseña.

    ``rol`` es la descripción legible del rol/entidad asignado (p. ej.
    "Subadministrador de Adoptify", "empleado del refugio X"). Si se omite, se
    usa un mensaje genérico. Nunca se envía la contraseña en texto plano.
    """
    if rol:
        linea_rol = f'<p>Has sido creado exitosamente como <strong>{rol}</strong>.</p>'
    else:
        linea_rol = (
            '<p>Tu cuenta en <strong>Adoptify</strong> ha sido creada correctamente.</p>'
        )
    asunto = f"🎉 ¡Tu cuenta en Adoptify fue creada, {nombre}!"
    contenido = f"""
        <p>¡Hola, <strong>{nombre}</strong>! 👋</p>
        {linea_rol}
        <p>Para terminar de activar tu cuenta, establece tu contraseña con el siguiente botón.
        El enlace es <strong>seguro y expira en 24 horas</strong>.</p>

        <p style="text-align:center;">
            <a href="{enlace_crear_password}" class="btn" target="_blank">Establecer mi contraseña</a>
        </p>

        <p class="footnote">
            Si el botón no funciona, copia y pega este enlace en tu navegador:<br>
            {enlace_crear_password}
        </p>
        <p>Con cariño,<br><strong style="color:#BE185D;">El equipo de Adoptify</strong></p>
    """
    return _enviar_correo(
        email_destino,
        asunto,
        _build_base_html("¡Tu cuenta fue creada!", contenido),
    )


def enviar_correo_solicitud_informacion(
    email_destino: str,
    nombre_refugio: str,
    mensaje: str,
    enlace_completar: str,
) -> bool:
    """Correo pidiendo información adicional para la solicitud del refugio."""
    asunto = f"📋 Información adicional para tu solicitud — {nombre_refugio}"
    contenido = f"""
        <p>Hola, <strong>{nombre_refugio}</strong> 👋</p>
        <p>Para continuar con la revisión de tu solicitud, nuestro equipo necesita
        <strong>información adicional</strong>:</p>

        <div class="caja">
            <p style="margin:0;">{mensaje}</p>
        </div>

        <p>Puedes completar la información solicitada ingresando al siguiente enlace.
        Solo necesitas adjuntar lo que se pide; no es necesario volver a diligenciar toda la solicitud.</p>

        <p style="text-align:center;">
            <a href="{enlace_completar}" class="btn" target="_blank">Completar información</a>
        </p>

        <p>Con cariño,<br><strong style="color:#BE185D;">El equipo de Adoptify</strong></p>
    """
    return _enviar_correo(
        email_destino,
        asunto,
        _build_base_html("Necesitamos más información", contenido),
    )


def enviar_correo_contenido_inapropiado(
    email_destino: str,
    nombre: str,
    entidad: str,
    motivo: str,
    sugerencias: str = "",
) -> bool:
    """Correo informando que un contenido no paso la moderacion (IA via n8n)."""
    asunto = f"🚫 Contenido no publicado en Adoptify — {entidad}"
    contenido = f"""
        <p>Hola, <strong>{nombre}</strong> 👋</p>
        <p>Tu {entidad} no se publicó porque nuestro sistema de moderación detectó
        contenido que no es apropiado para la comunidad.</p>

        <div class="caja">
            <p style="margin:0 0 6px;"><strong>Motivo:</strong></p>
            <p style="margin:0;">{motivo}</p>
        </div>

        {'<div class="caja"><p style="margin:0 0 6px;"><strong>Sugerencia para corregirlo:</strong></p><p style="margin:0;">' + sugerencias + '</p></div>' if sugerencias else ''}

        <p>Si crees que esto es un error, contacta a nuestro equipo de soporte y lo
        revisaremos con gusto.</p>
        <p>Con cariño,<br><strong style="color:#BE185D;">El equipo de Adoptify</strong></p>
    """
    return _enviar_correo(
        email_destino,
        asunto,
        _build_base_html("Contenido no publicado", contenido),
    )


def enviar_correo_rechazo_refugio(
    email_destino: str,
    nombre_refugio: str,
    motivo: str,
) -> bool:
    """Correo informando que la solicitud del refugio fue rechazada y el motivo."""
    asunto = f"💔 Actualización de tu solicitud — {nombre_refugio}"
    contenido = f"""
        <p>Hola, <strong>{nombre_refugio}</strong></p>
        <p>Lamentablemente, después de revisar cuidadosamente tu solicitud, hemos tomado la
        decisión de <strong>no aprobarla</strong> en esta ocasión.</p>

        <div class="caja">
            <p style="margin:0 0 6px;"><strong>Motivo del rechazo:</strong></p>
            <p style="margin:0;">{motivo}</p>
        </div>

        <p>
            Si consideras que esta decisión fue un error o deseas aclarar algún punto,
            no dudes en contactarnos. Estamos aquí para ayudarte a construir una comunidad
            segura y confiable para las mascotas.
        </p>
        <p>Con cariño,<br><strong style="color:#BE185D;">El equipo de Adoptify</strong></p>
    """
    return _enviar_correo(
        email_destino,
        asunto,
        _build_base_html("Estado de tu solicitud", contenido),
    )


# ============================================================
# Plantillas de correo para el flujo de Solicitudes de Tiendas Aliadas
# ============================================================

def enviar_correo_aprobacion_tienda(
    email_destino: str,
    nombre_tienda: str,
    username: str,
    enlace_crear_password: str,
) -> bool:
    """Correo de aprobación de Tienda Aliada: bienvenida + usuario + enlace seguro."""
    asunto = f"🎉 ¡Bienvenido a Adoptify, {nombre_tienda}! Tu solicitud fue aprobada"
    contenido = f"""
        <p>¡Hola, <strong>{nombre_tienda}</strong>! 🎉</p>
        <p>¡Excelentes noticias! Tu solicitud de registro ha sido <strong>aprobada</strong>
        y tu tienda ya forma parte de la comunidad Adoptify.</p>

        <div class="caja">
            <p style="margin:0 0 6px;">Tu cuenta fue creada con el siguiente <strong>usuario</strong>:</p>
            <p style="margin:0; font-size:22px; font-weight:800; color:#BE185D; letter-spacing:1px;">{username}</p>
        </div>

        <p>Para terminar de activar tu cuenta, crea tu contraseña con el siguiente botón.
        El enlace es <strong>seguro y expira en 24 horas</strong>.</p>

        <p style="text-align:center;">
            <a href="{enlace_crear_password}" class="btn" target="_blank">Crear mi contraseña</a>
        </p>

        <p class="footnote">
            Si el botón no funciona, copia y pega este enlace en tu navegador:<br>
            {enlace_crear_password}
        </p>
        <p>Con cariño,<br><strong style="color:#BE185D;">El equipo de Adoptify</strong></p>
    """
    return _enviar_correo(email_destino, asunto, _build_base_html("¡Solicitud aprobada!", contenido))


def enviar_correo_solicitud_informacion_tienda(
    email_destino: str,
    nombre_tienda: str,
    mensaje: str,
    enlace_completar: str,
) -> bool:
    """Correo pidiendo información adicional para la solicitud de la Tienda Aliada."""
    asunto = f"📋 Información adicional para tu solicitud — {nombre_tienda}"
    contenido = f"""
        <p>Hola, <strong>{nombre_tienda}</strong> 👋</p>
        <p>Para continuar con la revisión de tu solicitud, nuestro equipo necesita
        <strong>información adicional</strong>:</p>

        <div class="caja">
            <p style="margin:0;">{mensaje}</p>
        </div>

        <p>Puedes completar la información solicitada ingresando al siguiente enlace.
        Solo necesitas adjuntar lo que se pide; no es necesario volver a diligenciar toda la solicitud.</p>

        <p style="text-align:center;">
            <a href="{enlace_completar}" class="btn" target="_blank">Completar información</a>
        </p>

        <p>Con cariño,<br><strong style="color:#BE185D;">El equipo de Adoptify</strong></p>
    """
    return _enviar_correo(
        email_destino,
        asunto,
        _build_base_html("Necesitamos más información", contenido),
    )


def enviar_correo_rechazo_tienda(
    email_destino: str,
    nombre_tienda: str,
    motivo: str,
) -> bool:
    """Correo informando que la solicitud de la Tienda Aliada fue rechazada y el motivo."""
    asunto = f"💔 Actualización de tu solicitud — {nombre_tienda}"
    contenido = f"""
        <p>Hola, <strong>{nombre_tienda}</strong></p>
        <p>Lamentablemente, después de revisar cuidadosamente tu solicitud, hemos tomado la
        decisión de <strong>no aprobarla</strong> en esta ocasión.</p>

        <div class="caja">
            <p style="margin:0 0 6px;"><strong>Motivo del rechazo:</strong></p>
            <p style="margin:0;">{motivo}</p>
        </div>

        <p>
            Si consideras que esta decisión fue un error o deseas aclarar algún punto,
            no dudes en contactarnos. Estamos aquí para ayudarte a construir una comunidad
            segura y confiable para las mascotas.
        </p>
        <p>Con cariño,<br><strong style="color:#BE185D;">El equipo de Adoptify</strong></p>
    """
    return _enviar_correo(
        email_destino,
        asunto,
        _build_base_html("Estado de tu solicitud", contenido),
    )
