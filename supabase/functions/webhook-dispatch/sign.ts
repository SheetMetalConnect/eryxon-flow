// X-Eryxon-Signature: t=<unix seconds>,v1=<hex HMAC-SHA256(secret, `${t}.${body}`)>
export async function signWebhook(secret: string, body: string, timestamp = Math.floor(Date.now() / 1000)): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}.${body}`));
  const hex = Array.from(new Uint8Array(mac), (b) => b.toString(16).padStart(2, "0")).join("");
  return `t=${timestamp},v1=${hex}`;
}

const PRIVATE_HOST = /^(localhost|.*\.local|.*\.internal|127\..*|10\..*|192\.168\..*|169\.254\..*|172\.(1[6-9]|2\d|3[01])\..*|0\.0\.0\.0|\[?::1\]?|\[?fc[0-9a-f]{2}:.*|\[?fd[0-9a-f]{2}:.*|\[?fe80:.*)$/i;

// Hosted instances must not be turned into a scanner of the operator's private network.
export function isAllowedTarget(url: string, allowPrivate: boolean): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && (allowPrivate || !PRIVATE_HOST.test(parsed.hostname));
  } catch {
    return false;
  }
}
