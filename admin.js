const inbox = window.CodeFlowInbox;

const loginShell = document.querySelector("[data-login-shell]");
const dashboardShell = document.querySelector("[data-dashboard-shell]");
const loginForm = document.querySelector("[data-login-form]");
const loginFeedback = document.querySelector("[data-login-feedback]");
const logoutButton = document.querySelector("[data-logout-button]");
const messagesList = document.querySelector("[data-messages-list]");
const searchInput = document.querySelector("[data-search-input]");
const filterButtons = document.querySelectorAll("[data-filter-button]");
const storageMode = document.querySelector("[data-storage-mode]");
const statTotal = document.querySelector("[data-stat-total]");
const statUnread = document.querySelector("[data-stat-unread]");
const statRead = document.querySelector("[data-stat-read]");
const dashboardFeedback = document.querySelector("[data-dashboard-feedback]");

const state = {
  filter: "all",
  query: "",
  messages: []
};

let feedbackTimeoutId = 0;

const normalizeInstagramUrl = (value) => {
  const input = `${value || ""}`.trim();

  if (!input) {
    return "";
  }

  if (input.startsWith("http://") || input.startsWith("https://")) {
    return input;
  }

  return `https://instagram.com/${input.replace(/^@/, "")}`;
};

const escapeHtml = (value) =>
  `${value || ""}`
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const setAuthenticatedState = (isAuthenticated) => {
  loginShell?.classList.toggle("is-hidden", isAuthenticated);
  dashboardShell?.classList.toggle("is-hidden", !isAuthenticated);
};

const setDashboardFeedback = (text = "", tone = "") => {
  if (!dashboardFeedback) {
    return;
  }

  window.clearTimeout(feedbackTimeoutId);
  dashboardFeedback.textContent = text;
  dashboardFeedback.classList.toggle("is-success", tone === "success");
  dashboardFeedback.classList.toggle("is-error", tone === "error");

  if (text && tone !== "error") {
    feedbackTimeoutId = window.setTimeout(() => {
      dashboardFeedback.textContent = "";
      dashboardFeedback.classList.remove("is-success", "is-error");
    }, 2400);
  }
};

const updateStats = (messages) => {
  const stats = inbox.getStats(messages);

  if (statTotal) {
    statTotal.textContent = String(stats.total);
  }

  if (statUnread) {
    statUnread.textContent = String(stats.unread);
  }

  if (statRead) {
    statRead.textContent = String(stats.read);
  }
};

const getFilteredMessages = () => {
  const query = state.query.toLowerCase();

  return state.messages.filter((message) => {
    if (state.filter === "unread" && message.read) {
      return false;
    }

    if (state.filter === "read" && !message.read) {
      return false;
    }

    if (!query) {
      return true;
    }

    return [message.name, message.business, message.projectType, message.message]
      .join(" ")
      .toLowerCase()
      .includes(query);
  });
};

const renderEmptyState = (text) => {
  if (!messagesList) {
    return;
  }

  messagesList.innerHTML = `<div class="empty-state">${text}</div>`;
};

const renderMessages = () => {
  if (!messagesList) {
    return;
  }

  updateStats(state.messages);

  const messages = getFilteredMessages();

  if (!messages.length) {
    renderEmptyState("No hay mensajes para mostrar con el filtro actual.");
    return;
  }

  messagesList.innerHTML = messages
    .map((message) => {
      const replyDraft = escapeHtml(message.replyDraft || "");
      const instagramUrl = normalizeInstagramUrl(message.instagram);

      return `
        <article class="message-card ${message.read ? "" : "is-unread"}" data-message-id="${message.id}">
          <div class="message-top">
            <div class="message-head">
              <h2>${escapeHtml(message.name)}</h2>
              <div class="message-meta">
                <span>${escapeHtml(message.business)}</span>
                <span>${escapeHtml(message.projectType)}</span>
                <span>${message.read ? "Leído" : "No leído"}</span>
              </div>
            </div>
            <span class="message-date">${escapeHtml(inbox.formatDate(message.createdAt))}</span>
          </div>

          <div class="message-links">
            <a href="${escapeHtml(inbox.buildWhatsAppUrl(inbox.buildReplyText(message), message.whatsapp))}" target="_blank" rel="noreferrer">WhatsApp: ${escapeHtml(message.whatsapp)}</a>
            ${instagramUrl ? `<a href="${escapeHtml(instagramUrl)}" target="_blank" rel="noreferrer">Instagram: ${escapeHtml(message.instagram)}</a>` : ""}
          </div>

          <p class="message-body">${escapeHtml(message.message)}</p>

          <div class="message-actions">
            <button class="action-button" type="button" data-mark-read="${message.id}">${message.read ? "Marcar no leído" : "Marcar leído"}</button>
            <button class="action-button" type="button" data-delete-message="${message.id}">Eliminar</button>
          </div>

          <form class="reply-form" data-reply-form="${message.id}">
            <textarea name="replyDraft" placeholder="Escribe una respuesta manual para copiarla o abrirla en WhatsApp.">${replyDraft}</textarea>
            <div class="reply-actions">
              <button class="action-button" type="submit">Guardar respuesta</button>
              <button class="action-button" type="button" data-copy-reply="${message.id}">Copiar</button>
              <a class="action-button" href="${escapeHtml(inbox.buildWhatsAppUrl(inbox.buildReplyText(message), message.whatsapp))}" target="_blank" rel="noreferrer">Responder por WhatsApp</a>
            </div>
          </form>
        </article>
      `;
    })
    .join("");
};

const setActiveFilterButton = () => {
  filterButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.filter === state.filter);
  });
};

const loadMessages = async () => {
  try {
    state.messages = await inbox.getMessages();
    renderMessages();
  } catch (error) {
    if (`${error.message || ""}`.toLowerCase().includes("sesion")) {
      inbox.logoutAdmin();
      setAuthenticatedState(false);
      loginFeedback.textContent = "La sesión del panel expiró. Vuelve a iniciar sesión.";
      renderEmptyState("La sesión del panel expiró. Vuelve a iniciar sesión.");
      setDashboardFeedback("La sesión del panel expiró. Vuelve a iniciar sesión.", "error");
      return;
    }

    setDashboardFeedback(error.message || "No pudimos cargar los mensajes.", "error");
    renderEmptyState(error.message || "No pudimos cargar los mensajes.");
  }
};

const attachDashboardEvents = () => {
  if (!messagesList) {
    return;
  }

  messagesList.addEventListener("click", async (event) => {
    const markReadButton = event.target.closest("[data-mark-read]");
    const deleteButton = event.target.closest("[data-delete-message]");
    const copyButton = event.target.closest("[data-copy-reply]");

    if (markReadButton) {
      const messageId = markReadButton.dataset.markRead;
      const message = state.messages.find((item) => item.id === messageId);

      if (message) {
        try {
          await inbox.setRead(messageId, !message.read);
          await loadMessages();
          setDashboardFeedback(message.read ? "Mensaje marcado como no leído." : "Mensaje marcado como leído.", "success");
        } catch (error) {
          setDashboardFeedback(error.message || "No pudimos actualizar el mensaje.", "error");
        }
      }

      return;
    }

    if (deleteButton) {
      const messageId = deleteButton.dataset.deleteMessage;

      if (!window.confirm("¿Quieres eliminar este mensaje del panel?")) {
        return;
      }

      try {
        await inbox.deleteMessage(messageId);
        await loadMessages();
        setDashboardFeedback("Mensaje eliminado del panel.", "success");
      } catch (error) {
        setDashboardFeedback(error.message || "No pudimos eliminar el mensaje.", "error");
      }

      return;
    }

    if (copyButton) {
      const messageId = copyButton.dataset.copyReply;
      const message = state.messages.find((item) => item.id === messageId);

      if (message) {
        try {
          await navigator.clipboard.writeText(inbox.buildReplyText(message));
          copyButton.textContent = "Copiado";
          setDashboardFeedback("Respuesta copiada para compartir.", "success");
          setTimeout(() => {
            copyButton.textContent = "Copiar";
          }, 1200);
        } catch {
          copyButton.textContent = "No disponible";
          setDashboardFeedback("No pudimos copiar el texto en este navegador.", "error");
        }
      }
    }
  });

  messagesList.addEventListener("submit", async (event) => {
    const replyForm = event.target.closest("[data-reply-form]");

    if (!replyForm) {
      return;
    }

    event.preventDefault();

    const messageId = replyForm.dataset.replyForm;
    const draft = new FormData(replyForm).get("replyDraft");

    try {
      await inbox.setReplyDraft(messageId, `${draft || ""}`);
      await loadMessages();
      setDashboardFeedback("Respuesta guardada en el panel.", "success");
    } catch (error) {
      setDashboardFeedback(error.message || "No pudimos guardar la respuesta.", "error");
    }
  });
};

if (storageMode) {
  storageMode.textContent =
    inbox.storageMode === "api"
      ? "Modo API Cloudflare"
      : "Modo navegador local";
}

if (loginForm && loginFeedback) {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!loginForm.reportValidity()) {
      loginFeedback.textContent = "Ingresa la contraseña para acceder al panel.";
      return;
    }

    const password = `${new FormData(loginForm).get("password") || ""}`;

    try {
      const success = await inbox.loginAdmin(password);

      if (!success) {
        loginFeedback.textContent = "La contraseña no es correcta.";
        return;
      }

      loginFeedback.textContent = "";
      setAuthenticatedState(true);
      await loadMessages();
    } catch (error) {
      loginFeedback.textContent = error.message || "No pudimos iniciar sesión en este momento.";
    }
  });
}

logoutButton?.addEventListener("click", () => {
  inbox.logoutAdmin();
  setAuthenticatedState(false);
});

searchInput?.addEventListener("input", () => {
  state.query = searchInput.value.trim();
  renderMessages();
});

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    state.filter = button.dataset.filter;
    setActiveFilterButton();
    renderMessages();
  });
});

setActiveFilterButton();
setAuthenticatedState(inbox.isAdminAuthenticated());
attachDashboardEvents();

if (inbox.isAdminAuthenticated()) {
  loadMessages();
}
