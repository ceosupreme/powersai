/** Stop reading as soon as the real byte limit is exceeded, even for chunked bodies. */
export async function readBoundedWebhookBody(req: Request, maxBytes = 131_072): Promise<Uint8Array | null> {
  if (Number(req.headers.get("content-length") ?? 0) > maxBytes) {
    void req.body?.cancel().catch(() => {});
    return null;
  }
  const reader = req.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > maxBytes) {
        // Cancellation can wait for the peer; do not delay the rejection for it.
        void reader.cancel().catch(() => {});
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return bytes;
}

/** Verify the signed raw bytes; malformed or stale timestamps fail closed. */
export async function verifySvix(secret: string, req: Request, body: string | Uint8Array, now = Date.now()): Promise<boolean> {
  const id = req.headers.get("svix-id");
  const ts = req.headers.get("svix-timestamp");
  const sigs = req.headers.get("svix-signature");
  if (!id || !ts || !sigs || !/^\d+$/.test(ts)) return false;
  const timestamp = Number(ts);
  if (!Number.isSafeInteger(timestamp) || Math.abs(now / 1000 - timestamp) > 300) return false;
  try {
    const keyBytes = Uint8Array.from(atob(secret.replace(/^whsec_/, "")), (c) => c.charCodeAt(0));
    const key = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
    const prefix = new TextEncoder().encode(`${id}.${ts}.`);
    const bodyBytes = typeof body === "string" ? new TextEncoder().encode(body) : body;
    const payload = new Uint8Array(prefix.length + bodyBytes.length);
    payload.set(prefix);
    payload.set(bodyBytes, prefix.length);
    for (const signature of sigs.split(" ")) {
      const [version, encoded] = signature.split(",");
      if (version !== "v1" || !encoded) continue;
      try {
        const bytes = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));
        if (await crypto.subtle.verify("HMAC", key, bytes, payload)) return true;
      } catch { /* One malformed candidate must not hide a valid rotated signature. */ }
    }
  } catch { return false; }
  return false;
}
