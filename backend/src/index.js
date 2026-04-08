const jsonHeaders = {
  "Content-Type": "application/json; charset=UTF-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff"
};

const encoder = new TextEncoder();
const FIELD_LIMITS = {
  name: 80,
  business: 120,
  whatsapp: 40,
  instagram: 80,
  projectType: 80,
  message: 4000,
  replyDraft: 4000
};

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

const normalizeMessage = (row) => ({
  id: row.id,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  name: row.name,
  business: row.business,
  whatsapp: row.whatsapp,
  instagram: row.instagram,
  projectType: row.project_type,
  message: row.message,
  read: Boolean(row.is_read),
  replyDraft: row.reply_draft
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

const getMessageById = async (env, messageId) => {
  const result = await env.DB.prepare(
    `SELECT id, created_at, updated_at, name, business, whatsapp, instagram, project_type, message, is_read, reply_draft
     FROM messages
     WHERE id = ?`
  )
    .bind(messageId)
    .first();

  return result ? normalizeMessage(result) : null;
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";

    if (request.method === "OPTIONS") {
      return emptyResponse(request, env);
    }

    if (path === "/health" && request.method === "GET") {
      return createResponse(request, env, {
        ok: true,
        mode: "cloudflare-worker"
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
        read: false,
        replyDraft: ""
      };

      await env.DB.prepare(
        `INSERT INTO messages (
          id, created_at, updated_at, name, business, whatsapp, instagram, project_type, message, is_read, reply_draft
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
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
          0,
          message.replyDraft
        )
        .run();

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

    if (path === "/api/admin/messages" && request.method === "GET") {
      const result = await env.DB.prepare(
        `SELECT id, created_at, updated_at, name, business, whatsapp, instagram, project_type, message, is_read, reply_draft
         FROM messages
         ORDER BY datetime(created_at) DESC`
      ).all();

      return createResponse(request, env, {
        messages: (result.results || []).map(normalizeMessage)
      });
    }

    const messageMatch = path.match(/^\/api\/admin\/messages\/([^/]+)$/);

    if (messageMatch && request.method === "PATCH") {
      const messageId = messageMatch[1];
      const existing = await getMessageById(env, messageId);

      if (!existing) {
        return createResponse(request, env, { error: "No encontramos ese mensaje." }, 404);
      }

      const payload = (await readJson(request)) || {};
      const nextRead = payload.read === undefined ? existing.read : Boolean(payload.read);
      const nextReplyDraft = payload.replyDraft === undefined ? existing.replyDraft : `${payload.replyDraft || ""}`;
      const replyDraftError = validateReplyDraft(nextReplyDraft);
      const updatedAt = new Date().toISOString();

      if (replyDraftError) {
        return createResponse(request, env, { error: replyDraftError }, 400);
      }

      await env.DB.prepare(
        `UPDATE messages
         SET updated_at = ?, is_read = ?, reply_draft = ?
         WHERE id = ?`
      )
        .bind(updatedAt, nextRead ? 1 : 0, nextReplyDraft, messageId)
        .run();

      return createResponse(request, env, {
        message: {
          ...existing,
          updatedAt,
          read: nextRead,
          replyDraft: nextReplyDraft
        }
      });
    }

    if (messageMatch && request.method === "DELETE") {
      const messageId = messageMatch[1];

      await env.DB.prepare("DELETE FROM messages WHERE id = ?").bind(messageId).run();
      return emptyResponse(request, env);
    }

    return createResponse(request, env, { error: "Ruta no encontrada." }, 404);
  }
};
