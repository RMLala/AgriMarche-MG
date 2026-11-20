import test from "node:test";
import assert from "node:assert/strict";
import { signAccessToken, verifyAccessToken, fetchHandler } from "../index.mjs";

const secret = "test-only-signing-secret-not-for-production";
const claims = { iss: "appforge-license-worker", aud: "agrimarche-mg", sub: "scope_A9", device_id: "device_12345678901", jti: "test-token-1", iat: 1000, exp: 2000, license_exp: 2500, scope: ["sync:read", "sync:write"] };

test("token signature, audience and expiry are enforced", async () => {
  const token = await signAccessToken(claims, secret);
  assert.equal((await verifyAccessToken(token, secret, 1500)).sub, "scope_A9");
  assert.equal(await verifyAccessToken(token, "wrong-secret", 1500), null);
  assert.equal(await verifyAccessToken(token, secret, 2000), null);
  const parts = token.split(".");
  const changed = `${parts[0]}.${parts[1]}x.${parts[2]}`;
  assert.equal(await verifyAccessToken(changed, secret, 1500), null);
});

test("session issuance fails closed when private license authority is absent", async () => {
  const req = new Request("https://worker.example/v1/cloud/session", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ license_assertion: "opaque-activation-ticket-0001", device_id: "device_12345678901" }),
  });
  const res = await fetchHandler(req, { CLOUD_TOKEN_SIGNING_KEY: secret });
  assert.equal(res.status, 503);
  assert.equal((await res.json()).error, "license_service_unavailable");
});

test("invalid tokens cannot query cloud status", async () => {
  const req = new Request("https://worker.example/v1/cloud/status", { headers: { authorization: "Bearer garbage" } });
  const res = await fetchHandler(req, { CLOUD_TOKEN_SIGNING_KEY: secret });
  assert.equal(res.status, 401);
});

test("unconfigured cross-origin calls are rejected", async () => {
  const req = new Request("https://worker.example/v1/cloud/session", {
    method: "POST", headers: { origin: "https://evil.example", "content-type": "application/json" },
    body: JSON.stringify({ license_assertion: "opaque-activation-ticket-0001", device_id: "device_12345678901" }),
  });
  const res = await fetchHandler(req, { ALLOWED_ORIGINS: "https://app.example" });
  assert.equal(res.status, 403);
  assert.equal((await res.json()).error, "origin_not_allowed");
});

test("session endpoint refuses malformed device and license data", async () => {
  const req = new Request("https://worker.example/v1/cloud/session", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ license_assertion: "x", device_id: "bad" }),
  });
  const res = await fetchHandler(req, {});
  assert.equal(res.status, 400);
  assert.equal((await res.json()).error, "invalid_request");
});
