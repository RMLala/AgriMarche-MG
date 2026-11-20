import test from "node:test";
import assert from "node:assert/strict";
import { fetchHandler } from "../index.mjs";

const signingKey = "local-integration-test-key-not-production";
const future = new Date(Date.now() + 86_400_000).toISOString();

class MemoryD1 {
  records = new Map();
  operations = new Map();
  changes = [];
  seq = 0;
  prepare(sql) {
    const db = this;
    let args = [];
    const statement = {
      sql,
      get args() { return args; },
      bind(...values) { args = values; return statement; },
      async first() {
        if (sql.includes("FROM sync_operations")) return db.operations.get(`${args[0]}|${args[1]}`) || null;
        if (sql.includes("FROM sync_records")) return db.records.get(`${args[0]}|${args[1]}`) || null;
        return null;
      },
      async run() {
        if (sql.includes("INSERT OR IGNORE INTO sync_operations")) {
          const key = `${args[0]}|${args[1]}`;
          if (db.operations.has(key)) return { meta: { changes: 0 } };
          db.operations.set(key, { license_scope: args[0], op_id: args[1], device_id: args[2], record_id: args[3], request_hash: args[4], status: "processing", result_json: null });
          return { meta: { changes: 1 } };
        }
        if (sql.startsWith("UPDATE sync_operations SET")) {
          const row = db.operations.get(`${args[2]}|${args[3]}`);
          if (row) { row.status = "complete"; row.result_json = args[0]; }
          return { meta: { changes: row ? 1 : 0 } };
        }
        return { meta: { changes: 0 } };
      },
      async all() {
        if (!sql.includes("FROM sync_changes")) return { results: [] };
        return { results: db.changes.filter(x => x.license_scope === args[0] && x.seq > args[1]).sort((a,b)=>a.seq-b.seq).slice(0,100) };
      },
    };
    return statement;
  }
  async batch(statements) {
    const results = [];
    for (const st of statements) {
      const sql = st.sql;
      const a = st.args;
      const key = `${a[0]}|${a[1]}`;
      if (sql.startsWith("INSERT OR IGNORE INTO sync_records")) {
        const recordKey = `${a[0]}|${a[1]}`;
        if (!this.records.has(recordKey)) {
          this.records.set(recordKey, { license_scope: a[0], record_id: a[1], revision: 1, payload_json: a[2], last_op_id: a[3], updated_at: a[4] });
          results.push({ meta: { changes: 1 } });
        } else results.push({ meta: { changes: 0 } });
      } else if (sql.startsWith("UPDATE sync_records SET")) {
        const recordKey = `${a[4]}|${a[5]}`;
        const row = this.records.get(recordKey);
        if (row && row.revision === a[6]) {
          Object.assign(row, { revision: a[0], payload_json: a[1], last_op_id: a[2], updated_at: a[3] });
          results.push({ meta: { changes: 1 } });
        } else results.push({ meta: { changes: 0 } });
      } else if (sql.startsWith("INSERT OR IGNORE INTO sync_changes")) {
        const [opId, license, recordId, lastOpId] = a;
        const row = this.records.get(`${license}|${recordId}`);
        if (row?.last_op_id === lastOpId && !this.changes.some(x => x.license_scope === license && x.op_id === opId)) {
          this.changes.push({ seq: ++this.seq, license_scope: license, op_id: opId, record_id: recordId, revision: row.revision, payload_json: row.payload_json, changed_at: row.updated_at });
          results.push({ meta: { changes: 1 } });
        } else results.push({ meta: { changes: 0 } });
      }
    }
    return results;
  }
}

function harness() {
  const status = new Map();
  const DB = new MemoryD1();
  const LICENSE_AUTHORITY = { fetch: async request => {
    const url = new URL(request.url);
    const body = await request.json();
    if (url.pathname.endsWith("/verify")) {
      const denied = body.license_assertion.includes("expired") || body.license_assertion.includes("revoked");
      const unallowed = body.device_id.includes("blocked");
      return Response.json({ active: !denied, cloud_allowed: !denied, device_allowed: !unallowed, license_scope: body.license_assertion.includes("licenseB") ? "scope_B" : "scope_A", expires_at: future, cloud_quota: 100 });
    }
    if (url.pathname.endsWith("/authorize")) {
      const revoked = status.get(body.license_scope) === "revoked";
      const quotaReached = status.get(body.license_scope) === "quota";
      return Response.json({ allowed: !revoked, active: !revoked, cloud_allowed: !revoked, device_allowed: true, quota_remaining: quotaReached ? 0 : 100 });
    }
    return Response.json({ error: "not_found" }, { status: 404 });
  } };
  const env = { DB, LICENSE_AUTHORITY, CLOUD_TOKEN_SIGNING_KEY: signingKey };
  const call = (path, { method = "GET", body, token, headers = {} } = {}) => fetchHandler(new Request(`https://worker.example${path}`, {
    method, headers: { ...(body ? { "content-type": "application/json" } : {}), ...(token ? { authorization: `Bearer ${token}` } : {}), ...headers },
    body: body ? JSON.stringify(body) : undefined,
  }), env);
  return { call, DB, status };
}

async function licenseSession(call, assertion = "valid-license-ticket-0001", device = "device_12345678901", path = "/v1/cloud/session") {
  const response = await call(path, { method: "POST", body: { license_assertion: assertion, device_id: device } });
  return { response, data: await response.json() };
}

test("approved MVola license opens Cloud session without client account", async () => {
  const { call } = harness();
  const { response, data } = await licenseSession(call);
  assert.equal(response.status, 200);
  assert.equal(data.cloud_allowed, true);
  assert.ok(data.access_token);
  assert.equal("email" in data, false);
  assert.equal("password" in data, false);
});

test("renewal rechecks entitlement and issues a fresh limited token", async () => {
  const { call } = harness();
  const first = await licenseSession(call);
  const next = await licenseSession(call, "valid-license-ticket-0001", "device_12345678901", "/v1/cloud/session/renew");
  assert.equal(next.response.status, 200);
  assert.notEqual(next.data.access_token, first.data.access_token);
});

test("expired or revoked license is refused during session issue", async () => {
  const { call } = harness();
  const expired = await licenseSession(call, "expired-license-ticket-0001");
  const revoked = await licenseSession(call, "revoked-license-ticket-0001");
  assert.equal(expired.response.status, 403);
  assert.equal(revoked.response.status, 403);
});

test("unregistered device receives no Cloud token", async () => {
  const { call } = harness();
  const denied = await licenseSession(call, "valid-license-ticket-0001", "device_blocked_123456");
  assert.equal(denied.response.status, 403);
  assert.equal("access_token" in denied.data, false);
});

test("two authorized devices sync through the same license scope", async () => {
  const { call } = harness();
  const first = await licenseSession(call, "valid-license-ticket-0001", "device_12345678901");
  const second = await licenseSession(call, "valid-license-ticket-0001", "device_22345678901");
  const push = await call("/v1/sync/push", { method: "POST", token: first.data.access_token, body: { operations: [{ op_id: "operation_1234567890", record_id: "stock_1", base_version: null, payload: { kg: 42 } }] } });
  assert.equal((await push.json()).results[0].status, "applied");
  const pull = await call("/v1/sync/pull?cursor=0", { token: second.data.access_token });
  const data = await pull.json();
  assert.equal(data.changes.length, 1);
  assert.equal(data.changes[0].payload.kg, 42);
});

test("license scopes cannot read another license data", async () => {
  const { call } = harness();
  const a = await licenseSession(call, "valid-license-ticket-licenseA-0001", "device_12345678901");
  const b = await licenseSession(call, "valid-license-ticket-licenseB-0001", "device_22345678901");
  await call("/v1/sync/push", { method: "POST", token: a.data.access_token, body: { operations: [{ op_id: "operation_1234567890", record_id: "stock_1", base_version: null, payload: { kg: 42 } }] } });
  const pull = await call("/v1/sync/pull?cursor=0", { token: b.data.access_token });
  assert.deepEqual((await pull.json()).changes, []);
});

test("duplicate operation is idempotent and does not duplicate remote change", async () => {
  const { call, DB } = harness();
  const session = await licenseSession(call);
  const body = { operations: [{ op_id: "operation_1234567890", record_id: "stock_1", base_version: null, payload: { kg: 42 } }] };
  const one = await call("/v1/sync/push", { method: "POST", token: session.data.access_token, body });
  const two = await call("/v1/sync/push", { method: "POST", token: session.data.access_token, body });
  assert.equal((await one.json()).results[0].status, "applied");
  assert.equal((await two.json()).results[0].duplicate, true);
  assert.equal(DB.changes.length, 1);
});

test("revoked license loses remote access without deleting local queue", async () => {
  const { call, status } = harness();
  const session = await licenseSession(call);
  status.set("scope_A", "revoked");
  const response = await call("/v1/sync/pull?cursor=0", { token: session.data.access_token });
  assert.equal(response.status, 403);
  assert.equal((await response.json()).error, "cloud_access_denied");
});

test("optimistic revision conflict is reported without overwriting server record", async () => {
  const { call, DB } = harness();
  const session = await licenseSession(call);
  await call("/v1/sync/push", { method: "POST", token: session.data.access_token, body: { operations: [{ op_id: "operation_1234567890", record_id: "stock_1", base_version: null, payload: { kg: 42 } }] } });
  const response = await call("/v1/sync/push", { method: "POST", token: session.data.access_token, body: { operations: [{ op_id: "operation_2234567890", record_id: "stock_1", base_version: null, payload: { kg: 99 } }] } });
  const result = (await response.json()).results[0];
  assert.equal(result.status, "conflict");
  assert.equal(DB.records.get("scope_A|stock_1").payload_json, JSON.stringify({ kg: 42 }));
});

test("quota exhaustion rejects remote writes", async () => {
  const { call, status } = harness();
  const session = await licenseSession(call);
  status.set("scope_A", "quota");
  const response = await call("/v1/sync/push", { method: "POST", token: session.data.access_token, body: { operations: [{ op_id: "operation_1234567890", record_id: "stock_1", base_version: null, payload: { kg: 42 } }] } });
  assert.equal(response.status, 429);
  assert.equal((await response.json()).error, "cloud_quota_reached");
});
