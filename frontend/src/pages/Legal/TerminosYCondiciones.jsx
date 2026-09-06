import React from "react";
import {
  ShieldCheck,
  Sparkles,
  User,
  UserCog,
  HeartHandshake,
  ShoppingCart,
  MessageCircle,
  Building2,
  Ban,
  Scale,
  FileText,
  UserX,
  Server,
  Lock,
  RefreshCcw,
  Mail,
  CheckCircle2,
} from "lucide-react";
import LegalLayout, {
  LegalSectionHeader,
  useLegalBack,
  HERO_META_ICONS,
} from "./LegalLayout";

// Índice rápido de la página (navegación interna por anclas).
const INDICE = [
  { id: "tyc-aceptacion", n: "01", label: "Aceptación de los términos" },
  { id: "tyc-descripcion", n: "02", label: "Descripción de Adoptify" },
  { id: "tyc-registro", n: "03", label: "Registro y cuentas" },
  { id: "tyc-roles", n: "04", label: "Roles dentro de Adoptify" },
  { id: "tyc-adopcion", n: "05", label: "Procesos de adopción" },
  { id: "tyc-marketplace", n: "06", label: "Marketplace" },
  { id: "tyc-foro", n: "07", label: "Foro y contenido" },
  { id: "tyc-donaciones", n: "08", label: "Donaciones entre refugios" },
  { id: "tyc-prohibido", n: "09", label: "Conductas prohibidas" },
  { id: "tyc-responsabilidad", n: "10", label: "Responsabilidad del usuario" },
  { id: "tyc-propiedad", n: "11", label: "Propiedad intelectual" },
  { id: "tyc-suspension", n: "12", label: "Suspensión o eliminación" },
  { id: "tyc-disponibilidad", n: "13", label: "Disponibilidad" },
  { id: "tyc-limitacion", n: "14", label: "Limitación de responsabilidad" },
  { id: "tyc-modificaciones", n: "15", label: "Modificaciones" },
  { id: "tyc-legislacion", n: "16", label: "Legislación aplicable" },
  { id: "tyc-contacto", n: "17", label: "Contacto" },
  { id: "tyc-aceptacion-final", n: "18", label: "Aceptación" },
];

// Datos del documento mostrados en el hero.
const META_DOC = [
  { ...HERO_META_ICONS.calendar, label: "Última actualización", value: "Agosto de 2026" },
  { ...HERO_META_ICONS.version, label: "Versión del sistema", value: "1.0 (Producción)" },
  { ...HERO_META_ICONS.entidad, label: "Entidad responsable", value: "Equipo de Desarrollo de Adoptify" },
  {
    ...HERO_META_ICONS.correo,
    label: "Correo electrónico de contacto",
    value: "adoptifyoficial@gmail.com",
    href: "mailto:adoptifyoficial@gmail.com",
  },
];

// Contenedor de cada artículo/sección del documento.
function Articulo({ id, numero, icono, titulo, subtitulo, gradiente, colorIcono, children }) {
  return (
    <article
      id={id}
      className="scroll-mt-24 bg-white dark:bg-dark-card rounded-3xl border border-gray-100 dark:border-dark-border shadow-sm overflow-hidden"
    >
      <LegalSectionHeader
        numero={numero}
        icono={icono}
        titulo={titulo}
        subtitulo={subtitulo}
        gradiente={gradiente}
        colorIcono={colorIcono}
      />
      <div className="px-5 sm:px-8 py-6 sm:py-7 space-y-4">{children}</div>
    </article>
  );
}

// Párrafo estándar.
function P({ children, className = "" }) {
  return (
    <p
      className={`text-[15px] leading-7 text-gray-600 dark:text-dark-text-secondary ${className}`}
    >
      {children}
    </p>
  );
}

// Lista con viñetas (punto de color).
function Lista({ dot = "bg-rose-400", children }) {
  return (
    <ul className="space-y-3">
      {React.Children.map(children, (child) => (
        <li className="flex gap-3">
          <span className={`mt-[13px] h-2 w-2 rounded-full ${dot} flex-shrink-0`} />
          <span className="flex-1 min-w-0 text-[15px] leading-7 text-gray-600 dark:text-dark-text-secondary">
            {child}
          </span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Página global de "Términos y Condiciones" de Adoptify.
 *
 * Página independiente y accesible para TODOS los roles y visitantes, con el
 * mismo diseño y funcionalidades que la Política de Privacidad: NO muestra
 * Navbar/Sidebar, incluye índice, botón "Volver" contextual que regresa a la
 * vista anterior (con su scroll) y soporte claro/oscuro y responsive.
 */
export default function TerminosYCondiciones() {
  const { homePath, backLabel, handleBack } = useLegalBack();

  return (
    <LegalLayout
      onBack={handleBack}
      backLabel={backLabel}
      homePath={homePath}
      hero={{
        icon: Scale,
        overline: "Términos y Responsabilidades",
        title: "Términos y Condiciones de Adoptify",
        subtitle:
          "Conoce las reglas, condiciones y responsabilidades que aplican al uso de Adoptify, sus funcionalidades y su comunidad.",
        meta: META_DOC,
      }}
      indice={INDICE}
      fecha="agosto de 2026"
      version="1.0 (Producción)"
      docName="Términos y Condiciones"
    >
      {/* 1. Aceptación de los términos */}
      <Articulo
        id="tyc-aceptacion"
        numero="1"
        icono={ShieldCheck}
        titulo="Aceptación de los términos"
        subtitulo="Condición previa para usar la plataforma"
        gradiente="from-rose-500 to-pink-600"
        colorIcono="text-rose-500"
      >
        <P>Al registrarse, acceder o utilizar Adoptify, el usuario acepta los presentes Términos y Condiciones.</P>
        <P>Si el usuario no está de acuerdo con alguno de estos términos, deberá abstenerse de utilizar la plataforma.</P>
        <P>
          Estos términos aplican a todas las personas que utilicen Adoptify, independientemente de su rol dentro
          del sistema.
        </P>
      </Articulo>

      {/* 2. Descripción de Adoptify */}
      <Articulo
        id="tyc-descripcion"
        numero="2"
        icono={Sparkles}
        titulo="Descripción de Adoptify"
        subtitulo="Qué es la plataforma y sus funcionalidades"
        gradiente="from-blue-500 to-indigo-600"
        colorIcono="text-blue-500"
      >
        <P>
          Adoptify es una plataforma digital orientada a facilitar la interacción entre personas interesadas en
          la adopción responsable de mascotas, refugios, rescatistas y tiendas aliadas.
        </P>
        <P>La plataforma proporciona funcionalidades relacionadas con:</P>
        <Lista dot="bg-blue-400">
          <span>Publicación y consulta de mascotas disponibles para adopción.</span>
          <span>Gestión de procesos de postulación a adopción.</span>
          <span>Marketplace de productos para mascotas.</span>
          <span>Foro y comunidad.</span>
          <span>Intercambio de donaciones entre refugios.</span>
          <span>Gestión de usuarios, refugios, tiendas y administradores.</span>
        </Lista>
        <P>
          Adoptify funciona como una plataforma intermediaria y no formaliza directamente los procesos legales de
          adopción entre usuarios y refugios.
        </P>
      </Articulo>

      {/* 3. Registro y cuentas */}
      <Articulo
        id="tyc-registro"
        numero="3"
        icono={User}
        titulo="Registro y cuentas"
        subtitulo="Obligaciones del usuario con su cuenta"
        gradiente="from-emerald-500 to-teal-600"
        colorIcono="text-emerald-500"
      >
        <P>
          Para utilizar determinadas funcionalidades de Adoptify, el usuario deberá crear una cuenta proporcionando
          información correcta, actualizada y verificable.
        </P>
        <P>El usuario es responsable de:</P>
        <Lista dot="bg-emerald-400">
          <span>Proporcionar información verdadera.</span>
          <span>Mantener actualizados sus datos.</span>
          <span>Proteger sus credenciales de acceso.</span>
          <span>No compartir su contraseña o mecanismos de autenticación.</span>
          <span>Informar cualquier acceso no autorizado a su cuenta.</span>
        </Lista>
        <P>
          Cada usuario deberá utilizar únicamente su propia cuenta y no podrá hacerse pasar por otra persona,
          refugio, tienda o entidad.
        </P>
      </Articulo>

      {/* 4. Roles dentro de Adoptify */}
      <Articulo
        id="tyc-roles"
        numero="4"
        icono={UserCog}
        titulo="Roles dentro de Adoptify"
        subtitulo="Matriz de roles y permisos de la plataforma"
        gradiente="from-amber-500 to-orange-500"
        colorIcono="text-amber-500"
      >
        <P>Adoptify cuenta con diferentes roles y permisos:</P>
        <div className="grid sm:grid-cols-2 gap-3.5">
          {[
            {
              titulo: "Usuario / Adoptante",
              icono: User,
              box: "bg-rose-100 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400",
              texto:
                "Puede consultar mascotas, realizar postulaciones, interactuar en el foro, utilizar funcionalidades del Marketplace y gestionar su perfil.",
            },
            {
              titulo: "Refugio / Rescatista",
              icono: Building2,
              box: "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
              texto:
                "Puede gestionar información relacionada con mascotas, procesos de adopción, publicaciones, donaciones y otras funcionalidades autorizadas por la plataforma.",
            },
            {
              titulo: "Tienda Aliada",
              icono: ShoppingCart,
              box: "bg-amber-100 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400",
              texto:
                "Puede gestionar productos, inventario y solicitudes relacionadas con el Marketplace de acuerdo con los permisos establecidos.",
            },
            {
              titulo: "Administrador",
              icono: ShieldCheck,
              box: "bg-violet-100 dark:bg-violet-500/15 text-violet-600 dark:text-violet-400",
              texto:
                "Gestiona y supervisa el funcionamiento general de la plataforma, usuarios, refugios, tiendas, permisos, estadísticas y acciones administrativas.",
            },
          ].map((rol) => {
            const RolIcon = rol.icono;
            return (
              <div
                key={rol.titulo}
                className="rounded-2xl border border-gray-100 dark:border-dark-border bg-gray-50/60 dark:bg-dark-bg/40 p-4"
              >
                <p className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-dark-text mb-1.5">
                  <span
                    className={`flex items-center justify-center w-8 h-8 rounded-xl ${rol.box} flex-shrink-0`}
                  >
                    <RolIcon size={15} />
                  </span>
                  {rol.titulo}
                </p>
                <p className="text-sm leading-6 text-gray-500 dark:text-dark-text-secondary">{rol.texto}</p>
              </div>
            );
          })}
        </div>
        <P>Las funcionalidades disponibles pueden variar según el rol y los permisos asignados.</P>
      </Articulo>

      {/* 5. Procesos de adopción */}
      <Articulo
        id="tyc-adopcion"
        numero="5"
        icono={HeartHandshake}
        titulo="Procesos de adopción"
        subtitulo="Papel de la plataforma frente a las adopciones"
        gradiente="from-violet-500 to-purple-600"
        colorIcono="text-violet-500"
      >
        <P>Adoptify facilita la conexión entre usuarios interesados en adoptar y refugios registrados.</P>
        <P>
          La plataforma no garantiza que una adopción sea aprobada ni participa directamente en la decisión final
          del refugio.
        </P>
        <P>
          Los refugios son responsables de evaluar las solicitudes y determinar si un usuario cumple con sus
          propios criterios de adopción.
        </P>
        <P>Los usuarios deberán proporcionar información verdadera durante cualquier proceso de postulación.</P>
        <P>
          La información relacionada con una mascota deberá ser proporcionada de manera responsable por el refugio
          o entidad correspondiente.
        </P>
      </Articulo>

      {/* 6. Marketplace */}
      <Articulo
        id="tyc-marketplace"
        numero="6"
        icono={ShoppingCart}
        titulo="Marketplace"
        subtitulo="Compras e interacciones entre vendedores y compradores"
        gradiente="from-orange-500 to-amber-500"
        colorIcono="text-orange-500"
      >
        <P>
          El Marketplace permite que refugios y tiendas aliadas publiquen productos destinados al cuidado de
          mascotas.
        </P>
        <P>Los usuarios podrán consultar productos y realizar solicitudes o interacciones relacionadas con las compras disponibles.</P>
        <P>Los vendedores son responsables de:</P>
        <Lista dot="bg-orange-400">
          <span>La información publicada sobre sus productos.</span>
          <span>Los precios.</span>
          <span>La disponibilidad.</span>
          <span>Las condiciones de entrega.</span>
          <span>La calidad de los productos ofrecidos.</span>
        </Lista>
        <P>
          Adoptify actúa como plataforma intermediaria y no reemplaza las responsabilidades propias del vendedor o
          comprador.
        </P>
        <P>Los usuarios deberán verificar la información del producto antes de realizar cualquier compra o solicitud.</P>
      </Articulo>

      {/* 7. Foro y contenido generado por los usuarios */}
      <Articulo
        id="tyc-foro"
        numero="7"
        icono={MessageCircle}
        titulo="Foro y contenido generado por los usuarios"
        subtitulo="Uso responsable del Foro Comunitario"
        gradiente="from-pink-500 to-rose-600"
        colorIcono="text-pink-500"
      >
        <P>
          Adoptify permite a los usuarios participar en el Foro Comunitario mediante publicaciones, comentarios,
          reacciones y otros contenidos.
        </P>
        <P>El usuario conserva la responsabilidad sobre el contenido que publica.</P>
        <P>Está prohibido utilizar el foro para:</P>
        <Lista dot="bg-pink-400">
          <span>Publicar contenido ilegal.</span>
          <span>Realizar amenazas o acoso.</span>
          <span>Compartir información falsa con intención de perjudicar a terceros.</span>
          <span>Publicar contenido ofensivo o discriminatorio.</span>
          <span>Realizar spam.</span>
          <span>Intentar realizar actividades fraudulentas.</span>
          <span>Compartir información personal de terceros sin autorización.</span>
        </Lista>
        <P>Adoptify podrá moderar, ocultar o eliminar contenido que incumpla estos términos.</P>
      </Articulo>

      {/* 8. Donaciones entre refugios */}
      <Articulo
        id="tyc-donaciones"
        numero="8"
        icono={Building2}
        titulo="Donaciones entre refugios"
        subtitulo="Intercambio de insumos entre entidades verificadas"
        gradiente="from-teal-500 to-emerald-600"
        colorIcono="text-teal-500"
      >
        <P>
          La plataforma puede permitir el intercambio de insumos o donaciones entre refugios y entidades
          verificadas.
        </P>
        <P>
          Los usuarios deberán utilizar esta funcionalidad de manera responsable y proporcionar información
          verdadera sobre los insumos ofrecidos o solicitados.
        </P>
        <P>
          Adoptify facilita la interacción entre las entidades, pero no garantiza la entrega, calidad o estado de
          los productos intercambiados.
        </P>
      </Articulo>

      {/* 9. Conductas prohibidas */}
      <Articulo
        id="tyc-prohibido"
        numero="9"
        icono={Ban}
        titulo="Conductas prohibidas"
        subtitulo="Acciones que no están permitidas en la plataforma"
        gradiente="from-red-500 to-rose-600"
        colorIcono="text-red-500"
      >
        <P>Está prohibido utilizar Adoptify para:</P>
        <Lista dot="bg-red-400">
          <span>Crear cuentas falsas.</span>
          <span>Suplantar la identidad de otra persona o entidad.</span>
          <span>Intentar acceder a cuentas o información sin autorización.</span>
          <span>Alterar, manipular o interferir con el funcionamiento de la plataforma.</span>
          <span>Introducir código malicioso, virus o archivos dañinos.</span>
          <span>Utilizar la plataforma para actividades fraudulentas.</span>
          <span>Extraer información de manera automatizada sin autorización.</span>
          <span>Utilizar Adoptify para fines ilegales.</span>
          <span>Vulnerar los mecanismos de seguridad de la plataforma.</span>
        </Lista>
        <P>
          El incumplimiento podrá generar restricciones, suspensión o eliminación de la cuenta correspondiente.
        </P>
      </Articulo>

      {/* 10. Responsabilidad del usuario */}
      <Articulo
        id="tyc-responsabilidad"
        numero="10"
        icono={Scale}
        titulo="Responsabilidad del usuario"
        subtitulo="Uso responsable de la cuenta y la información"
        gradiente="from-sky-500 to-cyan-600"
        colorIcono="text-sky-500"
      >
        <P>
          Cada usuario es responsable de las acciones realizadas mediante su cuenta y de la información que
          proporcione o publique.
        </P>
        <P>
          El usuario deberá utilizar Adoptify de manera responsable, respetuosa y conforme a la legislación
          aplicable.
        </P>
        <P>
          La plataforma no será responsable por información falsa proporcionada por usuarios, refugios o tiendas,
          ni por acuerdos realizados directamente entre ellos.
        </P>
      </Articulo>

      {/* 11. Propiedad intelectual */}
      <Articulo
        id="tyc-propiedad"
        numero="11"
        icono={FileText}
        titulo="Propiedad intelectual"
        subtitulo="Derechos sobre los elementos de la plataforma"
        gradiente="from-indigo-500 to-blue-600"
        colorIcono="text-indigo-500"
      >
        <P>
          Los elementos propios de Adoptify, incluyendo su nombre, logotipo, diseño, interfaz, código, contenidos
          gráficos y elementos visuales, pertenecen al proyecto y no podrán ser utilizados, copiados o distribuidos
          sin autorización.
        </P>
        <P>El contenido publicado por los usuarios seguirá siendo responsabilidad de quien lo publique.</P>
        <P>
          Al cargar contenido en Adoptify, el usuario declara que tiene los derechos necesarios para utilizar dicho
          contenido y que no infringe derechos de terceros.
        </P>
      </Articulo>

      {/* 12. Suspensión o eliminación de cuentas */}
      <Articulo
        id="tyc-suspension"
        numero="12"
        icono={UserX}
        titulo="Suspensión o eliminación de cuentas"
        subtitulo="Medidas ante incumplimientos"
        gradiente="from-purple-500 to-fuchsia-600"
        colorIcono="text-purple-500"
      >
        <P>
          Adoptify podrá restringir, suspender o eliminar cuentas cuando exista incumplimiento de estos Términos y
          Condiciones, uso indebido de la plataforma, comportamiento fraudulento o actividades que puedan afectar la
          seguridad de otros usuarios.
        </P>
        <P>
          Cuando corresponda, el usuario podrá comunicarse con el equipo de soporte para solicitar información sobre
          la situación de su cuenta.
        </P>
      </Articulo>

      {/* 13. Disponibilidad de la plataforma */}
      <Articulo
        id="tyc-disponibilidad"
        numero="13"
        icono={Server}
        titulo="Disponibilidad de la plataforma"
        subtitulo="Posibles interrupciones del servicio"
        gradiente="from-cyan-500 to-sky-600"
        colorIcono="text-cyan-500"
      >
        <P>Adoptify busca mantener la plataforma disponible y funcionando correctamente.</P>
        <P>Sin embargo, pueden presentarse interrupciones ocasionadas por:</P>
        <Lista dot="bg-cyan-400">
          <span>Mantenimiento.</span>
          <span>Actualizaciones.</span>
          <span>Fallos técnicos.</span>
          <span>Problemas de infraestructura.</span>
          <span>Servicios externos.</span>
          <span>Circunstancias fuera del control del equipo de desarrollo.</span>
        </Lista>
        <P>El equipo de Adoptify trabajará para solucionar los inconvenientes en el menor tiempo posible.</P>
      </Articulo>

      {/* 14. Limitación de responsabilidad */}
      <Articulo
        id="tyc-limitacion"
        numero="14"
        icono={Lock}
        titulo="Limitación de responsabilidad"
        subtitulo="Alcance de la responsabilidad de Adoptify"
        gradiente="from-slate-500 to-gray-600"
        colorIcono="text-slate-500"
      >
        <P>
          Adoptify proporciona una plataforma para facilitar la interacción entre sus usuarios, refugios y tiendas
          aliadas.
        </P>
        <P>
          La plataforma no se responsabiliza directamente por acuerdos, transacciones, adopciones, entregas o
          interacciones realizadas entre usuarios y terceros.
        </P>
        <P>
          Cada usuario deberá verificar la información correspondiente y actuar de manera responsable antes de
          establecer cualquier acuerdo.
        </P>
      </Articulo>

      {/* 15. Modificaciones de los Términos y Condiciones */}
      <Articulo
        id="tyc-modificaciones"
        numero="15"
        icono={RefreshCcw}
        titulo="Modificaciones de los Términos y Condiciones"
        subtitulo="Actualización del documento vigente"
        gradiente="from-fuchsia-500 to-purple-600"
        colorIcono="text-fuchsia-500"
      >
        <P>
          Adoptify podrá modificar estos Términos y Condiciones cuando sea necesario para reflejar cambios en la
          plataforma, nuevas funcionalidades o modificaciones normativas.
        </P>
        <P>
          Las modificaciones importantes podrán ser comunicadas mediante la plataforma o mediante la actualización
          de esta página.
        </P>
        <P>La fecha de última actualización será modificada cuando se publique una nueva versión.</P>
      </Articulo>

      {/* 16. Legislación aplicable */}
      <Articulo
        id="tyc-legislacion"
        numero="16"
        icono={Scale}
        titulo="Legislación aplicable"
        subtitulo="Marco legal del uso de la plataforma"
        gradiente="from-blue-500 to-indigo-600"
        colorIcono="text-blue-500"
      >
        <P>El uso de Adoptify estará sujeto a la legislación aplicable en Colombia.</P>
        <P>
          Las disposiciones legales correspondientes prevalecerán sobre cualquier disposición de estos términos
          cuando así lo establezca la normativa vigente.
        </P>
      </Articulo>

      {/* 17. Contacto */}
      <Articulo
        id="tyc-contacto"
        numero="17"
        icono={Mail}
        titulo="Contacto"
        subtitulo="Canales de atención para consultas e inconvenientes"
        gradiente="from-rose-500 to-amber-500"
        colorIcono="text-rose-500"
      >
        <P>
          Para preguntas, solicitudes o inconvenientes relacionados con Adoptify, los usuarios pueden comunicarse
          mediante:
        </P>
        <div className="grid sm:grid-cols-2 gap-3.5">
          <a
            href="mailto:adoptifyoficial@gmail.com"
            className="group flex items-center gap-4 p-4 rounded-2xl border border-gray-100 dark:border-dark-border bg-gradient-to-r from-rose-50/60 to-amber-50/40 dark:from-rose-500/10 dark:to-amber-500/5 hover:border-rose-200 dark:hover:border-rose-500/40 hover:shadow-md hover:shadow-rose-500/5 transition-all"
          >
            <span className="flex items-center justify-center w-11 h-11 rounded-2xl bg-gradient-to-br from-rose-500 to-amber-500 text-white shadow-md shadow-rose-500/20 flex-shrink-0">
              <Building2 size={19} />
            </span>
            <span className="min-w-0 flex-1">
              <strong className="font-semibold text-gray-800 dark:text-dark-text block group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors text-[15px]">
                Mesa de Ayuda y Soporte Técnico:
              </strong>
              <span className="text-sm text-gray-500 dark:text-dark-text-secondary break-words">
                adoptifyoficial@gmail.com
              </span>
            </span>
          </a>
          <a
            href="mailto:adoptifyoficial@gmail.com"
            className="group flex items-center gap-4 p-4 rounded-2xl border border-gray-100 dark:border-dark-border bg-gradient-to-r from-emerald-50/60 to-teal-50/40 dark:from-emerald-500/10 dark:to-teal-500/5 hover:border-emerald-200 dark:hover:border-emerald-500/40 hover:shadow-md hover:shadow-emerald-500/5 transition-all"
          >
            <span className="flex items-center justify-center w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20 flex-shrink-0">
              <HeartHandshake size={19} />
            </span>
            <span className="min-w-0 flex-1">
              <strong className="font-semibold text-gray-800 dark:text-dark-text block group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors text-[15px]">
                Atención a Entidades / Refugios:
              </strong>
              <span className="text-sm text-gray-500 dark:text-dark-text-secondary break-words">
                adoptifyoficial@gmail.com
              </span>
            </span>
          </a>
        </div>
      </Articulo>

      {/* 18. Aceptación */}
      <Articulo
        id="tyc-aceptacion-final"
        numero="18"
        icono={CheckCircle2}
        titulo="Aceptación"
        subtitulo="Declaración final de aceptación y compromiso"
        gradiente="from-emerald-500 to-green-600"
        colorIcono="text-emerald-500"
      >
        <P>
          Al registrarse y utilizar las funcionalidades de Adoptify, el usuario declara que ha leído y comprendido
          estos Términos y Condiciones y acepta cumplirlos.
        </P>
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-100 dark:border-emerald-500/20 bg-emerald-50/60 dark:bg-emerald-500/10 p-4">
          <CheckCircle2 size={20} className="text-emerald-500 flex-shrink-0 mt-0.5" />
          <P>
            Adoptify busca promover un entorno digital seguro, responsable y respetuoso para facilitar la conexión
            entre personas, mascotas, refugios y tiendas aliadas.
          </P>
        </div>
      </Articulo>
    </LegalLayout>
  );
}
