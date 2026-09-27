import {
  hasPlaceholders,
  legalDocument,
  legalDocuments,
  PRIVACY_POLICY_URL,
  splitLinks,
  type LegalDocument,
  type LegalOwner,
} from '@/legal/content';

const OWNER: LegalOwner = {
  name: 'Max Muster',
  street: 'Beispielweg 1',
  postalCity: '12345 Musterstadt',
  country: 'Deutschland',
  email: 'kontakt@example.org',
  phone: '+49 123 456789',
  vatId: null,
  businessId: null,
};

function fullText(doc: LegalDocument): string {
  const blocks = doc.sections.flatMap((s) => [
    s.heading ?? '',
    ...s.blocks.map((b) => (b.kind === 'p' ? b.text : b.kind === 'list' ? b.items.join('\n') : b.lines.join('\n'))),
  ]);
  return [doc.title, doc.intro ?? '', ...blocks].join('\n');
}

describe('legal texts', () => {
  test('placeholders are detected', () => {
    expect(hasPlaceholders(OWNER)).toBe(false);
    expect(hasPlaceholders({ ...OWNER, postalCity: '[PLZ Ort]' })).toBe(true);
  });

  test('Impressum contains the mandatory details', () => {
    const text = fullText(legalDocument('impressum', OWNER)!);
    for (const value of ['§ 5 DDG', 'Max Muster', 'Beispielweg 1', '12345 Musterstadt', 'kontakt@example.org']) {
      expect(text).toContain(value);
    }
    expect(text).not.toContain('Umsatzsteuer-Identifikationsnummer');
    const withVat = fullText(legalDocument('impressum', { ...OWNER, vatId: 'DE123456789' })!);
    expect(withVat).toContain('DE123456789');
  });

  test('privacy policy names every data flow of the app', () => {
    const text = fullText(legalDocument('datenschutz', OWNER)!);
    for (const value of ['Open Food Facts', 'Google Play', 'App Store', 'GitHub Pages', 'Art. 77 DSGVO', 'Kamera']) {
      expect(text).toContain(value);
    }
    expect(PRIVACY_POLICY_URL).toMatch(/^https:\/\/.+datenschutz\.html$/);
  });

  test('terms explain renewal and cancellation of the subscription', () => {
    const text = fullText(legalDocument('nutzungsbedingungen', OWNER)!);
    expect(text).toContain('verlängert sich automatisch');
    expect(text).toContain('Kündigen kannst du jederzeit');
    expect(text).toContain('Max Muster');
  });

  test('all documents exist and unknown ids are rejected', () => {
    expect(legalDocuments(OWNER).map((d) => d.id)).toEqual(['datenschutz', 'nutzungsbedingungen', 'impressum']);
    expect(legalDocument('agb', OWNER)).toBeNull();
  });

  test('links and e-mail addresses are detected without trailing punctuation', () => {
    expect(splitLinks('Siehe https://example.org/privacy. Danke')).toEqual([
      { text: 'Siehe ' },
      { text: 'https://example.org/privacy', href: 'https://example.org/privacy' },
      { text: '. Danke' },
    ]);
    expect(splitLinks('(https://world.openfoodfacts.org)')[1].href).toBe('https://world.openfoodfacts.org');
    expect(splitLinks('E-Mail: kontakt@example.org')[1]).toEqual({
      text: 'kontakt@example.org',
      href: 'mailto:kontakt@example.org',
    });
    expect(splitLinks('ohne Link')).toEqual([{ text: 'ohne Link' }]);
  });
});
