window.CodeFlowConfig = Object.freeze({
  brandName: "CodeFlow Studio",
  whatsappNumber: "",
  instagramUrl: "https://instagram.com/tu-perfil",
  // Set this to your deployed Worker URL, for example:
  // "https://codeflow-studio-api.your-subdomain.workers.dev"
  apiBaseUrl: "https://codeflow-studio-api.juansum742.workers.dev",
  adminPassword: "TBO2026",
  // "auto" uses the API when apiBaseUrl is configured, otherwise falls back to browser storage.
  storageMode: "auto",
  projectTypes: [
    "Landing Page Premium",
    "Sistema de Reservas",
    "Panel Administrativo",
    "Automatización",
    "Backend y APIs",
    "Plataforma SaaS",
    "Software a medida"
  ],
  portfolioProjects: [
    {
      slug: "estudiantes-tbo",
      name: "Gym Estudiantes TBÓ",
      badge: "Sistema premium",
      description: "Web y pantallas del ecosistema digital del gimnasio, con foco en imagen, horarios, reserva y panel administrativo.",
      keywords: ["gym", "estudiantes", "tbo", "tbó"]
    },
    {
      slug: "barberodd",
      name: "BarberOdd",
      badge: "Landing premium",
      description: "Landing con branding fuerte, reserva directa por WhatsApp, información clara del local y una experiencia visual más aspiracional.",
      keywords: ["barberia", "barberodd"]
    }
  ]
});
