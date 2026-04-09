const config = window.CodeFlowConfig || {};
const assetsManifest = window.CodeFlowAssetsManifest || [];
const inbox = window.CodeFlowInbox;

const header = document.querySelector(".site-header");
const navToggle = document.querySelector(".nav-toggle");
const mobileLinks = document.querySelectorAll(".mobile-menu a");
const revealElements = document.querySelectorAll(".reveal");
const whatsappLinks = document.querySelectorAll("[data-whatsapp-link]");
const instagramLinks = document.querySelectorAll("[data-instagram-link]");
const portfolioGrid = document.querySelector("[data-portfolio-grid]");
const contactForm = document.querySelector("[data-contact-form]");
const formFeedback = document.querySelector("[data-form-feedback]");
const projectTypeSelect = document.querySelector("[data-project-type-select]");
const languageSelect = document.querySelector("[data-language-select]");
const i18nNodes = document.querySelectorAll("[data-i18n]");
const placeholderNodes = document.querySelectorAll("[data-i18n-placeholder]");

const metaDescription = document.querySelector('meta[name="description"]');
const ogTitle = document.querySelector('meta[property="og:title"]');
const ogDescription = document.querySelector('meta[property="og:description"]');
const twitterTitle = document.querySelector('meta[name="twitter:title"]');
const twitterDescription = document.querySelector('meta[name="twitter:description"]');

const portfolioState = new Map();
const LANGUAGE_STORAGE_KEY = "codeflow-studio.language";
const mobilePortfolioMedia = window.matchMedia("(max-width: 768px)");
const SUPPORTED_LANGUAGES = Array.isArray(config.supportedLanguages) && config.supportedLanguages.length
  ? config.supportedLanguages
  : ["es", "en", "pt"];
const DEFAULT_LANGUAGE = SUPPORTED_LANGUAGES.includes(config.defaultLanguage) ? config.defaultLanguage : "es";

let currentLanguage = SUPPORTED_LANGUAGES.includes(window.localStorage.getItem(LANGUAGE_STORAGE_KEY))
  ? window.localStorage.getItem(LANGUAGE_STORAGE_KEY)
  : DEFAULT_LANGUAGE;

const TRANSLATIONS = {
  es: {
    meta: {
      title: "CodeFlow Studio | Landing pages, sistemas y software premium",
      description: "CodeFlow Studio crea landing pages, sistemas premium y software a medida para negocios que quieren vender mejor, automatizar procesos y proyectar una imagen profesional.",
      ogTitle: "CodeFlow Studio | Landing pages, sistemas premium y software a medida",
      ogDescription: "Landing Page USD 300, sistemas premium desde USD 600 y soluciones SaaS con cotización personalizada.",
      twitterTitle: "CodeFlow Studio | Landing pages, sistemas y software premium",
      twitterDescription: "Landing Page USD 300, sistemas premium desde USD 600 y soluciones personalizadas para negocios que quieren crecer."
    },
    nav: { home: "Inicio", services: "Servicios", projects: "Proyectos", pricing: "Precios", contact: "Contacto", cta: "Solicitar presupuesto", language: "Idioma" },
    hero: {
      brandLine: "Desarrollo premium para negocios que quieren verse mejor, vender más y operar con más orden.",
      eyebrow: "Web premium + sistemas que convierten",
      title: "Escalamos tu negocio con tecnología que vende, automatiza y ordena",
      lead: "Creamos Landing Pages, sistemas premium, automatizaciones y software a medida para que consigas más clientes, ordenes procesos y proyectes una imagen mucho más profesional.",
      primaryCta: "Solicitar presupuesto",
      secondaryCta: "Ver precios",
      sectors: { gyms: "Gimnasios", padel: "Pádel", barbers: "Barberías", retail: "Comercios", businesses: "Empresas", custom: "Sistemas a medida" },
      proof: {
        imageTitle: "Imagen profesional",
        imageText: "Tu negocio se ve más serio, transmite confianza y destaca frente a la competencia.",
        automationTitle: "Automatización útil",
        automationText: "Digitalizamos procesos para ahorrar tiempo, responder mejor y ordenar la operación.",
        scaleTitle: "Base escalable",
        scaleText: "Empieza con una Landing Page o un sistema premium y escala según la complejidad de tu negocio."
      }
    },
    signals: {
      landingTitle: "Landing Page",
      landingText: "USD 300 para lanzar una presencia profesional y orientada a conversión.",
      premiumTitle: "Sistemas premium",
      premiumText: "Desde USD 600, ajustados a los objetivos y procesos de tu negocio.",
      automationTitle: "Automatización",
      automationText: "Menos tareas manuales, más orden comercial y operativo.",
      saasTitle: "SaaS y sistemas complejos",
      saasText: "Cotización personalizada para soluciones con más alcance."
    },
    services: {
      eyebrow: "Servicios",
      title: "Soluciones digitales diseñadas para vender mejor, automatizar procesos y hacer crecer tu negocio",
      body: "No hacemos páginas genéricas. Diseñamos experiencias premium y sistemas funcionales para que tu negocio proyecte nivel, mejore su operación y convierta más visitas en clientes.",
      cards: {
        landing: { title: "Landing Page", body: "Diseño distintivo, narrativa clara y foco real en conversión. Precio fijo: USD 300." },
        booking: { title: "Sistemas de Reservas", body: "Turnos, agendas, cupos y operación ordenada. Sistema premium desde USD 600." },
        admin: { title: "Paneles Administrativos", body: "Información ordenada, acciones rápidas y control de la operación. Desde USD 600 según alcance." },
        automation: { title: "Automatización de Procesos", body: "Menos tareas manuales, más consistencia y flujos internos que ahorran tiempo. Desde USD 600." },
        backend: { title: "Backend y APIs", body: "Conectamos servicios y modelamos la lógica del negocio sobre una base escalable. Desde USD 600." },
        saas: { title: "Plataformas SaaS y soluciones a medida", body: "Productos multiusuario, dashboards, automatizaciones y procesos avanzados con cotización personalizada." }
      }
    },
    portfolio: {
      eyebrow: "Proyectos realizados",
      title: "Trabajos pensados para posicionar mejor cada marca y facilitar su operación",
      body: "Cada proyecto combina diseño, claridad comercial y una experiencia digital alineada al negocio real del cliente.",
      cta: "Hablemos de tu proyecto",
      emptyBadge: "Pronto",
      emptyTitle: "Nuevos proyectos en camino",
      emptyBody: "Estamos preparando nuevos casos para mostrar más trabajos, resultados y soluciones desarrolladas para distintos negocios.",
      imageSingle: "imagen",
      imagePlural: "imágenes",
      viewAlt: "vista",
      prevAria: "Vista anterior",
      nextAria: "Vista siguiente",
      dotAria: "Ir a la vista"
    },
    portfolioProjects: {
      "estudiantes-tbo": { name: "Gym Estudiantes TBÓ", badge: "Sistema Premium", description: "Sistema visual y operativo para mejorar reservas, ordenar la gestión interna y elevar la imagen profesional del gimnasio." },
      barberodd: { name: "Barberodd", badge: "Landing Page", description: "Landing comercial enfocada en posicionar la marca, generar consultas y facilitar reservas directas por WhatsApp." }
    },
    why: {
      eyebrow: "Por qué elegirnos",
      title: "Soluciones modernas con diseño premium, soporte y escalabilidad",
      features: [
        "Diseño premium con identidad propia",
        "Automatización aplicada a operaciones reales",
        "Arquitectura lista para crecer sin rehacer todo",
        "Integración con backend, APIs y paneles internos",
        "Soporte evolutivo para acompañar el crecimiento"
      ],
      process: [
        { title: "Estrategia", body: "Leemos tu negocio y definimos la solución correcta según tus objetivos." },
        { title: "Diseño", body: "Construimos una experiencia visual premium y alineada a tu marca." },
        { title: "Desarrollo", body: "Implementamos frontend, automatización y sistemas escalables sin improvisar." }
      ]
    },
    pricing: {
      eyebrow: "Precios",
      title: "Estructura comercial clara para lanzar tu presencia digital o construir una solución más completa",
      cards: {
        landing: { badge: "Landing Page", price: "USD 300", body: "Ideal para lanzar una presencia digital profesional, clara y lista para convertir visitas en consultas." },
        premium: { badge: "Sistema Premium", price: "Desde USD 600", body: "Sistemas premium desde USD 600, ajustados a la complejidad, procesos y objetivos de tu negocio." },
        saas: { badge: "SaaS / sistema complejo", price: "Cotización personalizada", body: "Para operaciones que necesitan reservas, paneles, automatización, roles, backend y crecimiento escalable." }
      },
      note: "Precios personalizados, cotización según necesidades y escalable según el negocio. Podemos empezar por una Landing Page y crecer hacia un sistema premium o una plataforma SaaS."
    },
    contact: {
      eyebrow: "Cotización",
      title: "Cuéntanos qué necesitas y te respondemos con una propuesta clara",
      body: "Explícanos qué quieres mejorar, qué procesos quieres automatizar y qué tipo de sistema o web necesitas. Te respondemos con una cotización alineada a tu negocio.",
      noteTitle: "Propuesta orientada a resultados",
      noteBody: "Analizamos tu caso, detectamos oportunidades reales y te guiamos hacia una Landing Page o un sistema premium que ayude a vender más y operar mejor.",
      form: { name: "Nombre", business: "Negocio", whatsapp: "WhatsApp", instagram: "Instagram opcional", projectType: "Qué necesitas", message: "Mensaje detallado", submit: "Solicitar presupuesto" },
      placeholders: {
        name: "Tu nombre",
        business: "Nombre de tu negocio",
        whatsapp: "Tu contacto directo",
        instagram: "@tuusuario",
        message: "Cuéntanos qué quieres mejorar, qué problema quieres resolver y qué resultado buscas para tu negocio."
      }
    },
    finalCta: {
      eyebrow: "Contacto directo",
      title: "Hablemos de tu proyecto",
      body: "Si ya tienes una idea clara o quieres una cotización rápida, escríbenos directamente por WhatsApp o Instagram y coordinamos el siguiente paso.",
      whatsapp: "WhatsApp",
      instagram: "Instagram"
    },
    footer: { cta: "Solicitar presupuesto", copy: "© 2026 Todos los derechos reservados. Sitio desarrollado por" },
    form: {
      projectTypes: ["Landing Page", "Sistema Premium", "Sistema de Reservas", "Panel Administrativo", "Automatización", "Plataforma SaaS", "Software a medida"],
      directMessage: "Hola CodeFlow Studio, quiero cotizar una Landing Page o un sistema premium para mi negocio.",
      submissionIntro: "Hola CodeFlow Studio, quiero solicitar una cotización.",
      feedback: {
        invalid: "Completa los campos requeridos para preparar tu consulta correctamente.",
        successWhatsapp: "Recibimos tu consulta y abrimos WhatsApp para que puedas continuar la conversación al instante.",
        successInbox: "Recibimos tu consulta correctamente. Te responderemos pronto con una propuesta clara.",
        error: "No pudimos enviar tu mensaje en este momento."
      }
    }
  },
  en: {
    meta: {
      title: "CodeFlow Studio | Landing pages, premium systems and custom software",
      description: "CodeFlow Studio builds landing pages, premium systems and custom software for businesses that want to sell better, automate processes and look more professional.",
      ogTitle: "CodeFlow Studio | Landing pages, premium systems and custom software",
      ogDescription: "Landing Page USD 300, premium systems starting at USD 600 and SaaS solutions with custom quotes.",
      twitterTitle: "CodeFlow Studio | Landing pages, premium systems and custom software",
      twitterDescription: "Landing Page USD 300, premium systems starting at USD 600 and tailored solutions for businesses ready to grow."
    },
    nav: { home: "Home", services: "Services", projects: "Projects", pricing: "Pricing", contact: "Contact", cta: "Request a quote", language: "Language" },
    hero: {
      brandLine: "Premium development for businesses that want to look better, sell more and operate with more clarity.",
      eyebrow: "Premium websites + systems that convert",
      title: "We scale your business with technology that sells, automates and organizes",
      lead: "We create landing pages, premium systems, automations and custom software so you can get more clients, organize processes and project a much more professional image.",
      primaryCta: "Request a quote",
      secondaryCta: "View pricing",
      sectors: { gyms: "Gyms", padel: "Padel", barbers: "Barbershops", retail: "Retail", businesses: "Companies", custom: "Custom systems" },
      proof: {
        imageTitle: "Professional image",
        imageText: "Your business looks more serious, builds trust and stands out from the competition.",
        automationTitle: "Useful automation",
        automationText: "We digitize processes to save time, answer faster and organize your operation.",
        scaleTitle: "Scalable foundation",
        scaleText: "Start with a landing page or a premium system and scale based on your business complexity."
      }
    },
    signals: {
      landingTitle: "Landing Page",
      landingText: "USD 300 to launch a professional presence focused on conversion.",
      premiumTitle: "Premium systems",
      premiumText: "Starting at USD 600, tailored to your business goals and processes.",
      automationTitle: "Automation",
      automationText: "Less manual work, more commercial and operational clarity.",
      saasTitle: "SaaS and complex systems",
      saasText: "Custom quote for broader and more advanced solutions."
    },
    services: {
      eyebrow: "Services",
      title: "Digital solutions designed to sell better, automate processes and grow your business",
      body: "We do not build generic websites. We design premium experiences and functional systems so your business looks high-level, works better and converts more visitors into clients.",
      cards: {
        landing: { title: "Landing Page", body: "Distinctive design, clear narrative and real conversion focus. Fixed price: USD 300." },
        booking: { title: "Booking Systems", body: "Appointments, schedules, capacity and a cleaner operation. Premium system starting at USD 600." },
        admin: { title: "Admin Dashboards", body: "Organized information, fast actions and better operational control. Starting at USD 600." },
        automation: { title: "Process Automation", body: "Less manual work, more consistency and internal flows that actually save time. Starting at USD 600." },
        backend: { title: "Backend and APIs", body: "We connect services and model business logic on a scalable foundation. Starting at USD 600." },
        saas: { title: "SaaS platforms and custom solutions", body: "Multi-user products, dashboards, automations and advanced operations with custom pricing." }
      }
    },
    portfolio: {
      eyebrow: "Selected work",
      title: "Projects built to strengthen each brand and simplify operations",
      body: "Each project combines design, commercial clarity and a digital experience aligned with the real business model.",
      cta: "Let's talk about your project",
      emptyBadge: "Soon",
      emptyTitle: "New projects are coming",
      emptyBody: "We are preparing new case studies to show more work, results and solutions for different businesses.",
      imageSingle: "image",
      imagePlural: "images",
      viewAlt: "view",
      prevAria: "Previous view",
      nextAria: "Next view",
      dotAria: "Go to view"
    },
    portfolioProjects: {
      "estudiantes-tbo": { name: "Gym Estudiantes TBÓ", badge: "Premium System", description: "Visual and operational system designed to improve bookings, organize internal management and elevate the gym's professional image." },
      barberodd: { name: "Barberodd", badge: "Landing Page", description: "Commercial landing page focused on positioning the brand, generating inquiries and making direct WhatsApp bookings easier." }
    },
    why: {
      eyebrow: "Why choose us",
      title: "Modern solutions with premium design, support and scalability",
      features: [
        "Premium design with a strong identity",
        "Automation built for real operations",
        "Architecture ready to scale without rebuilding everything",
        "Backend, API and internal dashboard integration",
        "Ongoing support to accompany growth"
      ],
      process: [
        { title: "Strategy", body: "We study your business and define the right solution for your goals." },
        { title: "Design", body: "We build a premium visual experience aligned with your brand." },
        { title: "Development", body: "We implement frontend, automation and scalable systems without improvisation." }
      ]
    },
    pricing: {
      eyebrow: "Pricing",
      title: "A clear commercial structure to launch your digital presence or build a more complete solution",
      cards: {
        landing: { badge: "Landing Page", price: "USD 300", body: "Ideal to launch a professional digital presence that is clear, modern and ready to convert visits into inquiries." },
        premium: { badge: "Premium System", price: "Starting at USD 600", body: "Premium systems starting at USD 600, adjusted to your business complexity, processes and goals." },
        saas: { badge: "SaaS / complex system", price: "Custom quote", body: "For operations that need bookings, dashboards, automation, roles, backend and scalable growth." }
      },
      note: "Custom pricing, quotes based on your needs and scalable according to your business. We can start with a landing page and grow into a premium system or a SaaS platform."
    },
    contact: {
      eyebrow: "Quote",
      title: "Tell us what you need and we will reply with a clear proposal",
      body: "Explain what you want to improve, which processes you want to automate and what kind of website or system you need. We will reply with a quote aligned with your business.",
      noteTitle: "Results-oriented proposal",
      noteBody: "We analyze your case, detect real opportunities and guide you toward a landing page or premium system that helps you sell more and operate better.",
      form: { name: "Name", business: "Business", whatsapp: "WhatsApp", instagram: "Instagram optional", projectType: "What do you need", message: "Detailed message", submit: "Request a quote" },
      placeholders: {
        name: "Your name",
        business: "Your business name",
        whatsapp: "Your direct contact",
        instagram: "@yourusername",
        message: "Tell us what you want to improve, which problem you want to solve and what result you want for your business."
      }
    },
    finalCta: {
      eyebrow: "Direct contact",
      title: "Let's talk about your project",
      body: "If you already have a clear idea or want a quick quote, message us directly on WhatsApp or Instagram and we will coordinate the next step.",
      whatsapp: "WhatsApp",
      instagram: "Instagram"
    },
    footer: { cta: "Request a quote", copy: "© 2026 All rights reserved. Website developed by" },
    form: {
      projectTypes: ["Landing Page", "Premium System", "Booking System", "Admin Dashboard", "Automation", "SaaS Platform", "Custom Software"],
      directMessage: "Hi CodeFlow Studio, I want a quote for a landing page or premium system for my business.",
      submissionIntro: "Hi CodeFlow Studio, I want to request a quote.",
      feedback: {
        invalid: "Complete the required fields so we can prepare your inquiry correctly.",
        successWhatsapp: "We received your message and opened WhatsApp so you can continue the conversation right away.",
        successInbox: "We received your message correctly. We will reply soon with a clear proposal.",
        error: "We could not send your message right now."
      }
    }
  },
  pt: {
    meta: {
      title: "CodeFlow Studio | Landing pages, sistemas premium e software sob medida",
      description: "A CodeFlow Studio cria landing pages, sistemas premium e software sob medida para negócios que querem vender melhor, automatizar processos e transmitir uma imagem profissional.",
      ogTitle: "CodeFlow Studio | Landing pages, sistemas premium e software sob medida",
      ogDescription: "Landing Page USD 300, sistemas premium a partir de USD 600 e soluções SaaS com orçamento personalizado.",
      twitterTitle: "CodeFlow Studio | Landing pages, sistemas premium e software sob medida",
      twitterDescription: "Landing Page USD 300, sistemas premium a partir de USD 600 e soluções personalizadas para negócios que querem crescer."
    },
    nav: { home: "Início", services: "Serviços", projects: "Projetos", pricing: "Preços", contact: "Contato", cta: "Solicitar orçamento", language: "Idioma" },
    hero: {
      brandLine: "Desenvolvimento premium para negócios que querem se posicionar melhor, vender mais e operar com mais organização.",
      eyebrow: "Web premium + sistemas que convertem",
      title: "Escalamos o seu negócio com tecnologia que vende, automatiza e organiza",
      lead: "Criamos landing pages, sistemas premium, automações e software sob medida para que você conquiste mais clientes, organize processos e projete uma imagem muito mais profissional.",
      primaryCta: "Solicitar orçamento",
      secondaryCta: "Ver preços",
      sectors: { gyms: "Academias", padel: "Padel", barbers: "Barbearias", retail: "Comércios", businesses: "Empresas", custom: "Sistemas sob medida" },
      proof: {
        imageTitle: "Imagem profissional",
        imageText: "Seu negócio transmite mais confiança, parece mais sério e se destaca da concorrência.",
        automationTitle: "Automação útil",
        automationText: "Digitalizamos processos para economizar tempo, responder melhor e organizar a operação.",
        scaleTitle: "Base escalável",
        scaleText: "Comece com uma landing page ou um sistema premium e escale conforme a complexidade do seu negócio."
      }
    },
    signals: {
      landingTitle: "Landing Page",
      landingText: "USD 300 para lançar uma presença profissional e orientada à conversão.",
      premiumTitle: "Sistemas premium",
      premiumText: "A partir de USD 600, ajustados aos objetivos e processos do seu negócio.",
      automationTitle: "Automação",
      automationText: "Menos tarefas manuais, mais ordem comercial e operacional.",
      saasTitle: "SaaS e sistemas complexos",
      saasText: "Orçamento personalizado para soluções com maior alcance."
    },
    services: {
      eyebrow: "Serviços",
      title: "Soluções digitais pensadas para vender melhor, automatizar processos e fazer o seu negócio crescer",
      body: "Não fazemos páginas genéricas. Criamos experiências premium e sistemas funcionais para que o seu negócio tenha mais nível, melhore a operação e converta mais visitas em clientes.",
      cards: {
        landing: { title: "Landing Page", body: "Design marcante, narrativa clara e foco real em conversão. Preço fixo: USD 300." },
        booking: { title: "Sistemas de Reservas", body: "Agendamentos, horários, limites e operação mais organizada. Sistema premium a partir de USD 600." },
        admin: { title: "Painéis Administrativos", body: "Informação organizada, ações rápidas e melhor controle operacional. A partir de USD 600." },
        automation: { title: "Automação de Processos", body: "Menos tarefas manuais, mais consistência e fluxos internos que economizam tempo. A partir de USD 600." },
        backend: { title: "Backend e APIs", body: "Conectamos serviços e modelamos a lógica do negócio em uma base escalável. A partir de USD 600." },
        saas: { title: "Plataformas SaaS e soluções sob medida", body: "Produtos multiusuário, dashboards, automações e processos avançados com orçamento personalizado." }
      }
    },
    portfolio: {
      eyebrow: "Projetos realizados",
      title: "Trabalhos pensados para fortalecer cada marca e facilitar a operação",
      body: "Cada projeto combina design, clareza comercial e uma experiência digital alinhada ao negócio real do cliente.",
      cta: "Vamos falar do seu projeto",
      emptyBadge: "Em breve",
      emptyTitle: "Novos projetos a caminho",
      emptyBody: "Estamos preparando novos cases para mostrar mais trabalhos, resultados e soluções desenvolvidas para diferentes negócios.",
      imageSingle: "imagem",
      imagePlural: "imagens",
      viewAlt: "visual",
      prevAria: "Visual anterior",
      nextAria: "Próximo visual",
      dotAria: "Ir para o visual"
    },
    portfolioProjects: {
      "estudiantes-tbo": { name: "Gym Estudiantes TBÓ", badge: "Sistema Premium", description: "Sistema visual e operacional pensado para melhorar reservas, organizar a gestão interna e elevar a imagem profissional da academia." },
      barberodd: { name: "Barberodd", badge: "Landing Page", description: "Landing comercial focada em posicionar a marca, gerar contatos e facilitar reservas diretas pelo WhatsApp." }
    },
    why: {
      eyebrow: "Por que escolher a gente",
      title: "Soluções modernas com design premium, suporte e escalabilidade",
      features: [
        "Design premium com identidade própria",
        "Automação aplicada a operações reais",
        "Arquitetura pronta para crescer sem refazer tudo",
        "Integração com backend, APIs e painéis internos",
        "Suporte evolutivo para acompanhar o crescimento"
      ],
      process: [
        { title: "Estratégia", body: "Entendemos o seu negócio e definimos a solução certa de acordo com os objetivos." },
        { title: "Design", body: "Construímos uma experiência visual premium alinhada com a sua marca." },
        { title: "Desenvolvimento", body: "Implementamos frontend, automação e sistemas escaláveis sem improviso." }
      ]
    },
    pricing: {
      eyebrow: "Preços",
      title: "Estrutura comercial clara para lançar sua presença digital ou construir uma solução mais completa",
      cards: {
        landing: { badge: "Landing Page", price: "USD 300", body: "Ideal para lançar uma presença digital profissional, clara e pronta para converter visitas em contatos." },
        premium: { badge: "Sistema Premium", price: "A partir de USD 600", body: "Sistemas premium a partir de USD 600, ajustados à complexidade, processos e objetivos do seu negócio." },
        saas: { badge: "SaaS / sistema complexo", price: "Orçamento personalizado", body: "Para operações que precisam de reservas, painéis, automação, permissões, backend e crescimento escalável." }
      },
      note: "Preços personalizados, orçamento conforme as necessidades e escalável conforme o negócio. Podemos começar com uma landing page e evoluir para um sistema premium ou uma plataforma SaaS."
    },
    contact: {
      eyebrow: "Orçamento",
      title: "Conte o que você precisa e responderemos com uma proposta clara",
      body: "Explique o que você quer melhorar, quais processos quer automatizar e que tipo de site ou sistema precisa. Respondemos com um orçamento alinhado ao seu negócio.",
      noteTitle: "Proposta orientada a resultados",
      noteBody: "Analisamos o seu caso, detectamos oportunidades reais e guiamos você para uma landing page ou um sistema premium que ajude a vender mais e operar melhor.",
      form: { name: "Nome", business: "Negócio", whatsapp: "WhatsApp", instagram: "Instagram opcional", projectType: "O que você precisa", message: "Mensagem detalhada", submit: "Solicitar orçamento" },
      placeholders: {
        name: "Seu nome",
        business: "Nome do seu negócio",
        whatsapp: "Seu contato direto",
        instagram: "@seuusuario",
        message: "Conte o que você quer melhorar, que problema quer resolver e qual resultado busca para o seu negócio."
      }
    },
    finalCta: {
      eyebrow: "Contato direto",
      title: "Vamos falar do seu projeto",
      body: "Se você já tem uma ideia clara ou quer um orçamento rápido, fale conosco direto pelo WhatsApp ou Instagram e definimos o próximo passo.",
      whatsapp: "WhatsApp",
      instagram: "Instagram"
    },
    footer: { cta: "Solicitar orçamento", copy: "© 2026 Todos os direitos reservados. Site desenvolvido por" },
    form: {
      projectTypes: ["Landing Page", "Sistema Premium", "Sistema de Reservas", "Painel Administrativo", "Automação", "Plataforma SaaS", "Software sob medida"],
      directMessage: "Olá CodeFlow Studio, quero um orçamento para uma landing page ou sistema premium para o meu negócio.",
      submissionIntro: "Olá CodeFlow Studio, quero solicitar um orçamento.",
      feedback: {
        invalid: "Preencha os campos obrigatórios para prepararmos sua consulta corretamente.",
        successWhatsapp: "Recebemos sua consulta e abrimos o WhatsApp para você continuar a conversa na hora.",
        successInbox: "Recebemos sua consulta corretamente. Vamos responder em breve com uma proposta clara.",
        error: "Não foi possível enviar sua mensagem agora."
      }
    }
  }
};

const getLanguagePack = (language = currentLanguage) => TRANSLATIONS[language] || TRANSLATIONS[DEFAULT_LANGUAGE];

const getTranslation = (path, language = currentLanguage) => {
  const resolve = (source) =>
    path.split(".").reduce((value, segment) => (value && value[segment] !== undefined ? value[segment] : undefined), source);

  return resolve(getLanguagePack(language)) ?? resolve(getLanguagePack(DEFAULT_LANGUAGE));
};

const setHeaderState = () => {
  if (!header) {
    return;
  }

  header.classList.toggle("is-scrolled", window.scrollY > 18);
};

const closeMenu = () => {
  if (!header || !navToggle) {
    return;
  }

  header.classList.remove("menu-open");
  navToggle.setAttribute("aria-expanded", "false");
};

const normalizeText = (value) =>
  `${value || ""}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const encodeAssetPath = (path) => encodeURI(path).replaceAll("#", "%23");

const setSocialLinks = () => {
  const baseWhatsApp = inbox.buildWhatsAppUrl(getTranslation("form.directMessage"));

  whatsappLinks.forEach((link) => {
    link.href = baseWhatsApp;
  });

  instagramLinks.forEach((link) => {
    link.href = `${config.instagramUrl || "#"}`;
  });
};

const fillProjectTypes = () => {
  if (!projectTypeSelect) {
    return;
  }

  const currentIndex = projectTypeSelect.selectedIndex > -1 ? projectTypeSelect.selectedIndex : 0;
  const projectTypes = getTranslation("form.projectTypes") || config.projectTypes || [];

  projectTypeSelect.innerHTML = "";

  projectTypes.forEach((projectType, index) => {
    const option = document.createElement("option");
    option.value = projectType;
    option.textContent = projectType;
    option.selected = index === Math.min(currentIndex, projectTypes.length - 1);
    projectTypeSelect.append(option);
  });
};

const getProjectImageScore = (path) => {
  const normalized = normalizeText(path);
  let score = 100;

  if (normalized.includes("final")) {
    score -= 40;
  }

  if (normalized.includes("admin")) {
    score += 15;
  }

  if (normalized.includes("mapa")) {
    score += 20;
  }

  const match = normalized.match(/\b(\d+)\b/);

  if (match) {
    score += Number(match[1]);
  }

  return score;
};

const getLocalizedPortfolioProject = (project) => {
  const localized = getTranslation(`portfolioProjects.${project.slug}`) || {};

  return {
    ...project,
    name: localized.name || project.name,
    badge: localized.badge || project.badge,
    description: localized.description || project.description
  };
};

const buildPortfolioProjects = () => {
  const imageAssets = assetsManifest.filter((assetPath) => /\.(png|jpe?g|webp)$/i.test(assetPath));

  return (config.portfolioProjects || [])
    .map((project) => {
      const matches = imageAssets
        .filter((assetPath) => {
          const normalizedPath = normalizeText(assetPath);
          return project.keywords.some((keyword) => normalizedPath.includes(normalizeText(keyword)));
        })
        .sort((left, right) => getProjectImageScore(left) - getProjectImageScore(right));

      return {
        ...getLocalizedPortfolioProject(project),
        images: matches.map((assetPath) => encodeAssetPath(assetPath))
      };
    })
    .filter((project) => project.images.length > 0);
};

const isMobilePortfolioViewport = () => mobilePortfolioMedia.matches;

const updateSliderUi = (slider, activeIndex) => {
  const slides = [...slider.querySelectorAll(".project-slide")];
  const dots = [...slider.querySelectorAll(".project-dot")];

  slides.forEach((slide, index) => {
    slide.classList.toggle("is-active", index === activeIndex);
  });

  dots.forEach((dot, index) => {
    dot.classList.toggle("is-active", index === activeIndex);
    dot.setAttribute("aria-current", index === activeIndex ? "true" : "false");
  });
};

const setSliderIndex = (sliderId, nextIndex) => {
  const slider = document.querySelector(`[data-portfolio-slider="${sliderId}"]`);

  if (!slider) {
    return;
  }

  const slides = [...slider.querySelectorAll(".project-slide")];
  const safeIndex = ((nextIndex % slides.length) + slides.length) % slides.length;
  const track = slider.querySelector(".project-track");

  portfolioState.set(sliderId, safeIndex);

  if (track && !isMobilePortfolioViewport()) {
    track.style.transform = `translateX(-${safeIndex * 100}%)`;
  }

  if (track && isMobilePortfolioViewport()) {
    track.style.transform = "";
  }

  if (isMobilePortfolioViewport()) {
    slider.scrollTo({
      left: safeIndex * slider.clientWidth,
      behavior: "smooth"
    });
  }

  updateSliderUi(slider, safeIndex);
};

const handlePortfolioSliderScroll = (event) => {
  if (!isMobilePortfolioViewport()) {
    return;
  }

  const slider = event.currentTarget;
  const slides = [...slider.querySelectorAll(".project-slide")];

  if (!slides.length) {
    return;
  }

  const slideWidth = slider.clientWidth || slides[0].clientWidth || 1;
  const nextIndex = Math.max(0, Math.min(slides.length - 1, Math.round(slider.scrollLeft / slideWidth)));

  portfolioState.set(slider.dataset.portfolioSlider, nextIndex);
  updateSliderUi(slider, nextIndex);
};

const bindPortfolioSwipe = () => {
  if (!portfolioGrid) {
    return;
  }

  const sliders = [...portfolioGrid.querySelectorAll("[data-portfolio-slider]")];

  sliders.forEach((slider) => {
    slider.removeEventListener("scroll", handlePortfolioSliderScroll);
    slider.addEventListener("scroll", handlePortfolioSliderScroll, { passive: true });

    const sliderId = slider.dataset.portfolioSlider;
    const currentIndex = portfolioState.get(sliderId) ?? 0;

    if (isMobilePortfolioViewport()) {
      slider.scrollLeft = currentIndex * slider.clientWidth;
      updateSliderUi(slider, currentIndex);
    } else {
      const track = slider.querySelector(".project-track");

      if (track) {
        track.style.transform = `translateX(-${currentIndex * 100}%)`;
      }

      updateSliderUi(slider, currentIndex);
    }
  });
};

const renderPortfolio = () => {
  if (!portfolioGrid) {
    return;
  }

  const projects = buildPortfolioProjects();
  const imageSingle = getTranslation("portfolio.imageSingle") || "imagen";
  const imagePlural = getTranslation("portfolio.imagePlural") || "imágenes";

  if (!projects.length) {
    portfolioGrid.innerHTML = `
      <article class="glass-card project-card">
        <div class="project-content">
          <span class="project-badge">${getTranslation("portfolio.emptyBadge") || "Pronto"}</span>
          <h3>${getTranslation("portfolio.emptyTitle") || "Nuevos proyectos en camino"}</h3>
          <p>${getTranslation("portfolio.emptyBody") || ""}</p>
        </div>
      </article>
    `;
    return;
  }

  portfolioGrid.innerHTML = projects
    .map((project) => {
      const hasMultipleImages = project.images.length > 1;

      return `
        <article class="glass-card project-card">
          <figure class="project-media">
            <div class="project-slider" data-portfolio-slider="${project.slug}">
              <div class="project-track">
                ${project.images
                  .map(
                    (imagePath, index) => `
                      <div class="project-slide ${index === 0 ? "is-active" : ""}">
                        <img src="${imagePath}" alt="${project.name} - ${(getTranslation("portfolio.viewAlt") || "vista")} ${index + 1}" loading="lazy" decoding="async">
                      </div>
                    `
                  )
                  .join("")}
              </div>
              ${
                hasMultipleImages
                  ? `
                    <div class="project-controls">
                      <div class="project-nav">
                        <button class="project-arrow" type="button" aria-label="${getTranslation("portfolio.prevAria") || "Vista anterior"}" data-slider-prev="${project.slug}">&#8592;</button>
                        <button class="project-arrow" type="button" aria-label="${getTranslation("portfolio.nextAria") || "Vista siguiente"}" data-slider-next="${project.slug}">&#8594;</button>
                      </div>
                      <div class="project-dots">
                        ${project.images
                          .map(
                            (_, index) => `
                              <button class="project-dot ${index === 0 ? "is-active" : ""}" type="button" aria-label="${getTranslation("portfolio.dotAria") || "Ir a la vista"} ${index + 1}" aria-current="${index === 0 ? "true" : "false"}" data-slider-dot="${project.slug}" data-slide-index="${index}"></button>
                            `
                          )
                          .join("")}
                      </div>
                    </div>
                  `
                  : ""
              }
            </div>
          </figure>
          <div class="project-content">
            <div class="project-meta">
              <span class="project-badge">${project.badge}</span>
              <span class="project-count">${project.images.length} ${project.images.length === 1 ? imageSingle : imagePlural}</span>
            </div>
            <h3>${project.name}</h3>
            <p>${project.description}</p>
          </div>
        </article>
      `;
    })
    .join("");

  projects.forEach((project) => {
    if (project.images.length > 1) {
      setSliderIndex(project.slug, 0);
    }
  });

  bindPortfolioSwipe();
};

const updateMeta = () => {
  document.title = getTranslation("meta.title") || document.title;

  if (metaDescription) {
    metaDescription.content = getTranslation("meta.description") || metaDescription.content;
  }

  if (ogTitle) {
    ogTitle.content = getTranslation("meta.ogTitle") || ogTitle.content;
  }

  if (ogDescription) {
    ogDescription.content = getTranslation("meta.ogDescription") || ogDescription.content;
  }

  if (twitterTitle) {
    twitterTitle.content = getTranslation("meta.twitterTitle") || twitterTitle.content;
  }

  if (twitterDescription) {
    twitterDescription.content = getTranslation("meta.twitterDescription") || twitterDescription.content;
  }
};

const applyTranslations = () => {
  i18nNodes.forEach((node) => {
    const text = getTranslation(node.dataset.i18n);

    if (typeof text === "string") {
      node.textContent = text;
    }
  });

  placeholderNodes.forEach((node) => {
    const text = getTranslation(node.dataset.i18nPlaceholder);

    if (typeof text === "string") {
      node.placeholder = text;
    }
  });

  updateMeta();
  document.documentElement.lang = currentLanguage === "pt" ? "pt-BR" : currentLanguage;

  if (languageSelect) {
    languageSelect.value = currentLanguage;
  }
};

const setLanguage = (language) => {
  currentLanguage = SUPPORTED_LANGUAGES.includes(language) ? language : DEFAULT_LANGUAGE;
  window.localStorage.setItem(LANGUAGE_STORAGE_KEY, currentLanguage);
  applyTranslations();
  fillProjectTypes();
  renderPortfolio();
  setSocialLinks();

  if (formFeedback) {
    formFeedback.textContent = "";
  }
};

const setupRevealObserver = () => {
  if (!revealElements.length) {
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.18 }
  );

  revealElements.forEach((element) => observer.observe(element));
};

const buildFormMessage = (data) =>
  [
    getTranslation("form.submissionIntro") || "",
    "",
    `${getTranslation("contact.form.name") || "Nombre"}: ${data.name}`,
    `${getTranslation("contact.form.business") || "Negocio"}: ${data.business}`,
    `${getTranslation("contact.form.whatsapp") || "WhatsApp"}: ${data.whatsapp}`,
    `${getTranslation("contact.form.instagram") || "Instagram"}: ${data.instagram || "-"}`,
    `${getTranslation("contact.form.projectType") || "Tipo de proyecto"}: ${data.projectType}`,
    "",
    `${getTranslation("contact.form.message") || "Mensaje"}:`,
    data.message
  ].join("\n");

const handleContactSubmit = () => {
  if (!contactForm || !formFeedback) {
    return;
  }

  contactForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!contactForm.reportValidity()) {
      formFeedback.textContent = getTranslation("form.feedback.invalid") || "";
      return;
    }

    const formData = new FormData(contactForm);
    const payload = {
      name: `${formData.get("name") || ""}`.trim(),
      business: `${formData.get("business") || ""}`.trim(),
      whatsapp: `${formData.get("whatsapp") || ""}`.trim(),
      instagram: `${formData.get("instagram") || ""}`.trim(),
      projectType: `${formData.get("projectType") || ""}`.trim(),
      message: `${formData.get("message") || ""}`.trim()
    };

    try {
      await inbox.submitMessage(payload);

      if (`${config.whatsappNumber || ""}`.trim()) {
        window.open(inbox.buildWhatsAppUrl(buildFormMessage(payload)), "_blank", "noopener,noreferrer");
        formFeedback.textContent = getTranslation("form.feedback.successWhatsapp") || "";
      } else {
        formFeedback.textContent = getTranslation("form.feedback.successInbox") || "";
      }

      contactForm.reset();

      if (projectTypeSelect) {
        projectTypeSelect.selectedIndex = 0;
      }
    } catch (error) {
      formFeedback.textContent = error.message || getTranslation("form.feedback.error") || "";
    }
  });
};

if (navToggle && header) {
  navToggle.addEventListener("click", () => {
    const isOpen = header.classList.toggle("menu-open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });
}

mobileLinks.forEach((link) => {
  link.addEventListener("click", closeMenu);
});

document.addEventListener("click", (event) => {
  if (!header || !header.classList.contains("menu-open")) {
    return;
  }

  if (!header.contains(event.target)) {
    closeMenu();
  }
});

portfolioGrid?.addEventListener("click", (event) => {
  const previousButton = event.target.closest("[data-slider-prev]");
  const nextButton = event.target.closest("[data-slider-next]");
  const dotButton = event.target.closest("[data-slider-dot]");

  if (previousButton) {
    const sliderId = previousButton.dataset.sliderPrev;
    setSliderIndex(sliderId, (portfolioState.get(sliderId) ?? 0) - 1);
  }

  if (nextButton) {
    const sliderId = nextButton.dataset.sliderNext;
    setSliderIndex(sliderId, (portfolioState.get(sliderId) ?? 0) + 1);
  }

  if (dotButton) {
    const sliderId = dotButton.dataset.sliderDot;
    const slideIndex = Number(dotButton.dataset.slideIndex || 0);
    setSliderIndex(sliderId, slideIndex);
  }
});

languageSelect?.addEventListener("change", () => {
  setLanguage(languageSelect.value);
});

const syncPortfolioViewportMode = () => {
  if (!portfolioGrid) {
    return;
  }

  [...portfolioGrid.querySelectorAll("[data-portfolio-slider]")].forEach((slider) => {
    const sliderId = slider.dataset.portfolioSlider;
    setSliderIndex(sliderId, portfolioState.get(sliderId) ?? 0);
  });
};

if (typeof mobilePortfolioMedia.addEventListener === "function") {
  mobilePortfolioMedia.addEventListener("change", syncPortfolioViewportMode);
} else if (typeof mobilePortfolioMedia.addListener === "function") {
  mobilePortfolioMedia.addListener(syncPortfolioViewportMode);
}

setHeaderState();
setLanguage(currentLanguage);
setupRevealObserver();
handleContactSubmit();

window.addEventListener("scroll", setHeaderState, { passive: true });
window.addEventListener("resize", syncPortfolioViewportMode, { passive: true });
