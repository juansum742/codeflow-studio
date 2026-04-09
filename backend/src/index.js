const jsonHeaders = {
  "Content-Type": "application/json; charset=UTF-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff"
};

const encoder = new TextEncoder();
const LEAD_STATUSES = ["Nuevo", "Leído", "Respondido", "En negociación", "Cliente cerrado", "Archivado"];
const DEFAULT_STATUS = LEAD_STATUSES[0];
const READ_STATUS = LEAD_STATUSES[1];
const FIELD_LIMITS = {
  name: 80,
  business: 120,
  whatsapp: 40,
  instagram: 80,
  projectType: 80,
  message: 4000,
  replyDraft: 4000,
  statusNote: 240,
  internalNotes: 4000,
  nextStep: 180
};

const STATUS_ALIASES = LEAD_STATUSES.reduce((map, status) => {
  map.set(normalizeComparableText(status), status);
  return map;
}, new Map());

const createResponse = (request, env, payload, status = 200) => {
  const response = new Response(JSON.stringify(payload), {
    status,
    headers: jsonHeaders
  });

  return withCorsHeaders(request, env, response);
};

const emptyResponse = (request, env, status = 204) =>
  withCorsHeaders(
    request,
    env,
    new Response(null, {
      status
    })
  );

const parseAllowedOrigins = (env) =>
  `${env.ALLOWED_ORIGINS || ""}`
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

const withCorsHeaders = (request, env, response) => {
  const allowedOrigins = parseAllowedOrigins(env);
  const origin = request.headers.get("Origin");

  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
  } else if (!origin && allowedOrigins[0]) {
    response.headers.set("Access-Control-Allow-Origin", allowedOrigins[0]);
  }

  response.headers.set("Vary", "Origin");
  response.headers.set("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type,Authorization");
  response.headers.set("Access-Control-Max-Age", "86400");
  return response;
};

function normalizeComparableText(value) {
  return `${value || ""}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function resolveStatusInput(value) {
  return STATUS_ALIASES.get(normalizeComparableText(value)) || null;
}

function normalizeStatus(value, fallback = DEFAULT_STATUS) {
  return resolveStatusInput(value) || fallback;
}

function statusImpliesRead(status) {
  return normalizeStatus(status, DEFAULT_STATUS) !== DEFAULT_STATUS;
}

function deriveStatusFromRead(read, currentStatus = DEFAULT_STATUS) {
  if (!read) {
    return DEFAULT_STATUS;
  }

  const normalizedCurrent = normalizeStatus(currentStatus, DEFAULT_STATUS);
  return normalizedCurrent === DEFAULT_STATUS ? READ_STATUS : normalizedCurrent;
}

const normalizeMessage = (row) => {
  const status = normalizeStatus(row.status, row.is_read ? READ_STATUS : DEFAULT_STATUS);

  return {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    name: row.name,
    business: row.business,
    whatsapp: row.whatsapp,
    instagram: row.instagram,
    projectType: row.project_type,
    message: row.message,
    status,
    read: statusImpliesRead(status),
    replyDraft: row.reply_draft,
    internalNotes: row.internal_notes,
    nextStep: row.next_step
  };
};

const normalizeStatusEvent = (row) => ({
  id: row.id,
  messageId: row.message_id,
  fromStatus: row.from_status,
  toStatus: row.to_status,
  note: row.note,
  changedAt: row.changed_at,
  changedBy: row.changed_by
});

const safeCompare = (left, right) => {
  if (left.length !== right.length) {
    return false;
  }

  let result = 0;

  for (let index = 0; index < left.length; index += 1) {
    result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }

  return result === 0;
};

const base64UrlEncode = (value) =>
  btoa(String.fromCharCode(...new Uint8Array(value)))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");

const base64UrlDecode = (value) => {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
};

const importSigningKey = (secret) =>
  crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);

const createSessionToken = async (env) => {
  const expiresAt = Math.floor(Date.now() / 1000) + 60 * 60 * 24;
  const payload = JSON.stringify({
    role: "admin",
    exp: expiresAt
  });
  const payloadEncoded = base64UrlEncode(encoder.encode(payload));
  const key = await importSigningKey(env.SESSION_SECRET);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payloadEncoded));

  return `${payloadEncoded}.${base64UrlEncode(signature)}`;
};

const verifySessionToken = async (env, token) => {
  const [payloadEncoded, signatureEncoded] = `${token || ""}`.split(".");

  if (!payloadEncoded || !signatureEncoded) {
    return false;
  }

  const key = await importSigningKey(env.SESSION_SECRET);
  const isValid = await crypto.subtle.verify("HMAC", key, base64UrlDecode(signatureEncoded), encoder.encode(payloadEncoded));

  if (!isValid) {
    return false;
  }

  const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(payloadEncoded)));

  return payload.exp > Math.floor(Date.now() / 1000) && payload.role === "admin";
};

const readJson = async (request) => {
  try {
    return await request.json();
  } catch {
    return null;
  }
};

const requireAuth = async (request, env) => {
  const authorization = request.headers.get("Authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";

  if (!token) {
    return false;
  }

  return verifySessionToken(env, token);
};

const validateMessagePayload = (payload) => {
  const requiredFields = ["name", "business", "whatsapp", "projectType", "message"];

  for (const field of requiredFields) {
    if (!`${payload?.[field] || ""}`.trim()) {
      return `El campo ${field} es obligatorio.`;
    }
  }

  for (const [field, limit] of Object.entries(FIELD_LIMITS)) {
    if (field === "replyDraft" || field === "statusNote" || field === "internalNotes" || field === "nextStep") {
      continue;
    }

    if (`${payload?.[field] || ""}`.trim().length > limit) {
      return `El campo ${field} supera el máximo permitido de ${limit} caracteres.`;
    }
  }

  return "";
};

const validateReplyDraft = (value) => {
  if (`${value || ""}`.trim().length > FIELD_LIMITS.replyDraft) {
    return `El borrador supera el máximo permitido de ${FIELD_LIMITS.replyDraft} caracteres.`;
  }

  return "";
};

const validateStatusNote = (value) => {
  if (`${value || ""}`.trim().length > FIELD_LIMITS.statusNote) {
    return `La nota de estado supera el máximo permitido de ${FIELD_LIMITS.statusNote} caracteres.`;
  }

  return "";
};

const validateInternalNotes = (value) => {
  if (`${value || ""}`.trim().length > FIELD_LIMITS.internalNotes) {
    return `Las notas internas superan el máximo permitido de ${FIELD_LIMITS.internalNotes} caracteres.`;
  }

  return "";
};

const validateNextStep = (value) => {
  if (`${value || ""}`.trim().length > FIELD_LIMITS.nextStep) {
    return `El próximo paso supera el máximo permitido de ${FIELD_LIMITS.nextStep} caracteres.`;
  }

  return "";
};

const getMessageById = async (env, messageId) => {
  const result = await env.DB.prepare(
    `SELECT id, created_at, updated_at, name, business, whatsapp, instagram, project_type, message, status, is_read, reply_draft, internal_notes, next_step
     FROM messages
     WHERE id = ?`
  )
    .bind(messageId)
    .first();

  return result ? normalizeMessage(result) : null;
};

const getMessageHistory = async (env, messageId) => {
  const result = await env.DB.prepare(
    `SELECT id, message_id, from_status, to_status, note, changed_at, changed_by
     FROM message_status_history
     WHERE message_id = ?
     ORDER BY datetime(changed_at) DESC, id DESC`
  )
    .bind(messageId)
    .all();

  return (result.results || []).map(normalizeStatusEvent);
};

const insertStatusHistory = async (env, entry) => {
  await env.DB.prepare(
    `INSERT INTO message_status_history (
      id, message_id, from_status, to_status, note, changed_at, changed_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      crypto.randomUUID(),
      entry.messageId,
      entry.fromStatus || null,
      entry.toStatus,
      entry.note || "",
      entry.changedAt,
      entry.changedBy || "admin"
    )
    .run();
};

const hasTwilioWhatsAppConfig = (env) =>
  Boolean(
    `${env.TWILIO_ACCOUNT_SID || ""}`.trim() &&
      `${env.TWILIO_AUTH_TOKEN || ""}`.trim() &&
      `${env.TWILIO_WHATSAPP_FROM || ""}`.trim() &&
      `${env.NOTIFY_WHATSAPP_TO || ""}`.trim()
  );

const getNotificationChannels = (env) => ({
  webhook: Boolean(`${env.NOTIFY_WEBHOOK_URL || ""}`.trim()),
  whatsappWebhook: Boolean(`${env.NOTIFY_WHATSAPP_WEBHOOK_URL || ""}`.trim()) || hasTwilioWhatsAppConfig(env),
  email: Boolean(`${env.RESEND_API_KEY || ""}`.trim() && `${env.NOTIFY_EMAIL_TO || ""}`.trim() && `${env.NOTIFY_EMAIL_FROM || ""}`.trim())
});

const postJson = async (url, payload, headers = {}) => {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=UTF-8",
      ...headers
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`Notification request failed with ${response.status}`);
  }
};

const createNotificationPayload = (message) => ({
  event: "lead.created",
  brand: "CodeFlow Studio",
  lead: message,
  summary: {
    title: `Nuevo lead de ${message.name}`,
    subtitle: `${message.business} · ${message.projectType}`,
    receivedAt: message.createdAt
  }
});

const sendWebhookNotification = async (env, url, message, channel) => {
  if (!`${url || ""}`.trim()) {
    return;
  }

  await postJson(url, {
    ...createNotificationPayload(message),
    channel
  });
};

const normalizeTwilioWhatsAppAddress = (value) => {
  const input = `${value || ""}`.trim();

  if (!input) {
    return "";
  }

  return input.startsWith("whatsapp:") ? input : `whatsapp:${input}`;
};

const sendTwilioWhatsAppNotification = async (env, message) => {
  if (!hasTwilioWhatsAppConfig(env)) {
    return;
  }

  const body = [
    "Nuevo lead para CodeFlow Studio",
    "",
    `Nombre: ${message.name}`,
    `Negocio: ${message.business}`,
    `Tipo de proyecto: ${message.projectType}`,
    `WhatsApp: ${message.whatsapp}`,
    "",
    "Mensaje:",
    message.message
  ].join("\n");

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`)}`,
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
      },
      body: new URLSearchParams({
        From: normalizeTwilioWhatsAppAddress(env.TWILIO_WHATSAPP_FROM),
        To: normalizeTwilioWhatsAppAddress(env.NOTIFY_WHATSAPP_TO),
        Body: body
      })
    }
  );

  if (!response.ok) {
    throw new Error(`Twilio WhatsApp notification failed with ${response.status}`);
  }
};

const sendEmailNotification = async (env, message) => {
  if (!getNotificationChannels(env).email) {
    return;
  }

  const subject = `Nuevo lead | ${message.business} | ${message.projectType}`;
  const lines = [
    `Nombre: ${message.name}`,
    `Negocio: ${message.business}`,
    `WhatsApp: ${message.whatsapp}`,
    `Instagram: ${message.instagram || "No especificado"}`,
    `Tipo de proyecto: ${message.projectType}`,
    `Estado inicial: ${message.status}`,
    `Fecha: ${message.createdAt}`,
    "",
    "Mensaje:",
    message.message
  ];

  await postJson(
    "https://api.resend.com/emails",
    {
      from: env.NOTIFY_EMAIL_FROM,
      to: [env.NOTIFY_EMAIL_TO],
      subject,
      text: lines.join("\n")
    },
    {
      Authorization: `Bearer ${env.RESEND_API_KEY}`
    }
  );
};

const notifyLead = async (env, message) => {
  const tasks = [
    sendWebhookNotification(env, env.NOTIFY_WEBHOOK_URL, message, "generic-webhook"),
    sendWebhookNotification(env, env.NOTIFY_WHATSAPP_WEBHOOK_URL, message, "whatsapp-webhook"),
    sendTwilioWhatsAppNotification(env, message),
    sendEmailNotification(env, message)
  ];

  const results = await Promise.allSettled(tasks);

  results.forEach((result) => {
    if (result.status === "rejected") {
      console.error("Lead notification failed", result.reason);
    }
  });
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";

    if (request.method === "OPTIONS") {
      return emptyResponse(request, env);
    }

    if (path === "/health" && request.method === "GET") {
      return createResponse(request, env, {
        ok: true,
        mode: "cloudflare-worker",
        notificationChannels: getNotificationChannels(env)
      });
    }

    if (path === "/api/messages" && request.method === "POST") {
      const payload = await readJson(request);
      const validationError = validateMessagePayload(payload);

      if (validationError) {
        return createResponse(request, env, { error: validationError }, 400);
      }

      const timestamp = new Date().toISOString();
      const message = {
        id: crypto.randomUUID(),
        createdAt: timestamp,
        updatedAt: timestamp,
        name: `${payload.name}`.trim(),
        business: `${payload.business}`.trim(),
        whatsapp: `${payload.whatsapp}`.trim(),
        instagram: `${payload.instagram || ""}`.trim(),
        projectType: `${payload.projectType}`.trim(),
        message: `${payload.message}`.trim(),
        status: DEFAULT_STATUS,
        read: false,
        replyDraft: "",
        internalNotes: "",
        nextStep: ""
      };

      await env.DB.prepare(
        `INSERT INTO messages (
          id, created_at, updated_at, name, business, whatsapp, instagram, project_type, message, status, is_read, reply_draft, internal_notes, next_step
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(
          message.id,
          message.createdAt,
          message.updatedAt,
          message.name,
          message.business,
          message.whatsapp,
          message.instagram,
          message.projectType,
          message.message,
          message.status,
          0,
          message.replyDraft,
          message.internalNotes,
          message.nextStep
        )
        .run();

      await insertStatusHistory(env, {
        messageId: message.id,
        fromStatus: null,
        toStatus: message.status,
        note: "Lead recibido desde la web",
        changedAt: timestamp,
        changedBy: "system"
      });

      if (ctx) {
        ctx.waitUntil(notifyLead(env, message));
      }

      return createResponse(request, env, { message }, 201);
    }

    if (path === "/api/admin/login" && request.method === "POST") {
      const payload = await readJson(request);
      const password = `${payload?.password || ""}`;

      if (!password || !safeCompare(password, `${env.ADMIN_PASSWORD || ""}`)) {
        return createResponse(request, env, { error: "La contraseña no es correcta." }, 401);
      }

      const token = await createSessionToken(env);

      return createResponse(request, env, { token });
    }

    if (!(await requireAuth(request, env))) {
      return createResponse(request, env, { error: "La sesión no es válida." }, 401);
    }

    if (path === "/api/admin/meta" && request.method === "GET") {
      return createResponse(request, env, {
        leadStatuses: LEAD_STATUSES,
        notificationChannels: getNotificationChannels(env)
      });
    }

    if (path === "/api/admin/messages" && request.method === "GET") {
      const result = await env.DB.prepare(
        `SELECT id, created_at, updated_at, name, business, whatsapp, instagram, project_type, message, status, is_read, reply_draft, internal_notes, next_step
         FROM messages
         ORDER BY datetime(created_at) DESC`
      ).all();

      return createResponse(request, env, {
        messages: (result.results || []).map(normalizeMessage)
      });
    }

    const messageMatch = path.match(/^\/api\/admin\/messages\/([^/]+)$/);

    if (messageMatch && request.method === "GET") {
      const messageId = messageMatch[1];
      const message = await getMessageById(env, messageId);

      if (!message) {
        return createResponse(request, env, { error: "No encontramos ese mensaje." }, 404);
      }

      return createResponse(request, env, {
        message,
        history: await getMessageHistory(env, messageId)
      });
    }

    if (messageMatch && request.method === "PATCH") {
      const messageId = messageMatch[1];
      const existing = await getMessageById(env, messageId);

      if (!existing) {
        return createResponse(request, env, { error: "No encontramos ese mensaje." }, 404);
      }

      const payload = (await readJson(request)) || {};
      const requestedStatus = payload.status === undefined ? undefined : resolveStatusInput(payload.status);
      const nextReplyDraft = payload.replyDraft === undefined ? existing.replyDraft : `${payload.replyDraft || ""}`;
      const nextInternalNotes = payload.internalNotes === undefined ? existing.internalNotes : `${payload.internalNotes || ""}`;
      const nextNextStep = payload.nextStep === undefined ? existing.nextStep : `${payload.nextStep || ""}`.trim();
      const statusNote = `${payload.statusNote || ""}`.trim();
      const replyDraftError = validateReplyDraft(nextReplyDraft);
      const internalNotesError = validateInternalNotes(nextInternalNotes);
      const nextStepError = validateNextStep(nextNextStep);
      const statusNoteError = validateStatusNote(statusNote);
      const updatedAt = new Date().toISOString();

      if (requestedStatus === null) {
        return createResponse(request, env, { error: "El estado solicitado no es válido." }, 400);
      }

      if (replyDraftError) {
        return createResponse(request, env, { error: replyDraftError }, 400);
      }

      if (internalNotesError) {
        return createResponse(request, env, { error: internalNotesError }, 400);
      }

      if (nextStepError) {
        return createResponse(request, env, { error: nextStepError }, 400);
      }

      if (statusNoteError) {
        return createResponse(request, env, { error: statusNoteError }, 400);
      }

      let nextStatus = existing.status;

      if (requestedStatus !== undefined) {
        nextStatus = requestedStatus;
      } else if (payload.read !== undefined) {
        nextStatus = deriveStatusFromRead(Boolean(payload.read), existing.status);
      }

      const nextRead = statusImpliesRead(nextStatus);

      await env.DB.prepare(
        `UPDATE messages
         SET updated_at = ?, status = ?, is_read = ?, reply_draft = ?, internal_notes = ?, next_step = ?
         WHERE id = ?`
      )
        .bind(updatedAt, nextStatus, nextRead ? 1 : 0, nextReplyDraft, nextInternalNotes, nextNextStep, messageId)
        .run();

      if (nextStatus !== existing.status) {
        await insertStatusHistory(env, {
          messageId,
          fromStatus: existing.status,
          toStatus: nextStatus,
          note: statusNote,
          changedAt: updatedAt,
          changedBy: "admin"
        });
      }

      return createResponse(request, env, {
        message: {
          ...existing,
          updatedAt,
          status: nextStatus,
          read: nextRead,
          replyDraft: nextReplyDraft,
          internalNotes: nextInternalNotes,
          nextStep: nextNextStep
        },
        history: await getMessageHistory(env, messageId)
      });
    }

    if (messageMatch && request.method === "DELETE") {
      const messageId = messageMatch[1];

      await env.DB.batch([
        env.DB.prepare("DELETE FROM message_status_history WHERE message_id = ?").bind(messageId),
        env.DB.prepare("DELETE FROM messages WHERE id = ?").bind(messageId)
      ]);

      return emptyResponse(request, env);
    }

    return createResponse(request, env, { error: "Ruta no encontrada." }, 404);
  }
};
