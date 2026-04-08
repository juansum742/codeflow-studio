(function () {
  const config = window.CodeFlowConfig || {};

  const STORAGE_KEYS = {
    messages: "codeflow-studio.messages.v2",
    session: "codeflow-studio.admin-session.v1"
  };

  const safeParse = (value, fallback) => {
    try {
      return JSON.parse(value) ?? fallback;
    } catch {
      return fallback;
    }
  };

  const readMessages = () => {
    const parsed = safeParse(localStorage.getItem(STORAGE_KEYS.messages), []);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((message) => message && typeof message === "object")
      .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));
  };

  const writeMessages = (messages) => {
    localStorage.setItem(STORAGE_KEYS.messages, JSON.stringify(messages));
    return messages;
  };

  const getMessages = () => readMessages();

  const normalizeProjectType = (value) => {
    if (config.projectTypes?.includes(value)) {
      return value;
    }

    return "Consulta general";
  };

  const createMessage = (payload) => ({
    id:
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `msg-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    createdAt: new Date().toISOString(),
    name: payload.name,
    business: payload.business,
    whatsapp: payload.whatsapp,
    instagram: payload.instagram || "",
    projectType: normalizeProjectType(payload.projectType),
    message: payload.message,
    read: false,
    replyDraft: ""
  });

  const addMessage = (payload) => {
    const message = createMessage(payload);
    const messages = [message, ...readMessages()];

    writeMessages(messages);
    return message;
  };

  const updateMessage = (messageId, updater) => {
    const updated = readMessages().map((message) => {
      if (message.id !== messageId) {
        return message;
      }

      return typeof updater === "function" ? updater(message) : { ...message, ...updater };
    });

    writeMessages(updated);
    return updated.find((message) => message.id === messageId) || null;
  };

  const deleteMessage = (messageId) => {
    const filtered = readMessages().filter((message) => message.id !== messageId);

    writeMessages(filtered);
    return filtered;
  };

  const setRead = (messageId, read) =>
    updateMessage(messageId, (message) => ({
      ...message,
      read
    }));

  const setReplyDraft = (messageId, replyDraft) =>
    updateMessage(messageId, (message) => ({
      ...message,
      replyDraft
    }));

  const getStats = () => {
    const messages = readMessages();
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

  const isAdminAuthenticated = () => sessionStorage.getItem(STORAGE_KEYS.session) === "active";

  const loginAdmin = (password) => {
    const success = password === config.adminPassword;

    if (success) {
      sessionStorage.setItem(STORAGE_KEYS.session, "active");
    }

    return success;
  };

  const logoutAdmin = () => {
    sessionStorage.removeItem(STORAGE_KEYS.session);
  };

  window.CodeFlowInbox = {
    addMessage,
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
    storageMode: config.storageMode || "browser"
  };
})();
