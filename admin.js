const inbox = window.CodeFlowInbox;
const config = window.CodeFlowConfig || {};

const loginShell = document.querySelector("[data-login-shell]");
const dashboardShell = document.querySelector("[data-dashboard-shell]");
const loginForm = document.querySelector("[data-login-form]");
const loginFeedback = document.querySelector("[data-login-feedback]");
const logoutButton = document.querySelector("[data-logout-button]");
const messagesList = document.querySelector("[data-messages-list]");
const searchInput = document.querySelector("[data-search-input]");
const statusFilter = document.querySelector("[data-status-filter]");
const projectFilter = document.querySelector("[data-project-filter]");
const dateFromInput = document.querySelector("[data-date-from]");
const dateToInput = document.querySelector("[data-date-to]");
const storageMode = document.querySelector("[data-storage-mode]");
const statNew = document.querySelector("[data-stat-new]");
const statTotal = document.querySelector("[data-stat-total]");
const statNegotiation = document.querySelector("[data-stat-negotiation]");
const statClosed = document.querySelector("[data-stat-closed]");
const statCloseRate = document.querySelector("[data-stat-close-rate]");
const dashboardFeedback = document.querySelector("[data-dashboard-feedback]");
const resultsSummary = document.querySelector("[data-results-summary]");
const exportButton = document.querySelector("[data-export-button]");
const notificationPills = document.querySelector("[data-notification-pills]");
const drawer = document.querySelector("[data-lead-drawer]");
const drawerBackdrop = document.querySelector("[data-drawer-backdrop]");
const drawerContent = document.querySelector("[data-drawer-content]");
const drawerCloseButton = document.querySelector("[data-drawer-close]");
const refreshButton = document.querySelector("[data-refresh-button]");
const refreshLabel = document.querySelector("[data-refresh-label]");
const newBadge = document.querySelector("[data-new-badge]");
const adminToast = document.querySelector("[data-admin-toast]");

const DEFAULT_LEAD_STATUSES = inbox.leadStatuses || ["Nuevo", "Leído", "Respondido", "En negociación", "Cliente cerrado", "Archivado"];
const EMPTY_META = {
  leadStatuses: DEFAULT_LEAD_STATUSES,
  notificationChannels: {
    webhook: false,
    whatsappWebhook: false,
    email: false
  }
};
const DEFAULT_NEXT_STEPS = Array.isArray(config.leadNextSteps) && config.leadNextSteps.length
  ? config.leadNextSteps
  : ["Llamar", "Enviar demo", "Mandar presupuesto", "Agendar reunion", "Seguimiento"];
const POLL_INTERVAL_MS = 8000;

const state = {
  query: "",
  status: "all",
  projectType: "all",
  dateFrom: "",
  dateTo: "",
  messages: [],
  meta: EMPTY_META,
  selectedLeadId: "",
  selectedLead: null,
  selectedHistory: [],
  freshLeadIds: []
};

let feedbackTimeoutId = 0;
let toastTimeoutId = 0;
let freshLeadTimeoutId = 0;
let refreshIntervalId = 0;
let isRefreshing = false;
let hasLoadedOnce = false;

const setRefreshState = (isLoading, label = "Recargar mensajes") => {
  if (refreshButton) {
    refreshButton.classList.toggle("is-loading", isLoading);
    refreshButton.disabled = isLoading;
  }

  if (refreshLabel) {
    refreshLabel.textContent = label;
  }

  messagesList?.setAttribute("aria-busy", String(isLoading));
};

const showToast = (text = "", tone = "success") => {
  if (!adminToast) {
    return;
  }

  window.clearTimeout(toastTimeoutId);
  adminToast.textContent = text;
  adminToast.classList.remove("is-hidden");
  adminToast.classList.add("is-visible");
  adminToast.classList.toggle("is-success", tone === "success");
  adminToast.classList.toggle("is-error", tone === "error");

  toastTimeoutId = window.setTimeout(() => {
    adminToast.classList.remove("is-visible", "is-success", "is-error");
    adminToast.classList.add("is-hidden");
    adminToast.textContent = "";
  }, 2600);
};

const updateNewBadge = (count) => {
  if (!newBadge) {
    return;
  }

  const total = Number(count) || 0;
  newBadge.classList.toggle("is-empty", total === 0);
  newBadge.textContent = total === 0 ? "Sin nuevos" : `${total} ${total === 1 ? "nuevo" : "nuevos"}`;
};

const setFreshLeadIds = (ids = []) => {
  window.clearTimeout(freshLeadTimeoutId);
  state.freshLeadIds = ids;

  if (!ids.length) {
    return;
  }

  freshLeadTimeoutId = window.setTimeout(() => {
    state.freshLeadIds = [];
    renderMessages();
  }, 6000);
};

const stopAutoRefresh = () => {
  window.clearInterval(refreshIntervalId);
  refreshIntervalId = 0;
};

const startAutoRefresh = () => {
  stopAutoRefresh();
  refreshIntervalId = window.setInterval(() => {
    if (!inbox.isAdminAuthenticated() || document.hidden) {
      return;
    }

    loadDashboardData({ silent: true, source: "poll" });
  }, POLL_INTERVAL_MS);
};

const getLeadStatuses = () => {
  const statuses = state.meta?.leadStatuses;
  return Array.isArray(statuses) && statuses.length ? statuses : DEFAULT_LEAD_STATUSES;
};

const getNextStepOptions = (selectedValue = "") => {
  const options = new Set(["", ...DEFAULT_NEXT_STEPS, `${selectedValue || ""}`.trim()]);
  return [...options]
    .map((option) => option.trim())
    .filter((option, index, array) => array.indexOf(option) === index)
    .map(
      (option) =>
        `<option value="${escapeHtml(option)}" ${option === `${selectedValue || ""}`.trim() ? "selected" : ""}>${escapeHtml(option || "Sin definir")}</option>`
    )
    .join("");
};

const normalizeComparableText = (value) =>
  `${value || ""}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

const escapeHtml = (value) =>
  `${value || ""}`
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

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

const toStatusClassName = (status) => normalizeComparableText(status).replace(/\s+/g, "-");

const getStatusLabel = (status) => {
  switch (status) {
    case "Cliente cerrado":
      return "Cerrado";
    case "En negociación":
      return "Negociación";
    default:
      return status;
  }
};

const getQuickStatusActions = (status) => {
  switch (status) {
    case "Nuevo":
      return ["Leído", "Respondido", "En negociación"];
    case "Leído":
      return ["Respondido", "En negociación", "Archivado"];
    case "Respondido":
      return ["En negociación", "Cliente cerrado", "Archivado"];
    case "En negociación":
      return ["Cliente cerrado", "Archivado"];
    case "Cliente cerrado":
      return ["Archivado"];
    case "Archivado":
      return ["Nuevo"];
    default:
      return ["Leído", "Respondido", "En negociación"];
  }
};

const buildStatusBadge = (status) =>
  `<span class="status-badge status-badge--${toStatusClassName(status)}">${escapeHtml(status)}</span>`;

const setAuthenticatedState = (isAuthenticated) => {
  loginShell?.classList.toggle("is-hidden", isAuthenticated);
  dashboardShell?.classList.toggle("is-hidden", !isAuthenticated);
};

const setDrawerOpen = (isOpen) => {
  drawer?.classList.toggle("is-hidden", !isOpen);
  drawerBackdrop?.classList.toggle("is-hidden", !isOpen);
  drawer?.setAttribute("aria-hidden", String(!isOpen));
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
    }, 2800);
  }
};

const handleSessionError = (error) => {
  if (!`${error.message || ""}`.toLowerCase().includes("sesion")) {
    return false;
  }

  stopAutoRefresh();
  inbox.logoutAdmin();
  closeDrawer();
  setAuthenticatedState(false);
  loginFeedback.textContent = "La sesión expiró. Vuelve a iniciar sesión.";
  setDashboardFeedback("La sesión del panel expiró. Vuelve a iniciar sesión.", "error");
  return true;
};

const updateStats = (messages) => {
  const stats = inbox.getStats(messages);

  if (statNew) {
    statNew.textContent = String(stats.newLeads);
  }

  if (statTotal) {
    statTotal.textContent = String(stats.total);
  }

  if (statNegotiation) {
    statNegotiation.textContent = String(stats.negotiation);
  }

  if (statClosed) {
    statClosed.textContent = String(stats.closed);
  }

  if (statCloseRate) {
    statCloseRate.textContent = `${stats.closeRate}%`;
  }

  updateNewBadge(stats.newLeads);
};

const populateStatusFilter = () => {
  if (!statusFilter) {
    return;
  }

  const statuses = getLeadStatuses();

  statusFilter.innerHTML = [
    `<option value="all">Todos los estados</option>`,
    ...statuses.map((status) => `<option value="${escapeHtml(status)}">${escapeHtml(status)}</option>`)
  ].join("");

  const availableValues = new Set(["all", ...statuses]);
  statusFilter.value = availableValues.has(state.status) ? state.status : "all";

  if (statusFilter.value !== state.status) {
    state.status = statusFilter.value;
  }
};

const populateProjectFilter = () => {
  if (!projectFilter) {
    return;
  }

  const projectTypes = new Set([...(config.projectTypes || []), ...state.messages.map((message) => message.projectType)]);
  const options = [
    `<option value="all">Todos los proyectos</option>`,
    ...[...projectTypes].filter(Boolean).map((projectType) => `<option value="${escapeHtml(projectType)}">${escapeHtml(projectType)}</option>`)
  ];

  projectFilter.innerHTML = options.join("");
  projectFilter.value = [...projectTypes].includes(state.projectType) ? state.projectType : "all";

  if (projectFilter.value !== state.projectType) {
    state.projectType = projectFilter.value;
  }
};

const renderNotificationPills = () => {
  if (!notificationPills) {
    return;
  }

  const channels = state.meta.notificationChannels || EMPTY_META.notificationChannels;
  const pills = [
    {
      enabled: channels.whatsappWebhook,
      label: channels.whatsappWebhook ? "WhatsApp automatico activo" : "WhatsApp automatico listo"
    },
    {
      enabled: channels.email,
      label: channels.email ? "Email automatico activo" : "Email automatico listo"
    },
    {
      enabled: channels.webhook,
      label: channels.webhook ? "Webhook comercial activo" : "Webhook comercial listo"
    }
  ];

  notificationPills.innerHTML = pills
    .map(
      (pill) =>
        `<span class="notification-pill ${pill.enabled ? "is-enabled" : ""}">${escapeHtml(pill.label)}</span>`
    )
    .join("");
};

const parseFilterDate = (value, endOfDay = false) => {
  if (!value) {
    return null;
  }

  const date = new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getFilteredMessages = () => {
  const query = normalizeComparableText(state.query);
  const dateFrom = parseFilterDate(state.dateFrom);
  const dateTo = parseFilterDate(state.dateTo, true);

  return state.messages.filter((message) => {
    if (state.status !== "all" && message.status !== state.status) {
      return false;
    }

    if (state.projectType !== "all" && message.projectType !== state.projectType) {
      return false;
    }

    if (query) {
      const haystack = normalizeComparableText(
        [message.name, message.business, message.whatsapp, message.projectType, message.instagram].join(" ")
      );

      if (!haystack.includes(query)) {
        return false;
      }
    }

    const createdAt = new Date(message.createdAt);

    if (dateFrom && createdAt < dateFrom) {
      return false;
    }

    if (dateTo && createdAt > dateTo) {
      return false;
    }

    return true;
  });
};

const renderResultsSummary = (filteredMessages) => {
  if (!resultsSummary) {
    return;
  }

  const total = state.messages.length;
  const filtered = filteredMessages.length;
  resultsSummary.textContent = `Mostrando ${filtered} de ${total} leads`;
};

const renderEmptyState = (text) => {
  if (!messagesList) {
    return;
  }

  messagesList.innerHTML = `<div class="empty-state">${text}</div>`;
};

const buildQuickActions = (message) => {
  const statusButtons = getQuickStatusActions(message.status)
    .filter((status) => status !== message.status)
    .map(
      (status) =>
        `<button class="action-button" type="button" data-quick-status="${escapeHtml(status)}" data-message-id="${escapeHtml(message.id)}">${escapeHtml(getStatusLabel(status))}</button>`
    )
    .join("");

  return `
    <button class="action-button" type="button" data-open-detail="${escapeHtml(message.id)}">Ver</button>
    ${statusButtons}
    <button class="action-button is-danger" type="button" data-delete-message="${escapeHtml(message.id)}">Eliminar</button>
  `;
};

const renderMessages = () => {
  if (!messagesList) {
    return;
  }

  updateStats(state.messages);
  renderNotificationPills();

  const filteredMessages = getFilteredMessages();
  renderResultsSummary(filteredMessages);

  if (!filteredMessages.length) {
    renderEmptyState("No hay leads para mostrar con los filtros actuales.");
    return;
  }

  messagesList.innerHTML = filteredMessages
    .map((message) => {
      const instagramUrl = normalizeInstagramUrl(message.instagram);
      const instagramText = message.instagram ? `Instagram: ${message.instagram}` : "Instagram no especificado";
      const nextStep = `${message.nextStep || ""}`.trim();
      const isFresh = state.freshLeadIds.includes(message.id);

      return `
        <article class="lead-row ${message.status === "Nuevo" ? "is-new" : ""} ${state.selectedLeadId === message.id ? "is-active" : ""} ${isFresh ? "is-fresh" : ""}" data-open-detail="${escapeHtml(message.id)}" tabindex="0">
          <div class="lead-main">
            <div class="lead-cell lead-cell-primary">
              <span class="lead-name">${escapeHtml(message.name)}</span>
              <span class="lead-business">${escapeHtml(message.business)}</span>
            </div>

            <div class="lead-cell">
              <div class="lead-project">${escapeHtml(message.projectType)}</div>
              <div class="lead-secondary">${escapeHtml(message.message.slice(0, 72))}${message.message.length > 72 ? "..." : ""}</div>
              ${nextStep ? `<div class="lead-follow-up">Proximo paso: ${escapeHtml(nextStep)}</div>` : ""}
            </div>

            <div class="lead-cell lead-contact">
              <span class="lead-contact-link">${escapeHtml(message.whatsapp)}</span>
              <span class="lead-secondary">${instagramUrl ? escapeHtml(instagramText) : "Sin Instagram"}</span>
            </div>

            <div class="lead-cell">
              ${buildStatusBadge(message.status)}
            </div>

            <div class="lead-cell lead-date">${escapeHtml(inbox.formatDate(message.createdAt))}</div>

            <div class="lead-cell lead-actions">
              ${buildQuickActions(message)}
            </div>
          </div>
        </article>
      `;
    })
    .join("");
};

const renderDrawer = () => {
  if (!drawerContent) {
    return;
  }

  if (!state.selectedLeadId) {
    setDrawerOpen(false);
    drawerContent.innerHTML = "";
    return;
  }

  setDrawerOpen(true);

  if (!state.selectedLead) {
    drawerContent.innerHTML = `<div class="empty-state">Cargando lead...</div>`;
    return;
  }

  const lead = state.selectedLead;
  const history = state.selectedHistory.length ? state.selectedHistory : lead.statusHistory || [];
  const instagramUrl = normalizeInstagramUrl(lead.instagram);
  const whatsappReplyUrl = inbox.buildWhatsAppUrl(inbox.buildReplyText(lead), lead.whatsapp);
  const leadStatuses = getLeadStatuses();
  const nextStepOptions = getNextStepOptions(lead.nextStep);

  drawerContent.innerHTML = `
    <section class="drawer-header">
      <div class="drawer-title">
        <p class="eyebrow">Detalle del lead</p>
        <h2>${escapeHtml(lead.name)}</h2>
        <span class="drawer-subtitle">${escapeHtml(lead.business)}</span>
      </div>
      ${buildStatusBadge(lead.status)}
    </section>

    <section class="drawer-meta-grid">
      <article class="meta-card">
        <span>Tipo de proyecto</span>
        <strong>${escapeHtml(lead.projectType)}</strong>
      </article>
      <article class="meta-card">
        <span>Fecha</span>
        <strong>${escapeHtml(inbox.formatDate(lead.createdAt))}</strong>
      </article>
      <article class="meta-card">
        <span>WhatsApp</span>
        <strong><a href="${escapeHtml(inbox.buildWhatsAppUrl("", lead.whatsapp))}" target="_blank" rel="noreferrer">${escapeHtml(lead.whatsapp)}</a></strong>
      </article>
      <article class="meta-card">
        <span>Instagram</span>
        <strong>${instagramUrl ? `<a href="${escapeHtml(instagramUrl)}" target="_blank" rel="noreferrer">${escapeHtml(lead.instagram)}</a>` : "No especificado"}</strong>
      </article>
      <article class="meta-card">
        <span>Proximo paso</span>
        <strong>${escapeHtml(lead.nextStep || "Sin definir")}</strong>
      </article>
    </section>

    <form class="reply-panel planning-panel" data-lead-details-form="${escapeHtml(lead.id)}">
      <span class="section-label">Seguimiento comercial</span>
      <label class="field">
        <span>Proximo paso</span>
        <select name="nextStep">
          ${nextStepOptions}
        </select>
      </label>
      <label class="field">
        <span>Notas internas</span>
        <textarea name="internalNotes" placeholder="Ej: presupuesto enviado, reunion pendiente, cliente frio, seguimiento de cierre.">${escapeHtml(lead.internalNotes || "")}</textarea>
      </label>
      <div class="reply-tools reply-tools-compact">
        <button class="action-button" type="submit">Guardar seguimiento</button>
      </div>
    </form>

    <section class="drawer-section">
      <span class="section-label">Mensaje completo</span>
      <p class="drawer-message">${escapeHtml(lead.message)}</p>
    </section>

    <section class="drawer-section">
      <span class="section-label">Acciones rápidas</span>
      <div class="status-action-grid">
        ${leadStatuses.map(
          (status) => `
            <button class="status-action ${lead.status === status ? "is-current" : ""}" type="button" data-drawer-status="${escapeHtml(status)}" data-message-id="${escapeHtml(lead.id)}">
              ${escapeHtml(getStatusLabel(status))}
            </button>
          `
        ).join("")}
        <button class="status-action is-danger" type="button" data-delete-message="${escapeHtml(lead.id)}">Eliminar lead</button>
      </div>
    </section>

    <form class="reply-panel" data-reply-form="${escapeHtml(lead.id)}">
      <span class="section-label">Respuesta manual</span>
      <textarea name="replyDraft" placeholder="Escribe aquí la respuesta manual o el guion comercial.">${escapeHtml(lead.replyDraft || "")}</textarea>
      <div class="reply-tools">
        <button class="action-button" type="submit">Guardar respuesta</button>
        <button class="action-button" type="button" data-copy-reply="${escapeHtml(lead.id)}">Copiar</button>
        <a class="action-button" href="${escapeHtml(whatsappReplyUrl)}" target="_blank" rel="noreferrer">Responder por WhatsApp</a>
      </div>
    </form>

    <section class="drawer-section">
      <span class="section-label">Historial de estado</span>
      <div class="timeline">
        ${history
          .map(
            (entry) => `
              <article class="timeline-item">
                <span class="timeline-dot" aria-hidden="true"></span>
                <div class="timeline-body">
                  <div class="timeline-title">
                    ${buildStatusBadge(entry.toStatus)}
                    <span class="timeline-date">${escapeHtml(inbox.formatDate(entry.changedAt))}</span>
                  </div>
                  <div class="timeline-text">${entry.fromStatus ? `De ${escapeHtml(entry.fromStatus)} a ${escapeHtml(entry.toStatus)}` : `Estado inicial: ${escapeHtml(entry.toStatus)}`}</div>
                  ${entry.note ? `<div class="timeline-note">${escapeHtml(entry.note)}</div>` : ""}
                </div>
              </article>
            `
          )
          .join("")}
      </div>
    </section>
  `;
};

const closeDrawer = () => {
  state.selectedLeadId = "";
  state.selectedLead = null;
  state.selectedHistory = [];
  renderMessages();
  renderDrawer();
};

const openLead = async (messageId) => {
  state.selectedLeadId = messageId;
  const preview = state.messages.find((message) => message.id === messageId) || null;
  state.selectedLead = preview;
  state.selectedHistory = preview?.statusHistory || [];
  renderMessages();
  renderDrawer();

  try {
    const detail = await inbox.getMessageDetail(messageId);

    if (state.selectedLeadId !== messageId) {
      return;
    }

    state.selectedLead = detail.message;
    state.selectedHistory = detail.history || detail.message.statusHistory || [];
    renderMessages();
    renderDrawer();
  } catch (error) {
    if (!handleSessionError(error)) {
      setDashboardFeedback(error.message || "No pudimos cargar el detalle del lead.", "error");
    }
  }
};

const syncSelectedLead = () => {
  if (!state.selectedLeadId) {
    return;
  }

  const summary = state.messages.find((message) => message.id === state.selectedLeadId);

  if (!summary) {
    closeDrawer();
    return;
  }

  if (!state.selectedLead) {
    state.selectedLead = summary;
  } else {
    state.selectedLead = {
      ...state.selectedLead,
      ...summary
    };
  }

  if (!state.selectedHistory.length) {
    state.selectedHistory = summary.statusHistory || [];
  }
};

const loadDashboardData = async ({ silent = false, source = "manual" } = {}) => {
  if (isRefreshing) {
    return;
  }

  isRefreshing = true;
  setRefreshState(true, source === "manual" ? "Actualizando..." : "Sincronizando...");

  try {
    const previousIds = new Set(state.messages.map((message) => message.id));
    const [messages, meta] = await Promise.all([
      inbox.getMessages(),
      inbox.getAdminMeta().catch(() => EMPTY_META)
    ]);
    const incomingLeadIds = hasLoadedOnce
      ? messages.filter((message) => !previousIds.has(message.id)).map((message) => message.id)
      : [];

    state.messages = messages;
    state.meta = {
      leadStatuses: Array.isArray(meta?.leadStatuses) && meta.leadStatuses.length ? meta.leadStatuses : DEFAULT_LEAD_STATUSES,
      notificationChannels: {
        ...EMPTY_META.notificationChannels,
        ...(meta?.notificationChannels || {})
      }
    };
    populateStatusFilter();
    populateProjectFilter();
    syncSelectedLead();
    setFreshLeadIds(incomingLeadIds);
    renderMessages();
    renderDrawer();

    if (incomingLeadIds.length) {
      const label = incomingLeadIds.length === 1 ? "Entró 1 lead nuevo." : `Entraron ${incomingLeadIds.length} leads nuevos.`;
      setDashboardFeedback(label, "success");
      showToast(label, "success");
    } else if (!silent) {
      setDashboardFeedback("Mensajes actualizados.", "success");
      showToast("Mensajes actualizados.", "success");
    }

    hasLoadedOnce = true;
  } catch (error) {
    if (handleSessionError(error)) {
      return;
    }

    if (!silent || !hasLoadedOnce) {
      setDashboardFeedback(error.message || "No pudimos cargar los leads.", "error");
      showToast(error.message || "No pudimos cargar los leads.", "error");
    }

    if (!hasLoadedOnce) {
      renderEmptyState(error.message || "No pudimos cargar los leads.");
    }
  } finally {
    isRefreshing = false;
    setRefreshState(false);
  }
};

const updateLeadStatus = async (messageId, status) => {
  try {
    const updatedLead = await inbox.setStatus(messageId, status);
    await loadDashboardData({ silent: true, source: "action" });

    if (state.selectedLeadId === messageId) {
      state.selectedLead = updatedLead;
      state.selectedHistory = updatedLead.statusHistory || [];
      renderDrawer();
    }

    setDashboardFeedback(`Lead actualizado a ${status}.`, "success");
  } catch (error) {
    if (!handleSessionError(error)) {
      setDashboardFeedback(error.message || "No pudimos actualizar el lead.", "error");
    }
  }
};

const saveReplyDraft = async (messageId, draft) => {
  try {
    const updatedLead = await inbox.setReplyDraft(messageId, draft);
    await loadDashboardData({ silent: true, source: "action" });

    if (state.selectedLeadId === messageId) {
      state.selectedLead = updatedLead;
      state.selectedHistory = updatedLead.statusHistory || state.selectedHistory;
      renderDrawer();
    }

    setDashboardFeedback("Respuesta guardada en el CRM.", "success");
  } catch (error) {
    if (!handleSessionError(error)) {
      setDashboardFeedback(error.message || "No pudimos guardar la respuesta.", "error");
    }
  }
};

const saveLeadDetails = async (messageId, internalNotes, nextStep) => {
  try {
    const updatedLead = await inbox.updateLeadDetails(messageId, {
      internalNotes,
      nextStep
    });
    await loadDashboardData({ silent: true, source: "action" });

    if (state.selectedLeadId === messageId) {
      state.selectedLead = updatedLead;
      state.selectedHistory = updatedLead.statusHistory || state.selectedHistory;
      renderDrawer();
    }

    setDashboardFeedback("Seguimiento guardado correctamente.", "success");
  } catch (error) {
    if (!handleSessionError(error)) {
      setDashboardFeedback(error.message || "No pudimos guardar el seguimiento.", "error");
    }
  }
};

const copyReply = async (lead) => {
  try {
    await navigator.clipboard.writeText(inbox.buildReplyText(lead));
    setDashboardFeedback("Respuesta copiada para compartir.", "success");
  } catch {
    setDashboardFeedback("No pudimos copiar el texto en este navegador.", "error");
  }
};

const removeLead = async (messageId) => {
  if (!window.confirm("¿Quieres eliminar este lead del CRM?")) {
    return;
  }

  try {
    await inbox.deleteMessage(messageId);

    if (state.selectedLeadId === messageId) {
      closeDrawer();
    }

    await loadDashboardData({ silent: true, source: "action" });
    setDashboardFeedback("Lead eliminado del panel.", "success");
  } catch (error) {
    if (!handleSessionError(error)) {
      setDashboardFeedback(error.message || "No pudimos eliminar el lead.", "error");
    }
  }
};

const escapeCsv = (value) => `"${`${value ?? ""}`.replaceAll('"', '""')}"`;

const exportCsv = () => {
  const filteredMessages = getFilteredMessages();

  if (!filteredMessages.length) {
    setDashboardFeedback("No hay leads filtrados para exportar.", "error");
    return;
  }

  const header = ["nombre", "negocio", "whatsapp", "instagram", "tipo proyecto", "mensaje", "estado", "proximo paso", "notas internas", "fecha"];
  const rows = filteredMessages.map((message) =>
    [
      message.name,
      message.business,
      message.whatsapp,
      message.instagram,
      message.projectType,
      message.message,
      message.status,
      message.nextStep,
      message.internalNotes,
      message.createdAt
    ]
      .map(escapeCsv)
      .join(",")
  );

  const csv = `\uFEFF${header.join(",")}\n${rows.join("\n")}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `codeflow-leads-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);

  setDashboardFeedback("CSV exportado correctamente.", "success");
};

const handleListClick = async (event) => {
  const quickStatusButton = event.target.closest("[data-quick-status]");
  const deleteButton = event.target.closest("[data-delete-message]");
  const openDetailTarget = event.target.closest("[data-open-detail]");

  if (quickStatusButton) {
    await updateLeadStatus(quickStatusButton.dataset.messageId, quickStatusButton.dataset.quickStatus);
    return;
  }

  if (deleteButton) {
    await removeLead(deleteButton.dataset.deleteMessage);
    return;
  }

  if (openDetailTarget) {
    await openLead(openDetailTarget.dataset.openDetail);
  }
};

const handleDrawerClick = async (event) => {
  const statusButton = event.target.closest("[data-drawer-status]");
  const deleteButton = event.target.closest("[data-delete-message]");
  const copyButton = event.target.closest("[data-copy-reply]");

  if (statusButton) {
    await updateLeadStatus(statusButton.dataset.messageId, statusButton.dataset.drawerStatus);
    return;
  }

  if (deleteButton) {
    await removeLead(deleteButton.dataset.deleteMessage);
    return;
  }

  if (copyButton && state.selectedLead) {
    await copyReply(state.selectedLead);
  }
};

const handleDrawerSubmit = async (event) => {
  const replyForm = event.target.closest("[data-reply-form]");
  const detailsForm = event.target.closest("[data-lead-details-form]");

  if (replyForm) {
    event.preventDefault();

    const messageId = replyForm.dataset.replyForm;
    const draft = new FormData(replyForm).get("replyDraft");
    await saveReplyDraft(messageId, `${draft || ""}`);
    return;
  }

  if (detailsForm) {
    event.preventDefault();

    const messageId = detailsForm.dataset.leadDetailsForm;
    const formData = new FormData(detailsForm);
    await saveLeadDetails(
      messageId,
      `${formData.get("internalNotes") || ""}`,
      `${formData.get("nextStep") || ""}`
    );
  }
};

const handleListKeydown = async (event) => {
  if (event.key !== "Enter" && event.key !== " ") {
    return;
  }

  if (event.target.closest("button, a, input, select, textarea")) {
    return;
  }

  const target = event.target.closest("[data-open-detail]");

  if (!target) {
    return;
  }

  event.preventDefault();
  await openLead(target.dataset.openDetail);
};

if (storageMode) {
  storageMode.textContent = inbox.storageMode === "api" ? "CRM conectado" : "Modo local de respaldo";
}

populateStatusFilter();
populateProjectFilter();
setAuthenticatedState(inbox.isAdminAuthenticated());

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
      await loadDashboardData({ silent: true, source: "login" });
      startAutoRefresh();
    } catch (error) {
      loginFeedback.textContent = error.message || "No pudimos iniciar sesión en este momento.";
    }
  });
}

logoutButton?.addEventListener("click", () => {
  stopAutoRefresh();
  inbox.logoutAdmin();
  closeDrawer();
  setAuthenticatedState(false);
});

searchInput?.addEventListener("input", () => {
  state.query = searchInput.value.trim();
  renderMessages();
});

statusFilter?.addEventListener("change", () => {
  state.status = statusFilter.value;
  renderMessages();
});

projectFilter?.addEventListener("change", () => {
  state.projectType = projectFilter.value;
  renderMessages();
});

dateFromInput?.addEventListener("change", () => {
  state.dateFrom = dateFromInput.value;
  renderMessages();
});

dateToInput?.addEventListener("change", () => {
  state.dateTo = dateToInput.value;
  renderMessages();
});

exportButton?.addEventListener("click", exportCsv);
refreshButton?.addEventListener("click", () => {
  loadDashboardData({ source: "manual" });
});
messagesList?.addEventListener("click", handleListClick);
messagesList?.addEventListener("keydown", handleListKeydown);
drawerContent?.addEventListener("click", handleDrawerClick);
drawerContent?.addEventListener("submit", handleDrawerSubmit);
drawerCloseButton?.addEventListener("click", closeDrawer);
drawerBackdrop?.addEventListener("click", closeDrawer);

document.addEventListener("visibilitychange", () => {
  if (!inbox.isAdminAuthenticated() || document.hidden) {
    return;
  }

  loadDashboardData({ silent: true, source: "resume" });
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && state.selectedLeadId) {
    closeDrawer();
  }
});

if (inbox.isAdminAuthenticated()) {
  loadDashboardData({ silent: true, source: "startup" });
  startAutoRefresh();
}
