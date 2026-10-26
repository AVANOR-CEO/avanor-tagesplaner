import { DurableObject } from "cloudflare:workers";
import { model, addDays } from "../public/shared.js";
import { generateVapid, sendPush } from "./webpush.js";

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

const DOC_ID = /^[\w.-]{1,40}$/;

// Einmalige Einträge, die Claude für Steve vornimmt (jeder Satz wird genau einmal angewendet)
const SEEDS = [
  { id: "seed-2026-10-26",
    away: [
      { id: "s1028", type: "frei", from: "2026-10-28", to: "2026-10-28", note: "" },
      { id: "s1101", type: "frei", from: "2026-11-01", to: "2026-11-01", note: "Denken Sie heute ans Packen für den Urlaub!" },
      { id: "s1102", type: "urlaub", from: "2026-11-02", to: "2026-11-15", note: "" },
    ],
    items: [
      { id: "s1101pack", date: "2026-11-01", start: "11:00", end: "", kind: "aufgabe", title: "Für den Urlaub packen", note: "Koffer packen, Ladekabel, Nasenpflaster & Mundtapes einpacken", done: false },
    ] },
];

async function sha(text) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("avanor:" + text));
  return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, "0")).join("");
}

/* Zeitzonen: Datum + Minute in Steves Zeitzone <-> UTC-Zeitstempel */
function partsInTz(ts, tz) {
  const f = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const p = Object.fromEntries(f.formatToParts(new Date(ts)).map(x => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, min: Number(p.hour) * 60 + Number(p.minute) };
}
function offsetMin(ts, tz) {
  const p = partsInTz(ts, tz);
  const [y, m, d] = p.date.split("-").map(Number);
  return Math.round((Date.UTC(y, m - 1, d, 0, p.min) - Math.floor(ts / 60000) * 60000) / 60000);
}
export function localToUtc(date, min, tz) {
  const [y, m, d] = date.split("-").map(Number);
  const guess = Date.UTC(y, m - 1, d, 0, min);
  let ts = guess - offsetMin(guess, tz) * 60000;
  const off2 = offsetMin(ts, tz);
  return guess - off2 * 60000;
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname.startsWith("/api/")) return env.PLANNER.get(env.PLANNER.idFromName("steve")).fetch(req);
    return env.ASSETS.fetch(req);
  },
  // Sicherheitsnetz: jede Minute nachsehen, ob etwas fällig ist (falls ein Alarm ausfällt)
  async scheduled(event, env) {
    await env.PLANNER.get(env.PLANNER.idFromName("steve")).tick();
  },
};

/* Ein einziges Objekt hält Steves Daten, Push-Abos und den Zeitplan der Mitteilungen */
export class Planner extends DurableObject {
  async fetch(req) {
    try { return await this.route(req); }
    catch (e) { return json({ error: String((e && e.message) || e) }, 500); }
  }

  async route(req) {
    const url = new URL(req.url), p = url.pathname, m = req.method, st = this.ctx.storage;

    if (p === "/api/status") return json({ configured: !!(await st.get("auth")), vapidPublicKey: (await this.vapid()).publicKey });

    if (p === "/api/setup" && m === "POST") {
      const { key } = await req.json();
      if (!key || String(key).length < 4) return json({ error: "Das Passwort braucht mindestens 4 Zeichen." }, 400);
      const saved = await st.get("auth"), h = await sha(key);
      if (saved && saved !== h) return json({ error: "Falsches Passwort." }, 403);
      if (!saved) await st.put("auth", h);
      return json({ ok: true, created: !saved });
    }

    await this.seed();
    const saved = await st.get("auth");
    if (!saved || saved !== (await sha(req.headers.get("x-key") || ""))) return json({ error: "Nicht angemeldet." }, 401);

    if (p === "/api/state") return json({ docs: await this.docs(), version: (await st.get("version")) || 0 });

    if (p.startsWith("/api/doc/") && m === "PUT") {
      const id = decodeURIComponent(p.slice(9));
      if (!DOC_ID.test(id)) return json({ error: "Ungültige Kennung." }, 400);
      await st.put("doc:" + id, await req.json());
      return json({ version: await this.changed() });
    }

    if (p === "/api/import" && m === "POST") {
      const { docs } = await req.json();
      let n = 0;
      for (const [id, data] of Object.entries(docs || {})) {
        if (DOC_ID.test(id) && data && typeof data === "object") { await st.put("doc:" + id, data); n++; }
      }
      return json({ imported: n, version: await this.changed() });
    }

    if (p === "/api/subscribe" && m === "POST") {
      const { subscription, tz } = await req.json();
      if (!subscription || !subscription.endpoint || !subscription.keys) return json({ error: "Abo fehlt." }, 400);
      const subs = ((await st.get("subs")) || []).filter(s => s.endpoint !== subscription.endpoint);
      subs.push({ endpoint: subscription.endpoint, keys: subscription.keys, added: Date.now() });
      await st.put("subs", subs);
      await st.put("origin", url.origin);
      if (tz) await st.put("tz", tz);
      await this.schedule();
      return json({ ok: true, devices: subs.length });
    }

    if (p === "/api/unsubscribe" && m === "POST") {
      const { endpoint } = await req.json();
      const subs = ((await st.get("subs")) || []).filter(s => s.endpoint !== endpoint);
      await st.put("subs", subs);
      return json({ ok: true, devices: subs.length });
    }

    if (p === "/api/tz" && m === "POST") {
      const { tz } = await req.json();
      try { new Intl.DateTimeFormat("de", { timeZone: tz }); } catch { return json({ error: "Unbekannte Zeitzone." }, 400); }
      await st.put("tz", tz);
      await this.schedule();
      return json({ ok: true });
    }

    if (p === "/api/test" && m === "POST") {
      await st.put("origin", url.origin);
      const r = await this.sendAll({ title: "AVANOR Tagesplaner", body: "Mitteilungen funktionieren. Bist du bereit?", key: "test-" + Date.now() });
      return json(r);
    }

    if (p === "/api/upcoming") {
      const subs = (await st.get("subs")) || [];
      const alarm = await st.getAlarm();
      return json({ devices: subs.length, tz: await this.tz(), alarm, log: ((await st.get("log")) || []).slice(-8).reverse(),
        items: (await this.queue()).slice(0, 15).map(n => ({ ts: n.ts, title: n.title })) });
    }

    return json({ error: "Nicht gefunden." }, 404);
  }

  async docs() {
    const out = {};
    for (const [k, v] of await this.ctx.storage.list({ prefix: "doc:" })) out[k.slice(4)] = v;
    return out;
  }
  async seed() {
    const st = this.ctx.storage, done = (await st.get("seeds")) || [];
    let changed = false;
    for (const s of SEEDS.filter(s => !done.includes(s.id))) {
      const away = (await st.get("doc:away")) || { list: [] };
      for (const a of s.away || []) if (!away.list.some(x => x.id === a.id)) away.list.push(a);
      await st.put("doc:away", away);
      for (const it of s.items || []) {
        const k = "doc:m-" + it.date.slice(0, 7), m = (await st.get(k)) || { items: {}, done: {} };
        m.items = m.items || {};
        if (!m.items[it.id]) m.items[it.id] = it;
        await st.put(k, m);
      }
      done.push(s.id); changed = true;
    }
    if (changed) { await st.put("seeds", done); await this.changed(); }
  }
  async tz() { return (await this.ctx.storage.get("tz")) || "Europe/Berlin"; }
  async vapid() {
    let v = await this.ctx.storage.get("vapid");
    if (!v) { v = await generateVapid(); await this.ctx.storage.put("vapid", v); }
    return v;
  }
  async changed() {
    const v = ((await this.ctx.storage.get("version")) || 0) + 1;
    await this.ctx.storage.put("version", v);
    await this.schedule();
    return v;
  }

  // Alle anstehenden Mitteilungen für heute und morgen, die noch nicht verschickt sind
  async queue() {
    const docs = await this.docs(), tz = await this.tz(), now = Date.now();
    const sent = (await this.ctx.storage.get("sent")) || {};
    const today = partsInTz(now, tz).date;
    const M = model((id, def) => docs[id] ?? def, () => partsInTz(Date.now(), tz).date);
    const out = [];
    for (const d of [today, addDays(today, 1)]) {
      for (const n of M.notificationsFor(d)) {
        const ts = localToUtc(d, n.min, tz);
        if (ts > now - 120000 && !sent[n.key]) out.push({ ...n, ts });
      }
    }
    return out.sort((a, b) => a.ts - b.ts);
  }

  async schedule() {
    const subs = (await this.ctx.storage.get("subs")) || [];
    if (!subs.length) { await this.ctx.storage.deleteAlarm(); return; }
    const q = await this.queue(), now = Date.now();
    // Ohne anstehende Mitteilung trotzdem kurz nach Mitternacht neu planen
    const tz = await this.tz(), tomorrow = addDays(partsInTz(now, tz).date, 1);
    const next = q.length ? Math.max(q[0].ts, now + 1000) : localToUtc(tomorrow, 5, tz);
    await this.ctx.storage.setAlarm(next);
  }

  async alarm() { await this.tick(); }

  // Fällige Mitteilungen verschicken; Fehler werden protokolliert, der Zeitplan läuft trotzdem weiter
  async tick() {
    const now = Date.now(), st = this.ctx.storage;
    try { await this.seed(); } catch (e) { await this.log("Fehler", String((e && e.message) || e)); }
    try {
      const sent = (await st.get("sent")) || {};
      for (const n of (await this.queue()).filter(n => n.ts <= now + 20000)) {
        if (sent[n.key]) continue;
        sent[n.key] = now;
        await st.put("sent", sent);
        const r = await this.sendAll({ title: n.title, body: n.body, key: n.key });
        await this.log(n.title, r.statuses.join(",") || "kein Gerät");
      }
      for (const [k, t] of Object.entries(sent)) if (t < now - 3 * 864e5) delete sent[k];
      await st.put("sent", sent);
    } catch (e) {
      await this.log("Fehler", String((e && e.message) || e));
    }
    try { await this.schedule(); } catch (e) { await st.setAlarm(now + 60000); }
  }

  async log(title, result) {
    const l = ((await this.ctx.storage.get("log")) || []).slice(-29);
    l.push({ ts: Date.now(), title, result });
    await this.ctx.storage.put("log", l);
  }

  async sendAll(payload) {
    const st = this.ctx.storage, vapid = await this.vapid();
    const subject = (await st.get("origin")) || "https://avanor-tagesplaner.workers.dev";
    const subs = (await st.get("subs")) || [], keep = [];
    let ok = 0;
    const statuses = [];
    for (const s of subs) {
      let status = 0;
      try { status = await sendPush(s, payload, vapid, subject); } catch { status = 0; }
      statuses.push(status);
      if (status >= 200 && status < 300) ok++;
      if (status !== 404 && status !== 410) keep.push(s);
    }
    if (keep.length !== subs.length) await st.put("subs", keep);
    return { sent: ok, devices: keep.length, statuses };
  }
}
