/**
 * License-bound Cloud client. It deliberately stores access tokens only in
 * process memory. The app supplies its existing AppForge license bridge and
 * encrypted local outbox; no Cloud account, email, password, or organization
 * form is needed. This module registers no service worker and creates no PWA.
 */
export class CloudSessionClient {
  constructor({ baseUrl, licenseBridge, outbox, applyRemoteChanges, fetchImpl = fetch, onStatus = () => {}, isOnline = () => navigator.onLine }) {
    this.baseUrl = String(baseUrl || "").replace(/\/$/, "");
    this.licenseBridge = licenseBridge;
    this.outbox = outbox;
    this.applyRemoteChanges = applyRemoteChanges || (async () => {});
    this.fetchImpl = fetchImpl;
    this.onStatus = onStatus;
    this.isOnline = isOnline;
    this.session = null;
    this.status = { state: "not_configured", message: "Cloud is not configured." };
  }

  setStatus(state, detail = {}) {
    this.status = { ...this.status, ...detail, state, updatedAt: new Date().toISOString() };
    this.onStatus({ ...this.status });
  }

  getStatus() { return { ...this.status }; }

  async start() {
    if (!this.baseUrl || !this.licenseBridge?.getCloudAssertion || !this.licenseBridge?.getDeviceId || !this.outbox) {
      this.setStatus("not_configured", { message: "AppForge license access is not configured. No Cloud login is required." });
      return this.getStatus();
    }
    if (!this.isOnline()) {
      this.setStatus("offline", { message: "Offline. Local changes stay queued on this device." });
      return this.getStatus();
    }
    try {
      await this.obtainSession(false);
      this.setStatus("connected", { message: "Cloud session verified.", licenseExpiresAt: this.session.license_expires_at, tokenExpiresAt: this.session.expires_at, lastError: null });
      return this.getStatus();
    } catch (error) {
      this.session = null;
      this.setStatus("error", { message: safeMessage(error), lastError: safeMessage(error) });
      return this.getStatus();
    }
  }

  async obtainSession(renew = true) {
    if (!this.isOnline()) throw new Error("Offline; Cloud session will be checked when the network returns.");
    const assertion = await this.licenseBridge.getCloudAssertion();
    const deviceId = await this.licenseBridge.getDeviceId();
    if (!assertion || !deviceId) throw new Error("No active Cloud-eligible license is available on this device.");
    const endpoint = renew ? "/v1/cloud/session/renew" : "/v1/cloud/session";
    const response = await this.fetchImpl(this.baseUrl + endpoint, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ license_assertion: assertion, device_id: deviceId }),
      cache: "no-store",
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || typeof result.access_token !== "string") throw new Error(result.message || "Cloud access could not be verified.");
    this.session = result; // In-memory only; never persist the access token.
    return result;
  }

  async bearer() {
    const expires = Date.parse(this.session?.expires_at || "");
    if (!this.session || !Number.isFinite(expires) || expires - Date.now() < 60_000) await this.obtainSession(true);
    return this.session.access_token;
  }

  async manualSync() {
    if (!this.baseUrl || !this.licenseBridge?.getCloudAssertion || !this.licenseBridge?.getDeviceId || !this.outbox) {
      this.setStatus("not_configured", { message: "AppForge license access or protected local storage is not configured. No Cloud login is required." });
      return { state: "not_configured", pushed: 0, conflicts: 0 };
    }
    if (!this.isOnline()) {
      this.setStatus("offline", { message: "Offline. Changes are retained in the local queue." });
      return { state: "offline", pushed: 0, conflicts: 0 };
    }
    this.setStatus("syncing", { message: "Checking license and synchronizing queued changes…" });
    let pushed = 0, conflicts = 0;
    try {
      if (!this.session) await this.obtainSession(false);
      const batch = await this.outbox.peek(25);
      if (batch.length) {
        const pushRequest = async () => this.fetchImpl(this.baseUrl + "/v1/sync/push", {
          method: "POST", headers: { authorization: `Bearer ${await this.bearer()}`, "content-type": "application/json" },
          body: JSON.stringify({ operations: batch }), cache: "no-store",
        });
        let response = await pushRequest();
        if (response.status === 401) {
          this.session = null;
          await this.obtainSession(true);
          response = await pushRequest();
        }
        const result = await response.json().catch(() => ({}));
        if (response.status === 401) {
          this.session = null;
          throw new Error("Cloud session could not be renewed. Local data remains queued.");
        }
        if (!response.ok) throw new Error(result.message || "Synchronization failed.");
        for (const item of result.results || []) {
          if (item.status === "applied") { await this.outbox.remove(item.op_id); pushed++; }
          else if (item.status === "conflict") conflicts++;
        }
      }
      const cursor = await this.outbox.getCursor();
      const pull = await this.fetchImpl(`${this.baseUrl}/v1/sync/pull?cursor=${encodeURIComponent(cursor)}`, {
        headers: { authorization: `Bearer ${await this.bearer()}` }, cache: "no-store",
      });
      const pulled = await pull.json().catch(() => ({}));
      if (!pull.ok) throw new Error(pulled.message || "Cloud changes could not be downloaded.");
      if (pulled.changes?.length) await this.applyRemoteChanges(pulled.changes);
      if (Number.isSafeInteger(pulled.cursor)) await this.outbox.setCursor(pulled.cursor);
      this.setStatus("connected", { message: conflicts ? `${conflicts} conflict(s) need review.` : "Cloud synchronized.", lastSyncAt: new Date().toISOString(), pendingCount: await this.outbox.count(), licenseExpiresAt: this.session?.license_expires_at, lastError: null });
      return { state: conflicts ? "conflict" : "connected", pushed, conflicts };
    } catch (error) {
      const message = safeMessage(error);
      const pendingCount = this.outbox ? await this.outbox.count().catch(() => null) : null;
      this.setStatus("error", { message, lastError: message, pendingCount });
      return { state: "error", pushed, conflicts, message };
    }
  }

  bindAutomaticSync(target = globalThis) {
    const onOnline = () => { void this.manualSync(); };
    const onActivated = () => { this.session = null; void this.start().then(() => this.manualSync()); };
    target.addEventListener?.("online", onOnline);
    target.addEventListener?.("appforge:license-activated", onActivated);
    return () => {
      target.removeEventListener?.("online", onOnline);
      target.removeEventListener?.("appforge:license-activated", onActivated);
    };
  }
}

function safeMessage(error) {
  const value = String(error?.message || "Cloud operation failed.");
  return value.replace(/Bearer\s+\S+/gi, "Bearer [redacted]").slice(0, 240);
}
