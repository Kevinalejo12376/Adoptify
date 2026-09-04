"""Puebla las tablas de catalogo (idempotente). Se ejecuta al arrancar la app.
Inserta cada valor solo si su 'codigo' aun no existe."""
from app.db.database import SessionLocal
from app.models import catalogos as cat
from app.models.tienda import TiendaPermiso
from app.models.refugio import RefugioPermiso

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
        ("empleado_refugio", "Empleado de refugio"),
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
        ("en_revision", "En revisión"),
        ("contactado", "Contactado"),
        ("finalizada", "Finalizada"),
        ("cerrada", "Cerrada"),
    ],
    cat.EstadoPedido: [
        ("pendiente", "Pendiente"),
        ("pagado", "Pagado"),
        ("preparando", "Preparando"),
        ("enviado", "Enviado"),
        ("en_camino", "En Camino"),
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
        ("funny", "Me divierte"),
        ("wow", "Me asombra"),
        ("sad", "Me entristece"),
        ("angry", "Me enoja"),
        # Tipos históricos (se conservan para no romper datos existentes).
        ("celebrate", "Celebrar"),
        ("support", "Apoyo"),
    ],
}

# foro_categorias incluye icono
FORO_CATEGORIAS = [
    ("adopciones", "Adopciones", "PawPrint"),
    ("eventos", "Eventos", "Calendar"),
    ("campanas", "Campañas", "Megaphone"),
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

# Razas de mascotas con su tipo asociado (perro/gato) para poder filtrar el
# selector de razas según el tipo de mascota seleccionado.
# Formato: (codigo, nombre, tipo_codigo)
RAZAS_MASCOTA = [
    # --- Perros ---
    ("labrador", "Labrador Retriever", "perro"),
    ("pastor_aleman", "Pastor Alemán", "perro"),
    ("golden", "Golden Retriever", "perro"),
    ("bulldog", "Bulldog", "perro"),
    ("poodle", "Poodle", "perro"),
    ("chihuahua", "Chihuahua", "perro"),
    ("beagle", "Beagle", "perro"),
    ("rottweiler", "Rottweiler", "perro"),
    ("criollo", "Criollo", "perro"),
    ("pug", "Pug", "perro"),
    ("shih_tzu", "Shih Tzu", "perro"),
    ("doberman", "Doberman", "perro"),
    ("boxer", "Boxer", "perro"),
    ("cocker", "Cocker Spaniel", "perro"),
    ("siberiano", "Husky Siberiano", "perro"),
    ("schnauzer", "Schnauzer", "perro"),
    ("maltes", "Maltés", "perro"),
    ("yorkshire", "Yorkshire Terrier", "perro"),
    # --- Gatos ---
    ("persa", "Persa", "gato"),
    ("siames", "Siamés", "gato"),
    ("maine_coon", "Maine Coon", "gato"),
    ("bengali", "Bengalí", "gato"),
    ("sphynx", "Sphynx", "gato"),
    ("angora", "Angora", "gato"),
    ("ragdoll", "Ragdoll", "gato"),
    ("britanico", "British Shorthair", "gato"),
    ("comun_europeo", "Común Europeo", "gato"),
    ("fold_escoces", "Scottish Fold", "gato"),
]

# ============================================================
# Catalogo de permisos del modulo Tienda (RBAC)
# Formato: (codigo, nombre, modulo, descripcion)
# Agregar un permiso nuevo = agregar una fila aqui. La logica
# del sistema de permisos no requiere cambios.
# ============================================================
TIENDA_PERMISOS = [
    # Dashboard
    ("dashboard.ver", "Ver dashboard", "dashboard", "Ver el panel principal de la tienda"),
    # Gestion de productos
    ("productos.ver", "Ver productos", "productos", "Ver el listado y detalle de productos"),
    ("productos.crear", "Crear productos", "productos", "Crear nuevos productos"),
    ("productos.editar", "Editar productos", "productos", "Editar productos existentes"),
    ("productos.eliminar", "Eliminar productos", "productos", "Eliminar productos"),
    ("productos.activar", "Activar productos", "productos", "Activar (mostrar) productos"),
    ("productos.desactivar", "Desactivar productos", "productos", "Desactivar (ocultar) productos"),
    # Gestion de categorias
    ("categorias.ver", "Ver categorias", "categorias", "Ver las categorias de productos"),
    ("categorias.crear", "Crear categorias", "categorias", "Crear nuevas categorias"),
    ("categorias.editar", "Editar categorias", "categorias", "Editar categorias existentes"),
    ("categorias.eliminar", "Eliminar categorias", "categorias", "Eliminar categorias"),
    # Gestion de inventario
    ("inventario.ver", "Ver inventario", "inventario", "Ver el inventario de la tienda"),
    ("inventario.actualizar_stock", "Actualizar stock", "inventario", "Actualizar el stock de productos"),
    ("inventario.registrar_entradas", "Registrar entradas", "inventario", "Registrar entradas de inventario"),
    ("inventario.registrar_salidas", "Registrar salidas", "inventario", "Registrar salidas de inventario"),
    # Gestion de pedidos
    ("pedidos.ver", "Ver pedidos", "pedidos", "Ver el listado y detalle de pedidos"),
    ("pedidos.aceptar", "Aceptar pedidos", "pedidos", "Aceptar pedidos"),
    ("pedidos.rechazar", "Rechazar pedidos", "pedidos", "Rechazar pedidos"),
    ("pedidos.cambiar_estado", "Cambiar estados", "pedidos", "Cambiar el estado de los pedidos"),
    ("pedidos.gestionar_devoluciones", "Gestionar devoluciones", "pedidos", "Gestionar devoluciones"),
    # Gestion de promociones
    ("promociones.ver", "Ver promociones", "promociones", "Ver las promociones de la tienda"),
    ("promociones.crear", "Crear promociones", "promociones", "Crear nuevas promociones"),
    ("promociones.editar", "Editar promociones", "promociones", "Editar promociones existentes"),
    ("promociones.eliminar", "Eliminar promociones", "promociones", "Eliminar promociones"),
    # Gestion de clientes
    ("clientes.ver", "Ver clientes", "clientes", "Ver los clientes de la tienda"),
    ("clientes.administrar", "Administrar clientes", "clientes", "Administrar la informacion de clientes"),
    # Gestion de la tienda (perfil)
    ("tienda.ver_perfil", "Ver perfil de la tienda", "tienda", "Ver el perfil de la tienda"),
    ("tienda.editar_informacion", "Editar informacion de la tienda", "tienda", "Editar la informacion de la tienda"),
    ("tienda.cambiar_logo", "Cambiar logo", "tienda", "Cambiar el logo de la tienda"),
    ("tienda.cambiar_imagenes", "Cambiar imagenes", "tienda", "Cambiar las imagenes de la tienda"),
    ("tienda.actualizar_horarios", "Actualizar horarios", "tienda", "Actualizar los horarios de atencion"),
    # Reportes
    ("reportes.ver_estadisticas", "Ver estadisticas", "reportes", "Ver las estadisticas de la tienda"),
    ("reportes.descargar_reportes", "Descargar reportes", "reportes", "Descargar reportes"),
    ("reportes.exportar_informacion", "Exportar informacion", "reportes", "Exportar informacion de la tienda"),
    # Configuracion
    ("configuracion.acceder", "Acceder a configuracion", "configuracion", "Acceder al apartado de configuracion"),
    ("configuracion.editar_configuraciones", "Editar configuraciones", "configuracion", "Editar las configuraciones permitidas"),
    # Administradores (exclusivo Super Administrador)
    ("administradores.gestionar", "Gestionar administradores", "administradores", "Crear, editar y eliminar administradores"),
    ("administradores.asignar_permisos", "Asignar permisos", "administradores", "Asignar permisos a los administradores"),
    # Historial de actividad
    ("historial.ver", "Ver historial de actividad", "historial", "Consultar el historial de actividad de la tienda"),
    # Donaciones
    ("donaciones.ver", "Ver donaciones", "donaciones", "Consultar las donaciones realizadas por la tienda"),
    ("donaciones.crear", "Realizar donaciones", "donaciones", "Donar productos a los refugios"),
    # PQRS (Atencion)
    ("pqrs.ver", "Ver PQRS", "pqrs", "Consultar las PQRS de la tienda"),
    ("pqrs.crear", "Crear PQRS", "pqrs", "Crear peticiones, quejas, reclamos o sugerencias"),
    ("pqrs.responder", "Responder PQRS", "pqrs", "Responder a las PQRS cuando corresponda"),
]


# Permisos del módulo Equipo de refugio (representante asigna a cada empleado).
REFUGIO_PERMISOS = [
    ("mascotas", "Mascotas", "mascotas", "Gestionar las mascotas del refugio"),
    ("solicitudes", "Solicitudes de adopción", "solicitudes", "Gestionar las solicitudes de adopción"),
    ("adopciones", "Adopciones", "adopciones", "Gestionar las adopciones exitosas"),
    ("foro", "Foro", "foro", "Publicar y gestionar el foro"),
    ("marketplace", "Marketplace", "marketplace", "Gestionar el marketplace/tienda"),
    ("pedidos", "Pedidos", "pedidos", "Gestionar los pedidos"),
    ("donaciones", "Donaciones", "donaciones", "Gestionar las donaciones"),
    ("estadisticas", "Estadísticas", "estadisticas", "Consultar las estadísticas"),
    ("configuracion", "Configuración del refugio", "configuracion", "Acceder a la configuración del refugio"),
    ("administrar_empleados", "Administrar empleados", "empleados", "Crear, editar, eliminar empleados y asignar permisos"),
]

# ── Ubicación: departamentos y municipios de Colombia ─────────────────────────
# Se usan como listas desplegables en el perfil del usuario. El código se genera
# automáticamente al sembrar (no se expone al usuario; solo el nombre se guarda).
DEPARTAMENTOS = [
    "Amazonas", "Antioquia", "Arauca", "Atlántico", "Bolívar", "Boyacá",
    "Caldas", "Caquetá", "Casanare", "Cauca", "Cesar", "Chocó", "Córdoba",
    "Cundinamarca", "Guainía", "Guaviare", "Huila", "La Guajira", "Magdalena",
    "Meta", "Nariño", "Norte de Santander", "Putumayo", "Quindío", "Risaralda",
    "San Andrés y Providencia", "Santander", "Sucre", "Tolima", "Valle del Cauca",
    "Vaupés", "Vichada", "Bogotá D.C.",
]

MUNICIPIOS_POR_DEPARTAMENTO = {
    "Amazonas": ["Leticia", "Puerto Nariño", "El Encanto", "La Chorrera"],
    "Antioquia": ["Medellín", "Bello", "Envigado", "Itagüí", "Sabaneta", "Rionegro",
                  "Marinilla", "La Ceja", "Apartadó", "Turbo", "Caucasia", "Yarumal",
                  "Santa Fe de Antioquia", "Andes", "Amagá", "Barbosa", "Caldas",
                  "Copacabana", "Girardota", "Támesis"],
    "Arauca": ["Arauca", "Arauquita", "Tame", "Saravena"],
    "Atlántico": ["Barranquilla", "Soledad", "Malambo", "Puerto Colombia",
                  "Sabanalarga", "Baranoa", "Galapa", "Sabanagrande"],
    "Bolívar": ["Cartagena", "Magangué", "Turbaco", "El Carmen de Bolívar",
                "Mompox", "Arjona", "María la Baja", "Calamar", "San Juan Nepomuceno"],
    "Boyacá": ["Tunja", "Duitama", "Sogamoso", "Chiquinquirá", "Paipa",
               "Villa de Leyva", "Moniquirá", "Garagoa", "Puerto Boyacá", "Ramiriquí"],
    "Caldas": ["Manizales", "Villamaría", "Chinchiná", "La Dorada", "Riosucio",
               "Salamina", "Neira", "Palestina", "Aguadas"],
    "Caquetá": ["Florencia", "San Vicente del Caguán", "Belén de los Andaquíes", "El Doncello"],
    "Casanare": ["Yopal", "Aguazul", "Tauramena", "Villanueva", "Paz de Ariporo"],
    "Cauca": ["Popayán", "Santander de Quilichao", "Puerto Tejada", "Piendamó",
              "Silvia", "Corinto", "Miranda", "Guapi", "Timbío"],
    "Cesar": ["Valledupar", "Aguachica", "La Paz", "San Diego", "Bosconia", "Codazzi"],
    "Chocó": ["Quibdó", "Istmina", "Condoto", "Tadó", "Nuquí", "Bahía Solano"],
    "Córdoba": ["Montería", "Cereté", "Lorica", "Sahagún", "Tierralta",
                "Montelíbano", "Planeta Rica", "Ciénaga de Oro"],
    "Cundinamarca": ["Soacha", "Zipaquirá", "Chía", "Facatativá", "Fusagasugá",
                     "Madrid", "Mosquera", "Cajicá", "Girardot", "Ubaté", "La Calera",
                     "Cota", "Funza", "Sibaté", "Tocancipá", "Tenjo", "Tabio",
                     "Sopó", "Sesquilé", "Nemocón", "Guatavita"],
    "Guainía": ["Inírida", "Puerto Colombia (Guainía)"],
    "Guaviare": ["San José del Guaviare", "El Retorno", "Calamar (Guaviare)"],
    "Huila": ["Neiva", "Pitalito", "Garzón", "La Plata", "Campoalegre", "Gigante",
              "Palermo", "Rivera"],
    "La Guajira": ["Riohacha", "Maicao", "Uribia", "Manaure", "Albania",
                   "Barrancas", "San Juan del Cesar"],
    "Magdalena": ["Santa Marta", "Ciénaga", "Fundación", "El Banco", "Plato",
                  "Aracataca", "Pivijay"],
    "Meta": ["Villavicencio", "Acacías", "Granada", "Puerto López", "San Martín",
             "Restrepo", "Guamal"],
    "Nariño": ["Pasto", "Tumaco", "Ipiales", "Túquerres", "Barbacoas",
               "La Unión", "El Charco"],
    "Norte de Santander": ["Cúcuta", "Ocaña", "Pamplona", "Los Patios",
                           "Villa del Rosario", "Chinácota", "El Zulia"],
    "Putumayo": ["Mocoa", "Puerto Asís", "Orito", "Sibundoy",
                 "Valle del Guamuez", "San Miguel"],
    "Quindío": ["Armenia", "Calarcá", "La Tebaida", "Montenegro", "Quimbaya",
                "Salento", "Circasia"],
    "Risaralda": ["Pereira", "Dosquebradas", "Santa Rosa de Cabal", "La Virginia",
                  "Belén de Umbría", "Marsella"],
    "San Andrés y Providencia": ["San Andrés", "Providencia"],
    "Santander": ["Bucaramanga", "Floridablanca", "Girón", "Piedecuesta",
                  "Barrancabermeja", "San Gil", "Vélez", "Socorro", "Málaga"],
    "Sucre": ["Sincelejo", "Corozal", "Tolú", "Sampués", "San Marcos", "Morroa"],
    "Tolima": ["Ibagué", "Espinal", "Melgar", "Honda", "Chaparral", "Líbano",
               "Mariquita", "Flandes"],
    "Valle del Cauca": ["Cali", "Palmira", "Buenaventura", "Tuluá", "Buga",
                        "Cartago", "Jamundí", "Yumbo", "Candelaria", "Dagua",
                        "Guacarí", "Roldanillo"],
    "Vaupés": ["Mitú"],
    "Vichada": ["Puerto Carreño", "La Primavera"],
    "Bogotá D.C.": ["Bogotá D.C."],
}


def _seed_ubicacion(db):
    """Siembra departamentos y municipios de Colombia (idempotente).

    Los códigos se generan a partir de la posición del departamento y del id
    del departamento (para el municipio), de modo que no dependan del nombre
    (que puede repetirse entre departamentos, p. ej. "Riosucio" en Caldas y
    Chocó). Si un departamento ya existe por nombre, se reutiliza.
    """
    deptos_por_nombre = {}
    for idx, nombre in enumerate(DEPARTAMENTOS, start=1):
        codigo = f"D{idx:02d}"
        depto = db.query(cat.Departamento).filter(cat.Departamento.codigo == codigo).first()
        if depto is None:
            depto = db.query(cat.Departamento).filter(cat.Departamento.nombre == nombre).first()
        if depto is None:
            depto = cat.Departamento(codigo=codigo, nombre=nombre)
            db.add(depto)
            db.flush()
        deptos_por_nombre[nombre] = depto

    db.flush()
    for depto_nombre, municipios in MUNICIPIOS_POR_DEPARTAMENTO.items():
        depto = deptos_por_nombre.get(depto_nombre)
        if depto is None:
            continue
        for i, nombre in enumerate(municipios, start=1):
            codigo = f"M{depto.id:04d}-{i:03d}"
            existe = db.query(cat.Municipio).filter(cat.Municipio.codigo == codigo).first()
            if existe is None:
                existe = (
                    db.query(cat.Municipio)
                    .filter(
                        cat.Municipio.departamento_id == depto.id,
                        cat.Municipio.nombre == nombre,
                    )
                    .first()
                )
            if existe is None:
                db.add(cat.Municipio(codigo=codigo, nombre=nombre, departamento_id=depto.id))


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

        # Razas de mascotas con su tipo asociado (perro/gato) para filtrar el
        # selector de razas según el tipo de mascota seleccionado.
        existentes_rz = {c for (c,) in db.query(cat.RazaMascota.codigo).all()}
        tipos_id = {t.codigo: t.id for t in db.query(cat.TipoMascota).all()}
        for codigo, nombre, tipo_codigo in RAZAS_MASCOTA:
            if codigo not in existentes_rz:
                db.add(cat.RazaMascota(
                    codigo=codigo,
                    nombre=nombre,
                    tipo_mascota_id=tipos_id.get(tipo_codigo),
                ))

        # Catalogo de permisos del modulo Tienda (idempotente)
        existentes_tp = {c for (c,) in db.query(TiendaPermiso.codigo).all()}
        for codigo, nombre, modulo, descripcion in TIENDA_PERMISOS:
            if codigo not in existentes_tp:
                db.add(TiendaPermiso(codigo=codigo, nombre=nombre, modulo=modulo, descripcion=descripcion))

        # Catálogo de permisos del módulo Equipo de refugio (idempotente)
        existentes_rp = {c for (c,) in db.query(RefugioPermiso.codigo).all()}
        for codigo, nombre, modulo, descripcion in REFUGIO_PERMISOS:
            if codigo not in existentes_rp:
                db.add(RefugioPermiso(codigo=codigo, nombre=nombre, modulo=modulo, descripcion=descripcion))

        _seed_ubicacion(db)

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
