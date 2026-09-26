# Notizen-Import

Formkurve kann Trainings übernehmen, die du bisher als Text in der Notizen-App (oder in WhatsApp, einer E-Mail …)
festgehalten hast. Dieses Dokument beschreibt, welche Schreibweisen erkannt werden.

Der Import ist bewusst **tolerant**: Groß-/Kleinschreibung, Leerzeichen, Komma oder Punkt als Dezimaltrennzeichen und das
Zeichen `×` statt `x` spielen keine Rolle. Nicht verstandene Zeilen brechen den Import nicht ab, sondern werden in der
Vorschau aufgelistet oder als Notiz übernommen.

## So läuft der Import ab

1. Text kopieren (auch mehrere Trainings auf einmal).
2. **Training → Aus Notizen importieren → Einfügen → Weiter zur Vorschau**.
3. Vorschau prüfen und bei Bedarf anpassen: Datum, Titel, Zuordnung jeder Übung, Trainings ein-/ausschließen.
4. **Training importieren**.

## Beispiel

Genau so sehen die bisherigen Notizen aus – dieser Text wird vollständig erkannt (9 Übungen, 32 Sätze):

```text
Training 25.09.
Brust, Bizeps, Bauch

Schräg-Brustmaschine
10x40kg inkl. Stange
120sek Pause
10x40kg inkl. Stange
120sek Pause
10x50kg inkl. Stange

Bizeps beidhängig im Sitzen
12x10kg pro Seite exkl. Stange
60sek Pause
12x12,5kg pro Seite exkl. Stange

Dipbarren Bauchmuskel
12x
60sek Pause
12x

Rudern
10x links
60sek Pause
15xrechts
```

Ergebnis:

| Zeile                              | wird zu                                                           |
| ---------------------------------- | ----------------------------------------------------------------- |
| `Training 25.09.`                  | neues Training am 25.09. des aktuellen Jahres                     |
| `Brust, Bizeps, Bauch`             | Titel des Trainings                                               |
| `Schräg-Brustmaschine`             | Übung → „Schrägbankdrücken an der Maschine“ aus der Bibliothek    |
| `10x40kg inkl. Stange`             | Satz: 10 Wiederholungen × 40 kg, Übung „inkl. Stange“             |
| `120sek Pause`                     | 2:00 min Pause nach dem vorherigen Satz                           |
| `12x12,5kg pro Seite exkl. Stange` | Satz: 12 × 12,5 kg, Übung „pro Seite“ und „exkl. Stange“          |
| `12x`                              | Satz: 12 Wiederholungen ohne Gewicht (Übung „nur Wiederholungen“) |
| `10x links` / `15xrechts`          | Satz für die linke bzw. rechte Seite (Übung „einseitig“)          |

## Trainingsbeginn (Kopfzeile)

Eine Zeile mit einem Datum beginnt ein neues Training. Erkannt werden:

| Schreibweise                          | Beispiel                                        |
| ------------------------------------- | ----------------------------------------------- |
| Stichwort + Datum                     | `Training 25.09.`, `Training 25.9`              |
| mit Jahr (vier- oder zweistellig)     | `Training 25.09.2025`, `Training 01.09.25`      |
| mit Wochentag                         | `Training Do 25.09.`, `Do, 25.09.2025`          |
| nur Datum (mit Punkt nach dem Monat)  | `25.09.`, `Mo 22.09.`                           |
| ISO-Datum                             | `2025-09-25`, `Training 2025-09-25`             |
| mit „vom“/„am“ und Doppelpunkt/Strich | `Training vom 25.09.`, `Training: 25.09.`       |
| Titel direkt dahinter                 | `Training 25.09. Beine`, `Do, 25.09.2025 Beine` |

Als Stichwort funktionieren **Training, Workout, Trainingstag, Trainingseinheit, Einheit, Gym, Session, Fitness**.

**Jahr:** Fehlt das Jahr, wird das aktuelle Jahr angenommen – es sei denn, das Datum läge dann in der Zukunft. Wer am 5. Januar `Training 28.12.` importiert, bekommt also den 28. Dezember des Vorjahres.

**Titel:** Die erste Textzeile nach der Kopfzeile (vor der ersten Übung) wird zum Titel. Fehlt ein Titel, bildet die App
ihn aus den Muskelgruppen, z. B. „Brust, Bizeps, Bauch“.

**Ohne Kopfzeile:** Beginnt der Text direkt mit Übungen, entsteht ein Training ohne Datum; das Datum wählst du in der
Vorschau (vorausgewählt ist heute).

## Übungen

Eine Textzeile, auf die **direkt eine Satzzeile folgt**, ist der Name einer Übung. Aufzählungszeichen wie `-`, `•` oder
`*` am Zeilenanfang werden ignoriert.

Steht eine Satzzeile nach einer Leerzeile ohne neuen Übungsnamen, gehört sie weiter zur vorherigen Übung.

## Sätze

| Schreibweise                     | Bedeutung                    | Beispiele                                                                     |
| -------------------------------- | ---------------------------- | ----------------------------------------------------------------------------- |
| Wiederholungen × Gewicht         | ein Satz                     | `10x40kg`, `10 x 40 kg`, `10×40`, `10x12,5kg`                                 |
| mit Wort statt `x`               | ein Satz                     | `10 Wdh. 40kg`, `10 Wiederholungen mit 40 kg`, `12 reps @ 40kg`, `10x à 40kg` |
| Gewicht × Wiederholungen         | ein Satz (Einheit nötig)     | `40kg x 10`, `20 kg x 12`                                                     |
| Sätze × Wiederholungen × Gewicht | mehrere gleiche Sätze (1–20) | `3x10x60kg` = 3 Sätze à 10 × 60 kg                                            |
| nur Wiederholungen               | Satz ohne Gewicht            | `12x`, `8 Wdh.`, `15 Wiederholungen`                                          |
| Zeit                             | Satz mit Dauer (z. B. Plank) | `60sek`, `45 Sek.`, `30s`, `1,5 min`, `2min`                                  |

**Einheiten:** `kg`, `kilo` sowie `lb`/`lbs` (werden in kg umgerechnet). Ohne Einheit wird kg angenommen.

### Zusätze hinter einem Satz

| Zusatz                                                                                | Wirkung                                             |
| ------------------------------------------------------------------------------------- | --------------------------------------------------- |
| `pro Seite`, `je Seite`, `pro Hand`, `je Arm`, `pro Bein`                             | Übung wird auf **„Pro Seite“** gestellt             |
| `inkl. Stange`, `inklusive Stange`, `mit Stange`, `inkl. SZ-Stange`, `mit Langhantel` | **„Inkl. Stange“** – das Gewicht enthält die Stange |
| `exkl. Stange`, `ohne Stange`, `zzgl. Stange`, `plus Stange`                          | **„Exkl. Stange“** – die Stange kommt noch dazu     |
| `links`, `li`, `l`, `(L)` bzw. `rechts`, `re`, `r`, `(R)`                             | Satz für die linke bzw. rechte Seite                |
| alles andere, z. B. `mit Gürtel`, `langsam`                                           | wird als **Notiz zum Satz** gespeichert             |

> **Tipp für „exkl. Stange“:** Die App kennt das Gewicht deiner Stange nicht. Trag es einmalig in den Einstellungen der
> Übung ein („Gewicht der Stange“), dann wird es im Volumen mitgerechnet.

## Pausen

Eine Zeile mit **Pause**, **Satzpause**, **Rest**, **Ruhe** oder **Erholung** und einer Zahl ist eine Pause. Sie gilt
für den Satz davor.

| Schreibweise                                       | Pause    |
| -------------------------------------------------- | -------- |
| `120sek Pause`, `Pause 120s`, `120 Sekunden Pause` | 2:00 min |
| `2 min Pause`, `Pause 2min`, `2m Pause`            | 2:00 min |
| `Pause 1:30`                                       | 1:30 min |
| `Pause 90` (Zahl ab 10 ohne Einheit)               | 1:30 min |
| `Pause 2` (Zahl unter 10 ohne Einheit)             | 2:00 min |

Die am häufigsten notierte Pause wird zur **Pausenzeit der Übung** und damit zur Vorgabe für den Pausen-Timer.

## Notizen

- Eine Textzeile direkt nach Sätzen (ohne Leerzeile dazwischen), auf die kein Satz folgt, wird zur **Notiz der
  Übung** – z. B. `fühlte sich leicht an`.
- Andere freie Textzeilen werden zur **Notiz des Trainings**.
- Text vor dem ersten Training und Sätze ohne Übungsnamen werden in der Vorschau als „Nicht erkannte Zeilen“ gemeldet.

## Zuordnung zur Übungsbibliothek

Jeder Übungsname wird mit den Namen und alternativen Namen der Bibliothek verglichen:

| Markierung  | Bedeutung                                                                                         |
| ----------- | ------------------------------------------------------------------------------------------------- |
| **Erkannt** | gleicher Name oder alternativer Name (Groß-/Kleinschreibung, Umlaute, Bindestriche egal)          |
| **Ähnlich** | sehr ähnlicher Name, z. B. mit Tippfehler – bitte kurz prüfen                                     |
| **Gewählt** | von dir in der Vorschau zugeordnet                                                                |
| **Neu**     | nichts Passendes gefunden – es wird eine eigene Übung angelegt (Muskelgruppe und Gerät geschätzt) |

Die Bibliothek kennt bereits viele Gerätenamen aus dem Studio, z. B. „Schräg-Brustmaschine“, „Brustmaschine“,
„Butterfly“, „Kabel Crossover von unten“, „Bizeps beidhängig im Sitzen“, „Hammercurls am Kabel mit Seil“,
„Bauchmaschine Crunch“, „Dipbarren Bauchmuskel“ und „Rudern“.

Mit **„Namen merken“** (Standard: an) wird deine Schreibweise als alternativer Name gespeichert. Beim nächsten Import
wird die Übung dann sofort erkannt.

Beim Import werden außerdem die Einstellungen bestehender Übungen ergänzt, wenn die Notizen mehr verraten – z. B. wird
eine Übung von „Gesamtgewicht“ auf „Pro Seite“ oder auf „einseitig“ umgestellt. Dabei wird nur ergänzt, nie etwas
zurückgesetzt.

## Doppelte Trainings

Gibt es am selben Tag bereits ein Training, zeigt die Vorschau einen Hinweis. Hat es denselben Titel, ist das Training
zunächst abgewählt, damit nichts doppelt importiert wird. Mit dem Schalter kannst du es trotzdem importieren.

## Was beim Import gespeichert wird

- Startzeit: 18:00 Uhr am erkannten Tag (die Uhrzeit steht nicht in den Notizen und lässt sich später bearbeiten),
  keine Dauer.
- Alle Sätze als Arbeitssätze mit Wiederholungen, Gewicht, Dauer, Seite, Pause und Notiz.
- In den Trainingsdetails steht der Hinweis „Aus Notizen importiert“. Rekorde und Statistiken berücksichtigen
  importierte Trainings wie alle anderen.

## Der umgekehrte Weg: Teilen als Text

In der Zusammenfassung und in den Trainingsdetails gibt es **„Als Text teilen“** bzw. **„Text kopieren“**. Das Training
wird dann im gleichen Format ausgegeben – so kannst du es weiterhin in der Notizen-App ablegen oder verschicken, und der
Text lässt sich jederzeit wieder importieren:

```text
Training 25.09.
Brust, Bizeps, Bauch

Schrägbankdrücken an der Maschine
10x40kg inkl. Stange
120sek Pause
10x50kg inkl. Stange
```

Liegt das Training in einem anderen Jahr, wird das Jahr mit ausgegeben (`Training 25.09.2025`).
