(function () {
  const config = window.CodeFlowConfig || {};

  const STORAGE_KEYS = {
    messages: "codeflow-studio.messages.v3",
    session: "codeflow-studio.admin-session.v2",
    token: "codeflow-studio.admin-token.v1"
  };

  const apiBaseUrl = `${config.apiBaseUrl || ""}`.trim().replace(/\/$/, "");
  const requestedMode = config.storageMode || "auto";
  const storageMode = requestedMode === "api" || (requestedMode === "auto" && apiBaseUrl) ? "api" : "browser";

  const safeParse = (value, fallback) => {
    try {
      return JSON.parse(value) ?? fallback;
    } catch {
      return fallback;
    }
  };

  const normalizeMessage = (message) => ({
    ...message,
    read: Boolean(message.read),
    replyDraft: `${message.replyDraft || ""}`
  });

  const readMessages = () => {
    const parsed = safeParse(localStorage.getItem(STORAGE_KEYS.messages), []);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((message) => message && typeof message === "object")
      .map(normalizeMessage)
      .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));
  };

  const writeMessages = (messages) => {
    localStorage.setItem(STORAGE_KEYS.messages, JSON.stringify(messages));
    return messages;
  };

  const normalizeProjectType = (value) => {
    if (config.projectTypes?.includes(value)) {
      return value;
    }

    return "Consulta general";
  };

  const createBrowserMessage = (payload) => ({
    id:
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `msg-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    name: payload.name,
    business: payload.business,
    whatsapp: payload.whatsapp,
    instagram: payload.instagram || "",
    projectType: normalizeProjectType(payload.projectType),
    message: payload.message,
    read: false,
    replyDraft: ""
  });

  const getToken = () => sessionStorage.getItem(STORAGE_KEYS.token) || "";
  const setToken = (token) => sessionStorage.setItem(STORAGE_KEYS.token, token);
  const clearToken = () => sessionStorage.removeItem(STORAGE_KEYS.token);

  const secureBrowserCompare = (left, right) => {
    if (left.length !== right.length) {
      return false;
    }

    let result = 0;

    for (let index = 0; index < left.length; index += 1) {
      result |= left.charCodeAt(index) ^ right.charCodeAt(index);
    }

    return result === 0;
  };

  const apiRequest = async (path, options = {}) => {
    if (!apiBaseUrl) {
      throw new Error("La API no está configurada.");
    }

    const headers = new Headers(options.headers || {});

    if (options.json !== undefined) {
      headers.set("Content-Type", "application/json");
    }

    if (options.auth) {
      const token = getToken();

      if (!token) {
        throw new Error("La sesión del administrador no está activa.");
      }

      headers.set("Authorization", `Bearer ${token}`);
    }

    let response;

    try {
      response = await fetch(`${apiBaseUrl}${path}`, {
        method: options.method || "GET",
        headers,
        body: options.json !== undefined ? JSON.stringify(options.json) : options.body
      });
    } catch {
      throw new Error("No pudimos conectar con la API en este momento.");
    }

    if (response.status === 401) {
      sessionStorage.removeItem(STORAGE_KEYS.session);
      clearToken();
    }

    if (response.status === 204) {
      return null;
    }

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(payload.error || "No pudimos completar la solicitud.");
    }

    return payload;
  };

  const submitMessage = async (payload) => {
    if (storageMode === "api") {
      const response = await apiRequest("/api/messages", {
        method: "POST",
        json: payload
      });

      return normalizeMessage(response.message);
    }

    const message = createBrowserMessage(payload);
    const messages = [message, ...readMessages()];

    writeMessages(messages);
    return message;
  };

  const getMessages = async () => {
    if (storageMode === "api") {
      const response = await apiRequest("/api/admin/messages", {
        auth: true
      });

      return (response.messages || []).map(normalizeMessage);
    }

    return readMessages();
  };

  const updateBrowserMessage = (messageId, updater) => {
    const updated = readMessages().map((message) => {
      if (message.id !== messageId) {
        return message;
      }

      const nextMessage = typeof updater === "function" ? updater(message) : { ...message, ...updater };

      return {
        ...nextMessage,
        updatedAt: new Date().toISOString()
      };
    });

    writeMessages(updated);
    return updated.find((message) => message.id === messageId) || null;
  };

  const setRead = async (messageId, read) => {
    if (storageMode === "api") {
      const response = await apiRequest(`/api/admin/messages/${messageId}`, {
        method: "PATCH",
        auth: true,
        json: { read }
      });

      return normalizeMessage(response.message);
    }

    return updateBrowserMessage(messageId, (message) => ({
      ...message,
      read
    }));
  };

  const setReplyDraft = async (messageId, replyDraft) => {
    if (storageMode === "api") {
      const response = await apiRequest(`/api/admin/messages/${messageId}`, {
        method: "PATCH",
        auth: true,
        json: { replyDraft }
      });

      return normalizeMessage(response.message);
    }

    return updateBrowserMessage(messageId, (message) => ({
      ...message,
      replyDraft
    }));
  };

  const deleteMessage = async (messageId) => {
    if (storageMode === "api") {
      await apiRequest(`/api/admin/messages/${messageId}`, {
        method: "DELETE",
        auth: true
      });

      return;
    }

    const filtered = readMessages().filter((message) => message.id !== messageId);
    writeMessages(filtered);
  };

  const getStats = (messages = []) => {
    const unread = messages.filter((message) => !message.read).length;

    return {
      total: messages.length,
      unread,
      read: messages.length - unread
    };
  };

  const formatDate = (isoString) => {
    const date = new Date(isoString);

    if (Number.isNaN(date.getTime())) {
      return "Fecha no disponible";
    }

    return new Intl.DateTimeFormat("es-UY", {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(date);
  };

  const normalizePhone = (value) => `${value || ""}`.replace(/\D/g, "");

  const buildReplyText = (message) => {
    const draft = `${message.replyDraft || ""}`.trim();

    if (draft) {
      return draft;
    }

    return [
      `Hola ${message.name},`,
      "",
      "Gracias por escribirnos a CodeFlow Studio.",
      "Revisamos tu consulta y te respondemos por este medio para avanzar con tu proyecto."
    ].join("\n");
  };

  const buildWhatsAppUrl = (messageText, overridePhone = "") => {
    const phone = normalizePhone(overridePhone || config.whatsappNumber || "");
    const encoded = encodeURIComponent(messageText);

    if (phone) {
      return `https://wa.me/${phone}?text=${encoded}`;
    }

    return `https://api.whatsapp.com/send?text=${encoded}`;
  };

  const isAdminAuthenticated = () => {
    if (storageMode === "api") {
      return Boolean(getToken());
    }

    return sessionStorage.getItem(STORAGE_KEYS.session) === "active";
  };

  const loginAdmin = async (password) => {
    if (storageMode === "api") {
      const response = await apiRequest("/api/admin/login", {
        method: "POST",
        json: { password }
      });

      setToken(response.token);
      sessionStorage.setItem(STORAGE_KEYS.session, "active");
      return true;
    }

    const success = secureBrowserCompare(password, `${config.adminPassword || ""}`);

    if (success) {
      sessionStorage.setItem(STORAGE_KEYS.session, "active");
    }

    return success;
  };

  const logoutAdmin = () => {
    sessionStorage.removeItem(STORAGE_KEYS.session);
    clearToken();
  };

  window.CodeFlowInbox = {
    apiBaseUrl,
    buildReplyText,
    buildWhatsAppUrl,
    deleteMessage,
    formatDate,
    getMessages,
    getStats,
    isAdminAuthenticated,
    loginAdmin,
    logoutAdmin,
    setRead,
    setReplyDraft,
    storageMode,
    submitMessage
  };
})();
