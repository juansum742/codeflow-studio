const config = window.CodeFlowConfig;
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

const state = {
  filter: "all",
  query: ""
};

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

const updateStats = () => {
  const stats = inbox.getStats();

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

  return inbox.getMessages().filter((message) => {
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

  const messages = getFilteredMessages();

  updateStats();

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
      const message = inbox.getMessages().find((item) => item.id === messageId);

      if (message) {
        inbox.setRead(messageId, !message.read);
        renderMessages();
      }
    }

    if (deleteButton) {
      const messageId = deleteButton.dataset.deleteMessage;
      inbox.deleteMessage(messageId);
      renderMessages();
    }

    if (copyButton) {
      const messageId = copyButton.dataset.copyReply;
      const message = inbox.getMessages().find((item) => item.id === messageId);

      if (message) {
        try {
          await navigator.clipboard.writeText(inbox.buildReplyText(message));
          copyButton.textContent = "Copiado";
          setTimeout(() => {
            copyButton.textContent = "Copiar";
          }, 1200);
        } catch {
          copyButton.textContent = "No disponible";
        }
      }
    }
  });

  messagesList.addEventListener("submit", (event) => {
    const replyForm = event.target.closest("[data-reply-form]");

    if (!replyForm) {
      return;
    }

    event.preventDefault();

    const messageId = replyForm.dataset.replyForm;
    const draft = new FormData(replyForm).get("replyDraft");

    inbox.setReplyDraft(messageId, `${draft || ""}`);
    renderMessages();
  });
};

if (storageMode) {
  storageMode.textContent = `Modo ${config.storageMode === "browser" ? "navegador" : config.storageMode}`;
}

if (loginForm && loginFeedback) {
  loginForm.addEventListener("submit", (event) => {
    event.preventDefault();

    if (!loginForm.reportValidity()) {
      loginFeedback.textContent = "Ingresa la contraseña para acceder al panel.";
      return;
    }

    const password = `${new FormData(loginForm).get("password") || ""}`;

    if (!inbox.loginAdmin(password)) {
      loginFeedback.textContent = "La contraseña no es correcta.";
      return;
    }

    loginFeedback.textContent = "";
    setAuthenticatedState(true);
    renderMessages();
  });
}

logoutButton?.addEventListener("click", () => {
  inbox.logoutAdmin();
  setAuthenticatedState(false);
});

searchInput?.addEventListener("input", (event) => {
  state.query = event.target.value.trim();
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
  renderMessages();
}
