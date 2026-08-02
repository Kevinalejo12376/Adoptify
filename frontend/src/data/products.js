import React from "react";
import { Sparkles, Dog, Shirt, Bone, Stethoscope, Droplets, PawPrint, Heart, Home, Store, Star } from "lucide-react";

export const categoryIcons = {
  all: Sparkles,
  Alimentos: Dog,
  Accesorios: Shirt,
  Juguetes: Bone,
  Salud: Stethoscope,
  Higiene: Droplets,
};

export const categoryColors = {
  Alimentos: "from-emerald-500 to-teal-500",
  Accesorios: "from-violet-500 to-purple-500",
  Juguetes: "from-amber-500 to-orange-500",
  Salud: "from-blue-500 to-cyan-500",
  Higiene: "from-rose-500 to-pink-500",
};

export const shelters = [
  {
    id: 1,
    name: "Hogar de Huellas",
    location: "Ibagué - Tolima",
    slug: "hogar-de-huellas",
    description: "Dedicados al rescate y rehabilitación de animales en situación de calle.",
    icon: PawPrint,
    color: "from-rose-500 to-amber-500",
  },
  {
    id: 2,
    name: "Patitas Felices",
    location: "Medellín - Antioquia",
    slug: "patitas-felices",
    description: "Refugio comprometido con el bienestar animal y la adopción responsable.",
    icon: Heart,
    color: "from-emerald-500 to-teal-500",
  },
  {
    id: 3,
    name: "Amigos Peludos",
    location: "Bogotá - Cundinamarca",
    slug: "amigos-peludos",
    description: "Organización dedicada a encontrar hogares amorosos para mascotas abandonadas.",
    icon: Home,
    color: "from-blue-500 to-cyan-500",
  },
];

export const stores = [
  {
    id: 1,
    name: "Mundo Mascota",
    location: "Bogotá - Cundinamarca",
    slug: "mundo-mascota",
    description: "Tienda especializada en productos de alta calidad para mascotas. Encuentra todo lo que necesitas para el bienestar de tu compañero peludo.",
    rating: 4.5,
    reviews: 89,
    logo: Store,
    color: "from-purple-500 to-pink-500",
    phone: "+57 601 234 5678",
    email: "contacto@mundomascota.com",
    website: "www.mundomascota.com",
    socialMedia: {
      facebook: "mundomascota",
      instagram: "@mundomascota_oficial",
    },
    hours: {
      weekdays: "Lun - Vie: 9:00 AM - 7:00 PM",
      weekends: "Sáb: 9:00 AM - 5:00 PM",
    },
    gallery: [
      { id: "s1-g1", color: "from-purple-400 to-pink-400", label: "Fachada" },
      { id: "s1-g2", color: "from-pink-400 to-rose-400", label: "Interior" },
      { id: "s1-g3", color: "from-violet-400 to-purple-400", label: "Productos" },
    ],
  },
  {
    id: 2,
    name: "Patitas Store",
    location: "Cali - Valle del Cauca",
    slug: "patitas-store",
    description: "Todo para tu mascota con los mejores precios y atención personalizada. Productos seleccionados con amor y cuidado.",
    rating: 4.3,
    reviews: 56,
    logo: Store,
    color: "from-blue-500 to-indigo-500",
    phone: "+57 602 987 6543",
    email: "info@patitasstore.com",
    website: "www.patitasstore.com",
    socialMedia: {
      facebook: "patitasstore",
      instagram: "@patitasstore_cali",
    },
    hours: {
      weekdays: "Lun - Vie: 8:30 AM - 6:30 PM",
      weekends: "Sáb: 9:00 AM - 4:00 PM",
    },
    gallery: [
      { id: "s2-g1", color: "from-blue-400 to-indigo-400", label: "Local" },
      { id: "s2-g2", color: "from-indigo-400 to-cyan-400", label: "Vitrina" },
    ],
  },
];

export const products = [
  {
    id: 1,
    name: "Collar Premium Ajustable",
    category: "Accesorios",
    price: 100.00,
    rating: 4.8,
    reviews: 124,
    description: "Collar de cuero sintético de alta calidad, ajustable y duradero",
    shelterId: 1,
    longDescription:
      "Este collar premium está fabricado con cuero sintético de primera calidad, diseñado para brindar máxima comodidad y durabilidad. Cuenta con hebilla ajustable de acero inoxidable, costuras reforzadas y un diseño ergonómico que se adapta perfectamente al cuello de tu mascota. Ideal para paseos diarios y entrenamiento.",
    quality: "Premium",
    stock: 25,
    brand: "PetStyle",
    material: "Cuero sintético y acero inoxidable",
    sizes: ["S", "M", "L", "XL"],
    color: "from-violet-300 to-purple-400",
    gallery: [
      { id: "g1-1", color: "from-violet-300 to-purple-400", label: "Vista frontal" },
      { id: "g1-2", color: "from-fuchsia-300 to-violet-400", label: "Vista lateral" },
      { id: "g1-3", color: "from-purple-300 to-indigo-400", label: "Detalle hebilla" },
      { id: "g1-4", color: "from-violet-200 to-fuchsia-300", label: "Ajuste" },
      { id: "g1-5", color: "from-indigo-300 to-violet-400", label: "Empaque" },
    ],
    features: [
      "Hebilla ajustable de acero inoxidable",
      "Costuras reforzadas",
      "Diseño ergonómico",
      "Resistente al agua",
    ],
    careInstructions: "Limpiar con paño húmedo. No sumergir en agua.",
  },
  {
    id: 2,
    name: "Recipiente de Comida Anti-vuelco",
    category: "Alimentos",
    price: 45.00,
    rating: 4.6,
    reviews: 89,
    description: "Bowl de acero inoxidable con base antideslizante",
    shelterId: 1,
    longDescription:
      "Recipiente de acero inoxidable con innovadora base antideslizante que evita vuelcos accidentales durante la comida. Su diseño incluye bordes suaves para proteger las encías de tu mascota y es apto para lavavajillas. Capacidad ideal para razas medianas y grandes.",
    quality: "Estándar",
    stock: 50,
    brand: "HappyPet",
    material: "Acero inoxidable y silicona",
    sizes: ["500ml", "1L", "1.5L"],
    color: "from-emerald-300 to-teal-400",
    gallery: [
      { id: "g2-1", color: "from-emerald-300 to-teal-400", label: "Vista superior" },
      { id: "g2-2", color: "from-teal-300 to-cyan-400", label: "Vista lateral" },
      { id: "g2-3", color: "from-green-300 to-emerald-400", label: "Base antideslizante" },
      { id: "g2-4", color: "from-cyan-300 to-teal-400", label: "Tamaño 1L" },
      { id: "g2-5", color: "from-emerald-200 to-green-300", label: "Set completo" },
    ],
    features: [
      "Base antideslizante de silicona",
      "Apto para lavavajillas",
      "Bordes suaves y seguros",
      "Resistente a golpes",
    ],
    careInstructions: "Lavar con agua tibia y jabón suave. Apto para lavavajillas.",
  },
  {
    id: 3,
    name: "Juguete Interactivo Peluche",
    category: "Juguetes",
    price: 35.00,
    rating: 4.9,
    reviews: 156,
    description: "Peluche con sonido y relleno resistente para mordisquear",
    shelterId: 1,
    longDescription:
      "Peluche interactivo diseñado para estimular mentalmente a tu mascota. Incluye un sonido suave al morderlo que mantiene a tu perro entretenido por horas. Su relleno de fibra resistente soporta mordidas fuertes sin deformarse. Perfecto para juegos de buscar y traer.",
    quality: "Premium",
    stock: 40,
    brand: "PlayPaws",
    material: "Poliéster resistente y relleno de fibra",
    sizes: ["Pequeño", "Mediano", "Grande"],
    color: "from-amber-300 to-orange-400",
    gallery: [
      { id: "g3-1", color: "from-amber-300 to-orange-400", label: "Vista frontal" },
      { id: "g3-2", color: "from-yellow-300 to-amber-400", label: "Vista trasera" },
      { id: "g3-3", color: "from-orange-300 to-red-400", label: "Detalle sonido" },
      { id: "g3-4", color: "from-amber-200 to-yellow-300", label: "En acción" },
      { id: "g3-5", color: "from-orange-200 to-amber-300", label: "Empaque" },
    ],
    features: [
      "Sonido integrado al morder",
      "Relleno resistente a mordidas",
      "Lavable a máquina",
      "Libre de químicos tóxicos",
    ],
    careInstructions: "Lavar en ciclo suave y secar al aire.",
  },
  {
    id: 4,
    name: "Correa Retráctil 5m",
    category: "Accesorios",
    price: 55.00,
    rating: 4.7,
    reviews: 203,
    description: "Correa retráctil con freno de seguridad y agarre ergonómico",
    storeId: 1,
    longDescription:
      "Correa retráctil de 5 metros con sistema de freno instantáneo que te permite controlar la distancia de tu mascota con solo presionar un botón. Su mango ergonómico recubierto de goma antideslizante proporciona un agarre cómodo y seguro durante los paseos. La cinta reflectante garantiza visibilidad nocturna.",
    quality: "Premium",
    stock: 30,
    brand: "WalkSafe",
    material: "Nylon resistente y goma antideslizante",
    sizes: ["5m", "8m"],
    color: "from-violet-300 to-purple-400",
    gallery: [
      { id: "g4-1", color: "from-violet-300 to-purple-400", label: "Vista general" },
      { id: "g4-2", color: "from-purple-300 to-fuchsia-400", label: "Mango ergonómico" },
      { id: "g4-3", color: "from-indigo-300 to-violet-400", label: "Mecanismo freno" },
      { id: "g4-4", color: "from-violet-200 to-indigo-300", label: "Cinta reflectante" },
      { id: "g4-5", color: "from-fuchsia-300 to-purple-400", label: "En uso" },
    ],
    features: [
      "Freno instantáneo con botón",
      "Mango ergonómico antideslizante",
      "Cinta reflectante",
      "Mecanismo de retracción suave",
    ],
    careInstructions: "Mantener seco. Limpiar con paño húmedo.",
  },
  {
    id: 5,
    name: "Alimento Premium Perro Adulto",
    category: "Alimentos",
    price: 85.00,
    rating: 4.8,
    reviews: 312,
    description: "Alimento balanceado con proteínas de alta calidad",
    shelterId: 1,
    longDescription:
      "Alimento seco premium formulado para perros adultos de todas las razas. Contiene proteínas de alta calidad (pollo y salmón), ácidos grasos Omega-3 y Omega-6 para una piel saludable y un pelaje brillante. Enriquecido con vitaminas y minerales esenciales para un sistema inmunológico fuerte.",
    quality: "Premium",
    stock: 100,
    brand: "NutriCan",
    material: "Pollo, salmón, arroz integral, vegetales",
    sizes: ["2kg", "7kg", "15kg"],
    color: "from-emerald-300 to-teal-400",
    gallery: [
      { id: "g5-1", color: "from-emerald-300 to-teal-400", label: "Bolsa 7kg" },
      { id: "g5-2", color: "from-teal-300 to-cyan-400", label: "Nutrientes" },
      { id: "g5-3", color: "from-green-300 to-emerald-400", label: "Ingredientes" },
      { id: "g5-4", color: "from-cyan-300 to-teal-400", label: "Tamaños disponibles" },
      { id: "g5-5", color: "from-emerald-200 to-teal-300", label: "Bolsa 2kg" },
    ],
    features: [
      "Proteína de pollo y salmón",
      "Omega-3 y Omega-6",
      "Sin colorantes artificiales",
      "Vitaminas y minerales esenciales",
    ],
    careInstructions: "Almacenar en lugar fresco y seco. Cerrar bien después de usar.",
  },
  {
    id: 6,
    name: "Cama Ortopédica Grande",
    category: "Accesorios",
    price: 120.00,
    rating: 4.9,
    reviews: 87,
    description: "Cama con memoria foam para mayor confort de tu mascota",
    shelterId: 2,
    longDescription:
      "Cama ortopédica de espuma viscoelástica (memoria foam) que se adapta a la forma del cuerpo de tu mascota, aliviando puntos de presión y proporcionando un descanso reparador. Ideal para perros mayores o con problemas articulares. Funda lavable con cremallera y base antideslizante.",
    quality: "Premium",
    stock: 15,
    brand: "DreamPet",
    material: "Memoria foam, poliéster y algodón",
    sizes: ["Mediana", "Grande", "Extra Grande"],
    color: "from-violet-300 to-purple-400",
    gallery: [
      { id: "g6-1", color: "from-violet-300 to-purple-400", label: "Vista completa" },
      { id: "g6-2", color: "from-indigo-300 to-violet-400", label: "Espuma interior" },
      { id: "g6-3", color: "from-purple-300 to-fuchsia-400", label: "Funda lavable" },
      { id: "g6-4", color: "from-violet-200 to-indigo-300", label: "Base antideslizante" },
      { id: "g6-5", color: "from-fuchsia-200 to-purple-300", label: "Tamaño grande" },
    ],
    features: [
      "Espuma viscoelástica ortopédica",
      "Funda lavable con cremallera",
      "Base antideslizante",
      "Hipoalergénica",
    ],
    careInstructions: "Funda lavable a máquina en ciclo frío. Secar al aire.",
  },
  {
    id: 7,
    name: "Shampoo Hipoalergénico",
    category: "Higiene",
    price: 28.00,
    rating: 4.5,
    reviews: 145,
    description: "Shampoo suave para pieles sensibles, sin fragancias agresivas",
    shelterId: 2,
    longDescription:
      "Shampoo hipoalergénico formulado especialmente para mascotas con piel sensible o propensas a alergias. Contiene avena coloidal y aloe vera que calman la irritación y humectan profundamente. Libre de parabenos, sulfatos y fragancias artificiales. pH balanceado para perros y gatos.",
    quality: "Estándar",
    stock: 60,
    brand: "CleanPaw",
    material: "Avena coloidal, aloe vera, aceite de coco",
    sizes: ["250ml", "500ml", "1L"],
    color: "from-rose-300 to-pink-400",
    gallery: [
      { id: "g7-1", color: "from-rose-300 to-pink-400", label: "Botella 500ml" },
      { id: "g7-2", color: "from-pink-300 to-rose-400", label: "Aplicación" },
      { id: "g7-3", color: "from-rose-200 to-pink-300", label: "Ingredientes" },
      { id: "g7-4", color: "from-fuchsia-300 to-pink-400", label: "Textura" },
      { id: "g7-5", color: "from-pink-200 to-rose-300", label: "Tamaños" },
    ],
    features: [
      "Hipoalergénico",
      "Libre de parabenos y sulfatos",
      "pH balanceado",
      "Con avena coloidal y aloe vera",
    ],
    careInstructions: "Aplicar, masajear y enjuagar bien. Evitar contacto con ojos.",
  },
  {
    id: 8,
    name: "Kit de Cepillo y Peine",
    category: "Higiene",
    price: 32.00,
    rating: 4.6,
    reviews: 98,
    description: "Set de cepillo y peine para el cuidado del pelaje",
    shelterId: 2,
    longDescription:
      "Kit completo de cepillado que incluye un cepillo de cerdas suaves para el cuidado diario y un peine de acero inoxidable para desenredar nudos. Las cerdas suaves estimulan la circulación sanguínea y distribuyen los aceites naturales del pelaje. Mangos ergonómicos antideslizantes.",
    quality: "Estándar",
    stock: 45,
    brand: "GroomPro",
    material: "Cerdas de nylon, acero inoxidable, mango de goma",
    sizes: ["Único"],
    color: "from-rose-300 to-pink-400",
    gallery: [
      { id: "g8-1", color: "from-rose-300 to-pink-400", label: "Kit completo" },
      { id: "g8-2", color: "from-pink-300 to-fuchsia-400", label: "Cepillo" },
      { id: "g8-3", color: "from-rose-200 to-pink-300", label: "Peine acero" },
      { id: "g8-4", color: "from-fuchsia-300 to-rose-400", label: "Mango ergonómico" },
      { id: "g8-5", color: "from-pink-200 to-rose-300", label: "Estuche" },
    ],
    features: [
      "Cepillo de cerdas suaves",
      "Peine desenredante de acero",
      "Mangos ergonómicos",
      "Estuche incluido",
    ],
    careInstructions: "Limpiar las cerdas después de cada uso. Lavar con agua tibia periódicamente.",
  },
  {
    id: 9,
    name: "Suplemento Vitaminas",
    category: "Salud",
    price: 42.00,
    rating: 4.7,
    reviews: 67,
    description: "Multivitamínico para fortalecer el sistema inmunológico",
    storeId: 2,
    longDescription:
      "Suplemento multivitamínico en tabletas masticables sabor a pollo, formulado para fortalecer el sistema inmunológico de tu mascota. Contiene vitaminas A, C, D, E, complejo B, zinc y probióticos. Ayuda a mejorar la salud digestiva, ósea y cardiovascular. Recomendado por veterinarios.",
    quality: "Premium",
    stock: 80,
    brand: "VetCare",
    material: "Vitaminas, minerales y probióticos",
    sizes: ["60 tabletas", "120 tabletas"],
    color: "from-blue-300 to-cyan-400",
    gallery: [
      { id: "g9-1", color: "from-blue-300 to-cyan-400", label: "Frasco 60 tabs" },
      { id: "g9-2", color: "from-cyan-300 to-blue-400", label: "Tabletas" },
      { id: "g9-3", color: "from-sky-300 to-cyan-400", label: "Ingredientes" },
      { id: "g9-4", color: "from-blue-200 to-sky-300", label: "Frasco 120 tabs" },
      { id: "g9-5", color: "from-cyan-200 to-blue-300", label: "Información" },
    ],
    features: [
      "Multivitamínico completo",
      "Tabletas masticables sabor pollo",
      "Con probióticos",
      "Recomendado por veterinarios",
    ],
    careInstructions: "Administrar según indicación del empaque. Mantener fuera del alcance de los niños.",
  },
  {
    id: 10,
    name: "Arnés de Seguridad para Auto",
    category: "Accesorios",
    price: 65.00,
    rating: 4.6,
    reviews: 54,
    description: "Arnés resistente para viajes seguros en automóvil",
    shelterId: 2,
    longDescription:
      "Arnés de seguridad certificado para viajes en automóvil. Fabricado con nylon de alta resistencia y hebillas de acero que se fijan al cinturón de seguridad del auto. Diseñado para distribuir la fuerza de impacto en caso de frenada brusca, protegiendo a tu mascota. Ajustable y fácil de poner.",
    quality: "Premium",
    stock: 20,
    brand: "SafeTravel",
    material: "Nylon de alta resistencia, hebillas de acero",
    sizes: ["S", "M", "L"],
    color: "from-violet-300 to-purple-400",
    gallery: [
      { id: "g10-1", color: "from-violet-300 to-purple-400", label: "Vista frontal" },
      { id: "g10-2", color: "from-indigo-300 to-violet-400", label: "Hebillas acero" },
      { id: "g10-3", color: "from-purple-300 to-fuchsia-400", label: "Ajuste" },
      { id: "g10-4", color: "from-violet-200 to-indigo-300", label: "Instalado en auto" },
      { id: "g10-5", color: "from-fuchsia-300 to-purple-400", label: "Empaque" },
    ],
    features: [
      "Certificado para auto",
      "Hebillas de acero",
      "Ajustable en 3 puntos",
      "Distribuye fuerza de impacto",
    ],
    careInstructions: "Limpiar con paño húmedo. Revisar hebillas periódicamente.",
  },
  {
    id: 11,
    name: "Galletas Naturales Premium",
    category: "Alimentos",
    price: 22.00,
    rating: 4.9,
    reviews: 201,
    description: "Snacks horneados con ingredientes 100% naturales",
    shelterId: 3,
    longDescription:
      "Galletas horneadas artesanalmente con ingredientes 100% naturales aptos para consumo humano. Elaboradas con avena integral, manzana, zanahoria y mantequilla de maní natural. Sin conservantes, colorantes ni saborizantes artificiales. Perfectas como premio en entrenamiento.",
    quality: "Premium",
    stock: 200,
    brand: "NaturalBites",
    material: "Avena integral, manzana, zanahoria, mantequilla de maní",
    sizes: ["200g", "500g"],
    color: "from-emerald-300 to-teal-400",
    gallery: [
      { id: "g11-1", color: "from-emerald-300 to-teal-400", label: "Bolsa 500g" },
      { id: "g11-2", color: "from-teal-300 to-cyan-400", label: "Galletas" },
      { id: "g11-3", color: "from-green-300 to-emerald-400", label: "Ingredientes" },
      { id: "g11-4", color: "from-cyan-300 to-teal-400", label: "Bolsa 200g" },
      { id: "g11-5", color: "from-emerald-200 to-teal-300", label: "Textura" },
    ],
    features: [
      "100% ingredientes naturales",
      "Horneadas artesanalmente",
      "Sin conservantes artificiales",
      "Aptas para humanos",
    ],
    careInstructions: "Almacenar en lugar fresco y seco. Consumir antes de la fecha indicada.",
  },
  {
    id: 12,
    name: "Rascador para Gatos Torre",
    category: "Juguetes",
    price: 78.00,
    rating: 4.7,
    reviews: 112,
    description: "Torre rascador de 3 niveles con juguetes colgantes",
    shelterId: 3,
    longDescription:
      "Torre rascador de 3 niveles diseñada para satisfacer los instintos naturales de tu gato. Incluye postes forrados en sisal resistente, plataformas de descanso acolchadas y juguetes colgantes que estimulan el juego. Base estable y segura que evita vuelcos. Fácil de armar.",
    quality: "Estándar",
    stock: 18,
    brand: "CatHaven",
    material: "Sisal, MDF, felpa suave",
    sizes: ["3 niveles", "5 niveles"],
    color: "from-amber-300 to-orange-400",
    gallery: [
      { id: "g12-1", color: "from-amber-300 to-orange-400", label: "Vista completa" },
      { id: "g12-2", color: "from-yellow-300 to-amber-400", label: "Nivel 1" },
      { id: "g12-3", color: "from-orange-300 to-red-400", label: "Nivel 2" },
      { id: "g12-4", color: "from-amber-200 to-yellow-300", label: "Juguetes colgantes" },
      { id: "g12-5", color: "from-orange-200 to-amber-300", label: "Base estable" },
    ],
    features: [
      "3 niveles de altura",
      "Postes de sisal resistente",
      "Juguetes colgantes",
      "Base antideslizante",
    ],
    careInstructions: "Aspirar regularmente. Limpiar con paño húmedo.",
  },
  {
    id: 13,
    name: "Cepillo Dental para Mascotas",
    category: "Higiene",
    price: 18.00,
    rating: 4.4,
    reviews: 76,
    description: "Kit de cepillo dental y pasta sabor a pollo",
    storeId: 1,
    longDescription:
      "Kit de higiene dental que incluye un cepillo de cerdas suaves diseñado para la boca de tu mascota y pasta dental sabor a pollo, libre de flúor y segura para ingerir. Ayuda a prevenir la acumulación de sarro, mal aliento y enfermedades periodontales. Uso recomendado: 3 veces por semana.",
    quality: "Estándar",
    stock: 55,
    brand: "FreshMouth",
    material: "Cerdas suaves, mango de goma, pasta libre de flúor",
    sizes: ["Único"],
    color: "from-rose-300 to-pink-400",
    gallery: [
      { id: "g13-1", color: "from-rose-300 to-pink-400", label: "Kit completo" },
      { id: "g13-2", color: "from-pink-300 to-fuchsia-400", label: "Cepillo" },
      { id: "g13-3", color: "from-rose-200 to-pink-300", label: "Pasta dental" },
      { id: "g13-4", color: "from-fuchsia-300 to-rose-400", label: "Uso" },
      { id: "g13-5", color: "from-pink-200 to-rose-300", label: "Empaque" },
    ],
    features: [
      "Cerdas suaves para encías sensibles",
      "Pasta sabor a pollo libre de flúor",
      "Mango ergonómico",
      "Previene sarro y mal aliento",
    ],
    careInstructions: "Enjuagar el cepillo después de cada uso. Reemplazar cada 3 meses.",
  },
  {
    id: 14,
    name: "Antipulgas y Garrapatas",
    category: "Salud",
    price: 48.00,
    rating: 4.5,
    reviews: 189,
    description: "Tratamiento mensual de amplio espectro",
    storeId: 2,
    longDescription:
      "Tratamiento tópico mensual que protege a tu mascota contra pulgas, garrapatas, mosquitos y piojos. Fórmula de amplio espectro que comienza a actuar en 24 horas y dura hasta 30 días. Aplicación fácil en la nuca. Resistente al agua después de 48 horas. Aprobado por entidades veterinarias.",
    quality: "Premium",
    stock: 120,
    brand: "ShieldPet",
    material: "Fipronil, permetrina y reguladores de crecimiento",
    sizes: ["3 dosis", "6 dosis", "12 dosis"],
    color: "from-blue-300 to-cyan-400",
    gallery: [
      { id: "g14-1", color: "from-blue-300 to-cyan-400", label: "Caja 6 dosis" },
      { id: "g14-2", color: "from-cyan-300 to-blue-400", label: "Aplicador" },
      { id: "g14-3", color: "from-sky-300 to-cyan-400", label: "Modo de uso" },
      { id: "g14-4", color: "from-blue-200 to-sky-300", label: "Protección 30 días" },
      { id: "g14-5", color: "from-cyan-200 to-blue-300", label: "Caja 12 dosis" },
    ],
    features: [
      "Protección de amplio espectro",
      "Efecto duradero (30 días)",
      "Resistente al agua",
      "Fácil aplicación tópica",
    ],
    careInstructions: "Aplicar en la nuca mensualmente. No bañar 48 horas antes o después.",
  },
  {
    id: 15,
    name: "Transportadora Plegable",
    category: "Accesorios",
    price: 92.00,
    rating: 4.8,
    reviews: 63,
    description: "Transportadora ligera y plegable con ventilación",
    shelterId: 3,
    longDescription:
      "Transportadora plegable ultraligera fabricada en nylon resistente con paneles de ventilación en los 4 lados. Incluye asa acolchada y correa ajustable para hombro. Se pliega completamente para almacenamiento plano. Cuenta con bolsillos exteriores para accesorios. Aprobada para viajes en avión.",
    quality: "Premium",
    stock: 12,
    brand: "TravelPet",
    material: "Nylon resistente, malla transpirable",
    sizes: ["Pequeña", "Mediana", "Grande"],
    color: "from-violet-300 to-purple-400",
    gallery: [
      { id: "g15-1", color: "from-violet-300 to-purple-400", label: "Vista frontal" },
      { id: "g15-2", color: "from-indigo-300 to-violet-400", label: "Plegada" },
      { id: "g15-3", color: "from-purple-300 to-fuchsia-400", label: "Ventilación" },
      { id: "g15-4", color: "from-violet-200 to-indigo-300", label: "Bolsillos" },
      { id: "g15-5", color: "from-fuchsia-300 to-purple-400", label: "Correa hombro" },
    ],
    features: [
      "Plegable para almacenamiento",
      "Ventilación en 4 lados",
      "Aprobada para avión",
      "Bolsillos exteriores",
    ],
    careInstructions: "Limpiar con paño húmedo. Lavar a mano si es necesario.",
  },
];

export const categories = ["all", "Alimentos", "Accesorios", "Juguetes", "Salud", "Higiene"];

export const getProductById = (id) => {
  return products.find((product) => product.id === Number(id));
};

export const getShelterById = (id) => {
  return shelters.find((shelter) => shelter.id === Number(id));
};

export const getStoreById = (id) => {
  return stores.find((store) => store.id === Number(id));
};

export const getProductsByShelter = (shelterId) => {
  return products.filter((product) => product.shelterId === Number(shelterId));
};

export const getProductsByStore = (storeId) => {
  return products.filter((product) => product.storeId === Number(storeId));
};

/**
 * Determina el tipo de vendedor de un producto.
 * Retorna { type: 'shelter'|'store'|null, data: object|null }
 */
export const getSellerInfo = (product) => {
  if (!product) return { type: null, data: null };
  if (product.shelterId) {
    const shelter = getShelterById(product.shelterId);
    return { type: 'shelter', data: shelter };
  }
  if (product.storeId) {
    const store = getStoreById(product.storeId);
    return { type: 'store', data: store };
  }
  return { type: null, data: null };
};

export const getProductsBySellerType = (type) => {
  if (type === 'shelter') {
    return products.filter(p => p.shelterId != null);
  }
  if (type === 'store') {
    return products.filter(p => p.storeId != null);
  }
  return products;
};
