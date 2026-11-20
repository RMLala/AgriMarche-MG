import test from "node:test";
import assert from "node:assert/strict";
import { CloudSessionClient } from "./cloud-session.mjs";

function makeClient({ online = true, results = [], fetchResponses = [] } = {}) {
  const queue = [...results];
  const removed = [];
  const calls = [];
  const outbox = {
    peek: async () => queue,
    remove: async id => { removed.push(id); },
    getCursor: async () => 0,
    setCursor: async n => { calls.push(["cursor", n]); },
    count: async () => queue.length - removed.length,
  };
  const responses = [...fetchResponses];
  const fetchImpl = async (url, init = {}) => {
    calls.push([url, init]);
    if (responses.length) return responses.shift();
    if (url.endsWith("/v1/cloud/session")) return Response.json({ access_token: "memory-token", expires_at: new Date(Date.now() + 600_000).toISOString(), license_expires_at: "2030-01-01T00:00:00.000Z" });
    if (url.includes("/v1/sync/push")) return Response.json({ results: queue.map(x => ({ op_id: x.op_id, status: "applied" })) });
    return Response.json({ changes: [], cursor: 0 });
  };
  const statuses = [];
  const client = new CloudSessionClient({ baseUrl: "https://cloud.example", licenseBridge: { getCloudAssertion: async () => "assertion-from-existing-license", getDeviceId: async () => "device_12345678901" }, outbox, fetchImpl, onStatus: x => statuses.push(x), isOnline: () => online });
  return { client, queue, removed, calls, statuses };
}

test("offline sync retains queue and never claims connected", async () => {
  const { client } = makeClient({ online: false, results: [{ op_id: "op_123456789012", record_id: "stock_1", base_version: null, payload: { count: 2 } }] });
  const result = await client.manualSync();
  assert.equal(result.state, "offline");
  assert.equal(client.getStatus().state, "offline");
});

test("missing license bridge never reports Cloud connected", async () => {
  const client = new CloudSessionClient({ baseUrl: "", licenseBridge: null, outbox: null, isOnline: () => true });
  const result = await client.manualSync();
  assert.equal(result.state, "not_configured");
  assert.equal(client.getStatus().state, "not_configured");
});

test("online event resumes synchronization and clears only acknowledged queued work", async () => {
  let online = false;
  const { client, removed } = makeClient({ online: true, results: [{ op_id: "op_123456789012", record_id: "stock_1", base_version: null, payload: { count: 2 } }] });
  client.isOnline = () => online;
  const target = new EventTarget();
  const unbind = client.bindAutomaticSync(target);
  online = true;
  target.dispatchEvent(new Event("online"));
  await new Promise(resolve => setTimeout(resolve, 10));
  assert.deepEqual(removed, ["op_123456789012"]);
  unbind();
});

test("license activates Cloud session without account credentials", async () => {
  const { client, calls } = makeClient();
  const status = await client.start();
  assert.equal(status.state, "connected");
  const body = JSON.parse(calls[0][1].body);
  assert.deepEqual(Object.keys(body).sort(), ["device_id", "license_assertion"]);
  assert.equal("email" in body, false);
  assert.equal("password" in body, false);
});

test("successful sync removes only applied operations", async () => {
  const { client, removed } = makeClient({ results: [
    { op_id: "op_123456789012", record_id: "stock_1", base_version: null, payload: { count: 2 } },
    { op_id: "op_223456789012", record_id: "stock_2", base_version: 1, payload: { count: 3 } },
  ] });
  const result = await client.manualSync();
  assert.equal(result.state, "connected");
  assert.deepEqual(removed, ["op_123456789012", "op_223456789012"]);
});

test("conflicted operations remain queued for review", async () => {
  const { client, removed } = makeClient({
    results: [{ op_id: "op_123456789012", record_id: "stock_1", base_version: 1, payload: { count: 2 } }],
    fetchResponses: [
      Response.json({ access_token: "memory-token", expires_at: new Date(Date.now() + 600_000).toISOString(), license_expires_at: "2030-01-01T00:00:00.000Z" }),
      Response.json({ results: [{ op_id: "op_123456789012", status: "conflict", actual_version: 2 }] }),
      Response.json({ changes: [], cursor: 0 }),
    ],
  });
  // Start a fresh session before exercising the conflicting push.
  const result = await client.manualSync();
  assert.equal(result.state, "conflict");
  assert.deepEqual(removed, []);
});

test("a repeated conflict response is not mistaken for a successful duplicate", async () => {
  const { client, removed } = makeClient({
    results: [{ op_id: "op_123456789012", record_id: "stock_1", base_version: 1, payload: { count: 2 } }],
    fetchResponses: [
      Response.json({ access_token: "memory-token", expires_at: new Date(Date.now() + 600_000).toISOString(), license_expires_at: "2030-01-01T00:00:00.000Z" }),
      Response.json({ results: [{ op_id: "op_123456789012", status: "conflict", duplicate: true, actual_version: 2 }] }),
      Response.json({ changes: [], cursor: 0 }),
    ],
  });
  const result = await client.manualSync();
  assert.equal(result.state, "conflict");
  assert.deepEqual(removed, []);
});
