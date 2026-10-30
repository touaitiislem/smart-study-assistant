import { HttpError } from '../errors';

export type DocKind = 'pdf' | 'text';

/** Détecte le type réel du fichier (signature, pas seulement l'extension déclarée). */
export function detectKind(buf: Buffer, mime: string, filename: string): DocKind {
  if (buf.subarray(0, 5).toString('latin1') === '%PDF-') return 'pdf';
  const isText = mime === 'text/plain' || /\.(txt|md)$/i.test(filename);
  if (isText && !buf.includes(0)) return 'text';
  throw new HttpError(415, 'Format non supporté : importez un PDF ou un fichier texte (.txt, .md).');
}

const clean = (s: string) => s.replace(/\u0000/g, '').replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();

const MAX_PAGES = 300;
let pdfjsLib: any;

/** Charge pdfjs-dist à la demande ; ses avertissements « canvas » concernent le rendu, inutile ici. */
function loadPdfjs() {
  if (!pdfjsLib) {
    const { warn, log } = console;
    console.warn = console.log = () => {}; // pdfjs écrit ces avertissements via console.log
    try { pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js'); } finally { console.warn = warn; console.log = log; }
  }
  return pdfjsLib;
}

export async function extractText(buf: Buffer, kind: DocKind): Promise<string> {
  if (kind === 'text') return clean(buf.toString('utf8')).slice(0, 500_000);
  try {
    const doc = await loadPdfjs().getDocument({ data: new Uint8Array(buf), useSystemFonts: true, isEvalSupported: false }).promise;
    let out = '';
    for (let i = 1; i <= Math.min(doc.numPages, MAX_PAGES) && out.length < 500_000; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      out += content.items.map((it: { str?: string; hasEOL?: boolean }) => (it.str ?? '') + (it.hasEOL ? '\n' : ' ')).join('') + '\n\n';
    }
    await doc.destroy();
    return clean(out).slice(0, 500_000);
  } catch {
    throw new HttpError(422, 'Impossible de lire ce PDF (fichier corrompu ou protégé par un mot de passe).');
  }
}

export function safeFilename(name: string): string {
  const decoded = Buffer.from(name, 'latin1').toString('utf8'); // multer décode en latin1
  const base = decoded.replace(/[\\/]/g, '_').replace(/[\u0000-\u001f]/g, '').trim().slice(0, 200);
  return base || 'document';
}
