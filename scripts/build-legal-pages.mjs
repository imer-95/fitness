#!/usr/bin/env node
/**
 * Generates the legal pages of the website (docs/legal/*.html) from
 * src/legal/content.ts – exactly the texts the app shows.
 *
 *   node scripts/build-legal-pages.mjs            write the pages
 *   node scripts/build-legal-pages.mjs --check    fail if the pages are outdated (CI)
 *   node scripts/build-legal-pages.mjs --release  also fail while placeholders are left
 *
 * The pages are plain HTML without scripts, cookies or external resources and
 * are published with GitHub Pages (Settings → Pages → Branch, folder /docs).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import ts from 'typescript';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'docs', 'legal');
const args = new Set(process.argv.slice(2));

async function loadContent() {
  const source = readFileSync(join(root, 'src', 'legal', 'content.ts'), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  });
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
}

const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function renderText(legal, text) {
  return legal
    .splitLinks(text)
    .map((part) =>
      part.href ? `<a href="${escapeHtml(part.href)}">${escapeHtml(part.text)}</a>` : escapeHtml(part.text),
    )
    .join('');
}

function renderBlock(legal, block) {
  if (block.kind === 'p') return `<p>${renderText(legal, block.text)}</p>`;
  if (block.kind === 'lines') return `<p>${block.lines.map((l) => renderText(legal, l)).join('<br />\n')}</p>`;
  return `<ul>\n${block.items.map((i) => `  <li>${renderText(legal, i)}</li>`).join('\n')}\n</ul>`;
}

const STYLE = `
:root { color-scheme: light dark; --bg: #f3f4f7; --card: #ffffff; --text: #11141a; --muted: #5a616e; --accent: #e54a1f; --border: #e3e6eb; }
@media (prefers-color-scheme: dark) { :root { --bg: #0b0c0f; --card: #16181d; --text: #f3f4f6; --muted: #a4aab6; --accent: #ff835c; --border: #252931; } }
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--text); font: 16px/1.6 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
header, main, footer { max-width: 760px; margin: 0 auto; padding: 0 20px; }
header { padding-top: 28px; display: flex; flex-wrap: wrap; align-items: baseline; gap: 8px 20px; }
header .brand { font-weight: 800; font-size: 20px; color: var(--accent); text-decoration: none; margin-right: auto; }
nav a { color: var(--muted); text-decoration: none; margin-right: 14px; font-weight: 600; font-size: 15px; }
nav a[aria-current="page"] { color: var(--text); }
main { background: var(--card); border: 1px solid var(--border); border-radius: 18px; padding: 8px 28px 24px; margin-top: 20px; }
h1 { font-size: 30px; line-height: 1.2; margin: 24px 0 8px; }
h2 { font-size: 19px; margin: 28px 0 6px; }
p, ul { margin: 8px 0; }
ul { padding-left: 22px; }
li { margin: 4px 0; }
a { color: var(--accent); overflow-wrap: anywhere; }
.intro { color: var(--muted); font-size: 17px; }
.notice { background: #fef3c7; color: #6b4a00; border-radius: 12px; padding: 10px 14px; font-size: 15px; }
footer { color: var(--muted); font-size: 14px; padding-top: 16px; padding-bottom: 40px; }
@media (max-width: 520px) { main { padding: 4px 18px 18px; border-radius: 14px; } h1 { font-size: 26px; } }
`.trim();

function page(legal, { title, id, body }) {
  const nav = [
    ['index', 'Übersicht'],
    ['datenschutz', 'Datenschutz'],
    ['nutzungsbedingungen', 'Nutzungsbedingungen'],
    ['impressum', 'Impressum'],
  ]
    .map(
      ([href, label]) => `<a href="${href}.html"${href === id ? ' aria-current="page"' : ''}>${escapeHtml(label)}</a>`,
    )
    .join('\n      ');
  const notice = legal.hasPlaceholders()
    ? '\n      <p class="notice">Vorlage: Name, Anschrift und Kontaktdaten sind noch nicht eingetragen.</p>'
    : '';
  return `<!doctype html>
<html lang="de">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)} – Formkurve</title>
    <style>
${STYLE}
    </style>
  </head>
  <body>
    <header>
      <a class="brand" href="index.html">Formkurve</a>
      <nav>
      ${nav}
      </nav>
    </header>
    <main>${notice}
${body}
    </main>
    <footer>Stand: ${escapeHtml(legal.LEGAL_UPDATED)} · Diese Seite verwendet keine Cookies, keine Skripte und keine externen Inhalte.</footer>
  </body>
</html>
`;
}

function documentPage(legal, doc) {
  const parts = [`      <h1>${escapeHtml(doc.title)}</h1>`];
  if (doc.intro) parts.push(`      <p class="intro">${renderText(legal, doc.intro)}</p>`);
  for (const section of doc.sections) {
    if (section.heading) parts.push(`      <h2>${escapeHtml(section.heading)}</h2>`);
    for (const block of section.blocks) parts.push(renderBlock(legal, block).replace(/^/gm, '      '));
  }
  return page(legal, { title: doc.title, id: doc.id, body: parts.join('\n') });
}

function indexPage(legal) {
  const docs = legal.legalDocuments();
  const body = [
    '      <h1>Formkurve</h1>',
    '      <p class="intro">Dein Trainingstagebuch für iPhone und Android – Krafttraining, tägliches Gewicht, Cardio und Ernährung. Offline, ohne Konto, auf Deutsch.</p>',
    '      <h2>Rechtliches</h2>',
    '      <ul>',
    ...docs.map((d) => `        <li><a href="${d.id}.html">${escapeHtml(d.title)}</a></li>`),
    '      </ul>',
    '      <h2>Mehr erfahren</h2>',
    '      <p><a href="../">Dokumentation und Benutzerhandbuch</a></p>',
  ].join('\n');
  return page(legal, { title: 'Übersicht', id: 'index', body });
}

const legal = await loadContent();
const pages = new Map([['index.html', indexPage(legal)]]);
for (const doc of legal.legalDocuments()) pages.set(`${doc.id}.html`, documentPage(legal, doc));

let failed = false;
if (args.has('--release') && legal.hasPlaceholders()) {
  console.error(
    '✖ src/legal/content.ts enthält noch Platzhalter (LEGAL_OWNER). Bitte vor der Veröffentlichung ausfüllen.',
  );
  failed = true;
}

if (args.has('--check') || args.has('--release')) {
  const outdated = [...pages].filter(([file, html]) => {
    const path = join(outDir, file);
    return !existsSync(path) || readFileSync(path, 'utf8') !== html;
  });
  if (outdated.length > 0) {
    console.error(
      `✖ Veraltete Rechtsseiten: ${outdated.map(([f]) => f).join(', ')}. Bitte "npm run legal:pages" ausführen und committen.`,
    );
    failed = true;
  } else {
    console.log('✔ Rechtsseiten in docs/legal sind aktuell.');
  }
} else {
  mkdirSync(outDir, { recursive: true });
  for (const [file, html] of pages) writeFileSync(join(outDir, file), html);
  console.log(`✔ ${pages.size} Seiten geschrieben nach ${relative(root, outDir)}/`);
}

process.exit(failed ? 1 : 0);
