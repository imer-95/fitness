# Installation & Build

Formkurve ist eine [Expo](https://expo.dev)-App (React Native). Aus demselben Code entstehen die iPhone- und die
Android-App. Es gibt drei Wege, die App aufs Handy zu bringen:

| Weg                                          | Wofür                              | Voraussetzungen                                    |
| -------------------------------------------- | ---------------------------------- | -------------------------------------------------- |
| [Expo Go](#2-ausprobieren-mit-expo-go)       | schnell ausprobieren, entwickeln   | Node.js, App „Expo Go“                             |
| [Android-APK](#3-android-installierbare-apk) | dauerhaft installierte Android-App | kostenloses Expo-Konto                             |
| [iPhone über TestFlight](#4-iphone)          | dauerhaft installierte iPhone-App  | Expo-Konto und Apple Developer Program (99 $/Jahr) |

## 1. Voraussetzungen

- [Node.js](https://nodejs.org) 20 oder neuer (empfohlen: 22 LTS) inklusive npm
- [Git](https://git-scm.com)
- optional: Xcode (nur macOS) für den iOS-Simulator, Android Studio für den Android-Emulator

```bash
git clone https://github.com/imer-95/fitness.git
cd fitness
npm install
```

## 2. Ausprobieren mit Expo Go

1. **Expo Go** installieren: [App Store](https://apps.apple.com/app/expo-go/id982107779) bzw.
   [Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent).
2. Entwicklungsserver starten:

   ```bash
   npx expo start
   ```

3. QR-Code scannen – auf dem iPhone mit der Kamera-App, auf Android in Expo Go.

Handy und Computer müssen im selben WLAN sein. Andernfalls (oder bei Firmen-/Uni-WLAN) den Tunnel verwenden:

```bash
npx expo start --tunnel
```

Hinweise:

- Expo Go unterstützt immer nur die **aktuelle Expo-SDK-Version**. Meldet Expo Go, dass das Projekt inkompatibel ist,
  muss das Projekt aktualisiert werden (`npx expo install expo@latest` und danach `npx expo install --fix`) – oder du
  nutzt einen der Builds unten.
- Formkurve verwendet ausschließlich **lokale** Mitteilungen (Pausen-Timer, Wiege-Erinnerung). Hinweise im Terminal zu
  Push-Benachrichtigungen in Expo Go betreffen die App nicht.
- Die Daten in Expo Go liegen in der Expo-Go-App. Beim späteren Wechsel auf die eigene App vorher ein Backup exportieren
  und in der neuen App wiederherstellen.

### Web-Vorschau

```bash
npm run web
```

öffnet die Oberfläche im Browser. Das ist praktisch zum schnellen Ausprobieren und für Screenshots, ersetzt aber nicht
das Handy: Kamera/Barcode-Scanner, Vibration und Mitteilungen gibt es dort nicht. Die Daten liegen im Browser
(IndexedDB).

## 3. Android: installierbare APK

Gebaut wird mit [EAS Build](https://docs.expo.dev/build/introduction/) in der Cloud – ohne Android Studio.

```bash
npm install -g eas-cli        # alternativ jeden Befehl mit „npx eas-cli …“ ausführen
eas login                     # mit deinem (kostenlosen) Expo-Konto anmelden
eas init                      # verknüpft das Projekt einmalig mit deinem Konto
eas build -p android --profile preview
```

- `eas init` trägt eine Projekt-ID in `app.json` ein – diese Änderung einfach mit committen.
- Das Profil `preview` (siehe [`eas.json`](../eas.json)) erzeugt eine **APK**, die sich direkt installieren lässt.
- Nach dem Build (einige Minuten, im kostenlosen Tarif ggf. mit Warteschlange) erscheinen ein Link und ein QR-Code.
  Auf dem Handy öffnen, APK herunterladen und installieren. Android fragt einmalig, ob der Browser „unbekannte Apps
  installieren“ darf.
- Für den Google Play Store erzeugt `eas build -p android --profile production` ein App Bundle (AAB), und
  `eas submit -p android` lädt es hoch (Google-Play-Entwicklerkonto nötig).

## 4. iPhone

Apple erlaubt die dauerhafte Installation eigener Apps nur mit Entwicklerkonto. Es gibt drei Möglichkeiten:

### a) TestFlight (empfohlen)

Voraussetzung: Mitgliedschaft im [Apple Developer Program](https://developer.apple.com/programs/) (99 $/Jahr).

```bash
eas build -p ios --profile production
eas submit -p ios --latest
```

1. EAS fragt beim ersten Build nach deinem Apple-Konto und erstellt Zertifikate und Provisioning-Profile automatisch.
2. `eas submit` legt die App in App Store Connect an (Bundle-ID `com.imer95.formkurve`) und lädt den Build hoch.
3. Nach der Verarbeitung durch Apple (meist 10–30 Minuten): In [App Store Connect](https://appstoreconnect.apple.com)
   unter **TestFlight** dich selbst als internen Tester hinzufügen.
4. Auf dem iPhone die App **TestFlight** installieren und Formkurve darüber installieren.

TestFlight-Builds laufen nach 90 Tagen ab. Ein neuer Build (Schritte oben) verlängert das – deine Daten bleiben dabei
erhalten.

### b) Direkt installieren (Ad-hoc)

Ebenfalls mit Apple Developer Program, aber ohne TestFlight:

```bash
eas device:create                       # iPhone registrieren (Link auf dem iPhone öffnen)
eas build -p ios --profile preview      # Build nur für registrierte Geräte
```

Den Link des fertigen Builds auf dem iPhone öffnen und installieren. Unter iOS 16 und neuer muss dafür einmalig der
**Entwicklermodus** aktiviert werden (Einstellungen → Datenschutz & Sicherheit → Entwicklermodus).

### c) Ohne kostenpflichtiges Konto (Mac nötig)

Mit einem Mac, Xcode und einer kostenlosen Apple-ID lässt sich die App per Kabel installieren:

```bash
npx expo run:ios --device
```

Beim ersten Mal ggf. in Xcode (`ios/Formkurve.xcworkspace`) unter **Signing & Capabilities** dein persönliches Team
auswählen und auf dem iPhone den Entwicklermodus aktivieren. Einschränkung von Apple: Die App muss **alle 7 Tage** neu
installiert werden.

## 5. Updates

- **Neue Version bauen**: Code aktualisieren (`git pull`), `npm install`, dann den Build-Befehl erneut ausführen. Im
  Profil `production` zählt EAS die Build-Nummer automatisch hoch (`autoIncrement`). Die sichtbare Versionsnummer steht
  in `app.json` unter `version`.
- **Daten bleiben erhalten**, solange die App nicht deinstalliert wird. Datenbank-Änderungen neuer Versionen werden beim
  ersten Start automatisch übernommen (Migrationen, siehe [Architektur](architektur.md#migrationen)).
- **Vor dem Deinstallieren oder einem Handywechsel** unter Profil → Backup, Export & Wiederherstellung ein Backup
  exportieren.

## 6. App-Kennung und Berechtigungen

| Einstellung         | Wert                   | Ort        |
| ------------------- | ---------------------- | ---------- |
| Name                | Formkurve              | `app.json` |
| Bundle-ID (iOS)     | `com.imer95.formkurve` | `app.json` |
| Paketname (Android) | `com.imer95.formkurve` | `app.json` |
| URL-Schema          | `formkurve://`         | `app.json` |

Soll die Kennung geändert werden, dann **vor** dem ersten Store-Build – danach ist sie fest mit der App verbunden.

Die App fragt nur nach diesen Berechtigungen, jeweils erst bei Bedarf:

- **Kamera** – für den Barcode-Scanner (kein Mikrofon, keine Fotos).
- **Mitteilungen** – für das Ende der Satzpause und die tägliche Wiege-Erinnerung.
- **Vibration** (Android) – für haptisches Feedback.

Internetzugriff wird nur für die Produktsuche bei [Open Food Facts](https://world.openfoodfacts.org) benötigt. Es gibt
keine Analyse-, Werbe- oder Tracking-Dienste.

## 7. Fehlerbehebung

| Problem                                                | Lösung                                                                                                                        |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| Expo Go verbindet sich nicht mit dem Computer          | gleiches WLAN? Sonst `npx expo start --tunnel`                                                                                |
| „Project is incompatible with this version of Expo Go“ | Projekt auf die aktuelle SDK-Version heben (siehe oben) oder eigenen Build verwenden                                          |
| seltsames Verhalten nach Code-Änderungen               | Cache leeren: `npx expo start -c`                                                                                             |
| iOS-Build scheitert an Zertifikaten                    | `eas credentials` öffnen und Zertifikate/Profile neu erzeugen lassen                                                          |
| Pausen-Mitteilung kommt nicht                          | Mitteilungen für Formkurve in den Systemeinstellungen erlauben; unter Profil prüfen, ob „Mitteilung bei Pausenende“ aktiv ist |
| Barcode-Scanner zeigt kein Kamerabild                  | Kamerazugriff in den Systemeinstellungen erlauben                                                                             |

## 8. Automatische Prüfungen (CI)

Bei jedem Push prüft GitHub Actions ([`.github/workflows/ci.yml`](../.github/workflows/ci.yml)) den Code: TypeScript,
ESLint, Prettier, alle Tests und ob sich die App für iOS, Android und Web bündeln lässt. Details in
[Entwicklung](entwicklung.md#continuous-integration).
