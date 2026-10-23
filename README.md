# AVANOR Tagesplaner

Persönlicher Tagesplaner als installierbare Web-App (iPhone + MacBook) mit echten Push-Mitteilungen.

- `public/` – die App (läuft im Browser, offline-fähig, Icon für den Home-Bildschirm)
- `public/shared.js` – gemeinsame Logik für App und Server (Sprüche, Aufgaben, Vorrat, Mitteilungen)
- `src/worker.js` – Cloudflare Worker + Durable Object: speichert die Daten, plant und verschickt Mitteilungen
- `src/webpush.js` – Web Push (VAPID + Verschlüsselung) ohne externe Bibliothek

## Veröffentlichen (einmalig)

1. Cloudflare-Dashboard → **Workers & Pages** → **Erstellen** → **Repository importieren**.
2. GitHub verbinden und das Repository `avanor-tagesplaner` wählen.
3. Build-Befehl leer lassen, Deploy-Befehl `npx wrangler deploy` → **Speichern und bereitstellen**.

Danach geht jede Änderung auf `main` automatisch live.

## Lokal testen

```
npm install
npm run dev        # App unter http://127.0.0.1:8787
npm test           # prüft die Push-Verschlüsselung
```
