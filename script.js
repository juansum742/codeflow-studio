const config = window.CodeFlowConfig;
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

const setSocialLinks = () => {
  const baseWhatsApp = inbox.buildWhatsAppUrl("Hola CodeFlow Studio, quiero solicitar una propuesta.");

  whatsappLinks.forEach((link) => {
    link.href = baseWhatsApp;
  });

  instagramLinks.forEach((link) => {
    link.href = config.instagramUrl;
  });
};

const fillProjectTypes = () => {
  if (!projectTypeSelect) {
    return;
  }

  projectTypeSelect.innerHTML = "";

  config.projectTypes.forEach((projectType, index) => {
    const option = document.createElement("option");
    option.value = projectType;
    option.textContent = projectType;

    if (index === 0) {
      option.selected = true;
    }

    projectTypeSelect.append(option);
  });
};

const imageExists = (src) =>
  new Promise((resolve) => {
    const image = new Image();

    image.onload = () => resolve(true);
    image.onerror = () => resolve(false);
    image.src = src;
  });

const resolveProjectImage = async (project) => {
  for (const candidate of project.imageCandidates) {
    // The first file that exists in assets wins over the fallback mockup.
    if (await imageExists(candidate)) {
      return candidate;
    }
  }

  return project.fallbackImage;
};

const renderPortfolio = async () => {
  if (!portfolioGrid) {
    return;
  }

  const resolvedProjects = await Promise.all(
    config.portfolio.map(async (project) => ({
      ...project,
      image: await resolveProjectImage(project)
    }))
  );

  portfolioGrid.innerHTML = resolvedProjects
    .map(
      (project) => `
        <article class="glass-card project-card ${project.featured ? "project-card-featured" : ""}">
          <figure class="project-media">
            <img src="${project.image}" alt="${project.name}" loading="lazy" decoding="async">
          </figure>
          <div class="project-content">
            <span class="project-badge">${project.badge}</span>
            <h3>${project.name}</h3>
            <p>${project.description}</p>
          </div>
        </article>
      `
    )
    .join("");
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
    "Hola CodeFlow Studio, quiero solicitar una propuesta.",
    "",
    `Nombre: ${data.name}`,
    `Negocio: ${data.business}`,
    `WhatsApp: ${data.whatsapp}`,
    `Instagram: ${data.instagram || "No especificado"}`,
    `Tipo de proyecto: ${data.projectType}`,
    "",
    "Mensaje:",
    data.message
  ].join("\n");

const handleContactSubmit = () => {
  if (!contactForm || !formFeedback) {
    return;
  }

  contactForm.addEventListener("submit", (event) => {
    event.preventDefault();

    if (!contactForm.reportValidity()) {
      formFeedback.textContent = "Completa los campos requeridos para preparar tu consulta correctamente.";
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

    inbox.addMessage(payload);

    if (config.whatsappNumber.trim()) {
      window.open(inbox.buildWhatsAppUrl(buildFormMessage(payload)), "_blank", "noopener,noreferrer");
      formFeedback.textContent = "Preparamos tu mensaje y abrimos WhatsApp para enviarlo directo. El panel privado local queda actualizado en este navegador.";
    } else {
      formFeedback.textContent = "Tu mensaje quedó guardado en el inbox local del sitio. Para recibirlo online en un inbox central en GitHub Pages, conecta un backend externo o configura WhatsApp.";
    }

    contactForm.reset();

    if (projectTypeSelect) {
      projectTypeSelect.selectedIndex = 0;
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

setHeaderState();
setSocialLinks();
fillProjectTypes();
setupRevealObserver();
handleContactSubmit();
renderPortfolio();

window.addEventListener("scroll", setHeaderState, { passive: true });
