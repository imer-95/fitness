# Berechnungen

Dieses Dokument erklärt, wie Formkurve Kennzahlen berechnet. Alle Formeln stehen im Ordner [`src/domain`](../src/domain)
und sind mit Unit-Tests abgesichert ([`src/__tests__/domain.test.ts`](../src/__tests__/domain.test.ts)).

> Alle Werte sind **Schätzungen** auf Basis anerkannter Formeln. Sie sind als Orientierung gedacht und ersetzen keine
> ärztliche, trainings- oder ernährungswissenschaftliche Beratung.

Die Beispiele verwenden eine Beispielperson: männlich, Jahrgang 1995 (31 Jahre im Jahr 2026), 182 cm, 84,4 kg, mäßig
aktiv, Ziel „Abnehmen“.

## Krafttraining

### Geschätztes 1RM (Epley)

Das 1RM („one repetition maximum“) ist das Gewicht, das du für genau eine Wiederholung schaffen würdest. Formkurve
schätzt es aus jedem Satz mit der Formel von Epley:

```text
1RM = Gewicht × (1 + Wiederholungen / 30)
```

Bei einer Wiederholung ist das 1RM das Gewicht selbst. Beispiel: 10 × 40 kg → 40 × (1 + 10/30) ≈ **53,3 kg**.

Die Schätzung ist bei 1–10 Wiederholungen am genauesten; bei sehr hohen Wiederholungszahlen wird sie ungenauer.
Quelltext: `estimate1RM` in [`strength.ts`](../src/domain/strength.ts).

### 1RM-Rechner und Prozenttabelle

Der 1RM-Rechner zeigt Trainingsgewichte von 100 % bis 50 % des 1RM. Die passende Wiederholungszahl ergibt sich aus der
umgestellten Epley-Formel:

```text
Wiederholungen = 30 × (100 % / Prozent − 1)      (gerundet, mindestens 1)
```

| Prozent des 1RM | Wiederholungen |
| --------------- | -------------- |
| 100 %           | 1              |
| 90 %            | 3              |
| 80 %            | 8              |
| 70 %            | 13             |
| 60 %            | 20             |

### Tatsächlich bewegtes Gewicht

Du trägst das Gewicht so ein, wie du es gewohnt bist. Für Volumen und Rekorde rechnet Formkurve es in die tatsächlich
bewegte Last um:

| Einstellung der Übung | Umrechnung                                       |
| --------------------- | ------------------------------------------------ |
| Gesamtgewicht         | Last = eingetragenes Gewicht                     |
| Pro Seite             | Last = eingetragenes Gewicht × 2                 |
| Inkl. Stange          | Stange ist im eingetragenen Gewicht enthalten    |
| Exkl. Stange          | Last = … + Gewicht der Stange (falls hinterlegt) |

Beispiel „12x12,5kg pro Seite exkl. Stange“ mit einer 10-kg-Stange: Last = 12,5 × 2 + 10 = **35 kg**.

### Volumen (Tonnage)

```text
Volumen eines Satzes = Wiederholungen × Last
Volumen eines Trainings = Summe aller Sätze
```

Beispiel: 12 Wiederholungen × 35 kg = 420 kg. Sätze ohne Gewicht (z. B. Dipbarren) und Zeitsätze haben kein Volumen.
Das Volumen umfasst alle Sätze einschließlich Aufwärmsätzen.

### Persönliche Rekorde

Beim Abhaken wird ein Satz mit deinen bisherigen Bestwerten dieser Übung verglichen. **Aufwärmsätze zählen nie**, und
beim allerersten Training einer Übung gibt es noch keinen Rekord.

| Erfassung der Übung | Rekord, wenn …                                                                                                                          |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| kg × Wdh.           | das Gewicht höher ist als je zuvor (**Höchstes Gewicht**), sonst das geschätzte 1RM höher ist als je zuvor (**Bestes geschätztes 1RM**) |
| Nur Wdh.            | mehr Wiederholungen als je zuvor (**Meiste Wiederholungen**)                                                                            |
| Zeit                | längere Dauer als je zuvor (**Längste Dauer**)                                                                                          |

In der Übersicht eines Trainings erscheint pro Übung nur der wichtigste Rekord (Gewicht vor 1RM vor Wiederholungen vor
Dauer). Verglichen wird mit dem eingetragenen Gewicht, nicht mit der umgerechneten Last – bei derselben Übung ist das
gleichwertig.

### Steigerungs-Tipp

Formkurve betrachtet die beiden letzten Trainings einer Übung und jeweils den schwersten Arbeitssatz (bei mehreren
Sätzen mit diesem Gewicht zählt die niedrigste Wiederholungszahl). Ein Tipp erscheint, wenn

1. in beiden Trainings dasselbe Höchstgewicht verwendet wurde,
2. die Wiederholungen im letzten Training nicht weniger waren als davor und
3. es mindestens 5 Wiederholungen waren.

Vorgeschlagen wird dann das Höchstgewicht plus der **Gewichtsschritt** aus den Einstellungen (Standard 2,5 kg).
Beispiel: zweimal 10 × 40 kg → „Zeit für 42,5 kg?“.

### Scheibenrechner

```text
pro Seite = (Zielgewicht − Stange) / 2
```

Die Scheiben werden von der schwersten zur leichtesten verteilt (25, 20, 15, 10, 5, 2,5 und 1,25 kg). Bleibt ein Rest,
der sich mit diesen Scheiben nicht darstellen lässt, wird er angezeigt. Beispiel: 100 kg mit 20-kg-Stange → pro Seite
40 kg = 25 + 15.

## Körpergewicht

### 7-Tage-Trend

Das Körpergewicht schwankt täglich um 1–2 kg (Wasser, Salz, Kohlenhydrate, Verdauung). Formkurve zeigt deshalb neben
dem Tageswert einen **gleitenden Durchschnitt**: Für jeden Eintrag wird der Mittelwert aller Einträge der letzten sieben
Kalendertage (inklusive des Tages selbst) gebildet. Fehlende Tage sind kein Problem – es wird über die vorhandenen
Einträge gemittelt.

Die Werte „7 Tage“ und „30 Tage“ sind die Veränderung dieses Trends gegenüber dem Trendwert vor 7 bzw. 30 Tagen.

### Veränderung pro Woche

Über alle Einträge der letzten 28 Tage wird eine **Ausgleichsgerade** (lineare Regression nach der Methode der kleinsten
Quadrate) gelegt. Ihre Steigung × 7 ergibt die durchschnittliche Veränderung in kg pro Woche. Voraussetzung: mindestens
drei Einträge, die mindestens sieben Tage auseinanderliegen.

Zur Einordnung: Beim Abnehmen gelten etwa 0,5–1 % des Körpergewichts pro Woche als realistisch und muskelschonend.

### Prognose für das Zielgewicht

```text
Tage bis zum Ziel = (Zielgewicht − aktueller Trend) / Veränderung pro Woche × 7
```

Eine Prognose wird nur angezeigt, wenn sich das Gewicht mit mindestens 0,02 kg pro Woche in die richtige Richtung
bewegt und das Ziel in höchstens drei Jahren erreicht wäre.

### BMI

```text
BMI = Gewicht in kg / (Größe in m)²
```

Beispiel: 84,4 / 1,82² ≈ **25,5**. Einordnung nach WHO: unter 18,5 Untergewicht, bis 24,9 Normalgewicht, bis 29,9
Übergewicht, ab 30 Adipositas. Der BMI unterscheidet nicht zwischen Muskeln und Fett und ist bei muskulösen Menschen
daher nur eingeschränkt aussagekräftig.

## Ernährung

### Grundumsatz (Mifflin-St Jeor)

```text
Grundumsatz = 10 × Gewicht (kg) + 6,25 × Größe (cm) − 5 × Alter + s
s = +5 (Männer), −161 (Frauen), −78 (keine Angabe, Mittelwert)
```

Das Alter ergibt sich aus dem Geburtsjahr. Beispiel: 10 × 84,4 + 6,25 × 182 − 5 × 31 + 5 = **1.831,5 kcal**.

### Gesamtumsatz

```text
Gesamtumsatz = Grundumsatz × Aktivitätsfaktor
```

| Aktivität im Alltag | Faktor |
| ------------------- | ------ |
| Kaum aktiv          | 1,2    |
| Leicht aktiv        | 1,375  |
| Mäßig aktiv         | 1,55   |
| Sehr aktiv          | 1,725  |
| Extrem aktiv        | 1,9    |

Beispiel: 1.831,5 × 1,55 ≈ 2.839 kcal.

### Kalorienziel

| Ziel           | Anpassung               |
| -------------- | ----------------------- |
| Abnehmen       | Gesamtumsatz − 500 kcal |
| Gewicht halten | Gesamtumsatz            |
| Muskelaufbau   | Gesamtumsatz + 300 kcal |

Beim Abnehmen fällt das Ziel nie unter den Grundumsatz. Das Ergebnis wird auf 10 kcal gerundet. Beispiel: 2.839 − 500
→ **2.340 kcal**.

### Makronährstoffe

| Makro         | Berechnung                                                                 |
| ------------- | -------------------------------------------------------------------------- |
| Eiweiß        | 2,0 g pro kg Körpergewicht (Abnehmen, Muskelaufbau) bzw. 1,8 g/kg (Halten) |
| Fett          | 25 % der Kalorien (1 g Fett = 9 kcal)                                      |
| Kohlenhydrate | restliche Kalorien (1 g = 4 kcal)                                          |

Beispiel mit 2.340 kcal: Eiweiß 84,4 × 2 ≈ **169 g** (676 kcal), Fett 2.340 × 0,25 / 9 = **65 g** (585 kcal),
Kohlenhydrate (2.340 − 676 − 585) / 4 ≈ **270 g**.

Die Ziele werden automatisch neu berechnet, wenn du ein neues Gewicht einträgst oder das Profil änderst – außer du hast
sie unter Profil → Ziele manuell festgelegt.

### Nährwerte eines Eintrags

Lebensmittel speichern ihre Nährwerte pro 100 g bzw. 100 ml:

```text
Nährwert des Eintrags = Wert pro 100 × Menge / 100
```

Beispiel: 150 g Skyr mit 63 kcal/100 g → 94,5 kcal.

### Wasser

Das vorgeschlagene Tagesziel beträgt **35 ml pro kg Körpergewicht**, gerundet auf 250 ml und begrenzt auf 1,5–4 Liter.
Beispiel: 84,4 × 35 = 2.954 ml → **3,0 Liter**.

### Tage im Zielbereich

Ein Tag liegt im Zielbereich, wenn die gegessenen Kalorien höchstens **±10 %** vom Kalorienziel abweichen. Gezählt
werden die Tage der letzten 14 Tage, an denen etwas eingetragen wurde.

## Cardio

### Kalorienverbrauch beim Cardio

```text
kcal = MET × Körpergewicht (kg) × Dauer (h)
```

MET („metabolisches Äquivalent“) beschreibt, wie viel Energie eine Aktivität im Vergleich zum Ruhezustand verbraucht.
Die Werte stammen aus dem _Compendium of Physical Activities_:

| Aktivität        | MET (Standard) |
| ---------------- | -------------- |
| Laufen           | 9,8            |
| Laufband         | 9,0            |
| Radfahren        | 7,5            |
| Ergometer        | 6,8            |
| Crosstrainer     | 5,0            |
| Rudergerät       | 7,0            |
| Schwimmen        | 6,0            |
| Gehen            | 3,5            |
| Wandern          | 6,0            |
| Stepper / Treppe | 9,0            |
| HIIT             | 8,0            |
| Sonstiges        | 5,0            |

Ist eine Distanz eingetragen, wird der MET-Wert bei **Laufen/Laufband, Radfahren und Gehen** nach der Geschwindigkeit
verfeinert (z. B. Laufen: 8 km/h → 8,3; 10 km/h → 9,8; 12 km/h → 11,8; Rad: 20 km/h → 8,0; 25 km/h → 10,0).

Beispiel: 30 Minuten Laufen über 5 km (10 km/h) → 9,8 × 84,4 × 0,5 ≈ **414 kcal**.

Trägst du selbst Kalorien ein (z. B. von der Uhr oder dem Gerät), wird dieser Wert verwendet.

### Tempo und Geschwindigkeit

```text
Tempo (min/km)          = Dauer / Distanz
Geschwindigkeit (km/h)  = Distanz / Dauer in Stunden
```

## Motivation

### Wochenserie

Die Wochenserie (🔥 auf der Startseite) zählt, wie viele Kalenderwochen (Montag bis Sonntag) in Folge du dein Ziel
„Trainings pro Woche“ erreicht hast. Die laufende Woche zählt mit, sobald das Ziel erreicht ist – solange die Woche noch
läuft, unterbricht sie die Serie aber nicht.

### Sätze pro Muskelgruppe

Gezählt werden alle Arbeitssätze (ohne Aufwärmsätze) der letzten 30 Tage, jeweils für die **primäre** Muskelgruppe der
Übung.
