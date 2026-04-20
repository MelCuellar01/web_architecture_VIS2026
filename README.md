# web_architecture_VIS2026

## Braucht eure App SSR/Next.js – oder wäre Vite eigentlich besser geeignet? Begründet anhand von SEO und Interaktivität.

A: Für meine Travel-Diary-App ist Vite aktuell besser geeignet, weil die App vor allem interaktiv ist (z.B. Orte auswählen und Einträge hinzufügen). SEO ist hier nicht so wichtig, da es keine öffentliche Website ist. Next.js wäre erst sinnvoll, wenn Inhalte über Suchmaschinen gefunden werden sollen.

## Resources Design

In der My Travel Diary App gibt es zwei zentrale Ressourcen:

- **places** (Orte)
- **entries** (Tagebucheinträge)

Die fachliche Hierarchie ist **1:n**: Ein `place` kann mehrere `entries` haben, und jeder `entry` gehört genau zu einem `place` (z. B. über `placeId`).

Für die API wird ein **überwiegend flaches Design** verwendet, ergänzt durch gezielte verschachtelte Endpunkte für den Kontext eines Ortes.
Das hält die Standard-CRUD-Operationen einfach, während ortsbezogene Abfragen klar und lesbar bleiben.

**Beispiel-Endpunkte:**

- `GET /places` – alle Orte
- `POST /places` – neuen Ort anlegen
- `GET /places/:placeId` – einen Ort abrufen
- `GET /entries` – alle Einträge
- `POST /entries` – neuen Eintrag anlegen (mit `placeId`)
- `GET /entries/:entryId` – einen Eintrag abrufen
- `GET /places/:placeId/entries` – alle Einträge eines Ortes
- `DELETE /entries/:entryId` – Eintrag löschen

**Kurzbegründung:**
Dieses Design kombiniert gute Wartbarkeit (klare, wiederverwendbare Hauptressourcen) mit semantischer Klarheit bei Beziehungen (`/places/:placeId/entries`). So bleibt die API für Entwicklung, Testing und Dokumentation übersichtlich und konsistent.

## Prompt-Iterationen

### Iteration 1
**Prompt (zu vage):**
"Erstelle eine CRUD-API für entries in Express."

**Problem:**
Die Antwort war funktional, aber unvollständig für die Anforderungen: Statuscodes wurden nicht konsistent definiert (z. B. bei Fehlerfällen), und die gesamte Logik landete in `server.js`. Dadurch wurde der Code schwerer wartbar und schlechter strukturiert.

### Iteration 2
**Prompt (präzise):**
"Implementiere eine vollständige CRUD-API für `entries` mit klaren Statuscodes (200/201/204/400/404) und lagere die Routen in separate Dateien unter `routes/` aus; `server.js` soll nur App-Konfiguration enthalten."

**Verbesserung:**
Die Ergebnisse waren deutlich besser: konsistente Statuscodes, saubere Trennung von Routing und App-Setup sowie eine klarere, modularere Struktur. Damit wurde die API robuster, testbarer und besser für die weitere Erweiterung (z. B. Nested Routes mit `places`) vorbereitet.

