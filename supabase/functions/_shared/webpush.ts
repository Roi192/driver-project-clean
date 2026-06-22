// Web Push Protocol (RFC 8291) implementation using Web Crypto API (Deno compatible)

export async function generateVapidAuthHeader(
  endpoint: string,
  vapidPublicKey: string,
  vapidPrivateKey: string,
  subject: string
): Promise<{ authorization: string; cryptoKey: string }> {
  const urlObj = new URL(endpoint);
  const audience = `${urlObj.protocol}//${urlObj.host}`;

  const header = { typ: "JWT", alg: "ES256" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + 12 * 3600,
    sub: subject,
  };

  const headerB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const payloadB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  const privateKeyBytes = base64UrlDecode(vapidPrivateKey);
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    privateKeyBytes,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: { name: "SHA-256" } },
    cryptoKey,
    new TextEncoder().encode(unsignedToken)
  );

  const sigBytes = new Uint8Array(signature);
  const jwt = `${unsignedToken}.${base64UrlEncode(sigBytes)}`;

  return {
    authorization: `vapid t=${jwt}, k=${vapidPublicKey}`,
    cryptoKey: vapidPublicKey,
  };
}

export function base64UrlEncode(buffer: Uint8Array): string {
  let binary = "";
  for (const byte of buffer) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function base64UrlDecode(str: string): Uint8Array {
  const padding = "=".repeat((4 - (str.length % 4)) % 4);
  const base64 = (str + padding).replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function encryptPayload(
  payload: string,
  p256dh: string,
  auth: string
): Promise<{ encrypted: Uint8Array; salt: Uint8Array; localPublicKey: Uint8Array }> {
  const payloadBytes = new TextEncoder().encode(payload);

  const localKeyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  );

  const localPublicKeyRaw = await crypto.subtle.exportKey("raw", localKeyPair.publicKey);

  const subscriberPublicKey = await crypto.subtle.importKey(
    "raw",
    base64UrlDecode(p256dh),
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );

  const sharedSecretBits = await crypto.subtle.deriveBits(
    { name: "ECDH", public: subscriberPublicKey },
    localKeyPair.privateKey,
    256
  );

  const authBytes = base64UrlDecode(auth);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const sharedSecret = new Uint8Array(sharedSecretBits);

  const prkKey = await crypto.subtle.importKey("raw", authBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const prk = new Uint8Array(await crypto.subtle.sign("HMAC", prkKey, sharedSecret));

  const context = createContext(base64UrlDecode(p256dh), new Uint8Array(localPublicKeyRaw));
  const cekInfo = createInfo("aesgcm", context);
  const nonceInfo = createInfo("nonce", context);

  const cek = await hkdfExpand(prk, salt, cekInfo, 16);
  const nonce = await hkdfExpand(prk, salt, nonceInfo, 12);

  const paddingLength = 2;
  const paddedPayload = new Uint8Array(paddingLength + payloadBytes.length);
  paddedPayload[0] = 0;
  paddedPayload[1] = 0;
  paddedPayload.set(payloadBytes, paddingLength);

  const key = await crypto.subtle.importKey("raw", cek, { name: "AES-GCM" }, false, ["encrypt"]);
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: nonce },
    key,
    paddedPayload
  );

  return {
    encrypted: new Uint8Array(encrypted),
    salt,
    localPublicKey: new Uint8Array(localPublicKeyRaw),
  };
}

function createContext(subscriberKey: Uint8Array, localKey: Uint8Array): Uint8Array {
  const label = new TextEncoder().encode("P-256");
  const context = new Uint8Array(5 + 2 + subscriberKey.length + 2 + localKey.length);
  let offset = 0;
  context.set(label, offset);
  offset += label.length;
  context[offset++] = 0;
  context[offset++] = 0;
  context[offset++] = subscriberKey.length;
  context.set(subscriberKey, offset);
  offset += subscriberKey.length;
  context[offset++] = 0;
  context[offset++] = localKey.length;
  context.set(localKey, offset);
  return context;
}

function createInfo(type: string, context: Uint8Array): Uint8Array {
  const label = new TextEncoder().encode(`Content-Encoding: ${type}\0`);
  const info = new Uint8Array(label.length + context.length);
  info.set(label);
  info.set(context, label.length);
  return info;
}

async function hkdfExpand(prk: Uint8Array, salt: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
  const saltKey = await crypto.subtle.importKey("raw", salt, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const extract = new Uint8Array(await crypto.subtle.sign("HMAC", saltKey, prk));

  const extractKey = await crypto.subtle.importKey("raw", extract, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const infoWithCounter = new Uint8Array(info.length + 1);
  infoWithCounter.set(info);
  infoWithCounter[info.length] = 1;
  const expand = new Uint8Array(await crypto.subtle.sign("HMAC", extractKey, infoWithCounter));
  return expand.slice(0, length);
}

export interface PushSubscription {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export async function sendWebPush(
  subscription: PushSubscription,
  payload: string,
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<boolean> {
  try {
    const { encrypted, salt, localPublicKey } = await encryptPayload(
      payload,
      subscription.p256dh,
      subscription.auth
    );

    const { authorization } = await generateVapidAuthHeader(
      subscription.endpoint,
      vapidPublicKey,
      vapidPrivateKey,
      "mailto:admin@bvt-driving.app"
    );

    const response = await fetch(subscription.endpoint, {
      method: "POST",
      headers: {
        Authorization: authorization,
        "Content-Type": "application/octet-stream",
        "Content-Encoding": "aesgcm",
        Encryption: `salt=${base64UrlEncode(salt)}`,
        "Crypto-Key": `dh=${base64UrlEncode(localPublicKey)}`,
        TTL: "86400",
        Urgency: "high",
      },
      body: encrypted,
    });

    if (response.status === 201 || response.status === 200) {
      console.log(`Push sent successfully to ${subscription.endpoint.substring(0, 50)}...`);
      return true;
    }

    if (response.status === 410 || response.status === 404) {
      console.log(`Subscription expired/invalid: ${subscription.endpoint.substring(0, 50)}...`);
      return false;
    }

    const errorText = await response.text();
    console.error(`Push failed (${response.status}): ${errorText}`);
    return false;
  } catch (error) {
    console.error("Error sending web push:", error);
    return false;
  }
}
