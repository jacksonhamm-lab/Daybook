// Web Push (RFC 8291 payload encryption + RFC 8292 VAPID), written against Web Crypto
// so it runs inside a Worker with no dependencies.

const enc = new TextEncoder();
export const b64url = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
export const unb64url = str => {
  const s = str.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((str.length + 3) % 4);
  return Uint8Array.from(atob(s), c => c.charCodeAt(0));
};
const cat = (...parts) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0; parts.forEach(p => { out.set(p, at); at += p.length; });
  return out;
};
const be32 = n => new Uint8Array([(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255]);

async function hmac(keyBytes, data) {
  const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, data));
}
const hkdfExtract = (salt, ikm) => hmac(salt, ikm);
const hkdfExpand = async (prk, info, len) => (await hmac(prk, cat(info, new Uint8Array([1])))).slice(0, len);

// RFC 8291: encrypt the payload to the subscription's public key.
export async function encryptPayload(sub, text) {
  const uaPublic = unb64url(sub.keys.p256dh);
  const auth = unb64url(sub.keys.auth);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const local = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const asPublic = new Uint8Array(await crypto.subtle.exportKey('raw', local.publicKey));
  const uaKey = await crypto.subtle.importKey('raw', uaPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, local.privateKey, 256));

  const ikm = await hkdfExpand(await hkdfExtract(auth, shared), cat(enc.encode('WebPush: info\0'), uaPublic, asPublic), 32);
  const prk = await hkdfExtract(salt, ikm);
  const cek = await hkdfExpand(prk, enc.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdfExpand(prk, enc.encode('Content-Encoding: nonce\0'), 12);

  const key = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const plain = cat(enc.encode(text), new Uint8Array([2])); // 0x02 = last record delimiter
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, key, plain));
  return cat(salt, be32(4096), new Uint8Array([asPublic.length]), asPublic, ciphertext);
}

// RFC 8292: a signed JWT proving who is sending.
async function vapidHeader(endpoint, env) {
  const aud = new URL(endpoint).origin;
  const jwk = JSON.parse(env.VAPID_PRIVATE_JWK);
  const key = await crypto.subtle.importKey('jwk', { ...jwk, key_ops: ['sign'], ext: true }, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const head = b64url(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const body = b64url(enc.encode(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: env.VAPID_SUBJECT || 'mailto:jackson.hamm@icloud.com' })));
  const sig = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, enc.encode(`${head}.${body}`)));
  return `vapid t=${head}.${body}.${b64url(sig)}, k=${env.VAPID_PUBLIC}`;
}

// Returns true if the subscription is dead and should be dropped.
export async function sendPush(sub, payload, env) {
  try {
    const body = await encryptPayload(sub, JSON.stringify(payload));
    const res = await fetch(sub.endpoint, {
      method: 'POST',
      headers: {
        Authorization: await vapidHeader(sub.endpoint, env),
        'Content-Encoding': 'aes128gcm',
        'Content-Type': 'application/octet-stream',
        TTL: '3600',
        Urgency: 'high',
      },
      body,
    });
    return res.status === 404 || res.status === 410;
  } catch (e) {
    return false;
  }
}
