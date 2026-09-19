// X-Eryxon-Signature: t=<unix seconds>,v1=<hex HMAC-SHA256(secret, `${t}.${body}`)>
export async function signWebhook(secret: string, body: string, timestamp = Math.floor(Date.now() / 1000)): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}.${body}`));
  const hex = Array.from(new Uint8Array(mac), (b) => b.toString(16).padStart(2, "0")).join("");
  return `t=${timestamp},v1=${hex}`;
}

function isPrivateHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");

  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host === "::" ||
    host === "::1" ||
    host.startsWith("::ffff:") ||
    /^(fc|fd|fe[89ab])/i.test(host)
  ) {
    return true;
  }

  const octets = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)?.slice(1).map(Number);
  if (!octets || octets.some((octet) => octet > 255)) return false;

  const [first, second] = octets;
  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 0) ||
    (first === 192 && second === 168) ||
    (first === 198 && (second === 18 || second === 19)) ||
    first >= 224
  );
}

// Hosted instances must not be turned into a scanner of the operator's private network.
export function isAllowedTarget(url: string, allowPrivate: boolean): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && (allowPrivate || !isPrivateHost(parsed.hostname));
  } catch {
    return false;
  }
}
