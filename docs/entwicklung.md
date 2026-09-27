# Entwicklung

Anleitung für alle, die an Formkurve weiterarbeiten. Einen Überblick über den Aufbau gibt [Architektur](architektur.md).

## Einrichtung

```bash
git clone https://github.com/imer-95/fitness.git
cd fitness
npm install
npx expo start
```

Empfohlen: Node.js 22, Visual Studio Code mit den Erweiterungen **ESLint** und **Prettier** (Formatieren beim Speichern).

## Befehle

| Befehl                  | Zweck                                                                                            |
| ----------------------- | ------------------------------------------------------------------------------------------------ |
| `npm start`             | Entwicklungsserver (Expo Go, Simulator, Web)                                                     |
| `npm run ios`           | Start im iOS-Simulator (macOS mit Xcode)                                                         |
| `npm run android`       | Start im Android-Emulator oder auf einem per USB verbundenen Gerät                               |
| `npm run web`           | Web-Vorschau                                                                                     |
| `npm test`              | alle Tests (Jest)                                                                                |
| `npx jest notes`        | nur Tests, deren Dateiname „notes“ enthält                                                       |
| `npx jest --watch`      | Tests bei jeder Änderung erneut ausführen                                                        |
| `npm run typecheck`     | TypeScript-Prüfung (`tsc --noEmit`)                                                              |
| `npm run lint`          | ESLint inkl. React-Hooks- und React-Compiler-Regeln                                              |
| `npm run format`        | alle Dateien mit Prettier formatieren                                                            |
| `npm run format:check`  | prüfen, ob alles formatiert ist                                                                  |
| `npm run check`         | Typen, Lint, Formatierung, Rechtsseiten und Tests – **vor jedem Commit**                         |
| `npm run legal:pages`   | Webseiten der Rechtstexte in `docs/legal` neu erzeugen                                           |
| `npm run legal:check`   | prüfen, ob die Webseiten zu `src/legal/content.ts` passen                                        |
| `npm run release:check` | wie `check`, bricht zusätzlich bei Platzhaltern im Impressum ab – **vor jeder Veröffentlichung** |

## Tests

Die Tests liegen in [`src/__tests__`](../src/__tests__) und laufen mit `jest-expo`:

| Datei                   | Inhalt                                                                                                                                                                                                         |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `notes.test.ts`         | Notizen-Parser und -Formatierer, Namensabgleich, Schätzung von Muskelgruppe und Gerät. Grundlage ist der Originaltext aus der Notizen-App ([`fixtures/userNotes.ts`](../src/__tests__/fixtures/userNotes.ts)). |
| `domain.test.ts`        | Berechnungen: 1RM, Volumen, Rekorde, Steigerungs-Tipp, Scheiben, Trend, Prognose, BMI, Kalorienbedarf, Makros, MET, Formatierung, Datumslogik                                                                  |
| `openFoodFacts.test.ts` | Umwandlung von Open-Food-Facts-Produkten, EAN-Prüfziffer                                                                                                                                                       |
| `db.test.ts`            | Migrationen, Startdaten, alle Repositories, Import der Notizen, Statistiken, Backup/Wiederherstellung, CSV-Export, Beispieldaten                                                                               |
| `pro.test.ts`           | Pro-Funktionen, Planlimit, Abrechnungszeiträume, Tarife aus Google-Play- und App-Store-Daten, Ersparnis, Berechtigung, Offline-Cache                                                                           |
| `legal.test.ts`         | Pflichtangaben in Impressum, Datenschutzerklärung und Nutzungsbedingungen, Erkennung von Links und Platzhaltern                                                                                                |

Die Datenbanktests verwenden sql.js mit einer In-Memory-Datenbank
([`helpers/testDb.ts`](../src/__tests__/helpers/testDb.ts)). Migrationen, Startdaten und SQL laufen dadurch genau wie
auf dem Gerät.

## Konventionen

- **Sprache**: Alle Texte in der App sind Deutsch und duzen. Code, Bezeichner und Kommentare sind Englisch.
- **Zahlen und Datum**: immer über [`domain/format.ts`](../src/domain/format.ts) und
  [`domain/dates.ts`](../src/domain/dates.ts) – deutsches Komma (`formatNumber`, `parseDecimal`), Kalendertage als
  lokale `DateKey` (`YYYY-MM-DD`), Zeitpunkte in Millisekunden.
- **Einheiten**: Gewicht in kg, Dauer in Sekunden, Distanz in km, Energie in kcal, Wasser in ml.
- **Fachlogik** gehört nach `src/domain` (rein, ohne React/Datenbank) und bekommt einen Test.
- **Datenzugriff** nur über Repositories in `src/db/repos`. Jeder Schreibzugriff ruft `emitChange(...)` mit den
  betroffenen Bereichen auf, damit `useQuery` die Anzeigen aktualisiert.
- **Oberfläche**: Farben und Abstände aus `useTheme()` bzw. [`ui/theme.ts`](../src/ui/theme.ts) – so funktionieren helles
  und dunkles Design automatisch. Wiederverwendbare Bausteine gehören nach `src/ui`, fachliche nach `src/components`.
- **React Compiler** ist aktiv: `useMemo`/`useCallback` sind meist unnötig. Die Lint-Regeln verlangen reine
  Render-Funktionen – kein `setState` in Effekten, kein `Date.now()` beim Rendern (stattdessen
  [`useNow`](../src/hooks/useNow.ts)); Formulare, die sich bei neuen Daten zurücksetzen sollen, bekommen einen `key`.
- **Imports** innerhalb von `src` über den Alias `@/…`.
- **Formatierung**: Prettier (einfache Anführungszeichen, 120 Zeichen pro Zeile, abschließende Kommas).

## Neue Übungen oder Lebensmittel

Eingebaute Übungen stehen in [`src/db/seed/exercises.ts`](../src/db/seed/exercises.ts), Lebensmittel in
[`src/db/seed/foods.ts`](../src/db/seed/foods.ts).

1. Eintrag ergänzen. Die `id` (z. B. `ex-lat-pulldown`, `food-skyr`) ist dauerhaft und darf später nie geändert werden.
   - Übungen: Muskelgruppe, Gerät, optional sekundäre Muskeln, Erfassung, „pro Seite“, Stange, einseitig, Pausenzeit
     und **alternative Namen** – am besten die Namen, die im Studio oder in Notizen üblich sind.
   - Lebensmittel: Nährwerte pro 100 g bzw. 100 ml, optional Portionsgröße und -bezeichnung.
2. `SEED_VERSION` in [`src/db/seed/index.ts`](../src/db/seed/index.ts) um 1 erhöhen. Bestehende Installationen ergänzen
   die neuen Einträge beim nächsten Start (`INSERT OR IGNORE` – vorhandene Einträge und Änderungen bleiben unberührt).
3. `npm test` – die Tests prüfen eindeutige IDs und plausible Werte.

## Datenbankschema ändern

1. In [`src/db/migrations.ts`](../src/db/migrations.ts) **einen neuen Eintrag anhängen** (z. B.
   `ALTER TABLE workouts ADD COLUMN rating INTEGER;`). Bestehende Einträge niemals ändern – sie sind auf den Geräten
   bereits ausgeführt worden. `SCHEMA_VERSION` ergibt sich automatisch aus der Anzahl.
2. Typen in `src/domain/types.ts` und das Repository anpassen.
3. Neue Tabellen in `BACKUP_TABLES` ([`backup.ts`](../src/db/repos/backup.ts)) in Fremdschlüssel-Reihenfolge und – falls
   Anzeigen darauf reagieren sollen – in [`events.ts`](../src/db/events.ts) ergänzen. Neue Spalten übernimmt das Backup
   automatisch.
4. Test in `db.test.ts` ergänzen.

## Neue Bildschirme

1. Datei in `src/app` anlegen – der Pfad ist die Route (z. B. `src/app/body/steps.tsx` → `/body/steps`).
2. Titel und Darstellung (z. B. `presentation: 'modal'`) in [`src/app/_layout.tsx`](../src/app/_layout.tsx) eintragen.
3. Grundgerüst: `Screen` aus `@/ui/Screen`, Daten mit `useQuery`, Navigation mit `router.push('/…')` (Routen sind
   typisiert).

## Web-Vorschau

`npm run web` startet die App im Browser. Die Datenbank läuft dort mit [sql.js](https://sql.js.org) und wird in
IndexedDB gespeichert. [`metro.config.js`](../metro.config.js) leitet Node-Module, die sql.js nur in Node benötigt, auf
ein leeres Modul um. Für eine statische Version:

```bash
npx expo export --platform web --output-dir dist
npx serve dist          # oder ein beliebiger anderer statischer Webserver
```

### Beispieldaten in der Web-Vorschau

Zum Ausprobieren und für Screenshots gibt es Beispieldaten: neun Wochen Krafttraining nach drei Plänen, Cardio, 70 Tage
Gewichtsverlauf, Körpermaße sowie zwölf Tage Ernährung und Wasser. In der Browser-Konsole:

```js
await window.__formkurveDemo();
location.reload();
```

Die Funktion wird nur im Web registriert ([`src/dev/registerDemo.web.ts`](../src/dev/registerDemo.web.ts)); die
iOS- und Android-Apps enthalten keine Beispieldaten. Zurücksetzen: Profil → Backup, Export & Wiederherstellung → Alle
Daten löschen.

### Screenshots erstellen

Die Screenshots in [`docs/screenshots`](screenshots) entstehen automatisiert mit [Playwright](https://playwright.dev)
aus der statischen Web-Version:

```js
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 }, // iPhone-Größe
    deviceScaleFactor: 2,
    locale: 'de-DE',
    timezoneId: 'Europe/Berlin',
  });
  await page.goto('http://localhost:3000');
  await page.getByText('Überspringen').click();
  await page.evaluate(() => window.__formkurveDemo());
  await page.reload();
  await page.screenshot({ path: 'docs/screenshots/heute.jpg', quality: 80 });
  await browser.close();
})();
```

## Pro-Funktionen entwickeln und testen

- Neue Pro-Funktion: in `PRO_FEATURES` ([`src/domain/pro.ts`](../src/domain/pro.ts)) eintragen (erscheint dann in der
  Paywall), ein Symbol in `PRO_FEATURE_ICONS` ergänzen und im Bildschirm `useIsPro()` bzw. `requirePro('…')` verwenden.
  Für gesperrte Bereiche gibt es `<ProTeaser feature="…" />`.
- **Pro simulieren**: In Entwicklungs-Builds und in der Web-Vorschau hat die Paywall (`/pro`) einen Schalter „Pro
  simulieren“.
- **Beispiel-Tarife** in der Web-Vorschau (für Screenshots der Paywall): Paywall öffnen und in der Konsole
  `window.__formkurveDemoPlans()` aufrufen.
- **Echte Testkäufe** nur mit einem Build aus dem internen Test-Track und einem Lizenztest-Konto (siehe
  [Monetarisierung](monetarisierung-und-recht.md#2-google-play-schritt-für-schritt)).

## Rechtstexte ändern

1. Text in [`src/legal/content.ts`](../src/legal/content.ts) ändern und `LEGAL_UPDATED` anpassen.
2. `npm run legal:pages` ausführen und die geänderten Dateien in `docs/legal` mit committen.
3. Die CI schlägt fehl, wenn Schritt 2 vergessen wurde.

## Continuous Integration

[`.github/workflows/ci.yml`](../.github/workflows/ci.yml) läuft bei jedem Push und Pull Request:

1. `npm ci`
2. `npm run typecheck`
3. `npm run lint`
4. `npm run format:check`
5. `npm run legal:check` – sind die Webseiten der Rechtstexte aktuell?
6. `npm test -- --ci`
7. `npx expo export` für iOS, Android und Web – stellt sicher, dass sich die App für alle Plattformen bündeln lässt.

## Abhängigkeiten aktualisieren

- `npx expo install <paket>` statt `npm install`, damit die zur Expo-SDK passende Version installiert wird.
- `npx expo install --check` bzw. `--fix` prüft und korrigiert Versionen, `npx expo-doctor` prüft das Projekt.
- SDK-Upgrade: `npx expo install expo@latest`, danach `npx expo install --fix`, Changelog von Expo lesen, `npm run check`
  und die App auf beiden Plattformen testen.

## Fehlersuche

| Problem                                      | Lösung                                                                    |
| -------------------------------------------- | ------------------------------------------------------------------------- |
| alte Version wird angezeigt, seltsame Fehler | Metro-Cache leeren: `npx expo start -c`                                   |
| Lint meldet React-Compiler-Fehler            | Hinweis lesen: meist `setState` im Effekt oder unreine Werte beim Rendern |
| Datenbank in der Web-Vorschau zurücksetzen   | Browser-Entwicklertools → Anwendung → IndexedDB `formkurve` löschen       |
| Tests beeinflussen sich gegenseitig          | jeder Test sollte mit `setupTestDb()` eine frische Datenbank anlegen      |
