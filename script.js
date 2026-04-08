const config = window.CodeFlowConfig;
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

const portfolioState = new Map();

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
    link.href = `${config.instagramUrl || "#"}`;
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

const normalizeText = (value) =>
  `${value || ""}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const encodeAssetPath = (path) => encodeURI(path).replaceAll("#", "%23");

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

const buildPortfolioProjects = () => {
  const imageAssets = assetsManifest.filter((assetPath) => /\.(png|jpe?g|webp)$/i.test(assetPath));

  return config.portfolioProjects
    .map((project) => {
      const matches = imageAssets
        .filter((assetPath) => {
          const normalizedPath = normalizeText(assetPath);
          return project.keywords.some((keyword) => normalizedPath.includes(normalizeText(keyword)));
        })
        .sort((left, right) => getProjectImageScore(left) - getProjectImageScore(right));

      return {
        ...project,
        images: matches.map((assetPath) => encodeAssetPath(assetPath))
      };
    })
    .filter((project) => project.images.length > 0);
};

const setSliderIndex = (sliderId, nextIndex) => {
  const slider = document.querySelector(`[data-portfolio-slider="${sliderId}"]`);

  if (!slider) {
    return;
  }

  const slides = [...slider.querySelectorAll(".project-slide")];
  const dots = [...slider.querySelectorAll(".project-dot")];
  const safeIndex = ((nextIndex % slides.length) + slides.length) % slides.length;
  const track = slider.querySelector(".project-track");

  portfolioState.set(sliderId, safeIndex);

  if (track) {
    track.style.transform = `translateX(-${safeIndex * 100}%)`;
  }

  slides.forEach((slide, index) => {
    slide.classList.toggle("is-active", index === safeIndex);
  });

  dots.forEach((dot, index) => {
    dot.classList.toggle("is-active", index === safeIndex);
    dot.setAttribute("aria-current", index === safeIndex ? "true" : "false");
  });
};

const renderPortfolio = () => {
  if (!portfolioGrid) {
    return;
  }

  const projects = buildPortfolioProjects();

  if (!projects.length) {
    portfolioGrid.innerHTML = `
      <article class="glass-card project-card">
        <div class="project-content">
          <span class="project-badge">Sin coincidencias</span>
          <h3>Portfolio pendiente de imágenes válidas</h3>
          <p>No se encontraron archivos en <code>assets</code> que coincidan con las reglas de nombres para BarberOdd o Gym Estudiantes TBÓ.</p>
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
                        <img src="${imagePath}" alt="${project.name} - vista ${index + 1}" loading="lazy" decoding="async">
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
                        <button class="project-arrow" type="button" aria-label="Vista anterior" data-slider-prev="${project.slug}">&#8592;</button>
                        <button class="project-arrow" type="button" aria-label="Vista siguiente" data-slider-next="${project.slug}">&#8594;</button>
                      </div>
                      <div class="project-dots">
                        ${project.images
                          .map(
                            (_, index) => `
                              <button class="project-dot ${index === 0 ? "is-active" : ""}" type="button" aria-label="Ir a la vista ${index + 1}" aria-current="${index === 0 ? "true" : "false"}" data-slider-dot="${project.slug}" data-slide-index="${index}"></button>
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
              <span class="project-count">${project.images.length} ${project.images.length === 1 ? "imagen" : "imágenes"}</span>
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

  contactForm.addEventListener("submit", async (event) => {
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

    try {
      await inbox.submitMessage(payload);

      if (`${config.whatsappNumber || ""}`.trim()) {
        window.open(inbox.buildWhatsAppUrl(buildFormMessage(payload)), "_blank", "noopener,noreferrer");
        formFeedback.textContent =
          inbox.storageMode === "api"
            ? "Guardamos tu mensaje en el backend y abrimos WhatsApp para continuar la conversación."
            : "Preparamos tu mensaje y abrimos WhatsApp para enviarlo directo. El panel privado local queda actualizado en este navegador.";
      } else {
        formFeedback.textContent =
          inbox.storageMode === "api"
            ? "Tu mensaje fue enviado correctamente al panel privado conectado al backend."
            : "Tu mensaje quedó guardado en el inbox local del sitio. Configura la API para centralizar mensajes entre dispositivos.";
      }

      contactForm.reset();

      if (projectTypeSelect) {
        projectTypeSelect.selectedIndex = 0;
      }
    } catch (error) {
      formFeedback.textContent = error.message || "No pudimos enviar tu mensaje en este momento.";
      return;
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

setHeaderState();
setSocialLinks();
fillProjectTypes();
setupRevealObserver();
handleContactSubmit();
renderPortfolio();

window.addEventListener("scroll", setHeaderState, { passive: true });
