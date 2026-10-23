// Prüft die Verschlüsselung gegen die unabhängige Bibliothek http_ece und die VAPID-Signatur
import assert from "node:assert/strict";
import crypto from "node:crypto";
import ece from "http_ece";
import { encrypt, generateVapid, vapidHeader, b64u } from "../src/webpush.js";

const ua = crypto.createECDH("prime256v1"); ua.generateKeys();
const auth = crypto.randomBytes(16);
const body = await encrypt('{"title":"Hallo Steve"}', b64u.enc(ua.getPublicKey()), b64u.enc(auth));
const plain = ece.decrypt(Buffer.from(body), { version: "aes128gcm", privateKey: ua, authSecret: auth.toString("base64url") });
assert.equal(plain.toString(), '{"title":"Hallo Steve"}');

const vapid = await generateVapid();
const h = await vapidHeader("https://web.push.apple.com/abc", vapid, "https://example.workers.dev");
const [, jwt, k] = h.match(/^vapid t=([^,]+), k=(.+)$/);
const [hd, pl, sig] = jwt.split(".");
assert.equal(JSON.parse(Buffer.from(pl, "base64url")).aud, "https://web.push.apple.com");
const pub = await globalThis.crypto.subtle.importKey("raw", b64u.dec(k), { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
assert.ok(await globalThis.crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, pub, b64u.dec(sig), new TextEncoder().encode(hd + "." + pl)));
console.log("webpush ok");
