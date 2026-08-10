"""Servicio de envio de correos electronicos via Brevo (Sendinblue) API."""
import logging
import random
import httpx
from app.core.config import settings

logger = logging.getLogger(__name__)


def _generar_codigo(longitud: int = 6) -> str:
    """Genera un código numérico aleatorio de la longitud especificada."""
    return "".join(random.choices("0123456789", k=longitud))


def _build_welcome_html(nombre: str, apellido: str | None = None) -> str:
    """Construye el HTML del correo de bienvenida con diseño naranja."""
    nombre_completo = f"{nombre} {apellido or ''}".strip()
    return f"""<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {{
            margin: 0;
            padding: 0;
            background-color: #f4f4f4;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }}
        .container {{
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }}
        .header {{
            background: linear-gradient(135deg, #FF8C00, #ea580c);
            padding: 30px 30px 25px;
            text-align: center;
        }}
        .header-logo {{
            font-size: 42px;
            font-weight: 800;
            color: #ffffff;
            letter-spacing: 2px;
            text-shadow: 0 2px 4px rgba(0,0,0,0.15);
            margin-bottom: 8px;
        }}
        .header-logo .paw {{
            display: inline-block;
            margin-right: 6px;
        }}
        .header h1 {{
            color: #ffffff;
            margin: 12px 0 0;
            font-size: 26px;
            font-weight: 700;
        }}
        .header p {{
            color: #ffedd5;
            margin: 8px 0 0;
            font-size: 15px;
        }}
        .content {{
            padding: 40px 30px;
            color: #333333;
        }}
        .content h2 {{
            color: #ea580c;
            font-size: 22px;
            margin-top: 0;
        }}
        .content p {{
            line-height: 1.8;
            font-size: 15px;
            margin: 16px 0;
        }}
        .btn {{
            display: inline-block;
            background: linear-gradient(135deg, #FF8C00, #ea580c);
            color: #ffffff !important;
            text-decoration: none;
            padding: 14px 36px;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            margin: 20px 0;
            box-shadow: 0 4px 12px rgba(234, 88, 12, 0.3);
        }}
        .btn:hover {{
            box-shadow: 0 6px 20px rgba(234, 88, 12, 0.4);
        }}
        .features {{
            background: linear-gradient(135deg, #fff7ed, #fffbeb);
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
            border-left: 4px solid #FF8C00;
        }}
        .features li {{
            margin: 10px 0;
            font-size: 14px;
            color: #555555;
        }}
        .codigo-box {{
            background: linear-gradient(135deg, #fff7ed, #fffbeb);
            border-radius: 12px;
            padding: 24px;
            margin: 20px 0;
            text-align: center;
            border: 2px dashed #FF8C00;
        }}
        .codigo-box .codigo {{
            font-size: 36px;
            font-weight: 800;
            color: #ea580c;
            letter-spacing: 8px;
            font-family: 'Courier New', monospace;
        }}
        .codigo-box .validez {{
            font-size: 13px;
            color: #888;
            margin-top: 12px;
        }}
        .footer {{
            background-color: #f4f4f4;
            padding: 25px 30px;
            text-align: center;
            color: #888888;
            font-size: 13px;
        }}
        .footer a {{
            color: #ea580c;
            text-decoration: none;
        }}
        .footer a:hover {{
            text-decoration: underline;
        }}
        @media only screen and (max-width: 480px) {{
            .header {{ padding: 25px 20px; }}
            .header h1 {{ font-size: 22px; }}
            .content {{ padding: 30px 20px; }}
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="header-logo">
                <span class="paw">🐾</span> ADOPTIFY
            </div>
            <h1>&iexcl;Bienvenido a la familia!</h1>
            <p>Un hogar para cada mascota</p>
        </div>

        <div class="content">
            <h2>&iexcl;Hola, {nombre_completo}! 👋</h2>

            <p>
                Gracias por registrarte en <strong>Adoptify</strong>, la plataforma que conecta
                mascotas en busca de un hogar con personas amorosas como t&uacute;.
            </p>

            <p>Estamos emocionados de tenerte en nuestra comunidad. Con tu nueva cuenta puedes:</p>

            <div class="features">
                <ul>
                    <li>🐶 <strong>Explorar mascotas</strong> disponibles para adopci&oacute;n cerca de ti</li>
                    <li>🏪 <strong>Visitar tiendas aliadas</strong> y encontrar productos para tu mascota</li>
                    <li>💬 <strong>Participar en el foro</strong> y compartir experiencias con otros amantes de los animales</li>
                    <li>❤️ <strong>Guardar tus favoritos</strong> y dar el primer paso hacia una adopci&oacute;n</li>
                </ul>
            </div>

            <p style="text-align: center;">
                <a href="{settings.FRONTEND_URL}" class="btn" target="_blank">
                    Explorar Adoptify
                </a>
            </p>

            <p>
                Si tienes alguna pregunta o necesitas ayuda, no dudes en contactarnos.
                &iexcl;Estamos aqu&iacute; para ayudarte!
            </p>

            <p>Con cari&ntilde;o,<br><strong>El equipo de Adoptify</strong></p>
        </div>

        <div class="footer">
            <p>&copy; 2026 Adoptify. Todos los derechos reservados.</p>
            <p>
                <a href="{settings.FRONTEND_URL}/privacy">Pol&iacute;tica de privacidad</a> &bull;
                <a href="{settings.FRONTEND_URL}/terms">T&eacute;rminos de servicio</a>
            </p>
            <p style="margin-top:10px; font-size:11px;">
                Este correo fue enviado autom&aacute;ticamente al registrarte en Adoptify.
                Por favor no respondas a este mensaje.
            </p>
        </div>
    </div>
</body>
</html>"""


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

    return f"""<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {{
            margin: 0;
            padding: 0;
            background-color: #f4f4f4;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }}
        .container {{
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }}
        .header {{
            background: linear-gradient(135deg, #FF8C00, #ea580c);
            padding: 30px 30px 25px;
            text-align: center;
        }}
        .header-logo {{
            font-size: 42px;
            font-weight: 800;
            color: #ffffff;
            letter-spacing: 2px;
            text-shadow: 0 2px 4px rgba(0,0,0,0.15);
        }}
        .header h1 {{
            color: #ffffff;
            margin: 12px 0 0;
            font-size: 24px;
            font-weight: 700;
        }}
        .content {{
            padding: 40px 30px;
            color: #333333;
        }}
        .content h2 {{
            color: #ea580c;
            font-size: 20px;
            margin-top: 0;
        }}
        .content p {{
            line-height: 1.8;
            font-size: 15px;
            margin: 16px 0;
        }}
        .codigo-box {{
            background: linear-gradient(135deg, #fff7ed, #fffbeb);
            border-radius: 12px;
            padding: 28px 24px;
            margin: 24px 0;
            text-align: center;
            border: 2px dashed #FF8C00;
        }}
        .codigo-box .codigo {{
            font-size: 40px;
            font-weight: 800;
            color: #ea580c;
            letter-spacing: 10px;
            font-family: 'Courier New', monospace;
            user-select: all;
        }}
        .codigo-box .validez {{
            font-size: 13px;
            color: #888888;
            margin-top: 14px;
        }}
        .aviso {{
            background-color: #fef3c7;
            border-radius: 8px;
            padding: 14px 18px;
            font-size: 13px;
            color: #92400e;
            margin: 20px 0;
        }}
        .footer {{
            background-color: #f4f4f4;
            padding: 25px 30px;
            text-align: center;
            color: #888888;
            font-size: 13px;
        }}
        .footer a {{
            color: #ea580c;
            text-decoration: none;
        }}
        @media only screen and (max-width: 480px) {{
            .header {{ padding: 25px 20px; }}
            .header h1 {{ font-size: 20px; }}
            .content {{ padding: 30px 20px; }}
            .codigo-box .codigo {{ font-size: 32px; letter-spacing: 6px; }}
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="header-logo">🐾 ADOPTIFY</div>
            <h1>{titulo}</h1>
        </div>

        <div class="content">
            <h2>&iexcl;Hola{', ' + nombre_saludo if nombre_saludo else '!'} 👋</h2>

            <p>{mensaje_principal}</p>

            <div class="codigo-box">
                <div class="codigo">{codigo}</div>
                <div class="validez">Este código es válido por 10 minutos</div>
            </div>

            <div class="aviso">
                ⚠️ Si no solicitaste este código, ignora este mensaje. 
                Nunca compartas este código con nadie.
            </div>

            <p>
                Si tienes alguna pregunta, no dudes en contactarnos.
            </p>

            <p>Con cari&ntilde;o,<br><strong>El equipo de Adoptify</strong></p>
        </div>

        <div class="footer">
            <p>&copy; 2026 Adoptify. Todos los derechos reservados.</p>
            <p>
                <a href="{settings.FRONTEND_URL}/privacy">Pol&iacute;tica de privacidad</a> &bull;
                <a href="{settings.FRONTEND_URL}/terms">T&eacute;rminos de servicio</a>
            </p>
        </div>
    </div>
</body>
</html>"""


def _enviar_correo(email_destino: str, asunto: str, html: str) -> bool:
    """Función interna para enviar un correo mediante la API de Brevo (Sendinblue)."""
    if not settings.BREVO_API_KEY:
        logger.warning("Brevo no configurado — no se envió correo a %s", email_destino)
        return False

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
    """Envuelve un contenido en el diseño base de Adoptify (naranja/rosa)."""
    return f"""<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {{
            margin: 0; padding: 0; background-color: #f4f4f5;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }}
        .container {{
            max-width: 600px; margin: 24px auto; background-color: #ffffff;
            border-radius: 16px; overflow: hidden;
            box-shadow: 0 8px 30px rgba(0,0,0,0.08);
        }}
        .header {{
            background: linear-gradient(135deg, #FF8C00, #f43f5e);
            padding: 32px 30px 26px; text-align: center;
        }}
        .header-logo {{
            font-size: 40px; font-weight: 800; color: #ffffff;
            letter-spacing: 2px; text-shadow: 0 2px 6px rgba(0,0,0,0.18);
            margin-bottom: 6px;
        }}
        .header h1 {{
            color: #ffffff; margin: 10px 0 0; font-size: 24px; font-weight: 700;
        }}
        .content {{ padding: 36px 30px; color: #333333; }}
        .content p {{ line-height: 1.8; font-size: 15px; margin: 14px 0; }}
        .caja {{
            background: linear-gradient(135deg, #fff7ed, #fff1f2);
            border-radius: 12px; padding: 20px 22px; margin: 20px 0;
            border-left: 4px solid #FF8C00;
        }}
        .caja strong {{ color: #ea580c; }}
        .btn {{
            display: inline-block; background: linear-gradient(135deg, #FF8C00, #f43f5e);
            color: #ffffff !important; text-decoration: none; padding: 14px 38px;
            border-radius: 12px; font-size: 16px; font-weight: 600; margin: 22px 0;
            box-shadow: 0 6px 18px rgba(244, 63, 94, 0.3);
        }}
        .footnote {{ font-size: 13px; color: #888888; line-height: 1.6; }}
        .footer {{
            background-color: #fafafa; padding: 24px 30px; text-align: center;
            color: #999999; font-size: 13px; border-top: 1px solid #f0f0f0;
        }}
        .footer a {{ color: #ea580c; text-decoration: none; }}
        @media only screen and (max-width: 480px) {{
            .header {{ padding: 24px 18px; }}
            .header h1 {{ font-size: 20px; }}
            .content {{ padding: 26px 18px; }}
            .btn {{ padding: 12px 28px; font-size: 15px; }}
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="header-logo">🐾 ADOPTIFY</div>
            <h1>{titulo}</h1>
        </div>
        <div class="content">
            {contenido_html}
        </div>
        <div class="footer">
            <p>&copy; 2026 Adoptify. Todos los derechos reservados.</p>
            <p>
                <a href="{settings.FRONTEND_URL}">Ir a Adoptify</a> &bull;
                <a href="{settings.FRONTEND_URL}/privacy">Privacidad</a>
            </p>
            <p style="margin-top:8px; font-size:11px;">
                Este correo fue enviado automáticamente. Por favor no respondas a este mensaje.
            </p>
        </div>
    </div>
</body>
</html>"""


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
            <p style="margin:0; font-size:22px; font-weight:800; color:#ea580c; letter-spacing:1px;">{username}</p>
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
        <p>Con cariño,<br><strong>El equipo de Adoptify</strong></p>
    """
    return _enviar_correo(email_destino, asunto, _build_base_html("¡Solicitud aprobada!", contenido))


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

        <p>Con cariño,<br><strong>El equipo de Adoptify</strong></p>
    """
    return _enviar_correo(
        email_destino,
        asunto,
        _build_base_html("Necesitamos más información", contenido),
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
        <p>Con cariño,<br><strong>El equipo de Adoptify</strong></p>
    """
    return _enviar_correo(
        email_destino,
        asunto,
        _build_base_html("Estado de tu solicitud", contenido),
    )
