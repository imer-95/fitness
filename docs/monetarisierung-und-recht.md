# Geld verdienen mit Formkurve: Play Store, Pro-Abo, Datenschutz, Impressum und Steuern

Dieses Dokument erklärt, was du als Privatperson in Deutschland beachten musst, wenn du Formkurve im Google Play Store
kostenlos anbietest und zusätzliche Funktionen über ein Abo („Formkurve Pro“, ca. 5 € im Monat) verkaufst. Außerdem
beschreibt es, was dafür bereits in der App umgesetzt ist.

> **Wichtig:** Das sind allgemeine Informationen mit Stand September 2026, keine Rechts- oder Steuerberatung. Gesetze,
> Grenzwerte und Store-Regeln ändern sich. Lass dir vor dem Start von einer Steuerberaterin oder einem Steuerberater
> (ein Erstgespräch reicht oft) und für die Rechtstexte von einer Anwältin bzw. einem Anwalt oder einem seriösen
> Rechtstext-Generator bestätigen, dass alles zu deiner Situation passt.

## Checkliste

| #   | Schritt                                                                                                  | Wann                          |
| --- | -------------------------------------------------------------------------------------------------------- | ----------------------------- |
| 1   | Gewerbe anmelden (Gewerbeamt deiner Stadt, oft online)                                                   | bevor du Geld einnimmst       |
| 2   | „Fragebogen zur steuerlichen Erfassung“ über [ELSTER](https://www.elster.de) abgeben                     | innerhalb eines Monats danach |
| 3   | Arbeitsvertrag prüfen und Nebentätigkeit ggf. beim Arbeitgeber anzeigen                                  | vor dem Start                 |
| 4   | Name, Anschrift, E-Mail und Telefon in `src/legal/content.ts` eintragen, `npm run legal:pages` ausführen | vor der Veröffentlichung      |
| 5   | GitHub Pages aktivieren (Datenschutzerklärung und Impressum im Internet)                                 | vor der Veröffentlichung      |
| 6   | Google-Play-Entwicklerkonto (25 US-$) und Zahlungsprofil einrichten, Händlerstatus angeben               | vor dem ersten Upload         |
| 7   | App anlegen, ersten Build hochladen, Abo `formkurve_pro` anlegen                                         | Einrichtung                   |
| 8   | Geschlossener Test mit mindestens 12 Testern über 14 Tage (neue private Konten)                          | vor der Veröffentlichung      |
| 9   | Store-Eintrag, Datensicherheit, Gesundheits-App-Erklärung, Altersfreigabe ausfüllen                      | vor der Veröffentlichung      |
| 10  | `npm run release:check`, Produktions-Build, einreichen                                                   | Veröffentlichung              |
| 11  | Auszahlungen und Ausgaben sammeln, jährlich EÜR und Steuererklärungen abgeben                            | laufend                       |

## 1. Das Geschäftsmodell: kostenlos mit Pro-Abo

Ja, das ist im Play Store erlaubt und üblich („Freemium“). Wichtig: **Digitale Funktionen innerhalb der App müssen über
das Abrechnungssystem von Google Play verkauft werden** – eigene Zahlungswege wie PayPal-Links sind dafür nicht
erlaubt. Formkurve nutzt deshalb Google Play Billing (bzw. auf dem iPhone StoreKit).

### Was ist kostenlos, was ist Pro?

| Kostenlos                                                                   | Formkurve Pro                                                         |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Trainings eintragen, Pausen-Timer, Rekorde, Verlauf, Notizen-Import, Teilen | **Erweiterte Statistiken** (Fortschritt → Kraft, Cardio, Essen)       |
| Tägliches Gewicht mit Trend, Wochenrate, BMI, 30 Tage/3 Monate Verlauf      | **Langzeit-Gewichtsverlauf** (1 Jahr, alles) und Zielgewicht-Prognose |
| Körpermaße, Cardio, Ernährungstagebuch, Barcode-Scanner, Wasser             | **Entwicklung jeder Übung** (1RM-, Gewichts- und Volumendiagramm)     |
| Bis zu 3 Trainingspläne                                                     | **Unbegrenzt viele Pläne**                                            |
| JSON-Backup und Wiederherstellung                                           | **Steigerungs-Tipps** im Training                                     |
| 1RM- und Scheibenrechner, dunkles Design                                    | **CSV-Export** für Excel                                              |

Die Aufteilung ist bewusst fair: Alles, was man zum Protokollieren braucht, bleibt kostenlos, und das Backup deiner
Daten ist nie hinter einer Bezahlschranke. Ändern lässt sie sich zentral in [`src/domain/pro.ts`](../src/domain/pro.ts)
(`PRO_FEATURES`, `FREE_PLAN_LIMIT`) und an den Stellen, die `useIsPro()` bzw. `requirePro()` verwenden.

### Preis und was bei dir ankommt

Google behält bei Abos **15 %** ein. Preise im Play Store sind Endpreise **inklusive Umsatzsteuer**, die Google in der
EU selbst abführt. Beispiel für Käufe in Deutschland (19 % USt):

| Endpreis       | davon USt | Nettopreis | Google (15 %) | Auszahlung an dich |
| -------------- | --------- | ---------- | ------------- | ------------------ |
| 4,99 € / Monat | 0,80 €    | 4,19 €     | 0,63 €        | **≈ 3,56 €**       |
| 5,00 € / Monat | 0,80 €    | 4,20 €     | 0,63 €        | **≈ 3,57 €**       |
| 39,99 € / Jahr | 6,38 €    | 33,61 €    | 5,04 €        | **≈ 28,56 €**      |

100 zahlende Nutzer mit Monatsabo bringen also rund 356 € im Monat – vor deinen Steuern.

Empfehlungen:

- **4,99 € statt 5,00 €** – wirkt günstiger, der Unterschied bei der Auszahlung ist minimal.
- Zusätzlich ein **Jahresabo** (z. B. 39,99 €, rund 33 % günstiger). Viele Nutzer bevorzugen das, und du hast weniger
  Kündigungen. Die App zeigt automatisch alle Basis-Abos an, die du in der Play Console anlegst, inklusive „Spare 33 %“.
- Optional eine **kostenlose Testphase** (z. B. 7 Tage) für Neukunden. Die App zeigt sie an und schreibt die
  Bedingungen („danach 4,99 € pro Monat, vorher kündbar“) direkt über den Kaufknopf.

Einmalige bzw. laufende Kosten: Google Play 25 US-$ einmalig; optional Apple 99 US-$ pro Jahr; EAS Build ist im
kostenlosen Tarif begrenzt nutzbar; Steuerberatung und ggf. ein Adressservice (siehe unten). Alle diese Kosten sind
Betriebsausgaben.

## 2. Google Play: Schritt für Schritt

1. **Entwicklerkonto** unter [play.google.com/console](https://play.google.com/console) anlegen (25 US-$). Als
   Einzelperson nutzt du ein privates („persönliches“) Konto; ein Organisationskonto ist für Firmen gedacht und braucht
   eine D-U-N-S-Nummer. Google prüft deine Identität mit Ausweis.
2. **Zahlungsprofil** (Händlerkonto) mit Bankverbindung und Steuerangaben einrichten – ohne das kannst du nichts
   verkaufen. Die Auszahlungen kommen monatlich von Google.
3. **Händlerstatus** angeben (EU-Gesetz über digitale Dienste, DSA): Wer über den Store Geld verdient, ist in der Regel
   „Händler“. Google zeigt dann **Name, Anschrift, Telefonnummer und E-Mail öffentlich** im Store-Eintrag an (siehe
   [Abschnitt 4](#4-impressum)).
4. **App anlegen**: Name „Formkurve“, Standardsprache Deutsch, Typ „App“, „Kostenlos“.
5. **Ersten Build hochladen**: `eas build -p android --profile production` erzeugt ein App Bundle (AAB). Den ersten
   Upload musst du einmal von Hand in der Play Console machen (z. B. im Track „Interner Test“); danach geht es mit
   `eas submit -p android`.
6. **Abo anlegen** unter Monetarisieren → Produkte → Abos (erst möglich, wenn ein Build mit Kauf-Berechtigung hochgeladen
   ist – das erledigt Formkurve automatisch):
   - Produkt-ID: **`formkurve_pro`** (muss exakt so heißen, siehe `PRO_PRODUCTS` in `src/domain/pro.ts`), Name
     „Formkurve Pro“.
   - Basis-Abo **`monatlich`**: automatisch verlängernd, 1 Monat, 4,99 €.
   - Optional Basis-Abo **`jaehrlich`**: automatisch verlängernd, 1 Jahr, 39,99 €.
   - Optional ein Angebot „Kostenloser Testzeitraum“ (7 Tage, nur Neukunden).
   - Alles **aktivieren**. Preise für andere Länder schlägt Google automatisch vor.
7. **Käufe testen**: Einstellungen → Lizenztests → deine Google-Adresse eintragen. Mit diesem Konto sind Käufe kostenlos,
   Test-Abos verlängern sich im Minutentakt und enden nach wenigen Verlängerungen. Installiere die App über den Link des
   internen Tests. In Expo Go und in der Web-Vorschau gibt es keine Käufe.
8. **Geschlossener Test**: Neue private Entwicklerkonten müssen die App vor der Veröffentlichung mindestens **14 Tage**
   mit mindestens **12 Testern** (Freunde, Familie) im geschlossenen Test haben. Erst danach kannst du den Zugriff auf
   die Produktion beantragen.
9. **Store-Eintrag**: Kurz- und Langbeschreibung, Screenshots (siehe `docs/screenshots`), App-Symbol 512 × 512 px,
   Vorstellungsgrafik 1024 × 500 px, Kategorie „Gesundheit & Fitness“, Kontakt-E-Mail, Website.
10. **App-Inhalte** (Richtlinien):
    - **Datenschutzerklärung**: `https://imer-95.github.io/fitness/legal/datenschutz.html` (siehe
      [Abschnitt 3](#3-datenschutz-dsgvo)).
    - **Datensicherheit** (Data safety): Die App überträgt Daten nur bei der Produktsuche. Gib nach unserem Verständnis
      an: erhoben wird der „In-App-Suchverlauf“ (Suchbegriffe bzw. Barcodes, die an Open Food Facts gehen), Zweck
      „App-Funktionalität“, freiwillig, verschlüsselt übertragen, nicht zu Werbezwecken, keine Weitergabe. Körper-,
      Trainings- und Ernährungsdaten verlassen das Gerät nicht und gelten deshalb nicht als „erhoben“. Lies beim Ausfüllen
      die Hilfetexte von Google – im Zweifel lieber mehr angeben.
    - **Gesundheits-Apps**: Erklärung ausfüllen (Fitness- und Ernährungs-Tracking, keine medizinische Funktion).
    - **Zielgruppe**: am einfachsten **ab 18 Jahren** – dann gelten die strengeren Regeln für Kinder-Apps nicht.
    - **Werbung**: Nein. **Einstufung**: Fragebogen ausfüllen. **Zugang für Prüfer**: nicht nötig (kein Login).
11. **Produktion**: Nach dem geschlossenen Test Zugriff beantragen, Build hochladen, zur Prüfung einreichen. Die Prüfung
    dauert meist einige Tage.

## 3. Datenschutz (DSGVO)

### Deine Ausgangslage ist sehr gut

Formkurve speichert **alle Daten nur auf dem Gerät**, hat **kein Konto, keinen Server, keine Werbung und kein Tracking**.
Dadurch verarbeitest du die sensiblen Daten deiner Nutzer (Gewicht, Körpermaße, Ernährung – teilweise
Gesundheitsdaten nach Art. 9 DSGVO) gar nicht selbst. Das ist die beste Position, die man als Einzelperson haben kann:
Du brauchst keine Verträge zur Auftragsverarbeitung, keine Serversicherheit, kein Löschkonzept für Nutzerkonten und
keine Datenschutz-Folgenabschätzung für eigene Server.

### Was trotzdem nötig ist

| Thema                                       | Stand                                                                                                |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Datenschutzerklärung (DSGVO + Google Play)  | ✅ in der App (Profil → Rechtliches) und als Webseite; deine Daten eintragen                         |
| Open Food Facts (Barcode/Suchbegriff + IP)  | ✅ in der Datenschutzerklärung beschrieben, nur auf Aktion des Nutzers                               |
| Google Play / App Store (Kauf, Statistiken) | ✅ beschrieben; Google/Apple sind selbst verantwortlich                                              |
| Website (GitHub Pages, Server-Logs)         | ✅ beschrieben; keine Cookies, keine Skripte, keine externen Inhalte                                 |
| Einwilligungen (Cookie-/Tracking-Banner)    | ✅ nicht nötig – es gibt kein Tracking; lokale Speicherung ist für die App erforderlich (§ 25 TDDDG) |
| Anfragen von Nutzern (Auskunft, Löschung)   | Daten liegen beim Nutzer; E-Mails beantworten, innerhalb eines Monats                                |

### Gefahren – und wie du sie vermeidest

- **Neue Dienste ohne Anpassung einbauen.** Firebase, Crashlytics, Google Analytics, Werbe-SDKs, RevenueCat, ein
  Newsletter oder eine Cloud-Synchronisation verändern alles: Dann brauchst du ggf. Einwilligungen, Verträge zur
  Auftragsverarbeitung, Regeln für Übermittlungen in die USA und eine neue Datenschutzerklärung. Solange du das
  nicht brauchst: weglassen.
- **Datenschutzerklärung passt nicht zur App.** Wenn du Funktionen änderst, Text in `src/legal/content.ts` anpassen,
  `LEGAL_UPDATED` aktualisieren und `npm run legal:pages` ausführen. Der CI-Check meldet, wenn die Webseiten veraltet
  sind.
- **Support-E-Mails mit Gesundheitsdaten.** Wenn Nutzer dir Backups oder Screenshots schicken, vertraulich behandeln und
  nach Erledigung löschen.
- **Bußgelder** der Aufsichtsbehörden sind für eine lokal arbeitende App ohne Datensammlung unwahrscheinlich. Häufiger
  sind **Abmahnungen**: Mitbewerber können bei Verstößen gegen Informationspflichten im Internet und – bei weniger als
  250 Mitarbeitern – gegen die DSGVO keine Abmahnkosten verlangen (§ 13 Abs. 4 UWG). Wettbewerbsverbände können aber
  weiterhin abmahnen. Vollständige, korrekte Rechtstexte sind der beste Schutz.

### Dein eigener Datenschutz

Mit Impressum und Händlerstatus werden **dein Name und deine Anschrift öffentlich** – auf der Website, in der App und im
Play Store. Möglichkeiten:

- Eine eigene **E-Mail-Adresse** und **Telefonnummer** nur für die App (z. B. zweite SIM oder Internet-Telefonnummer).
- Eine **Geschäftsadresse** über einen Büro- oder Impressum-Service mit Postweiterleitung (ca. 5–30 € pro Monat). Ein
  reines Postfach reicht nicht, die Anschrift muss „ladungsfähig“ sein, also Post und Schriftstücke zuverlässig
  annehmen. Solche c/o-Adressen sind verbreitet, rechtlich aber nicht völlig unumstritten – den Anbieter sorgfältig
  wählen. Beim Händlerstatus verlangt Google eine überprüfte Anschrift; prüfe beim Einrichten, welche Adresse angezeigt
  wird.

## 4. Impressum

**Brauchst du eins? Ja.** Nach § 5 Digitale-Dienste-Gesetz (DDG, ersetzt seit Mai 2024 das Telemediengesetz) brauchen
geschäftsmäßige digitale Dienste ein Impressum. Sobald du mit der App Geld verdienst, ist sie geschäftsmäßig – auch wenn
du „nur“ nebenbei als Privatperson startest.

**Inhalt:**

- Vor- und Nachname
- Ladungsfähige Anschrift (kein Postfach)
- E-Mail-Adresse und ein zweiter schneller Kontaktweg, am besten eine Telefonnummer
- Umsatzsteuer-Identifikationsnummer bzw. Wirtschafts-Identifikationsnummer – nur, wenn du eine hast
- Nicht nötig: Handelsregister (als Kleingewerbe nicht eingetragen) und der früher übliche Link zur
  EU-Streitschlichtungsplattform (die Plattform wurde im Juli 2025 abgeschaltet). Der Hinweis zur
  Verbraucherschlichtung ist für Unternehmen mit höchstens zehn Beschäftigten freiwillig; er ist enthalten und darf
  bleiben.

**Wo:** leicht erkennbar, unmittelbar erreichbar und ständig verfügbar – in der App unter **Profil → Rechtliches →
Impressum** (zwei Tipps), auf der Website (`https://imer-95.github.io/fitness/legal/impressum.html`) und im Store-Eintrag
(Website-Link bzw. Beschreibung).

**Risiko:** Ein fehlendes oder falsches Impressum kann ein Bußgeld (bis 50.000 €) und Abmahnungen nach sich ziehen.

**Umsetzung in der App:**

1. In [`src/legal/content.ts`](../src/legal/content.ts) `LEGAL_OWNER` ausfüllen (Name, Straße, PLZ/Ort, E-Mail,
   Telefon; `vatId`/`businessId` nur falls vorhanden).
2. `npm run legal:pages` erzeugt die Webseiten in `docs/legal` neu – committen und pushen.
3. `npm run release:check` bricht ab, solange noch Platzhalter wie „[PLZ Ort]“ enthalten sind. Die App zeigt bis dahin
   auf den Rechtsseiten einen gelben Hinweis.

### Website mit GitHub Pages einrichten

Das Repository ist öffentlich, GitHub Pages ist deshalb kostenlos:

1. Auf GitHub: **Settings → Pages → Build and deployment → Source: „Deploy from a branch“**.
2. Branch auswählen (aktuell `claude/fitness-tracking-app-4sfsjv`, nach einer Umbenennung `main`), Ordner **`/docs`**,
   speichern.
3. Nach ein bis zwei Minuten sind die Seiten erreichbar:
   - Startseite mit Dokumentation: `https://imer-95.github.io/fitness/`
   - Datenschutzerklärung: `https://imer-95.github.io/fitness/legal/datenschutz.html`
   - Impressum: `https://imer-95.github.io/fitness/legal/impressum.html`
   - Nutzungsbedingungen: `https://imer-95.github.io/fitness/legal/nutzungsbedingungen.html`

Die Rechtsseiten sind reines HTML ohne Cookies, Skripte oder externe Inhalte.

## 5. Steuern und Gewerbe

### Gewerbe anmelden

Der Verkauf von App-Abos ist eine **gewerbliche Tätigkeit** (auf Dauer angelegt, mit Gewinnabsicht). Melde deshalb
**vor dem ersten Verkauf** ein Gewerbe beim Gewerbeamt deiner Stadt an – meist online, Gebühr etwa 15–60 €. Tätigkeit
z. B.: „Entwicklung und Vertrieb von Software-Anwendungen (Apps)“.

Danach:

- **Fragebogen zur steuerlichen Erfassung** innerhalb eines Monats elektronisch über [ELSTER](https://www.elster.de).
  Dort gibst du deinen geschätzten Umsatz und Gewinn an und wählst die Kleinunternehmerregelung (siehe unten). Du
  bekommst eine Steuernummer für das Gewerbe.
- Automatische Mitgliedschaft in der **IHK**. Kleingewerbetreibende ohne Handelsregistereintrag zahlen bis 5.200 €
  Gewinn im Jahr keinen Beitrag.
- **Nebenberuflich angestellt?** Arbeitsvertrag prüfen (Nebentätigkeiten müssen oft angezeigt werden) und auf
  Wettbewerbsverbote achten. Die Krankenversicherung läuft normalerweise weiter über den Job. Bist du familienversichert,
  Student, Minijobber, in Elternzeit oder beziehst du Arbeitslosengeld bzw. Bürgergeld, gelten Einkommensgrenzen und
  Meldepflichten – vorher bei Krankenkasse bzw. Amt klären.

### Einkommensteuer

- **Gewinn = Einnahmen − Ausgaben.** Einnahmen sind die Auszahlungen von Google (und ggf. Apple). Ausgaben sind z. B. die
  Entwicklerkonten, anteilig Computer, Handy und Internet, Software, Steuerberatung und Adressservice.
- Ermittelt wird der Gewinn mit der **Einnahmen-Überschuss-Rechnung** (Anlage EÜR) und in der Einkommensteuererklärung
  mit der **Anlage G** angegeben. Mit einem Gewerbe musst du in der Regel jedes Jahr eine Einkommensteuererklärung
  abgeben.
- Der Gewinn wird zu deinem übrigen Einkommen (z. B. Gehalt) addiert und mit deinem **persönlichen Steuersatz**
  versteuert. Liegt dein gesamtes zu versteuerndes Einkommen unter dem Grundfreibetrag (2026: 12.348 €), fällt keine
  Einkommensteuer an.
- **Angestellte:** Nebeneinkünfte bis **410 €** im Jahr bleiben steuerfrei, bis 820 € gilt eine Ermäßigung
  (Härteausgleich).
- Bei steigenden Gewinnen setzt das Finanzamt **Vorauszahlungen** fest – lege von Anfang an etwa 30–40 % des Gewinns
  zurück.

### Gewerbesteuer

Für Einzelunternehmer gilt ein **Freibetrag von 24.500 € Gewinn** pro Jahr. Darunter fällt keine Gewerbesteuer an.
Darüber wird sie großteils auf die Einkommensteuer angerechnet.

### Umsatzsteuer

- **Kleinunternehmerregelung** (§ 19 UStG): Lag dein Umsatz im Vorjahr bei höchstens **25.000 €** und liegt er im
  laufenden Jahr bei höchstens **100.000 €**, musst du keine Umsatzsteuer abführen und keine Voranmeldungen abgeben
  (dafür auch keine Vorsteuer abziehen). Wird die 100.000-€-Grenze im laufenden Jahr überschritten, endet die Regelung
  sofort.
- **Besonderheit App-Stores:** Google (und Apple) berechnen und zahlen die Umsatzsteuer gegenüber den Käufern in der EU
  selbst. Umsatzsteuerlich verkaufst du deshalb nicht direkt an die Nutzer, sondern erbringst eine Leistung an Google in
  Irland. Wie das bei dir zu behandeln ist (Kleinunternehmergrenze, Umsatzsteuer-Identifikationsnummer, ggf.
  Zusammenfassende Meldung), solltest du **unbedingt einmal mit einer Steuerberatung klären** – das ist der
  komplizierteste Teil.

### Unterlagen

- Monatliche **Auszahlungs- und Umsatzberichte** aus der Play Console herunterladen und aufbewahren.
- Rechnungen für alle Ausgaben sammeln. Aufbewahrungsfrist: Buchungsbelege 8 Jahre, Bücher und Aufzeichnungen 10 Jahre.
- Ein separates Bankkonto für die App ist nicht Pflicht, macht die Buchhaltung aber deutlich einfacher.

### Die größten Steuer-Fallen

- **Einnahmen nicht angeben** – das ist Steuerhinterziehung. Die Auszahlungen von Google sind über dein Bankkonto
  nachvollziehbar.
- **Gewerbe nicht anmelden** – Ordnungswidrigkeit mit Bußgeld.
- **Kleinunternehmergrenzen übersehen** – rückwirkend Umsatzsteuer zu zahlen ist teuer.
- **Kein Geld zurücklegen** – die Steuer für das erste gute Jahr kommt oft zusammen mit den ersten Vorauszahlungen.

## 6. Was in der App bereits umgesetzt ist

| Bereich              | Umsetzung                                                                                                                                         |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Kauf                 | Google Play Billing bzw. StoreKit über `expo-iap`; kein eigener Server, keine Drittanbieter                                                       |
| Paywall              | Preise live aus dem Store (inkl. MwSt.), Monats-/Jahresabo, Testphase, Abo-Bedingungen über dem Kaufknopf                                         |
| Pflichtangaben       | automatische Verlängerung, Kündigung im Store, „Käufe wiederherstellen“, „Abo verwalten“, Links zu Nutzungsbedingungen, Datenschutz und Impressum |
| Freischaltung        | Die App fragt den Store nach aktiven Abos; der letzte Stand gilt offline bis zu 35 Tage                                                           |
| Bestätigung          | Käufe werden automatisch bestätigt (sonst erstattet Google sie nach drei Tagen)                                                                   |
| Sperren              | Pro-Bereiche zeigen eine Karte „Mit Pro freischalten“ statt einer Fehlermeldung                                                                   |
| Rechtstexte          | Datenschutzerklärung, Nutzungsbedingungen, Impressum in der App und als Webseiten aus derselben Quelle                                            |
| Prüfungen            | CI prüft, ob die Webseiten aktuell sind; `npm run release:check` blockiert Platzhalter                                                            |
| Deine eigene Version | `eas build -p android --profile personal` baut eine APK, in der Pro ohne Abo freigeschaltet ist – nur für dich, nicht für den Store               |

In der Web-Vorschau und in Entwicklungs-Builds lässt sich Pro unter „Formkurve Pro“ simulieren, um die gesperrten
Bereiche zu testen. In Store-Builds gibt es diesen Schalter nicht.

## 7. Später auch im App Store (iPhone)

- Apple Developer Program: 99 US-$ pro Jahr. Mit dem **Small Business Program** (Umsatz unter 1 Mio. US-$) behält Apple
  15 % statt 30 %.
- In App Store Connect eine Abo-Gruppe „Formkurve Pro“ mit den Produkten **`formkurve_pro_monatlich`** und
  **`formkurve_pro_jaehrlich`** anlegen.
- Apple verlangt in der Paywall „Käufe wiederherstellen“ und Links zu Nutzungsbedingungen und Datenschutz – beides ist
  vorhanden. In der App-Beschreibung zusätzlich den Link zu den Nutzungsbedingungen angeben.
- Auch Apple fragt den Händlerstatus nach dem DSA ab und zeigt deine Kontaktdaten in der EU an.

## Weiterführende Links

- Google Play Console: <https://play.google.com/console>
- Hilfe für Entwickler (Abos, Datensicherheit, Händlerstatus): <https://support.google.com/googleplay/android-developer>
- ELSTER (Steuer online): <https://www.elster.de>
- § 5 DDG (Impressumspflicht): <https://www.gesetze-im-internet.de/ddg/__5.html>
- Bundeszentralamt für Steuern (Umsatzsteuer-ID): <https://www.bzst.de>
