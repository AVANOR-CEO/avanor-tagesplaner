// Ende-zu-Ende gegen "wrangler dev": Anmelden, Eintrag speichern, Push-Abo auf einen lokalen Fake-Endpunkt, Mitteilung abwarten und entschlüsseln
import http from "node:http";
import crypto from "node:crypto";
import ece from "http_ece";
const BASE = "http://127.0.0.1:8787/api";
const ua = crypto.createECDH("prime256v1"); ua.generateKeys();
const auth = crypto.randomBytes(16);
const got = [];
const srv = http.createServer((req, res) => {
  const chunks = []; req.on("data", c => chunks.push(c)); req.on("end", () => {
    const plain = ece.decrypt(Buffer.concat(chunks), { version: "aes128gcm", privateKey: ua, authSecret: auth.toString("base64url") });
    got.push({ auth: req.headers.authorization.slice(0, 12), body: JSON.parse(plain) }); res.writeHead(201); res.end();
  });
}).listen(9999);
const call = (p, body, m = "POST") => fetch(BASE + p, { method: m, headers: { "content-type": "application/json", "x-key": "geheim123" }, body: body && JSON.stringify(body) }).then(r => r.json());
console.log(await call("/setup", { key: "geheim123" }));
console.log("wrong:", await fetch(BASE + "/state", { headers: { "x-key": "x" } }).then(r => r.status));
const tz = "Europe/Berlin";
const now = new Date(Date.now() + 6 * 60000);
const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now).map(x => [x.type, x.value]));
const date = `${parts.year}-${parts.month}-${parts.day}`, start = `${parts.hour}:${parts.minute}`;
console.log(await call("/doc/m-" + date.slice(0, 7), { items: { t1: { id: "t1", date, kind: "termin", title: "Test-Termin", start } }, done: {} }, "PUT"));
console.log(await call("/subscribe", { subscription: { endpoint: "http://127.0.0.1:9999/push/abc", keys: { p256dh: ua.getPublicKey("base64url"), auth: auth.toString("base64url") } }, tz }));
console.log(await call("/upcoming", undefined, "GET"));
console.log(await call("/test", {}));
const until = Date.now() + 100000;
while (Date.now() < until && got.length < 2) await new Promise(r => setTimeout(r, 2000));
console.log(JSON.stringify(got, null, 1));
srv.close();
