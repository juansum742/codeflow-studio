// Set the official company number in international format to route messages to the real business chat.
const contactConfig = {
  whatsappNumber: ""
};

const header = document.querySelector(".site-header");
const navToggle = document.querySelector(".nav-toggle");
const mobileLinks = document.querySelectorAll(".mobile-menu a");
const revealElements = document.querySelectorAll(".reveal");
const whatsappLink = document.querySelector("[data-whatsapp-link]");
const contactNote = document.querySelector("[data-contact-note]");
const contactForm = document.querySelector("[data-contact-form]");
const formFeedback = document.querySelector("[data-form-feedback]");

const buildWhatsAppUrl = (message) => {
  const phone = contactConfig.whatsappNumber.replace(/\D/g, "");

  if (phone) {
    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  }

  return `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
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

if (revealElements.length) {
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
}

setHeaderState();
window.addEventListener("scroll", setHeaderState, { passive: true });

if (whatsappLink) {
  whatsappLink.href = buildWhatsAppUrl("Hola CodeFlow Studio, quiero solicitar un presupuesto.");
}

if (contactNote) {
  contactNote.textContent = contactConfig.whatsappNumber
    ? "Al hacer clic abrimos el chat directo de WhatsApp con CodeFlow Studio."
    : "Al hacer clic abrimos WhatsApp con un mensaje inicial para agilizar el primer contacto.";
}

if (contactForm && formFeedback) {
  contactForm.addEventListener("submit", (event) => {
    event.preventDefault();

    if (!contactForm.reportValidity()) {
      formFeedback.textContent = "Completa los campos requeridos para preparar tu mensaje.";
      return;
    }

    const formData = new FormData(contactForm);
    const nombre = `${formData.get("nombre") || ""}`.trim();
    const negocio = `${formData.get("negocio") || ""}`.trim();
    const whatsapp = `${formData.get("whatsapp") || ""}`.trim();
    const proyecto = `${formData.get("proyecto") || ""}`.trim();

    const message = [
      "Hola CodeFlow Studio, quiero solicitar un presupuesto.",
      "",
      `Nombre: ${nombre}`,
      `Negocio: ${negocio}`,
      `WhatsApp: ${whatsapp}`,
      "",
      "Proyecto:",
      proyecto
    ].join("\n");

    window.open(buildWhatsAppUrl(message), "_blank", "noopener,noreferrer");
    formFeedback.textContent = "Abrimos WhatsApp con tu consulta para que puedas enviarla en un clic.";
    contactForm.reset();
  });
}
