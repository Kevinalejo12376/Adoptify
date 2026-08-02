import React, { createContext, useContext, useState, useCallback } from "react";

const I18nContext = createContext(null);

const translations = {
  es: {
    /* Navbar */
    "nav.inicio": "Inicio",
    "nav.animales": "Animales",
    "nav.refugios": "Refugios",
    "nav.tienda": "Marketplace",
    "nav.foro": "Foro",
    "nav.como_funciona": "Cómo funciona",
    "nav.mi_cuenta": "Mi Cuenta",
    "nav.iniciar_sesion": "Iniciar Sesión",
    "nav.registrarse": "Registrarse",
    "nav.mi_perfil": "Mi Perfil",
    "nav.historial_adopciones": "Historial de Adopciones",
    "nav.mis_favoritos": "Mis Favoritos",
    "nav.configuracion": "Configuración",
    "nav.cerrar_sesion": "Cerrar Sesión",

    /* Settings */
    "settings.title": "Configuración",
    "settings.subtitle": "Gestiona tus preferencias y opciones de la cuenta",
    "settings.notifications": "Notificaciones",
    "settings.notifications_desc": "Controla cómo y cuándo recibes notificaciones",
    "settings.notifications_email": "Notificaciones por correo",
    "settings.notifications_push": "Notificaciones push",
    "settings.notifications_adoption": "Actualizaciones de adopción",
    "settings.notifications_forum": "Respuestas en el foro",
    "settings.notifications_new_animals": "Nuevas mascotas disponibles",
    "settings.privacy": "Privacidad",
    "settings.privacy_desc": "Controla quién puede ver tu información",
    "settings.privacy_profile": "Mostrar perfil público",
    "settings.privacy_history": "Mostrar historial de adopciones",
    "settings.privacy_messages": "Permitir mensajes de otros usuarios",
    "settings.appearance": "Apariencia",
    "settings.appearance_desc": "Personaliza tu experiencia",
    "settings.language": "Idioma",
    "settings.theme": "Tema",
    "settings.light": "Claro",
    "settings.dark": "Oscuro",
    "settings.account_actions": "Acciones de Cuenta",
    "settings.change_password": "Cambiar contraseña",
    "settings.change_email": "Cambiar correo electrónico",
    "settings.delete_account": "Eliminar cuenta",
    "settings.help_support": "Ayuda y Soporte",
    "settings.help_center": "Centro de ayuda",
    "settings.contact_support": "Contactar soporte",
    "settings.legal_info": "Información Legal",
    "settings.legal_info_desc": "Términos, políticas y avisos legales",
    "settings.save": "Guardar Cambios",
    "settings.logout": "Cerrar Sesión",

    /* Contact Support Modal */
    "contact.title": "Contactar Soporte",
    "contact.name": "Nombre completo",
    "contact.email": "Correo electrónico",
    "contact.subject": "Asunto",
    "contact.subject_placeholder": "Selecciona un asunto",
    "contact.subject_general": "Consulta general",
    "contact.subject_technical": "Problema técnico",
    "contact.subject_adoption": "Proceso de adopción",
    "contact.subject_account": "Problema de cuenta",
    "contact.subject_other": "Otro",
    "contact.message": "Mensaje",
    "contact.message_placeholder": "Describe tu problema o consulta...",
    "contact.send": "Enviar mensaje",
    "contact.cancel": "Cancelar",
    "contact.success": "Mensaje enviado con éxito",

    /* Help Center Modal */
    "help.title": "Centro de Ayuda - Manual de Usuario",
    "help.intro_title": "Bienvenido a Adoptify",
    "help.intro_desc": "Adoptify es una plataforma diseñada para conectar personas con mascotas que necesitan un hogar. Aquí encontrarás todo lo que necesitas saber para usar la plataforma.",
    "help.section1_title": "1. Explorar Mascotas",
    "help.section1_desc": "Navega por la sección de animales para descubrir perros y gatos disponibles para adopción. Puedes filtrar por especie, edad, tamaño y ubicación.",
    "help.section2_title": "2. Proceso de Adopción",
    "help.section2_desc": "Una vez encuentres a tu compañero ideal, puedes contactar al refugio a través de la plataforma. Ellos te guiarán en el proceso de adopción que incluye una entrevista y visita de verificación.",
    "help.section3_title": "3. Tienda Online",
    "help.section3_desc": "En nuestra tienda encontrarás alimentos, juguetes, accesorios y más para el cuidado de tu mascota. Los pedidos se envían directamente a tu domicilio.",
    "help.section4_title": "4. Foro Comunitario",
    "help.section4_desc": "Participa en discusiones con otros amantes de los animales. Comparte consejos, experiencias y resuelve dudas sobre el cuidado de mascotas.",
    "help.section5_title": "5. Gestión de Perfil",
    "help.section5_desc": "Desde tu perfil puedes dar seguimiento a tus solicitudes de adopción, guardar tus mascotas favoritas y gestionar tus preferencias de la cuenta.",
    "help.close": "Cerrar",

    /* Legal Information */
    "legal.privacy_policy": "Política de Privacidad",
    "legal.privacy_policy_desc": "En Adoptify, nos tomamos muy en serio la privacidad de tus datos. Toda la información personal que proporcionas se utiliza únicamente para facilitar el proceso de adopción y mejorar tu experiencia en la plataforma. No compartimos tus datos con terceros sin tu consentimiento explícito.",
    "legal.terms_of_service": "Términos del Servicio",
    "legal.terms_of_service_desc": "Al utilizar Adoptify, aceptas los siguientes términos: (1) Toda la información proporcionada debe ser veraz y precisa. (2) No está permitido el uso de la plataforma para fines ilegales o no éticos. (3) Los refugios y adoptantes se comprometen a priorizar el bienestar animal. (4) Adoptify actúa únicamente como intermediario y no se hace responsable de las adopciones.",
    "legal.cookies_policy": "Política de Cookies",
    "legal.cookies_policy_desc": "Utilizamos cookies propias y de terceros para mejorar tu experiencia de navegación, analizar el tráfico del sitio y personalizar el contenido. Puedes gestionar tus preferencias de cookies en cualquier momento desde la configuración de tu navegador.",

    /* Footer */
    "footer.brand_desc": "Conectando corazones solitarios con patitas que necesitan un hogar. Adopta con responsabilidad y amor.",
    "footer.explore": "Explorar",
    "footer.home": "Inicio",
    "footer.search_pets": "Buscar Mascotas",
    "footer.how_it_works": "Cómo Funciona",
    "footer.volunteer": "Ser Voluntario",
    "footer.contact": "Contacto",
    "footer.newsletter": "Boletín",
    "footer.newsletter_desc": "Suscríbete para recibir historias de éxito y alertas de nuevas mascotas en adopción.",
    "footer.newsletter_placeholder": "Tu correo",
    "footer.newsletter_btn": "Unirse",
    "footer.rights": "Todos los derechos reservados.",
    "footer.privacy": "Privacidad",
    "footer.terms": "Términos",
    "footer.cookies": "Cookies",
    "footer.legal_notice": "Aviso Legal",
  },
  en: {
    /* Navbar */
    "nav.inicio": "Home",
    "nav.animales": "Animals",
    "nav.refugios": "Shelters",
    "nav.tienda": "Marketplace",
    "nav.foro": "Forum",
    "nav.como_funciona": "How it works",
    "nav.mi_cuenta": "My Account",
    "nav.iniciar_sesion": "Sign In",
    "nav.registrarse": "Sign Up",
    "nav.mi_perfil": "My Profile",
    "nav.historial_adopciones": "Adoption History",
    "nav.mis_favoritos": "My Favorites",
    "nav.configuracion": "Settings",
    "nav.cerrar_sesion": "Log Out",

    /* Settings */
    "settings.title": "Settings",
    "settings.subtitle": "Manage your preferences and account options",
    "settings.notifications": "Notifications",
    "settings.notifications_desc": "Control how and when you receive notifications",
    "settings.notifications_email": "Email notifications",
    "settings.notifications_push": "Push notifications",
    "settings.notifications_adoption": "Adoption updates",
    "settings.notifications_forum": "Forum replies",
    "settings.notifications_new_animals": "New pets available",
    "settings.privacy": "Privacy",
    "settings.privacy_desc": "Control who can see your information",
    "settings.privacy_profile": "Show public profile",
    "settings.privacy_history": "Show adoption history",
    "settings.privacy_messages": "Allow messages from other users",
    "settings.appearance": "Appearance",
    "settings.appearance_desc": "Customize your experience",
    "settings.language": "Language",
    "settings.theme": "Theme",
    "settings.light": "Light",
    "settings.dark": "Dark",
    "settings.account_actions": "Account Actions",
    "settings.change_password": "Change password",
    "settings.change_email": "Change email address",
    "settings.delete_account": "Delete account",
    "settings.help_support": "Help & Support",
    "settings.help_center": "Help Center",
    "settings.contact_support": "Contact Support",
    "settings.legal_info": "Legal Information",
    "settings.legal_info_desc": "Terms, policies and legal notices",
    "settings.save": "Save Changes",
    "settings.logout": "Log Out",

    /* Contact Support Modal */
    "contact.title": "Contact Support",
    "contact.name": "Full name",
    "contact.email": "Email address",
    "contact.subject": "Subject",
    "contact.subject_placeholder": "Select a subject",
    "contact.subject_general": "General inquiry",
    "contact.subject_technical": "Technical issue",
    "contact.subject_adoption": "Adoption process",
    "contact.subject_account": "Account issue",
    "contact.subject_other": "Other",
    "contact.message": "Message",
    "contact.message_placeholder": "Describe your issue or question...",
    "contact.send": "Send message",
    "contact.cancel": "Cancel",
    "contact.success": "Message sent successfully",

    /* Help Center Modal */
    "help.title": "Help Center - User Manual",
    "help.intro_title": "Welcome to Adoptify",
    "help.intro_desc": "Adoptify is a platform designed to connect people with pets in need of a home. Here you'll find everything you need to know to use the platform.",
    "help.section1_title": "1. Explore Pets",
    "help.section1_desc": "Browse the animals section to discover dogs and cats available for adoption. You can filter by species, age, size, and location.",
    "help.section2_title": "2. Adoption Process",
    "help.section2_desc": "Once you find your ideal companion, you can contact the shelter through the platform. They will guide you through the adoption process including an interview and verification visit.",
    "help.section3_title": "3. Online Store",
    "help.section3_desc": "In our store you'll find food, toys, accessories, and more for your pet's care. Orders are shipped directly to your home.",
    "help.section4_title": "4. Community Forum",
    "help.section4_desc": "Participate in discussions with other animal lovers. Share tips, experiences, and get answers about pet care.",
    "help.section5_title": "5. Profile Management",
    "help.section5_desc": "From your profile you can track your adoption requests, save your favorite pets, and manage your account preferences.",
    "help.close": "Close",

    /* Legal Information */
    "legal.privacy_policy": "Privacy Policy",
    "legal.privacy_policy_desc": "At Adoptify, we take your data privacy very seriously. All personal information you provide is used solely to facilitate the adoption process and improve your experience on the platform. We do not share your data with third parties without your explicit consent.",
    "legal.terms_of_service": "Terms of Service",
    "legal.terms_of_service_desc": "By using Adoptify, you agree to the following terms: (1) All provided information must be truthful and accurate. (2) Use of the platform for illegal or unethical purposes is prohibited. (3) Shelters and adopters commit to prioritizing animal welfare. (4) Adoptify acts solely as an intermediary and is not responsible for adoptions.",
    "legal.cookies_policy": "Cookies Policy",
    "legal.cookies_policy_desc": "We use first-party and third-party cookies to improve your browsing experience, analyze site traffic, and personalize content. You can manage your cookie preferences at any time from your browser settings.",

    /* Footer */
    "footer.brand_desc": "Connecting lonely hearts with paws in need of a home. Adopt responsibly and with love.",
    "footer.explore": "Explore",
    "footer.home": "Home",
    "footer.search_pets": "Search Pets",
    "footer.how_it_works": "How It Works",
    "footer.volunteer": "Become a Volunteer",
    "footer.contact": "Contact",
    "footer.newsletter": "Newsletter",
    "footer.newsletter_desc": "Subscribe to receive success stories and alerts about new pets available for adoption.",
    "footer.newsletter_placeholder": "Your email",
    "footer.newsletter_btn": "Join",
    "footer.rights": "All rights reserved.",
    "footer.privacy": "Privacy",
    "footer.terms": "Terms",
    "footer.cookies": "Cookies",
    "footer.legal_notice": "Legal Notice",
  },
};

export const I18nProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem("language") || "es";
  });

  const t = useCallback(
    (key) => {
      return translations[language]?.[key] || translations["es"]?.[key] || key;
    },
    [language]
  );

  const changeLanguage = (lang) => {
    setLanguage(lang);
    localStorage.setItem("language", lang);
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage: changeLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return context;
};
