"""Puebla las tablas de catalogo (idempotente). Se ejecuta al arrancar la app.
Inserta cada valor solo si su 'codigo' aun no existe."""
from app.db.database import SessionLocal
from app.models import catalogos as cat

# (codigo, nombre) por cada catalogo
DATOS = {
    cat.TipoDocumento: [
        ("CC", "Cedula de ciudadania"),
        ("CE", "Cedula de extranjeria"),
        ("PA", "Pasaporte"),
        ("NIT", "NIT"),
    ],
    cat.Rol: [
        ("usuario", "Usuario adoptante"),
        ("refugio", "Refugio"),
        ("administrador_principal", "Administrador principal"),
        ("administrador", "Administrador"),
        ("tienda_aliada", "Tienda aliada"),
    ],
    cat.TipoMascota: [
        ("perro", "Perro"),
        ("gato", "Gato"),
        ("otro", "Otro"),
    ],
    cat.TamanoMascota: [
        ("pequeno", "Pequeno"),
        ("mediano", "Mediano"),
        ("grande", "Grande"),
    ],
    cat.GeneroMascota: [
        ("macho", "Macho"),
        ("hembra", "Hembra"),
    ],
    cat.EstadoMascota: [
        ("disponible", "Disponible"),
        ("en_proceso", "En proceso"),
        ("adoptado", "Adoptado"),
    ],
    cat.EstadoSolicitud: [
        ("pendiente", "Pendiente"),
        ("en_revision", "En revision"),
        ("contactado", "Contactado"),
        ("finalizada", "Finalizada"),
        ("cerrada", "Cerrada"),
    ],
    cat.EstadoPedido: [
        ("pendiente", "Pendiente"),
        ("pagado", "Pagado"),
        ("enviado", "Enviado"),
        ("entregado", "Entregado"),
        ("cancelado", "Cancelado"),
    ],
    cat.CategoriaProducto: [
        ("alimentos", "Alimentos"),
        ("accesorios", "Accesorios"),
        ("juguetes", "Juguetes"),
        ("salud", "Salud"),
        ("higiene", "Higiene"),
        ("ropa", "Ropa"),
    ],
    cat.TipoPostForo: [
        ("story", "Historia"),
        ("question", "Pregunta"),
        ("tip", "Consejo"),
        ("event", "Evento"),
        ("campaign", "Campana"),
        ("donation", "Donacion"),
    ],
    cat.EstadoPostForo: [
        ("published", "Publicado"),
        ("draft", "Borrador"),
        ("archived", "Archivado"),
    ],
    cat.TipoReaccion: [
        ("like", "Me gusta"),
        ("love", "Me encanta"),
        ("celebrate", "Celebrar"),
        ("support", "Apoyo"),
        ("funny", "Divertido"),
    ],
}

# foro_categorias incluye icono
FORO_CATEGORIAS = [
    ("adopciones", "Adopciones", "PawPrint"),
    ("eventos", "Eventos", "Calendar"),
    ("campanas", "Campanas", "Megaphone"),
    ("donaciones", "Donaciones", "HandHeart"),
    ("rescates", "Rescates", "LifeBuoy"),
    ("historias", "Historias", "BookOpen"),
    ("voluntariado", "Voluntariado", "Users"),
    ("cuidado", "Cuidado", "Heart"),
    ("entrenamiento", "Entrenamiento", "Target"),
    ("salud", "Salud", "Stethoscope"),
    ("nutricion", "Nutricion", "Bone"),
    ("general", "General", "MessageSquare"),
]


def seed_catalogos():
    db = SessionLocal()
    try:
        for Model, filas in DATOS.items():
            existentes = {c for (c,) in db.query(Model.codigo).all()}
            for codigo, nombre in filas:
                if codigo not in existentes:
                    db.add(Model(codigo=codigo, nombre=nombre))

        existentes_fc = {c for (c,) in db.query(cat.ForoCategoria.codigo).all()}
        for codigo, nombre, icono in FORO_CATEGORIAS:
            if codigo not in existentes_fc:
                db.add(cat.ForoCategoria(codigo=codigo, nombre=nombre, icono=icono))

        db.commit()

        # --- Super administrador por defecto (si no existe) ---
        from app.models.usuario import Usuario
        from app.core.security import get_password_hash
        admin_email = "adoptifyoficial@gmail.com"
        if not db.query(Usuario).filter(Usuario.email == admin_email).first():
            rol_admin = db.query(cat.Rol).filter(cat.Rol.codigo == "administrador_principal").first()
            if rol_admin:
                db.add(Usuario(
                    nombre="Adoptify Oficial",
                    email=admin_email,
                    hashed_password=get_password_hash("Adoptify_Oficial2026"),
                    rol_id=rol_admin.id,
                ))
                db.commit()
    finally:
        db.close()
