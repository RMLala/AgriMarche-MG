const encoder = new TextEncoder();
const APP_ID = "agrimarche-mg";
const TOKEN_TTL_SECONDS = 600;
const MAX_BATCH_ITEMS = 25;
const MAX_PAYLOAD_BYTES = 64 * 1024;

const json = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), {
  status,
  headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers },
});
const b64url = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes)))
  .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
const fromB64url = (value) => Uint8Array.from(atob(value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - value.length % 4) % 4)), c => c.charCodeAt(0));
const safeEqual = (a, b) => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
};

async function importSigningKey(secret) {
  if (!secret) throw new Error("Cloud token service is not configured");
  return crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

export async function signAccessToken(claims, secret) {
  const header = b64url(encoder.encode(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const body = b64url(encoder.encode(JSON.stringify(claims)));
  const input = `${header}.${body}`;
  const signature = await crypto.subtle.sign("HMAC", await importSigningKey(secret), encoder.encode(input));
  return `${input}.${b64url(signature)}`;
}

export async function verifyAccessToken(token, secret, now = Math.floor(Date.now() / 1000)) {
  if (typeof token !== "string" || token.length > 4096) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const [headerPart, payloadPart, signaturePart] = parts;
    const header = JSON.parse(new TextDecoder().decode(fromB64url(headerPart)));
    const claims = JSON.parse(new TextDecoder().decode(fromB64url(payloadPart)));
    if (header.alg !== "HS256" || header.typ !== "JWT") return null;
    const input = `${headerPart}.${payloadPart}`;
    const key = await importSigningKey(secret);
    const expected = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(input)));
    if (!safeEqual(expected, fromB64url(signaturePart))) return null;
    if (claims.aud !== APP_ID || claims.iss !== "appforge-license-worker" || !claims.sub || !claims.device_id) return null;
    if (!Number.isInteger(claims.exp) || claims.exp <= now || !Number.isInteger(claims.iat) || claims.iat > now + 30) return null;
    return claims;
  } catch {
    return null;
  }
}

function allowCors(request, env) {
  const origin = request.headers.get("Origin");
  const allowed = (env.ALLOWED_ORIGINS || "").split(",").map(x => x.trim()).filter(Boolean);
  if (!origin || !allowed.includes(origin)) return null;
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "Authorization, Content-Type",
    "access-control-max-age": "600",
    "vary": "Origin",
  };
}

function withCors(response, cors) {
  if (!cors) return response;
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(cors)) headers.set(name, value);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

async function authorityRequest(env, path, payload) {
  if (!env.LICENSE_AUTHORITY || typeof env.LICENSE_AUTHORITY.fetch !== "function") {
    throw new Error("License authority unavailable");
  }
  const response = await env.LICENSE_AUTHORITY.fetch(new Request(`https://license-authority.internal${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-app-id": APP_ID },
    body: JSON.stringify(payload),
  }));
  if (!response.ok) throw new Error("License authority rejected request");
  return response.json();
}

function validDeviceId(value) {
  return typeof value === "string" && /^[A-Za-z0-9_-]{16,128}$/.test(value);
}
function expiresAtSeconds(value) {
  const date = typeof value === "number" ? value : Date.parse(value) / 1000;
  return Number.isFinite(date) ? Math.floor(date) : 0;
}

async function issueSession(request, env) {
  let body;
  try { body = await request.json(); } catch { return json({ error: "invalid_request" }, 400); }
  if (!validDeviceId(body.device_id) || typeof body.license_assertion !== "string" || body.license_assertion.length < 16 || body.license_assertion.length > 4096) {
    return json({ error: "invalid_request", message: "Activation information is incomplete." }, 400);
  }
  let entitlement;
  try {
    entitlement = await authorityRequest(env, "/internal/v1/cloud/verify", {
      license_assertion: body.license_assertion,
      device_id: body.device_id,
      app_id: APP_ID,
    });
  } catch {
    return json({ error: "license_service_unavailable", message: "Cloud access could not be verified. Local data is unchanged." }, 503);
  }
  const licenseExpiry = expiresAtSeconds(entitlement.expires_at);
  const now = Math.floor(Date.now() / 1000);
  if (entitlement.active !== true || entitlement.cloud_allowed !== true || entitlement.device_allowed !== true || !entitlement.license_scope || licenseExpiry <= now) {
    return json({ error: "cloud_access_denied", message: "This license or device is not currently allowed to use Cloud." }, 403);
  }
  const exp = Math.min(now + TOKEN_TTL_SECONDS, licenseExpiry);
  const claims = {
    iss: "appforge-license-worker", aud: APP_ID,
    sub: entitlement.license_scope,
    device_id: body.device_id,
    jti: crypto.randomUUID(),
    iat: now, exp, license_exp: licenseExpiry,
    scope: ["sync:read", "sync:write"],
  };
  let token;
  try { token = await signAccessToken(claims, env.CLOUD_TOKEN_SIGNING_KEY); }
  catch { return json({ error: "cloud_not_configured", message: "Cloud service is not configured. Local data is unchanged." }, 503); }
  return json({
    access_token: token,
    token_type: "Bearer",
    expires_at: new Date(exp * 1000).toISOString(),
    license_expires_at: new Date(licenseExpiry * 1000).toISOString(),
    cloud_allowed: true,
    quota: entitlement.cloud_quota ?? null,
  });
}

async function authenticate(request, env) {
  const match = /^Bearer\s+(.+)$/i.exec(request.headers.get("Authorization") || "");
  if (!match) return { error: json({ error: "authentication_required" }, 401) };
  const claims = await verifyAccessToken(match[1], env.CLOUD_TOKEN_SIGNING_KEY);
  if (!claims) return { error: json({ error: "session_expired", message: "Cloud session expired. Reconnect when online; local data is unchanged." }, 401) };
  let authorization;
  try {
    authorization = await authorityRequest(env, "/internal/v1/cloud/authorize", {
      license_scope: claims.sub, device_id: claims.device_id, token_id: claims.jti,
      app_id: APP_ID, operation: request.method,
    });
  } catch {
    return { error: json({ error: "license_service_unavailable", message: "Cloud access could not be checked. Local data is unchanged." }, 503) };
  }
  if (authorization.allowed !== true || authorization.active !== true || authorization.cloud_allowed !== true || authorization.device_allowed !== true) {
    return { error: json({ error: "cloud_access_denied", message: "Cloud access is no longer authorized. Local data is unchanged." }, 403) };
  }
  return { claims, authorization };
}

function parseSyncOperation(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const { op_id, record_id, base_version, payload } = value;
  if (typeof op_id !== "string" || !/^[A-Za-z0-9_-]{12,128}$/.test(op_id)) return null;
  if (typeof record_id !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(record_id)) return null;
  if (base_version !== null && (!Number.isInteger(base_version) || base_version < 1)) return null;
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const serialized = JSON.stringify(payload);
  if (encoder.encode(serialized).byteLength > MAX_PAYLOAD_BYTES) return null;
  return { op_id, record_id, base_version, payload_json: serialized };
}

async function operationHash(op) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(JSON.stringify({ record_id: op.record_id, base_version: op.base_version, payload_json: op.payload_json })));
  return b64url(digest);
}

async function pushSync(request, env, claims, authorization) {
  let body;
  try { body = await request.json(); } catch { return json({ error: "invalid_request" }, 400); }
  if (!Array.isArray(body.operations) || body.operations.length > MAX_BATCH_ITEMS) {
    return json({ error: "invalid_batch", message: `Send between 1 and ${MAX_BATCH_ITEMS} operations.` }, 400);
  }
  if (Number.isFinite(authorization.quota_remaining) && authorization.quota_remaining < body.operations.length) {
    return json({ error: "cloud_quota_reached", message: "The Cloud quota has been reached. Local data remains queued." }, 429);
  }
  const results = [];
  for (const raw of body.operations) {
    const op = parseSyncOperation(raw);
    if (!op) { results.push({ op_id: raw?.op_id ?? null, status: "rejected", reason: "invalid_operation" }); continue; }
    try { results.push(await applyOperation(env.DB, claims, op)); }
    catch { results.push({ op_id: op.op_id, status: "retry", reason: "temporarily_unavailable" }); }
  }
  return json({ results });
}

async function applyOperation(db, claims, op) {
  const license = claims.sub;
  const requestHash = await operationHash(op);
  const existingOp = await db.prepare("SELECT result_json, status, request_hash, device_id, record_id FROM sync_operations WHERE license_scope = ? AND op_id = ?")
    .bind(license, op.op_id).first();
  if (existingOp && (existingOp.request_hash !== requestHash || existingOp.device_id !== claims.device_id || existingOp.record_id !== op.record_id)) {
    return { op_id: op.op_id, record_id: op.record_id, status: "rejected", reason: "idempotency_key_reused" };
  }
  if (existingOp?.status === "complete" && existingOp.result_json) return { ...JSON.parse(existingOp.result_json), duplicate: true };
  if (!existingOp) {
    const claimed = await db.prepare("INSERT OR IGNORE INTO sync_operations (license_scope, op_id, device_id, record_id, request_hash, status, created_at) VALUES (?, ?, ?, ?, ?, 'processing', ?)")
      .bind(license, op.op_id, claims.device_id, op.record_id, requestHash, new Date().toISOString()).run();
    if ((claimed?.meta?.changes ?? 0) === 0) {
      const reread = await db.prepare("SELECT result_json, status, request_hash, device_id, record_id FROM sync_operations WHERE license_scope = ? AND op_id = ?")
        .bind(license, op.op_id).first();
      if (!reread || reread.request_hash !== requestHash || reread.device_id !== claims.device_id || reread.record_id !== op.record_id) {
        return { op_id: op.op_id, record_id: op.record_id, status: "rejected", reason: "idempotency_key_reused" };
      }
      if (reread.status === "complete" && reread.result_json) return { ...JSON.parse(reread.result_json), duplicate: true };
    }
  }
  const current = await db.prepare("SELECT revision, payload_json, last_op_id FROM sync_records WHERE license_scope = ? AND record_id = ?")
    .bind(license, op.record_id).first();
  if (current?.last_op_id === op.op_id) {
    const result = { op_id: op.op_id, record_id: op.record_id, status: "applied", version: current.revision };
    await finishOperation(db, license, op.op_id, result);
    return result;
  }
  const actualVersion = current?.revision ?? null;
  if (actualVersion !== op.base_version) {
    const result = { op_id: op.op_id, record_id: op.record_id, status: "conflict", expected_version: op.base_version, actual_version: actualVersion, server_payload: current ? JSON.parse(current.payload_json) : null };
    await finishOperation(db, license, op.op_id, result);
    return result;
  }
  const nextVersion = actualVersion === null ? 1 : actualVersion + 1;
  const now = new Date().toISOString();
  const write = actualVersion === null
    ? db.prepare("INSERT OR IGNORE INTO sync_records (license_scope, record_id, revision, payload_json, last_op_id, updated_at) VALUES (?, ?, 1, ?, ?, ?)").bind(license, op.record_id, op.payload_json, op.op_id, now)
    : db.prepare("UPDATE sync_records SET revision = ?, payload_json = ?, last_op_id = ?, updated_at = ? WHERE license_scope = ? AND record_id = ? AND revision = ?").bind(nextVersion, op.payload_json, op.op_id, now, license, op.record_id, actualVersion);
  const change = db.prepare("INSERT OR IGNORE INTO sync_changes (license_scope, op_id, record_id, revision, payload_json, changed_at) SELECT license_scope, ?, record_id, revision, payload_json, updated_at FROM sync_records WHERE license_scope = ? AND record_id = ? AND last_op_id = ?")
    .bind(op.op_id, license, op.record_id, op.op_id);
  const writeResult = await db.batch([write, change]);
  const changed = writeResult?.[0]?.meta?.changes ?? 0;
  const after = await db.prepare("SELECT revision, payload_json, last_op_id FROM sync_records WHERE license_scope = ? AND record_id = ?")
    .bind(license, op.record_id).first();
  if (!after) throw new Error("write was not committed");
  if (changed === 0 && after.last_op_id !== op.op_id) {
    const result = { op_id: op.op_id, record_id: op.record_id, status: "conflict", expected_version: op.base_version, actual_version: after.revision, server_payload: JSON.parse(after.payload_json) };
    await finishOperation(db, license, op.op_id, result);
    return result;
  }
  const result = { op_id: op.op_id, record_id: op.record_id, status: "applied", version: after.revision };
  await finishOperation(db, license, op.op_id, result);
  return result;
}

async function finishOperation(db, license, opId, result) {
  await db.prepare("UPDATE sync_operations SET status = 'complete', result_json = ?, completed_at = ? WHERE license_scope = ? AND op_id = ?")
    .bind(JSON.stringify(result), new Date().toISOString(), license, opId).run();
}

async function pullSync(request, env, claims) {
  const url = new URL(request.url);
  const cursor = Number(url.searchParams.get("cursor") || 0);
  if (!Number.isSafeInteger(cursor) || cursor < 0) return json({ error: "invalid_cursor" }, 400);
  const rows = await env.DB.prepare("SELECT seq, op_id, record_id, revision, payload_json, changed_at FROM sync_changes WHERE license_scope = ? AND seq > ? ORDER BY seq LIMIT 100")
    .bind(claims.sub, cursor).all();
  const changes = (rows.results || []).map(row => ({ seq: row.seq, op_id: row.op_id, record_id: row.record_id, version: row.revision, payload: JSON.parse(row.payload_json), changed_at: row.changed_at }));
  return json({ changes, cursor: changes.at(-1)?.seq ?? cursor, has_more: changes.length === 100 });
}

export async function fetchHandler(request, env) {
  const cors = allowCors(request, env);
  if (request.method === "OPTIONS") return cors ? new Response(null, { status: 204, headers: cors }) : json({ error: "origin_not_allowed" }, 403);
  if (request.headers.get("Origin") && !cors) return json({ error: "origin_not_allowed" }, 403);
  const url = new URL(request.url);
  if (request.method === "POST" && (url.pathname === "/v1/cloud/session" || url.pathname === "/v1/cloud/session/renew")) return withCors(await issueSession(request, env), cors);
  if (request.method === "GET" && url.pathname === "/v1/cloud/status") {
    const auth = await authenticate(request, env);
    if (auth.error) return withCors(auth.error, cors);
    return withCors(json({ status: "connected", cloud_allowed: true, license_expires_at: auth.claims.license_exp ? new Date(auth.claims.license_exp * 1000).toISOString() : null, token_expires_at: new Date(auth.claims.exp * 1000).toISOString() }), cors);
  }
  if (request.method === "POST" && url.pathname === "/v1/sync/push") {
    const auth = await authenticate(request, env);
    return withCors(auth.error || await pushSync(request, env, auth.claims, auth.authorization), cors);
  }
  if (request.method === "GET" && url.pathname === "/v1/sync/pull") {
    const auth = await authenticate(request, env);
    return withCors(auth.error || await pullSync(request, env, auth.claims), cors);
  }
  return withCors(json({ error: "not_found" }, 404), cors);
}

export default { fetch: fetchHandler };
