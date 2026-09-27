/**
 * Legal texts: Impressum, privacy policy (Datenschutzerklärung) and terms of use.
 *
 * Single source for the screens in the app and the website
 * (scripts/build-legal-pages.mjs compiles this file on its own, so it must not
 * import other modules).
 *
 * Before publishing:
 *   1. Fill in LEGAL_OWNER (name, address, e-mail, phone).
 *   2. Run `npm run legal:pages` and commit the updated pages in docs/legal.
 *   3. Have the texts checked (lawyer or a reputable generator) – they are a
 *      carefully written template, not individual legal advice.
 */

export interface LegalOwner {
  /** Full name of the provider (private person or business owner). */
  name: string;
  street: string;
  /** Postal code and city, e.g. "12345 Musterstadt". */
  postalCity: string;
  country: string;
  email: string;
  /** Second fast way of contact (phone). */
  phone: string | null;
  /** USt-IdNr. – only if you have one (not needed as Kleinunternehmer). */
  vatId: string | null;
  /** Wirtschafts-Identifikationsnummer – only once it has been assigned. */
  businessId: string | null;
}

export const LEGAL_OWNER: LegalOwner = {
  name: '[Vorname Nachname]',
  street: '[Straße Hausnummer]',
  postalCity: '[PLZ Ort]',
  country: 'Deutschland',
  email: '[E-Mail-Adresse]',
  phone: '[Telefonnummer]',
  vatId: null,
  businessId: null,
};

/** Shown below every document. Update it whenever the texts change. */
export const LEGAL_UPDATED = '26. September 2026';

export const WEBSITE_URL = 'https://imer-95.github.io/fitness';
export const LEGAL_PAGES_URL = `${WEBSITE_URL}/legal`;
/** Privacy policy URL for the Google Play Console and App Store Connect. */
export const PRIVACY_POLICY_URL = `${LEGAL_PAGES_URL}/datenschutz.html`;

export type LegalDocId = 'impressum' | 'datenschutz' | 'nutzungsbedingungen';

export type LegalBlock =
  | { kind: 'p'; text: string }
  | { kind: 'list'; items: string[] }
  | { kind: 'lines'; lines: string[] };

export interface LegalSection {
  heading?: string;
  blocks: LegalBlock[];
}

export interface LegalDocument {
  id: LegalDocId;
  title: string;
  intro?: string;
  sections: LegalSection[];
}

/** True as long as the owner data still contains template placeholders like "[PLZ Ort]". */
export function hasPlaceholders(owner: LegalOwner = LEGAL_OWNER): boolean {
  return Object.values(owner).some((v) => typeof v === 'string' && /\[[^\]]+\]/.test(v));
}

export interface TextPart {
  text: string;
  /** http(s) or mailto link. */
  href?: string;
}

/** Splits text into plain parts and links (URLs and e-mail addresses). */
export function splitLinks(text: string): TextPart[] {
  const parts: TextPart[] = [];
  const pattern = /https?:\/\/[^\s<>"]+|[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    let value = match[0];
    // Sentence punctuation directly after a link is not part of it.
    while (/[.,;:!?)]$/.test(value)) value = value.slice(0, -1);
    const start = match.index ?? 0;
    if (start > last) parts.push({ text: text.slice(last, start) });
    parts.push({ text: value, href: value.startsWith('http') ? value : `mailto:${value}` });
    last = start + value.length;
  }
  if (last < text.length) parts.push({ text: text.slice(last) });
  return parts;
}

function addressLines(owner: LegalOwner): string[] {
  return [owner.name, owner.street, owner.postalCity, owner.country];
}

function impressum(owner: LegalOwner): LegalDocument {
  const sections: LegalSection[] = [
    { heading: 'Angaben gemäß § 5 DDG', blocks: [{ kind: 'lines', lines: addressLines(owner) }] },
    {
      heading: 'Kontakt',
      blocks: [
        { kind: 'lines', lines: [`E-Mail: ${owner.email}`, ...(owner.phone ? [`Telefon: ${owner.phone}`] : [])] },
      ],
    },
  ];
  if (owner.vatId) {
    sections.push({
      heading: 'Umsatzsteuer-ID',
      blocks: [{ kind: 'p', text: `Umsatzsteuer-Identifikationsnummer gemäß § 27a UStG: ${owner.vatId}` }],
    });
  }
  if (owner.businessId) {
    sections.push({
      heading: 'Wirtschafts-Identifikationsnummer',
      blocks: [{ kind: 'p', text: `Wirtschafts-Identifikationsnummer gemäß § 139c AO: ${owner.businessId}` }],
    });
  }
  sections.push(
    {
      heading: 'Verbraucherstreitbeilegung',
      blocks: [
        {
          kind: 'p',
          text: 'Wir sind nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.',
        },
      ],
    },
    {
      heading: 'Quellen und Lizenzen',
      blocks: [
        {
          kind: 'p',
          text: 'Produktdaten stammen aus der freien Datenbank Open Food Facts (https://world.openfoodfacts.org) und stehen unter der Open Database License (ODbL). Die App verwendet Open-Source-Software, unter anderem React Native, Expo und sql.js (MIT-Lizenz).',
        },
      ],
    },
  );
  return { id: 'impressum', title: 'Impressum', sections };
}

function privacyPolicy(owner: LegalOwner): LegalDocument {
  return {
    id: 'datenschutz',
    title: 'Datenschutzerklärung',
    intro:
      'Diese Datenschutzerklärung gilt für die App „Formkurve“ für Android und iOS sowie für die Website zur App. Kurz gesagt: Deine Trainings-, Körper- und Ernährungsdaten bleiben auf deinem Gerät.',
    sections: [
      {
        heading: '1. Verantwortlicher',
        blocks: [
          { kind: 'p', text: 'Verantwortlich im Sinne der Datenschutz-Grundverordnung (DSGVO) ist:' },
          { kind: 'lines', lines: [...addressLines(owner), `E-Mail: ${owner.email}`] },
        ],
      },
      {
        heading: '2. Das Wichtigste in Kürze',
        blocks: [
          {
            kind: 'list',
            items: [
              'Kein Konto, keine Registrierung, keine Werbung, kein Tracking und keine Analyse-Tools.',
              'Alles, was du in der App einträgst, wird ausschließlich lokal auf deinem Gerät gespeichert. Wir haben keinen Zugriff darauf.',
              'Eine Internetverbindung nutzt die App nur für die Produktsuche (Barcode-Scanner, Online-Suche) und für Käufe über Google Play bzw. den App Store.',
              'Wir verkaufen keine Daten und geben sie nicht an Dritte weiter.',
            ],
          },
        ],
      },
      {
        heading: '3. Daten auf deinem Gerät',
        blocks: [
          {
            kind: 'p',
            text: 'Die App speichert deine Einträge in einer Datenbank auf deinem Gerät: Trainings, Sätze, Pläne und Übungen, Körpergewicht, Körperfett und Körpermaße, Cardio-Einheiten, Ernährungstagebuch und Wasser sowie deine Profilangaben (Name bzw. Spitzname, Geschlecht, Geburtsjahr, Größe, Aktivität, Ziele) und Einstellungen.',
          },
          {
            kind: 'p',
            text: 'Einige dieser Angaben, etwa Körpergewicht, Körpermaße oder Ernährung, können Gesundheitsdaten sein. Sie werden weder an uns noch an Dritte übertragen; die Verarbeitung findet ausschließlich auf deinem Gerät und unter deiner Kontrolle statt.',
          },
          {
            kind: 'p',
            text: 'Du kannst alle Daten jederzeit in der App ansehen, ändern, exportieren (Profil → Backup, Export & Wiederherstellung) und löschen („Alle Daten löschen“ oder Deinstallation der App).',
          },
          {
            kind: 'p',
            text: 'Geräte-Sicherungen: Je nach Einstellung deines Geräts werden App-Daten in die Sicherung deines Google-Kontos bzw. in iCloud aufgenommen. Diese Sicherungen verwalten Google bzw. Apple im Rahmen deines Kontos; wir haben darauf keinen Zugriff. Du kannst sie in den Einstellungen deines Geräts steuern.',
          },
          {
            kind: 'p',
            text: 'Exportierte Dateien (Backup, CSV-Export, geteilte Trainings) entstehen nur durch deine Aktion und werden an das von dir gewählte Ziel übergeben, z. B. die Dateien-App, einen Cloud-Speicher oder einen Messenger. Für die weitere Verarbeitung ist der jeweilige Anbieter verantwortlich.',
          },
        ],
      },
      {
        heading: '4. Berechtigungen',
        blocks: [
          {
            kind: 'list',
            items: [
              'Kamera: nur zum Scannen von Barcodes. Es werden keine Fotos gespeichert oder übertragen.',
              'Mitteilungen: für das Ende der Satzpause und die tägliche Wiege-Erinnerung. Die Mitteilungen werden lokal auf deinem Gerät geplant; es gibt keine Push-Mitteilungen über einen Server.',
              'Vibration (Android): für haptische Rückmeldungen.',
              'Internet: für die Produktsuche und für Käufe (siehe Abschnitte 5 und 6).',
            ],
          },
        ],
      },
      {
        heading: '5. Produktsuche mit Open Food Facts',
        blocks: [
          {
            kind: 'p',
            text: 'Wenn du einen Barcode scannst oder „Online suchen“ verwendest, sendet die App den Barcode bzw. den Suchbegriff direkt an die freie Lebensmitteldatenbank Open Food Facts (Open Food Facts, gemeinnütziger Verein nach französischem Recht, Frankreich). Technisch bedingt werden dabei auch deine IP-Adresse sowie Name und Version der App übermittelt. Weitere Daten aus der App werden nicht übertragen.',
          },
          {
            kind: 'p',
            text: 'Zweck ist die Anzeige der Nährwerte des Produkts; gefundene Produkte werden anschließend lokal gespeichert. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (Bereitstellung der von dir angeforderten Funktion). Informationen zum Datenschutz bei Open Food Facts: https://world.openfoodfacts.org/privacy',
          },
        ],
      },
      {
        heading: '6. Käufe und Abonnements (Formkurve Pro)',
        blocks: [
          {
            kind: 'p',
            text: 'Formkurve Pro wird über Google Play (Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irland) bzw. den App Store (Apple Distribution International Ltd., Hollyhill Industrial Estate, Hollyhill, Cork, Irland) verkauft. Bezahlung, Rechnung, Verlängerung und Kündigung wickelt der jeweilige Store in eigener Verantwortung ab; dafür gelten seine Datenschutzbestimmungen: https://policies.google.com/privacy bzw. https://www.apple.com/de/legal/privacy/',
          },
          {
            kind: 'p',
            text: 'Die App erhält vom Store nur die Information, ob und welches Pro-Abo aktiv ist (z. B. Produkt, Status und Kaufkennung), um die Pro-Funktionen freizuschalten. Diese Information wird nur auf deinem Gerät gespeichert. Zahlungsdaten erhalten wir nicht. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO.',
          },
          {
            kind: 'p',
            text: 'Für die Abrechnung stellt uns der Store Berichte über Käufe bereit (z. B. Bestellnummer, Produkt, Preis, Land und Datum). Wir nutzen sie nur für Buchhaltung und Steuern und bewahren sie im Rahmen der gesetzlichen Aufbewahrungspflichten auf (Art. 6 Abs. 1 lit. c DSGVO).',
          },
        ],
      },
      {
        heading: '7. App-Stores und Statistiken',
        blocks: [
          {
            kind: 'p',
            text: 'Beim Herunterladen der App verarbeiten Google bzw. Apple Daten wie deine Kontoinformationen und Gerätedaten in eigener Verantwortung. Über ihre Entwicklerkonsolen stellen uns die Stores zusammengefasste Statistiken bereit (z. B. Anzahl der Installationen, Länder, Geräte) sowie – sofern du dem in den Einstellungen deines Geräts zugestimmt hast – Absturzberichte ohne direkten Personenbezug. Wir nutzen sie, um Fehler zu beheben und die App zu verbessern (Art. 6 Abs. 1 lit. f DSGVO).',
          },
        ],
      },
      {
        heading: '8. Website',
        blocks: [
          {
            kind: 'p',
            text: 'Die Website zur App, auf der auch diese Datenschutzerklärung veröffentlicht ist, wird über GitHub Pages bereitgestellt (GitHub Inc., 88 Colin P. Kelly Jr. Street, San Francisco, CA 94107, USA). Beim Aufruf verarbeitet GitHub technisch notwendige Daten wie deine IP-Adresse, Datum, Uhrzeit und Browser-Informationen, um die Seiten auszuliefern und die Sicherheit zu gewährleisten (Art. 6 Abs. 1 lit. f DSGVO). GitHub ist nach dem EU-US Data Privacy Framework zertifiziert. Wir verwenden auf der Website keine Cookies und keine Analyse-Tools. Datenschutzhinweise von GitHub: https://docs.github.com/de/site-policy/privacy-policies/github-general-privacy-statement',
          },
        ],
      },
      {
        heading: '9. Kontakt',
        blocks: [
          {
            kind: 'p',
            text: 'Wenn du uns per E-Mail kontaktierst, verarbeiten wir deine E-Mail-Adresse und den Inhalt deiner Nachricht, um dein Anliegen zu bearbeiten (Art. 6 Abs. 1 lit. b bzw. f DSGVO). Die Daten werden gelöscht, sobald sie dafür nicht mehr benötigt werden und keine gesetzlichen Aufbewahrungspflichten bestehen.',
          },
        ],
      },
      {
        heading: '10. Deine Rechte',
        blocks: [
          {
            kind: 'p',
            text: 'Du hast das Recht auf Auskunft (Art. 15 DSGVO), Berichtigung (Art. 16), Löschung (Art. 17), Einschränkung der Verarbeitung (Art. 18), Datenübertragbarkeit (Art. 20) und Widerspruch gegen Verarbeitungen auf Grundlage berechtigter Interessen (Art. 21 DSGVO). Da deine App-Daten nur auf deinem Gerät liegen, kannst du die meisten dieser Rechte direkt in der App ausüben. Außerdem kannst du dich bei einer Datenschutz-Aufsichtsbehörde beschweren, insbesondere in dem Land deines Wohnorts (Art. 77 DSGVO).',
          },
        ],
      },
      {
        heading: '11. Keine automatisierten Entscheidungen',
        blocks: [
          {
            kind: 'p',
            text: 'Es findet keine automatisierte Entscheidungsfindung einschließlich Profiling statt. Berechnungen der App wie Kalorienbedarf, Trends oder Steigerungs-Tipps laufen lokal auf deinem Gerät und dienen nur deiner Information.',
          },
        ],
      },
      {
        heading: '12. Änderungen',
        blocks: [
          {
            kind: 'p',
            text: 'Wir passen diese Datenschutzerklärung an, wenn sich die App oder die Rechtslage ändert. Es gilt die jeweils in der App und auf der Website veröffentlichte Fassung.',
          },
        ],
      },
    ],
  };
}

function termsOfUse(owner: LegalOwner): LegalDocument {
  return {
    id: 'nutzungsbedingungen',
    title: 'Nutzungsbedingungen',
    sections: [
      {
        heading: '1. Geltungsbereich',
        blocks: [
          {
            kind: 'p',
            text: `Diese Bedingungen gelten für die Nutzung der App „Formkurve“. Anbieter ist ${owner.name}, ${owner.street}, ${owner.postalCity} (weitere Angaben im Impressum).`,
          },
        ],
      },
      {
        heading: '2. Leistungen',
        blocks: [
          {
            kind: 'p',
            text: 'Formkurve hilft dir, Training, Körpergewicht, Cardio und Ernährung zu dokumentieren und auszuwerten. Die Grundfunktionen sind kostenlos. Zusätzliche Funktionen („Formkurve Pro“) kannst du per Abo freischalten. Welche Funktionen zu Pro gehören, zeigt die App vor dem Kauf an.',
          },
        ],
      },
      {
        heading: '3. Formkurve Pro',
        blocks: [
          {
            kind: 'list',
            items: [
              'Das Abo wird über Google Play bzw. den App Store abgeschlossen und bezahlt. Ergänzend gelten die Bedingungen des jeweiligen Stores.',
              'Preis und Laufzeit werden vor dem Kauf angezeigt. Alle Preise enthalten die gesetzliche Umsatzsteuer.',
              'Das Abo verlängert sich automatisch um die gewählte Laufzeit, wenn es nicht vor Ablauf gekündigt wird. Kündigen kannst du jederzeit in den Abo-Einstellungen des Stores; Pro bleibt bis zum Ende des bereits bezahlten Zeitraums aktiv.',
              'Wird ein kostenloser Testzeitraum angeboten, wird der Preis erst nach dessen Ende fällig. Kündigst du vorher, entstehen keine Kosten.',
              'Erstattungen richten sich nach den Regeln des jeweiligen Stores und den gesetzlichen Bestimmungen. Deine gesetzlichen Rechte als Verbraucherin oder Verbraucher, insbesondere ein Widerrufsrecht, bleiben unberührt.',
              'Preisänderungen für laufende Abos erfolgen nur nach den Vorgaben des Stores; du wirst vorher informiert und kannst kündigen.',
            ],
          },
        ],
      },
      {
        heading: '4. Gesundheitshinweis',
        blocks: [
          {
            kind: 'p',
            text: 'Die App ersetzt keine ärztliche, therapeutische oder ernährungswissenschaftliche Beratung. Kalorienbedarf, Nährwerte, geschätztes 1RM, Kalorienverbrauch und Prognosen sind Schätzwerte. Lass dich vor Beginn eines Trainings- oder Ernährungsprogramms – insbesondere bei Vorerkrankungen, in der Schwangerschaft oder bei Beschwerden – ärztlich beraten und brich das Training bei Schmerzen oder Unwohlsein ab.',
          },
        ],
      },
      {
        heading: '5. Deine Daten und Datensicherung',
        blocks: [
          {
            kind: 'p',
            text: 'Deine Daten werden nur auf deinem Gerät gespeichert (siehe Datenschutzerklärung). Nutze die Backup-Funktion der App, insbesondere vor einem Gerätewechsel oder einer Deinstallation, denn ohne Backup können gelöschte Daten nicht wiederhergestellt werden.',
          },
        ],
      },
      {
        heading: '6. Verfügbarkeit',
        blocks: [
          {
            kind: 'p',
            text: 'Wir entwickeln die App weiter und können Funktionen ändern, soweit das für dich zumutbar ist. Einzelne Funktionen hängen von Diensten Dritter ab (z. B. Open Food Facts) und stehen deshalb nicht jederzeit zur Verfügung.',
          },
        ],
      },
      {
        heading: '7. Haftung',
        blocks: [
          {
            kind: 'p',
            text: 'Wir haften unbeschränkt bei Vorsatz und grober Fahrlässigkeit, bei Verletzung von Leben, Körper oder Gesundheit sowie nach dem Produkthaftungsgesetz. Bei leicht fahrlässiger Verletzung wesentlicher Vertragspflichten – also von Pflichten, deren Erfüllung die ordnungsgemäße Durchführung des Vertrags erst ermöglicht und auf deren Einhaltung du regelmäßig vertrauen darfst – ist die Haftung auf den vertragstypischen, vorhersehbaren Schaden begrenzt. Im Übrigen ist die Haftung für leichte Fahrlässigkeit ausgeschlossen.',
          },
        ],
      },
      {
        heading: '8. Schlussbestimmungen',
        blocks: [
          {
            kind: 'p',
            text: 'Es gilt das Recht der Bundesrepublik Deutschland. Hast du als Verbraucherin oder Verbraucher deinen gewöhnlichen Aufenthalt in einem anderen Staat, bleiben die zwingenden Verbraucherschutzvorschriften dieses Staates unberührt.',
          },
        ],
      },
    ],
  };
}

export function legalDocuments(owner: LegalOwner = LEGAL_OWNER): LegalDocument[] {
  return [privacyPolicy(owner), termsOfUse(owner), impressum(owner)];
}

export function legalDocument(id: string | null | undefined, owner: LegalOwner = LEGAL_OWNER): LegalDocument | null {
  return legalDocuments(owner).find((d) => d.id === id) ?? null;
}
